export const AMENITY_OPTIONS = [
  { id: 'ac', label: 'A/C', icon: 'snowflake' as const },
  { id: 'parking', label: 'Parking', icon: 'car' as const },
  { id: 'washer', label: 'Washer', icon: 'tshirt' as const },
  { id: 'gated', label: 'Gated', icon: 'shield-alt' as const },
  { id: 'pet_ok', label: 'Pet OK', icon: 'paw' as const },
  { id: 'dishwasher', label: 'Dishwasher', icon: 'utensils' as const },
  { id: 'gym', label: 'Gym', icon: 'dumbbell' as const },
  { id: 'pool', label: 'Pool', icon: 'swimming-pool' as const },
  { id: 'wifi', label: 'Wi-Fi', icon: 'wifi' as const },
] as const;

/** Land / property–specific options (infrastructure & location) */
export const LAND_AMENITY_OPTIONS = [
  { id: 'light_poles', label: 'Light Poles', icon: 'lightbulb' as const },
  { id: 'close_to_schools', label: 'Close to Schools', icon: 'school' as const },
  { id: 'roads_built', label: 'Roads Built', icon: 'road' as const },
  { id: 'electricity', label: 'Electricity Available', icon: 'bolt' as const },
  { id: 'water_connected', label: 'Water Connected', icon: 'tint' as const },
  { id: 'basic_infrastructure', label: 'Basic Infrastructure', icon: 'check-circle' as const },
] as const;

export type AmenityId = (typeof AMENITY_OPTIONS)[number]['id'];
export type LandAmenityId = (typeof LAND_AMENITY_OPTIONS)[number]['id'];

export function getAmenityById(id: string) {
  return AMENITY_OPTIONS.find((a) => a.id === id) ?? LAND_AMENITY_OPTIONS.find((a) => a.id === id);
}
