export interface ProviderFamilyConfig {
  apiKey: string
  baseUrl: string
  model: string
  systemInstruction: string
  timeoutMs: number
}

export interface RuntimeProviderConfig {
  deepseek: ProviderFamilyConfig
  openrouterGeminiFlashLite: ProviderFamilyConfig
  openrouterQwenFree: ProviderFamilyConfig
  lanes: {
    deepseek: boolean
    openrouterGeminiFlashLite: boolean
    openrouterQwenFree: boolean
  }
  runtimeFetchTimeoutMs: number
}

function readNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function readFlag(value: string | undefined, fallback = true): boolean {
  if (value == null || value === '') return fallback
  return value === '1' || value.toLowerCase() === 'true'
}

export function loadRuntimeProviderConfig(): RuntimeProviderConfig {
  return {
    deepseek: {
      apiKey: process.env.DEEPSEEK_API_KEY || '',
      baseUrl: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
      model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
      systemInstruction: process.env.DEEPSEEK_SYSTEM_INSTRUCTION || '',
      timeoutMs: readNumber(process.env.DEEPSEEK_TIMEOUT_MS, 45000)
    },
    openrouterGeminiFlashLite: {
      apiKey: process.env.OPENROUTER_API_KEY || '',
      baseUrl: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
      model:
        process.env.OPENROUTER_MODEL_GEMINI_FLASH_LITE || 'google/gemini-3.1-flash-lite-preview',
      systemInstruction: process.env.OPENROUTER_SYSTEM_INSTRUCTION_GEMINI_FLASH_LITE || '',
      timeoutMs: readNumber(process.env.OPENROUTER_TIMEOUT_MS, 45000)
    },
    openrouterQwenFree: {
      apiKey: process.env.OPENROUTER_API_KEY || '',
      baseUrl: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
      model: process.env.OPENROUTER_MODEL_QWEN_FREE || 'qwen/qwen3.6-plus-preview:free',
      systemInstruction: process.env.OPENROUTER_SYSTEM_INSTRUCTION_QWEN_FREE || '',
      timeoutMs: readNumber(process.env.OPENROUTER_TIMEOUT_MS, 45000)
    },
    lanes: {
      deepseek: readFlag(process.env.MODEL_ROUTER_ENABLE_DEEPSEEK, true),
      openrouterGeminiFlashLite: readFlag(
        process.env.MODEL_ROUTER_ENABLE_OPENROUTER_GEMINI_FLASH_LITE,
        true
      ),
      openrouterQwenFree: readFlag(process.env.MODEL_ROUTER_ENABLE_OPENROUTER_QWEN_FREE, true)
    },
    runtimeFetchTimeoutMs: readNumber(process.env.RUNTIME_FETCH_TIMEOUT_MS, 15000)
  }
}
