import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Screen } from "../components/Screen";
import {
  searchAvailability,
  type AvailableTrain,
  type SeatType,
} from "../lib/availability";
import { colors } from "../theme";

const SEAT_CLASSES = ["S_CHAIR", "SHOVAN", "SNIGDHA", "F_SEAT", "F_BERTH", "AC_S", "AC_B", "AC_CHAIR"];

function localDateString() {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function SeatCard({ train, seatClass }: { train: AvailableTrain; seatClass: string }) {
  const seats = train.seat_types.find((seat) => seat.type === seatClass);
  if (!seats) return null;

  return (
    <View style={styles.resultCard}>
      <Text style={styles.trainName}>{train.trip_number}</Text>
      <SeatSummary seat={seats} />
    </View>
  );
}

function SeatSummary({ seat }: { seat: SeatType }) {
  return (
    <View style={styles.resultDetails}>
      <View>
        <Text style={styles.seatCount}>{seat.seat_counts.online} seats</Text>
        <Text style={styles.meta}>{seat.type.replaceAll("_", " ")}</Text>
      </View>
      <Text style={styles.fare}>৳ {seat.fare}</Text>
    </View>
  );
}

export default function AvailabilityScreen() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [date, setDate] = useState(localDateString);
  const [seatClass, setSeatClass] = useState("S_CHAIR");
  const [results, setResults] = useState<AvailableTrain[] | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function checkSeats() {
    if (!from.trim() || !to.trim() || !date.trim()) {
      setError("Enter both stations and a journey date.");
      return;
    }
    setLoading(true);
    setError("");
    setResults(null);
    try {
      const trains = await searchAvailability({ from: from.trim(), to: to.trim(), date: date.trim(), seatClass });
      setResults(trains);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Check live seat availability</Text>
        <Text style={styles.subtitle}>
          Search the authorized availability service configured for this app. This screen does not access or transfer official-site login sessions.
        </Text>

        <View style={styles.formCard}>
          <Field label="From" value={from} onChangeText={setFrom} placeholder="Station name" />
          <Field label="To" value={to} onChangeText={setTo} placeholder="Station name" />
          <Field label="Journey date" value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" autoCapitalize="none" />
          <Text style={styles.label}>Seat class</Text>
          <View style={styles.classes}>
            {SEAT_CLASSES.map((item) => (
              <Pressable
                key={item}
                onPress={() => setSeatClass(item)}
                style={[styles.classChip, seatClass === item && styles.classChipSelected]}
                accessibilityRole="button"
                accessibilityState={{ selected: seatClass === item }}
              >
                <Text style={[styles.classText, seatClass === item && styles.classTextSelected]}>
                  {item.replaceAll("_", " ")}
                </Text>
              </Pressable>
            ))}
          </View>
          <Pressable onPress={checkSeats} disabled={loading} style={[styles.button, loading && styles.buttonDisabled]}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Search availability</Text>}
          </Pressable>
        </View>

        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
        {results && results.length === 0 ? (
          <Text style={styles.empty}>No trains were returned for this search.</Text>
        ) : null}
        {results?.map((train, index) => (
          <SeatCard key={`${train.trip_number}-${index}`} train={train} seatClass={seatClass} />
        ))}
        {results && results.length > 0 && !results.some((train) => train.seat_types.some((seat) => seat.type === seatClass)) ? (
          <Text style={styles.empty}>The provider returned trains, but no {seatClass.replaceAll("_", " ")} results.</Text>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

function Field({
  label,
  ...inputProps
}: React.ComponentProps<typeof TextInput> & { label: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...inputProps}
        style={styles.input}
        placeholderTextColor={colors.muted}
        autoCorrect={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 40 },
  title: { color: colors.text, fontSize: 25, fontWeight: "800", marginTop: 8 },
  subtitle: { color: colors.muted, fontSize: 14, lineHeight: 21, marginTop: 8, marginBottom: 20 },
  formCard: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 14, borderWidth: 1, padding: 16 },
  field: { marginBottom: 14 },
  label: { color: colors.text, fontSize: 13, fontWeight: "700", marginBottom: 7 },
  input: { borderColor: colors.border, borderRadius: 10, borderWidth: 1, color: colors.text, fontSize: 15, minHeight: 46, paddingHorizontal: 12 },
  classes: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 2 },
  classChip: { borderColor: colors.border, borderRadius: 18, borderWidth: 1, paddingHorizontal: 11, paddingVertical: 8 },
  classChipSelected: { backgroundColor: colors.softGreen, borderColor: colors.primary },
  classText: { color: colors.muted, fontSize: 12, fontWeight: "600" },
  classTextSelected: { color: colors.primaryDark },
  button: { alignItems: "center", backgroundColor: colors.primary, borderRadius: 10, justifyContent: "center", marginTop: 18, minHeight: 48 },
  buttonDisabled: { opacity: 0.65 },
  buttonText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  error: { backgroundColor: "#fdecee", borderRadius: 10, color: colors.danger, fontSize: 14, lineHeight: 20, marginTop: 16, padding: 12 },
  empty: { color: colors.muted, fontSize: 14, marginTop: 18, textAlign: "center" },
  resultCard: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 12, borderWidth: 1, marginTop: 12, padding: 15 },
  trainName: { color: colors.text, fontSize: 15, fontWeight: "700" },
  resultDetails: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginTop: 12 },
  seatCount: { color: colors.primaryDark, fontSize: 18, fontWeight: "800" },
  meta: { color: colors.muted, fontSize: 12, marginTop: 3 },
  fare: { color: colors.text, fontSize: 15, fontWeight: "700" },
});
