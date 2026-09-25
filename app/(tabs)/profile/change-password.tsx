import { useState } from "react";
import {
  Alert,
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

export default function ChangePasswordScreen() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSave() {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("Fill in all password fields.");
      return;
    }
    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await api.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });
      Alert.alert("Password updated", "Use your new password next time you sign in.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not change password.");
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
          <Title>Change password</Title>
          <Subtitle>
            Enter your current password, then choose a new one (min 6 characters).
          </Subtitle>

          <View style={{ height: 20 }} />

          <Card style={{ gap: 14 }}>
            <Input
              label="Current password"
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry
              secureToggle
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="password"
            />
            <Input
              label="New password"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              secureToggle
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="newPassword"
            />
            <Input
              label="Confirm new password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              secureToggle
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="newPassword"
            />
            <ErrorText>{error}</ErrorText>
            <Button
              label={saving ? "Updating…" : "Update password"}
              onPress={onSave}
              loading={saving}
              disabled={saving}
            />
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
