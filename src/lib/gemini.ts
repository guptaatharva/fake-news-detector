/**
 * @deprecated This file has been replaced by `src/lib/nvidia.ts`.
 * All AI functionality now uses NVIDIA Nemotron 3 Ultra via the OpenAI-compatible API.
 * This stub re-exports the NVIDIA equivalents so any remaining references continue to compile.
 */
export {
  nvidiaGenerateObject as geminiGenerateObject,
  NvidiaError as GeminiError,
} from './nvidia';
