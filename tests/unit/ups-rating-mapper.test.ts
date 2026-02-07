import { describe, it, expect } from 'vitest';
import { UpsRatingMapper } from '../../src/carriers/ups/ups-rating-mapper.js';
import { CarrierCode, DimensionUnit, WeightUnit } from '../../src/domain/enums.js';
import { UpsServiceLevel } from '../../src/carriers/ups/ups-config.js';
import type { RateRequest } from '../../src/domain/types.js';
import type { UpsConfig } from '../../src/carriers/ups/ups-config.js';
import { UpsRateResponseSchema } from '../../src/carriers/ups/ups-schemas.js';
import shopFixture from '../fixtures/ups-rate-response-shop.json';
import singleFixture from '../fixtures/ups-rate-response-single.json';

const TEST_CONFIG: UpsConfig = {
  clientId: 'test',
  clientSecret: 'test',
  accountNumber: '123456',
  baseUrl: 'https://onlinetools.ups.com',
  oauthUrl: 'https://onlinetools.ups.com/security/v1/oauth/token',
  version: 'v2409',
  transactionSrc: 'testing',
  authTimeoutMs: 5000,
  ratingTimeoutMs: 10000,
};

const sampleRequest: RateRequest = {
  origin: {
    name: 'Acme Corp',
    addressLines: ['100 Main Street'],
    city: 'TIMONIUM',
    stateProvince: 'MD',
    postalCode: '21093',
    countryCode: 'US',
  },
  destination: {
    name: 'John Smith',
    addressLines: ['200 Oak Avenue', 'Apt 5'],
    city: 'Alpharetta',
    stateProvince: 'GA',
    postalCode: '30005',
    countryCode: 'US',
    residential: true,
  },
  packages: [
    {
      weight: { value: 10, unit: WeightUnit.LBS },
      dimensions: {
        length: 12,
        width: 8,
        height: 6,
        unit: DimensionUnit.IN,
      },
    },
  ],
};

const parsedShopFixture = UpsRateResponseSchema.parse(shopFixture);
const parsedSingleFixture = UpsRateResponseSchema.parse(singleFixture);

describe('UpsRatingMapper', () => {
  const mapper = new UpsRatingMapper(TEST_CONFIG);

  describe('toUpsRateRequest', () => {
    it('maps origin to Shipper address', () => {
      const result = mapper.toUpsRateRequest(sampleRequest);
      const shipper = result.RateRequest.Shipment.Shipper;

      expect(shipper.Name).toBe('Acme Corp');
      expect(shipper.ShipperNumber).toBe('123456');
      expect(shipper.Address.AddressLine).toEqual(['100 Main Street']);
      expect(shipper.Address.City).toBe('TIMONIUM');
      expect(shipper.Address.StateProvinceCode).toBe('MD');
      expect(shipper.Address.PostalCode).toBe('21093');
      expect(shipper.Address.CountryCode).toBe('US');
    });

    it('maps destination to ShipTo address', () => {
      const result = mapper.toUpsRateRequest(sampleRequest);
      const shipTo = result.RateRequest.Shipment.ShipTo;

      expect(shipTo.Name).toBe('John Smith');
      expect(shipTo.Address.AddressLine).toEqual(['200 Oak Avenue', 'Apt 5']);
      expect(shipTo.Address.City).toBe('Alpharetta');
      expect(shipTo.Address.PostalCode).toBe('30005');
    });

    it('includes ResidentialAddressIndicator when residential is true', () => {
      const result = mapper.toUpsRateRequest(sampleRequest);
      expect(
        result.RateRequest.Shipment.ShipTo.Address.ResidentialAddressIndicator,
      ).toBe('');
    });

    it('omits ResidentialAddressIndicator when residential is false', () => {
      const req = {
        ...sampleRequest,
        destination: { ...sampleRequest.destination, residential: false },
      };
      const result = mapper.toUpsRateRequest(req);
      expect(
        result.RateRequest.Shipment.ShipTo.Address.ResidentialAddressIndicator,
      ).toBeUndefined();
    });

    it('maps package with dimensions and weight as strings', () => {
      const result = mapper.toUpsRateRequest(sampleRequest);
      const pkg = result.RateRequest.Shipment.Package[0];

      expect(pkg.PackagingType.Code).toBe('02');
      expect(pkg.PackageWeight.Weight).toBe('10');
      expect(pkg.PackageWeight.UnitOfMeasurement.Code).toBe('LBS');
      expect(pkg.Dimensions?.Length).toBe('12');
      expect(pkg.Dimensions?.Width).toBe('8');
      expect(pkg.Dimensions?.Height).toBe('6');
      expect(pkg.Dimensions?.UnitOfMeasurement.Code).toBe('IN');
    });

    it('omits Dimensions when not provided', () => {
      const req: RateRequest = {
        ...sampleRequest,
        packages: [{ weight: { value: 5, unit: WeightUnit.LBS } }],
      };
      const result = mapper.toUpsRateRequest(req);
      expect(result.RateRequest.Shipment.Package[0].Dimensions).toBeUndefined();
    });

    it('sets RequestOption to Shop when no serviceLevel', () => {
      const result = mapper.toUpsRateRequest(sampleRequest);
      expect(result.RateRequest.Request.RequestOption).toBe('Shop');
    });

    it('sets RequestOption to Rate when serviceLevel provided', () => {
      const req = { ...sampleRequest, serviceLevel: UpsServiceLevel.GROUND };
      const result = mapper.toUpsRateRequest(req);
      expect(result.RateRequest.Request.RequestOption).toBe('Rate');
      expect(result.RateRequest.Shipment.Service?.Code).toBe('03');
    });

    it('maps NEXT_DAY_AIR service level to UPS code 01', () => {
      const req = { ...sampleRequest, serviceLevel: UpsServiceLevel.NEXT_DAY_AIR };
      const result = mapper.toUpsRateRequest(req);
      expect(result.RateRequest.Shipment.Service?.Code).toBe('01');
    });

    it('includes ShipFrom when provided', () => {
      const req: RateRequest = {
        ...sampleRequest,
        shipFrom: {
          name: 'Warehouse',
          addressLines: ['300 Elm St'],
          city: 'BOCA RATON',
          stateProvince: 'FL',
          postalCode: '33434',
          countryCode: 'US',
        },
      };
      const result = mapper.toUpsRateRequest(req);
      expect(result.RateRequest.Shipment.ShipFrom?.Name).toBe('Warehouse');
      expect(result.RateRequest.Shipment.ShipFrom?.Address.City).toBe(
        'BOCA RATON',
      );
    });

    it('omits ShipFrom when not provided', () => {
      const result = mapper.toUpsRateRequest(sampleRequest);
      expect(result.RateRequest.Shipment.ShipFrom).toBeUndefined();
    });

    it('includes PaymentDetails when accountNumber is configured', () => {
      const result = mapper.toUpsRateRequest(sampleRequest);
      expect(
        result.RateRequest.Shipment.PaymentDetails?.ShipmentCharge[0]
          .BillShipper.AccountNumber,
      ).toBe('123456');
    });

    it('uses default Shipper name when origin has no name', () => {
      const req = {
        ...sampleRequest,
        origin: { ...sampleRequest.origin, name: undefined },
      };
      const result = mapper.toUpsRateRequest(req);
      expect(result.RateRequest.Shipment.Shipper.Name).toBe('Shipper');
    });
  });

  describe('toRateResponse', () => {
    it('maps Shop response with 3 services to 3 RateQuotes', () => {
      const result = mapper.toRateResponse(parsedShopFixture);

      expect(result.quotes).toHaveLength(3);
    });

    it('maps UPS service codes to UPS service levels', () => {
      const result = mapper.toRateResponse(parsedShopFixture);

      expect(result.quotes[0].serviceLevel).toBe(UpsServiceLevel.GROUND);
      expect(result.quotes[1].serviceLevel).toBe(UpsServiceLevel.SECOND_DAY_AIR);
      expect(result.quotes[2].serviceLevel).toBe(UpsServiceLevel.NEXT_DAY_AIR);
    });

    it('maps service names correctly', () => {
      const result = mapper.toRateResponse(parsedShopFixture);

      expect(result.quotes[0].serviceName).toBe('UPS Ground');
      expect(result.quotes[1].serviceName).toBe('UPS 2nd Day Air');
      expect(result.quotes[2].serviceName).toBe('UPS Next Day Air');
    });

    it('sets carrier to UPS on all quotes', () => {
      const result = mapper.toRateResponse(parsedShopFixture);

      for (const quote of result.quotes) {
        expect(quote.carrier).toBe(CarrierCode.UPS);
      }
    });

    it('parses monetary string values to numbers', () => {
      const result = mapper.toRateResponse(parsedShopFixture);

      expect(result.quotes[0].totalCharges.amount).toBe(15.72);
      expect(result.quotes[0].totalCharges.currency).toBe('USD');
      expect(result.quotes[0].transportationCharges.amount).toBe(15.72);
      expect(result.quotes[1].totalCharges.amount).toBe(28.45);
      expect(result.quotes[2].totalCharges.amount).toBe(52.3);
    });

    it('parses billing weight as number', () => {
      const result = mapper.toRateResponse(parsedShopFixture);

      expect(result.quotes[0].billingWeight.value).toBe(10.0);
      expect(result.quotes[0].billingWeight.unit).toBe(WeightUnit.LBS);
    });

    it('maps guaranteed delivery with businessDays', () => {
      const result = mapper.toRateResponse(parsedShopFixture);

      expect(result.quotes[0].guaranteedDelivery?.businessDays).toBe(5);
      expect(result.quotes[0].guaranteedDelivery?.deliveryByTime).toBeUndefined();
    });

    it('maps guaranteed delivery with deliveryByTime', () => {
      const result = mapper.toRateResponse(parsedShopFixture);

      expect(result.quotes[2].guaranteedDelivery?.businessDays).toBe(1);
      expect(result.quotes[2].guaranteedDelivery?.deliveryByTime).toBe(
        '10:30 A.M.',
      );
    });

    it('extracts warnings from response alerts', () => {
      const result = mapper.toRateResponse(parsedShopFixture);

      expect(result.warnings).toHaveLength(1);
      expect(result.warnings![0]).toContain('110971');
    });

    it('omits warnings when no alerts present', () => {
      const result = mapper.toRateResponse(parsedSingleFixture);

      expect(result.warnings).toBeUndefined();
    });

    it('maps single service response correctly', () => {
      const result = mapper.toRateResponse(parsedSingleFixture);

      expect(result.quotes).toHaveLength(1);
      expect(result.quotes[0].serviceLevel).toBe(UpsServiceLevel.GROUND);
      expect(result.quotes[0].totalCharges.amount).toBe(15.72);
    });
  });
});
