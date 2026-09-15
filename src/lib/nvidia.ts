import OpenAI from 'openai';
import type { z } from 'zod';

// ---------------------------------------------------------------------------
// NVIDIA Nemotron 3 Ultra — Provider Configuration
// ---------------------------------------------------------------------------

const NVIDIA_MODEL = 'nvidia/nemotron-3-ultra-550b-a55b';
const NVIDIA_BASE_URL = 'https://integrate.api.nvidia.com/v1';

// ---------------------------------------------------------------------------
// Provider Concurrency & Rate Limit Management
// ---------------------------------------------------------------------------

class NvidiaConcurrencyLimiter {
  private activeCount = 0;
  private maxConcurrency: number;
  private queue: Array<() => void> = [];
  private rateLimitCooldownUntil = 0;

  constructor(maxConcurrency = 2) {
    this.maxConcurrency = maxConcurrency;
  }

  public setRateLimitCooldown(durationMs: number) {
    this.rateLimitCooldownUntil = Math.max(this.rateLimitCooldownUntil, Date.now() + durationMs);
  }

  public async acquire(signal?: AbortSignal): Promise<() => void> {
    const now = Date.now();
    if (this.rateLimitCooldownUntil > now) {
      const waitMs = this.rateLimitCooldownUntil - now + Math.floor(Math.random() * 600);
      await new Promise<void>((resolve, reject) => {
        if (signal?.aborted) return reject(new NvidiaError('Request aborted.', 499));
        const timer = setTimeout(resolve, waitMs);
        signal?.addEventListener(
          'abort',
          () => {
            clearTimeout(timer);
            reject(new NvidiaError('Request aborted.', 499));
          },
          { once: true },
        );
      });
    }

    if (this.activeCount < this.maxConcurrency) {
      this.activeCount++;
      return () => this.release();
    }

    return new Promise<() => void>((resolve, reject) => {
      if (signal?.aborted) return reject(new NvidiaError('Request aborted.', 499));
      const onAbort = () => {
        const idx = this.queue.indexOf(dispatch);
        if (idx !== -1) this.queue.splice(idx, 1);
        reject(new NvidiaError('Request aborted.', 499));
      };
      const dispatch = () => {
        signal?.removeEventListener('abort', onAbort);
        this.activeCount++;
        resolve(() => this.release());
      };
      this.queue.push(dispatch);
      signal?.addEventListener('abort', onAbort, { once: true });
    });
  }

  private release() {
    this.activeCount = Math.max(0, this.activeCount - 1);
    if (this.queue.length > 0 && this.activeCount < this.maxConcurrency) {
      const next = this.queue.shift();
      if (next) next();
    }
  }
}

const nvidiaLimiter = new NvidiaConcurrencyLimiter(2);

function getNvidiaClient(): OpenAI {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    throw new NvidiaError(
      'NVIDIA_API_KEY is not configured. Please set it in .env.local.',
      401,
    );
  }
  return new OpenAI({
    apiKey,
    baseURL: NVIDIA_BASE_URL,
    timeout: 300_000,
    maxRetries: 2,
  });
}

// ---------------------------------------------------------------------------
// Error Classification
// ---------------------------------------------------------------------------

interface ClassifiedError {
  retryable: boolean;
  statusCode: number;
  message: string;
  severity: 'warn' | 'error';
}

function classifyNvidiaError(error: any): ClassifiedError {
  const statusCode: number | undefined =
    error?.status ||
    error?.statusCode ||
    (error?.response?.status as number | undefined);
  const message: string = error?.message || '';
  const cause = error?.cause;
  const causeMessage: string = cause?.message || '';
  const causeCode: string = cause?.code || '';

  if (cause) {
    console.warn(
      `[NeMo] Underlying error cause: [${cause?.name || 'Error'}] code=${causeCode} message=${causeMessage}`,
    );
  }

  const combinedText = `${message} ${causeMessage}`.toLowerCase();
  const statusMatch = combinedText.match(/\b(50[0234]|429|401|403|400)\b/);
  const effectiveStatus = statusCode || (statusMatch ? parseInt(statusMatch[1], 10) : undefined);

  // 401 / 403 — auth / permission
  if (effectiveStatus === 401 || combinedText.includes('unauthorized')) {
    return {
      retryable: false,
      statusCode: 401,
      message: 'NVIDIA API authentication failed. Verify NVIDIA_API_KEY in .env.local.',
      severity: 'error',
    };
  }
  if (effectiveStatus === 403 || combinedText.includes('forbidden') || combinedText.includes('access denied')) {
    return {
      retryable: false,
      statusCode: 403,
      message: 'NVIDIA API access denied. Verify NVIDIA_API_KEY permissions.',
      severity: 'error',
    };
  }

  // 404 — model / endpoint not found
  if (effectiveStatus === 404 || combinedText.includes('not found')) {
    return {
      retryable: false,
      statusCode: 404,
      message: 'NVIDIA model or API endpoint not found. Verify model ID and base URL.',
      severity: 'error',
    };
  }

  // 429 — rate limit
  if (effectiveStatus === 429 || combinedText.includes('rate limit') || combinedText.includes('too many requests')) {
    return {
      retryable: true,
      statusCode: 429,
      message: 'NVIDIA API rate limit reached. Please try again shortly.',
      severity: 'warn',
    };
  }

  // 400 — bad request
  if (effectiveStatus === 400) {
    return {
      retryable: false,
      statusCode: 400,
      message: 'NVIDIA API rejected the request. Check prompt and configuration.',
      severity: 'error',
    };
  }

  // 500 / 502 / 503 / 504 — service errors or overload (retryable)
  if (
    (effectiveStatus && effectiveStatus >= 500) ||
    combinedText.includes('overload') ||
    combinedText.includes('temporarily unavailable') ||
    combinedText.includes('bad gateway') ||
    combinedText.includes('service unavailable') ||
    combinedText.includes('internal server error') ||
    combinedText.includes('gateway timeout')
  ) {
    const code = (effectiveStatus && effectiveStatus >= 500) ? effectiveStatus : 503;
    return {
      retryable: true,
      statusCode: code,
      message: `NVIDIA service temporarily unavailable or overloaded (${code}). Please try again.`,
      severity: 'warn',
    };
  }

  // Network stream termination / socket drop / connection reset
  if (
    combinedText.includes('terminated') ||
    causeCode === 'UND_ERR_SOCKET' ||
    causeCode === 'ECONNRESET' ||
    causeCode === 'UND_ERR_BODY_TIMEOUT' ||
    combinedText.includes('fetch failed') ||
    combinedText.includes('socket hang up') ||
    combinedText.includes('econnreset')
  ) {
    return {
      retryable: true,
      statusCode: 504,
      message: `NVIDIA API stream connection was terminated or reset (${causeCode || causeMessage || message}).`,
      severity: 'warn',
    };
  }

  // Timeout / abort
  if (
    error?.name?.includes('Timeout') ||
    error?.name?.includes('Abort') ||
    combinedText.includes('timeout') ||
    combinedText.includes('aborted')
  ) {
    return {
      retryable: true,
      statusCode: 504,
      message: 'NVIDIA AI request timed out.',
      severity: 'warn',
    };
  }

  // Unknown
  return {
    retryable: false,
    statusCode: 500,
    message: `NVIDIA API encountered an unexpected error: ${message || 'unknown'}`,
    severity: 'error',
  };
}

// ---------------------------------------------------------------------------
// Types & Diagnostic Interfaces
// ---------------------------------------------------------------------------

export interface DiagnosticMetadata {
  contentLength: number;
  reasoningContentLength: number;
  finishReason: string | null;
  startsWithBrace: boolean;
  endsWithBrace: boolean;
  first300: string;
  last300: string;
}

interface CompletionResult {
  content: string;
  reasoningContent: string;
  finishReason: string | null;
}

// ---------------------------------------------------------------------------
// Diagnostic Logging
// ---------------------------------------------------------------------------

function logDiagnostics(label: string, result: CompletionResult): DiagnosticMetadata {
  const content = result.content;
  const trimmed = content.trim();
  const startsWithBrace = trimmed.startsWith('{') || trimmed.startsWith('[');
  const endsWithBrace = trimmed.endsWith('}') || trimmed.endsWith(']');
  const first300 = content.slice(0, 300).replace(/\r?\n/g, ' ');
  const last300 = content.slice(-300).replace(/\r?\n/g, ' ');

  console.log(`${label} === Diagnostic Metadata ===`);
  console.log(`${label} Content length: ${content.length}`);
  console.log(`${label} Reasoning content length: ${result.reasoningContent.length}`);
  console.log(`${label} Finish reason: ${result.finishReason || 'unknown'}`);
  console.log(`${label} Starts with '{': ${startsWithBrace}`);
  console.log(`${label} Ends with '}': ${endsWithBrace}`);
  console.log(`${label} First 300 chars: ${first300}`);
  console.log(`${label} Last 300 chars: ${last300}`);

  if (result.finishReason === 'length') {
    console.warn(
      `${label} WARNING: Model output reached max_tokens and was truncated (finish_reason='length'). Truncated JSON repair will be applied.`,
    );
  }

  return {
    contentLength: content.length,
    reasoningContentLength: result.reasoningContent.length,
    finishReason: result.finishReason,
    startsWithBrace,
    endsWithBrace,
    first300,
    last300,
  };
}

// ---------------------------------------------------------------------------
// Robust JSON Extraction & Repair Utilities
// ---------------------------------------------------------------------------

/**
 * Strips <think>…</think> reasoning traces if any leaked into content.
 */
function stripThinkingTraces(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
}

/**
 * Escapes unescaped raw newlines/tabs/carriage-returns that appear
 * inside JSON string literals, which would otherwise crash JSON.parse.
 */
function sanitizeJsonStringLiterals(str: string): string {
  let inString = false;
  let escaped = false;
  let result = '';

  for (let i = 0; i < str.length; i++) {
    const char = str[i];

    if (char === '"' && !escaped) {
      inString = !inString;
      result += char;
    } else if (char === '\\' && !escaped) {
      escaped = true;
      result += char;
    } else {
      if (inString) {
        if (char === '\n') {
          result += '\\n';
        } else if (char === '\r') {
          result += '\\r';
        } else if (char === '\t') {
          result += '\\t';
        } else {
          result += char;
        }
      } else {
        result += char;
      }
      escaped = false;
    }
  }

  return result;
}

/**
 * Attempts to repair incomplete or truncated JSON by closing open quotes,
 * brackets, and braces in the correct hierarchical order.
 */
function repairTruncatedJson(jsonStr: string): string {
  let inString = false;
  let escaped = false;
  const stack: string[] = [];

  for (let i = 0; i < jsonStr.length; i++) {
    const char = jsonStr[i];
    if (char === '"' && !escaped) {
      inString = !inString;
    } else if (char === '\\' && !escaped) {
      escaped = true;
      continue;
    } else if (!inString) {
      if (char === '{') stack.push('}');
      else if (char === '[') stack.push(']');
      else if (char === '}' || char === ']') {
        if (stack.length > 0 && stack[stack.length - 1] === char) {
          stack.pop();
        }
      }
    }
    escaped = false;
  }

  let repaired = jsonStr;
  if (inString) {
    repaired += '"';
  }

  // Strip trailing unclosed colon or comma
  repaired = repaired.replace(/[:,]\s*$/, '');

  // Close all open braces and brackets in reverse order
  while (stack.length > 0) {
    const closer = stack.pop();
    if (closer) repaired += closer;
  }

  return repaired;
}

export interface RobustParseResult {
  success: boolean;
  data?: any;
  error?: string;
  repairApplied?: string;
}

/**
 * Robustly extracts and parses JSON from raw LLM output.
 * Handles:
 *  - Markdown code fences (```json ... ``` or unclosed ```json ...)
 *  - Leading and trailing prose/explanations
 *  - Trailing commas in objects and arrays
 *  - Unescaped control characters in strings
 *  - Smart/curly quotes
 *  - Truncated JSON recovery
 */
export function robustExtractAndParseJson(raw: string): RobustParseResult {
  if (!raw || typeof raw !== 'string') {
    return { success: false, error: 'Empty model response' };
  }

  // 1. Strip any <think> tags
  let text = stripThinkingTraces(raw);

  // 2. Strip markdown fences if present
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)(?:```|$)/i);
  if (fenceMatch && fenceMatch[1]) {
    const candidate = fenceMatch[1].trim();
    if (candidate.startsWith('{') || candidate.startsWith('[')) {
      text = candidate;
    }
  }

  // 3. Extract from outermost '{' to '}' or '[' to ']'
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  const firstBracket = text.indexOf('[');
  const lastBracket = text.lastIndexOf(']');

  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    if (lastBrace > firstBrace) {
      text = text.slice(firstBrace, lastBrace + 1);
    } else {
      text = text.slice(firstBrace);
    }
  } else if (firstBracket !== -1) {
    if (lastBracket > firstBracket) {
      text = text.slice(firstBracket, lastBracket + 1);
    } else {
      text = text.slice(firstBracket);
    }
  }

  // Attempt 1: Direct JSON.parse
  try {
    return { success: true, data: JSON.parse(text) };
  } catch {
    // Continue to repair pipeline
  }

  // Attempt 2: Strip trailing commas (e.g. `{"a": 1, }` or `[1, 2, ]`)
  let cleaned = text.replace(/,\s*([}\]])/g, '$1');
  try {
    return { success: true, data: JSON.parse(cleaned), repairApplied: 'trailing-comma-removal' };
  } catch {
    // Continue
  }

  // Attempt 3: Sanitize raw control characters in string literals
  cleaned = sanitizeJsonStringLiterals(cleaned);
  try {
    return { success: true, data: JSON.parse(cleaned), repairApplied: 'control-char-sanitization' };
  } catch {
    // Continue
  }

  // Attempt 4: Replace smart/curly quotes with standard quotes
  cleaned = cleaned
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2018\u2019]/g, "'");
  try {
    return { success: true, data: JSON.parse(cleaned), repairApplied: 'smart-quote-normalization' };
  } catch {
    // Continue
  }

  // Attempt 5: Repair truncated JSON
  const repaired = repairTruncatedJson(cleaned);
  try {
    return { success: true, data: JSON.parse(repaired), repairApplied: 'truncated-json-repair' };
  } catch (e: any) {
    return { success: false, error: e?.message || 'Failed all JSON extraction strategies' };
  }
}

/**
 * Normalizes common minor variations in fact-checking payloads
 * (e.g., lowercase enums, synonyms like 'Misleading', numeric strings)
 * prior to strict Zod schema validation.
 */
function normalizeFactCheckPayload(data: any): any {
  if (!data || typeof data !== 'object') return data;

  // Normalize overall verdict
  if (typeof data.verdict === 'string') {
    const rawV = data.verdict.trim().toUpperCase().replace(/\s+/g, '_');
    const verdictMap: Record<string, string> = {
      TRUE: 'TRUE',
      MOSTLY_TRUE: 'MOSTLY_TRUE',
      MOSTLYTRUE: 'MOSTLY_TRUE',
      MIXTURE: 'MIXTURE',
      MIXED: 'MIXTURE',
      PARTLY_TRUE: 'MIXTURE',
      PARTIALLY_TRUE: 'MIXTURE',
      MOSTLY_FALSE: 'MOSTLY_FALSE',
      MOSTLYFALSE: 'MOSTLY_FALSE',
      MISLEADING: 'MOSTLY_FALSE',
      FALSE: 'FALSE',
      UNVERIFIABLE: 'UNVERIFIABLE',
      UNKNOWN: 'UNVERIFIABLE',
    };
    if (verdictMap[rawV]) {
      data.verdict = verdictMap[rawV];
    }
  }

  // Normalize confidenceScore
  if (typeof data.confidenceScore === 'string') {
    const parsed = parseFloat(data.confidenceScore);
    if (!isNaN(parsed)) data.confidenceScore = parsed;
  }
  if (typeof data.confidenceScore === 'number') {
    data.confidenceScore = Math.max(0, Math.min(100, Math.round(data.confidenceScore)));
  }

  // Normalize claims array
  if (Array.isArray(data.claims)) {
    for (const claim of data.claims) {
      if (claim && typeof claim === 'object') {
        if (typeof claim.verdict === 'string') {
          const rawCv = claim.verdict.trim().toUpperCase().replace(/\s+/g, '_');
          const claimVerdictMap: Record<string, string> = {
            TRUE: 'TRUE',
            MOSTLY_TRUE: 'MOSTLY_TRUE',
            MOSTLYTRUE: 'MOSTLY_TRUE',
            MIXTURE: 'MIXTURE',
            MIXED: 'MIXTURE',
            PARTLY_TRUE: 'MIXTURE',
            PARTIALLY_TRUE: 'MIXTURE',
            MOSTLY_FALSE: 'MOSTLY_FALSE',
            MOSTLYFALSE: 'MOSTLY_FALSE',
            MISLEADING: 'MOSTLY_FALSE',
            FALSE: 'FALSE',
            UNVERIFIABLE: 'UNVERIFIABLE',
          };
          if (claimVerdictMap[rawCv]) {
            claim.verdict = claimVerdictMap[rawCv];
          }
        }
        if (Array.isArray(claim.evidence)) {
          for (const ev of claim.evidence) {
            if (ev && typeof ev === 'object' && typeof ev.credibility === 'string') {
              const cred = ev.credibility.trim().toUpperCase();
              if (['HIGH', 'MEDIUM', 'LOW'].includes(cred)) {
                ev.credibility = cred;
              }
            }
          }
        }
      }
    }
  }

  return data;
}

// ---------------------------------------------------------------------------
// Core: nvidiaGenerateObject
// ---------------------------------------------------------------------------

export interface NvidiaGenerateObjectOptions<T extends z.ZodType> {
  /** Zod schema for structured output validation */
  schema: T;
  /** The user prompt to send */
  prompt: string;
  /** Caller label for logging (e.g., 'Extract', 'Synthesize') */
  callerLabel: string;
  /** AbortSignal for cancellation */
  abortSignal?: AbortSignal;
  /**
   * Maximum output tokens (reasoning + completion tokens).
   * Defaults to 16384 for Nemotron 3 Ultra.
   */
  maxTokens?: number;
  /**
   * Whether to run the model in chain-of-thought "thinking" mode. Defaults to
   * true. Thinking materially improves quality for genuinely hard synthesis
   * (extraction, final verdicts) but is pure latency overhead for small,
   * mechanical classification tasks (e.g. "list supporting points as JSON") —
   * disable it for those callers to cut per-call latency significantly.
   */
  enableThinking?: boolean;
}

export interface NvidiaGenerateObjectResult<T> {
  /** The validated structured object */
  object: T;
  /** Model identifier used */
  modelUsed: string;
  /** Diagnostic metadata from the completion */
  diagnostics?: DiagnosticMetadata;
}

/**
 * Generate a structured object using NVIDIA Nemotron 3 Ultra.
 *
 * Strategy:
 *  1. Stream a completion via NVIDIA's OpenAI-compatible API, with chain-of-thought
 *     "thinking" mode on by default (disable per-call via `enableThinking: false`
 *     for cheap, mechanical tasks where reasoning is pure latency overhead).
 *  2. Isolate `reasoning_content` strictly into reasoning trace; accumulate `content` for the final answer.
 *  3. NEVER pass reasoning trace to JSON parser.
 *  4. Log comprehensive diagnostic metadata (content length, reasoning length, finish_reason, previews).
 *  5. Extract and repair JSON using multi-strategy robust pipeline.
 *  6. Apply fact-check schema normalization prior to Zod validation.
 *  7. On failure → single retry with explicit correction prompt.
 */
export async function nvidiaGenerateObject<T extends z.ZodType>(
  options: NvidiaGenerateObjectOptions<T>,
): Promise<NvidiaGenerateObjectResult<z.infer<T>>> {
  const { schema, prompt, callerLabel, abortSignal, maxTokens = 16384, enableThinking = true } = options;

  const label = `[NeMo] [${callerLabel}]`;
  const startTime = Date.now();

  console.log(`${label} Model: ${NVIDIA_MODEL}`);
  console.log(`${label} Starting request`);

  const client = getNvidiaClient();

  const systemPrompt =
    'You are an expert AI assistant that outputs strictly valid JSON. ' +
    'You MUST respond with ONLY a single valid JSON object that strictly matches the required schema. ' +
    'Do not include markdown code fences, prose, or preamble. ' +
    'All strings must be properly JSON-escaped with no raw control characters.';

  async function callNvidia(userContent: string): Promise<CompletionResult> {
    const stream = (await client.chat.completions.create(
      {
        model: NVIDIA_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent },
        ],
        temperature: 1,
        top_p: 0.95,
        max_tokens: maxTokens,
        // @ts-ignore — chat_template_kwargs is passed through by openai v7
        chat_template_kwargs: { enable_thinking: enableThinking },
        stream: true,
      } as any,
      abortSignal ? { signal: abortSignal } : undefined,
    )) as unknown as AsyncIterable<any>;

    let contentAccum = '';
    let reasoningAccum = '';
    let finishReason: string | null = null;

    for await (const chunk of stream) {
      const choice = chunk.choices?.[0];
      if (!choice) continue;
      if (choice.finish_reason) {
        finishReason = choice.finish_reason;
      }
      if (choice.delta) {
        if (choice.delta.content) {
          contentAccum += choice.delta.content;
        }
        if (choice.delta.reasoning_content) {
          reasoningAccum += choice.delta.reasoning_content;
        }
      }
    }

    return {
      content: contentAccum,
      reasoningContent: reasoningAccum,
      finishReason,
    };
  }

  async function executeWithRetry(
    userContent: string,
    stageLabel: string,
    maxAttempts = 4,
  ): Promise<CompletionResult> {
    let lastError: any;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      let release: (() => void) | null = null;
      try {
        release = await nvidiaLimiter.acquire(abortSignal);
        return await callNvidia(userContent);
      } catch (rawError: any) {
        lastError = rawError;
        const classified = classifyNvidiaError(rawError);
        const duration = Date.now() - startTime;

        if (classified.retryable && attempt < maxAttempts && !abortSignal?.aborted) {
          const isRateLimit = classified.statusCode === 429;
          // Exponential backoff with random jitter to break synchronized thundering-herd retries
          const baseBackoff = isRateLimit ? 3000 * Math.pow(1.6, attempt - 1) : attempt * 2000;
          const jitter = Math.floor(Math.random() * 1500);
          const backoffMs = Math.round(baseBackoff + jitter);

          if (isRateLimit) {
            nvidiaLimiter.setRateLimitCooldown(backoffMs);
          }

          console.warn(
            `${label} [${stageLabel}] Attempt ${attempt}/${maxAttempts} failed with retryable error (${classified.message}). Retrying in ${backoffMs}ms...`,
          );
          await new Promise((r) => setTimeout(r, backoffMs));
          continue;
        }

        console[classified.severity](
          `${label} [${stageLabel}] Request failed after ${duration}ms: ${classified.message}`,
        );
        throw new NvidiaError(classified.message, classified.statusCode);
      } finally {
        if (release) release();
      }
    }
    const classified = classifyNvidiaError(lastError);
    throw new NvidiaError(classified.message, classified.statusCode);
  }

  // ── Attempt 1 ──────────────────────────────────────────────────────────────
  const result1 = await executeWithRetry(prompt, 'Initial', 4);

  // Log diagnostic metadata for Attempt 1
  const diag1 = logDiagnostics(label, result1);

  // Parse ONLY the final answer content (NEVER the reasoning trace)
  const parsedAttempt1 = robustExtractAndParseJson(result1.content);

  if (parsedAttempt1.success && parsedAttempt1.data) {
    if (parsedAttempt1.repairApplied) {
      console.log(`${label} JSON parse succeeded using repair: ${parsedAttempt1.repairApplied}`);
    }
    const normalizedData = normalizeFactCheckPayload(parsedAttempt1.data);
    const validated1 = schema.safeParse(normalizedData);
    if (validated1.success) {
      const duration = Date.now() - startTime;
      console.log(`${label} Completed in ${duration}ms`);
      return {
        object: validated1.data as z.infer<T>,
        modelUsed: NVIDIA_MODEL,
        diagnostics: diag1,
      };
    }
    console.warn(
      `${label} Attempt 1 schema validation failed: ${validated1.error.message}`,
    );
  } else {
    console.warn(
      `${label} Attempt 1 JSON parse failed: ${parsedAttempt1.error}. Preview: ${result1.content.slice(0, 200)}`,
    );
  }

  // ── Attempt 2 — single retry with correction prompt ─────────────────────────
  console.log(`${label} Retrying with correction prompt`);

  const correctionPrompt =
    `${prompt}\n\n` +
    `CRITICAL ERROR IN PREVIOUS RESPONSE: ` +
    `Your previous response failed to parse as valid JSON or did not match the required schema. ` +
    `Return ONLY a single valid, well-formed JSON object. ` +
    `Ensure all quotes are closed, all commas are properly placed, and no raw newlines appear inside string values. ` +
    `No text before or after the JSON. No markdown fences. Just the raw JSON object.`;

  const result2 = await executeWithRetry(correctionPrompt, 'Correction', 2);

  // Log diagnostic metadata for Attempt 2
  const diag2 = logDiagnostics(label, result2);

  // Parse ONLY the final answer content (NEVER the reasoning trace)
  const parsedAttempt2 = robustExtractAndParseJson(result2.content);

  if (!parsedAttempt2.success || !parsedAttempt2.data) {
    const duration = Date.now() - startTime;
    console.error(
      `${label} Retry JSON parse failed after ${duration}ms: ${parsedAttempt2.error}. Preview: ${result2.content.slice(0, 200)}`,
    );
    throw new NvidiaError(
      'NVIDIA Nemotron returned an invalid response format after retry.',
      500,
    );
  }

  if (parsedAttempt2.repairApplied) {
    console.log(`${label} Retry JSON parse succeeded using repair: ${parsedAttempt2.repairApplied}`);
  }

  const normalizedData2 = normalizeFactCheckPayload(parsedAttempt2.data);
  const validated2 = schema.safeParse(normalizedData2);
  if (!validated2.success) {
    const duration = Date.now() - startTime;
    console.error(
      `${label} Retry schema validation failed after ${duration}ms: ${validated2.error.message}`,
    );
    throw new NvidiaError(
      'NVIDIA Nemotron response did not match the required schema after retry.',
      500,
    );
  }

  const duration = Date.now() - startTime;
  console.log(`${label} Completed in ${duration}ms (after retry)`);
  return {
    object: validated2.data as z.infer<T>,
    modelUsed: NVIDIA_MODEL,
    diagnostics: diag2,
  };
}

// ---------------------------------------------------------------------------
// Custom Error Class
// ---------------------------------------------------------------------------

export class NvidiaError extends Error {
  public readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'NvidiaError';
    this.statusCode = statusCode;
  }
}
