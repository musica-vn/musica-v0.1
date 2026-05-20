export type ApiErrorResponse = {
  success: false
  statusCode: number
  error: {
    code: string
    message: string
    details?: unknown
  }
  requestId: string
  timestamp: string
}
