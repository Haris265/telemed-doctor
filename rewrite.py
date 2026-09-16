import re

with open("app/appointment/[id].tsx", "r") as f:
    content = f.read()

# Replace imports
content = content.replace('import { Audio } from "expo-av";', 'import { useAudioPlayer, useAudioPlayerStatus, useAudioRecorder, useAudioRecorderState, RecordingPresets, requestRecordingPermissionsAsync, setIsAudioActiveAsync } from "expo-audio";')

# Rewrite VoiceNotePlayer
old_vnp = """function VoiceNotePlayer({
  attachment,
  colors,
  fonts,
}: {
  attachment: VisitAttachment;
  colors: { primary: string; text: string; muted: string; danger: string };
  fonts: { sansBold: string; sans: string };
}) {
  const uri = resolveMediaUrl(attachment.url);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [positionMs, setPositionMs] = useState(0);
  const [durationMs, setDurationMs] = useState(
    (attachment.duration_seconds || 0) * 1000,
  );
  const isMounted = useRef(true);

  useEffect(() => {
    return () => {
      isMounted.current = false;
      sound?.unloadAsync().catch(() => undefined);
    };
  }, [sound]);

  async function toggle() {
    if (!uri) {
      setError("Audio unavailable.");
      return;
    }
    setError("");
    try {
      if (playing && sound) {
        await sound.pauseAsync();
        setPlaying(false);
        return;
      }
      if (sound) {
        await sound.playAsync();
        setPlaying(true);
        return;
      }
      setLoading(true);
      // Stop recording mode so playback works reliably.
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });
      const { sound: created } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true },
        (status) => {
          if (!status.isLoaded) return;
          setPositionMs(status.positionMillis || 0);
          if (status.durationMillis) setDurationMs(status.durationMillis);
          if (status.didJustFinish) {
            setPlaying(false);
            setPositionMs(0);
          }
        },
      );
      if (!isMounted.current) {
        created.unloadAsync().catch(() => undefined);
        return;
      }
      setSound(created);
      setPlaying(true);
    } catch (e) {
      if (isMounted.current) {
        setError(e instanceof Error ? e.message : "Could not play");
        setPlaying(false);
      }
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }"""

new_vnp = """function VoiceNotePlayer({
  attachment,
  colors,
  fonts,
}: {
  attachment: VisitAttachment;
  colors: { primary: string; text: string; muted: string; danger: string };
  fonts: { sansBold: string; sans: string };
}) {
  const uri = resolveMediaUrl(attachment.url);
  const player = useAudioPlayer(uri || "");
  const status = useAudioPlayerStatus(player);
  
  const playing = status.playing;
  const loading = false;
  const error = "";
  
  const positionMs = status.currentTime * 1000;
  const durationMs = status.duration * 1000 || (attachment.duration_seconds || 0) * 1000;

  async function toggle() {
    if (!uri) return;
    if (player.playing) {
      player.pause();
    } else {
      player.play();
    }
  }"""
content = content.replace(old_vnp, new_vnp)

# Hooks insertion
hooks_old = """  const { colors, fonts } = useTheme();

  const [appointment, setAppointment] = useState<Appointment | null>(null);"""

hooks_new = """  const { colors, fonts } = useTheme();

  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(audioRecorder);

  const [appointment, setAppointment] = useState<Appointment | null>(null);"""
content = content.replace(hooks_old, hooks_new)

# State variable deletion
states_to_del = """  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [recordingMs, setRecordingMs] = useState(0);
  const recordTimer = useRef<NodeJS.Timeout | null>(null);

  const isEditable = appointment?.status === "upcoming";"""

states_new = """  const isEditable = appointment?.status === "upcoming";"""
content = content.replace(states_to_del, states_new)

# Refactor startRecording
start_old = """  async function startRecording() {
    setError("");
    try {
      const perm = await Audio.requestPermissionsAsync();
      if (!perm.granted) {
        setError("Microphone permission is required.");
        return;
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      const rec = new Audio.Recording();
      await rec.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await rec.startAsync();
      setRecording(rec);
      setRecordingMs(0);
      if (recordTimer.current) clearInterval(recordTimer.current);
      recordTimer.current = setInterval(() => {
        setRecordingMs((ms) => ms + 1000);
      }, 1000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start recording");
    }
  }"""

start_new = """  async function startRecording() {
    setError("");
    try {
      const perm = await requestRecordingPermissionsAsync();
      if (!perm.granted) {
        setError("Microphone permission is required.");
        return;
      }
      audioRecorder.record();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start recording");
    }
  }"""
content = content.replace(start_old, start_new)

# Refactor stopRecording
stop_old = """  async function stopRecordingAndUpload() {
    if (!recording) return;
    setUploadLoading(true);
    setError("");
    try {
      if (recordTimer.current) {
        clearInterval(recordTimer.current);
        recordTimer.current = null;
      }
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      const status = await recording.getStatusAsync();
      const durationSec =
        status.isDoneRecording && status.durationMillis
          ? Math.round(status.durationMillis / 1000)
          : Math.round(recordingMs / 1000);
      setRecording(null);
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
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
      setRecording(null);
    } finally {
      setUploadLoading(false);
      setRecordingMs(0);
    }
  }"""

stop_new = """  async function stopRecordingAndUpload() {
    if (!audioRecorder.isRecording) return;
    setUploadLoading(true);
    setError("");
    try {
      await audioRecorder.stop();
      const uri = audioRecorder.uri;
      const durationSec = Math.round(recorderState.currentTime);
      
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
      setUploadLoading(false);
    }
  }"""
content = content.replace(stop_old, stop_new)

# Refactor UI conditionals
ui_old1 = """                {recording ? (
                  <Button
                    label={`Stop & upload (${Math.floor(recordingMs / 1000)}s)`}
                    loading={uploadLoading}
                    onPress={stopRecordingAndUpload}
                  />
                ) : (
                  <Button
                    label="Record voice note"
                    variant="secondary"
                    loading={uploadLoading}
                    onPress={startRecording}
                  />
                )}
                {recording ? (
                  <Text style={styles.recordBadge}>Recording…</Text>
                ) : null}"""

ui_new1 = """                {audioRecorder.isRecording ? (
                  <Button
                    label={`Stop & upload (${Math.floor(recorderState.currentTime)}s)`}
                    loading={uploadLoading}
                    onPress={stopRecordingAndUpload}
                  />
                ) : (
                  <Button
                    label="Record voice note"
                    variant="secondary"
                    loading={uploadLoading}
                    onPress={startRecording}
                  />
                )}
                {audioRecorder.isRecording ? (
                  <Text style={styles.recordBadge}>Recording…</Text>
                ) : null}"""
content = content.replace(ui_old1, ui_new1)


with open("app/appointment/[id].tsx", "w") as f:
    f.write(content)
