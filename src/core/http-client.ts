import type {
  HttpClient,
  HttpRequestOptions,
  HttpResponse,
} from '../domain/interfaces.js';
import { CarrierError, CarrierErrorCode } from '../domain/errors.js';

export class FetchHttpClient implements HttpClient {
  async post<TResponse>(
    url: string,
    body: unknown,
    options: HttpRequestOptions,
  ): Promise<HttpResponse<TResponse>> {
    const controller = new AbortController();
    const timeoutId = options.timeoutMs
      ? setTimeout(() => controller.abort(), options.timeoutMs)
      : undefined;

    try {
      const isFormData = typeof body === 'string';
      const response = await fetch(url, {
        method: 'POST',
        headers: options.headers,
        body: isFormData ? body : JSON.stringify(body),
        signal: controller.signal,
      });

      let data: TResponse;
      try {
        data = (await response.json()) as TResponse;
      } catch {
        throw new CarrierError({
          code: CarrierErrorCode.MALFORMED_RESPONSE,
          message: `Failed to parse JSON response from ${url}`,
          httpStatus: response.status,
        });
      }

      const headers: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headers[key] = value;
      });

      return { status: response.status, data, headers };
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  }
}
