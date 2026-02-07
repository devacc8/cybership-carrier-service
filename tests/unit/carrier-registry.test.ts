import { describe, it, expect } from 'vitest';
import { CarrierRegistry } from '../../src/core/carrier-registry.js';
import { CarrierCode } from '../../src/domain/enums.js';
import { CarrierError, CarrierErrorCode } from '../../src/domain/errors.js';
import type { CarrierProvider } from '../../src/domain/interfaces.js';
import type { RateRequest, RateResponse } from '../../src/domain/types.js';

function fakeProvider(code: CarrierCode): CarrierProvider {
  return {
    carrierCode: code,
    async getRates(_request: RateRequest): Promise<RateResponse> {
      return { quotes: [] };
    },
  };
}

describe('CarrierRegistry', () => {
  it('registers and retrieves a provider', () => {
    const registry = new CarrierRegistry();
    const provider = fakeProvider(CarrierCode.UPS);

    registry.register(provider);

    expect(registry.get(CarrierCode.UPS)).toBe(provider);
  });

  it('throws CARRIER_NOT_FOUND for unregistered carrier', () => {
    const registry = new CarrierRegistry();

    expect(() => registry.get(CarrierCode.FEDEX)).toThrow(CarrierError);
    try {
      registry.get(CarrierCode.FEDEX);
    } catch (e) {
      expect(e).toBeInstanceOf(CarrierError);
      expect((e as InstanceType<typeof CarrierError>).code).toBe(CarrierErrorCode.CARRIER_NOT_FOUND);
    }
  });

  it('returns all registered providers', () => {
    const registry = new CarrierRegistry();
    registry.register(fakeProvider(CarrierCode.UPS));
    registry.register(fakeProvider(CarrierCode.FEDEX));

    const all = registry.getAll();

    expect(all).toHaveLength(2);
  });

  it('overwrites provider when registered with same carrier code', () => {
    const registry = new CarrierRegistry();
    const first = fakeProvider(CarrierCode.UPS);
    const second = fakeProvider(CarrierCode.UPS);

    registry.register(first);
    registry.register(second);

    expect(registry.get(CarrierCode.UPS)).toBe(second);
    expect(registry.getAll()).toHaveLength(1);
  });
});
