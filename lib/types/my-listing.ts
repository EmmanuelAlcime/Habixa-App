export type ListingStatus = 'active' | 'pending' | 'draft' | 'paused';

export interface MyListing {
  id: string;
  title: string;
  address: string;
  price: number;
  priceLabel?: string;
  bedrooms: number;
  bathrooms: number;
  status: ListingStatus;
  imgBg: string;
  featuredImage?: string;
  applicantsCount?: number;
  hasLease?: boolean;
  /** Premium active = is_premium and not expired */
  premiumActive?: boolean;
}

export interface ApiMyListing {
  id: number;
  title: string;
  address: string;
  city?: string;
  price: number;
  bedrooms?: number;
  bathrooms?: number;
  status?: string;
  photos?: { id: number; path: string; url?: string }[];
  is_premium?: boolean;
  premium_expires_at?: string | null;
  premium_active?: boolean;
}

import { getApiBaseUrl } from '@/lib/api/client';

export function mapApiMyListing(api: ApiMyListing): MyListing {
  const firstPhoto = api.photos?.[0];
  const featuredImage = firstPhoto?.path
    ? `${getApiBaseUrl()}/storage/${firstPhoto.path}`
    : undefined;
  const premiumActive =
    api.premium_active === true ||
    (api.is_premium === true &&
      (!api.premium_expires_at || new Date(api.premium_expires_at) > new Date()));

  return {
    id: String(api.id),
    title: api.title,
    address: api.address + (api.city ? `, ${api.city}` : ''),
    price: Number(api.price),
    priceLabel: '/mo',
    bedrooms: api.bedrooms ?? 0,
    bathrooms: api.bathrooms ?? 0,
    status: (api.status === 'draft' ? 'draft' : api.status === 'pending' ? 'pending' : api.status === 'paused' ? 'paused' : 'active') as ListingStatus,
    imgBg: '#C8DCC8',
    featuredImage,
    premiumActive,
  };
}
