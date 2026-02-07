export interface UpsConfig {
  clientId: string;
  clientSecret: string;
  accountNumber?: string;
  baseUrl: string;
  oauthUrl: string;
  version: string;
  transactionSrc: string;
  authTimeoutMs: number;
  ratingTimeoutMs: number;
}

// UPS service levels — carrier-specific, not part of domain layer.
// Each carrier defines its own service level strings.
export const UpsServiceLevel = {
  NEXT_DAY_AIR: 'UPS_NEXT_DAY_AIR',
  NEXT_DAY_AIR_SAVER: 'UPS_NEXT_DAY_AIR_SAVER',
  NEXT_DAY_AIR_EARLY: 'UPS_NEXT_DAY_AIR_EARLY',
  SECOND_DAY_AIR: 'UPS_SECOND_DAY_AIR',
  SECOND_DAY_AIR_AM: 'UPS_SECOND_DAY_AIR_AM',
  THREE_DAY_SELECT: 'UPS_THREE_DAY_SELECT',
  GROUND: 'UPS_GROUND',
  STANDARD: 'UPS_STANDARD',
  WORLDWIDE_EXPRESS: 'UPS_WORLDWIDE_EXPRESS',
  WORLDWIDE_EXPEDITED: 'UPS_WORLDWIDE_EXPEDITED',
  WORLDWIDE_EXPRESS_PLUS: 'UPS_WORLDWIDE_EXPRESS_PLUS',
  SAVER: 'UPS_SAVER',
} as const;

export type UpsServiceLevelValue =
  (typeof UpsServiceLevel)[keyof typeof UpsServiceLevel];

// UPS API service code → service level string
export const UPS_SERVICE_CODE_MAP: Record<string, string> = {
  '01': UpsServiceLevel.NEXT_DAY_AIR,
  '02': UpsServiceLevel.SECOND_DAY_AIR,
  '03': UpsServiceLevel.GROUND,
  '07': UpsServiceLevel.WORLDWIDE_EXPRESS,
  '08': UpsServiceLevel.WORLDWIDE_EXPEDITED,
  '11': UpsServiceLevel.STANDARD,
  '12': UpsServiceLevel.THREE_DAY_SELECT,
  '13': UpsServiceLevel.NEXT_DAY_AIR_SAVER,
  '14': UpsServiceLevel.WORLDWIDE_EXPRESS_PLUS,
  '15': UpsServiceLevel.NEXT_DAY_AIR_EARLY,
  '59': UpsServiceLevel.SECOND_DAY_AIR_AM,
  '65': UpsServiceLevel.SAVER,
};

// Service level string → UPS API service code
export const SERVICE_LEVEL_TO_UPS_CODE: Record<string, string> = Object.fromEntries(
  Object.entries(UPS_SERVICE_CODE_MAP).map(([code, level]) => [level, code]),
);

export const UPS_SERVICE_NAMES: Record<string, string> = {
  '01': 'UPS Next Day Air',
  '02': 'UPS 2nd Day Air',
  '03': 'UPS Ground',
  '07': 'UPS Worldwide Express',
  '08': 'UPS Worldwide Expedited',
  '11': 'UPS Standard',
  '12': 'UPS 3-Day Select',
  '13': 'UPS Next Day Air Saver',
  '14': 'UPS Worldwide Express Plus',
  '15': 'UPS Next Day Air Early',
  '59': 'UPS 2nd Day Air A.M.',
  '65': 'UPS Saver',
};
