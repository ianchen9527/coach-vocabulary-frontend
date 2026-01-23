import { Stack } from "expo-router";
import { useAuth } from "../../contexts/AuthContext";
import { Redirect } from "expo-router";
import { useScreenTracking } from "../../hooks/useScreenTracking";

export default function MainLayout() {
  const { isAuthenticated, isLoading } = useAuth();

  // 自動追蹤畫面瀏覽
  useScreenTracking();

  // 如果正在載入，不做任何重定向
  if (isLoading) {
    return null;
  }

  // 如果未登入，重定向到登入頁面
  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="learn" />
      <Stack.Screen name="practice" />
      <Stack.Screen name="review" />
    </Stack>
  );
}
