import type { Address, RateRequest, RateResponse, RateQuote } from '../../domain/types.js';
import { CarrierCode, type ServiceLevel, WeightUnit } from '../../domain/enums.js';
import type {
  UpsAddress,
  UpsRateRequestBody,
  UpsRateResponseBody,
  UpsRatedShipment,
} from './ups-types.js';
import {
  UPS_SERVICE_CODE_MAP,
  DOMAIN_TO_UPS_SERVICE_MAP,
  UPS_SERVICE_NAMES,
  type UpsConfig,
} from './ups-config.js';

export class UpsRatingMapper {
  constructor(private readonly config: UpsConfig) {}

  toUpsRateRequest(request: RateRequest): UpsRateRequestBody {
    const hasServiceLevel = request.serviceLevel != null;
    const requestOption = hasServiceLevel ? 'Rate' : 'Shop';

    const serviceCode = hasServiceLevel
      ? DOMAIN_TO_UPS_SERVICE_MAP[request.serviceLevel!] ?? '03'
      : '03';

    const body: UpsRateRequestBody = {
      RateRequest: {
        Request: {
          RequestOption: requestOption,
          TransactionReference: {
            CustomerContext: 'Rating Request',
          },
        },
        Shipment: {
          Shipper: {
            Name: request.origin.name ?? 'Shipper',
            ShipperNumber: this.config.accountNumber,
            Address: this.mapAddressToUps(request.origin),
          },
          ShipTo: {
            Name: request.destination.name,
            Address: {
              ...this.mapAddressToUps(request.destination),
              ...(request.destination.residential
                ? { ResidentialAddressIndicator: '' }
                : {}),
            },
          },
          Service: { Code: serviceCode },
          Package: request.packages.map((pkg) => ({
            PackagingType: { Code: '02', Description: 'Customer Supplied Package' },
            ...(pkg.dimensions
              ? {
                  Dimensions: {
                    UnitOfMeasurement: { Code: pkg.dimensions.unit },
                    Length: String(pkg.dimensions.length),
                    Width: String(pkg.dimensions.width),
                    Height: String(pkg.dimensions.height),
                  },
                }
              : {}),
            PackageWeight: {
              UnitOfMeasurement: { Code: pkg.weight.unit },
              Weight: String(pkg.weight.value),
            },
          })),
        },
      },
    };

    if (request.shipFrom) {
      body.RateRequest.Shipment.ShipFrom = {
        Name: request.shipFrom.name,
        Address: this.mapAddressToUps(request.shipFrom),
      };
    }

    if (this.config.accountNumber) {
      body.RateRequest.Shipment.PaymentDetails = {
        ShipmentCharge: [
          {
            Type: '01',
            BillShipper: { AccountNumber: this.config.accountNumber },
          },
        ],
      };
    }

    return body;
  }

  toRateResponse(upsResponse: UpsRateResponseBody): RateResponse {
    const { RatedShipment, Response } = upsResponse.RateResponse;
    const alerts = Response.Alert;

    return {
      quotes: RatedShipment.map((shipment) => this.mapRatedShipment(shipment)),
      ...(alerts?.length
        ? { warnings: alerts.map((a) => `${a.Code}: ${a.Description}`) }
        : {}),
    };
  }

  private mapRatedShipment(shipment: UpsRatedShipment): RateQuote {
    const serviceCode = shipment.Service.Code;
    const serviceLevel: ServiceLevel =
      UPS_SERVICE_CODE_MAP[serviceCode] ?? UPS_SERVICE_CODE_MAP['03'];

    return {
      carrier: CarrierCode.UPS,
      serviceLevel,
      serviceName:
        UPS_SERVICE_NAMES[serviceCode] ?? `UPS Service ${serviceCode}`,
      totalCharges: {
        amount: parseFloat(shipment.TotalCharges.MonetaryValue),
        currency: shipment.TotalCharges.CurrencyCode,
      },
      transportationCharges: {
        amount: parseFloat(shipment.TransportationCharges.MonetaryValue),
        currency: shipment.TransportationCharges.CurrencyCode,
      },
      billingWeight: {
        value: parseFloat(shipment.BillingWeight.Weight),
        unit: (shipment.BillingWeight.UnitOfMeasurement.Code as WeightUnit) ?? WeightUnit.LBS,
      },
      ...(shipment.GuaranteedDelivery
        ? {
            guaranteedDelivery: {
              businessDays: parseInt(
                shipment.GuaranteedDelivery.BusinessDaysInTransit,
                10,
              ),
              ...(shipment.GuaranteedDelivery.DeliveryByTime
                ? { deliveryByTime: shipment.GuaranteedDelivery.DeliveryByTime }
                : {}),
            },
          }
        : {}),
    };
  }

  private mapAddressToUps(address: Address): UpsAddress {
    return {
      AddressLine: address.addressLines,
      City: address.city,
      ...(address.stateProvince
        ? { StateProvinceCode: address.stateProvince }
        : {}),
      PostalCode: address.postalCode,
      CountryCode: address.countryCode,
    };
  }
}
