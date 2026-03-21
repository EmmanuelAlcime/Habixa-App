/**
 * Country address metadata for smart location forms.
 * Uses country-region-data for countries and regions, with additional
 * subdivision type and postal code flags.
 */

// @ts-expect-error - country-region-data/data.json has no type export
import rawData from 'country-region-data/data.json';

export type SubdivisionType = 'state' | 'province' | 'island' | 'region';

export interface Region {
  name: string;
  shortCode: string;
}

export interface CountryData {
  countryName: string;
  countryShortCode: string;
  regions: Region[];
  subdivisionType: SubdivisionType | null;
  hasPostalCode: boolean;
}

type RawCountry = {
  countryName: string;
  countryShortCode: string;
  regions: Array<{ name: string; shortCode: string }>;
};

/** Countries that use "state" for their primary subdivision */
const STATE_COUNTRIES = new Set(['US', 'AU', 'IN', 'BR', 'MX', 'NG']);

/** Countries that use "province" */
const PROVINCE_COUNTRIES = new Set(['CA', 'CN', 'ZA', 'KE', 'PK']);

/** Island nations - subdivisions are islands */
const ISLAND_COUNTRIES = new Set([
  'BS', // Bahamas
  'JM', // Jamaica
  'AG', // Antigua and Barbuda
  'GD', // Grenada
  'DM', // Dominica
  'BB', // Barbados
  'TT', // Trinidad and Tobago
  'LC', // Saint Lucia
  'VC', // Saint Vincent and the Grenadines
  'KN', // Saint Kitts and Nevis
  'FJ', // Fiji
  'TO', // Tonga
  'WS', // Samoa
  'SB', // Solomon Islands
  'VU', // Vanuatu
  'MV', // Maldives
  'MT', // Malta
  'CY', // Cyprus
  'PH', // Philippines
]);

/** Countries without a postal/zip code system */
const NO_POSTAL_CODE = new Set([
  'AE', 'HK', 'MO', 'QA', 'AG', 'BS', 'BZ', 'DM', 'GD', 'JM',
  'AO', 'BJ', 'BW', 'BF', 'BI', 'CM', 'TD', 'ET', 'GM', 'GH',
  'GN', 'MR', 'RW', 'SL', 'SO', 'SD', 'TZ', 'TG', 'ZM', 'ZW',
  'CK', 'FJ', 'KI', 'SB', 'TO', 'TV', 'VU',
]);

function getSubdivisionType(countryCode: string): SubdivisionType | null {
  const code = countryCode.toUpperCase();
  if (STATE_COUNTRIES.has(code)) return 'state';
  if (PROVINCE_COUNTRIES.has(code)) return 'province';
  if (ISLAND_COUNTRIES.has(code)) return 'island';
  const entry = (rawData as RawCountry[]).find((c) => c.countryShortCode === code);
  return entry && entry.regions.length > 0 ? 'region' : null;
}

function hasPostalCode(countryCode: string): boolean {
  return !NO_POSTAL_CODE.has(countryCode.toUpperCase());
}

/** All countries with address metadata */
export const countries: CountryData[] = (rawData as RawCountry[]).map((c) => ({
  countryName: c.countryName,
  countryShortCode: c.countryShortCode,
  regions: c.regions,
  subdivisionType: getSubdivisionType(c.countryShortCode),
  hasPostalCode: hasPostalCode(c.countryShortCode),
}));

/** Get country by ISO 3166-1 alpha-2 code */
export function getCountry(countryCode: string): CountryData | undefined {
  const code = countryCode.toUpperCase();
  return countries.find((c) => c.countryShortCode === code);
}

/** Get region display name from shortCode */
export function getRegionName(countryCode: string, regionShortCode: string): string | undefined {
  const country = getCountry(countryCode);
  return country?.regions.find((r) => r.shortCode === regionShortCode)?.name;
}

/** Get subdivision label for a country (e.g. "State", "Province", "Island") */
export function getSubdivisionLabel(countryCode: string): string {
  const type = getCountry(countryCode)?.subdivisionType;
  switch (type) {
    case 'state':
      return 'State';
    case 'province':
      return 'Province';
    case 'island':
      return 'Island';
    case 'region':
      return 'Region';
    default:
      return 'Region';
  }
}
