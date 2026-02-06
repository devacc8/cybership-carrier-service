import { ServiceLevel } from '../../domain/enums.js';

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

// UPS service code → domain ServiceLevel
export const UPS_SERVICE_CODE_MAP: Record<string, ServiceLevel> = {
  '01': ServiceLevel.NEXT_DAY_AIR,
  '02': ServiceLevel.SECOND_DAY_AIR,
  '03': ServiceLevel.GROUND,
  '07': ServiceLevel.WORLDWIDE_EXPRESS,
  '08': ServiceLevel.WORLDWIDE_EXPEDITED,
  '11': ServiceLevel.STANDARD,
  '12': ServiceLevel.THREE_DAY_SELECT,
  '13': ServiceLevel.NEXT_DAY_AIR_SAVER,
  '14': ServiceLevel.WORLDWIDE_EXPRESS_PLUS,
  '15': ServiceLevel.NEXT_DAY_AIR_EARLY,
  '59': ServiceLevel.SECOND_DAY_AIR_AM,
  '65': ServiceLevel.SAVER,
};

// Domain ServiceLevel → UPS service code
export const DOMAIN_TO_UPS_SERVICE_MAP: Partial<Record<ServiceLevel, string>> =
  {
    [ServiceLevel.NEXT_DAY_AIR]: '01',
    [ServiceLevel.SECOND_DAY_AIR]: '02',
    [ServiceLevel.GROUND]: '03',
    [ServiceLevel.WORLDWIDE_EXPRESS]: '07',
    [ServiceLevel.WORLDWIDE_EXPEDITED]: '08',
    [ServiceLevel.STANDARD]: '11',
    [ServiceLevel.THREE_DAY_SELECT]: '12',
    [ServiceLevel.NEXT_DAY_AIR_SAVER]: '13',
    [ServiceLevel.WORLDWIDE_EXPRESS_PLUS]: '14',
    [ServiceLevel.NEXT_DAY_AIR_EARLY]: '15',
    [ServiceLevel.SECOND_DAY_AIR_AM]: '59',
    [ServiceLevel.SAVER]: '65',
  };

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
