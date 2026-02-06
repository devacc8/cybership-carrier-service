import { describe, it, expect } from 'vitest';
import { RateRequestSchema, AddressSchema, ShipmentPackageSchema } from '../../src/domain/schemas.js';
import { DimensionUnit, ServiceLevel, WeightUnit } from '../../src/domain/enums.js';

describe('Domain Schemas', () => {
  describe('AddressSchema', () => {
    it('accepts a valid address', () => {
      const result = AddressSchema.safeParse({
        addressLines: ['100 Main St'],
        city: 'Portland',
        stateProvince: 'OR',
        postalCode: '97201',
        countryCode: 'US',
      });
      expect(result.success).toBe(true);
    });

    it('rejects empty addressLines', () => {
      const result = AddressSchema.safeParse({
        addressLines: [],
        city: 'Portland',
        postalCode: '97201',
        countryCode: 'US',
      });
      expect(result.success).toBe(false);
    });

    it('rejects more than 3 addressLines', () => {
      const result = AddressSchema.safeParse({
        addressLines: ['Line 1', 'Line 2', 'Line 3', 'Line 4'],
        city: 'Portland',
        postalCode: '97201',
        countryCode: 'US',
      });
      expect(result.success).toBe(false);
    });

    it('rejects invalid countryCode length', () => {
      const result = AddressSchema.safeParse({
        addressLines: ['100 Main St'],
        city: 'Portland',
        postalCode: '97201',
        countryCode: 'USA',
      });
      expect(result.success).toBe(false);
    });

    it('allows optional fields to be omitted', () => {
      const result = AddressSchema.safeParse({
        addressLines: ['100 Main St'],
        city: 'Portland',
        postalCode: '97201',
        countryCode: 'US',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('ShipmentPackageSchema', () => {
    it('accepts package with weight only', () => {
      const result = ShipmentPackageSchema.safeParse({
        weight: { value: 10, unit: WeightUnit.LBS },
      });
      expect(result.success).toBe(true);
    });

    it('accepts package with weight and dimensions', () => {
      const result = ShipmentPackageSchema.safeParse({
        weight: { value: 10, unit: WeightUnit.LBS },
        dimensions: {
          length: 12,
          width: 8,
          height: 6,
          unit: DimensionUnit.IN,
        },
      });
      expect(result.success).toBe(true);
    });

    it('rejects zero weight', () => {
      const result = ShipmentPackageSchema.safeParse({
        weight: { value: 0, unit: WeightUnit.LBS },
      });
      expect(result.success).toBe(false);
    });

    it('rejects negative dimensions', () => {
      const result = ShipmentPackageSchema.safeParse({
        weight: { value: 10, unit: WeightUnit.LBS },
        dimensions: {
          length: -1,
          width: 8,
          height: 6,
          unit: DimensionUnit.IN,
        },
      });
      expect(result.success).toBe(false);
    });
  });

  describe('RateRequestSchema', () => {
    const validRequest = {
      origin: {
        addressLines: ['100 Main St'],
        city: 'Portland',
        stateProvince: 'OR',
        postalCode: '97201',
        countryCode: 'US',
      },
      destination: {
        addressLines: ['200 Oak Ave'],
        city: 'Seattle',
        stateProvince: 'WA',
        postalCode: '98101',
        countryCode: 'US',
      },
      packages: [{ weight: { value: 10, unit: WeightUnit.LBS } }],
    };

    it('accepts valid rate request', () => {
      const result = RateRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });

    it('accepts request with optional serviceLevel', () => {
      const result = RateRequestSchema.safeParse({
        ...validRequest,
        serviceLevel: ServiceLevel.GROUND,
      });
      expect(result.success).toBe(true);
    });

    it('rejects empty packages array', () => {
      const result = RateRequestSchema.safeParse({
        ...validRequest,
        packages: [],
      });
      expect(result.success).toBe(false);
    });

    it('rejects invalid service level', () => {
      const result = RateRequestSchema.safeParse({
        ...validRequest,
        serviceLevel: 'INVALID_SERVICE',
      });
      expect(result.success).toBe(false);
    });

    it('accepts request with shipFrom', () => {
      const result = RateRequestSchema.safeParse({
        ...validRequest,
        shipFrom: {
          addressLines: ['300 Elm St'],
          city: 'Denver',
          stateProvince: 'CO',
          postalCode: '80201',
          countryCode: 'US',
        },
      });
      expect(result.success).toBe(true);
    });
  });
});
