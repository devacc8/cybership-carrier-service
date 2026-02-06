import type { RateRequest, RateResponse, RateQuote } from '../domain/types.js';
import type { CarrierCode } from '../domain/enums.js';
import { RateRequestSchema } from '../domain/schemas.js';
import { CarrierError, CarrierErrorCode } from '../domain/errors.js';
import { CarrierRegistry } from './carrier-registry.js';

export class RateService {
  constructor(private readonly registry: CarrierRegistry) {}

  /**
   * Get rates from a specific carrier.
   */
  async getRates(
    carrierCode: CarrierCode,
    request: RateRequest,
  ): Promise<RateResponse> {
    const validated = this.validate(request);
    const provider = this.registry.get(carrierCode);
    return provider.getRates(validated);
  }

  /**
   * Shop rates across all registered carriers.
   * Returns combined quotes sorted by total charges ascending.
   * One carrier failing does not block others.
   */
  async shopRates(request: RateRequest): Promise<RateResponse> {
    const validated = this.validate(request);
    const providers = this.registry.getAll();

    if (providers.length === 0) {
      throw new CarrierError({
        code: CarrierErrorCode.CARRIER_NOT_FOUND,
        message: 'No carriers registered',
      });
    }

    const results = await Promise.allSettled(
      providers.map((p) => p.getRates(validated)),
    );

    const quotes: RateQuote[] = [];
    const warnings: string[] = [];

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (result.status === 'fulfilled') {
        quotes.push(...result.value.quotes);
        if (result.value.warnings) {
          warnings.push(...result.value.warnings);
        }
      } else {
        warnings.push(
          `${providers[i].carrierCode}: ${result.reason?.message ?? 'Unknown error'}`,
        );
      }
    }

    quotes.sort((a, b) => a.totalCharges.amount - b.totalCharges.amount);

    return {
      quotes,
      ...(warnings.length > 0 ? { warnings } : {}),
    };
  }

  private validate(request: RateRequest): RateRequest {
    const parsed = RateRequestSchema.safeParse(request);
    if (!parsed.success) {
      throw new CarrierError({
        code: CarrierErrorCode.VALIDATION_ERROR,
        message: 'Invalid rate request',
        details: { issues: parsed.error.issues },
      });
    }
    return parsed.data;
  }
}
