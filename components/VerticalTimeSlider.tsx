import React, { useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Animated,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { ChevronUp, ChevronDown } from 'lucide-react-native';

interface VerticalTimeSliderProps {
  hour: string; // "00" - "23"
  minute: string; // "00" - "59"
  onChange: (hour: string, minute: string) => void;
  accentColor?: string;
}

// --- COMPACT SIZING CONSTANTS ---
const ITEM_HEIGHT = 36;
const VISIBLE_ITEMS = 3;
const WHEEL_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS; // 108px

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

// -------------------------------------------------------------
// Animated Wheel Item
// Note: We wrap the Text in an Animated.View to prevent Android
// font re-rasterization jitter / flickering during scaling.
// -------------------------------------------------------------
interface WheelItemProps {
  item: string;
  index: number;
  scrollY: Animated.Value;
  accentColor: string;
  onPress: (item: string) => void;
}

const AnimatedWheelItem = React.memo(function AnimatedWheelItem({
  item,
  index,
  scrollY,
  accentColor,
  onPress,
}: WheelItemProps) {
  const inputRange = [
    (index - 2) * ITEM_HEIGHT,
    (index - 1) * ITEM_HEIGHT,
    index * ITEM_HEIGHT,
    (index + 1) * ITEM_HEIGHT,
    (index + 2) * ITEM_HEIGHT,
  ];

  const scale = scrollY.interpolate({
    inputRange,
    outputRange: [0.65, 0.75, 1.2, 0.75, 0.65],
    extrapolate: 'clamp',
  });

  const opacity = scrollY.interpolate({
    inputRange,
    outputRange: [0.25, 0.5, 1, 0.5, 0.25],
    extrapolate: 'clamp',
  });

  return (
    <TouchableOpacity
      style={styles.itemWrapper}
      onPress={() => onPress(item)}
      activeOpacity={0.6}
    >
      <Animated.View
        style={[
          styles.itemAnimatedContainer,
          {
            opacity,
            transform: [{ scale }],
          },
        ]}
      >
        <Text
          style={[
            styles.itemText,
            {
              color: accentColor || '#1E293B',
            },
          ]}
        >
          {item}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
});

// -------------------------------------------------------------
// Wheel Column
// -------------------------------------------------------------
interface WheelColumnProps {
  data: string[];
  selectedValue: string;
  onSelect: (value: string) => void;
  accentColor: string;
}

const WheelColumn = React.memo(function WheelColumn({
  data,
  selectedValue,
  onSelect,
  accentColor,
}: WheelColumnProps) {
  const scrollRef = useRef<any>(null);

  const initialIndex = Math.max(0, data.indexOf(selectedValue));
  const lastIndexRef = useRef<number>(initialIndex);
  const scrollY = useRef(new Animated.Value(initialIndex * ITEM_HEIGHT)).current;

  const isUserScrollingRef = useRef(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasMountedRef = useRef(false);

  // Sync when selectedValue changes externally (e.g. from state change or modal open)
  useEffect(() => {
    if (!isUserScrollingRef.current) {
      const idx = data.indexOf(selectedValue);
      const newIdx = idx >= 0 ? idx : 0;

      if (newIdx !== lastIndexRef.current) {
        lastIndexRef.current = newIdx;
        scrollY.setValue(newIdx * ITEM_HEIGHT);
        if (scrollRef.current) {
          scrollRef.current.scrollTo({ y: newIdx * ITEM_HEIGHT, animated: false });
        }
      }
    }
  }, [selectedValue, data, scrollY]);

  // Android initial scroll guarantee without visual jump
  const handleLayout = useCallback(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      if (initialIndex > 0 && scrollRef.current) {
        scrollRef.current.scrollTo({ y: initialIndex * ITEM_HEIGHT, animated: false });
      }
    }
  }, [initialIndex]);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  // Called when scrolling has officially stopped/settled to commit selection
  const settleScroll = useCallback(
    (offsetY: number) => {
      const index = Math.round(offsetY / ITEM_HEIGHT);
      const clampedIndex = Math.max(0, Math.min(data.length - 1, index));

      if (clampedIndex !== lastIndexRef.current) {
        lastIndexRef.current = clampedIndex;
        Haptics.selectionAsync().catch(() => {});
        onSelect(data[clampedIndex]);
      }

      isUserScrollingRef.current = false;
    },
    [data, onSelect]
  );

  // Fallback safety timer while scrolling in case onMomentumScrollEnd doesn't fire
  const handleScrollListener = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (!isUserScrollingRef.current) return;
      const offsetY = e.nativeEvent.contentOffset.y;

      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        settleScroll(offsetY);
      }, 180);
    },
    [settleScroll]
  );

  const animatedScrollHandler = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    { useNativeDriver: true, listener: handleScrollListener }
  );

  const stepBy = useCallback(
    (delta: number) => {
      isUserScrollingRef.current = false;
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

      const nextIndex = (lastIndexRef.current + delta + data.length) % data.length;
      lastIndexRef.current = nextIndex;

      Haptics.selectionAsync().catch(() => {});
      onSelect(data[nextIndex]);

      if (scrollRef.current) {
        scrollRef.current.scrollTo({ y: nextIndex * ITEM_HEIGHT, animated: true });
      }
    },
    [data, onSelect]
  );

  const handleItemPress = useCallback(
    (item: string) => {
      const targetIndex = data.indexOf(item);
      if (targetIndex >= 0 && targetIndex !== lastIndexRef.current) {
        isUserScrollingRef.current = false;
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

        lastIndexRef.current = targetIndex;
        Haptics.selectionAsync().catch(() => {});
        onSelect(item);

        if (scrollRef.current) {
          scrollRef.current.scrollTo({ y: targetIndex * ITEM_HEIGHT, animated: true });
        }
      }
    },
    [data, onSelect]
  );

  return (
    <View style={styles.columnContainer}>
      <TouchableOpacity
        style={styles.stepBtn}
        onPress={() => stepBy(-1)}
        activeOpacity={0.6}
        hitSlop={{ top: 12, bottom: 8, left: 20, right: 20 }}
      >
        <ChevronUp size={16} color="#94A3B8" strokeWidth={2.5} />
      </TouchableOpacity>

      <View style={styles.wheelArea}>
        <View
          style={[
            styles.selectionLens,
            { borderColor: `${accentColor}30`, backgroundColor: `${accentColor}10` },
          ]}
          pointerEvents="none"
        />

        <Animated.ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          snapToInterval={ITEM_HEIGHT}
          snapToAlignment="center"
          decelerationRate="fast"
          nestedScrollEnabled={true}
          overScrollMode="never"
          removeClippedSubviews={false}
          scrollEventThrottle={16}
          onLayout={handleLayout}
          onScrollBeginDrag={() => {
            isUserScrollingRef.current = true;
          }}
          onMomentumScrollBegin={() => {
            isUserScrollingRef.current = true;
          }}
          onMomentumScrollEnd={(e) => {
            if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
            settleScroll(e.nativeEvent.contentOffset.y);
          }}
          onScrollEndDrag={(e) => {
            const vy = Math.abs(e.nativeEvent.velocity?.y ?? 0);
            if (vy < 0.05) {
              if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
              settleScroll(e.nativeEvent.contentOffset.y);
            }
          }}
          onScroll={animatedScrollHandler}
          contentOffset={{ x: 0, y: initialIndex * ITEM_HEIGHT }}
          contentContainerStyle={{
            paddingVertical: ITEM_HEIGHT,
          }}
          style={styles.wheelScroll}
        >
          {data.map((item, index) => (
            <AnimatedWheelItem
              key={item}
              item={item}
              index={index}
              scrollY={scrollY}
              accentColor={accentColor}
              onPress={handleItemPress}
            />
          ))}
        </Animated.ScrollView>
      </View>

      <TouchableOpacity
        style={styles.stepBtn}
        onPress={() => stepBy(1)}
        activeOpacity={0.6}
        hitSlop={{ top: 8, bottom: 12, left: 20, right: 20 }}
      >
        <ChevronDown size={16} color="#94A3B8" strokeWidth={2.5} />
      </TouchableOpacity>
    </View>
  );
});

// -------------------------------------------------------------
// Main Component
// Uses stable refs to prevent re-creating handler callbacks
// when sibling value (hour vs minute) changes.
// -------------------------------------------------------------
export default React.memo(function VerticalTimeSlider({
  hour,
  minute,
  onChange,
  accentColor = '#29b0f9',
}: VerticalTimeSliderProps) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const hourRef = useRef(hour);
  hourRef.current = hour;

  const minuteRef = useRef(minute);
  minuteRef.current = minute;

  const handleHourSelect = useCallback((newHour: string) => {
    onChangeRef.current(newHour, minuteRef.current);
  }, []);

  const handleMinuteSelect = useCallback((newMinute: string) => {
    onChangeRef.current(hourRef.current, newMinute);
  }, []);

  return (
    <View style={styles.sliderRow}>
      <WheelColumn
        data={HOURS}
        selectedValue={hour}
        onSelect={handleHourSelect}
        accentColor={accentColor}
      />

      <View style={styles.separatorContainer}>
        <Text style={styles.separatorText}>:</Text>
      </View>

      <WheelColumn
        data={MINUTES}
        selectedValue={minute}
        onSelect={handleMinuteSelect}
        accentColor={accentColor}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  columnContainer: {
    alignItems: 'center',
    width: 100,
  },
  stepBtn: {
    paddingVertical: 2,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  wheelArea: {
    height: WHEEL_HEIGHT,
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
  },
  wheelScroll: {
    height: WHEEL_HEIGHT,
    width: '100%',
  },
  selectionLens: {
    position: 'absolute',
    top: ITEM_HEIGHT,
    left: 4,
    right: 4,
    height: ITEM_HEIGHT,
    borderRadius: 10,
    borderWidth: 1.5,
    zIndex: 1,
  },
  itemWrapper: {
    height: ITEM_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  itemAnimatedContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemText: {
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '700',
    includeFontPadding: false,
  },
  separatorContainer: {
    height: WHEEL_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  separatorText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#94A3B8',
    lineHeight: 32,
    includeFontPadding: false,
  },
});