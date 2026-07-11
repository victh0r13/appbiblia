import { Feather } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../../store/AppContext';

const TAB_DEFS: Record<
  string,
  { label: string; icon: React.ComponentProps<typeof Feather>['name'] }
> = {
  index: { label: 'Início', icon: 'home' },
  books: { label: 'Bíblia', icon: 'book-open' },
  search: { label: 'Busca', icon: 'search' },
  favorites: { label: 'Favoritos', icon: 'bookmark' },
};

// Tipo estrutural mínimo — o BottomTabBarProps do expo-router (fork interno)
// não é intercambiável com o do @react-navigation/bottom-tabs.
interface TabBarProps {
  state: { index: number; routes: { key: string; name: string }[] };
  navigation: {
    emit: (e: {
      type: 'tabPress';
      target: string;
      canPreventDefault: true;
    }) => { defaultPrevented: boolean };
    navigate: (name: string) => void;
  };
}

function TabBar({ state, navigation }: TabBarProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: theme.card,
        borderTopWidth: 1,
        borderTopColor: theme.line,
        paddingTop: 9,
        paddingHorizontal: 6,
        paddingBottom: Math.max(insets.bottom, 14),
      }}
    >
      {state.routes.map((route, i) => {
        const def = TAB_DEFS[route.name];
        if (!def) return null;
        const on = state.index === i;
        const color = on ? theme.acc : theme.sub;
        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!on && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            }}
            style={{ flex: 1, alignItems: 'center', gap: 4 }}
          >
            <Feather name={def.icon} size={20} color={color} />
            <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 0.4, color }}>
              {def.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function TabsLayout() {
  const theme = useTheme();
  return (
    <Tabs
      tabBar={({ state, navigation }) => (
        <TabBar state={state} navigation={navigation} />
      )}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: theme.bg },
      }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="books" />
      <Tabs.Screen name="search" />
      <Tabs.Screen name="favorites" />
    </Tabs>
  );
}
