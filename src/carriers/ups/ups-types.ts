// Raw UPS API shapes — all types inferred from Zod schemas (single source of truth).
// PascalCase keys and string values mirror the UPS Rating API specification.

import type { z } from 'zod';
import type {
  UpsRateRequestBodySchema,
  UpsRateResponseSchema,
  UpsRatedShipmentSchema,
  UpsAddressSchema,
  UpsOAuthResponseSchema,
  UpsErrorResponseSchema,
} from './ups-schemas.js';

// Request types
export type UpsRateRequestBody = z.infer<typeof UpsRateRequestBodySchema>;
export type UpsAddress = z.infer<typeof UpsAddressSchema>;

// Response types
export type UpsRateResponseBody = z.infer<typeof UpsRateResponseSchema>;
export type UpsRatedShipment = z.infer<typeof UpsRatedShipmentSchema>;

// OAuth types
export type UpsOAuthResponse = z.infer<typeof UpsOAuthResponseSchema>;

// Error types
export type UpsErrorResponse = z.infer<typeof UpsErrorResponseSchema>;
