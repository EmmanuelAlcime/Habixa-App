/**
 * Property type values and display labels.
 * Must stay in sync with API (App\Constants\PropertyTypes).
 */

export const PROPERTY_TYPES = [
  'apartment',
  'condo',
  'house',
  'townhouse',
  'timeshare',
  'room',
  'studio',
  'land',
] as const;

export type PropertyType = (typeof PROPERTY_TYPES)[number];

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  apartment: 'Apartment',
  condo: 'Condo',
  house: 'House',
  townhouse: 'Town House',
  timeshare: 'Time Share',
  room: 'Room(s)',
  studio: 'Studio',
  land: 'Land / Property',
};

export const RENTABLE_TYPES: PropertyType[] = [
  'apartment',
  'condo',
  'house',
  'townhouse',
  'timeshare',
  'room',
  'studio',
];

export const LAND_TYPES: PropertyType[] = ['land'];

export function isLandType(propertyType: PropertyType): boolean {
  return LAND_TYPES.includes(propertyType);
}

export function getPropertyTypeLabel(propertyType: PropertyType): string {
  return PROPERTY_TYPE_LABELS[propertyType] ?? propertyType;
}
