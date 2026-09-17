import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
} from "react-native";
import { router } from "expo-router";

import {
  Button,
  Card,
  ErrorText,
  Input,
  Screen,
  Subtitle,
  Title,
} from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function EditProfileScreen() {
  const { doctor, refreshMe } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [sessionTime, setSessionTime] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!doctor) return;
    setFirstName(doctor.first_name || "");
    setLastName(doctor.last_name || "");
    setEmail(doctor.email || "");
    setSessionTime(String(doctor.session_time ?? ""));
  }, [doctor]);

  async function onSave() {
    const first = firstName.trim();
    const last = lastName.trim();
    const nextEmail = email.trim().toLowerCase();
    const session = Number(sessionTime);

    if (!first || !last) {
      setError("Enter first and last name.");
      return;
    }
    if (!nextEmail || !nextEmail.includes("@")) {
      setError("Enter a valid email address.");
      return;
    }
    if (!Number.isFinite(session) || session < 1 || !Number.isInteger(session)) {
      setError("Session time must be a whole number of at least 1 minute.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await api.updateMe({
        first_name: first,
        last_name: last,
        email: nextEmail,
        session_time: session,
      });
      await refreshMe();
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save profile.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 48 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          automaticallyAdjustKeyboardInsets
        >
          <Title>Edit profile</Title>
          <Subtitle>
            Update your name, email, and default consultation length.
            Specialities stay managed by admin.
          </Subtitle>

          <View style={{ height: 20 }} />

          <Card style={{ gap: 14 }}>
            <Input
              label="First name"
              value={firstName}
              onChangeText={setFirstName}
              autoCapitalize="words"
              autoCorrect={false}
            />
            <Input
              label="Last name"
              value={lastName}
              onChangeText={setLastName}
              autoCapitalize="words"
              autoCorrect={false}
            />
            <Input
              label="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
            />
            <Input
              label="Session time (minutes)"
              value={sessionTime}
              onChangeText={setSessionTime}
              keyboardType="number-pad"
            />
            <ErrorText>{error}</ErrorText>
            <Button
              label={saving ? "Saving…" : "Save changes"}
              onPress={onSave}
              loading={saving}
              disabled={saving}
            />
            <Button
              label="Cancel"
              variant="secondary"
              onPress={() => router.back()}
              disabled={saving}
            />
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
