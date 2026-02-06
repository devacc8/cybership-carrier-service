import type {
  HttpClient,
  HttpRequestOptions,
  HttpResponse,
} from '../../src/domain/interfaces.js';

export interface RecordedRequest {
  url: string;
  body: unknown;
  options: HttpRequestOptions;
}

type ResponseFactory = (
  url: string,
  body: unknown,
  options: HttpRequestOptions,
) => Promise<HttpResponse<unknown>>;

/**
 * Stubbable HTTP client for tests. Responses are consumed FIFO.
 * Records all requests for assertion.
 */
export class MockHttpClient implements HttpClient {
  public requests: RecordedRequest[] = [];
  private responseFactories: ResponseFactory[] = [];

  respondWith<T>(response: HttpResponse<T>): this {
    this.responseFactories.push(async () => response);
    return this;
  }

  respondWithFactory(factory: ResponseFactory): this {
    this.responseFactories.push(factory);
    return this;
  }

  respondWithError(error: Error): this {
    this.responseFactories.push(async () => {
      throw error;
    });
    return this;
  }

  respondWithTimeout(): this {
    const error = new Error('The operation was aborted');
    error.name = 'AbortError';
    return this.respondWithError(error);
  }

  async post<TResponse>(
    url: string,
    body: unknown,
    options: HttpRequestOptions,
  ): Promise<HttpResponse<TResponse>> {
    this.requests.push({ url, body, options });

    const factory = this.responseFactories.shift();
    if (!factory) {
      throw new Error(
        `MockHttpClient: no response queued for request #${this.requests.length} to ${url}`,
      );
    }

    return factory(url, body, options) as Promise<HttpResponse<TResponse>>;
  }

  get lastRequest(): RecordedRequest | undefined {
    return this.requests.at(-1);
  }

  reset(): void {
    this.requests = [];
    this.responseFactories = [];
  }
}
