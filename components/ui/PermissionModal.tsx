import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import { colors } from "../../lib/tw";

interface PermissionModalProps {
  visible: boolean;
  icon: React.ReactNode;
  title: string;
  description: string;
  benefit: string;
  onAllow: () => void;
  onDismiss: () => void;
}

export function PermissionModal({
  visible,
  icon,
  title,
  description,
  benefit,
  onAllow,
  onDismiss,
}: PermissionModalProps) {
  const { width } = useWindowDimensions();
  const isWideScreen = width > 600;
  const modalWidth = isWideScreen ? 400 : width - 48;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={[styles.modalContainer, { width: modalWidth }]}>
          {/* Icon */}
          <View style={styles.iconContainer}>{icon}</View>

          {/* Title */}
          <Text style={styles.title}>{title}</Text>

          {/* Description */}
          <Text style={styles.description}>{description}</Text>

          {/* Benefit */}
          <Text style={styles.benefit}>{benefit}</Text>

          {/* Allow Button */}
          <TouchableOpacity
            style={styles.allowButton}
            onPress={onAllow}
            activeOpacity={0.8}
          >
            <Text style={styles.allowButtonText}>允許</Text>
          </TouchableOpacity>

          {/* Dismiss Link */}
          <TouchableOpacity
            style={styles.dismissButton}
            onPress={onDismiss}
            activeOpacity={0.6}
          >
            <Text style={styles.dismissButtonText}>稍後再說</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalContainer: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 32,
    alignItems: "center",
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: `${colors.primary}15`,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: colors.foreground,
    textAlign: "center",
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: colors.mutedForeground,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 12,
  },
  benefit: {
    fontSize: 16,
    color: colors.primary,
    textAlign: "center",
    lineHeight: 24,
    fontWeight: "500",
    marginBottom: 28,
  },
  allowButton: {
    width: "100%",
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 16,
  },
  allowButtonText: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.primaryForeground,
  },
  dismissButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  dismissButtonText: {
    fontSize: 16,
    color: colors.mutedForeground,
  },
});
