import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments, type Href } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { Colors } from '@/constants/colors';
import type { NotificationData } from '@/types/models';

SplashScreen.preventAutoHideAsync();

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

function AuthGate() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (isLoading) return;

    const inAuth = segments[0] === '(auth)';
    const inConsumer = segments[0] === '(consumer)';
    const inSupplier = segments[0] === '(supplier)';

    if (!user) {
      if (!inAuth) router.replace('/(auth)/login' as Href);
    } else if (user.role === 'supplier') {
      if (!inSupplier) router.replace('/(supplier)' as Href);
    } else {
      if (!inConsumer) router.replace('/(consumer)' as Href);
    }
  }, [user, isLoading, segments]);

  const notificationResponse = Notifications.useLastNotificationResponse();

  useEffect(() => {
    if (!notificationResponse || !user) return;
    const data = notificationResponse.notification.request.content
      .data as NotificationData;

    if (data?.type === 'deal' && data?.deal_id != null) {
      if (user.role === 'consumer') {
        router.push(`/deal/${data.deal_id}` as Href);
      }
    } else if (data?.type === 'order' && data?.order_id != null) {
      if (user.role === 'consumer') {
        router.push(`/order/${data.order_id}` as Href);
      } else {
        router.push('/(supplier)/orders' as Href);
      }
    }
  }, [notificationResponse, user]);

  if (isLoading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(consumer)" />
      <Stack.Screen name="(supplier)" />
      <Stack.Screen
        name="deal/[id]"
        options={{
          headerShown: true,
          title: 'Deal Details',
          headerTintColor: Colors.light.primary,
          headerTitleStyle: { fontFamily: 'Inter_600SemiBold' },
        }}
      />
      <Stack.Screen
        name="order/[id]"
        options={{
          headerShown: true,
          title: 'Order Details',
          headerTintColor: Colors.light.primary,
          headerTitleStyle: { fontFamily: 'Inter_600SemiBold' },
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <AuthGate />
          </AuthProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.light.background,
  },
});
