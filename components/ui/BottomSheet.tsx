import React, { useCallback, useRef } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import GorhomBottomSheet, {
  BottomSheetBackdrop,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { colors } from "../../lib/tw";

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export function BottomSheet({ visible, onClose, children }: BottomSheetProps) {
  const bottomSheetRef = useRef<GorhomBottomSheet>(null);

  const handleSheetChanges = useCallback(
    (index: number) => {
      // User closed the sheet via swipe or backdrop tap
      if (index === -1) {
        onClose();
      }
    },
    [onClose]
  );

  const renderBackdrop = useCallback(
    (props: React.ComponentProps<typeof BottomSheetBackdrop>) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
      />
    ),
    []
  );

  // Don't render the bottom sheet at all when not visible
  // This prevents height calculation issues when modals close
  if (!visible) {
    return null;
  }

  return (
    <GorhomBottomSheet
      ref={bottomSheetRef}
      index={0}
      enableDynamicSizing
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      onChange={handleSheetChanges}
      handleIndicatorStyle={styles.handle}
      backgroundStyle={styles.background}
    >
      <BottomSheetView style={styles.contentContainer}>
        {children}
      </BottomSheetView>
    </GorhomBottomSheet>
  );
}

interface BottomSheetItemProps {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  variant?: "default" | "destructive";
  rightElement?: React.ReactNode;
}

export function BottomSheetItem({
  icon,
  label,
  onPress,
  variant = "default",
  rightElement,
}: BottomSheetItemProps) {
  const textColor =
    variant === "destructive" ? colors.destructive : colors.foreground;
  const iconColor =
    variant === "destructive" ? colors.destructive : colors.mutedForeground;

  return (
    <TouchableOpacity
      style={styles.item}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.itemIcon}>
        {React.cloneElement(icon as React.ReactElement<{ color?: string }>, {
          color: iconColor,
        })}
      </View>
      <Text style={[styles.itemLabel, { color: textColor }]}>{label}</Text>
      {rightElement && <View style={styles.itemRight}>{rightElement}</View>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  background: {
    backgroundColor: colors.card,
  },
  handle: {
    backgroundColor: colors.muted,
    width: 40,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 8,
  },
  itemIcon: {
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  itemLabel: {
    fontSize: 17,
    fontWeight: "500",
    flex: 1,
  },
  itemRight: {
    marginLeft: 12,
  },
});
