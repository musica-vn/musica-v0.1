import type { ApiErrorResponse } from './api-error-response.js'
import type { ApiSuccessResponse } from './api-success-response.js'

export type ApiResponse<TData, TMeta = undefined> =
  | ApiSuccessResponse<TData, TMeta>
  | ApiErrorResponse
