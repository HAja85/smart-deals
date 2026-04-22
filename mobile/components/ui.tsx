import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  TextInputProps,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';

interface InputFieldProps extends TextInputProps {
  label: string;
  error?: string;
}

export function InputField({ label, error, style, ...props }: InputFieldProps) {
  const colors = useColors();

  const s = StyleSheet.create({
    container: { marginBottom: 16 },
    label: {
      fontSize: 13,
      fontFamily: 'Inter_600SemiBold',
      color: colors.foreground,
      marginBottom: 6,
    },
    input: {
      backgroundColor: colors.surface,
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: error ? colors.error : colors.border,
      paddingHorizontal: 14,
      paddingVertical: Platform.OS === 'ios' ? 14 : 10,
      fontSize: 15,
      fontFamily: 'Inter_400Regular',
      color: colors.foreground,
    },
    errorText: {
      fontSize: 12,
      fontFamily: 'Inter_400Regular',
      color: colors.error,
      marginTop: 4,
    },
  });

  return (
    <View style={s.container}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        style={[s.input, style]}
        placeholderTextColor={colors.secondary}
        {...props}
      />
      {error ? <Text style={s.errorText}>{error}</Text> : null}
    </View>
  );
}

interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'outline';
  style?: ViewStyle;
}

export function PrimaryButton({
  label,
  onPress,
  loading,
  disabled,
  variant = 'primary',
  style,
}: PrimaryButtonProps) {
  const colors = useColors();

  const bgColor =
    variant === 'primary'
      ? colors.primary
      : variant === 'secondary'
      ? colors.accent
      : 'transparent';

  const textColor = variant === 'outline' ? colors.primary : '#FFFFFF';
  const borderColor = variant === 'outline' ? colors.primary : 'transparent';

  const s = StyleSheet.create({
    btn: {
      backgroundColor: bgColor,
      borderRadius: 12,
      paddingVertical: 15,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: variant === 'outline' ? 1.5 : 0,
      borderColor,
      opacity: disabled || loading ? 0.6 : 1,
    },
    label: {
      fontSize: 15,
      fontFamily: 'Inter_600SemiBold',
      color: textColor,
    },
  });

  return (
    <TouchableOpacity
      style={[s.btn, style]}
      onPress={async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <Text style={s.label}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

interface EmptyStateProps {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  message: string;
}

export function EmptyState({ icon, message }: EmptyStateProps) {
  const colors = useColors();

  const s = StyleSheet.create({
    container: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 32 },
    iconWrap: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: colors.muted,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16,
    },
    message: {
      fontSize: 15,
      fontFamily: 'Inter_400Regular',
      color: colors.secondary,
      textAlign: 'center',
      lineHeight: 22,
    },
  });

  return (
    <View style={s.container}>
      <View style={s.iconWrap}>
        <Ionicons name={icon} size={32} color={colors.secondary} />
      </View>
      <Text style={s.message}>{message}</Text>
    </View>
  );
}

export function LoadingOverlay() {
  const colors = useColors();

  return (
    <View style={{ alignItems: 'center', paddingVertical: 48 }}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  action?: {
    icon: React.ComponentProps<typeof Ionicons>['name'];
    onPress: () => void;
  };
}

export function ScreenHeader({ title, subtitle, action }: ScreenHeaderProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const s = StyleSheet.create({
    header: {
      backgroundColor: colors.surface,
      paddingTop: topPad + 16,
      paddingBottom: 16,
      paddingHorizontal: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
    },
    textBlock: { flex: 1 },
    title: {
      fontSize: 24,
      fontFamily: 'Inter_700Bold',
      color: colors.foreground,
    },
    subtitle: {
      fontSize: 13,
      fontFamily: 'Inter_400Regular',
      color: colors.secondary,
      marginTop: 2,
    },
    actionBtn: {
      width: 38,
      height: 38,
      borderRadius: 10,
      backgroundColor: colors.muted,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });

  return (
    <View style={s.header}>
      <View style={s.textBlock}>
        <Text style={s.title}>{title}</Text>
        {subtitle ? <Text style={s.subtitle}>{subtitle}</Text> : null}
      </View>
      {action && (
        <TouchableOpacity style={s.actionBtn} onPress={action.onPress} activeOpacity={0.7}>
          <Ionicons name={action.icon} size={18} color={colors.secondary} />
        </TouchableOpacity>
      )}
    </View>
  );
}
