import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { colors } from "../theme";

export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: "700" },
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="index" options={{ title: "Train finder" }} />
        <Stack.Screen name="train/[number]" options={{ title: "Train schedule" }} />
        <Stack.Screen name="availability" options={{ title: "Seat availability" }} />
      </Stack>
    </>
  );
}
