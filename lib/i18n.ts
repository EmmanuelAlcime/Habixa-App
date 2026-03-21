/**
 * Habixa i18n
 * Install: npx expo install expo-localization && npm install i18n-js
 *
 * Usage:
 *   import { t, setLocale } from '@/lib/i18n';
 *   <Text>{t('search.title')}</Text>
 */
import { getLocales } from 'expo-localization';

// ── Translations ──────────────────────────────────────────────────────────────
const translations = {
  en: {
    common: {
      back: 'Back',
      close: 'Close',
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      edit: 'Edit',
      loading: 'Loading…',
      error: 'Something went wrong',
      retry: 'Try again',
      confirm: 'Confirm',
      yes: 'Yes',
      no: 'No',
      next: 'Next',
      done: 'Done',
      or: 'or',
    },
    greeting: {
      morning: 'Good morning',
      afternoon: 'Good afternoon',
      evening: 'Good evening',
    },
    home: {
      featured: 'Featured',
      nearYou: 'Near you',
      forSale: 'For Sale',
      forRent: 'For Rent',
      seeAll: 'See all',
    },
    search: {
      title: 'Find a home',
      placeholder: 'Neighbourhood, street, area…',
      placeholderWithCity: (city: string) => `Search in ${city}…`,
      results: (n: number) => `${n} result${n === 1 ? '' : 's'}`,
      noResults: 'No listings match your search. Try different keywords or filters.',
      startPrompt: 'Search for a neighbourhood, street, or area to find homes.',
      filters: 'Filters',
      sortBy: 'Sort by',
      sortRelevance: 'Relevance',
      sortNewest: 'Newest',
      sortPriceLow: 'Price: Low to High',
      sortPriceHigh: 'Price: High to Low',
      mapView: 'Map view',
      apartments: 'Apartments',
      houses: 'Houses',
      price: 'Price',
      bedrooms: '2+ beds',
      available: 'Available',
      minPrice: 'Min price',
      maxPrice: 'Max price',
      anyPrice: 'Any price',
      applyFilters: 'Apply filters',
      clearFilters: 'Clear filters',
    },
    listing: {
      perMonth: '/month',
      beds: (n: number) => `${n} bed${n === 1 ? '' : 's'}`,
      baths: (n: number) => `${n} bath${n === 1 ? '' : 's'}`,
      landlordScore: 'Landlord score',
      noReviews: 'No reviews yet',
      message: 'Message landlord',
      apply: 'Apply',
      share: 'Share',
      save: 'Save',
      saved: 'Saved',
      featured: 'Featured',
      verified: 'Verified',
      description: 'Description',
      amenities: 'Amenities',
      location: 'Location',
      relatedListings: 'Similar listings',
    },
    listing_create: {
      title: 'Create listing',
      steps: ['Basics', 'Location', 'Photos', 'Pricing', 'Review'],
      type_rent: 'For Rent',
      type_sale: 'For Sale',
      publish: 'Publish',
      saveDraft: 'Save draft',
      titleField: 'Title',
      description: 'Description',
      price: 'Price',
      bedrooms: 'Bedrooms',
      bathrooms: 'Bathrooms',
      sqft: 'Sq ft (optional)',
      addPhotos: 'Add photos',
      publishSuccess: 'Listing published!',
    },
    premium: {
      upgradeTitle: 'Upgrade your plan',
      upgradeSubtitle: 'Get more from Habixa',
      free: 'Free',
      basic: 'Basic',
      pro: 'Pro',
      freeDesc: '1 active listing · Browse all · Basic profile',
      basicDesc: '5 listings · Boost listings · Priority search',
      proDesc: 'Unlimited listings · 2 free boosts/month · Analytics',
      perMonth: '/month',
      currentPlan: 'Current plan',
      choosePlan: 'Choose plan',
      boostListing: 'Boost listing',
      boostDesc: 'Pin your listing to the top of search results for 7 days.',
      boostCta: 'Boost for',
      listingLimitTitle: 'Listing limit reached',
      listingLimitDesc: (tier: string, max: number) =>
        `Your ${tier} plan allows up to ${max} active listing${max === 1 ? '' : 's'}. Upgrade to add more.`,
    },
    payments: {
      payRent: 'Pay Rent',
      amount: 'Amount',
      payNow: 'Pay now',
      success: 'Payment successful',
      failed: 'Payment failed',
      history: 'Payment history',
      noPayments: 'No payments yet',
      receipt: 'Receipt',
      processing: 'Processing…',
    },
    profile: {
      editProfile: 'Edit Profile',
      verification: 'Verification',
      paymentHistory: 'Payment History',
      myReviews: 'My Reviews',
      myLeases: 'My Leases',
      complaints: 'Complaints',
      settings: 'Settings',
      logout: 'Log out',
      memberSince: 'Member since',
      lookingToRent: 'Looking to rent',
      listingProperty: 'Listing property',
      member: 'Member',
    },
    auth: {
      login: 'Sign in',
      register: 'Create account',
      email: 'Email address',
      password: 'Password',
      forgotPassword: 'Forgot password?',
      noAccount: "Don't have an account?",
      haveAccount: 'Already have an account?',
      signInWith: 'Sign in with',
      continueWithGoogle: 'Continue with Google',
      continueWithFacebook: 'Continue with Facebook',
      continueWithApple: 'Continue with Apple',
    },
    errors: {
      networkError: 'No internet connection. Please check your network.',
      serverError: 'Server error. Please try again.',
      notFound: 'Not found.',
      unauthorized: 'Please sign in to continue.',
    },
  },

  es: {
    common: {
      back: 'Atrás',
      close: 'Cerrar',
      save: 'Guardar',
      cancel: 'Cancelar',
      delete: 'Eliminar',
      edit: 'Editar',
      loading: 'Cargando…',
      error: 'Algo salió mal',
      retry: 'Intentar de nuevo',
      confirm: 'Confirmar',
      yes: 'Sí',
      no: 'No',
      next: 'Siguiente',
      done: 'Listo',
      or: 'o',
    },
    greeting: {
      morning: 'Buenos días',
      afternoon: 'Buenas tardes',
      evening: 'Buenas noches',
    },
    home: {
      featured: 'Destacado',
      nearYou: 'Cerca de ti',
      forSale: 'En venta',
      forRent: 'En alquiler',
      seeAll: 'Ver todo',
    },
    search: {
      title: 'Encuentra un hogar',
      placeholder: 'Barrio, calle, zona…',
      placeholderWithCity: (city: string) => `Buscar en ${city}…`,
      results: (n: number) => `${n} resultado${n === 1 ? '' : 's'}`,
      noResults: 'Ningún anuncio coincide con tu búsqueda.',
      startPrompt: 'Busca un barrio, calle o zona para encontrar casas.',
      filters: 'Filtros',
      sortBy: 'Ordenar por',
      sortRelevance: 'Relevancia',
      sortNewest: 'Más recientes',
      sortPriceLow: 'Precio: menor a mayor',
      sortPriceHigh: 'Precio: mayor a menor',
      mapView: 'Vista de mapa',
      apartments: 'Apartamentos',
      houses: 'Casas',
      price: 'Precio',
      bedrooms: '2+ hab.',
      available: 'Disponible',
      minPrice: 'Precio mínimo',
      maxPrice: 'Precio máximo',
      anyPrice: 'Cualquier precio',
      applyFilters: 'Aplicar filtros',
      clearFilters: 'Limpiar filtros',
    },
    listing: {
      perMonth: '/mes',
      beds: (n: number) => `${n} hab.`,
      baths: (n: number) => `${n} baño${n === 1 ? '' : 's'}`,
      landlordScore: 'Puntuación del propietario',
      noReviews: 'Sin reseñas aún',
      message: 'Mensaje al propietario',
      apply: 'Postularme',
      share: 'Compartir',
      save: 'Guardar',
      saved: 'Guardado',
      featured: 'Destacado',
      verified: 'Verificado',
      description: 'Descripción',
      amenities: 'Servicios',
      location: 'Ubicación',
      relatedListings: 'Anuncios similares',
    },
    listing_create: {
      title: 'Crear anuncio',
      steps: ['Básico', 'Ubicación', 'Fotos', 'Precio', 'Revisar'],
      type_rent: 'En alquiler',
      type_sale: 'En venta',
      publish: 'Publicar',
      saveDraft: 'Guardar borrador',
      titleField: 'Título',
      description: 'Descripción',
      price: 'Precio',
      bedrooms: 'Habitaciones',
      bathrooms: 'Baños',
      sqft: 'M² (opcional)',
      addPhotos: 'Agregar fotos',
      publishSuccess: '¡Anuncio publicado!',
    },
    premium: {
      upgradeTitle: 'Mejora tu plan',
      upgradeSubtitle: 'Saca más partido de Habixa',
      free: 'Gratis',
      basic: 'Básico',
      pro: 'Pro',
      freeDesc: '1 anuncio · Ver todo · Perfil básico',
      basicDesc: '5 anuncios · Impulsar · Búsqueda prioritaria',
      proDesc: 'Anuncios ilimitados · 2 impulsos/mes · Analíticas',
      perMonth: '/mes',
      currentPlan: 'Plan actual',
      choosePlan: 'Elegir plan',
      boostListing: 'Impulsar anuncio',
      boostDesc: 'Coloca tu anuncio en la cima de los resultados de búsqueda durante 7 días.',
      boostCta: 'Impulsar por',
      listingLimitTitle: 'Límite de anuncios alcanzado',
      listingLimitDesc: (tier: string, max: number) =>
        `Tu plan ${tier} permite hasta ${max} anuncio${max === 1 ? '' : 's'} activo${max === 1 ? '' : 's'}.`,
    },
    payments: {
      payRent: 'Pagar alquiler',
      amount: 'Monto',
      payNow: 'Pagar ahora',
      success: 'Pago exitoso',
      failed: 'Pago fallido',
      history: 'Historial de pagos',
      noPayments: 'Sin pagos aún',
      receipt: 'Recibo',
      processing: 'Procesando…',
    },
    profile: {
      editProfile: 'Editar perfil',
      verification: 'Verificación',
      paymentHistory: 'Historial de pagos',
      myReviews: 'Mis reseñas',
      myLeases: 'Mis contratos',
      complaints: 'Quejas',
      settings: 'Configuración',
      logout: 'Cerrar sesión',
      memberSince: 'Miembro desde',
      lookingToRent: 'Buscando alquilar',
      listingProperty: 'Publicando propiedad',
      member: 'Miembro',
    },
    auth: {
      login: 'Iniciar sesión',
      register: 'Crear cuenta',
      email: 'Correo electrónico',
      password: 'Contraseña',
      forgotPassword: '¿Olvidaste tu contraseña?',
      noAccount: '¿No tienes cuenta?',
      haveAccount: '¿Ya tienes cuenta?',
      signInWith: 'Iniciar con',
      continueWithGoogle: 'Continuar con Google',
      continueWithFacebook: 'Continuar con Facebook',
      continueWithApple: 'Continuar con Apple',
    },
    errors: {
      networkError: 'Sin conexión a internet.',
      serverError: 'Error del servidor. Inténtalo de nuevo.',
      notFound: 'No encontrado.',
      unauthorized: 'Inicia sesión para continuar.',
    },
  },

  fr: {
    common: {
      back: 'Retour', close: 'Fermer', save: 'Enregistrer', cancel: 'Annuler',
      delete: 'Supprimer', edit: 'Modifier', loading: 'Chargement…',
      error: 'Une erreur est survenue', retry: 'Réessayer', confirm: 'Confirmer',
      yes: 'Oui', no: 'Non', next: 'Suivant', done: 'Terminé', or: 'ou',
    },
    greeting: { morning: 'Bonjour', afternoon: 'Bon après-midi', evening: 'Bonsoir' },
    home: { featured: 'À la une', nearYou: 'Près de vous', forSale: 'À vendre', forRent: 'À louer', seeAll: 'Voir tout' },
    search: {
      title: 'Trouver un logement',
      placeholder: 'Quartier, rue, zone…',
      placeholderWithCity: (city: string) => `Rechercher à ${city}…`,
      results: (n: number) => `${n} résultat${n === 1 ? '' : 's'}`,
      noResults: 'Aucune annonce ne correspond à votre recherche.',
      startPrompt: 'Recherchez un quartier, une rue ou une zone.',
      filters: 'Filtres', sortBy: 'Trier par',
      sortRelevance: 'Pertinence', sortNewest: 'Plus récents',
      sortPriceLow: 'Prix croissant', sortPriceHigh: 'Prix décroissant',
      mapView: 'Carte', apartments: 'Appartements', houses: 'Maisons',
      price: 'Prix', bedrooms: '2+ chambres', available: 'Disponible',
      minPrice: 'Prix min', maxPrice: 'Prix max', anyPrice: 'Tout prix',
      applyFilters: 'Appliquer', clearFilters: 'Effacer',
    },
    listing: {
      perMonth: '/mois',
      beds: (n: number) => `${n} ch.`,
      baths: (n: number) => `${n} sdb`,
      landlordScore: 'Note du propriétaire', noReviews: 'Pas encore d\'avis',
      message: 'Contacter le propriétaire', apply: 'Postuler',
      share: 'Partager', save: 'Sauvegarder', saved: 'Sauvegardé',
      featured: 'À la une', verified: 'Vérifié', description: 'Description',
      amenities: 'Équipements', location: 'Localisation', relatedListings: 'Annonces similaires',
    },
    listing_create: {
      title: 'Créer une annonce', steps: ['Détails', 'Adresse', 'Photos', 'Prix', 'Révision'],
      type_rent: 'À louer', type_sale: 'À vendre', publish: 'Publier',
      saveDraft: 'Enregistrer brouillon', titleField: 'Titre', description: 'Description',
      price: 'Prix', bedrooms: 'Chambres', bathrooms: 'Salles de bain',
      sqft: 'M² (facultatif)', addPhotos: 'Ajouter des photos', publishSuccess: 'Annonce publiée !',
    },
    premium: {
      upgradeTitle: 'Améliorer votre plan', upgradeSubtitle: 'Tirez le meilleur de Habixa',
      free: 'Gratuit', basic: 'Basique', pro: 'Pro',
      freeDesc: '1 annonce · Navigation · Profil de base',
      basicDesc: '5 annonces · Booster · Priorité de recherche',
      proDesc: 'Annonces illimitées · 2 boosts/mois · Statistiques',
      perMonth: '/mois', currentPlan: 'Plan actuel', choosePlan: 'Choisir un plan',
      boostListing: 'Booster l\'annonce',
      boostDesc: 'Mettez votre annonce en tête des résultats pendant 7 jours.',
      boostCta: 'Booster pour',
      listingLimitTitle: 'Limite d\'annonces atteinte',
      listingLimitDesc: (tier: string, max: number) =>
        `Votre plan ${tier} permet jusqu'à ${max} annonce${max === 1 ? '' : 's'} active${max === 1 ? '' : 's'}.`,
    },
    payments: {
      payRent: 'Payer le loyer', amount: 'Montant', payNow: 'Payer maintenant',
      success: 'Paiement réussi', failed: 'Paiement échoué',
      history: 'Historique', noPayments: 'Aucun paiement', receipt: 'Reçu', processing: 'Traitement…',
    },
    profile: {
      editProfile: 'Modifier le profil', verification: 'Vérification',
      paymentHistory: 'Historique', myReviews: 'Mes avis', myLeases: 'Mes baux',
      complaints: 'Réclamations', settings: 'Paramètres', logout: 'Se déconnecter',
      memberSince: 'Membre depuis', lookingToRent: 'Cherche à louer',
      listingProperty: 'Propriétaire', member: 'Membre',
    },
    auth: {
      login: 'Se connecter', register: 'Créer un compte', email: 'E-mail', password: 'Mot de passe',
      forgotPassword: 'Mot de passe oublié ?', noAccount: 'Pas de compte ?',
      haveAccount: 'Déjà un compte ?', signInWith: 'Se connecter avec',
      continueWithGoogle: 'Continuer avec Google', continueWithFacebook: 'Continuer avec Facebook',
      continueWithApple: 'Continuer avec Apple',
    },
    errors: {
      networkError: 'Pas de connexion internet.', serverError: 'Erreur serveur.',
      notFound: 'Introuvable.', unauthorized: 'Connectez-vous pour continuer.',
    },
  },
} as const;

// ── Type helpers ──────────────────────────────────────────────────────────────
type SupportedLocale = keyof typeof translations;
type TranslationTree = typeof translations.en;

// ── State ─────────────────────────────────────────────────────────────────────
let currentLocale: SupportedLocale = 'en';

function detectLocale(): SupportedLocale {
  try {
    const locales = getLocales();
    const code = locales[0]?.languageCode ?? 'en';
    if (code in translations) return code as SupportedLocale;
    // Fallback: match prefix (e.g. 'es-419' → 'es')
    const prefix = code.split('-')[0] as SupportedLocale;
    if (prefix in translations) return prefix;
  } catch {
    // expo-localization not available (e.g. tests)
  }
  return 'en';
}

currentLocale = detectLocale();

export function setLocale(locale: SupportedLocale) {
  currentLocale = locale;
}

export function getLocale(): SupportedLocale {
  return currentLocale;
}

// ── t() — nested key accessor ─────────────────────────────────────────────────
type Leaves<T> = T extends (...args: unknown[]) => unknown
  ? T
  : T extends object
  ? { [K in keyof T]: Leaves<T[K]> }[keyof T]
  : T;

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce((acc: unknown, key) => {
    if (acc && typeof acc === 'object') return (acc as Record<string, unknown>)[key];
    return undefined;
  }, obj);
}

export function t(key: string, ...args: unknown[]): string {
  const tree = (translations[currentLocale] ?? translations.en) as unknown as Record<string, unknown>;
  const fallbackTree = translations.en as unknown as Record<string, unknown>;
  const value = getNestedValue(tree, key) ?? getNestedValue(fallbackTree, key);
  if (typeof value === 'function') {
    return String((value as (...a: unknown[]) => unknown)(...args));
  }
  if (typeof value === 'string') return value;
  console.warn(`[i18n] Missing key: ${key}`);
  return key;
}

export type { TranslationTree, SupportedLocale };
export default { t, setLocale, getLocale };
