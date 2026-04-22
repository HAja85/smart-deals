import React from 'react';
import { View, Text, Image, StyleSheet, ViewStyle } from 'react-native';
import { useColors } from '@/hooks/useColors';

export interface AvatarProps {
  name?: string;
  uri?: string | null;
  size?: number;
  bgColor?: string;
  style?: ViewStyle;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? '?';
  return (
    (parts[0][0]?.toUpperCase() ?? '') +
    (parts[parts.length - 1][0]?.toUpperCase() ?? '')
  );
}

export function Avatar({ name, uri, size = 44, bgColor, style }: AvatarProps) {
  const colors = useColors();
  const bg = bgColor ?? colors.primary;

  const s = StyleSheet.create({
    container: {
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor: bg,
      justifyContent: 'center',
      alignItems: 'center',
      overflow: 'hidden',
    },
    image: { width: size, height: size },
    initials: {
      fontSize: size * 0.37,
      fontFamily: 'Inter_700Bold',
      color: '#FFFFFF',
    },
    placeholder: {
      fontSize: size * 0.37,
      fontFamily: 'Inter_700Bold',
      color: '#FFFFFF',
    },
  });

  if (uri) {
    return (
      <View style={[s.container, style]}>
        <Image source={{ uri }} style={s.image} resizeMode="cover" />
      </View>
    );
  }

  return (
    <View style={[s.container, { backgroundColor: bg }, style]}>
      <Text style={s.initials}>
        {name ? getInitials(name) : '?'}
      </Text>
    </View>
  );
}
