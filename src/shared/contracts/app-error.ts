export type AppErrorCode =
  | 'AUTH_REQUIRED'
  | 'VALIDATION_FAILED'
  | 'NETWORK_ERROR'
  | 'SAVE_CONFLICT'
  | 'UNEXPECTED'

export interface AppError {
  code: AppErrorCode
  message: string
  recoverable: boolean
  details?: unknown
}
