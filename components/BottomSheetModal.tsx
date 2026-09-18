import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Animated,
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/lib/theme";

const DISMISS_DISTANCE = 100;
const DISMISS_VELOCITY = 0.8;
const DIM = "rgba(15,23,42,0.45)";

type Props = {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  keyboardAvoiding?: boolean;
  maxHeight?: number | `${number}%`;
  contentStyle?: StyleProp<ViewStyle>;
  closeDisabled?: boolean;
};

function resolveMaxHeightPx(
  maxHeight: number | `${number}%`,
  windowH: number,
): number {
  if (typeof maxHeight === "number") return maxHeight;
  const pct = parseFloat(maxHeight);
  if (Number.isFinite(pct)) return (windowH * pct) / 100;
  return windowH * 0.9;
}

export function BottomSheetModal({
  visible,
  onClose,
  children,
  keyboardAvoiding = false,
  maxHeight = "90%",
  contentStyle,
  closeDisabled = false,
}: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(0)).current;
  const closingRef = useRef(false);
  const onCloseRef = useRef(onClose);
  const closeDisabledRef = useRef(closeDisabled);
  const scrollRef = useRef<ScrollView>(null);
  const scrollOffsetRef = useRef(0);
  onCloseRef.current = onClose;
  closeDisabledRef.current = closeDisabled;

  const [windowH, setWindowH] = useState(() => Dimensions.get("window").height);
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  useEffect(() => {
    const sub = Dimensions.addEventListener("change", ({ window }) => {
      setWindowH(window.height);
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (visible) {
      closingRef.current = false;
      translateY.setValue(0);
      setKeyboardOpen(false);
      scrollOffsetRef.current = 0;
    }
  }, [visible, translateY]);

  useEffect(() => {
    if (!keyboardAvoiding || !visible) {
      setKeyboardOpen(false);
      return;
    }

    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const onShow = Keyboard.addListener(showEvent, () => setKeyboardOpen(true));
    const onHide = Keyboard.addListener(hideEvent, () => setKeyboardOpen(false));

    return () => {
      onShow.remove();
      onHide.remove();
    };
  }, [keyboardAvoiding, visible]);

  const scrollFocusedIntoView = () => {
    const input = TextInput.State.currentlyFocusedInput?.();
    if (!input || !scrollRef.current) return;

    const visibleBottom = Dimensions.get("window").height - 16;

    (
      input as unknown as {
        measureInWindow: (
          cb: (x: number, y: number, w: number, h: number) => void,
        ) => void;
      }
    ).measureInWindow((_x, y, _w, h) => {
      const inputBottom = y + h;
      if (inputBottom <= visibleBottom) return;
      const delta = inputBottom - visibleBottom + 24;
      const nextY = Math.max(0, scrollOffsetRef.current + delta);
      scrollRef.current?.scrollTo({ y: nextY, animated: true });
    });
  };

  useEffect(() => {
    if (!keyboardAvoiding || !keyboardOpen) return;
    const t = setTimeout(scrollFocusedIntoView, 100);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyboardAvoiding, keyboardOpen, windowH]);

  const requestClose = () => {
    if (closeDisabledRef.current) return;
    Keyboard.dismiss();
    onCloseRef.current();
  };

  const dismiss = () => {
    if (closingRef.current || closeDisabledRef.current) return;
    closingRef.current = true;
    Keyboard.dismiss();
    const screenH = Dimensions.get("window").height;
    Animated.timing(translateY, {
      toValue: screenH,
      duration: 220,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) onCloseRef.current();
      closingRef.current = false;
    });
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !closeDisabledRef.current,
        onMoveShouldSetPanResponder: (_, g) =>
          !closeDisabledRef.current &&
          g.dy > 4 &&
          Math.abs(g.dy) > Math.abs(g.dx),
        onPanResponderMove: (_, g) => {
          if (g.dy > 0) translateY.setValue(g.dy);
        },
        onPanResponderRelease: (_, g) => {
          if (closeDisabledRef.current) {
            Animated.spring(translateY, {
              toValue: 0,
              useNativeDriver: true,
              bounciness: 4,
            }).start();
            return;
          }
          if (g.dy > DISMISS_DISTANCE || g.vy > DISMISS_VELOCITY) {
            dismiss();
            return;
          }
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 4,
          }).start();
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [translateY],
  );

  const sheetMaxHeight = resolveMaxHeightPx(maxHeight, windowH);
  const scrollMaxHeight = Math.max(160, sheetMaxHeight - 56 - Math.max(insets.bottom, 20));

  const sheet = (
    <Animated.View
      style={[
        styles.sheet,
        {
          backgroundColor: colors.surface,
          maxHeight: sheetMaxHeight,
          paddingBottom: Math.max(insets.bottom, 20),
          transform: [{ translateY }],
        },
        contentStyle,
      ]}
    >
      <View
        style={styles.handleHit}
        {...panResponder.panHandlers}
        accessibilityRole="adjustable"
        accessibilityLabel="Drag down to close"
      >
        <View style={[styles.handle, { backgroundColor: colors.border }]} />
      </View>
      {keyboardAvoiding ? (
        <ScrollView
          ref={scrollRef}
          style={{ maxHeight: scrollMaxHeight }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          onScroll={(e) => {
            scrollOffsetRef.current = e.nativeEvent.contentOffset.y;
          }}
          scrollEventThrottle={16}
          onContentSizeChange={() => {
            if (keyboardOpen) scrollFocusedIntoView();
          }}
        >
          {children}
        </ScrollView>
      ) : (
        children
      )}
    </Animated.View>
  );

  const frame = (
    <View style={styles.root}>
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={requestClose}
        accessibilityRole="button"
        accessibilityLabel="Dismiss"
      />
      {sheet}
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={requestClose}
    >
      {keyboardAvoiding ? (
        <KeyboardAvoidingView
          style={styles.kav}
          behavior="padding"
          keyboardVerticalOffset={0}
        >
          {frame}
        </KeyboardAvoidingView>
      ) : (
        frame
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  kav: {
    flex: 1,
    backgroundColor: DIM,
  },
  root: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: DIM,
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 8,
    width: "100%",
    overflow: "hidden",
  },
  handleHit: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    marginBottom: 4,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  scrollContent: {
    paddingBottom: 24,
  },
});
