export interface ProviderFamilyConfig {
  apiKey: string
  baseUrl: string
  model: string
  systemInstruction: string
  timeoutMs: number
}

export interface RuntimeProviderConfig {
  deepseek: ProviderFamilyConfig
  geminiFlash: ProviderFamilyConfig
  geminiPro: ProviderFamilyConfig
  activeLaneStrategy: 'single_deepseek'
  lanes: {
    deepseek: boolean
    geminiFlash: boolean
    geminiPro: boolean
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
    geminiFlash: {
      apiKey: process.env.GEMINI_API_KEY || '',
      baseUrl: process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com',
      model: process.env.GEMINI_FLASH_MODEL || 'gemini-2.5-flash',
      systemInstruction: process.env.GEMINI_SYSTEM_INSTRUCTION || '',
      timeoutMs: readNumber(process.env.GEMINI_TIMEOUT_MS, 45000)
    },
    geminiPro: {
      apiKey: process.env.GEMINI_API_KEY || '',
      baseUrl: process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com',
      model: process.env.GEMINI_PRO_MODEL || 'gemini-2.5-pro',
      systemInstruction: process.env.GEMINI_SYSTEM_INSTRUCTION || '',
      timeoutMs: readNumber(process.env.GEMINI_TIMEOUT_MS, 45000)
    },
    activeLaneStrategy: 'single_deepseek',
    lanes: {
      deepseek: readFlag(process.env.MODEL_ROUTER_ENABLE_DEEPSEEK, true),
      geminiFlash: readFlag(process.env.MODEL_ROUTER_ENABLE_GEMINI_FLASH, true),
      geminiPro: readFlag(process.env.MODEL_ROUTER_ENABLE_GEMINI_PRO, true)
    },
    runtimeFetchTimeoutMs: readNumber(process.env.RUNTIME_FETCH_TIMEOUT_MS, 15000)
  }
}
