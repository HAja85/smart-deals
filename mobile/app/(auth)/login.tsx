import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Link } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/hooks/useAuth';
import { useColors } from '@/hooks/useColors';
import { InputField, PrimaryButton } from '@/components/ui';

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please enter your email and password.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail || 'Login failed. Please try again.';
      setError(msg);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const s = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: 24,
      paddingTop: insets.top + 48,
      paddingBottom: insets.bottom + 24,
    },
    brandRow: {
      alignItems: 'center',
      marginBottom: 40,
    },
    brandDot: {
      width: 72,
      height: 72,
      borderRadius: 20,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16,
    },
    brandDotText: {
      fontSize: 32,
      fontFamily: 'Inter_700Bold',
      color: '#FFFFFF',
    },
    brandName: {
      fontSize: 24,
      fontFamily: 'Inter_700Bold',
      color: colors.foreground,
    },
    brandSub: {
      fontSize: 14,
      fontFamily: 'Inter_400Regular',
      color: colors.secondary,
      marginTop: 4,
    },
    title: {
      fontSize: 28,
      fontFamily: 'Inter_700Bold',
      color: colors.foreground,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 15,
      fontFamily: 'Inter_400Regular',
      color: colors.secondary,
      marginBottom: 32,
    },
    error: {
      backgroundColor: '#FEF2F2',
      borderRadius: 8,
      padding: 12,
      marginBottom: 16,
      borderLeftWidth: 3,
      borderLeftColor: colors.error,
    },
    errorText: {
      fontSize: 13,
      fontFamily: 'Inter_400Regular',
      color: colors.error,
    },
    forgotRow: {
      alignItems: 'flex-end',
      marginBottom: 24,
      marginTop: -8,
    },
    forgotText: {
      fontSize: 13,
      fontFamily: 'Inter_500Medium',
      color: colors.primary,
    },
    signupRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginTop: 24,
    },
    signupText: {
      fontSize: 14,
      fontFamily: 'Inter_400Regular',
      color: colors.secondary,
    },
    signupLink: {
      fontSize: 14,
      fontFamily: 'Inter_600SemiBold',
      color: colors.primary,
    },
    divider: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: 24,
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: colors.border,
    },
    dividerText: {
      fontSize: 12,
      fontFamily: 'Inter_400Regular',
      color: colors.secondary,
      paddingHorizontal: 12,
    },
    demoBox: {
      backgroundColor: '#EFF6FF',
      borderRadius: 10,
      padding: 14,
      borderWidth: 1,
      borderColor: '#BFDBFE',
    },
    demoTitle: {
      fontSize: 12,
      fontFamily: 'Inter_600SemiBold',
      color: '#1D4ED8',
      marginBottom: 6,
    },
    demoRow: {
      flexDirection: 'row',
      marginBottom: 2,
    },
    demoLabel: {
      fontSize: 12,
      fontFamily: 'Inter_400Regular',
      color: '#3B82F6',
      width: 70,
    },
    demoValue: {
      fontSize: 12,
      fontFamily: 'Inter_500Medium',
      color: '#1E40AF',
    },
  });

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={s.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={s.brandRow}>
          <View style={s.brandDot}>
            <Text style={s.brandDotText}>S</Text>
          </View>
          <Text style={s.brandName}>SmartDeals</Text>
          <Text style={s.brandSub}>Kuwait's Group Buying Marketplace</Text>
        </View>

        <Text style={s.title}>Welcome back</Text>
        <Text style={s.subtitle}>Sign in to your account</Text>

        {error ? (
          <View style={s.error}>
            <Text style={s.errorText}>{error}</Text>
          </View>
        ) : null}

        <InputField
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="you@email.com"
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <InputField
          label="Password"
          value={password}
          onChangeText={setPassword}
          placeholder="Your password"
          secureTextEntry
        />

        <View style={s.forgotRow}>
          <Text style={s.forgotText}>Forgot password?</Text>
        </View>

        <PrimaryButton
          label="Sign In"
          onPress={handleLogin}
          loading={loading}
        />

        <View style={s.signupRow}>
          <Text style={s.signupText}>Don't have an account? </Text>
          <Link href="/(auth)/signup" asChild>
            <TouchableOpacity>
              <Text style={s.signupLink}>Sign up</Text>
            </TouchableOpacity>
          </Link>
        </View>

        <View style={s.divider}>
          <View style={s.dividerLine} />
          <Text style={s.dividerText}>DEMO ACCOUNTS</Text>
          <View style={s.dividerLine} />
        </View>

        <View style={s.demoBox}>
          <Text style={s.demoTitle}>Test Credentials</Text>
          <View style={s.demoRow}>
            <Text style={s.demoLabel}>Consumer</Text>
            <Text style={s.demoValue}>consumer@smartdeals.kw / Consumer123</Text>
          </View>
          <View style={s.demoRow}>
            <Text style={s.demoLabel}>Supplier</Text>
            <Text style={s.demoValue}>supplier@smartdeals.kw / Supplier123</Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
