# Cybership Carrier Integration Service

## What This Is

A shipping carrier integration service that wraps the UPS Rating API to fetch real-time shipping rates. Given an origin, destination, and package details, it returns normalized rate quotes — the caller never touches UPS-specific request or response formats.

## Why It's Built This Way

The core problem: Cybership integrates with multiple shipping carriers (UPS, FedEx, USPS, DHL), each with its own API format, auth flow, and error model. Without a clean abstraction, every new carrier means duplicated logic and coupled code.

The solution is a **layered architecture with a Registry + Strategy pattern** that enforces one rule: **the domain layer never knows which carrier it's talking to.**

```
[Caller / Tests]
       │
[Domain Layer]        ← carrier-agnostic types, interfaces, validation
  /         \
[UPS]    [FedEx]      ← self-contained carrier modules
  |         |
[HttpClient]          ← injectable, stubbable
```

Each carrier lives in its own folder and implements the same `CarrierProvider` interface. Adding FedEx means creating a new folder and calling `registry.register()` — zero changes to existing code.

## How It Works

1. **Caller** sends a `RateRequest` (origin, destination, packages, optional service level) to `RateService`
2. **RateService** validates input with Zod, then delegates to the appropriate `CarrierProvider`
3. **UpsProvider** acquires an OAuth token (cached, auto-refreshed), builds the UPS-specific request, calls the API, validates the response with Zod, and maps it back to domain types
4. **Caller** receives `RateQuote[]` with normalized amounts, service levels, and delivery estimates

For multi-carrier shopping, `RateService.shopRates()` calls all registered carriers in parallel via `Promise.allSettled` — one carrier failing doesn't block others.

## Quick Start

```bash
npm install
npm test          # Run all 77 tests
npm run demo      # Run CLI demo with mocked responses
npm run typecheck # TypeScript type validation
```

## Project Structure

```
src/
├── domain/                    # Carrier-agnostic layer (zero external imports)
│   ├── types.ts               # Address, Package, RateRequest, RateQuote, RateResponse
│   ├── schemas.ts             # Zod runtime validation for all domain types
│   ├── interfaces.ts          # CarrierProvider, AuthProvider, HttpClient
│   ├── errors.ts              # CarrierError with structured error codes
│   └── enums.ts               # ServiceLevel, WeightUnit, DimensionUnit, CarrierCode
├── core/                      # Orchestration (depends only on domain interfaces)
│   ├── carrier-registry.ts    # Maps CarrierCode → CarrierProvider
│   ├── rate-service.ts        # Validates input → delegates → returns normalized rates
│   └── http-client.ts         # FetchHttpClient using Node 18+ built-in fetch
├── carriers/ups/              # UPS-specific (self-contained, deletable without breaking anything)
│   ├── ups-provider.ts        # Implements CarrierProvider: auth → build → call → validate → map
│   ├── ups-auth.ts            # OAuth 2.0 client-credentials with token caching
│   ├── ups-rating-mapper.ts   # Domain ↔ UPS type mapping (the key boundary)
│   ├── ups-types.ts           # Raw UPS API shapes (PascalCase, string values)
│   ├── ups-schemas.ts         # Zod schemas for UPS API response validation
│   └── ups-config.ts          # UPS endpoints, service code maps
├── config/
│   └── env.ts                 # Environment variable loader with Zod validation
└── index.ts                   # Public API barrel export
```

## Design Decisions

**Domain vs. External Type Boundary** — Domain types use camelCase and numeric values (`amount: 30.72`). UPS types use PascalCase and strings (`MonetaryValue: "30.72"`). The `UpsRatingMapper` is the explicit boundary — callers never see UPS shapes.

**HttpClient as the Stubbable Seam** — Instead of mocking `fetch` globally, the `HttpClient` interface is injected into each provider. Tests use a `MockHttpClient` with a FIFO response queue and request recording. No global state contamination.

**Single CarrierError Class** — One class with a discriminated `code` enum (`AUTH_FAILED`, `RATE_LIMITED`, `TIMEOUT`, etc.) and a `retryable` flag. Callers decide retry strategy without inspecting error types.

**OAuth Token Lifecycle** — Lazy refresh with 60-second buffer before expiry. Concurrent calls share a single in-flight promise (thundering herd protection). On 401 from the rating endpoint, the token is invalidated and the request retries once.

**Response Validation** — Even 200 responses are Zod-validated before mapping. This catches upstream API changes early instead of failing deep in the mapper.

## Adding a New Carrier

Create `src/carriers/fedex/` with provider, auth, mapper, types, schemas, and config. Then:

```typescript
registry.register(new FedExProvider(httpClient, fedexConfig));
```

Zero changes to existing files.

## Testing

77 tests across 7 files, all using stubbed HTTP responses with realistic UPS API payloads:

| Category | Tests | What's Verified |
|----------|-------|-----------------|
| UPS Auth | 11 | Token acquire, cache, refresh, dedup, expiry, error handling |
| UPS Rating | 8 | Request building, response parsing, headers, delivery mapping |
| UPS Errors | 9 | 400, 401 retry, 429, 500, timeout, network error, malformed JSON |
| Rate Service | 7 | Validation, delegation, multi-carrier shopping, partial failure |
| Mapper | 24 | Address mapping, service codes, monetary parsing, edge cases |
| Registry | 4 | Register, retrieve, not-found, overwrite |
| Schemas | 14 | Zod validation for addresses, packages, rate requests |

## Configuration

All secrets come from environment variables. See `.env.example`:

| Variable | Required | Default |
|----------|----------|---------|
| `UPS_CLIENT_ID` | Yes | — |
| `UPS_CLIENT_SECRET` | Yes | — |
| `UPS_ACCOUNT_NUMBER` | No | — |
| `UPS_BASE_URL` | No | `https://onlinetools.ups.com` |
| `UPS_API_VERSION` | No | `v2409` |
| `UPS_AUTH_TIMEOUT_MS` | No | `5000` |
| `UPS_RATING_TIMEOUT_MS` | No | `10000` |

## Tech Stack

- **Runtime:** Node.js 18+ (built-in `fetch`)
- **Language:** TypeScript 5.5+ (strict mode)
- **Validation:** Zod (single runtime dependency)
- **Testing:** Vitest
