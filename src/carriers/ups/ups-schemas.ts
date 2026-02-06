import { z } from 'zod';

const UpsMonetarySchema = z.object({
  CurrencyCode: z.string(),
  MonetaryValue: z.string(),
});

const UpsRatedShipmentSchema = z.object({
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
