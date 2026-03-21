/**
 * App config from environment.
 * Values are read at build time from EXPO_PUBLIC_* vars.
 */

const env = typeof process !== 'undefined' ? process.env : ({} as NodeJS.ProcessEnv);

/** Default location for search placeholders (e.g. "Nassau, NP") */
export const DEFAULT_LOCATION =
  env.EXPO_PUBLIC_DEFAULT_LOCATION || 'Nassau, NP';

/** Default city for search (e.g. for "Search properties in {city}…") */
export const DEFAULT_CITY =
  env.EXPO_PUBLIC_DEFAULT_CITY || DEFAULT_LOCATION.split(',')[0]?.trim() || 'Nassau';
