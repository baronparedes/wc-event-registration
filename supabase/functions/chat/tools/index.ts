import { createGetAdminRoutesTool } from './getAdminRoutes.ts';
import { createGetEventsTool } from './getEvents.ts';
import { createGetExcusedMembersTool } from './getExcusedMembers.ts';
import { createGetUpcomingMilestonesTool } from './getUpcomingMilestones.ts';
import { createGetUserCommitmentsTool } from './getUserCommitments.ts';
import { createGetUserDemographicsTool } from './getUserDemographics.ts';
import type { ToolContext } from './types.ts';

export * from './types.ts';
export * from './getAdminRoutes.ts';
export * from './getEvents.ts';
export * from './getExcusedMembers.ts';
export * from './getUpcomingMilestones.ts';
export * from './getUserCommitments.ts';
export * from './getUserDemographics.ts';

export function createChatTools(context: ToolContext) {
  return {
    getAdminRoutes: createGetAdminRoutesTool(context),
    getEvents: createGetEventsTool(context),
    getExcusedMembers: createGetExcusedMembersTool(context),
    getUpcomingMilestones: createGetUpcomingMilestonesTool(context),
    getUserCommitments: createGetUserCommitmentsTool(context),
    getUserDemographics: createGetUserDemographicsTool(context),
  };
}
