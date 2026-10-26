import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Tabs } from "expo-router";
import { Icon } from "../../src/icon";
import { translate } from "../../src/i18n";
import { useApp } from "../../src/store";
export default function Layout() {
  const insets = useSafeAreaInsets();
  const { palette: p, scale, settings } = useApp();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: p.surface,
          borderTopColor: p.border,
          height: 64 + Math.max(14, insets.bottom),
          paddingTop: 8,
          paddingBottom: Math.max(14, insets.bottom),
        },
        tabBarActiveTintColor: p.activeNav,
        tabBarInactiveTintColor: p.inactiveNav,
        tabBarLabelStyle: { fontSize: 12 * scale },
      }}
    >
      {[
        ["index", "Home", "home"],
        ["times", "Times", "times"],
        ["qibla", "Qibla", "qibla"],
        ["settings", "Settings", "settings"],
      ].map(([name, title, icon]) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title: translate(title, settings.language),
            tabBarIcon: ({ color }) => <Icon name={icon} color={color} />,
          }}
        />
      ))}
    </Tabs>
  );
}
