import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
  ActivityIndicator,
} from "react-native";
import { AlertTriangle } from "lucide-react-native";
import { colors } from "../../lib/tw";

interface DeleteAccountModalProps {
  visible: boolean;
  userEmail: string;
  onCancel: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
}

export function DeleteAccountModal({
  visible,
  userEmail,
  onCancel,
  onConfirm,
  isLoading = false,
}: DeleteAccountModalProps) {
  const { width } = useWindowDimensions();
  const isWideScreen = width > 600;
  const modalWidth = isWideScreen ? 400 : width - 48;

  const [emailInput, setEmailInput] = useState("");
  const isEmailValid = emailInput.toLowerCase() === userEmail.toLowerCase();

  // Reset input when modal opens/closes
  useEffect(() => {
    if (!visible) {
      setEmailInput("");
    }
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={[styles.modalContainer, { width: modalWidth }]}>
          {/* Warning Icon */}
          <View style={styles.iconContainer}>
            <AlertTriangle size={40} color={colors.destructive} />
          </View>

          {/* Title */}
          <Text style={styles.title}>刪除帳號？</Text>

          {/* Description */}
          <Text style={styles.description}>
            刪除後，您的所有學習紀錄將永久移除，此操作無法復原。
          </Text>

          {/* Email Input Section */}
          <Text style={styles.inputLabel}>請輸入您的電子郵件以確認：</Text>
          <TextInput
            style={styles.input}
            placeholder={userEmail}
            placeholderTextColor={colors.mutedForeground}
            value={emailInput}
            onChangeText={setEmailInput}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            editable={!isLoading}
          />

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            {/* Cancel Button */}
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onCancel}
              activeOpacity={0.8}
              disabled={isLoading}
            >
              <Text style={styles.cancelButtonText}>取消</Text>
            </TouchableOpacity>

            {/* Delete Button */}
            <TouchableOpacity
              style={[
                styles.deleteButton,
                !isEmailValid && styles.deleteButtonDisabled,
              ]}
              onPress={onConfirm}
              activeOpacity={0.8}
              disabled={!isEmailValid || isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={colors.destructiveForeground} />
              ) : (
                <Text
                  style={[
                    styles.deleteButtonText,
                    !isEmailValid && styles.deleteButtonTextDisabled,
                  ]}
                >
                  確認刪除
                </Text>
              )}
            </TouchableOpacity>
          </View>
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
    backgroundColor: `${colors.destructive}15`,
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
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 14,
    color: colors.mutedForeground,
    alignSelf: "flex-start",
    marginBottom: 8,
  },
  input: {
    width: "100%",
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.foreground,
    marginBottom: 24,
  },
  buttonContainer: {
    flexDirection: "row",
    width: "100%",
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: colors.primaryForeground,
  },
  deleteButton: {
    flex: 1,
    backgroundColor: colors.destructive,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  deleteButtonDisabled: {
    backgroundColor: colors.muted,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: colors.destructiveForeground,
  },
  deleteButtonTextDisabled: {
    color: colors.mutedForeground,
  },
});
