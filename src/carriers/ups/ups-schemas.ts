import { z } from 'zod';

const UpsMonetarySchema = z.object({
  CurrencyCode: z.string(),
  MonetaryValue: z.string(),
});

export const UpsRatedShipmentSchema = z.object({
  Service: z.object({
    Code: z.string(),
    Description: z.string().optional(),
  }),
  RatedShipmentAlert: z
    .array(z.object({ Code: z.string(), Description: z.string() }))
    .optional(),
  BillingWeight: z.object({
    UnitOfMeasurement: z.object({
      Code: z.string(),
      Description: z.string().optional(),
    }),
    Weight: z.string(),
  }),
  TransportationCharges: UpsMonetarySchema,
  BaseServiceCharge: UpsMonetarySchema.optional(),
  ServiceOptionsCharges: UpsMonetarySchema.optional(),
  TotalCharges: UpsMonetarySchema,
  GuaranteedDelivery: z
    .object({
      BusinessDaysInTransit: z.string(),
      DeliveryByTime: z.string().optional(),
    })
    .optional(),
  RatedPackage: z
    .array(
      z.object({
        TransportationCharges: UpsMonetarySchema,
        ServiceOptionsCharges: UpsMonetarySchema.optional(),
        TotalCharges: UpsMonetarySchema,
      }),
    )
    .optional(),
});

export const UpsRateResponseSchema = z.object({
  RateResponse: z.object({
    Response: z.object({
      ResponseStatus: z.object({
        Code: z.string(),
        Description: z.string(),
      }),
      Alert: z
        .array(z.object({ Code: z.string(), Description: z.string() }))
        .optional(),
      TransactionReference: z
        .object({ CustomerContext: z.string().optional() })
        .optional(),
    }),
    RatedShipment: z.array(UpsRatedShipmentSchema).min(1),
  }),
});

export const UpsOAuthResponseSchema = z.object({
  access_token: z.string(),
  token_type: z.string(),
  expires_in: z.string(),
  issued_at: z.string().optional(),
  client_id: z.string().optional(),
  scope: z.string().optional(),
  status: z.string().optional(),
});

export const UpsErrorResponseSchema = z.object({
  response: z.object({
    errors: z.array(
      z.object({
        code: z.string(),
        message: z.string(),
      }),
    ),
  }),
});

// ---- Request schema (used in tests to replace `as` casts) ----

export const UpsAddressSchema = z.object({
  AddressLine: z.array(z.string()),
  City: z.string(),
  StateProvinceCode: z.string().optional(),
  PostalCode: z.string(),
  CountryCode: z.string(),
  ResidentialAddressIndicator: z.string().optional(),
});

const UpsPartySchema = z.object({
  Name: z.string().optional(),
  ShipperNumber: z.string().optional(),
  Address: UpsAddressSchema,
});

const UpsPackageSchema = z.object({
  PackagingType: z.object({ Code: z.string(), Description: z.string().optional() }),
  Dimensions: z
    .object({
      UnitOfMeasurement: z.object({ Code: z.string(), Description: z.string().optional() }),
      Length: z.string(),
      Width: z.string(),
      Height: z.string(),
    })
    .optional(),
  PackageWeight: z.object({
    UnitOfMeasurement: z.object({ Code: z.string(), Description: z.string().optional() }),
    Weight: z.string(),
  }),
});

export const UpsRateRequestBodySchema = z.object({
  RateRequest: z.object({
    Request: z.object({
      RequestOption: z.enum(['Rate', 'Shop']),
      SubVersion: z.string().optional(),
      TransactionReference: z.object({ CustomerContext: z.string().optional() }).optional(),
    }),
    Shipment: z.object({
      Shipper: UpsPartySchema,
      ShipTo: UpsPartySchema,
      ShipFrom: UpsPartySchema.optional(),
      Service: z.object({ Code: z.string(), Description: z.string().optional() }).optional(),
      Package: z.array(UpsPackageSchema),
      PaymentDetails: z
        .object({
          ShipmentCharge: z.array(
            z.object({
              Type: z.string(),
              BillShipper: z.object({ AccountNumber: z.string() }),
            }),
          ),
        })
        .optional(),
    }),
  }),
});
