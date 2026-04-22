import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';

export type BadgeVariant =
  | 'primary'
  | 'success'
  | 'error'
  | 'warning'
  | 'info'
  | 'hot'
  | 'neutral';

const VARIANT_COLORS: Record<BadgeVariant, { bg: string; text: string }> = {
  primary: { bg: '#34699A20', text: '#34699A' },
  success: { bg: '#10B98120', text: '#047857' },
  error: { bg: '#EF444420', text: '#DC2626' },
  warning: { bg: '#F59E0B20', text: '#B45309' },
  info: { bg: '#3B82F620', text: '#1D4ED8' },
  hot: { bg: '#EF4444', text: '#FFFFFF' },
  neutral: { bg: '#6B728020', text: '#4B5563' },
};

export interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  filled?: boolean;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  size?: 'xs' | 'sm' | 'md';
  style?: ViewStyle;
}

export function Badge({
  label,
  variant = 'neutral',
  filled = false,
  icon,
  size = 'sm',
  style,
}: BadgeProps) {
  const colors = useColors();
  const colorSet = VARIANT_COLORS[variant] ?? VARIANT_COLORS.neutral;

  const bgColor = filled ? colorSet.text : colorSet.bg;
  const textColor = filled ? '#FFFFFF' : colorSet.text;

  const paddingH = size === 'xs' ? 5 : size === 'sm' ? 8 : 12;
  const paddingV = size === 'xs' ? 1 : size === 'sm' ? 3 : 6;
  const fontSize = size === 'xs' ? 9 : size === 'sm' ? 11 : 13;
  const iconSize = size === 'xs' ? 8 : size === 'sm' ? 10 : 13;

  const s = StyleSheet.create({
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      paddingHorizontal: paddingH,
      paddingVertical: paddingV,
      borderRadius: 20,
      backgroundColor: bgColor,
      gap: 3,
    },
    label: {
      fontSize,
      fontFamily: 'Inter_700Bold',
      color: textColor,
      letterSpacing: 0.2,
    },
  });

  return (
    <View style={[s.badge, style]}>
      {icon && <Ionicons name={icon} size={iconSize} color={textColor} />}
      <Text style={s.label}>{label}</Text>
    </View>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const variantMap: Record<string, BadgeVariant> = {
    Active: 'primary',
    Successful: 'success',
    Failed: 'error',
    Captured: 'success',
    Cancelled: 'error',
    Pending: 'warning',
    Authorized: 'info',
    Delivered: 'success',
    Shipped: 'info',
  };
  return (
    <Badge
      label={status}
      variant={variantMap[status] ?? 'neutral'}
    />
  );
}
