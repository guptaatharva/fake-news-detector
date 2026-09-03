import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateObject } from 'ai';
import type { z } from 'zod';

// ---------------------------------------------------------------------------
// Gemini Provider Configuration
// ---------------------------------------------------------------------------

const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY,
});

/**
 * Ordered list of verified Gemini models.
 * Primary model: gemini-3.7-flash (verified in live Gemini API catalog)
 * Fallback model: gemini-3.5-flash (verified in live Gemini API catalog)
 */
const GEMINI_MODELS = [
  'gemini-3.7-flash',
  'gemini-3.5-flash',
] as const;

type GeminiModel = (typeof GEMINI_MODELS)[number];

// ---------------------------------------------------------------------------
// Error Classification
// ---------------------------------------------------------------------------

interface ClassifiedError {
  /** Whether the error is retryable with the same model */
  retryable: boolean;
  /** Whether the error should trigger a fallback to a different model */
  shouldFallback: boolean;
  /** HTTP-like status code to return to client */
  statusCode: number;
  /** User-facing error message */
  message: string;
  /** Log-level label */
  severity: 'warn' | 'error';
}

function classifyGeminiError(error: any): ClassifiedError {
  const actualError = error?.lastError || error;
  const statusCode = actualError?.statusCode || actualError?.status;
  const message = actualError?.message || error?.message || '';
  const errorName = actualError?.name || error?.name || '';

  // 503 UNAVAILABLE — high demand, capacity exhausted
  if (statusCode === 503 || message.includes('UNAVAILABLE') || message.includes('high demand') || message.includes('overloaded')) {
    return {
      retryable: false,
      shouldFallback: true,
      statusCode: 503,
      message: 'Gemini model temporarily unavailable due to high demand.',
      severity: 'warn',
    };
  }

  // 429 RESOURCE_EXHAUSTED — rate limited / quota exceeded
  if (statusCode === 429 || message.includes('RESOURCE_EXHAUSTED') || message.includes('rate limit') || message.includes('Quota exceeded') || message.includes('quota')) {
    return {
      retryable: false,
      shouldFallback: true, // Try fallback model which has separate quota
      statusCode: 429,
      message: 'Gemini API rate limit exceeded.',
      severity: 'warn',
    };
  }

  // 401/403 — auth errors, never retry or fallback
  if (statusCode === 401) {
    return {
      retryable: false,
      shouldFallback: false,
      statusCode: 401,
      message: 'Gemini API authentication failed. Please verify API key.',
      severity: 'error',
    };
  }
  if (statusCode === 403) {
    return {
      retryable: false,
      shouldFallback: false,
      statusCode: 403,
      message: 'Gemini API permission denied. Please verify configuration.',
      severity: 'error',
    };
  }

  // 404 — model not found
  if (statusCode === 404 || message.includes('not found')) {
    return {
      retryable: false,
      shouldFallback: true, // try fallback model
      statusCode: 404,
      message: 'The requested Gemini model was not found.',
      severity: 'warn',
    };
  }

  // 410 — model retired
  if (statusCode === 410 || message.includes('retired') || message.includes('no longer available')) {
    return {
      retryable: false,
      shouldFallback: true,
      statusCode: 410,
      message: 'The requested Gemini model has been retired.',
      severity: 'warn',
    };
  }

  // 400 — bad request (prompt issue, schema issue)
  if (statusCode === 400) {
    return {
      retryable: false,
      shouldFallback: false,
      statusCode: 400,
      message: 'Gemini API rejected the request. Check prompt and schema configuration.',
      severity: 'error',
    };
  }

  // 500 — Gemini internal server error
  if (statusCode === 500) {
    return {
      retryable: false,
      shouldFallback: true,
      statusCode: 500,
      message: 'Gemini API experienced an internal server error.',
      severity: 'warn',
    };
  }

  // Timeout & Abort errors: DO NOT sequentially retry all fallback models when timeout has occurred
  if (
    errorName.includes('Timeout') ||
    errorName.includes('Abort') ||
    message.toLowerCase().includes('timeout') ||
    message.toLowerCase().includes('aborted')
  ) {
    return {
      retryable: false,
      shouldFallback: false, // Timeout means request took its full allocated window; do not loop through more models
      statusCode: 504,
      message: 'The AI request timed out.',
      severity: 'warn',
    };
  }

  // Structured output validation errors
  if (
    errorName.includes('ValidationError') ||
    errorName.includes('ParseError') ||
    errorName.includes('NoObjectGeneratedError')
  ) {
    return {
      retryable: false,
      shouldFallback: true, // different model may produce valid output
      statusCode: 500,
      message: 'The AI model returned an invalid response format.',
      severity: 'warn',
    };
  }

  // Unknown error — don't retry
  return {
    retryable: false,
    shouldFallback: false,
    statusCode: 500,
    message: `Gemini API encountered an unexpected error.`,
    severity: 'error',
  };
}

// ---------------------------------------------------------------------------
// Core: generateObject with Model Fallback
// ---------------------------------------------------------------------------

interface GeminiGenerateObjectOptions<T extends z.ZodType> {
  /** Zod schema for structured output */
  schema: T;
  /** The prompt to send */
  prompt: string;
  /** Optional thinking level for Gemini models that support it */
  thinkingLevel?: 'none' | 'low' | 'medium' | 'high';
  /** Caller label for logging (e.g., 'Extract', 'Synthesize') */
  callerLabel: string;
  /** AbortSignal for cancellation */
  abortSignal?: AbortSignal;
  /** Execution timeout in milliseconds (default: 90,000ms / 90s) */
  timeoutMs?: number;
}

interface GeminiGenerateObjectResult<T> {
  /** The generated object */
  object: T;
  /** Which model was actually used */
  modelUsed: string;
  /** Whether a fallback model was used */
  usedFallback: boolean;
}

/**
 * Generate a structured object using Gemini, with sensible timeout and automatic model fallback.
 */
export async function geminiGenerateObject<T extends z.ZodType>(
  options: GeminiGenerateObjectOptions<T>,
): Promise<GeminiGenerateObjectResult<z.infer<T>>> {
  const {
    schema,
    prompt,
    thinkingLevel = 'low',
    callerLabel,
    abortSignal,
    timeoutMs = 90_000,
  } = options;
  const errors: { model: string; error: ClassifiedError }[] = [];

  for (let i = 0; i < GEMINI_MODELS.length; i++) {
    const modelName = GEMINI_MODELS[i];
    const isFirstAttempt = i === 0;
    const label = `[Gemini] [${callerLabel}]`;

    if (isFirstAttempt) {
      console.log(`${label} Primary model: ${modelName}`);
    } else {
      console.log(`${label} Fallback model: ${modelName}`);
    }

    const startTime = Date.now();
    const attemptController = new AbortController();
    const attemptTimeout = setTimeout(() => attemptController.abort(), timeoutMs);

    // If caller provided an external abort signal, link it
    if (abortSignal) {
      abortSignal.addEventListener('abort', () => attemptController.abort(), { once: true });
    }

    try {
      // Build provider options — only include thinkingLevel for models that support it
      const providerOpts = buildProviderOptions(modelName, thinkingLevel);

      const { object } = await generateObject({
        model: google(modelName),
        schema,
        prompt,
        maxRetries: 0, // Disable SDK retries — we handle fallback manually
        abortSignal: attemptController.signal,
        ...(providerOpts ? { providerOptions: providerOpts } : {}),
      });

      clearTimeout(attemptTimeout);

      const duration = Date.now() - startTime;
      console.log(
        `${label} Success with ${modelName} in ${duration}ms` +
        (i > 0 ? ` (fallback from ${GEMINI_MODELS[0]})` : ''),
      );

      return {
        object: object as z.infer<T>,
        modelUsed: modelName,
        usedFallback: !isFirstAttempt,
      };
    } catch (rawError: any) {
      clearTimeout(attemptTimeout);
      const duration = Date.now() - startTime;
      const classified = classifyGeminiError(rawError);

      console[classified.severity](
        `${label} ${modelName} failed after ${duration}ms: ${classified.message}`,
      );

      errors.push({ model: modelName, error: classified });

      // If the error should NOT trigger fallback, fail immediately
      if (!classified.shouldFallback) {
        throw new GeminiError(classified.message, classified.statusCode, errors);
      }

      // If there are more models to try, log and continue
      if (i < GEMINI_MODELS.length - 1) {
        console.log(
          `${label} ${modelName} unavailable (${classified.statusCode}), attempting fallback...`,
        );
      }
    }
  }

  // All models exhausted
  const lastError = errors[errors.length - 1]?.error;
  throw new GeminiError(
    lastError?.message || 'All Gemini models are currently unavailable. Please try again later.',
    lastError?.statusCode || 503,
    errors,
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build provider options appropriate for the given model.
 * Only Gemini 3.x models support `thinkingLevel`.
 * Gemini 2.x models don't — passing it would cause errors.
 */
function buildProviderOptions(
  modelName: GeminiModel,
  thinkingLevel: string,
): Record<string, any> | null {
  // Only models in the 3.x family support thinking
  if (modelName.startsWith('gemini-3')) {
    return {
      google: { thinkingLevel },
    };
  }
  // 2.x models — no thinking support
  return null;
}

// ---------------------------------------------------------------------------
// Custom Error Class
// ---------------------------------------------------------------------------

export class GeminiError extends Error {
  public readonly statusCode: number;
  public readonly attempts: { model: string; error: ClassifiedError }[];

  constructor(
    message: string,
    statusCode: number,
    attempts: { model: string; error: ClassifiedError }[],
  ) {
    super(message);
    this.name = 'GeminiError';
    this.statusCode = statusCode;
    this.attempts = attempts;
  }
}
