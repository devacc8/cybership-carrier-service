// Raw UPS API request/response shapes — mirror the actual JSON structure.
// PascalCase keys and string values match the UPS Rating API specification.

// ---- Request Types ----

export interface UpsRateRequestBody {
  RateRequest: {
    Request: {
      RequestOption: 'Rate' | 'Shop';
      SubVersion?: string;
      TransactionReference?: {
        CustomerContext?: string;
      };
    };
    Shipment: {
      Shipper: UpsParty;
      ShipTo: UpsParty;
      ShipFrom?: UpsParty;
      Service?: { Code: string; Description?: string };
      Package: UpsPackage[];
      PaymentDetails?: {
        ShipmentCharge: Array<{
          Type: string;
          BillShipper: { AccountNumber: string };
        }>;
      };
    };
  };
}

export interface UpsParty {
  Name?: string;
  ShipperNumber?: string;
  Address: UpsAddress;
}

export interface UpsAddress {
  AddressLine: string[];
  City: string;
  StateProvinceCode?: string;
  PostalCode: string;
  CountryCode: string;
  ResidentialAddressIndicator?: string;
}

export interface UpsPackage {
  PackagingType: { Code: string; Description?: string };
  Dimensions?: {
    UnitOfMeasurement: { Code: string; Description?: string };
    Length: string;
    Width: string;
    Height: string;
  };
  PackageWeight: {
    UnitOfMeasurement: { Code: string; Description?: string };
    Weight: string;
  };
}

// ---- Response Types ----

export interface UpsRateResponseBody {
  RateResponse: {
    Response: {
      ResponseStatus: { Code: string; Description: string };
      Alert?: Array<{ Code: string; Description: string }>;
      TransactionReference?: { CustomerContext?: string };
    };
    RatedShipment: UpsRatedShipment[];
  };
}

export interface UpsRatedShipment {
  Service: { Code: string; Description?: string };
  RatedShipmentAlert?: Array<{ Code: string; Description: string }>;
  BillingWeight: {
    UnitOfMeasurement: { Code: string; Description?: string };
    Weight: string;
  };
  TransportationCharges: UpsMonetary;
  BaseServiceCharge?: UpsMonetary;
  ServiceOptionsCharges?: UpsMonetary;
  TotalCharges: UpsMonetary;
  GuaranteedDelivery?: {
    BusinessDaysInTransit: string;
    DeliveryByTime?: string;
  };
  RatedPackage?: Array<{
    TransportationCharges: UpsMonetary;
    ServiceOptionsCharges?: UpsMonetary;
    TotalCharges: UpsMonetary;
  }>;
}

export interface UpsMonetary {
  CurrencyCode: string;
  MonetaryValue: string;
}

// ---- OAuth Types ----

export interface UpsOAuthResponse {
  access_token: string;
  token_type: string;
  issued_at: string;
  expires_in: string;
  client_id: string;
  scope: string;
  refresh_count: string;
  status: string;
}

// ---- Error Types ----

export interface UpsErrorResponse {
  response: {
    errors: Array<{
      code: string;
      message: string;
    }>;
  };
}
