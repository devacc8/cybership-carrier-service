import { describe, it, expect, beforeEach } from 'vitest';
import { UpsProvider } from '../../src/carriers/ups/ups-provider.js';
import { MockHttpClient } from '../helpers/mock-http-client.js';
import { CarrierCode, DimensionUnit, WeightUnit } from '../../src/domain/enums.js';
import { UpsServiceLevel } from '../../src/carriers/ups/ups-config.js';
import type { RateRequest } from '../../src/domain/types.js';
import type { UpsConfig } from '../../src/carriers/ups/ups-config.js';
import { UpsRateRequestBodySchema } from '../../src/carriers/ups/ups-schemas.js';
import oauthFixture from '../fixtures/ups-oauth-response.json';
import shopFixture from '../fixtures/ups-rate-response-shop.json';
import singleFixture from '../fixtures/ups-rate-response-single.json';

const TEST_CONFIG: UpsConfig = {
  clientId: 'test_client_id',
  clientSecret: 'test_client_secret',
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
    addressLines: ['200 Oak Avenue'],
    city: 'Alpharetta',
    stateProvince: 'GA',
    postalCode: '30005',
    countryCode: 'US',
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

function authOk() {
  return { status: 200, data: oauthFixture, headers: {} };
}

describe('UPS Rating Integration', () => {
  let http: MockHttpClient;
  let provider: UpsProvider;

  beforeEach(() => {
    http = new MockHttpClient();
    provider = new UpsProvider(http, TEST_CONFIG);
  });

  it('builds correct UPS request body from domain RateRequest', async () => {
    http.respondWith(authOk()).respondWith({
      status: 200,
      data: shopFixture,
      headers: {},
    });

    await provider.getRates(sampleRequest);

    // First request is OAuth, second is rating
    expect(http.requests).toHaveLength(2);
    const rateBody = UpsRateRequestBodySchema.parse(http.requests[1].body);

    expect(rateBody.RateRequest.Request.RequestOption).toBe('Shop');
    expect(rateBody.RateRequest.Shipment.Shipper.Name).toBe('Acme Corp');
    expect(rateBody.RateRequest.Shipment.Shipper.Address.PostalCode).toBe('21093');
    expect(rateBody.RateRequest.Shipment.ShipTo.Address.PostalCode).toBe('30005');
    expect(rateBody.RateRequest.Shipment.Package).toHaveLength(1);
    expect(rateBody.RateRequest.Shipment.Package[0].PackageWeight.Weight).toBe('10');
  });

  it('returns normalized RateQuotes from Shop response', async () => {
    http.respondWith(authOk()).respondWith({
      status: 200,
      data: shopFixture,
      headers: {},
    });

    const result = await provider.getRates(sampleRequest);

    expect(result.quotes).toHaveLength(3);
    expect(result.quotes[0].carrier).toBe(CarrierCode.UPS);
    expect(result.quotes[0].serviceLevel).toBe(UpsServiceLevel.GROUND);
    expect(result.quotes[0].totalCharges.amount).toBe(15.72);
    expect(result.quotes[0].totalCharges.currency).toBe('USD');
    expect(result.quotes[1].serviceLevel).toBe(UpsServiceLevel.SECOND_DAY_AIR);
    expect(result.quotes[2].serviceLevel).toBe(UpsServiceLevel.NEXT_DAY_AIR);
  });

  it('returns single RateQuote for specific service level', async () => {
    http.respondWith(authOk()).respondWith({
      status: 200,
      data: singleFixture,
      headers: {},
    });

    const result = await provider.getRates({
      ...sampleRequest,
      serviceLevel: UpsServiceLevel.GROUND,
    });

    expect(result.quotes).toHaveLength(1);
    expect(result.quotes[0].serviceLevel).toBe(UpsServiceLevel.GROUND);

    // URL should contain /Rate not /Shop
    expect(http.requests[1].url).toContain('/Rate');
  });

  it('uses /Shop URL when no serviceLevel specified', async () => {
    http.respondWith(authOk()).respondWith({
      status: 200,
      data: shopFixture,
      headers: {},
    });

    await provider.getRates(sampleRequest);

    expect(http.requests[1].url).toContain('/Shop');
    expect(http.requests[1].url).toContain('/v2409/');
  });

  it('passes correct headers including Authorization Bearer', async () => {
    http.respondWith(authOk()).respondWith({
      status: 200,
      data: shopFixture,
      headers: {},
    });

    await provider.getRates(sampleRequest);

    const headers = http.requests[1].options.headers;
    expect(headers.Authorization).toBe(
      `Bearer ${oauthFixture.access_token}`,
    );
    expect(headers['Content-Type']).toBe('application/json');
    expect(headers.transactionSrc).toBe('testing');
    expect(headers.transId).toBeDefined();
  });

  it('maps guaranteed delivery correctly', async () => {
    http.respondWith(authOk()).respondWith({
      status: 200,
      data: shopFixture,
      headers: {},
    });

    const result = await provider.getRates(sampleRequest);

    // Next Day Air has deliveryByTime
    expect(result.quotes[2].guaranteedDelivery?.businessDays).toBe(1);
    expect(result.quotes[2].guaranteedDelivery?.deliveryByTime).toBe(
      '10:30 A.M.',
    );

    // Ground has no deliveryByTime
    expect(result.quotes[0].guaranteedDelivery?.businessDays).toBe(5);
    expect(result.quotes[0].guaranteedDelivery?.deliveryByTime).toBeUndefined();
  });

  it('extracts warnings from response alerts', async () => {
    http.respondWith(authOk()).respondWith({
      status: 200,
      data: shopFixture,
      headers: {},
    });

    const result = await provider.getRates(sampleRequest);

    expect(result.warnings).toBeDefined();
    expect(result.warnings![0]).toContain('110971');
  });

  it('reuses cached auth token across multiple rate requests', async () => {
    http
      .respondWith(authOk())
      .respondWith({ status: 200, data: shopFixture, headers: {} })
      .respondWith({ status: 200, data: shopFixture, headers: {} });

    await provider.getRates(sampleRequest);
    await provider.getRates(sampleRequest);

    // 1 auth + 2 rating = 3 total (not 2 auth + 2 rating)
    expect(http.requests).toHaveLength(3);
    expect(http.requests[0].url).toContain('/oauth/token');
    expect(http.requests[1].url).toContain('/rating/');
    expect(http.requests[2].url).toContain('/rating/');
  });
});
