import type { CarrierProvider } from '../domain/interfaces.js';
import type { CarrierCode } from '../domain/enums.js';
import { CarrierError, CarrierErrorCode } from '../domain/errors.js';

export class CarrierRegistry {
  private providers = new Map<CarrierCode, CarrierProvider>();

  register(provider: CarrierProvider): void {
    this.providers.set(provider.carrierCode, provider);
  }

  get(carrierCode: CarrierCode): CarrierProvider {
    const provider = this.providers.get(carrierCode);
    if (!provider) {
      throw new CarrierError({
        code: CarrierErrorCode.CARRIER_NOT_FOUND,
        message: `No provider registered for carrier: ${carrierCode}`,
      });
    }
    return provider;
  }

  getAll(): CarrierProvider[] {
    return Array.from(this.providers.values());
  }
}
