import type { PropsWithChildren } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../theme";

export function Screen({ children }: PropsWithChildren) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top", "left", "right"]}>
      {children}
    </SafeAreaView>
  );
}
