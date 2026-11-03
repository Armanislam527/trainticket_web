import { Link, Stack, useLocalSearchParams } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Screen } from "../../components/Screen";
import { findTrain, scheduleSnapshotInfo } from "../../lib/train-data";
import { colors } from "../../theme";

export default function TrainDetailsScreen() {
  const { number } = useLocalSearchParams<{ number: string }>();
  const train = findTrain(Array.isArray(number) ? number[0] : number);

  if (!train) {
    return (
      <Screen>
        <Stack.Screen options={{ title: "Train not found" }} />
        <View style={styles.notFound}>
          <Text style={styles.title}>Schedule not found</Text>
          <Link href="/" style={styles.link}>Back to trains</Link>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: train.schedule.train_name }} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.kicker}>TRAIN #{train.train_number}</Text>
        <Text style={styles.title}>{train.schedule.train_name}</Text>
        <Text style={styles.route}>
          {train.origin_city.replaceAll("_", " ")}{"\n"}↓{"\n"}{train.destination_city.replaceAll("_", " ")}
        </Text>
        <View style={styles.facts}>
          <Fact label="Journey time" value={train.schedule.total_duration || "Not listed"} />
          <Fact label="Runs on" value={train.schedule.days.length ? train.schedule.days.join(", ") : "Days not listed"} />
          <Fact label="Stops" value={String(train.schedule.routes.length)} />
        </View>

        <Text style={styles.sectionTitle}>Route</Text>
        {train.schedule.routes.map((stop, index) => (
          <View key={`${stop.city}-${index}`} style={styles.stopRow}>
            <View style={styles.timeline}>
              <View style={[styles.dot, index === 0 && styles.firstDot]} />
              {index < train.schedule.routes.length - 1 && <View style={styles.line} />}
            </View>
            <View style={styles.stopDetails}>
              <Text style={styles.station}>{stop.city.replaceAll("_", " ")}</Text>
              <Text style={styles.time}>
                {stop.arrival_time ? `Arr ${stop.arrival_time}` : ""}
                {stop.arrival_time && stop.departure_time ? "  ·  " : ""}
                {stop.departure_time ? `Dep ${stop.departure_time}` : ""}
              </Text>
            </View>
          </View>
        ))}

        <View style={styles.availabilityCard}>
          <Text style={styles.availabilityTitle}>Looking for available seats?</Text>
          <Text style={styles.availabilityText}>
            Live availability is not included in the offline schedule. Connect an authorized API provider to enable seat searches.
          </Text>
          <Link href="/availability" style={styles.button}>Check seat availability</Link>
        </View>
        <Text style={styles.snapshot}>
          Schedule snapshot: {scheduleSnapshotInfo.retrievedAt ? new Date(scheduleSnapshotInfo.retrievedAt).toLocaleDateString() : "date unavailable"}
        </Text>
      </ScrollView>
    </Screen>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.fact}>
      <Text style={styles.factLabel}>{label}</Text>
      <Text style={styles.factValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 40 },
  kicker: { color: colors.primary, fontSize: 12, fontWeight: "800", letterSpacing: 1.2, marginTop: 8 },
  title: { color: colors.text, fontSize: 25, fontWeight: "800", marginTop: 7 },
  route: { backgroundColor: colors.softGreen, borderRadius: 14, color: colors.primaryDark, fontSize: 16, fontWeight: "700", lineHeight: 26, marginTop: 18, padding: 16 },
  facts: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 14, borderWidth: 1, flexDirection: "row", marginTop: 14, padding: 14 },
  fact: { flex: 1, gap: 5 },
  factLabel: { color: colors.muted, fontSize: 11 },
  factValue: { color: colors.text, fontSize: 13, fontWeight: "700" },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: "700", marginBottom: 14, marginTop: 26 },
  stopRow: { flexDirection: "row", minHeight: 54 },
  timeline: { alignItems: "center", marginRight: 13, width: 14 },
  dot: { backgroundColor: colors.surface, borderColor: colors.primary, borderRadius: 6, borderWidth: 2, height: 12, marginTop: 2, width: 12 },
  firstDot: { backgroundColor: colors.primary },
  line: { backgroundColor: colors.border, flex: 1, width: 2 },
  stopDetails: { flex: 1, paddingBottom: 15 },
  station: { color: colors.text, fontSize: 14, fontWeight: "600" },
  time: { color: colors.muted, fontSize: 12, marginTop: 4 },
  availabilityCard: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 14, borderWidth: 1, marginTop: 20, padding: 16 },
  availabilityTitle: { color: colors.text, fontSize: 16, fontWeight: "700" },
  availabilityText: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 7 },
  button: { alignSelf: "flex-start", backgroundColor: colors.primary, borderRadius: 10, color: "#fff", fontSize: 14, fontWeight: "700", overflow: "hidden", marginTop: 14, paddingHorizontal: 14, paddingVertical: 11 },
  snapshot: { color: colors.muted, fontSize: 11, marginTop: 16, textAlign: "center" },
  notFound: { flex: 1, gap: 12, justifyContent: "center", padding: 24 },
  link: { color: colors.primary, fontSize: 15, fontWeight: "700" },
});
