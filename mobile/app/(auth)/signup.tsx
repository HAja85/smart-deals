import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { api } from '@/services/api';
import { useAuth } from '@/hooks/useAuth';
import { useColors } from '@/hooks/useColors';
import { InputField, PrimaryButton } from '@/components/ui';
import { getApiError } from '@/types/models';

type Step = 1 | 2 | 3;

interface OtpResponse {
  otp?: string;
}

export default function SignupScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signup } = useAuth();

  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [emailOtp, setEmailOtp] = useState('');
  const [mobileOtp, setMobileOtp] = useState('');
  const [demoEmailOtp, setDemoEmailOtp] = useState('');
  const [demoMobileOtp, setDemoMobileOtp] = useState('');

  const handleStep1 = async () => {
    if (!name.trim() || !email.trim() || !mobile.trim() || !password.trim()) {
      setError('All fields are required.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const [emailRes, mobileRes] = await Promise.all([
        api.post<OtpResponse>('/auth/send-email-otp', {
          target: email.trim().toLowerCase(),
        }),
        api.post<OtpResponse>('/auth/send-mobile-otp', { target: mobile.trim() }),
      ]);
      setDemoEmailOtp(emailRes.data.otp ?? '');
      setDemoMobileOtp(mobileRes.data.otp ?? '');
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setStep(2);
    } catch (err: unknown) {
      setError(getApiError(err, 'Failed to send OTPs. Try again.'));
    } finally {
      setLoading(false);
    }
  };

  const handleStep2 = () => {
    if (!emailOtp.trim()) {
      setError('Please enter the email OTP.');
      return;
    }
    setError('');
    setStep(3);
  };

  const handleStep3 = async () => {
    if (!mobileOtp.trim()) {
      setError('Please enter the mobile OTP.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await signup({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        mobile_number: mobile.trim(),
        password,
        email_otp: emailOtp.trim(),
        mobile_otp: mobileOtp.trim(),
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: unknown) {
      setError(getApiError(err, 'Registration failed. Try again.'));
    } finally {
      setLoading(false);
    }
  };

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: 24,
      paddingTop: insets.top + 24,
      paddingBottom: insets.bottom + 24,
    },
    backRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 32,
    },
    backText: {
      fontSize: 14,
      fontFamily: 'Inter_500Medium',
      color: colors.primary,
    },
    stepIndicator: {
      flexDirection: 'row',
      marginBottom: 32,
      gap: 8,
    },
    stepDot: {
      flex: 1,
      height: 4,
      borderRadius: 2,
    },
    title: {
      fontSize: 26,
      fontFamily: 'Inter_700Bold',
      color: colors.foreground,
      marginBottom: 6,
    },
    subtitle: {
      fontSize: 14,
      fontFamily: 'Inter_400Regular',
      color: colors.secondary,
      marginBottom: 28,
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
    demoBox: {
      backgroundColor: '#ECFDF5',
      borderRadius: 10,
      padding: 12,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: '#A7F3D0',
    },
    demoTitle: {
      fontSize: 11,
      fontFamily: 'Inter_600SemiBold',
      color: '#065F46',
      marginBottom: 4,
    },
    demoOtp: {
      fontSize: 22,
      fontFamily: 'Inter_700Bold',
      color: '#047857',
      letterSpacing: 6,
    },
    loginRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginTop: 20,
    },
    loginText: {
      fontSize: 14,
      fontFamily: 'Inter_400Regular',
      color: colors.secondary,
    },
    loginLink: {
      fontSize: 14,
      fontFamily: 'Inter_600SemiBold',
      color: colors.primary,
    },
  });

  const renderStepIndicator = () => (
    <View style={s.stepIndicator}>
      {([1, 2, 3] as Step[]).map((n) => (
        <View
          key={n}
          style={[
            s.stepDot,
            { backgroundColor: n <= step ? colors.primary : colors.border },
          ]}
        />
      ))}
    </View>
  );

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
        <TouchableOpacity
          style={s.backRow}
          onPress={() => {
            if (step > 1) setStep((step - 1) as Step);
            else router.back();
          }}
        >
          <Text style={s.backText}>← Back</Text>
        </TouchableOpacity>

        {renderStepIndicator()}

        {step === 1 && (
          <>
            <Text style={s.title}>Create account</Text>
            <Text style={s.subtitle}>Join Kuwait's group-buying marketplace</Text>

            {error ? (
              <View style={s.error}>
                <Text style={s.errorText}>{error}</Text>
              </View>
            ) : null}

            <InputField
              label="Full Name"
              value={name}
              onChangeText={setName}
              placeholder="Ahmad Al-Mutairi"
            />
            <InputField
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="you@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <InputField
              label="Mobile Number"
              value={mobile}
              onChangeText={setMobile}
              placeholder="+965 xxxx xxxx"
              keyboardType="phone-pad"
            />
            <InputField
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="Min 6 characters"
              secureTextEntry
            />

            <PrimaryButton label="Send OTPs" onPress={handleStep1} loading={loading} />

            <View style={s.loginRow}>
              <Text style={s.loginText}>Already have an account? </Text>
              <Link href="/(auth)/login" asChild>
                <TouchableOpacity>
                  <Text style={s.loginLink}>Sign in</Text>
                </TouchableOpacity>
              </Link>
            </View>
          </>
        )}

        {step === 2 && (
          <>
            <Text style={s.title}>Verify Email</Text>
            <Text style={s.subtitle}>Enter the OTP sent to {email}</Text>

            {error ? (
              <View style={s.error}>
                <Text style={s.errorText}>{error}</Text>
              </View>
            ) : null}

            {demoEmailOtp ? (
              <View style={s.demoBox}>
                <Text style={s.demoTitle}>DEMO MODE — Your OTP</Text>
                <Text style={s.demoOtp}>{demoEmailOtp}</Text>
              </View>
            ) : null}

            <InputField
              label="Email OTP"
              value={emailOtp}
              onChangeText={setEmailOtp}
              placeholder="6-digit code"
              keyboardType="number-pad"
              maxLength={6}
            />

            <PrimaryButton label="Verify Email" onPress={handleStep2} loading={false} />
          </>
        )}

        {step === 3 && (
          <>
            <Text style={s.title}>Verify Mobile</Text>
            <Text style={s.subtitle}>Enter the OTP sent to {mobile}</Text>

            {error ? (
              <View style={s.error}>
                <Text style={s.errorText}>{error}</Text>
              </View>
            ) : null}

            {demoMobileOtp ? (
              <View style={s.demoBox}>
                <Text style={s.demoTitle}>DEMO MODE — Your OTP</Text>
                <Text style={s.demoOtp}>{demoMobileOtp}</Text>
              </View>
            ) : null}

            <InputField
              label="Mobile OTP"
              value={mobileOtp}
              onChangeText={setMobileOtp}
              placeholder="6-digit code"
              keyboardType="number-pad"
              maxLength={6}
            />

            <PrimaryButton
              label="Create Account"
              onPress={handleStep3}
              loading={loading}
            />
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
