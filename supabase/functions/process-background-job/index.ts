import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.108.2';

import { useEdgeHook } from '@/shared/edge.ts';

const CHUNK_SIZE = 32768; // Max safe chunk size for String.fromCharCode with apply

function encodeBase64FromBytes(bytes: Uint8Array): string {
  let binary = '';

  for (let offset = 0; offset < bytes.length; offset += CHUNK_SIZE) {
    const chunk = bytes.subarray(offset, offset + CHUNK_SIZE);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

async function sendEmailWithAttachment(options: {
  resendApiKey: string;
  fromEmail: string;
  toEmail: string;
  subject: string;
  html: string;
  filename?: string;
  content?: string;
}): Promise<{ ok: true } | { ok: false; status: number; body: string }> {
  const attachments =
    options.filename && options.content
      ? [
          {
            filename: options.filename,
            content: encodeBase64FromBytes(new TextEncoder().encode(options.content)),
          },
        ]
      : [];

  const payload = {
    from: options.fromEmail,
    to: options.toEmail,
    subject: options.subject,
    html: options.html,
    ...(attachments.length > 0 && { attachments }),
  };

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${options.resendApiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    return { ok: false, status: response.status, body: await response.text() };
  }

  return { ok: true };
}

type BackgroundJobMessage = {
  job_type: string;
  to?: string;
  from?: string;
  subject?: string;
  html?: string;
  filename?: string;
  content?: string;
};

type PgmqMessage = {
  msg_id: number;
  read_ct: number;
  enqueued_at: string;
  vt: string;
  message: BackgroundJobMessage;
};

// Main function logic
Deno.serve(async (req) => {
  // Use edge hook for standard CORS and basic rate limiting,
  // but do NOT require a service role session from the caller,
  // because pg_net/cron cannot easily sign requests with the service role key.
  const guard = await useEdgeHook({
    req,
    allowAnyOrigin: true, // Internal webhook/cron origin
  });

  if (!guard.valid) return guard.response;

  console.log('[process-background-job] Triggered via Edge Hook', { requestId: guard.requestId });

  // Create a dedicated Service Role client to access the pgmq queue
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('[process-background-job] Missing Supabase environment variables');
    return new Response(JSON.stringify({ error: 'Configuration missing' }), {
      status: 500,
      headers: { ...guard.corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Configuration
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  const defaultFromEmail = Deno.env.get('RESEND_FROM_EMAIL') || 'noreply@yourdomain.com';

  if (!resendApiKey) {
    console.error('[process-background-job] Missing RESEND_API_KEY');
    return new Response(JSON.stringify({ error: 'Configuration missing' }), {
      status: 500,
      headers: { ...guard.corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let processedCount = 0;
  let archivedCount = 0;
  const MAX_RETRIES = 3;

  // Process messages in a loop until none are left
  while (true) {
    try {
      // 1. Read message from pgmq queue 'background_jobs'
      // using our RPC wrapper `read_background_job`
      const { data, error } = await supabase.rpc('read_background_job', {
        p_vt: 30, // 30 seconds visibility timeout
        p_qty: 1,
      });

      if (error) {
        console.error('[process-background-job] Error reading queue:', error);
        break;
      }

      const messages: PgmqMessage[] = data;
      if (!messages || messages.length === 0) {
        // No more messages in the queue
        break;
      }

      const msg = messages[0];
      const { msg_id, read_ct, message } = msg;

      console.log(`[process-background-job] Processing message ID ${msg_id}, attempt ${read_ct}`);

      // 2. Check for DLQ (Max Retries)
      if (read_ct > MAX_RETRIES) {
        console.warn(
          `[process-background-job] Message ${msg_id} exceeded max retries. Archiving to DLQ.`,
        );
        await supabase.rpc('archive_background_job', { p_msg_id: msg_id });
        archivedCount++;
        continue; // Try next message
      }

      // 3. Process the Job
      if (message.job_type === 'email') {
        const { to, subject, html, from, filename, content } = message;

        if (!to || !subject || !html) {
          console.error(
            `[process-background-job] Message ${msg_id} missing required email fields. Archiving.`,
          );
          await supabase.rpc('archive_background_job', { p_msg_id: msg_id });
          archivedCount++;
          continue;
        }

        const emailResult = await sendEmailWithAttachment({
          resendApiKey,
          fromEmail: from || defaultFromEmail,
          toEmail: to,
          subject,
          html,
          filename,
          content,
        });

        if (emailResult.ok) {
          console.log(
            `[process-background-job] Message ${msg_id} email sent successfully. Deleting.`,
          );
          await supabase.rpc('delete_background_job', { p_msg_id: msg_id });
          processedCount++;
        } else {
          // Send failed, we do NOT delete.
          // It will reappear in the queue after the 30s visibility timeout.
          console.error(`[process-background-job] Message ${msg_id} Resend error:`, {
            status: emailResult.status,
            body: emailResult.body,
          });
        }
      } else {
        // Unknown job type
        console.warn(
          `[process-background-job] Message ${msg_id} has unknown job_type: ${message.job_type}. Archiving.`,
        );
        await supabase.rpc('archive_background_job', { p_msg_id: msg_id });
        archivedCount++;
      }
    } catch (err) {
      console.error('[process-background-job] Worker loop error:', err);
      break;
    }
  }

  console.log(
    `[process-background-job] Finished processing loop. Processed: ${processedCount}, Archived: ${archivedCount}`,
  );

  return new Response(
    JSON.stringify({
      success: true,
      processed: processedCount,
      archived: archivedCount,
    }),
    {
      status: 200,
      headers: { ...guard.corsHeaders, 'Content-Type': 'application/json' },
    },
  );
});
