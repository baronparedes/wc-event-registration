import { createGetEventsTool } from './getEvents.ts';
import type { ToolContext } from './types.ts';

export * from './types.ts';
export * from './getEvents.ts';

export function createChatTools(context: ToolContext) {
  return {
    getEvents: createGetEventsTool(context),
  };
}
