import { z } from 'zod';
import { DimensionUnit, ServiceLevel, WeightUnit } from './enums.js';

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
  serviceLevel: z.nativeEnum(ServiceLevel).optional(),
  shipFrom: AddressSchema.optional(),
});
