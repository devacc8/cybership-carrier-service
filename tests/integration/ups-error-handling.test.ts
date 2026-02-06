import { describe, it, expect, beforeEach } from 'vitest';
import { UpsProvider } from '../../src/carriers/ups/ups-provider.js';
import { MockHttpClient } from '../helpers/mock-http-client.js';
import { CarrierError, CarrierErrorCode } from '../../src/domain/errors.js';
import { WeightUnit } from '../../src/domain/enums.js';
import type { RateRequest } from '../../src/domain/types.js';
import type { UpsConfig } from '../../src/carriers/ups/ups-config.js';
import oauthFixture from '../fixtures/ups-oauth-response.json';
import shopFixture from '../fixtures/ups-rate-response-shop.json';
import error400 from '../fixtures/ups-error-400.json';
import error401 from '../fixtures/ups-error-401.json';
import error429 from '../fixtures/ups-error-429.json';

const TEST_CONFIG: UpsConfig = {
  clientId: 'test_client_id',
  clientSecret: 'test_client_secret',
  baseUrl: 'https://onlinetools.ups.com',
  oauthUrl: 'https://onlinetools.ups.com/security/v1/oauth/token',
  version: 'v2409',
  transactionSrc: 'testing',
  authTimeoutMs: 5000,
  ratingTimeoutMs: 10000,
};

const sampleRequest: RateRequest = {
  origin: {
    addressLines: ['100 Main Street'],
    city: 'TIMONIUM',
    stateProvince: 'MD',
    postalCode: '21093',
    countryCode: 'US',
  },
  destination: {
    addressLines: ['200 Oak Avenue'],
    city: 'Alpharetta',
    stateProvince: 'GA',
    postalCode: '30005',
    countryCode: 'US',
  },
  packages: [{ weight: { value: 10, unit: WeightUnit.LBS } }],
};

function authOk() {
  return { status: 200, data: oauthFixture, headers: {} };
}

describe('UPS Error Handling', () => {
  let http: MockHttpClient;
  let provider: UpsProvider;

  beforeEach(() => {
    http = new MockHttpClient();
    provider = new UpsProvider(http, TEST_CONFIG);
  });

  it('throws CARRIER_API_ERROR on 400 with UPS error body', async () => {
    http
      .respondWith(authOk())
      .respondWith({ status: 400, data: error400, headers: {} });

    const error = await provider.getRates(sampleRequest).catch((e) => e);

    expect(error).toBeInstanceOf(CarrierError);
    expect(error.code).toBe(CarrierErrorCode.CARRIER_API_ERROR);
    expect(error.httpStatus).toBe(400);
    expect(error.retryable).toBe(false);
    expect(error.message).toContain('unavailable between the selected locations');
  });

  it('throws RATE_LIMITED on 429', async () => {
    http
      .respondWith(authOk())
      .respondWith({ status: 429, data: error429, headers: {} });

    const error = await provider.getRates(sampleRequest).catch((e) => e);

    expect(error).toBeInstanceOf(CarrierError);
    expect(error.code).toBe(CarrierErrorCode.RATE_LIMITED);
    expect(error.httpStatus).toBe(429);
    expect(error.retryable).toBe(true);
  });

  it('retries once on 401 from rating endpoint (token refresh)', async () => {
    http
      .respondWith(authOk()) // initial auth
      .respondWith({ status: 401, data: error401, headers: {} }) // rating 401
      .respondWith(authOk()) // re-auth
      .respondWith({ status: 200, data: shopFixture, headers: {} }); // retry rating

    const result = await provider.getRates(sampleRequest);

    expect(result.quotes).toHaveLength(3);
    // 1st auth + 1st rating (401) + 2nd auth + 2nd rating (200) = 4
    expect(http.requests).toHaveLength(4);
  });

  it('fails on second 401 after retry (does not loop)', async () => {
    http
      .respondWith(authOk()) // initial auth
      .respondWith({ status: 401, data: error401, headers: {} }) // rating 401
      .respondWith(authOk()) // re-auth
      .respondWith({ status: 401, data: error401, headers: {} }); // retry still 401

    const error = await provider.getRates(sampleRequest).catch((e) => e);

    expect(error).toBeInstanceOf(CarrierError);
    expect(error.code).toBe(CarrierErrorCode.CARRIER_API_ERROR);
    expect(error.httpStatus).toBe(401);
  });

  it('throws CARRIER_API_ERROR on 500 with retryable=true', async () => {
    http
      .respondWith(authOk())
      .respondWith({ status: 500, data: { response: { errors: [] } }, headers: {} });

    const error = await provider.getRates(sampleRequest).catch((e) => e);

    expect(error).toBeInstanceOf(CarrierError);
    expect(error.code).toBe(CarrierErrorCode.CARRIER_API_ERROR);
    expect(error.httpStatus).toBe(500);
    expect(error.retryable).toBe(true);
  });

  it('throws TIMEOUT on network timeout', async () => {
    http.respondWith(authOk()).respondWithTimeout();

    const error = await provider.getRates(sampleRequest).catch((e) => e);

    expect(error).toBeInstanceOf(CarrierError);
    expect(error.code).toBe(CarrierErrorCode.TIMEOUT);
    expect(error.retryable).toBe(true);
    expect(error.carrier).toBe('UPS');
  });

  it('throws NETWORK_ERROR on connection failure', async () => {
    http.respondWith(authOk()).respondWithError(new Error('ECONNREFUSED'));

    const error = await provider.getRates(sampleRequest).catch((e) => e);

    expect(error).toBeInstanceOf(CarrierError);
    expect(error.code).toBe(CarrierErrorCode.NETWORK_ERROR);
    expect(error.retryable).toBe(true);
    expect(error.carrier).toBe('UPS');
  });

  it('throws MALFORMED_RESPONSE on invalid JSON structure', async () => {
    http
      .respondWith(authOk())
      .respondWith({ status: 200, data: { unexpected: 'shape' }, headers: {} });

    const error = await provider.getRates(sampleRequest).catch((e) => e);

    expect(error).toBeInstanceOf(CarrierError);
    expect(error.code).toBe(CarrierErrorCode.MALFORMED_RESPONSE);
    expect(error.carrier).toBe('UPS');
  });

  it('includes carrier name in all error types', async () => {
    http.respondWith(authOk()).respondWithTimeout();

    const error = await provider.getRates(sampleRequest).catch((e) => e);
    expect(error.carrier).toBe('UPS');
  });
});
