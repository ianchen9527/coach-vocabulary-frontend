import { Redirect } from "expo-router";
import { useAuth } from "../contexts/AuthContext";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { colors } from "../lib/tw";

export default function Index() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (isAuthenticated) {
    return <Redirect href="/(main)" />;
  }

  return <Redirect href="/(auth)/login" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
});
