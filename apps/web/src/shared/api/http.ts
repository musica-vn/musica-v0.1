import axios, { AxiosError, type AxiosRequestConfig } from 'axios'
import type { ApiErrorResponse, ApiResponse, ApiSuccessResponse } from '@musica/contracts'

export class ApiClientError extends Error {
  public readonly statusCode: number
  public readonly code: string
  public readonly details?: unknown
  public readonly requestId?: string

  constructor(payload: ApiErrorResponse) {
    super(payload.error.message)
    this.name = 'ApiClientError'
    this.statusCode = payload.statusCode
    this.code = payload.error.code
    this.details = payload.error.details
    this.requestId = payload.requestId
  }
}

export const httpClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
})

export const setHttpBearerToken = (accessToken?: string) => {
  if (typeof accessToken === 'string' && accessToken.length > 0) {
    httpClient.defaults.headers.common.Authorization = `Bearer ${accessToken}`
    return
  }

  delete httpClient.defaults.headers.common.Authorization
}

type ApiOkResult<TData, TMeta> = Pick<
  ApiSuccessResponse<TData, unknown>,
  'data' | 'statusCode' | 'requestId' | 'timestamp'
> &
  (TMeta extends undefined ? { meta?: undefined } : { meta: TMeta })

const isApiErrorResponse = (value: unknown): value is ApiErrorResponse =>
  typeof value === 'object' && value !== null && 'success' in value && (value as any).success === false

const isApiSuccessResponse = <TData, TMeta>(
  value: ApiResponse<TData, TMeta>,
): value is ApiSuccessResponse<TData, TMeta> => value.success === true

export const apiGet = async <TData, TMeta = undefined>(
  url: string,
  config?: AxiosRequestConfig,
): Promise<ApiOkResult<TData, TMeta>> => {
  try {
    const response = await httpClient.get<ApiResponse<TData, TMeta>>(url, config)

    if (isApiSuccessResponse<TData, TMeta>(response.data)) {
      const baseResult = {
        data: response.data.data,
        statusCode: response.data.statusCode,
        requestId: response.data.requestId,
        timestamp: response.data.timestamp,
      }

      const metaResult =
        response.data.meta === undefined ? {} : { meta: response.data.meta as TMeta }

      return { ...baseResult, ...metaResult } as ApiOkResult<TData, TMeta>
    }

    throw new ApiClientError(response.data)
  } catch (error) {
    if (error instanceof ApiClientError) throw error

    if (error instanceof AxiosError && isApiErrorResponse(error.response?.data)) {
      throw new ApiClientError(error.response?.data)
    }

    throw error
  }
}

export const apiPost = async <TData, TBody = unknown, TMeta = undefined>(
  url: string,
  body?: TBody,
  config?: AxiosRequestConfig,
): Promise<ApiOkResult<TData, TMeta>> => {
  try {
    const response = await httpClient.post<ApiResponse<TData, TMeta>>(url, body, config)

    if (isApiSuccessResponse<TData, TMeta>(response.data)) {
      const baseResult = {
        data: response.data.data,
        statusCode: response.data.statusCode,
        requestId: response.data.requestId,
        timestamp: response.data.timestamp,
      }

      const metaResult =
        response.data.meta === undefined ? {} : { meta: response.data.meta as TMeta }

      return { ...baseResult, ...metaResult } as ApiOkResult<TData, TMeta>
    }

    throw new ApiClientError(response.data)
  } catch (error) {
    if (error instanceof ApiClientError) throw error

    if (error instanceof AxiosError && isApiErrorResponse(error.response?.data)) {
      throw new ApiClientError(error.response?.data)
    }

    throw error
  }
}
