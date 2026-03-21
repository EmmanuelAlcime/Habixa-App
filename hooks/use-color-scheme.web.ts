import { useTheme } from '@/context/ThemeContext';

/**
 * Web: same as default, uses ThemeContext for resolved color scheme.
 */
export function useColorScheme(): 'light' | 'dark' {
  const { colorScheme } = useTheme();
  return colorScheme;
}
