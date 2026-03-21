import { useTheme } from '@/context/ThemeContext';

/**
 * Returns the resolved color scheme (light/dark) from ThemeContext.
 * Use this in components that need to react to the current theme.
 */
export function useColorScheme(): 'light' | 'dark' {
  const { colorScheme } = useTheme();
  return colorScheme;
}
