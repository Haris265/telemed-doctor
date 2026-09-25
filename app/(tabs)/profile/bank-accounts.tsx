import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";

import { LoadingState } from "@/components/LoadingState";
import {
  Button,
  Card,
  ErrorText,
  IconButton,
  Input,
  Screen,
  Subtitle,
  Title,
  useThemedStyles,
} from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import type { DoctorBankAccount } from "@/lib/types";
type FormState = {
  bank_name: string;
  account_title: string;
  account_number: string;
  iban: string;
  is_primary: boolean;
};

function makeEmptyForm(isPrimary: boolean): FormState {
  return {
    bank_name: "",
    account_title: "",
    account_number: "",
    iban: "",
    is_primary: isPrimary,
  };
}

function isFormIdle(form: FormState) {
  return (
    !form.bank_name &&
    !form.account_title &&
    !form.account_number &&
    !form.iban
  );
}

export default function BankAccountsScreen() {
  const { refreshMe } = useAuth();
  const { colors } = useTheme();
  const [accounts, setAccounts] = useState<DoctorBankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(() => makeEmptyForm(true));
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const styles = useThemedStyles((c, f) => ({
    label: {
      color: c.muted,
      fontSize: 12,
      fontFamily: f.sansBold,
      textTransform: "uppercase" as const,
      letterSpacing: 0.6,
    },
    value: {
      color: c.text,
      fontSize: 15,
      fontFamily: f.sansSemi,
    },
    badge: {
      alignSelf: "flex-start" as const,
      backgroundColor: c.primary + "22",
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
      marginBottom: 6,
    },
    badgeText: {
      color: c.primary,
      fontSize: 11,
      fontFamily: f.sansBold,
    },
    rowGap: { gap: 4 },
    error: {
      color: c.danger,
      marginBottom: 12,
      fontFamily: f.sans,
    },
    toggleRow: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "space-between" as const,
      gap: 12,
    },
    toggleLabel: {
      color: c.text,
      fontFamily: f.sansSemi,
      fontSize: 15,
      flex: 1,
    },
    cardHeader: {
      flexDirection: "row" as const,
      alignItems: "flex-start" as const,
      justifyContent: "space-between" as const,
      gap: 8,
      minHeight: 40,
    },
    cardHeaderLeft: {
      flex: 1,
      gap: 4,
    },
    cardActions: {
      flexDirection: "row" as const,
      gap: 8,
    },
    formTitleRow: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "space-between" as const,
      gap: 8,
    },
    yesNoGroup: {
      flexDirection: "row" as const,
      gap: 8,
    },
    yesNoBtn: {
      minWidth: 56,
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surfaceAlt,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    yesNoBtnActive: {
      borderColor: c.primary,
      backgroundColor: c.primary,
    },
    yesNoText: {
      color: c.text,
      fontFamily: f.sansBold,
      fontSize: 14,
    },
    yesNoTextActive: {
      color: "#ffffff",
    },
  }));

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const list = await api.bankAccounts();
      setAccounts(list);
      if (!isRefresh) {
        setForm((prev) =>
          isFormIdle(prev) ? makeEmptyForm(list.length === 0) : prev,
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load bank accounts.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function startEdit(account: DoctorBankAccount) {
    setEditingId(account.id);
    setForm({
      bank_name: account.bank_name,
      account_title: account.account_title,
      account_number: account.account_number,
      iban: account.iban || "",
      is_primary: account.is_primary,
    });
    setFormError(null);
  }

  function resetForm(remainingCount = accounts.length) {
    setEditingId(null);
    setForm(makeEmptyForm(remainingCount === 0));
    setFormError(null);
  }

  async function onSave() {
    const bank_name = form.bank_name.trim();
    const account_title = form.account_title.trim();
    const account_number = form.account_number.trim();
    const iban = form.iban.trim();
    if (!bank_name || !account_title || !account_number) {
      setFormError("Bank name, account title, and account number are required.");
      return;
    }
    setSaving(true);
    setFormError(null);
    const wasEdit = editingId != null;
    try {
      const payload = {
        bank_name,
        account_title,
        account_number,
        iban,
        is_primary: form.is_primary,
        is_active: true,
      };
      if (editingId != null) {
        await api.updateBankAccount(editingId, payload);
      } else {
        await api.createBankAccount(payload);
      }
      resetForm(wasEdit ? accounts.length : accounts.length + 1);
      await load();
      await refreshMe();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Could not save bank account.");
    } finally {
      setSaving(false);
    }
  }

  function onDelete(account: DoctorBankAccount) {
    Alert.alert(
      "Delete bank account",
      `Remove ${account.bank_name} · ${account.account_number}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await api.deleteBankAccount(account.id);
              if (editingId === account.id) {
                resetForm(Math.max(0, accounts.length - 1));
              }
              await load();
              await refreshMe();
            } catch (e) {
              Alert.alert(
                "Delete failed",
                e instanceof Error ? e.message : "Please try again.",
              );
            }
          },
        },
      ],
    );
  }

  return (
    <Screen>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior="padding"
        keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
      >
        <ScrollView
          contentContainerStyle={{ paddingBottom: 48 }}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              tintColor={colors.primary}
              colors={[colors.primary]}
              onRefresh={() => void load(true)}
            />
          }
        >
          <Title>Bank accounts</Title>
          <Subtitle>
            Patients use these accounts for WhatsApp bank-transfer bookings.
            Set a consultation fee on Edit profile too.
          </Subtitle>

          <View style={{ height: 20 }} />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          {loading && !refreshing ? (
            <LoadingState label="Loading bank accounts…" />
          ) : accounts.length === 0 ? (
            <Card>
              <Text style={styles.value}>No bank accounts yet. Add one below.</Text>
            </Card>
          ) : (
            accounts.map((account) => (
              <Card key={account.id} style={{ gap: 8, marginBottom: 12 }}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardHeaderLeft}>
                    {account.is_primary ? (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>Primary</Text>
                      </View>
                    ) : (
                      <Text style={styles.label}>Bank</Text>
                    )}
                    <Text style={styles.value}>{account.bank_name}</Text>
                  </View>
                  <View style={styles.cardActions}>
                    <IconButton
                      name="create-outline"
                      accessibilityLabel="Edit bank account"
                      onPress={() => startEdit(account)}
                    />
                    <IconButton
                      name="trash-outline"
                      accessibilityLabel="Delete bank account"
                      variant="danger"
                      onPress={() => onDelete(account)}
                    />
                  </View>
                </View>
                <View style={styles.rowGap}>
                  <Text style={styles.label}>Title</Text>
                  <Text style={styles.value}>{account.account_title}</Text>
                </View>
                <View style={styles.rowGap}>
                  <Text style={styles.label}>Account number</Text>
                  <Text style={styles.value}>{account.account_number}</Text>
                </View>
                {account.iban ? (
                  <View style={styles.rowGap}>
                    <Text style={styles.label}>IBAN</Text>
                    <Text style={styles.value}>{account.iban}</Text>
                  </View>
                ) : null}
              </Card>
            ))
          )}

          <View style={{ height: 12 }} />

          <Card style={{ gap: 14 }}>
            <View style={styles.formTitleRow}>
              <Text style={[styles.value, { flex: 1 }]}>
                {editingId != null ? "Edit bank account" : "Add bank account"}
              </Text>
              {editingId != null ? (
                <IconButton
                  name="close"
                  accessibilityLabel="Cancel edit"
                  onPress={resetForm}
                  disabled={saving}
                />
              ) : null}
            </View>
            <Input
              label="Bank name"
              value={form.bank_name}
              onChangeText={(t) => setForm((p) => ({ ...p, bank_name: t }))}
              placeholder="e.g. HBL"
              autoCapitalize="words"
            />
            <Input
              label="Account title"
              value={form.account_title}
              onChangeText={(t) => setForm((p) => ({ ...p, account_title: t }))}
              placeholder="e.g. Dr. Hammad Yousuf"
              autoCapitalize="words"
            />
            <Input
              label="Account number"
              value={form.account_number}
              onChangeText={(t) => setForm((p) => ({ ...p, account_number: t }))}
              placeholder="Account number"
              keyboardType="number-pad"
            />
            <Input
              label="IBAN (optional)"
              value={form.iban}
              onChangeText={(t) => setForm((p) => ({ ...p, iban: t }))}
              placeholder="PK…"
              autoCapitalize="characters"
            />
            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>Primary account</Text>
              <View style={styles.yesNoGroup}>
                <Pressable
                  onPress={() => setForm((p) => ({ ...p, is_primary: true }))}
                  style={[
                    styles.yesNoBtn,
                    form.is_primary && styles.yesNoBtnActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.yesNoText,
                      form.is_primary && styles.yesNoTextActive,
                    ]}
                  >
                    Yes
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setForm((p) => ({ ...p, is_primary: false }))}
                  style={[
                    styles.yesNoBtn,
                    !form.is_primary && styles.yesNoBtnActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.yesNoText,
                      !form.is_primary && styles.yesNoTextActive,
                    ]}
                  >
                    No
                  </Text>
                </Pressable>
              </View>
            </View>
            <ErrorText>{formError}</ErrorText>
            <Button
              label={
                saving
                  ? "Saving…"
                  : editingId != null
                    ? "Update account"
                    : "Add account"
              }
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
