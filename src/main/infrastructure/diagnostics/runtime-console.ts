function isExplicitlyEnabled(value: string | undefined): boolean {
  if (!value) return false
  return /^(1|true|yes|on)$/i.test(value.trim())
}

export function shouldPrintRuntimeConsole(env: NodeJS.ProcessEnv = process.env): boolean {
  return isExplicitlyEnabled(env.XINJUBEN_ENABLE_RUNTIME_STDOUT)
}

export function runtimeConsoleLog(...args: unknown[]): void {
  if (shouldPrintRuntimeConsole()) {
    console.log(...args)
  }
}

export function runtimeConsoleWarn(...args: unknown[]): void {
  if (shouldPrintRuntimeConsole()) {
    console.warn(...args)
  }
}

export function runtimeConsoleError(...args: unknown[]): void {
  if (shouldPrintRuntimeConsole()) {
    console.error(...args)
  }
}
