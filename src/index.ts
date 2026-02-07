// Domain types
export type {
  Address,
  PackageDimensions,
  PackageWeight,
  ShipmentPackage,
  RateRequest,
  RateResponse,
  RateQuote,
  MonetaryAmount,
} from './domain/types.js';

// Domain enums
export {
  CarrierCode,
  WeightUnit,
  DimensionUnit,
} from './domain/enums.js';

// Domain interfaces
export type {
  CarrierProvider,
  AuthProvider,
  HttpClient,
  HttpRequestOptions,
  HttpResponse,
} from './domain/interfaces.js';

// Domain schemas
export {
  RateRequestSchema,
  AddressSchema,
  ShipmentPackageSchema,
  PackageWeightSchema,
  PackageDimensionsSchema,
} from './domain/schemas.js';

// Errors
export { CarrierError, CarrierErrorCode } from './domain/errors.js';

// Core
export { CarrierRegistry } from './core/carrier-registry.js';
export { RateService } from './core/rate-service.js';
export { FetchHttpClient } from './core/http-client.js';

// UPS carrier
export { UpsProvider } from './carriers/ups/ups-provider.js';
export type { UpsConfig } from './carriers/ups/ups-config.js';
export { UpsServiceLevel } from './carriers/ups/ups-config.js';

// Configuration
export { loadUpsConfig } from './config/env.js';
