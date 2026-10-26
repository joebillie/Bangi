import Head from "expo-router/head";
import { Stack } from "expo-router";
import { Provider, useApp } from "../src/store";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import { Txt } from "../src/ui";
function Navigation() {
  const { ready, palette: p } = useApp();
  if (!ready)
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: p.background,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Txt>Preparing your peaceful space…</Txt>
      </View>
    );
  return (
    <>
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: p.header },
          headerTintColor: p.headerText,
          contentStyle: { backgroundColor: p.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="location"
          options={{ title: "Location & region" }}
        />
        <Stack.Screen
          name="calculation"
          options={{ title: "Prayer calculation" }}
        />
        <Stack.Screen
          name="reminders"
          options={{ title: "Prayer reminders" }}
        />
        <Stack.Screen name="install" options={{ title: "Install Bangi" }} />
        <Stack.Screen
          name="appearance"
          options={{ title: "Your personal palette" }}
        />
      </Stack>
    </>
  );
}
export default function Root() {
  return (
    <>
      <Head>
        <title>Bangi · Prayer &amp; Qibla</title>
      </Head>
      <SafeAreaProvider>
        <Provider>
          <Navigation />
        </Provider>
      </SafeAreaProvider>
    </>
  );
}
