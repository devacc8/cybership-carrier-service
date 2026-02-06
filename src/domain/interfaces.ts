import type { CarrierCode } from './enums.js';
import type { RateRequest, RateResponse } from './types.js';

export interface CarrierProvider {
  readonly carrierCode: CarrierCode;
  getRates(request: RateRequest): Promise<RateResponse>;
}

export interface AuthProvider {
  getAccessToken(): Promise<string>;
  invalidateToken(): void;
}

export interface HttpClient {
  post<TResponse>(
    url: string,
    body: unknown,
    options: HttpRequestOptions,
  ): Promise<HttpResponse<TResponse>>;
}

export interface HttpRequestOptions {
  headers: Record<string, string>;
  timeoutMs?: number;
}

export interface HttpResponse<T> {
  status: number;
  data: T;
  headers: Record<string, string>;
}
