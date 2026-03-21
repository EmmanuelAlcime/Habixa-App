import { Tabs } from 'expo-router';

import { HapticTab } from '@/components/haptic-tab';
import { useTheme } from '@/context/ThemeContext';
import { HabixaIcon } from '@/components/HabixaIcon';
import { Fonts } from '@/constants/theme';

const TAB_ICONS = {
  home: 'home',
  search: 'search',
  listings: 'list-ul',
  messages: 'comment-dots',
  profile: 'user-circle',
} as const;

export default function TabLayout() {
  const { colors, colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';

  return (
    <Tabs
      initialRouteName="(home)"
      screenOptions={{
        tabBarActiveTintColor: colors.tabIconSelected,
        tabBarInactiveTintColor: colors.tabIconDefault,
        tabBarStyle: {
          backgroundColor: isDark ? colors.background : colors.card,
          borderTopWidth: 0.5,
          borderTopColor: colors.border,
          paddingBottom: 8,
        },
        tabBarLabelStyle: {
          fontFamily: Fonts.heading,
          fontSize: 9,
          letterSpacing: 0.5,
        },
        headerShown: false,
        tabBarButton: HapticTab,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="(home)"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <HabixaIcon name={TAB_ICONS.home} size={18} color={color} solid={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="(search)"
        options={{
          title: 'Search',
          tabBarIcon: ({ color, focused }) => (
            <HabixaIcon name={TAB_ICONS.search} size={18} color={color} solid={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="(listings)"
        options={{
          title: 'Listings',
          tabBarIcon: ({ color, focused }) => (
            <HabixaIcon name={TAB_ICONS.listings} size={18} color={color} solid={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="(messages)"
        options={{
          title: 'Messages',
          tabBarIcon: ({ color, focused }) => (
            <HabixaIcon name={TAB_ICONS.messages} size={18} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="(profile)"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <HabixaIcon name={TAB_ICONS.profile} size={18} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
