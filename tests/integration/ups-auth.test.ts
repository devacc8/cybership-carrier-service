import { describe, it, expect, beforeEach } from 'vitest';
import { UpsAuthProvider } from '../../src/carriers/ups/ups-auth.js';
import { MockHttpClient } from '../helpers/mock-http-client.js';
import { CarrierError, CarrierErrorCode } from '../../src/domain/errors.js';
import oauthFixture from '../fixtures/ups-oauth-response.json';
import type { UpsConfig } from '../../src/carriers/ups/ups-config.js';

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

function oauthResponse(overrides?: Partial<typeof oauthFixture>) {
  return {
    status: 200,
    data: { ...oauthFixture, ...overrides },
    headers: {},
  };
}

describe('UPS Auth Lifecycle', () => {
  let http: MockHttpClient;
  let auth: UpsAuthProvider;

  beforeEach(() => {
    http = new MockHttpClient();
    auth = new UpsAuthProvider(http, TEST_CONFIG);
  });

  it('acquires token on first call', async () => {
    http.respondWith(oauthResponse());

    const token = await auth.getAccessToken();

    expect(token).toBe(oauthFixture.access_token);
    expect(http.requests).toHaveLength(1);
    expect(http.requests[0].url).toBe(TEST_CONFIG.oauthUrl);
  });

  it('sends correct Basic auth header', async () => {
    http.respondWith(oauthResponse());

    await auth.getAccessToken();

    const expected = Buffer.from(
      `${TEST_CONFIG.clientId}:${TEST_CONFIG.clientSecret}`,
    ).toString('base64');
    expect(http.requests[0].options.headers.Authorization).toBe(
      `Basic ${expected}`,
    );
    expect(http.requests[0].options.headers['Content-Type']).toBe(
      'application/x-www-form-urlencoded',
    );
  });

  it('sends grant_type=client_credentials as body', async () => {
    http.respondWith(oauthResponse());

    await auth.getAccessToken();

    expect(http.requests[0].body).toBe('grant_type=client_credentials');
  });

  it('reuses cached token on subsequent calls', async () => {
    http.respondWith(oauthResponse());

    const token1 = await auth.getAccessToken();
    const token2 = await auth.getAccessToken();

    expect(token1).toBe(token2);
    expect(http.requests).toHaveLength(1);
  });

  it('refreshes token after invalidation', async () => {
    const secondToken = 'refreshed_access_token';
    http
      .respondWith(oauthResponse())
      .respondWith(oauthResponse({ access_token: secondToken }));

    const token1 = await auth.getAccessToken();
    auth.invalidateToken();
    const token2 = await auth.getAccessToken();

    expect(token1).toBe(oauthFixture.access_token);
    expect(token2).toBe(secondToken);
    expect(http.requests).toHaveLength(2);
  });

  it('refreshes token when expired', async () => {
    const shortLivedResponse = oauthResponse({ expires_in: '0' });
    const secondToken = 'refreshed_token_after_expiry';
    http
      .respondWith(shortLivedResponse)
      .respondWith(oauthResponse({ access_token: secondToken }));

    const token1 = await auth.getAccessToken();
    // Token with expires_in=0 will be immediately expired (due to buffer)
    const token2 = await auth.getAccessToken();

    expect(token1).toBe(oauthFixture.access_token);
    expect(token2).toBe(secondToken);
    expect(http.requests).toHaveLength(2);
  });

  it('deduplicates concurrent token requests', async () => {
    http.respondWith(oauthResponse());

    const [t1, t2, t3] = await Promise.all([
      auth.getAccessToken(),
      auth.getAccessToken(),
      auth.getAccessToken(),
    ]);

    expect(t1).toBe(oauthFixture.access_token);
    expect(t2).toBe(oauthFixture.access_token);
    expect(t3).toBe(oauthFixture.access_token);
    expect(http.requests).toHaveLength(1);
  });

  it('throws AUTH_FAILED on 401 from OAuth endpoint', async () => {
    http.respondWith({
      status: 401,
      data: {
        response: {
          errors: [{ code: '250002', message: 'Invalid Authentication' }],
        },
      },
      headers: {},
    });

    const error = await auth.getAccessToken().catch((e) => e);
    expect(error).toBeInstanceOf(CarrierError);
    expect(error.code).toBe(CarrierErrorCode.AUTH_FAILED);
    expect(error.httpStatus).toBe(401);
    expect(error.retryable).toBe(false);
  });

  it('throws AUTH_FAILED on 500 from OAuth endpoint with retryable=true', async () => {
    http.respondWith({ status: 500, data: {}, headers: {} });

    await expect(auth.getAccessToken()).rejects.toMatchObject({
      code: CarrierErrorCode.AUTH_FAILED,
      httpStatus: 500,
      retryable: true,
    });
  });

  it('throws NETWORK_ERROR on connection failure', async () => {
    http.respondWithError(new Error('ECONNREFUSED'));

    await expect(auth.getAccessToken()).rejects.toMatchObject({
      code: CarrierErrorCode.NETWORK_ERROR,
      retryable: true,
    });
  });

  it('throws MALFORMED_RESPONSE on unexpected OAuth response shape', async () => {
    http.respondWith({
      status: 200,
      data: { unexpected: 'shape' },
      headers: {},
    });

    await expect(auth.getAccessToken()).rejects.toMatchObject({
      code: CarrierErrorCode.MALFORMED_RESPONSE,
    });
  });
});
