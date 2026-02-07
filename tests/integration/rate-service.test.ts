import { describe, it, expect, beforeEach } from 'vitest';
import { RateService } from '../../src/core/rate-service.js';
import { CarrierRegistry } from '../../src/core/carrier-registry.js';
import { CarrierCode, WeightUnit } from '../../src/domain/enums.js';
import { CarrierError, CarrierErrorCode } from '../../src/domain/errors.js';
import type { CarrierProvider } from '../../src/domain/interfaces.js';
import type { RateRequest, RateResponse } from '../../src/domain/types.js';

const validRequest: RateRequest = {
  origin: {
    addressLines: ['100 Main Street'],
    city: 'TIMONIUM',
    stateProvince: 'MD',
    postalCode: '21093',
    countryCode: 'US',
  },
  destination: {
    addressLines: ['200 Oak Avenue'],
    city: 'Alpharetta',
    stateProvince: 'GA',
    postalCode: '30005',
    countryCode: 'US',
  },
  packages: [{ weight: { value: 10, unit: WeightUnit.LBS } }],
};

function mockProvider(
  code: CarrierCode,
  response: RateResponse,
): CarrierProvider {
  return {
    carrierCode: code,
    async getRates(): Promise<RateResponse> {
      return response;
    },
  };
}

function failingProvider(code: CarrierCode, message: string): CarrierProvider {
  return {
    carrierCode: code,
    async getRates(): Promise<RateResponse> {
      throw new CarrierError({
        code: CarrierErrorCode.NETWORK_ERROR,
        message,
        carrier: code,
      });
    },
  };
}

describe('RateService', () => {
  let registry: CarrierRegistry;
  let service: RateService;

  beforeEach(() => {
    registry = new CarrierRegistry();
    service = new RateService(registry);
  });

  it('validates input before calling carrier', async () => {
    registry.register(
      mockProvider(CarrierCode.UPS, { quotes: [] }),
    );

    const error = await service
      .getRates(CarrierCode.UPS, {
        ...validRequest,
        packages: [], // invalid: min 1 package
      })
      .catch((e) => e);

    expect(error).toBeInstanceOf(CarrierError);
    expect(error.code).toBe(CarrierErrorCode.VALIDATION_ERROR);
  });

  it('delegates to correct carrier by code', async () => {
    const upsResponse: RateResponse = {
      quotes: [
        {
          carrier: CarrierCode.UPS,
          serviceLevel: 'GROUND',
          serviceName: 'UPS Ground',
          totalCharges: { amount: 15.72, currency: 'USD' },
          transportationCharges: { amount: 15.72, currency: 'USD' },
          billingWeight: { value: 10, unit: WeightUnit.LBS },
        },
      ],
    };

    registry.register(mockProvider(CarrierCode.UPS, upsResponse));

    const result = await service.getRates(CarrierCode.UPS, validRequest);

    expect(result.quotes).toHaveLength(1);
    expect(result.quotes[0].carrier).toBe(CarrierCode.UPS);
  });

  it('throws CARRIER_NOT_FOUND for unregistered carrier', async () => {
    const error = await service
      .getRates(CarrierCode.FEDEX, validRequest)
      .catch((e) => e);

    expect(error).toBeInstanceOf(CarrierError);
    expect(error.code).toBe(CarrierErrorCode.CARRIER_NOT_FOUND);
  });

  describe('shopRates', () => {
    it('returns combined quotes from all carriers sorted by price', async () => {
      registry.register(
        mockProvider(CarrierCode.UPS, {
          quotes: [
            {
              carrier: CarrierCode.UPS,
              serviceLevel: 'GROUND',
              serviceName: 'UPS Ground',
              totalCharges: { amount: 20.0, currency: 'USD' },
              transportationCharges: { amount: 20.0, currency: 'USD' },
              billingWeight: { value: 10, unit: WeightUnit.LBS },
            },
          ],
        }),
      );

      registry.register(
        mockProvider(CarrierCode.FEDEX, {
          quotes: [
            {
              carrier: CarrierCode.FEDEX,
              serviceLevel: 'GROUND',
              serviceName: 'FedEx Ground',
              totalCharges: { amount: 12.5, currency: 'USD' },
              transportationCharges: { amount: 12.5, currency: 'USD' },
              billingWeight: { value: 10, unit: WeightUnit.LBS },
            },
          ],
        }),
      );

      const result = await service.shopRates(validRequest);

      expect(result.quotes).toHaveLength(2);
      // Sorted by price ascending: FedEx (12.5) then UPS (20.0)
      expect(result.quotes[0].carrier).toBe(CarrierCode.FEDEX);
      expect(result.quotes[0].totalCharges.amount).toBe(12.5);
      expect(result.quotes[1].carrier).toBe(CarrierCode.UPS);
      expect(result.quotes[1].totalCharges.amount).toBe(20.0);
    });

    it('continues when one carrier fails', async () => {
      registry.register(
        mockProvider(CarrierCode.UPS, {
          quotes: [
            {
              carrier: CarrierCode.UPS,
              serviceLevel: 'GROUND',
              serviceName: 'UPS Ground',
              totalCharges: { amount: 15.0, currency: 'USD' },
              transportationCharges: { amount: 15.0, currency: 'USD' },
              billingWeight: { value: 10, unit: WeightUnit.LBS },
            },
          ],
        }),
      );
      registry.register(failingProvider(CarrierCode.FEDEX, 'FedEx is down'));

      const result = await service.shopRates(validRequest);

      expect(result.quotes).toHaveLength(1);
      expect(result.quotes[0].carrier).toBe(CarrierCode.UPS);
      expect(result.warnings).toBeDefined();
      expect(result.warnings![0]).toContain('FedEx is down');
    });

    it('throws CARRIER_NOT_FOUND when no carriers registered', async () => {
      const error = await service.shopRates(validRequest).catch((e) => e);

      expect(error).toBeInstanceOf(CarrierError);
      expect(error.code).toBe(CarrierErrorCode.CARRIER_NOT_FOUND);
    });

    it('validates input before calling any carrier', async () => {
      registry.register(
        mockProvider(CarrierCode.UPS, { quotes: [] }),
      );

      const error = await service
        .shopRates({ ...validRequest, packages: [] })
        .catch((e) => e);

      expect(error).toBeInstanceOf(CarrierError);
      expect(error.code).toBe(CarrierErrorCode.VALIDATION_ERROR);
    });
  });
});
