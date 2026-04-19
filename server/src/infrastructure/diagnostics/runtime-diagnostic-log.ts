export async function appendRuntimeDiagnosticLog(scope: string, message: string): Promise<void> {
  const line = `[${scope}] ${message}`
  console.log(line)
}
