import { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  useWindowDimensions,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../contexts/AuthContext";
import { handleApiError } from "../../services/api";
import { BookOpen } from "lucide-react-native";
import { colors } from "../../lib/tw";

type AuthMode = "login" | "register";

export default function LoginScreen() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [username, setUsername] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { login, register } = useAuth();
  const router = useRouter();
  const { width } = useWindowDimensions();

  // Input refs for focus management
  const usernameRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);

  const isWideScreen = width > 600;
  const contentMaxWidth = isWideScreen ? 400 : undefined;

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async () => {
    const trimmedEmail = email.trim();
    const trimmedPassword = password;
    const trimmedUsername = username.trim();

    // 清除之前的錯誤
    setError(null);

    // Email 驗證
    if (!trimmedEmail) {
      setError("請輸入電子郵件");
      return;
    }
    if (!validateEmail(trimmedEmail)) {
      setError("請輸入有效的電子郵件格式");
      return;
    }

    // Password 驗證
    if (!trimmedPassword) {
      setError("請輸入密碼");
      return;
    }
    if (trimmedPassword.length < 8) {
      setError("密碼至少需要 8 個字元");
      return;
    }
    if (trimmedPassword.length > 100) {
      setError("密碼不能超過 100 個字元");
      return;
    }

    // 註冊模式：額外驗證
    if (mode === "register") {
      if (!trimmedUsername) {
        setError("請輸入用戶名");
        return;
      }
      if (trimmedUsername.length < 3) {
        setError("用戶名至少需要 3 個字元");
        return;
      }
      if (trimmedUsername.length > 50) {
        setError("用戶名不能超過 50 個字元");
        return;
      }
      if (trimmedPassword !== confirmPassword) {
        setError("兩次輸入的密碼不一致");
        return;
      }
    }

    setIsLoading(true);

    try {
      if (mode === "login") {
        await login(trimmedEmail, trimmedPassword);
      } else {
        await register(trimmedEmail, trimmedUsername, trimmedPassword);
      }
      router.replace("/(main)");
    } catch (err) {
      const message = handleApiError(err);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    // 清除密碼相關欄位和錯誤，保留已輸入的 email
    setPassword("");
    setConfirmPassword("");
    setUsername("");
    setError(null);
  };

  // Focus handlers
  const focusUsername = () => usernameRef.current?.focus();
  const focusPassword = () => passwordRef.current?.focus();
  const focusConfirmPassword = () => confirmPasswordRef.current?.focus();

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex1}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[styles.content, contentMaxWidth ? { maxWidth: contentMaxWidth, alignSelf: "center", width: "100%" } : null]}>
            {/* Logo & Title */}
            <View style={styles.logoContainer}>
              <View style={styles.logoCircle}>
                <BookOpen size={48} color={colors.primary} />
              </View>
              <Text style={styles.title}>Coach Vocabulary</Text>
              <Text style={styles.subtitle}>高效記憶英語單字</Text>
            </View>

            {/* Mode Tabs */}
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[styles.tab, mode === "login" && styles.tabActive]}
                onPress={() => switchMode("login")}
                disabled={isLoading}
              >
                <Text style={[styles.tabText, mode === "login" && styles.tabTextActive]}>
                  登入
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, mode === "register" && styles.tabActive]}
                onPress={() => switchMode("register")}
                disabled={isLoading}
              >
                <Text style={[styles.tabText, mode === "register" && styles.tabTextActive]}>
                  註冊
                </Text>
              </TouchableOpacity>
            </View>

            {/* Form */}
            <View style={styles.form}>
              {/* Email */}
              <Text style={styles.label}>電子郵件</Text>
              <TextInput
                style={styles.input}
                placeholder="輸入電子郵件"
                placeholderTextColor={colors.mutedForeground}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="emailAddress"
                editable={!isLoading}
                returnKeyType="next"
                onSubmitEditing={mode === "register" ? focusUsername : focusPassword}
                blurOnSubmit={false}
              />

              {/* Username (only for register) */}
              {mode === "register" && (
                <>
                  <Text style={[styles.label, styles.labelMargin]}>用戶名</Text>
                  <TextInput
                    ref={usernameRef}
                    style={styles.input}
                    placeholder="輸入用戶名（3-50 字元）"
                    placeholderTextColor={colors.mutedForeground}
                    value={username}
                    onChangeText={setUsername}
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!isLoading}
                    returnKeyType="next"
                    onSubmitEditing={focusPassword}
                    blurOnSubmit={false}
                  />
                </>
              )}

              {/* Password */}
              <Text style={[styles.label, styles.labelMargin]}>密碼</Text>
              <TextInput
                ref={passwordRef}
                style={styles.input}
                placeholder="輸入密碼（至少 8 字元）"
                placeholderTextColor={colors.mutedForeground}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                textContentType={mode === "login" ? "password" : "newPassword"}
                editable={!isLoading}
                returnKeyType={mode === "register" ? "next" : "go"}
                onSubmitEditing={mode === "register" ? focusConfirmPassword : handleSubmit}
                blurOnSubmit={mode === "login"}
              />

              {/* Confirm Password (only for register) */}
              {mode === "register" && (
                <>
                  <Text style={[styles.label, styles.labelMargin]}>確認密碼</Text>
                  <TextInput
                    ref={confirmPasswordRef}
                    style={styles.input}
                    placeholder="再次輸入密碼"
                    placeholderTextColor={colors.mutedForeground}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry
                    textContentType="newPassword"
                    editable={!isLoading}
                    returnKeyType="go"
                    onSubmitEditing={handleSubmit}
                  />
                </>
              )}

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.button, isLoading && styles.buttonDisabled]}
                onPress={handleSubmit}
                disabled={isLoading}
                activeOpacity={0.8}
              >
                {isLoading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.buttonText}>
                    {mode === "login" ? "登入" : "註冊"}
                  </Text>
                )}
              </TouchableOpacity>

              {/* Error Message */}
              {error && (
                <Text style={styles.errorText}>{error}</Text>
              )}
            </View>
          </View>
        </ScrollView>
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
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    paddingVertical: 24,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 32,
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
  tabContainer: {
    flexDirection: "row",
    width: "100%",
    maxWidth: 384,
    marginBottom: 24,
    backgroundColor: colors.muted,
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 10,
  },
  tabActive: {
    backgroundColor: colors.background,
  },
  tabText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.mutedForeground,
  },
  tabTextActive: {
    color: colors.foreground,
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
  labelMargin: {
    marginTop: 16,
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
  errorText: {
    fontSize: 14,
    color: colors.destructive,
    textAlign: "center",
    marginTop: 16,
  },
});
