import type { z } from 'zod';
import type {
  AddressSchema,
  PackageDimensionsSchema,
  PackageWeightSchema,
  ShipmentPackageSchema,
  RateRequestSchema,
  MonetaryAmountSchema,
  GuaranteedDeliverySchema,
  RateQuoteSchema,
  RateResponseSchema,
} from './schemas.js';

// All types inferred from Zod schemas — single source of truth.

export type Address = z.infer<typeof AddressSchema>;
export type PackageDimensions = z.infer<typeof PackageDimensionsSchema>;
export type PackageWeight = z.infer<typeof PackageWeightSchema>;
export type ShipmentPackage = z.infer<typeof ShipmentPackageSchema>;
export type RateRequest = z.infer<typeof RateRequestSchema>;
export type MonetaryAmount = z.infer<typeof MonetaryAmountSchema>;
export type GuaranteedDelivery = z.infer<typeof GuaranteedDeliverySchema>;
export type RateQuote = z.infer<typeof RateQuoteSchema>;
export type RateResponse = z.infer<typeof RateResponseSchema>;
