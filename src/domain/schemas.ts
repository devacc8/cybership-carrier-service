import { z } from 'zod';
import { CarrierCode, DimensionUnit, WeightUnit } from './enums.js';

// ---- Input schemas ----

export const AddressSchema = z.object({
  name: z.string().max(35).optional(),
  addressLines: z.array(z.string().min(1).max(35)).min(1).max(3),
  city: z.string().min(1).max(30),
  stateProvince: z.string().length(2).optional(),
  postalCode: z.string().min(1).max(9),
  countryCode: z.string().length(2),
  residential: z.boolean().optional(),
});

export const PackageDimensionsSchema = z.object({
  length: z.number().positive(),
  width: z.number().positive(),
  height: z.number().positive(),
  unit: z.nativeEnum(DimensionUnit),
});

export const PackageWeightSchema = z.object({
  value: z.number().positive(),
  unit: z.nativeEnum(WeightUnit),
});

export const ShipmentPackageSchema = z.object({
  weight: PackageWeightSchema,
  dimensions: PackageDimensionsSchema.optional(),
});

export const RateRequestSchema = z.object({
  origin: AddressSchema,
  destination: AddressSchema,
  packages: z.array(ShipmentPackageSchema).min(1).max(200),
  serviceLevel: z.string().optional(),
  shipFrom: AddressSchema.optional(),
});

// ---- Output schemas ----

export const MonetaryAmountSchema = z.object({
  amount: z.number(),
  currency: z.string(),
});

export const GuaranteedDeliverySchema = z.object({
  businessDays: z.number(),
  deliveryByTime: z.string().optional(),
});

export const RateQuoteSchema = z.object({
  carrier: z.nativeEnum(CarrierCode),
  serviceLevel: z.string(),
  serviceName: z.string(),
  totalCharges: MonetaryAmountSchema,
  transportationCharges: MonetaryAmountSchema,
  billingWeight: PackageWeightSchema,
  guaranteedDelivery: GuaranteedDeliverySchema.optional(),
});

export const RateResponseSchema = z.object({
  quotes: z.array(RateQuoteSchema),
  warnings: z.array(z.string()).optional(),
});
