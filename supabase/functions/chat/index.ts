import { google } from 'npm:@ai-sdk/google';
import { streamText } from 'npm:ai';

import { useEdgeHook } from '@/shared/edge.ts';
import { errorResponse } from '@/shared/http.ts';
import { z } from '@/shared/validation.ts';

const chatRequestSchema = z.object({
  messages: z.array(z.any()), // Basic messages array structure for AI SDK
});

Deno.serve(async (req) => {
  const guard = await useEdgeHook({
    req,
    functionName: 'chat',
    method: 'POST',
    requireAdmin: true,
    allowedRoles: ['slod', 'admin', 'super_admin'],
    schema: chatRequestSchema,
  });

  if (!guard.valid) {
    return guard.response;
  }

  const { messages } = guard.data;
  const corsHeaders = guard.corsHeaders;

  const apiKey = Deno.env.get('GOOGLE_API_KEY');

  if (!apiKey) {
    return errorResponse(corsHeaders, 500, 'GOOGLE_API_KEY not configured');
  }

  try {
    const result = streamText({
      model: google('gemini-2.5-flash'),
      messages,
      tools: {
        // Tools will be implemented later by the user (e.g., user demographic lookup)
      },
    });

    const response = result.toDataStreamResponse();

    // Add CORS headers to response
    for (const [key, value] of Object.entries(corsHeaders)) {
      response.headers.set(key, value);
    }

    return response;
  } catch (err) {
    console.error('AI SDK Error:', err);
    return errorResponse(corsHeaders, 500, 'Failed to process request');
  }
});
