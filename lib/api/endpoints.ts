/**
 * Habixa API Endpoints
 * Matches habixa-api/routes/api.php
 * @see docs/api_endpoint_list.html
 */

const API_PREFIX = '/api';

export const Endpoints = {
  // Auth (Public)
  auth: {
    register: () => `${API_PREFIX}/auth/register`,
    login: () => `${API_PREFIX}/auth/login`,
    google: () => `${API_PREFIX}/auth/google`,
    apple: () => `${API_PREFIX}/auth/apple`,
    facebook: () => `${API_PREFIX}/auth/facebook`,
    forgotPassword: () => `${API_PREFIX}/auth/forgot-password`,
    resetPassword: () => `${API_PREFIX}/auth/reset-password`,
    verifyEmail: () => `${API_PREFIX}/auth/verify-email`,
    resendVerificationEmail: () => `${API_PREFIX}/auth/resend-verification-email`,
  },
  // Auth (Protected)
  authProtected: {
    logout: () => `${API_PREFIX}/auth/logout`,
    refresh: () => `${API_PREFIX}/auth/refresh`,
  },

  // Landlords (public profile by ID or slug)
  landlords: {
    show: (idOrSlug: string) => `${API_PREFIX}/landlords/${encodeURIComponent(idOrSlug)}`,
  },

  // Users & Profiles
  users: {
    me: () => `${API_PREFIX}/users/me`,
    avatar: () => `${API_PREFIX}/users/me/avatar`,
    show: (id: string) => `${API_PREFIX}/users/${id}`,
    verifyPhone: () => `${API_PREFIX}/users/verify/phone`,
    verifyPhoneConfirm: () => `${API_PREFIX}/users/verify/phone/confirm`,
    verifyId: () => `${API_PREFIX}/users/verify/id`,
    verifyPersonaComplete: () => `${API_PREFIX}/users/verify/persona-complete`,
    twoFaSendCode: () => `${API_PREFIX}/users/2fa/send-code`,
    twoFaConfirm: () => `${API_PREFIX}/users/2fa/confirm`,
    twoFaDisable: () => `${API_PREFIX}/users/2fa/disable`,
  },
  usersReviews: (userId: string) => `${API_PREFIX}/users/${userId}/reviews`,

  // Onboarding (public)
  onboarding: {
    ratings: (params?: { country?: string; city?: string; region?: string }) => {
      const p = new URLSearchParams();
      if (params?.country) p.set('country', params.country);
      if (params?.city) p.set('city', params.city);
      if (params?.region) p.set('region', params.region);
      const qs = p.toString();
      return `${API_PREFIX}/onboarding/ratings${qs ? `?${qs}` : ''}`;
    },
  },

  // Places (Google Places autocomplete and details proxy)
  places: {
    autocomplete: (input: string) =>
      `${API_PREFIX}/places/autocomplete?input=${encodeURIComponent(input)}`,
    details: (placeId: string) =>
      `${API_PREFIX}/places/details?place_id=${encodeURIComponent(placeId)}`,
  },

  // Listings
  listings: {
    index: (params?: { user_id?: string }) => {
      const p = params?.user_id ? `?user_id=${params.user_id}` : '';
      return `${API_PREFIX}/listings${p}`;
    },
    featured: () => `${API_PREFIX}/listings/featured`,
    mine: () => `${API_PREFIX}/listings/mine`,
    liked: () => `${API_PREFIX}/listings/liked`,
    like: (id: string) => `${API_PREFIX}/listings/${id}/like`,
    unlike: (id: string) => `${API_PREFIX}/listings/${id}/unlike`,
    show: (id: string) => `${API_PREFIX}/listings/${id}`,
    related: (id: string) => `${API_PREFIX}/listings/${id}/related`,
    conversationParticipants: (id: string) =>
      `${API_PREFIX}/listings/${id}/conversation-participants`,
    store: () => `${API_PREFIX}/listings`,
    update: (id: string) => `${API_PREFIX}/listings/${id}`,
    destroy: (id: string) => `${API_PREFIX}/listings/${id}`,
    photos: (id: string) => `${API_PREFIX}/listings/${id}/photos`,
    photosReorder: (id: string) => `${API_PREFIX}/listings/${id}/photos/reorder`,
    promote: (id: string) => `${API_PREFIX}/listings/${id}/promote`,
    apply: (listingId: string) => `${API_PREFIX}/listings/${listingId}/apply`,
    applications: (listingId: string) => `${API_PREFIX}/listings/${listingId}/applications`,
  },

  // Leases
  leases: {
    index: () => `${API_PREFIX}/leases`,
    rentDue: () => `${API_PREFIX}/leases/rent-due`,
    show: (id: string) => `${API_PREFIX}/leases/${id}`,
    payments: (id: string) => `${API_PREFIX}/leases/${id}/payments`,
    store: () => `${API_PREFIX}/leases`,
    confirm: (id: string) => `${API_PREFIX}/leases/${id}/confirm`,
    updateStatus: (id: string) => `${API_PREFIX}/leases/${id}/status`,
    payDeposit: (id: string) => `${API_PREFIX}/leases/${id}/pay-deposit`,
    markDepositPaid: (id: string) => `${API_PREFIX}/leases/${id}/mark-deposit-paid`,
  },

  // Stripe Connect (landlord payouts)
  connect: {
    onboard: () => `${API_PREFIX}/connect/onboard`,
    status: () => `${API_PREFIX}/connect/status`,
  },

  // Payments
  payments: {
    index: () => `${API_PREFIX}/payments`,
    rent: () => `${API_PREFIX}/payments/rent`,
    receipt: (id: string) => `${API_PREFIX}/payments/${id}/receipt`,
    listingFee: () => `${API_PREFIX}/payments/listing-fee`,
    listingFeeConfirm: () => `${API_PREFIX}/payments/listing-fee/confirm`,
    backgroundCheck: () => `${API_PREFIX}/payments/background-check`,
    iapVerify: () => `${API_PREFIX}/payments/iap/verify`,
  },

  // Reviews
  reviews: {
    show: (id: string) => `${API_PREFIX}/reviews/${id}`,
    store: () => `${API_PREFIX}/reviews`,
    destroy: (id: string) => `${API_PREFIX}/reviews/${id}`,
  },

  // Scores
  scores: {
    landlord: (userId: string) => `${API_PREFIX}/scores/landlord/${userId}`,
    tenant: (userId: string) => `${API_PREFIX}/scores/tenant/${userId}`,
  },

  // Complaints
  complaints: {
    index: () => `${API_PREFIX}/complaints`,
    show: (id: string) => `${API_PREFIX}/complaints/${id}`,
    store: () => `${API_PREFIX}/complaints`,
    respond: (id: string) => `${API_PREFIX}/complaints/${id}/respond`,
  },

  // Conversations / Messages
  conversations: {
    index: () => `${API_PREFIX}/conversations`,
    show: (id: string) => `${API_PREFIX}/conversations/${id}`,
    store: () => `${API_PREFIX}/conversations`,
    messages: (id: string) => `${API_PREFIX}/conversations/${id}/messages`,
    sendMessage: (id: string) => `${API_PREFIX}/conversations/${id}/messages`,
    markRead: (id: string) => `${API_PREFIX}/conversations/${id}/read`,
  },

  // Background Checks
  backgroundChecks: {
    store: () => `${API_PREFIX}/background-checks`,
    show: (id: string) => `${API_PREFIX}/background-checks/${id}`,
  },

  // Notifications
  notifications: {
    index: () => `${API_PREFIX}/notifications`,
    markRead: (id: string) => `${API_PREFIX}/notifications/${id}/read`,
    pushToken: () => `${API_PREFIX}/notifications/push-token`,
  },

  // Admin
  admin: {
    complaints: () => `${API_PREFIX}/admin/complaints`,
    updateComplaint: (id: string) => `${API_PREFIX}/admin/complaints/${id}`,
    updateReview: (id: string) => `${API_PREFIX}/admin/reviews/${id}`,
    banUser: (id: string) => `${API_PREFIX}/admin/users/${id}/ban`,
  },
  applications: {
    mine: () => `${API_PREFIX}/applications/mine`,
    withdraw: (id: string) => `${API_PREFIX}/applications/${id}`,
    accept: (id: string) => `${API_PREFIX}/applications/${id}/accept`,
    decline: (id: string) => `${API_PREFIX}/applications/${id}/decline`,
    createLease: (id: string) => `${API_PREFIX}/applications/${id}/create-lease`,
  },
} as const;
