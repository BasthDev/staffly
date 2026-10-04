import React, { useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Animated,
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
    outputRange: [0.55, 0.7, 1.25, 0.7, 0.55],
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
      <Animated.Text
        style={[
          styles.itemText,
          {
            color: accentColor || '#1E293B',
            opacity,
            transform: [{ scale }],
          },
        ]}
      >
        {item}
      </Animated.Text>
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
  
  // FIX: Find the initial index and set it instantly
  const initialIndex = Math.max(0, data.indexOf(selectedValue));
  const lastIndexRef = useRef<number>(initialIndex);
  
  // FIX: Initialize the animation state EXACTLY where the selected value is
  const scrollY = useRef(new Animated.Value(initialIndex * ITEM_HEIGHT)).current;

  const isUserScrollingRef = useRef(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isUserScrollingRef.current) {
      const idx = data.indexOf(selectedValue);
      const newIdx = idx >= 0 ? idx : 0;

      if (newIdx !== lastIndexRef.current) {
        lastIndexRef.current = newIdx;
        if (scrollRef.current) {
          scrollRef.current.scrollTo({ y: newIdx * ITEM_HEIGHT, animated: true });
        }
      }
    }
  }, [selectedValue, data]);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  const handleScrollListener = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (!isUserScrollingRef.current) return;

      const offsetY = e.nativeEvent.contentOffset.y;
      const index = Math.round(offsetY / ITEM_HEIGHT);
      const clampedIndex = Math.max(0, Math.min(data.length - 1, index));

      if (clampedIndex !== lastIndexRef.current) {
        lastIndexRef.current = clampedIndex;
        Haptics.selectionAsync().catch(() => {});
      }

      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        isUserScrollingRef.current = false;
        onSelect(data[lastIndexRef.current]);
      }, 150); 
    },
    [data, onSelect]
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
          scrollEventThrottle={16}
          onScrollBeginDrag={() => {
            isUserScrollingRef.current = true;
          }}
          onMomentumScrollBegin={() => {
            isUserScrollingRef.current = true;
          }}
          onScroll={animatedScrollHandler}
          contentOffset={{ x: 0, y: initialIndex * ITEM_HEIGHT }} // FIX: Starts cleanly at the same index
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
// -------------------------------------------------------------
export default React.memo(function VerticalTimeSlider({
  hour,
  minute,
  onChange,
  accentColor = '#29b0f9',
}: VerticalTimeSliderProps) {
  const handleHourSelect = useCallback(
    (newHour: string) => {
      onChange(newHour, minute);
    },
    [minute, onChange]
  );

  const handleMinuteSelect = useCallback(
    (newMinute: string) => {
      onChange(hour, newMinute);
    },
    [hour, onChange]
  );

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
  itemText: {
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '700', 
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
  },
});