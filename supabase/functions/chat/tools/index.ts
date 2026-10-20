import type { ToolSet } from 'ai';

import { createAnalyzeEventAttendeesTool } from './analyzeEventAttendees.ts';
import { createCreateEventTool } from './createEvent.ts';
import { createCreateFormTool } from './createForm.ts';
import { createGetCommitmentSummaryStatsTool } from './getCommitmentSummaryStats.ts';
import { createGetEventsTool } from './getEvents.ts';
import { createGetExcusedMembersTool } from './getExcusedMembers.ts';
import { createGetInactiveVolunteersTool } from './getInactiveVolunteers.ts';
import { createGetServiceAttendanceForecastTool } from './getServiceAttendanceForecast.ts';
import { createGetServiceDashboardStatsTool } from './getServiceDashboardStats.ts';
import { createGetTopVolunteersByCommitmentTool } from './getTopVolunteersByCommitment.ts';
import { createGetUnexcusedVolunteersTool } from './getUnexcusedVolunteers.ts';
import { createGetUpcomingMilestonesTool } from './getUpcomingMilestones.ts';
import { createGetUserCommitmentsTool } from './getUserCommitments.ts';
import { createGetUserDemographicsTool } from './getUserDemographics.ts';
import { createGetUserServiceActivityTool } from './getUserServiceActivity.ts';
import type { ToolContext } from './types.ts';

export * from './types.ts';
export * from './getAdminRoutes.ts';
export * from './analyzeEventAttendees.ts';
export * from './createEvent.ts';
export * from './createForm.ts';
export * from './getEvents.ts';
export * from './getExcusedMembers.ts';
export * from './getServiceDashboardStats.ts';
export * from './getServiceAttendanceForecast.ts';
export * from './getUpcomingMilestones.ts';
export * from './getUserCommitments.ts';
export * from './getUserDemographics.ts';
export * from './getUserServiceActivity.ts';
export * from './getUnexcusedVolunteers.ts';
export * from './getTopVolunteersByCommitment.ts';
export * from './getInactiveVolunteers.ts';
export * from './getCommitmentSummaryStats.ts';
export * from './roles.ts';

export type ToolDomain = 'attendance' | 'events' | 'demographics';

export interface CreateChatToolsOptions {
  includeCreationTools?: boolean;
  domains?: Set<ToolDomain>;
}

export function detectCreationIntent(messages: Array<{ role: string; content: string }>): boolean {
  if (!messages || messages.length === 0) return false;
  const pattern =
    /\b(create|creating|creation|draft|new\s+event|new\s+form|make\s+an?\s+event|make\s+an?\s+form|setup\s+an?\s+event|set\s+up\s+an?\s+event|build\s+an?\s+event|build\s+an?\s+form|add\s+an?\s+event|add\s+an?\s+form|proceed|confirm|yes)\b/i;
  return messages.some((m) => pattern.test(m.content));
}

export function resolveToolDomains(
  messages: Array<{ role: string; content: string }>,
): Set<ToolDomain> {
  if (!messages || messages.length === 0) {
    return new Set(['attendance', 'events', 'demographics']);
  }

  const text = messages
    .map((m) => m.content)
    .join(' ')
    .toLowerCase();
  const domains = new Set<ToolDomain>();

  // 1. Events domain (event details, registrations, attendee analysis)
  if (
    /\b(event|events|camp|retreat|seminar|workshop|summit|conference|registered|registration|registrations|attendee|attendees)\b/i.test(
      text,
    )
  ) {
    domains.add('events');
  }

  // 2. Demographics & Milestones domain
  if (
    /\b(demographic|demographics|age|gender|men|ladies|youth|adult|birthday|anniversary|milestone|milestones)\b/i.test(
      text,
    )
  ) {
    domains.add('demographics');
  }

  // 3. Service Attendance & Rosters domain
  if (
    /\b(sunday|sundays|roster|schedule|schedules|service|services|volunteer|volunteers|usher|ushers|prayer\s*coach|coach|turnup|turn-up|attendance|late|walk-in|walk\s*in|absent|absence|excuse|excused|unexcused|commitment|commitments|forecast|leaderboard|inactive)\b/i.test(
      text,
    )
  ) {
    domains.add('attendance');
  }

  // If no specific domain was matched (e.g. "hello", "good morning", "help"):
  // Default to all domains so introductory queries can explore any topic
  if (domains.size === 0) {
    domains.add('attendance');
    domains.add('events');
    domains.add('demographics');
  }

  return domains;
}

export function createChatTools(
  context: ToolContext,
  options: CreateChatToolsOptions = {},
): ToolSet {
  const { includeCreationTools = true, domains } = options;
  const activeDomains = domains ?? new Set<ToolDomain>(['attendance', 'events', 'demographics']);

  const tools: ToolSet = {};

  // 1. Events Domain Tools
  if (activeDomains.has('events')) {
    tools.getEvents = createGetEventsTool(context);
    tools.analyzeEventAttendees = createAnalyzeEventAttendeesTool(context);
  }

  // 2. Demographics Domain Tools
  if (activeDomains.has('demographics')) {
    tools.getUserDemographics = createGetUserDemographicsTool(context);
    tools.getUpcomingMilestones = createGetUpcomingMilestonesTool(context);
  }

  // 3. Service Attendance Domain Tools
  if (activeDomains.has('attendance')) {
    tools.getUserCommitments = createGetUserCommitmentsTool(context);
    tools.getExcusedMembers = createGetExcusedMembersTool(context);
    tools.getUnexcusedVolunteers = createGetUnexcusedVolunteersTool(context);
    tools.getUserServiceActivity = createGetUserServiceActivityTool(context);
    tools.getServiceDashboardStats = createGetServiceDashboardStatsTool(context);
    tools.getServiceAttendanceForecast = createGetServiceAttendanceForecastTool(context);
    tools.getTopVolunteersByCommitment = createGetTopVolunteersByCommitmentTool(context);
    tools.getInactiveVolunteers = createGetInactiveVolunteersTool(context);
    tools.getCommitmentSummaryStats = createGetCommitmentSummaryStatsTool(context);
  }

  // 4. Creation Tools (gated by creation intent)
  if (includeCreationTools) {
    tools.createEvent = createCreateEventTool(context);
    tools.createForm = createCreateFormTool(context);
  }

  // Fallback safety: ensure at least getEvents and getUserCommitments exist
  if (Object.keys(tools).length === 0) {
    tools.getEvents = createGetEventsTool(context);
    tools.getUserCommitments = createGetUserCommitmentsTool(context);
  }

  return tools;
}
