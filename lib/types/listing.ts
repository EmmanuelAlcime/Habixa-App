import { getApiBaseUrl } from '@/lib/api/client';
import { getCurrencyForCountry } from '@/lib/formatters';
import type { PropertyType } from '@/lib/constants/propertyTypes';

export interface ListingPhoto { id: number; url: string; }

export type ListingPropertyType = PropertyType;

export type ListingStatus = 'active' | 'pending' | 'draft' | 'paused';

export interface Listing {
  id: string; title: string; address: string; city?: string; country?: string;
  currency: string; price: number; priceLabel?: string;
  type: ListingPropertyType; badge?: 'For Rent' | 'For Sale';
  property_type: ListingPropertyType;
  bedrooms: number; bathrooms: number; sqft?: number;
  availableDate?: string;
  amenities?: string[];
  landlordName: string; landlordFullName?: string; landlordInitials: string;
  landlordScore: number; reviewsCount: number;
  imageCount: number; featured?: boolean; is_premium?: boolean;
  imgBg: string; latitude?: number; longitude?: number;
  photos?: ListingPhoto[]; userId?: string; description?: string;
  status?: ListingStatus;
}

export interface ApiListing {
  id: number; user_id?: number; type: string; property_type?: string; title: string; description?: string;
  price: number; address: string; city?: string; state?: string; country?: string;
  currency?: string; bedrooms?: number; bathrooms?: number; area_sqft?: number; available_date?: string;
  amenities?: string[];
  latitude?: number; longitude?: number; is_featured?: boolean; is_premium?: boolean;
  status?: string;
  photos?: { id: number; path: string; url?: string }[];
  user?: { id: number; name: string; email?: string; landlord_score?: { score: number; review_count: number } | null };
}

const VALID_PROPERTY_TYPES: ListingPropertyType[] = ['apartment', 'condo', 'house', 'townhouse', 'timeshare', 'room', 'studio', 'land'];

const IMG_BG_POOL = ['#D4E8D4','#C8D8E8','#E8D4C8','#D8C8E8','#E8E4C8','#C8E8E4','#E0D4E8','#D4D8C8'];
function seedBg(id: number): string { return IMG_BG_POOL[Math.abs(id) % IMG_BG_POOL.length]; }

export function mapApiListing(apiListing: ApiListing): Listing {
  const isRent = apiListing.type !== 'sale';
  const propertyType = (apiListing.property_type && VALID_PROPERTY_TYPES.includes(apiListing.property_type as ListingPropertyType))
    ? (apiListing.property_type as ListingPropertyType)
    : (apiListing.type === 'sale' ? 'house' : (VALID_PROPERTY_TYPES.includes(apiListing.type as ListingPropertyType) ? (apiListing.type as ListingPropertyType) : 'apartment'));
  const landlordName = apiListing.user?.name ?? 'Unknown';
  const parts = landlordName.trim().split(/\s+/);
  const landlordInitials = parts.length >= 2 ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase() : landlordName.slice(0, 2).toUpperCase();
  const landlordShort = parts.length >= 2 ? `${parts[0]} ${parts[parts.length - 1][0]}.` : landlordName;
  const baseUrl = getApiBaseUrl();
  const photos = (apiListing.photos ?? []).map((p) => ({
    id: p.id,
    url: p.path ? `${baseUrl}/storage/${p.path}` : (p.url ?? ''),
  }));
  const currency = apiListing.currency ?? (apiListing.country ? getCurrencyForCountry(apiListing.country) : 'USD');
  return {
    id: String(apiListing.id), title: apiListing.title,
    address: apiListing.address + (apiListing.city ? `, ${apiListing.city}` : ''),
    city: apiListing.city, country: apiListing.country, currency,
    price: Number(apiListing.price), priceLabel: isRent ? '/month' : undefined,
    type: propertyType,
    property_type: propertyType,
    badge: isRent ? 'For Rent' : 'For Sale',
    bedrooms: apiListing.bedrooms ?? 0, bathrooms: apiListing.bathrooms ?? 0,
    sqft: apiListing.area_sqft ? Number(apiListing.area_sqft) : undefined,
    availableDate: apiListing.available_date ?? undefined,
    landlordName: landlordShort, landlordFullName: landlordName, landlordInitials,
    landlordScore: apiListing.user?.landlord_score?.score ?? 0,
    reviewsCount: apiListing.user?.landlord_score?.review_count ?? 0,
    imageCount: apiListing.photos?.length ?? 0,
    featured: apiListing.is_featured ?? false, is_premium: apiListing.is_premium ?? false,
    imgBg: seedBg(apiListing.id),
    latitude: apiListing.latitude ? Number(apiListing.latitude) : undefined,
    longitude: apiListing.longitude ? Number(apiListing.longitude) : undefined,
    photos: photos.length > 0 ? photos : undefined,
    userId: apiListing.user?.id != null ? String(apiListing.user.id) : apiListing.user_id != null ? String(apiListing.user_id) : undefined,
    description: apiListing.description,
    amenities: apiListing.amenities ?? undefined,
    status: (apiListing.status === 'draft' ? 'draft' : apiListing.status === 'pending' ? 'pending' : apiListing.status === 'paused' ? 'paused' : 'active') as ListingStatus,
  };
}
