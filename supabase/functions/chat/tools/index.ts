import { createGetEventsTool } from './getEvents.ts';
import { createGetUpcomingBirthdaysTool } from './getUpcomingBirthdays.ts';
import { createGetUserCommitmentsTool } from './getUserCommitments.ts';
import { createGetUserDemographicsTool } from './getUserDemographics.ts';
import type { ToolContext } from './types.ts';

export * from './types.ts';
export * from './getEvents.ts';
export * from './getUpcomingBirthdays.ts';
export * from './getUserCommitments.ts';
export * from './getUserDemographics.ts';

export function createChatTools(context: ToolContext) {
  return {
    getEvents: createGetEventsTool(context),
    getUpcomingBirthdays: createGetUpcomingBirthdaysTool(context),
    getUserCommitments: createGetUserCommitmentsTool(context),
    getUserDemographics: createGetUserDemographicsTool(context),
  };
}
