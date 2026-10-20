import { assertEquals, assertMatch } from '@std/assert';

import {
  buildChatDebugPayload,
  extractToolMetadata,
  isLocalChatDebugEnabled,
  printChatDebugSummary,
  writeChatDebugFile,
} from '../debug.ts';

Deno.test('isLocalChatDebugEnabled detects local dev and respects production override', () => {
  // Test localhost origin
  const localReq = new Request('http://localhost:54321/functions/v1/chat', {
    headers: { origin: 'http://localhost:5173' },
  });
  assertEquals(isLocalChatDebugEnabled(localReq), true);

  // Test production suppression
  Deno.env.set('RUNTIME_ENV', 'production');
  try {
    assertEquals(isLocalChatDebugEnabled(localReq), false);
  } finally {
    Deno.env.delete('RUNTIME_ENV');
  }

  // Test explicit CHAT_DEBUG_INPUT flag
  const remoteReq = new Request('https://api.example.com/functions/v1/chat');
  Deno.env.set('CHAT_DEBUG_INPUT', 'true');
  try {
    assertEquals(isLocalChatDebugEnabled(remoteReq), true);
  } finally {
    Deno.env.delete('CHAT_DEBUG_INPUT');
  }
});

Deno.test('extractToolMetadata extracts names, descriptions, and parameter schema keys', () => {
  const mockTools = {
    getSample: {
      description: 'Fetches sample records',
      parameters: {
        shape: {
          limit: { _def: { typeName: 'ZodNumber', description: 'Max items' } },
          search: { description: 'Keyword to search' },
        },
      },
    },
    emptyTool: {},
  };

  const metadata = extractToolMetadata(mockTools);
  assertEquals(metadata.length, 2);

  const sampleTool = metadata.find((t) => t.name === 'getSample');
  assertEquals(sampleTool?.description, 'Fetches sample records');
  assertEquals(sampleTool?.parameterKeys, ['limit', 'search']);
  assertEquals(
    (sampleTool?.parametersSchema.limit as { type: string; description: string }).description,
    'Max items',
  );
  assertEquals(
    (sampleTool?.parametersSchema.search as { description: string }).description,
    'Keyword to search',
  );

  const empty = metadata.find((t) => t.name === 'emptyTool');
  assertEquals(empty?.parameterKeys, []);
});

Deno.test('buildChatDebugPayload builds accurate breakdown and token estimations', () => {
  const payload = buildChatDebugPayload({
    requestId: 'test-req-123',
    model: 'gemini-3.5-flash-lite',
    durationMs: 450,
    systemPrompt: 'System prompt content with 40 characters.',
    messages: [
      { role: 'user', content: 'Hello there' },
      { role: 'assistant', content: 'General Kenobi' },
    ],
    tools: {
      testTool: {
        description: 'Test tool description',
      },
    },
    text: 'Response from model',
    finishReason: 'stop',
    usage: {
      inputTokens: 120,
      outputTokens: 35,
      totalTokens: 155,
    },
    steps: [
      {
        finishReason: 'tool-calls',
        usage: { inputTokens: 80, outputTokens: 10, totalTokens: 90 },
        toolCalls: [{ toolCallId: 'call_1', toolName: 'testTool', args: { query: 'test' } }],
        toolResults: [
          {
            toolCallId: 'call_1',
            toolName: 'testTool',
            args: { query: 'test' },
            result: [{ id: 1, name: 'Sample' }],
          },
        ],
      },
      {
        finishReason: 'stop',
        text: 'Final step response',
        usage: { inputTokens: 120, outputTokens: 25, totalTokens: 145 },
      },
    ],
  });

  assertEquals(payload.requestId, 'test-req-123');
  assertEquals(payload.model, 'gemini-3.5-flash-lite');
  assertEquals(payload.usage.inputTokens, 120);
  assertEquals(payload.usage.outputTokens, 35);
  assertEquals(payload.usage.totalTokens, 155);

  // System prompt breakdown
  assertEquals(payload.inputBreakdown.systemPrompt.characterCount, 41);
  assertEquals(payload.inputBreakdown.systemPrompt.estimatedTokens, Math.round(41 / 4));

  // Messages breakdown
  assertEquals(payload.inputBreakdown.messages.count, 2);
  assertEquals(payload.inputBreakdown.messages.totalCharacters, 25);

  // Multi-step tool results verification
  assertEquals(payload.inputBreakdown.steps.length, 2);
  const step1 = payload.inputBreakdown.steps[0];
  assertEquals(step1.toolCalls?.length, 1);
  assertEquals(step1.toolResults?.length, 1);
  const firstResult = step1.toolResults?.[0];
  assertEquals(firstResult?.toolName, 'testTool');
  assertEquals(firstResult?.resultItemCount, 1);
  assertEquals((firstResult?.resultChars ?? 0) > 0, true);
});

Deno.test('printChatDebugSummary runs without error and formats outputs', () => {
  const payload = buildChatDebugPayload({
    requestId: 'summary-test-456',
    model: 'gemini-3.5-flash-lite',
    durationMs: 120,
    systemPrompt: 'System',
    messages: [{ role: 'user', content: 'Hi' }],
    tools: {},
    text: 'Hello',
    usage: { inputTokens: 50, outputTokens: 10, totalTokens: 60 },
  });

  // Ensure printing to console does not throw
  printChatDebugSummary(payload, '/path/to/debug-last-input.json');
});

Deno.test('writeChatDebugFile writes payload to JSON file and returns file path', async () => {
  const payload = buildChatDebugPayload({
    requestId: 'file-write-test-789',
    model: 'gemini-3.5-flash-lite',
    durationMs: 100,
    systemPrompt: 'Test prompt',
    messages: [{ role: 'user', content: 'Testing file write' }],
    tools: {},
    text: 'Test output',
    usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
  });

  const filePath = await writeChatDebugFile(payload);
  assertEquals(typeof filePath, 'string');
  assertMatch(filePath ?? '', /debug-last-input\.json$/);

  // Verify file content can be read back and matches requestId
  if (filePath) {
    const content = await Deno.readTextFile(filePath);
    const parsed = JSON.parse(content);
    assertEquals(parsed.requestId, 'file-write-test-789');
  }
});

Deno.test('detectCreationIntent detects event and form creation keywords accurately', async () => {
  const { detectCreationIntent } = await import('../tools/index.ts');

  // Negative test cases (queries that should NOT load creation tools)
  assertEquals(detectCreationIntent([]), false);
  assertEquals(detectCreationIntent([{ role: 'user', content: 'hello' }]), false);
  assertEquals(detectCreationIntent([{ role: 'user', content: 'good morning' }]), false);
  assertEquals(
    detectCreationIntent([{ role: 'user', content: 'Who is volunteering on Sunday?' }]),
    false,
  );
  assertEquals(
    detectCreationIntent([{ role: 'user', content: 'Show me turn-up stats for 9AM service' }]),
    false,
  );
  assertEquals(
    detectCreationIntent([{ role: 'user', content: 'What are the demographics of the ushers?' }]),
    false,
  );

  // Positive test cases (queries that MUST load creation tools)
  assertEquals(
    detectCreationIntent([{ role: 'user', content: 'Create an event called Youth Camp' }]),
    true,
  );
  assertEquals(
    detectCreationIntent([{ role: 'user', content: 'Please draft a new event for next month' }]),
    true,
  );
  assertEquals(
    detectCreationIntent([{ role: 'user', content: 'Can we make a form for volunteer feedback?' }]),
    true,
  );
  assertEquals(
    detectCreationIntent([
      { role: 'assistant', content: 'Would you like me to proceed with creating this event?' },
      { role: 'user', content: 'Yes, proceed' },
    ]),
    true,
  );
  assertEquals(detectCreationIntent([{ role: 'user', content: 'confirm the draft' }]), true);
});

Deno.test('createChatTools dynamically gates createEvent and createForm', async () => {
  const { createChatTools } = await import('../tools/index.ts');
  const mockContext = {
    client: {} as never,
    requestId: 'test-req',
    userId: 'user-1',
  };

  const defaultReadTools = createChatTools(mockContext, { includeCreationTools: false });
  assertEquals('createEvent' in defaultReadTools, false);
  assertEquals('createForm' in defaultReadTools, false);
  assertEquals('getEvents' in defaultReadTools, true);
  assertEquals('getUserCommitments' in defaultReadTools, true);

  const fullTools = createChatTools(mockContext, { includeCreationTools: true });
  assertEquals('createEvent' in fullTools, true);
  assertEquals('createForm' in fullTools, true);
  assertEquals('getEvents' in fullTools, true);
});

Deno.test('resolveToolDomains partitions tools based on message contents', async () => {
  const { resolveToolDomains, createChatTools } = await import('../tools/index.ts');
  const mockContext = { client: {} as never, requestId: 'test', userId: 'u1' };

  // Events query -> should only load event tools
  const eventDomains = resolveToolDomains([
    { role: 'user', content: 'What upcoming events are scheduled for next month?' },
  ]);
  assertEquals(eventDomains.has('events'), true);
  assertEquals(eventDomains.has('attendance'), false);

  const eventTools = createChatTools(mockContext, {
    includeCreationTools: false,
    domains: eventDomains,
  });
  assertEquals('getEvents' in eventTools, true);
  assertEquals('analyzeEventAttendees' in eventTools, true);
  assertEquals('getUserCommitments' in eventTools, false);
  assertEquals('getUserDemographics' in eventTools, false);

  // Sunday attendance query -> should only load attendance tools
  const serviceDomains = resolveToolDomains([
    { role: 'user', content: 'Who is scheduled for the 9AM service roster?' },
  ]);
  assertEquals(serviceDomains.has('attendance'), true);
  assertEquals(serviceDomains.has('events'), false);

  const serviceTools = createChatTools(mockContext, {
    includeCreationTools: false,
    domains: serviceDomains,
  });
  assertEquals('getUserCommitments' in serviceTools, true);
  assertEquals('getExcusedMembers' in serviceTools, true);
  assertEquals('getEvents' in serviceTools, false);

  // Demographics query
  const demoDomains = resolveToolDomains([
    { role: 'user', content: 'Demographics of volunteers below age 20' },
  ]);
  assertEquals(demoDomains.has('demographics'), true);
});

Deno.test('compactMessageHistory applies sliding window and table compaction', async () => {
  const { compactMessageHistory } = await import('../history.ts');

  // Short history remains intact
  const shortHistory = [
    { role: 'user', content: 'Hello' },
    { role: 'assistant', content: 'Hi there!' },
  ];
  assertEquals(compactMessageHistory(shortHistory, 6).length, 2);

  // Long history (8 messages) gets trimmed to max 6
  const longHistory = [
    { role: 'user', content: 'Turn 1' },
    { role: 'assistant', content: 'Ans 1' },
    { role: 'user', content: 'Turn 2' },
    { role: 'assistant', content: 'Ans 2' },
    { role: 'user', content: 'Turn 3' },
    { role: 'assistant', content: 'Ans 3' },
    { role: 'user', content: 'Turn 4' },
    { role: 'assistant', content: 'Ans 4' },
  ];
  const compacted = compactMessageHistory(longHistory, 6);
  assertEquals(compacted.length <= 6, true);
  assertEquals(compacted[0].role, 'user');

  // Compacting large tables in older assistant messages
  const historyWithTable = [
    { role: 'user', content: 'List roster' },
    {
      role: 'assistant',
      content:
        'Here is the roster:\n| Slot | Role | Volunteer |\n|---|---|---|\n| 9AM | Usher | USR_1 |\n| 9AM | Usher | USR_2 |\n| 12NN | Coach | USR_3 |\n| 3PM | Greeter | USR_4 |\nEnd of list',
    },
    { role: 'user', content: 'Are any excused?' },
    { role: 'assistant', content: 'Latest reply' },
    { role: 'user', content: 'Thanks' },
  ];
  const processed = compactMessageHistory(historyWithTable, 6);
  const oldAssistantMsg = processed.find((m) => m.content.includes('Here is the roster'));
  assertEquals(
    oldAssistantMsg?.content.includes('[Prior table details summarized for context]'),
    true,
  );
});
