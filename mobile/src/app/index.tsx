import { Link } from "expo-router";
import { useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Screen } from "../components/Screen";
import { scheduleSnapshotInfo, searchTrains, type Train } from "../lib/train-data";
import { colors } from "../theme";

function TrainCard({ train }: { train: Train }) {
  return (
    <Link href={`/train/${train.train_number}`} asChild>
      <Pressable style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.trainName}>{train.schedule.train_name}</Text>
          <Text style={styles.number}>#{train.train_number}</Text>
        </View>
        <Text style={styles.route}>
          {train.origin_city.replaceAll("_", " ")}  →  {train.destination_city.replaceAll("_", " ")}
        </Text>
        <View style={styles.cardFooter}>
          <Text style={styles.meta}>{train.schedule.routes.length} stops</Text>
          <Text style={styles.meta}>{train.schedule.total_duration || "Schedule available"}</Text>
        </View>
      </Pressable>
    </Link>
  );
}

export default function HomeScreen() {
  const [query, setQuery] = useState("");
  const results = useMemo(() => searchTrains(query), [query]);

  return (
    <Screen>
      <FlatList
        data={results}
        keyExtractor={(train) => train.train_number}
        renderItem={({ item }) => <TrainCard train={item} />}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View>
            <Text style={styles.eyebrow}>BANGLADESH RAILWAY</Text>
            <Text style={styles.title}>Plan your train trip</Text>
            <Text style={styles.subtitle}>Find a train by name, number, or station.</Text>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Try Dhaka, Suborno, or 701"
              placeholderTextColor={colors.muted}
              style={styles.search}
              accessibilityLabel="Search trains and stations"
              returnKeyType="search"
              autoCorrect={false}
            />
            {!scheduleSnapshotInfo.complete && (
              <View style={styles.notice}>
                <Text style={styles.noticeTitle}>Offline schedule snapshot</Text>
                <Text style={styles.noticeText}>
                  {scheduleSnapshotInfo.fetched} of {scheduleSnapshotInfo.total} schedules were available when this data was collected. Live seats are shown separately and require an authorized provider.
                </Text>
              </View>
            )}
            <Text style={styles.sectionTitle}>
              {query.trim() ? `${results.length} matching trains` : `${results.length} trains`}
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No trains found</Text>
            <Text style={styles.meta}>Try a train number, train name, or station.</Text>
          </View>
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { padding: 20, paddingBottom: 32, gap: 12 },
  eyebrow: { color: colors.primary, fontSize: 12, fontWeight: "800", letterSpacing: 1.4, marginTop: 10 },
  title: { color: colors.text, fontSize: 29, fontWeight: "800", marginTop: 8 },
  subtitle: { color: colors.muted, fontSize: 15, marginTop: 6, marginBottom: 18 },
  search: {
    backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 12, borderWidth: 1,
    color: colors.text, fontSize: 16, minHeight: 52, paddingHorizontal: 15,
  },
  notice: { backgroundColor: colors.warning, borderRadius: 12, marginTop: 14, padding: 14 },
  noticeTitle: { color: colors.warningText, fontSize: 14, fontWeight: "700", marginBottom: 4 },
  noticeText: { color: colors.warningText, fontSize: 13, lineHeight: 19 },
  sectionTitle: { color: colors.text, fontSize: 17, fontWeight: "700", marginTop: 22, marginBottom: 2 },
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 14, borderWidth: 1, padding: 15 },
  cardHeader: { alignItems: "flex-start", flexDirection: "row", justifyContent: "space-between", gap: 10 },
  trainName: { color: colors.text, flex: 1, fontSize: 16, fontWeight: "700" },
  number: { backgroundColor: colors.softGreen, borderRadius: 8, color: colors.primaryDark, fontSize: 12, fontWeight: "700", overflow: "hidden", paddingHorizontal: 9, paddingVertical: 5 },
  route: { color: colors.text, fontSize: 14, marginTop: 12 },
  cardFooter: { borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth, flexDirection: "row", justifyContent: "space-between", marginTop: 13, paddingTop: 10 },
  meta: { color: colors.muted, fontSize: 12 },
  empty: { alignItems: "center", backgroundColor: colors.surface, borderRadius: 14, marginTop: 4, padding: 24 },
  emptyTitle: { color: colors.text, fontSize: 16, fontWeight: "700", marginBottom: 5 },
});
