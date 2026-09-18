import { useEffect, useMemo, useRef } from "react";
import {
  Animated,
  Dimensions,
  StyleSheet,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";

type Props = {
  uri: string;
};

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");
const MIN_SCALE = 1;
const MAX_SCALE = 4;
const IMAGE_H = SCREEN_H * 0.8;

export function ZoomableImage({ uri }: Props) {
  const scale = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  const scaleRef = useRef(1);
  const savedScaleRef = useRef(1);
  const txRef = useRef(0);
  const tyRef = useRef(0);
  const savedTxRef = useRef(0);
  const savedTyRef = useRef(0);

  useEffect(() => {
    scaleRef.current = 1;
    savedScaleRef.current = 1;
    txRef.current = 0;
    tyRef.current = 0;
    savedTxRef.current = 0;
    savedTyRef.current = 0;
    scale.setValue(1);
    translateX.setValue(0);
    translateY.setValue(0);
  }, [uri, scale, translateX, translateY]);

  const composed = useMemo(() => {
    const resetToFit = () => {
      scaleRef.current = 1;
      savedScaleRef.current = 1;
      txRef.current = 0;
      tyRef.current = 0;
      savedTxRef.current = 0;
      savedTyRef.current = 0;
      Animated.parallel([
        Animated.timing(scale, { toValue: 1, duration: 160, useNativeDriver: true }),
        Animated.timing(translateX, { toValue: 0, duration: 160, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: 160, useNativeDriver: true }),
      ]).start();
    };

    const pinch = Gesture.Pinch()
      .onUpdate((e) => {
        const next = Math.min(
          MAX_SCALE,
          Math.max(MIN_SCALE, savedScaleRef.current * e.scale),
        );
        scaleRef.current = next;
        scale.setValue(next);
      })
      .onEnd(() => {
        savedScaleRef.current = scaleRef.current;
        if (scaleRef.current <= 1.05) resetToFit();
      })
      .runOnJS(true);

    const pan = Gesture.Pan()
      .averageTouches(true)
      .onUpdate((e) => {
        if (scaleRef.current <= 1) return;
        txRef.current = savedTxRef.current + e.translationX;
        tyRef.current = savedTyRef.current + e.translationY;
        translateX.setValue(txRef.current);
        translateY.setValue(tyRef.current);
      })
      .onEnd(() => {
        savedTxRef.current = txRef.current;
        savedTyRef.current = tyRef.current;
      })
      .runOnJS(true);

    const doubleTap = Gesture.Tap()
      .numberOfTaps(2)
      .onEnd(() => {
        if (scaleRef.current > 1.1) {
          resetToFit();
          return;
        }
        scaleRef.current = 2.5;
        savedScaleRef.current = 2.5;
        Animated.timing(scale, {
          toValue: 2.5,
          duration: 160,
          useNativeDriver: true,
        }).start();
      })
      .runOnJS(true);

    return Gesture.Exclusive(doubleTap, Gesture.Simultaneous(pinch, pan));
  }, [scale, translateX, translateY]);

  return (
    <GestureDetector gesture={composed}>
      <Animated.View style={styles.wrap}>
        <Animated.Image
          source={{ uri }}
          style={[
            styles.image,
            {
              transform: [
                { translateX },
                { translateY },
                { scale },
              ],
            },
          ]}
          resizeMode="contain"
          accessibilityLabel="Visit photo preview"
        />
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: SCREEN_W,
    height: IMAGE_H,
    justifyContent: "center",
    alignItems: "center",
  },
  image: {
    width: SCREEN_W,
    height: IMAGE_H,
  },
});
