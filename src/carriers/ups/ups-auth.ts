import type { AuthProvider, HttpClient } from '../../domain/interfaces.js';
import { CarrierError, CarrierErrorCode } from '../../domain/errors.js';
import { UpsOAuthResponseSchema } from './ups-schemas.js';
import type { UpsConfig } from './ups-config.js';

interface CachedToken {
  accessToken: string;
  expiresAt: number;
}

// Refresh 60 seconds before actual expiry to avoid edge-case failures
const TOKEN_EXPIRY_BUFFER_MS = 60_000;

export class UpsAuthProvider implements AuthProvider {
  private cachedToken: CachedToken | null = null;
  private refreshPromise: Promise<string> | null = null;

  constructor(
    private readonly httpClient: HttpClient,
    private readonly config: UpsConfig,
  ) {}

  async getAccessToken(): Promise<string> {
    if (this.cachedToken && Date.now() < this.cachedToken.expiresAt) {
      return this.cachedToken.accessToken;
    }

    // Deduplicate concurrent refresh calls (thundering herd protection)
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.acquireToken();
    try {
      return await this.refreshPromise;
    } finally {
      this.refreshPromise = null;
    }
  }

  invalidateToken(): void {
    this.cachedToken = null;
  }

  private async acquireToken(): Promise<string> {
    const credentials = Buffer.from(
      `${this.config.clientId}:${this.config.clientSecret}`,
    ).toString('base64');

    try {
      const response = await this.httpClient.post(
        this.config.oauthUrl,
        'grant_type=client_credentials',
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${credentials}`,
          },
          timeoutMs: this.config.authTimeoutMs,
        },
      );

      if (response.status !== 200) {
        throw new CarrierError({
          code: CarrierErrorCode.AUTH_FAILED,
          message: `UPS OAuth failed with status ${response.status}`,
          carrier: 'UPS',
          httpStatus: response.status,
          retryable: response.status >= 500,
        });
      }

      const parsed = UpsOAuthResponseSchema.safeParse(response.data);
      if (!parsed.success) {
        throw new CarrierError({
          code: CarrierErrorCode.MALFORMED_RESPONSE,
          message: 'UPS OAuth returned unexpected response format',
          carrier: 'UPS',
          details: { issues: parsed.error.issues },
        });
      }

      const expiresInMs = parseInt(parsed.data.expires_in, 10) * 1000;
      this.cachedToken = {
        accessToken: parsed.data.access_token,
        expiresAt: Date.now() + expiresInMs - TOKEN_EXPIRY_BUFFER_MS,
      };

      return this.cachedToken.accessToken;
    } catch (error) {
      if (error instanceof CarrierError) throw error;

      throw new CarrierError({
        code: CarrierErrorCode.NETWORK_ERROR,
        message: 'Failed to acquire UPS OAuth token',
        carrier: 'UPS',
        retryable: true,
        cause: error instanceof Error ? error : undefined,
      });
    }
  }
}
