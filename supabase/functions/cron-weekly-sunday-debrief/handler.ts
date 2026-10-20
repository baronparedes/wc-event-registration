import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText } from 'ai';

import { getGoogleAiApiKey, getGoogleAiModel } from '@/shared/ai.ts';
import { RATE_LIMIT_PRESETS } from '@/shared/constants.ts';
import type { Json } from '@/shared/database.types.ts';
import { useEdgeHook } from '@/shared/edge.ts';
import {
  type EnqueueEmailInput,
  enqueueEmailNotificationsBatch,
  triggerEmailProcessor,
} from '@/shared/emailQueue.ts';
import { toAbsoluteUrl } from '@/shared/emailTemplate.ts';
import { errorResponse, jsonResponse } from '@/shared/http.ts';
import { sendWebPushNotification } from '@/shared/push.ts';
import { resolveRoleEmails } from '@/shared/roleEmails.ts';

import { getSystemPrompt, getUserPrompt, parseDebriefResponse } from './prompt.ts';
import {
  type CronWeeklySundayDebriefPayload,
  type ServiceDashboardRpcResponse,
  cronWeeklySundayDebriefPayloadSchema,
} from './types.ts';
import {
  computeSundayMetrics,
  generateDebriefEmailHtml,
  generateDebriefEmailText,
  resolvePreviousSunday,
} from './utils.ts';

export async function handleCronWeeklySundayDebrief(req: Request): Promise<Response> {
  const startTime = performance.now();

  const hook = await useEdgeHook({
    req,
    functionName: 'cron-weekly-sunday-debrief',
    method: 'POST',
    requireAdmin: true,
    allowCronRole: true,
    allowServiceRole: true,
    allowedRoles: ['admin', 'super_admin'],
    rateLimit: {
      scope: 'cron-weekly-sunday-debrief',
      windowMs: RATE_LIMIT_PRESETS.cron.weeklySundayDebrief.windowMs,
      maxHits: RATE_LIMIT_PRESETS.cron.weeklySundayDebrief.maxHits,
    },
    schema: cronWeeklySundayDebriefPayloadSchema,
  });

  if (!hook.valid) {
    if (hook.response.status === 429) {
      return errorResponse(
        hook.corsHeaders,
        429,
        'Too many debrief requests. Please wait a moment before trying again.',
        undefined,
        { error_code: 'RATE_LIMITED' },
      );
    }
    return hook.response;
  }

  const { client: supabase, data: rawPayload, corsHeaders, requestId, userId } = hook;
  const payload: CronWeeklySundayDebriefPayload = rawPayload ?? {};

  const sundayDate = resolvePreviousSunday(payload.sunday_date);
  const [yearStr, monthStr] = sundayDate.split('-');
  const year = Number.parseInt(yearStr, 10);
  const month = Number.parseInt(monthStr, 10);

  console.log('[cron-weekly-sunday-debrief] Starting debrief generation', {
    requestId,
    sundayDate,
    callerId: userId,
  });

  // 1. Fetch Sunday Service Stats
  const { data: statsData, error: statsError } = await supabase.rpc('get_service_dashboard_stats', {
    p_year: year,
    p_month: month,
    p_sunday_date: sundayDate,
    p_start_date: sundayDate,
    p_end_date: sundayDate,
  });

  if (statsError) {
    console.error('[cron-weekly-sunday-debrief] Failed to fetch service stats', {
      requestId,
      error: statsError.message,
    });
    return errorResponse(
      corsHeaders,
      500,
      `Failed to query service dashboard stats: ${statsError.message}`,
    );
  }

  const dashboardStats = (statsData ?? {}) as ServiceDashboardRpcResponse;
  const metrics = computeSundayMetrics(sundayDate, dashboardStats);

  // 2. Configure Google AI / Gemini
  const apiKey = getGoogleAiApiKey();
  const model = getGoogleAiModel();

  if (!apiKey) {
    console.error('[cron-weekly-sunday-debrief] GOOGLE_API_KEY is not configured', {
      requestId,
    });
    return errorResponse(corsHeaders, 500, 'AI intelligence service is not configured');
  }

  try {
    const google = createGoogleGenerativeAI({ apiKey });
    const systemPrompt = getSystemPrompt();
    const userPrompt = getUserPrompt(metrics);

    console.log('[cron-weekly-sunday-debrief] Requesting Gemini debrief', {
      requestId,
      model,
      sundayDate,
      turnupRate: metrics.turnupRate,
      totalCommitted: metrics.totalCommitted,
      totalPresent: metrics.totalPresent,
    });

    const result = await generateText({
      model: google(model),
      system: systemPrompt,
      prompt: userPrompt,
    });

    const parsed = parseDebriefResponse(result.text);

    // 3. Upsert into public.service_weekly_briefs
    const { data: savedBrief, error: upsertError } = await supabase
      .from('service_weekly_briefs')
      .upsert(
        {
          sunday_date: metrics.sundayDate,
          turnup_rate: metrics.turnupRate,
          total_committed: metrics.totalCommitted,
          total_present: metrics.totalPresent,
          total_walk_ins: metrics.totalWalkIns,
          peak_slot: metrics.peakSlot,
          summary: parsed.summary,
          key_highlights: parsed.keyHighlights as unknown as Json,
          metrics_snapshot: dashboardStats as unknown as Json,
          generated_by: userId ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'sunday_date' },
      )
      .select()
      .single();

    if (upsertError) {
      console.error('[cron-weekly-sunday-debrief] Failed to persist brief', {
        requestId,
        error: upsertError.message,
      });
      return errorResponse(corsHeaders, 500, `Failed to save debrief: ${upsertError.message}`);
    }

    // 4. Dispatch notification to role 'OIC' exclusively
    let broadcastId: string | null = null;
    let pushDeliveries = 0;
    let emailDeliveries = 0;

    if (payload.notify !== false) {
      try {
        const title = `Sunday Executive Debrief (${metrics.sundayDate})`;
        const briefTeaser =
          parsed.keyHighlights[0] ??
          `Turn-up: ${metrics.turnupRate}% | Peak: ${metrics.peakSlot} (${metrics.totalPresent} present)`;
        const message = `${briefTeaser}. View complete debrief in Services Dashboard.`;
        const targetUrl = '/admin/services';

        // 4a. In-App Notification
        const { data: createdNotificationId, error: broadcastError } = await supabase.rpc(
          'broadcast_app_notification',
          {
            p_title: title,
            p_message: message,
            p_target_type: 'role',
            p_target_role: 'OIC',
            p_target_roles: ['OIC'],
            p_created_by: userId ?? undefined,
            p_target_url: targetUrl,
          },
        );

        if (broadcastError) {
          console.error('[cron-weekly-sunday-debrief] Failed to broadcast notification', {
            requestId,
            error: broadcastError.message,
          });
        } else if (createdNotificationId) {
          broadcastId = createdNotificationId;

          // 4b. Web Push Notification to recipients with active subscriptions
          const { data: recipients } = await supabase
            .from('app_notification_recipients')
            .select('user_id')
            .eq('notification_id', createdNotificationId);

          const recipientUserIds = recipients?.map((r) => r.user_id) ?? [];

          if (recipientUserIds.length > 0) {
            const { data: subscriptions } = await supabase
              .from('user_push_subscriptions')
              .select('endpoint, p256dh_key, auth_key, id')
              .in('user_id', recipientUserIds);

            if (subscriptions && subscriptions.length > 0) {
              const pushResults = await Promise.allSettled(
                subscriptions.map((sub) =>
                  sendWebPushNotification({
                    subscription: {
                      endpoint: sub.endpoint,
                      keys: {
                        p256dh: sub.p256dh_key,
                        auth: sub.auth_key,
                      },
                    },
                    payload: {
                      title,
                      body: message,
                      url: targetUrl,
                    },
                  }),
                ),
              );

              pushDeliveries = pushResults.filter((r) => r.status === 'fulfilled').length;
            }
          }
        }

        // 4c. Email Notification to role OIC
        const oicEmails = await resolveRoleEmails(supabase, ['OIC']);
        if (oicEmails.length > 0) {
          const emailSubject = title;
          const absoluteUrl = toAbsoluteUrl(targetUrl);
          const emailText = generateDebriefEmailText({
            sundayDate: metrics.sundayDate,
            turnupRate: metrics.turnupRate,
            peakSlot: metrics.peakSlot,
            totalCommitted: metrics.totalCommitted,
            totalPresent: metrics.totalPresent,
            totalWalkIns: metrics.totalWalkIns,
            summary: parsed.summary,
            keyHighlights: parsed.keyHighlights,
            actionUrl: absoluteUrl,
          });

          const emailHtml = generateDebriefEmailHtml({
            sundayDate: metrics.sundayDate,
            turnupRate: metrics.turnupRate,
            peakSlot: metrics.peakSlot,
            totalCommitted: metrics.totalCommitted,
            totalPresent: metrics.totalPresent,
            totalWalkIns: metrics.totalWalkIns,
            summary: parsed.summary,
            keyHighlights: parsed.keyHighlights,
            actionUrl: absoluteUrl,
          });

          const queueInputs: EnqueueEmailInput[] = oicEmails.map((email) => ({
            recipient: email,
            category: 'broadcast',
            event_type: 'email_notification',
            template_slug: 'broadcast',
            subject: emailSubject,
            text: emailText,
            html: emailHtml,
            metadata: {
              broadcast_title: emailSubject,
              title: emailSubject,
              broadcast_message: emailText,
              message: emailText,
              broadcast_message_html: emailHtml,
              message_html: emailHtml,
              url: absoluteUrl,
              action_url: absoluteUrl,
              action_text: 'View in Services Dashboard',
              target_type: 'role',
              sunday_date: metrics.sundayDate,
            },
          }));

          const batchResult = await enqueueEmailNotificationsBatch(supabase, queueInputs, {
            concurrency: 10,
          });
          emailDeliveries = batchResult.successfulCount;

          if (emailDeliveries > 0) {
            await triggerEmailProcessor(supabase);
          }
        }
      } catch (notifyErr) {
        console.error('[cron-weekly-sunday-debrief] Notification dispatch encountered error', {
          requestId,
          error: notifyErr instanceof Error ? notifyErr.message : String(notifyErr),
        });
      }
    }

    const durationMs = Math.round(performance.now() - startTime);
    console.log('[cron-weekly-sunday-debrief] Completed successfully', {
      requestId,
      durationMs,
      sundayDate,
      broadcastId,
      pushDeliveries,
      emailDeliveries,
    });

    return jsonResponse(corsHeaders, {
      success: true,
      brief: savedBrief,
      metrics: {
        sundayDate: metrics.sundayDate,
        turnupRate: metrics.turnupRate,
        peakSlot: metrics.peakSlot,
        totalCommitted: metrics.totalCommitted,
        totalPresent: metrics.totalPresent,
        totalWalkIns: metrics.totalWalkIns,
      },
      broadcastId,
      pushDeliveries,
      emailDeliveries,
    });
  } catch (err) {
    console.error('[cron-weekly-sunday-debrief] Generation error', {
      requestId,
      error: err instanceof Error ? err.message : String(err),
    });
    return errorResponse(corsHeaders, 500, 'Failed to generate debrief. Please try again.');
  }
}
