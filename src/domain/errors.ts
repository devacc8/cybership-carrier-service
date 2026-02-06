export enum CarrierErrorCode {
  AUTH_FAILED = 'AUTH_FAILED',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  BAD_REQUEST = 'BAD_REQUEST',
  RATE_LIMITED = 'RATE_LIMITED',
  TIMEOUT = 'TIMEOUT',
  NETWORK_ERROR = 'NETWORK_ERROR',
  MALFORMED_RESPONSE = 'MALFORMED_RESPONSE',
  CARRIER_API_ERROR = 'CARRIER_API_ERROR',
  CARRIER_NOT_FOUND = 'CARRIER_NOT_FOUND',
  UNKNOWN = 'UNKNOWN',
}

export class CarrierError extends Error {
  public readonly code: CarrierErrorCode;
  public readonly carrier?: string;
  public readonly httpStatus?: number;
  public readonly retryable: boolean;
  public readonly details?: Record<string, unknown>;

  constructor(params: {
    code: CarrierErrorCode;
    message: string;
    carrier?: string;
    httpStatus?: number;
    retryable?: boolean;
    details?: Record<string, unknown>;
    cause?: Error;
  }) {
    super(params.message, { cause: params.cause });
    this.name = 'CarrierError';
    this.code = params.code;
    this.carrier = params.carrier;
    this.httpStatus = params.httpStatus;
    this.retryable = params.retryable ?? false;
    this.details = params.details;
  }
}
