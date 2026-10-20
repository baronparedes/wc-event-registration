/**
 * Debug utility for local development inspection of AI model inputs,
 * token usage, and intermediate tool call payloads in supabase/functions/chat.
 */

export interface DebugChatMessage {
  role: string;
  content: string;
  id?: string;
}

export interface DebugToolInfo {
  name: string;
  description?: string;
  parameterKeys: string[];
  parametersSchema: Record<string, unknown>;
  characterCount: number;
  estimatedTokens: number;
}

export interface DebugStepInfo {
  stepNumber: number;
  finishReason?: string;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
  toolCalls?: Array<{
    toolCallId?: string;
    toolName?: string;
    args?: unknown;
  }>;
  toolResults?: Array<{
    toolCallId?: string;
    toolName?: string;
    args?: unknown;
    result?: unknown;
    resultChars: number;
    resultItemCount?: number;
  }>;
  textSnippet?: string;
}

export interface DebugPayload {
  timestamp: string;
  requestId: string;
  model: string;
  durationMs: number;
  finishReason?: string;
  usage: {
    inputTokens: number | null;
    outputTokens: number | null;
    totalTokens: number | null;
  };
  inputBreakdown: {
    systemPrompt: {
      characterCount: number;
      estimatedTokens: number;
      content: string;
    };
    messages: {
      count: number;
      totalCharacters: number;
      estimatedTokens: number;
      items: DebugChatMessage[];
    };
    tools: {
      count: number;
      totalCharacters: number;
      estimatedTokens: number;
      items: DebugToolInfo[];
    };
    steps: DebugStepInfo[];
  };
  responseSnippet: string;
}

/**
 * Checks whether chat input debugging is enabled for the incoming request.
 * Automatically enabled when running locally (RUNTIME_ENV=local, localhost origin/host)
 * or when CHAT_DEBUG_INPUT is explicitly enabled. Strictly disabled in production.
 */
export function isLocalChatDebugEnabled(req: Request): boolean {
  const runtimeEnv = Deno.env.get('RUNTIME_ENV')?.trim().toLowerCase();
  if (runtimeEnv === 'production') {
    return false;
  }
  if (runtimeEnv === 'local' || runtimeEnv === 'test') {
    return true;
  }
  if (Deno.env.get('CHAT_DEBUG_INPUT')?.trim().toLowerCase() === 'true') {
    return true;
  }

  const origin = req.headers.get('origin') ?? '';
  const host = req.headers.get('host') ?? '';
  return /localhost|127\.0\.0\.1|::1/.test(origin) || /localhost|127\.0\.0\.1|::1/.test(host);
}

/**
 * Extracts parameter schema definitions and parameter keys from a tool definition.
 */
export function extractToolMetadata(tools: Record<string, unknown>): DebugToolInfo[] {
  const result: DebugToolInfo[] = [];

  for (const [name, toolInstance] of Object.entries(tools)) {
    if (!toolInstance || typeof toolInstance !== 'object') {
      result.push({
        name,
        parameterKeys: [],
        parametersSchema: {},
        characterCount: name.length,
        estimatedTokens: Math.round(name.length / 4),
      });
      continue;
    }

    const toolObj = toolInstance as {
      description?: string;
      parameters?: unknown;
    };

    const description = toolObj.description;
    const parameters = toolObj.parameters;
    const parameterKeys: string[] = [];
    const parametersSchema: Record<string, unknown> = {};

    if (parameters && typeof parameters === 'object') {
      const p = parameters as { shape?: Record<string, unknown> };
      if (p.shape && typeof p.shape === 'object') {
        for (const [paramKey, paramVal] of Object.entries(p.shape)) {
          parameterKeys.push(paramKey);
          if (paramVal && typeof paramVal === 'object') {
            const pv = paramVal as {
              _def?: { typeName?: string; description?: string };
              description?: string;
            };
            parametersSchema[paramKey] = {
              type: pv._def?.typeName ?? typeof paramVal,
              description: pv.description ?? pv._def?.description ?? undefined,
            };
          } else {
            parametersSchema[paramKey] = typeof paramVal;
          }
        }
      }
    }

    let charCount = (description?.length ?? 0) + name.length;
    try {
      charCount += JSON.stringify(parametersSchema).length;
    } catch {
      // fallback
    }

    result.push({
      name,
      description,
      parameterKeys,
      parametersSchema,
      characterCount: charCount,
      estimatedTokens: Math.round(charCount / 4),
    });
  }

  return result;
}

/**
 * Builds the complete structured debug payload representing the AI model input and token usage.
 */
export function buildChatDebugPayload(options: {
  requestId: string;
  model: string;
  durationMs: number;
  systemPrompt: string;
  messages: DebugChatMessage[];
  tools: Record<string, unknown>;
  text: string;
  finishReason?: string;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
    promptTokens?: number;
    completionTokens?: number;
  };
  steps?: Array<{
    finishReason?: string;
    text?: string;
    usage?: {
      inputTokens?: number;
      outputTokens?: number;
      totalTokens?: number;
      promptTokens?: number;
      completionTokens?: number;
    };
    toolCalls?: Array<{
      toolCallId?: string;
      toolName?: string;
      name?: string;
      args?: unknown;
      input?: unknown;
    }>;
    toolResults?: Array<{
      toolCallId?: string;
      toolName?: string;
      name?: string;
      args?: unknown;
      input?: unknown;
      result?: unknown;
      output?: unknown;
    }>;
  }>;
}): DebugPayload {
  const {
    requestId,
    model,
    durationMs,
    systemPrompt,
    messages,
    tools,
    text,
    finishReason,
    usage,
    steps,
  } = options;

  const totalMsgChars = messages.reduce((acc, m) => acc + (m.content?.length ?? 0), 0);
  const toolItems = extractToolMetadata(tools);

  const debugSteps: DebugStepInfo[] = (steps ?? []).map((step, idx) => {
    const stepUsage = step.usage
      ? {
          inputTokens: step.usage.inputTokens ?? step.usage.promptTokens,
          outputTokens: step.usage.outputTokens ?? step.usage.completionTokens,
          totalTokens: step.usage.totalTokens,
        }
      : undefined;

    const formattedToolResults = step.toolResults?.map((tr) => {
      let resultChars: number;
      let itemCount: number | undefined;
      const rawResult = tr.result ?? tr.output;
      try {
        const serialized = JSON.stringify(rawResult);
        resultChars = serialized.length;
        if (Array.isArray(rawResult)) {
          itemCount = rawResult.length;
        }
      } catch {
        resultChars = String(rawResult).length;
      }

      return {
        toolCallId: tr.toolCallId,
        toolName: tr.toolName ?? tr.name ?? 'unknown',
        args: tr.args ?? tr.input,
        result: rawResult,
        resultChars,
        resultItemCount: itemCount,
      };
    });

    return {
      stepNumber: idx + 1,
      finishReason: step.finishReason,
      usage: stepUsage,
      toolCalls: step.toolCalls?.map((tc) => ({
        toolCallId: tc.toolCallId,
        toolName: tc.toolName ?? tc.name ?? 'unknown',
        args: tc.args ?? tc.input,
      })),
      toolResults: formattedToolResults,
      textSnippet: step.text ? step.text.slice(0, 150) : undefined,
    };
  });

  return {
    timestamp: new Date().toISOString(),
    requestId,
    model,
    durationMs,
    finishReason,
    usage: {
      inputTokens: usage?.inputTokens ?? usage?.promptTokens ?? null,
      outputTokens: usage?.outputTokens ?? usage?.completionTokens ?? null,
      totalTokens: usage?.totalTokens ?? null,
    },
    inputBreakdown: {
      systemPrompt: {
        characterCount: systemPrompt.length,
        estimatedTokens: Math.round(systemPrompt.length / 4),
        content: systemPrompt,
      },
      messages: {
        count: messages.length,
        totalCharacters: totalMsgChars,
        estimatedTokens: Math.round(totalMsgChars / 4),
        items: messages,
      },
      tools: {
        count: toolItems.length,
        totalCharacters: toolItems.reduce((acc, t) => acc + t.characterCount, 0),
        estimatedTokens: Math.round(toolItems.reduce((acc, t) => acc + t.characterCount, 0) / 4),
        items: toolItems,
      },
      steps: debugSteps,
    },
    responseSnippet: text.length > 200 ? `${text.slice(0, 200)}...` : text,
  };
}

/**
 * Pretty-prints a concise, human-readable inspection summary to the terminal.
 */
export function printChatDebugSummary(
  payload: DebugPayload,
  filePathWritten?: string | null,
): void {
  const border = '═'.repeat(78);
  const separator = '─'.repeat(78);

  const formatNum = (num?: number | null) => (num != null ? num.toLocaleString() : 'N/A');

  console.log(`\n${border}`);
  console.log('🔍 [chat:debug] AI MODEL INPUT & TOKEN USAGE BREAKDOWN');
  console.log(separator);
  console.log(`Model:         ${payload.model}`);
  console.log(`Request ID:    ${payload.requestId}`);
  console.log(`Duration:      ${payload.durationMs}ms`);
  console.log(`Finish Reason: ${payload.finishReason ?? 'unknown'}`);
  console.log(separator);
  console.log('📊 REPORTED TOKEN USAGE:');
  console.log(`  • Input (Prompt) Tokens:      ${formatNum(payload.usage.inputTokens)}`);
  console.log(`  • Output (Completion) Tokens: ${formatNum(payload.usage.outputTokens)}`);
  console.log(`  • Total Tokens:               ${formatNum(payload.usage.totalTokens)}`);
  console.log(separator);
  console.log('📥 INPUT BREAKDOWN & SIZES:');
  console.log(
    `  1. System Prompt:    ${payload.inputBreakdown.systemPrompt.characterCount.toLocaleString()} chars (~${formatNum(payload.inputBreakdown.systemPrompt.estimatedTokens)} est. tokens)`,
  );
  console.log(
    `  2. Messages History: ${payload.inputBreakdown.messages.count} messages (${payload.inputBreakdown.messages.totalCharacters.toLocaleString()} chars, ~${formatNum(payload.inputBreakdown.messages.estimatedTokens)} est. tokens)`,
  );
  console.log(
    `  3. Registered Tools: ${payload.inputBreakdown.tools.count} tools (~${formatNum(payload.inputBreakdown.tools.estimatedTokens)} est. tokens across all schemas)`,
  );
  const sortedTools = [...payload.inputBreakdown.tools.items].sort(
    (a, b) => b.characterCount - a.characterCount,
  );
  for (const t of sortedTools.slice(0, 5)) {
    if (t.characterCount > 0) {
      console.log(
        `      • ${t.name}: ${t.characterCount.toLocaleString()} chars (~${formatNum(t.estimatedTokens)} est. tokens)`,
      );
    }
  }
  if (sortedTools.length > 5) {
    console.log(`      ... and ${sortedTools.length - 5} other tool schemas`);
  }

  if (payload.inputBreakdown.steps.length > 0) {
    console.log(separator);
    console.log(`🔄 MULTI-STEP EXECUTION (${payload.inputBreakdown.steps.length} step(s)):`);
    for (const step of payload.inputBreakdown.steps) {
      const stepTokens = step.usage
        ? `in=${formatNum(step.usage.inputTokens)}, out=${formatNum(step.usage.outputTokens)}`
        : 'tokens: N/A';
      console.log(`  • Step ${step.stepNumber} [${step.finishReason ?? 'done'}] (${stepTokens}):`);

      if (step.toolCalls && step.toolCalls.length > 0) {
        for (const tc of step.toolCalls) {
          const argsStr = JSON.stringify(tc.args);
          const argsPreview = argsStr.length > 80 ? `${argsStr.slice(0, 77)}...` : argsStr;
          console.log(`      ⚡ Called Tool: ${tc.toolName}(${argsPreview})`);
        }
      }

      if (step.toolResults && step.toolResults.length > 0) {
        for (const tr of step.toolResults) {
          const countInfo = tr.resultItemCount != null ? `, ${tr.resultItemCount} items` : '';
          console.log(
            `      📦 Tool Result: ${tr.toolName} -> ${tr.resultChars.toLocaleString()} chars${countInfo}`,
          );
        }
      }
    }
  }

  console.log(separator);
  console.log('📄 FULL RAW MODEL INPUT (JSON):');
  console.log(JSON.stringify(payload, null, 2));

  if (filePathWritten) {
    console.log(separator);
    console.log('💾 SAVED TO WORKSPACE:');
    console.log(`   ${filePathWritten}`);
  }
  console.log(`${border}\n`);
}

async function tryWriteDebugFile(path: string, content: string): Promise<boolean> {
  try {
    const lastSlash = path.lastIndexOf('/');
    if (lastSlash > 0) {
      const dir = path.slice(0, lastSlash);
      await Deno.mkdir(dir, { recursive: true });
    }
    await Deno.writeTextFile(path, content);
    return true;
  } catch {
    return false;
  }
}

/**
 * Saves the full JSON debug payload to a local workspace file for inspection.
 * Tries workspace relative paths.
 * Safely fails without throwing if the container runtime filesystem is write-protected.
 */
export async function writeChatDebugFile(payload: DebugPayload): Promise<string | null> {
  const content = JSON.stringify(payload, null, 2);
  const candidatePaths: string[] = [];

  // 1. Try workspace paths relative to cwd
  try {
    const cwd = Deno.cwd();
    if (cwd && cwd !== '/') {
      if (cwd.endsWith('/supabase/functions/chat') || cwd.endsWith('/supabase/functions/chat/')) {
        candidatePaths.push(`${cwd}/debug-last-input.json`);
      } else if (cwd.endsWith('/supabase/functions') || cwd.endsWith('/supabase/functions/')) {
        candidatePaths.push(`${cwd}/chat/debug-last-input.json`);
      } else {
        candidatePaths.push(`${cwd}/supabase/functions/chat/debug-last-input.json`);
      }
    }
  } catch {
    // cwd may not be available in some restricted runtimes
  }

  // 2. Relative paths
  candidatePaths.push('./supabase/functions/chat/debug-last-input.json');
  candidatePaths.push('./chat/debug-last-input.json');
  candidatePaths.push('./debug-last-input.json');

  // 3. Module directory via import.meta.url
  try {
    const metaUrl = new URL('./debug-last-input.json', import.meta.url);
    if (metaUrl.protocol === 'file:') {
      candidatePaths.push(metaUrl.pathname);
    }
  } catch {
    // Ignore URL resolution failure
  }

  for (const path of candidatePaths) {
    if (await tryWriteDebugFile(path, content)) {
      return path;
    }
  }

  return null;
}

/**
 * Orchestrator to build payload, print console summary, and persist debug JSON file.
 */
export async function handleChatDebugLogging(
  options: Parameters<typeof buildChatDebugPayload>[0],
): Promise<void> {
  try {
    const payload = buildChatDebugPayload(options);
    const savedPath = await writeChatDebugFile(payload);
    printChatDebugSummary(payload, savedPath);
  } catch (err) {
    console.warn(
      '[chat:debug] Failed to process chat debug logging:',
      err instanceof Error ? err.message : String(err),
    );
  }
}
