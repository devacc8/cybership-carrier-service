import type { CarrierCode, DimensionUnit, ServiceLevel, WeightUnit } from './enums.js';

export interface Address {
  name?: string;
  addressLines: string[];
  city: string;
  stateProvince?: string;
  postalCode: string;
  countryCode: string;
  residential?: boolean;
}

export interface PackageDimensions {
  length: number;
  width: number;
  height: number;
  unit: DimensionUnit;
}

export interface PackageWeight {
  value: number;
  unit: WeightUnit;
}

export interface ShipmentPackage {
  weight: PackageWeight;
  dimensions?: PackageDimensions;
}

export interface RateRequest {
  origin: Address;
  destination: Address;
  packages: ShipmentPackage[];
  serviceLevel?: ServiceLevel;
  shipFrom?: Address;
}

export interface MonetaryAmount {
  amount: number;
  currency: string;
}

export interface RateQuote {
  carrier: CarrierCode;
  serviceLevel: ServiceLevel;
  serviceName: string;
  totalCharges: MonetaryAmount;
  transportationCharges: MonetaryAmount;
  billingWeight: PackageWeight;
  guaranteedDelivery?: {
    businessDays: number;
    deliveryByTime?: string;
  };
}

export interface RateResponse {
  quotes: RateQuote[];
  warnings?: string[];
}
