import {
  CarrierRegistry,
  RateService,
  UpsProvider,
  CarrierCode,
  WeightUnit,
  DimensionUnit,
} from '../src/index.js';
import { MockHttpClient } from '../tests/helpers/mock-http-client.js';
import oauthFixture from '../tests/fixtures/ups-oauth-response.json';
import shopFixture from '../tests/fixtures/ups-rate-response-shop.json';

/**
 * CLI demo using mocked HTTP responses.
 * In production, replace MockHttpClient with FetchHttpClient
 * and provide real UPS credentials via environment variables.
 */
async function main() {
  // Set up mock HTTP client with stubbed responses
  const http = new MockHttpClient();
  http
    .respondWith({ status: 200, data: oauthFixture, headers: {} })
    .respondWith({ status: 200, data: shopFixture, headers: {} });

  // Create UPS provider with test config
  const upsProvider = new UpsProvider(http, {
    clientId: 'demo_client_id',
    clientSecret: 'demo_client_secret',
    accountNumber: '123456',
    baseUrl: 'https://onlinetools.ups.com',
    oauthUrl: 'https://onlinetools.ups.com/security/v1/oauth/token',
    version: 'v2409',
    transactionSrc: 'demo',
    authTimeoutMs: 5000,
    ratingTimeoutMs: 10000,
  });

  // Register carrier and create rate service
  const registry = new CarrierRegistry();
  registry.register(upsProvider);
  const rateService = new RateService(registry);

  // Build a rate request
  const request = {
    origin: {
      name: 'Acme Warehouse',
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

  console.log('=== Cybership Carrier Integration Service — Demo ===\n');

  // Get rates from UPS
  console.log('Fetching UPS rates...\n');
  const upsResult = await rateService.getRates(CarrierCode.UPS, request);

  console.log(`Found ${upsResult.quotes.length} rate quotes:\n`);
  for (const quote of upsResult.quotes) {
    console.log(
      `  ${quote.serviceName.padEnd(25)} $${quote.totalCharges.amount.toFixed(2)} ${quote.totalCharges.currency}` +
        (quote.guaranteedDelivery
          ? `  (${quote.guaranteedDelivery.businessDays} business days${
              quote.guaranteedDelivery.deliveryByTime
                ? ` by ${quote.guaranteedDelivery.deliveryByTime}`
                : ''
            })`
          : ''),
    );
  }

  if (upsResult.warnings?.length) {
    console.log(`\nWarnings:`);
    for (const w of upsResult.warnings) {
      console.log(`  ⚠ ${w}`);
    }
  }

  // Shop across all carriers
  console.log('\n--- Shopping across all registered carriers ---\n');
  // Re-queue responses for second call
  http
    .respondWith({ status: 200, data: shopFixture, headers: {} });

  const shopResult = await rateService.shopRates(request);

  console.log(`Combined ${shopResult.quotes.length} quotes (sorted by price):\n`);
  for (const quote of shopResult.quotes) {
    console.log(
      `  [${quote.carrier}] ${quote.serviceName.padEnd(25)} $${quote.totalCharges.amount.toFixed(2)}`,
    );
  }

  console.log('\n=== Demo complete ===');
}

main().catch(console.error);
