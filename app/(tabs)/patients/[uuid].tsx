import { useCallback, useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { ClinicBackdrop } from "@/components/ClinicBackdrop";
import { LoadingState } from "@/components/LoadingState";
import { Badge, Button, Card, Empty, StatCard } from "@/components/ui";
import { api } from "@/lib/api";
import type { DoctorPatientDetail } from "@/lib/types";
import { formatDate, formatDateTime, formatTime, statusLabel, statusTone } from "@/lib/format";
import { useScreenData } from "@/lib/useScreenData";
import { useTheme } from "@/lib/theme";

export default function PatientDetailScreen() {
  const { uuid } = useLocalSearchParams<{ uuid: string }>();
  const router = useRouter();
  const { colors, fonts } = useTheme();
  const [patient, setPatient] = useState<DoctorPatientDetail | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [summaryDoc, setSummaryDoc] = useState<{
    title: string;
    body: string;
  } | null>(null);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: { flex: 1, backgroundColor: colors.bg },
        scroll: { flex: 1, zIndex: 1 },
        content: { padding: 16, gap: 12, paddingBottom: 32 },
        center: {
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
        },
        name: {
          color: colors.text,
          fontSize: 22,
          fontFamily: fonts.serifBold,
        },
        meta: {
          color: colors.muted,
          fontSize: 14,
          fontFamily: fonts.sans,
        },
        statsGrid: {
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 10,
        },
        section: {
          color: colors.text,
          fontSize: 17,
          fontFamily: fonts.sansBold,
        },
        subSection: {
          color: colors.text,
          fontSize: 14,
          fontFamily: fonts.sansBold,
          marginTop: 4,
        },
        noteText: {
          color: colors.muted,
          fontSize: 13,
          lineHeight: 18,
          fontFamily: fonts.sans,
        },
        docRow: {
          marginTop: 10,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          paddingVertical: 12,
          paddingHorizontal: 12,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surfaceAlt,
        },
        docIconWrap: {
          width: 40,
          height: 40,
          borderRadius: 10,
          backgroundColor: colors.primary + "18",
          alignItems: "center",
          justifyContent: "center",
        },
        docTitle: {
          color: colors.text,
          fontSize: 14,
          fontFamily: fonts.sansSemi,
        },
        docSubtitle: {
          color: colors.muted,
          fontSize: 12,
          fontFamily: fonts.sans,
          marginTop: 2,
        },
        visitCard: {
          backgroundColor: colors.surface,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: colors.border,
          padding: 14,
          gap: 4,
        },
        row: {
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        },
        token: {
          color: colors.primary,
          fontFamily: fonts.sansExtra,
          fontSize: 15,
        },
        link: {
          color: colors.primary,
          fontFamily: fonts.sansSemi,
          marginTop: 4,
        },
        tapHint: {
          color: colors.muted,
          fontSize: 12,
          marginTop: 4,
          fontFamily: fonts.sans,
        },
        rejectReason: {
          color: colors.danger,
          fontSize: 13,
          fontFamily: fonts.sans,
        },
        error: {
          color: colors.danger,
          fontFamily: fonts.sans,
        },
        modalWrap: {
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.45)",
          justifyContent: "flex-end",
        },
        modalCard: {
          backgroundColor: colors.surface,
          borderTopLeftRadius: 18,
          borderTopRightRadius: 18,
          paddingHorizontal: 18,
          paddingTop: 16,
          paddingBottom: 28,
          maxHeight: "85%",
          gap: 12,
        },
        modalTitle: {
          color: colors.text,
          fontSize: 18,
          fontFamily: fonts.sansBold,
        },
        modalBody: {
          color: colors.text,
          fontSize: 15,
          lineHeight: 22,
          fontFamily: fonts.sans,
        },
        modalHandle: {
          alignSelf: "center",
          width: 40,
          height: 4,
          borderRadius: 2,
          backgroundColor: colors.border,
          marginBottom: 4,
        },
      }),
    [colors, fonts],
  );

  const load = useCallback(async () => {
    if (!uuid) return;
    const data = await api.patient(uuid);
    setPatient(data);
  }, [uuid]);

  const { refreshing, loading, error, onRefresh } = useScreenData(load);

  return (
    <View style={styles.root}>
      <ClinicBackdrop />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={colors.primary}
            colors={[colors.primary]}
            onRefresh={onRefresh}
          />
        }
      >
        {loading && !refreshing && !patient ? (
          <LoadingState label="Loading patient report…" />
        ) : !patient ? (
          <View style={styles.center}>
            <Text style={styles.error}>{error || "Patient not found"}</Text>
          </View>
        ) : (
          <>
            <Card style={{ gap: 6 }}>
              <Text style={styles.name}>{patient.name}</Text>
              <Text style={styles.meta}>{patient.phone}</Text>
              <Button
                label="Book appointment"
                onPress={() =>
                  router.push({
                    pathname: "/(tabs)/appointments/book",
                    params: {
                      patientUuid: patient.uuid,
                      patientName: patient.name,
                      patientPhone: patient.phone,
                    },
                  })
                }
              />
            </Card>

            <View style={styles.statsGrid}>
              <StatCard
                label="Total visits"
                value={patient.total_visits}
                color={colors.success}
              />
              <StatCard
                label="Rejected"
                value={patient.rejected_count}
                color={colors.danger}
              />
              <StatCard
                label="Rejection rate"
                value={`${patient.rejection_rate}%`}
                color={colors.warning}
              />
              <StatCard
                label="All appointments"
                value={patient.total_appointments}
                color={colors.primary}
              />
            </View>

            {patient.last_visit_date ? (
              <Card style={{ gap: 8 }}>
                <Text style={styles.section}>Last visit</Text>
                <Text style={styles.meta}>
                  {formatDate(patient.last_visit_date)}
                </Text>
                {(() => {
                  const last = patient.visit_history.find(
                    (v) => v.status === "completed",
                  );
                  const media = last?.attachments || [];
                  if (!media.length) {
                    return (
                      <Text style={styles.meta}>No media on last visit.</Text>
                    );
                  }
                  return (
                    <Text style={styles.meta}>
                      {media.length} attachment
                      {media.length === 1 ? "" : "s"} (image / voice)
                    </Text>
                  );
                })()}
              </Card>
            ) : null}

            {patient.next_appointment ? (
              <Card style={{ gap: 6 }}>
                <Text style={styles.section}>Next appointment</Text>
                <Text style={styles.meta}>
                  {patient.next_appointment.token_code} ·{" "}
                  {formatDate(patient.next_appointment.token_date)} ·{" "}
                  {formatDateTime(patient.next_appointment.scheduled_at)}
                </Text>
                <Pressable
                  onPress={() =>
                    router.push(`/(tabs)/appointments/${patient.next_appointment!.id}`)
                  }
                >
                  <Text style={styles.link}>Open appointment →</Text>
                </Pressable>
              </Card>
            ) : null}

            <Text style={styles.section}>Visit history</Text>

            {patient.visit_history.length ? (
              patient.visit_history.map((visit) => {
                const expanded = expandedId === visit.id;
                const voiceSummaries = (visit.attachments || []).filter(
                  (att) => att.kind === "voice" && att.summary_text?.trim(),
                );
                return (
                  <Pressable
                    key={visit.id}
                    onPress={() => setExpandedId(expanded ? null : visit.id)}
                    style={styles.visitCard}
                  >
                    <View style={styles.row}>
                      <Text style={styles.token}>{visit.token_code}</Text>
                      <Badge
                        label={statusLabel(visit.status)}
                        tone={statusTone(visit.status)}
                      />
                    </View>
                    <Text style={styles.meta}>
                      {formatDate(visit.token_date)} ·{" "}
                      {formatDateTime(visit.scheduled_at)}
                    </Text>
                    {expanded ? (
                      <View style={{ gap: 6, marginTop: 8 }}>
                        {visit.attachments?.length ? (
                          <View>
                            <Text style={styles.subSection}>Media</Text>
                            {visit.attachments.map((att) => (
                              <Text key={att.id} style={styles.noteText}>
                                • {att.kind === "image" ? "Image" : "Voice note"}
                                {att.duration_seconds
                                  ? ` (${att.duration_seconds}s)`
                                  : ""}
                              </Text>
                            ))}
                            {voiceSummaries.map((att, index) => {
                              const summaryLabel =
                                voiceSummaries.length > 1
                                  ? `Voice summary ${index + 1}`
                                  : "Voice summary";
                              const docTitle = `${patient.name} · ${formatDate(visit.token_date)} · ${formatTime(visit.scheduled_at)} (${summaryLabel})`;
                              return (
                              <Pressable
                                key={`sum-${att.id}`}
                                style={styles.docRow}
                                onPress={(e) => {
                                  e.stopPropagation?.();
                                  setSummaryDoc({
                                    title: docTitle,
                                    body: att.summary_text!.trim(),
                                  });
                                }}
                              >
                                <View style={styles.docIconWrap}>
                                  <Ionicons
                                    name="document-text-outline"
                                    size={22}
                                    color={colors.primary}
                                  />
                                </View>
                                <View style={{ flex: 1 }}>
                                  <Text style={styles.docTitle} numberOfLines={2}>
                                    {docTitle}
                                  </Text>
                                  <Text style={styles.docSubtitle}>
                                    Tap to open
                                  </Text>
                                </View>
                                <Ionicons
                                  name="chevron-forward"
                                  size={18}
                                  color={colors.muted}
                                />
                              </Pressable>
                              );
                            })}
                          </View>
                        ) : (
                          <Text style={styles.meta}>No media attached.</Text>
                        )}
                        {visit.rejection_reason ? (
                          <Text style={styles.rejectReason}>
                            Rejection: {visit.rejection_reason}
                          </Text>
                        ) : null}
                        <Pressable
                          onPress={(e) => {
                            e.stopPropagation?.();
                            router.push(`/(tabs)/appointments/${visit.id}`);
                          }}
                        >
                          <Text style={styles.link}>Open full visit →</Text>
                        </Pressable>
                      </View>
                    ) : (
                      <Text style={styles.tapHint}>Tap to expand</Text>
                    )}
                  </Pressable>
                );
              })
            ) : (
              <Empty title="No visits yet" />
            )}

            {error ? <Text style={styles.error}>{error}</Text> : null}
          </>
        )}
      </ScrollView>

      <Modal
        visible={Boolean(summaryDoc)}
        animationType="slide"
        transparent
        onRequestClose={() => setSummaryDoc(null)}
      >
        <View style={styles.modalWrap}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setSummaryDoc(null)}
          />
          <View style={styles.modalCard}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>
              {summaryDoc?.title || "Voice summary"}
            </Text>
            <ScrollView
              style={{ maxHeight: 420 }}
              showsVerticalScrollIndicator
            >
              <Text style={styles.modalBody}>{summaryDoc?.body}</Text>
            </ScrollView>
            <Button
              label="Close"
              variant="secondary"
              onPress={() => setSummaryDoc(null)}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}
