import { createAnalyzeEventAttendeesTool } from './analyzeEventAttendees.ts';
import { createCreateEventTool } from './createEvent.ts';
import { createCreateFormTool } from './createForm.ts';
import { createGetAdminRoutesTool } from './getAdminRoutes.ts';
import { createGetCommitmentSummaryStatsTool } from './getCommitmentSummaryStats.ts';
import { createGetEventsTool } from './getEvents.ts';
import { createGetExcusedMembersTool } from './getExcusedMembers.ts';
import { createGetInactiveVolunteersTool } from './getInactiveVolunteers.ts';
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
export * from './getUpcomingMilestones.ts';
export * from './getUserCommitments.ts';
export * from './getUserDemographics.ts';
export * from './getUserServiceActivity.ts';
export * from './getUnexcusedVolunteers.ts';
export * from './getTopVolunteersByCommitment.ts';
export * from './getInactiveVolunteers.ts';
export * from './getCommitmentSummaryStats.ts';
export * from './roles.ts';

export function createChatTools(context: ToolContext) {
  return {
    getAdminRoutes: createGetAdminRoutesTool(context),
    getEvents: createGetEventsTool(context),
    createEvent: createCreateEventTool(context),
    createForm: createCreateFormTool(context),
    getExcusedMembers: createGetExcusedMembersTool(context),
    getServiceDashboardStats: createGetServiceDashboardStatsTool(context),
    getUpcomingMilestones: createGetUpcomingMilestonesTool(context),
    getUserCommitments: createGetUserCommitmentsTool(context),
    getUserDemographics: createGetUserDemographicsTool(context),
    getUserServiceActivity: createGetUserServiceActivityTool(context),
    getUnexcusedVolunteers: createGetUnexcusedVolunteersTool(context),
    analyzeEventAttendees: createAnalyzeEventAttendeesTool(context),
    getTopVolunteersByCommitment: createGetTopVolunteersByCommitmentTool(context),
    getInactiveVolunteers: createGetInactiveVolunteersTool(context),
    getCommitmentSummaryStats: createGetCommitmentSummaryStatsTool(context),
  };
}
