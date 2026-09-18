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

type FieldErrors = {
  firstName?: string;
  lastName?: string;
  email?: string;
  sessionTime?: string;
};

function validateProfile(fields: {
  firstName: string;
  lastName: string;
  email: string;
  sessionTime: string;
}): FieldErrors {
  const errors: FieldErrors = {};
  const first = fields.firstName.trim();
  const last = fields.lastName.trim();
  const nextEmail = fields.email.trim().toLowerCase();
  const session = Number(fields.sessionTime);

  if (!first) errors.firstName = "Enter first name.";
  if (!last) errors.lastName = "Enter last name.";
  if (!nextEmail) errors.email = "Enter email address.";
  else if (!nextEmail.includes("@")) errors.email = "Enter a valid email address.";
  if (!fields.sessionTime.trim()) {
    errors.sessionTime = "Enter session time in minutes.";
  } else if (
    !Number.isFinite(session) ||
    session < 1 ||
    !Number.isInteger(session)
  ) {
    errors.sessionTime =
      "Session time must be a whole number of at least 1 minute.";
  }

  return errors;
}

export default function EditProfileScreen() {
  const { doctor, refreshMe } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [sessionTime, setSessionTime] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!doctor) return;
    setFirstName(doctor.first_name || "");
    setLastName(doctor.last_name || "");
    setEmail(doctor.email || "");
    setSessionTime(String(doctor.session_time ?? ""));
  }, [doctor]);

  function clearFieldError(key: keyof FieldErrors) {
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  async function onSave() {
    const errors = validateProfile({
      firstName,
      lastName,
      email,
      sessionTime,
    });
    setFieldErrors(errors);
    setError(null);
    if (Object.keys(errors).length > 0) return;

    const first = firstName.trim();
    const last = lastName.trim();
    const nextEmail = email.trim().toLowerCase();
    const session = Number(sessionTime);

    setSaving(true);
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
        behavior="padding"
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
              onChangeText={(t) => {
                setFirstName(t);
                clearFieldError("firstName");
              }}
              placeholder="e.g. Hammad"
              autoCapitalize="words"
              autoCorrect={false}
              error={fieldErrors.firstName}
            />
            <Input
              label="Last name"
              value={lastName}
              onChangeText={(t) => {
                setLastName(t);
                clearFieldError("lastName");
              }}
              placeholder="e.g. Yousuf"
              autoCapitalize="words"
              autoCorrect={false}
              error={fieldErrors.lastName}
            />
            <Input
              label="Email"
              value={email}
              onChangeText={(t) => {
                setEmail(t);
                clearFieldError("email");
              }}
              placeholder="doctor@example.com"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
              error={fieldErrors.email}
            />
            <Input
              label="Session time (minutes)"
              value={sessionTime}
              onChangeText={(t) => {
                setSessionTime(t);
                clearFieldError("sessionTime");
              }}
              placeholder="15"
              keyboardType="number-pad"
              error={fieldErrors.sessionTime}
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
