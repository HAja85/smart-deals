import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export interface NotificationBadgeProps {
  count?: number;
  show?: boolean;
  maxCount?: number;
  children: React.ReactNode;
}

export function NotificationBadge({
  count,
  show,
  maxCount = 99,
  children,
}: NotificationBadgeProps) {
  const visible = show ?? (count != null && count > 0);

  const s = StyleSheet.create({
    wrapper: { position: 'relative' },
    badge: {
      position: 'absolute',
      top: -4,
      right: -4,
      backgroundColor: '#EF4444',
      borderRadius: 10,
      minWidth: 16,
      height: 16,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 3,
      borderWidth: 1.5,
      borderColor: '#FFFFFF',
    },
    dot: {
      position: 'absolute',
      top: -2,
      right: -2,
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: '#EF4444',
      borderWidth: 1.5,
      borderColor: '#FFFFFF',
    },
    count: {
      fontSize: 9,
      fontFamily: 'Inter_700Bold',
      color: '#FFFFFF',
      lineHeight: 12,
    },
  });

  return (
    <View style={s.wrapper}>
      {children}
      {visible && (
        count != null ? (
          <View style={s.badge}>
            <Text style={s.count}>
              {count > maxCount ? `${maxCount}+` : String(count)}
            </Text>
          </View>
        ) : (
          <View style={s.dot} />
        )
      )}
    </View>
  );
}
