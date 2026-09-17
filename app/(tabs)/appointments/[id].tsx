import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  useAudioPlayer,
  useAudioPlayerStatus,
  useAudioRecorder,
  useAudioRecorderState,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setIsAudioActiveAsync,
} from "expo-audio";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { ClinicBackdrop } from "@/components/ClinicBackdrop";
import { LoadingState } from "@/components/LoadingState";
import { Badge, Button, Card, ErrorText, TextArea } from "@/components/ui";
import { api } from "@/lib/api";
import type { Appointment, VisitAttachment } from "@/lib/types";
import { resolveMediaUrl } from "@/lib/mediaUrl";
import {
  formatDate,
  formatDateTime,
  formatDuration,
  formatTime,
  statusLabel,
  statusTone,
} from "@/lib/format";
import { useScreenData } from "@/lib/useScreenData";
import { useTheme } from "@/lib/theme";

function formatAudioMs(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function imageFileName(asset: ImagePicker.ImagePickerAsset) {
  const raw = asset.fileName?.trim();
  if (raw && /\.(jpe?g|png|webp)$/i.test(raw)) return raw;
  const fromUri = asset.uri.split("/").pop() || "";
  if (fromUri && /\.(jpe?g|png|webp)$/i.test(fromUri)) return fromUri;
  const ext =
    asset.mimeType?.includes("png")
      ? "png"
      : asset.mimeType?.includes("webp")
        ? "webp"
        : "jpg";
  return `photo.${ext}`;
}

function VoiceNotePlayer({
  attachment,
  colors,
  fonts,
}: {
  attachment: VisitAttachment;
  colors: { primary: string; text: string; muted: string; danger: string; border: string; surfaceAlt: string };
  fonts: { sansBold: string; sans: string };
}) {
  const uri = resolveMediaUrl(attachment.url);
  const player = useAudioPlayer(uri || "");
  const status = useAudioPlayerStatus(player);

  const playing = status.playing;
  const positionMs = status.currentTime * 1000;
  const durationMs =
    status.duration * 1000 || (attachment.duration_seconds || 0) * 1000;
  const progress =
    durationMs > 0 ? Math.min(1, Math.max(0, positionMs / durationMs)) : 0;

  async function toggle() {
    if (!uri) return;
    if (player.playing) {
      player.pause();
    } else {
      player.play();
    }
  }

  return (
    <View style={{ flex: 1, gap: 8 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Pressable
          onPress={toggle}
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: colors.primary,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name={playing ? "pause" : "play"} size={20} color="#fff" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: colors.text,
              fontFamily: fonts.sansBold,
              fontSize: 14,
            }}
          >
            Voice note
          </Text>
          <Text
            style={{
              color: colors.muted,
              fontFamily: fonts.sans,
              fontSize: 12,
              marginTop: 2,
            }}
          >
            {formatAudioMs(positionMs)} /{" "}
            {durationMs ? formatAudioMs(durationMs) : "--:--"}
          </Text>
        </View>
      </View>
      <View
        style={{
          height: 4,
          borderRadius: 2,
          backgroundColor: colors.border,
          overflow: "hidden",
        }}
      >
        <View
          style={{
            width: `${progress * 100}%`,
            height: "100%",
            backgroundColor: colors.primary,
          }}
        />
      </View>
    </View>
  );
}

function VoiceSummaryBlock({
  appointmentId,
  attachment,
  onUpdated,
  colors,
  fonts,
}: {
  appointmentId: number;
  attachment: VisitAttachment;
  onUpdated: (att: VisitAttachment) => void;
  colors: {
    primary: string;
    text: string;
    muted: string;
    danger: string;
    border: string;
    surface: string;
    surfaceAlt: string;
  };
  fonts: { sansBold: string; sans: string; sansSemi: string };
}) {
  const status = attachment.summary_status || "skipped";
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(attachment.summary_text || "");
  const [saving, setSaving] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [localError, setLocalError] = useState("");

  useEffect(() => {
    if (!editing) setDraft(attachment.summary_text || "");
  }, [attachment.summary_text, editing]);

  if (status === "skipped") return null;

  async function onSave() {
    setSaving(true);
    setLocalError("");
    try {
      const updated = await api.updateAttachmentSummary(
        appointmentId,
        attachment.id,
        { summary_text: draft },
      );
      onUpdated(updated);
      setEditing(false);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function onRetry() {
    setRetrying(true);
    setLocalError("");
    try {
      const updated = await api.regenerateAttachmentSummary(
        appointmentId,
        attachment.id,
      );
      onUpdated(updated);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Retry failed");
    } finally {
      setRetrying(false);
    }
  }

  const statusLabelText =
    status === "pending"
      ? "Generating Roman Urdu summary…"
      : status === "failed"
        ? "Summary failed"
        : "Voice summary (Roman Urdu)";

  return (
    <View style={{ marginTop: 10, gap: 8 }}>
      <Text
        style={{
          color: colors.muted,
          fontFamily: fonts.sansSemi,
          fontSize: 12,
          textTransform: "uppercase",
          letterSpacing: 0.4,
        }}
      >
        {statusLabelText}
      </Text>

      {status === "pending" ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={{ color: colors.muted, fontFamily: fonts.sans, fontSize: 13 }}>
            Please wait…
          </Text>
        </View>
      ) : null}

      {status === "failed" ? (
        <View style={{ gap: 8 }}>
          <Text style={{ color: colors.danger, fontFamily: fonts.sans, fontSize: 13 }}>
            {attachment.summary_error || "Could not generate summary."}
          </Text>
          <Button
            label="Retry summary"
            onPress={onRetry}
            loading={retrying}
            variant="secondary"
          />
        </View>
      ) : null}

      {status === "ready" || (status === "failed" && attachment.summary_text) ? (
        <View style={{ gap: 8 }}>
          <Text
            style={{
              color: colors.text,
              fontFamily: fonts.sans,
              fontSize: 14,
              lineHeight: 20,
            }}
          >
            {attachment.summary_text?.trim() || "—"}
          </Text>
          <Pressable
            onPress={() => {
              setDraft(attachment.summary_text || "");
              setLocalError("");
              setEditing(true);
            }}
            hitSlop={8}
          >
            <Text
              style={{
                color: colors.primary,
                fontFamily: fonts.sansSemi,
                fontSize: 14,
              }}
            >
              Edit summary
            </Text>
          </Pressable>
        </View>
      ) : null}

      {localError && !editing ? (
        <Text style={{ color: colors.danger, fontFamily: fonts.sans, fontSize: 12 }}>
          {localError}
        </Text>
      ) : null}

      <Modal
        visible={editing}
        animationType="slide"
        transparent
        onRequestClose={() => {
          if (saving) return;
          setEditing(false);
          setDraft(attachment.summary_text || "");
          setLocalError("");
        }}
      >
        <KeyboardAvoidingView
          style={{ flex: 1, justifyContent: "flex-end" }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <Pressable
            style={{
              ...StyleSheet.absoluteFillObject,
              backgroundColor: "rgba(0,0,0,0.45)",
            }}
            onPress={() => {
              if (saving) return;
              setEditing(false);
              setDraft(attachment.summary_text || "");
              setLocalError("");
            }}
          />
          <View
            style={{
              backgroundColor: colors.surface,
              borderTopLeftRadius: 18,
              borderTopRightRadius: 18,
              paddingHorizontal: 18,
              paddingTop: 14,
              paddingBottom: 28,
              maxHeight: "88%",
              gap: 12,
              borderTopWidth: 1,
              borderColor: colors.border,
            }}
          >
            <View
              style={{
                alignSelf: "center",
                width: 40,
                height: 4,
                borderRadius: 2,
                backgroundColor: colors.border,
              }}
            />
            <Text
              style={{
                color: colors.text,
                fontFamily: fonts.sansBold,
                fontSize: 17,
              }}
            >
              Edit voice summary
            </Text>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              showsVerticalScrollIndicator={false}
            >
              <TextArea
                label="Roman Urdu summary"
                value={draft}
                onChangeText={setDraft}
                placeholder="Roman Urdu summary…"
                autoFocus
              />
              {localError ? (
                <Text
                  style={{
                    color: colors.danger,
                    fontFamily: fonts.sans,
                    fontSize: 12,
                    marginTop: 8,
                  }}
                >
                  {localError}
                </Text>
              ) : null}
              <View style={{ height: 14 }} />
              <Button label="Save" onPress={onSave} loading={saving} />
              <View style={{ height: 10 }} />
              <Button
                label="Cancel"
                variant="secondary"
                disabled={saving}
                onPress={() => {
                  setEditing(false);
                  setDraft(attachment.summary_text || "");
                  setLocalError("");
                }}
              />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

export default function AppointmentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const appointmentId = Number(id);
  const { colors, fonts } = useTheme();

  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(audioRecorder);

  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [attachments, setAttachments] = useState<VisitAttachment[]>([]);
  const [rejectionReason, setRejectionReason] = useState("");
  const [statusBusy, setStatusBusy] = useState<null | "complete" | "reject">(
    null,
  );
  const [timingLoading, setTimingLoading] = useState(false);
  const [mediaBusy, setMediaBusy] = useState<
    null | "camera" | "gallery" | "voice"
  >(null);
  const [deleteBusyId, setDeleteBusyId] = useState<number | null>(null);
  const [nowTick, setNowTick] = useState(() => Date.now());

  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: { flex: 1, backgroundColor: colors.bg },
        scroll: { flex: 1, zIndex: 1 },
        content: { padding: 16, gap: 12, paddingBottom: 32 },
        row: {
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        },
        token: {
          color: colors.primary,
          fontFamily: fonts.sansExtra,
          fontSize: 18,
        },
        name: {
          color: colors.text,
          fontSize: 18,
          fontFamily: fonts.sansBold,
        },
        meta: {
          color: colors.muted,
          fontSize: 14,
          fontFamily: fonts.sans,
        },
        link: {
          color: colors.primary,
          fontFamily: fonts.sansSemi,
          marginTop: 6,
        },
        section: {
          color: colors.text,
          fontSize: 17,
          fontFamily: fonts.sansBold,
          marginTop: 8,
        },
        hint: {
          color: colors.muted,
          fontSize: 13,
          fontFamily: fonts.sans,
          lineHeight: 18,
        },
        actions: { gap: 10, marginTop: 8 },
        photoRow: {
          flexDirection: "row",
          gap: 10,
        },
        photoBtn: {
          flex: 1,
        },
        timingLabel: {
          color: colors.muted,
          fontSize: 12,
          fontFamily: fonts.sansSemi,
          textTransform: "uppercase",
          letterSpacing: 0.5,
        },
        timingValue: {
          color: colors.text,
          fontSize: 16,
          fontFamily: fonts.sansBold,
          marginTop: 2,
        },
        duration: {
          color: colors.primary,
          fontSize: 28,
          fontFamily: fonts.sansExtra,
          letterSpacing: -0.5,
        },
        mediaRow: {
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
        },
        thumb: {
          width: 64,
          height: 64,
          borderRadius: 10,
          backgroundColor: colors.surfaceAlt,
        },
        mediaTitle: {
          color: colors.text,
          fontFamily: fonts.sansSemi,
          fontSize: 14,
          flex: 1,
        },
        mediaMeta: {
          color: colors.muted,
          fontSize: 12,
          fontFamily: fonts.sans,
        },
        voiceCard: {
          gap: 14,
          alignItems: "center",
          paddingVertical: 8,
        },
        micBtn: {
          width: 72,
          height: 72,
          borderRadius: 36,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.primary,
        },
        micBtnRecording: {
          backgroundColor: colors.danger,
        },
        micPulse: {
          position: "absolute",
          width: 88,
          height: 88,
          borderRadius: 44,
          backgroundColor: "rgba(185, 28, 28, 0.18)",
        },
        voiceTitle: {
          color: colors.text,
          fontFamily: fonts.sansBold,
          fontSize: 16,
        },
        voiceTimer: {
          color: colors.danger,
          fontFamily: fonts.sansExtra,
          fontSize: 28,
          letterSpacing: -0.5,
        },
        voiceHint: {
          color: colors.muted,
          fontFamily: fonts.sans,
          fontSize: 13,
          textAlign: "center",
        },
        voiceActions: {
          flexDirection: "row",
          gap: 10,
          width: "100%",
        },
      }),
    [colors, fonts],
  );

  const load = useCallback(async () => {
    if (!appointmentId) return;
    const data = await api.appointment(appointmentId);
    setAppointment(data);
    setAttachments(data.attachments || []);
    setRejectionReason(data.rejection_reason || "");
  }, [appointmentId]);

  const { refreshing, loading, error, setError, onRefresh } = useScreenData(load);

  const hasPendingSummary = useMemo(
    () =>
      attachments.some(
        (a) => a.kind === "voice" && a.summary_status === "pending",
      ),
    [attachments],
  );

  useEffect(() => {
    if (!hasPendingSummary || !appointmentId) return;
    let cancelled = false;
    const timer = setInterval(async () => {
      try {
        const data = await api.appointment(appointmentId);
        if (cancelled) return;
        setAttachments(data.attachments || []);
      } catch {
        // ignore transient poll errors
      }
    }, 2500);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [hasPendingSummary, appointmentId]);

  const visitInProgress = Boolean(
    appointment?.visit_started_at && !appointment?.visit_ended_at,
  );
  const visitEnded = Boolean(
    appointment?.visit_started_at && appointment?.visit_ended_at,
  );
  const isEditable = appointment?.status === "upcoming";
  const canStart = isEditable && !appointment?.visit_started_at;
  const canEnd = isEditable && visitInProgress;
  const canAttach =
    visitEnded &&
    (appointment?.status === "upcoming" || appointment?.status === "completed");

  useEffect(() => {
    if (!visitInProgress) return;
    const timer = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [visitInProgress]);

  const liveDurationSeconds = useMemo(() => {
    if (!appointment?.visit_started_at) return null;
    const start = new Date(appointment.visit_started_at).getTime();
    const end = appointment.visit_ended_at
      ? new Date(appointment.visit_ended_at).getTime()
      : nowTick;
    return Math.max(0, Math.floor((end - start) / 1000));
  }, [appointment?.visit_started_at, appointment?.visit_ended_at, nowTick]);

  async function onStartVisit() {
    setTimingLoading(true);
    setError("");
    try {
      const updated = await api.startVisit(appointmentId);
      setAppointment(updated);
      setAttachments(updated.attachments || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start visit");
    } finally {
      setTimingLoading(false);
    }
  }

  async function onEndVisit() {
    setTimingLoading(true);
    setError("");
    try {
      const updated = await api.endVisit(appointmentId);
      setAppointment(updated);
      setAttachments(updated.attachments || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to end visit");
    } finally {
      setTimingLoading(false);
    }
  }

  async function onComplete() {
    setStatusBusy("complete");
    setError("");
    try {
      const updated = await api.updateAppointmentStatus(appointmentId, {
        status: "completed",
      });
      setAppointment(updated);
      setAttachments(updated.attachments || []);
      Alert.alert("Done", "Visit completed. Media sent to the patient.");
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to complete visit");
    } finally {
      setStatusBusy(null);
    }
  }

  function onReject() {
    Alert.alert(
      "Reject visit",
      "Mark this appointment as rejected? You can add an optional reason.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reject",
          style: "destructive",
          onPress: async () => {
            setStatusBusy("reject");
            setError("");
            try {
              const updated = await api.updateAppointmentStatus(appointmentId, {
                status: "rejected",
                rejection_reason: rejectionReason,
              });
              setAppointment(updated);
              Alert.alert("Rejected", "Appointment marked as rejected.");
              router.back();
            } catch (e) {
              setError(
                e instanceof Error ? e.message : "Failed to reject appointment",
              );
            } finally {
              setStatusBusy(null);
            }
          },
        },
      ],
    );
  }

  async function pickImage(fromCamera: boolean) {
    setError("");
    const busyKey = fromCamera ? "camera" : "gallery";
    try {
      if (fromCamera) {
        const cam = await ImagePicker.requestCameraPermissionsAsync();
        if (!cam.granted) {
          Alert.alert(
            "Camera permission needed",
            "Allow camera access in Settings so you can take visit photos.",
          );
          return;
        }
        if (Platform.OS === "android") {
          const lib = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (!lib.granted) {
            Alert.alert(
              "Photos permission needed",
              "Allow photo library access so visit images can be saved and uploaded.",
            );
            return;
          }
        }
      } else {
        const lib = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!lib.granted) {
          Alert.alert(
            "Gallery permission needed",
            "Allow photo library access in Settings to attach images.",
          );
          return;
        }
      }

      const result = fromCamera
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ["images"],
            allowsEditing: false,
            quality: 0.7,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"],
            allowsEditing: false,
            quality: 0.7,
          });

      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      setMediaBusy(busyKey);
      try {
        const att = await api.uploadAttachment(appointmentId, {
          kind: "image",
          uri: asset.uri,
          name: imageFileName(asset),
          mimeType: asset.mimeType || "image/jpeg",
        });
        setAttachments((prev) => [...prev, att]);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Image upload failed");
      } finally {
        setMediaBusy(null);
      }
    } catch (e) {
      setMediaBusy(null);
      setError(
        e instanceof Error
          ? e.message
          : fromCamera
            ? "Could not open the camera."
            : "Could not open the gallery.",
      );
    }
  }

  async function startRecording() {
    setError("");
    try {
      const perm = await requestRecordingPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          "Microphone permission needed",
          "Allow microphone access in Settings to record voice notes.",
        );
        return;
      }
      await setIsAudioActiveAsync(true);
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start recording");
    }
  }

  async function cancelRecording() {
    setError("");
    try {
      if (audioRecorder.isRecording) {
        await audioRecorder.stop();
      }
    } catch {
      // Ignore cancel errors — recording may already be stopped.
    }
  }

  async function stopRecordingAndUpload() {
    if (!audioRecorder.isRecording) return;
    setMediaBusy("voice");
    setError("");
    try {
      const durationSec = Math.max(
        1,
        Math.round((recorderState.durationMillis || 0) / 1000),
      );
      await audioRecorder.stop();
      const uri = audioRecorder.uri;
      if (!uri) throw new Error("No recording file created.");
      const att = await api.uploadAttachment(appointmentId, {
        kind: "voice",
        uri,
        name: "voice.m4a",
        mimeType: "audio/m4a",
        durationSeconds: durationSec,
      });
      setAttachments((prev) => [...prev, att]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Voice upload failed");
    } finally {
      setMediaBusy(null);
    }
  }

  function onDeleteAttachment(att: VisitAttachment) {
    Alert.alert("Delete attachment", `Remove this ${att.kind}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setDeleteBusyId(att.id);
          setError("");
          try {
            await api.deleteAttachment(appointmentId, att.id);
            setAttachments((prev) => prev.filter((a) => a.id !== att.id));
          } catch (e) {
            setError(e instanceof Error ? e.message : "Delete failed");
          } finally {
            setDeleteBusyId(null);
          }
        },
      },
    ]);
  }

  const isRecording = Boolean(audioRecorder.isRecording);
  const recordSeconds = Math.floor((recorderState.durationMillis || 0) / 1000);
  const mediaBusyAny = mediaBusy != null;
  const voiceUploading = mediaBusy === "voice";
  const statusBusyAny = statusBusy != null;
  const deleteBusyAny = deleteBusyId != null;

  return (
    <View style={styles.root}>
      <ClinicBackdrop />
      <KeyboardAvoidingView
        style={{ flex: 1, zIndex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              tintColor={colors.primary}
              colors={[colors.primary]}
              onRefresh={onRefresh}
            />
          }
        >
          {loading && !refreshing && !appointment ? (
            <LoadingState label="Loading visit…" />
          ) : (
            <>
              {appointment ? (
                <Card style={{ gap: 8 }}>
                  <View style={styles.row}>
                    <Text style={styles.token}>{appointment.token_code}</Text>
                    <Badge
                      label={statusLabel(appointment.status)}
                      tone={statusTone(appointment.status)}
                    />
                  </View>
                  <Text style={styles.name}>{appointment.patient_name}</Text>
                  <Text style={styles.meta}>{appointment.patient_phone}</Text>
                  <Text style={styles.meta}>
                    {formatDate(appointment.token_date)} ·{" "}
                    {formatDateTime(appointment.scheduled_at)}
                  </Text>
                  {appointment.patient_uuid ? (
                    <Pressable
                      onPress={() =>
                        router.push(
                          `/(tabs)/patients/${appointment.patient_uuid}`,
                        )
                      }
                    >
                      <Text style={styles.link}>View patient history →</Text>
                    </Pressable>
                  ) : null}
                </Card>
              ) : null}

              {appointment ? (
                <Card style={{ gap: 12 }}>
                  <Text style={[styles.section, { marginTop: 0 }]}>
                    Visit timing
                  </Text>
                  <Text style={styles.hint}>
                    Tap Start when you begin seeing the patient, then End when
                    the consultation finishes.
                  </Text>

                  <View style={styles.row}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.timingLabel}>Start time</Text>
                      <Text style={styles.timingValue}>
                        {appointment.visit_started_at
                          ? formatTime(appointment.visit_started_at)
                          : "—"}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.timingLabel}>End time</Text>
                      <Text style={styles.timingValue}>
                        {appointment.visit_ended_at
                          ? formatTime(appointment.visit_ended_at)
                          : "—"}
                      </Text>
                    </View>
                  </View>

                  {liveDurationSeconds != null ? (
                    <View>
                      <Text style={styles.timingLabel}>
                        {visitInProgress ? "Elapsed" : "Duration"}
                      </Text>
                      <Text style={styles.duration}>
                        {formatDuration(liveDurationSeconds)}
                      </Text>
                    </View>
                  ) : null}

                  {canStart || canEnd ? (
                    <View style={styles.actions}>
                      {canStart ? (
                        <Button
                          label="Start visit"
                          onPress={onStartVisit}
                          loading={timingLoading}
                        />
                      ) : null}
                      {canEnd ? (
                        <Button
                          label="End visit"
                          variant="secondary"
                          onPress={onEndVisit}
                          loading={timingLoading}
                        />
                      ) : null}
                    </View>
                  ) : null}
                </Card>
              ) : null}

              <Text style={styles.section}>Patient media</Text>
              {canAttach ? (
                <Text style={styles.hint}>
                  Add photos or a voice note before you complete the visit.
                  Patients see them in the app and on WhatsApp.
                </Text>
              ) : (
                <Text style={styles.hint}>
                  End the visit to attach photos or voice notes.
                </Text>
              )}

              {canAttach ? (
                <View style={styles.actions}>
                  <View style={styles.photoRow}>
                    <View style={styles.photoBtn}>
                      <Button
                        label="Take photo"
                        variant="secondary"
                        loading={mediaBusy === "camera"}
                        onPress={() => pickImage(true)}
                        disabled={mediaBusyAny || isRecording || deleteBusyAny}
                      />
                    </View>
                    <View style={styles.photoBtn}>
                      <Button
                        label="Choose image"
                        variant="secondary"
                        loading={mediaBusy === "gallery"}
                        onPress={() => pickImage(false)}
                        disabled={mediaBusyAny || isRecording || deleteBusyAny}
                      />
                    </View>
                  </View>

                  <Card>
                    <View style={styles.voiceCard}>
                      {isRecording ? (
                        <View
                          style={{
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <View style={styles.micPulse} />
                          <Pressable
                            onPress={stopRecordingAndUpload}
                            disabled={voiceUploading}
                            style={[styles.micBtn, styles.micBtnRecording]}
                          >
                            {voiceUploading ? (
                              <ActivityIndicator color="#fff" />
                            ) : (
                              <Ionicons name="stop" size={28} color="#fff" />
                            )}
                          </Pressable>
                        </View>
                      ) : (
                        <Pressable
                          onPress={startRecording}
                          disabled={mediaBusyAny || deleteBusyAny}
                          style={styles.micBtn}
                        >
                          <Ionicons name="mic" size={30} color="#fff" />
                        </Pressable>
                      )}

                      <Text style={styles.voiceTitle}>
                        {isRecording
                          ? "Recording…"
                          : voiceUploading
                            ? "Uploading voice note…"
                            : "Voice note"}
                      </Text>

                      {isRecording ? (
                        <Text style={styles.voiceTimer}>
                          {formatAudioMs(recordSeconds * 1000)}
                        </Text>
                      ) : (
                        <Text style={styles.voiceHint}>Tap the mic to record</Text>
                      )}

                      {isRecording ? (
                        <View style={styles.voiceActions}>
                          <View style={{ flex: 1 }}>
                            <Button
                              label="Cancel"
                              variant="secondary"
                              onPress={cancelRecording}
                              disabled={voiceUploading}
                            />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Button
                              label="Stop & upload"
                              loading={voiceUploading}
                              onPress={stopRecordingAndUpload}
                            />
                          </View>
                        </View>
                      ) : null}
                    </View>
                  </Card>
                </View>
              ) : null}

              {attachments.length ? (
                <View style={{ gap: 10 }}>
                  {attachments.map((att) => (
                    <Card key={att.id}>
                      <View style={styles.mediaRow}>
                        {att.kind === "image" ? (
                          <>
                            <Image
                              source={{ uri: resolveMediaUrl(att.url) }}
                              style={styles.thumb}
                            />
                            <View style={{ flex: 1 }}>
                              <Text style={styles.mediaTitle}>Image</Text>
                              <Text style={styles.mediaMeta}>
                                {att.original_name || att.mime_type}
                              </Text>
                            </View>
                          </>
                        ) : (
                          <VoiceNotePlayer
                            attachment={att}
                            colors={colors}
                            fonts={fonts}
                          />
                        )}
                        {canAttach ? (
                          deleteBusyId === att.id ? (
                            <ActivityIndicator color={colors.danger} />
                          ) : (
                            <Pressable
                              onPress={() => onDeleteAttachment(att)}
                              disabled={deleteBusyAny || mediaBusyAny}
                              hitSlop={10}
                              style={{ padding: 6 }}
                            >
                              <Ionicons
                                name="trash-outline"
                                size={22}
                                color={
                                  deleteBusyAny || mediaBusyAny
                                    ? colors.muted
                                    : colors.danger
                                }
                              />
                            </Pressable>
                          )
                        ) : null}
                      </View>
                      {att.kind === "voice" ? (
                        <VoiceSummaryBlock
                          appointmentId={appointmentId}
                          attachment={att}
                          colors={colors}
                          fonts={fonts}
                          onUpdated={(updated) =>
                            setAttachments((prev) =>
                              prev.map((a) =>
                                a.id === updated.id ? updated : a,
                              ),
                            )
                          }
                        />
                      ) : null}
                    </Card>
                  ))}
                </View>
              ) : canAttach ? (
                <Card>
                  <Text style={styles.hint}>No media attached yet.</Text>
                </Card>
              ) : null}

              {isEditable ? (
                <>
                  <TextArea
                    label="Rejection reason (optional)"
                    value={rejectionReason}
                    onChangeText={setRejectionReason}
                    placeholder="No-show, declined consultation..."
                  />
                  <View style={styles.actions}>
                    <Button
                      label="Complete visit"
                      onPress={onComplete}
                      loading={statusBusy === "complete"}
                      disabled={statusBusyAny || mediaBusyAny || deleteBusyAny}
                    />
                    <Button
                      label="Reject"
                      variant="danger"
                      onPress={onReject}
                      loading={statusBusy === "reject"}
                      disabled={statusBusyAny || mediaBusyAny || deleteBusyAny}
                    />
                  </View>
                </>
              ) : null}

              <ErrorText>{error}</ErrorText>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
