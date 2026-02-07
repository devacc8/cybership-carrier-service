import type { CarrierProvider, HttpClient } from '../../domain/interfaces.js';
import type { RateRequest, RateResponse } from '../../domain/types.js';
import { CarrierCode } from '../../domain/enums.js';
import { CarrierError, CarrierErrorCode } from '../../domain/errors.js';
import { UpsAuthProvider } from './ups-auth.js';
import { UpsRatingMapper } from './ups-rating-mapper.js';
import { UpsRateResponseSchema, UpsErrorResponseSchema } from './ups-schemas.js';
import type { UpsConfig } from './ups-config.js';

export class UpsProvider implements CarrierProvider {
  readonly carrierCode = CarrierCode.UPS;
  private readonly auth: UpsAuthProvider;
  private readonly mapper: UpsRatingMapper;

  constructor(
    private readonly httpClient: HttpClient,
    private readonly config: UpsConfig,
  ) {
    this.auth = new UpsAuthProvider(httpClient, config);
    this.mapper = new UpsRatingMapper(config);
  }

  async getRates(request: RateRequest): Promise<RateResponse> {
    return this.executeRateRequest(request, false);
  }

  private async executeRateRequest(
    request: RateRequest,
    isRetry: boolean,
  ): Promise<RateResponse> {
    const upsRequest = this.mapper.toUpsRateRequest(request);
    const requestOption = request.serviceLevel ? 'Rate' : 'Shop';
    const url = `${this.config.baseUrl}/api/rating/${this.config.version}/${requestOption}`;

    const token = await this.auth.getAccessToken();

    try {
      const response = await this.httpClient.post(url, upsRequest, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          transId: crypto.randomUUID(),
          transactionSrc: this.config.transactionSrc,
        },
        timeoutMs: this.config.ratingTimeoutMs,
      });

      // 401: invalidate token and retry once
      if (response.status === 401 && !isRetry) {
        this.auth.invalidateToken();
        return this.executeRateRequest(request, true);
      }

      if (response.status === 429) {
        throw new CarrierError({
          code: CarrierErrorCode.RATE_LIMITED,
          message: 'UPS rate limit exceeded',
          carrier: 'UPS',
          httpStatus: 429,
          retryable: true,
        });
      }

      if (response.status >= 400) {
        const errorParsed = UpsErrorResponseSchema.safeParse(response.data);
        const errorMessage = errorParsed.success
          ? errorParsed.data.response.errors[0]?.message
          : undefined;

        throw new CarrierError({
          code: CarrierErrorCode.CARRIER_API_ERROR,
          message: errorMessage ?? `UPS API error: ${response.status}`,
          carrier: 'UPS',
          httpStatus: response.status,
          retryable: response.status >= 500,
          details: errorParsed.success
            ? { errors: errorParsed.data.response.errors }
            : { rawData: response.data },
        });
      }

      // Validate response shape before mapping
      const parsed = UpsRateResponseSchema.safeParse(response.data);
      if (!parsed.success) {
        throw new CarrierError({
          code: CarrierErrorCode.MALFORMED_RESPONSE,
          message: 'UPS returned an unexpected response format',
          carrier: 'UPS',
          details: { issues: parsed.error.issues },
        });
      }

      return this.mapper.toRateResponse(parsed.data);
    } catch (error) {
      if (error instanceof CarrierError) throw error;

      const isTimeout =
        error instanceof Error &&
        (error.name === 'AbortError' || error.message.includes('timeout'));

      throw new CarrierError({
        code: isTimeout ? CarrierErrorCode.TIMEOUT : CarrierErrorCode.NETWORK_ERROR,
        message: isTimeout
          ? 'UPS API request timed out'
          : 'Failed to connect to UPS API',
        carrier: 'UPS',
        retryable: true,
        cause: error instanceof Error ? error : undefined,
      });
    }
  }
}
