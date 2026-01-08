import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../contexts/AuthContext";
import { handleApiError } from "../../services/api";
import { BookOpen } from "lucide-react-native";
import { colors } from "../../lib/tw";

export default function LoginScreen() {
  const [username, setUsername] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleLogin = async () => {
    const trimmedUsername = username.trim();

    if (!trimmedUsername) {
      Alert.alert("提示", "請輸入用戶名");
      return;
    }

    if (trimmedUsername.length > 50) {
      Alert.alert("提示", "用戶名不能超過 50 個字元");
      return;
    }

    setIsLoading(true);

    try {
      await login(trimmedUsername);
      router.replace("/(main)");
    } catch (error) {
      const message = handleApiError(error);
      Alert.alert("登入失敗", message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex1}
      >
        <View style={styles.content}>
          {/* Logo & Title */}
          <View style={styles.logoContainer}>
            <View style={styles.logoCircle}>
              <BookOpen size={48} color={colors.primary} />
            </View>
            <Text style={styles.title}>Coach Vocabulary</Text>
            <Text style={styles.subtitle}>高效記憶英語單字</Text>
          </View>

          {/* Login Form */}
          <View style={styles.form}>
            <Text style={styles.label}>用戶名</Text>
            <TextInput
              style={styles.input}
              placeholder="輸入你的用戶名"
              placeholderTextColor={colors.mutedForeground}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
              onSubmitEditing={handleLogin}
              returnKeyType="go"
            />
            <Text style={styles.hint}>新用戶將自動註冊</Text>

            <TouchableOpacity
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.buttonText}>開始學習</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex1: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 48,
  },
  logoCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: `${colors.primary}20`,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 36,
    fontWeight: "800",
    color: colors.foreground,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: colors.mutedForeground,
    textAlign: "center",
  },
  form: {
    width: "100%",
    maxWidth: 384,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.foreground,
    marginBottom: 8,
  },
  input: {
    width: "100%",
    height: 56,
    paddingHorizontal: 16,
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 12,
    color: colors.foreground,
    fontSize: 18,
  },
  hint: {
    fontSize: 14,
    color: colors.mutedForeground,
    marginTop: 8,
  },
  button: {
    width: "100%",
    height: 56,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
    backgroundColor: colors.primary,
  },
  buttonDisabled: {
    backgroundColor: `${colors.primary}80`,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.primaryForeground,
  },
});
