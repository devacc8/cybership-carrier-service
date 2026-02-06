import { z } from 'zod';
import type { UpsConfig } from '../carriers/ups/ups-config.js';

const EnvSchema = z.object({
  UPS_CLIENT_ID: z.string().min(1),
  UPS_CLIENT_SECRET: z.string().min(1),
  UPS_ACCOUNT_NUMBER: z.string().optional(),
  UPS_BASE_URL: z.string().url().default('https://onlinetools.ups.com'),
  UPS_OAUTH_URL: z
    .string()
    .url()
    .default('https://onlinetools.ups.com/security/v1/oauth/token'),
  UPS_API_VERSION: z.string().default('v2409'),
  UPS_TRANSACTION_SRC: z.string().default('cybership'),
  UPS_AUTH_TIMEOUT_MS: z.coerce.number().positive().default(5000),
  UPS_RATING_TIMEOUT_MS: z.coerce.number().positive().default(10000),
});

export function loadUpsConfig(
  env: Record<string, string | undefined> = process.env,
): UpsConfig {
  const parsed = EnvSchema.parse(env);
  return {
    clientId: parsed.UPS_CLIENT_ID,
    clientSecret: parsed.UPS_CLIENT_SECRET,
    accountNumber: parsed.UPS_ACCOUNT_NUMBER,
    baseUrl: parsed.UPS_BASE_URL,
    oauthUrl: parsed.UPS_OAUTH_URL,
    version: parsed.UPS_API_VERSION,
    transactionSrc: parsed.UPS_TRANSACTION_SRC,
    authTimeoutMs: parsed.UPS_AUTH_TIMEOUT_MS,
    ratingTimeoutMs: parsed.UPS_RATING_TIMEOUT_MS,
  };
}
