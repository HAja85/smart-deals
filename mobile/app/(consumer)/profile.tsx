import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/hooks/useAuth';
import { useColors } from '@/hooks/useColors';

interface MenuItemProps {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value?: string;
  onPress?: () => void;
  danger?: boolean;
}

function MenuItem({ icon, label, value, onPress, danger }: MenuItemProps) {
  const colors = useColors();

  const s = StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      paddingHorizontal: 18,
      paddingVertical: 15,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      gap: 14,
    },
    iconWrap: {
      width: 36,
      height: 36,
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: danger ? '#FEF2F2' : colors.muted,
    },
    label: {
      flex: 1,
      fontSize: 15,
      fontFamily: 'Inter_500Medium',
      color: danger ? colors.error : colors.foreground,
    },
    value: {
      fontSize: 14,
      fontFamily: 'Inter_400Regular',
      color: colors.secondary,
      marginRight: 6,
    },
  });

  return (
    <TouchableOpacity style={s.row} onPress={onPress} activeOpacity={0.7}>
      <View style={s.iconWrap}>
        <Ionicons name={icon} size={18} color={danger ? colors.error : colors.primary} />
      </View>
      <Text style={s.label}>{label}</Text>
      {value ? <Text style={s.value}>{value}</Text> : null}
      {onPress && !danger ? (
        <Ionicons name="chevron-forward" size={16} color={colors.secondary} />
      ) : null}
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();

  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          await logout();
        },
      },
    ]);
  };

  const initials = user?.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      backgroundColor: colors.primary,
      paddingTop: topPad + 24,
      paddingBottom: 32,
      alignItems: 'center',
    },
    avatar: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: 'rgba(255,255,255,0.25)',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 12,
    },
    avatarText: {
      fontSize: 28,
      fontFamily: 'Inter_700Bold',
      color: '#FFFFFF',
    },
    name: {
      fontSize: 20,
      fontFamily: 'Inter_700Bold',
      color: '#FFFFFF',
      marginBottom: 4,
    },
    email: {
      fontSize: 13,
      fontFamily: 'Inter_400Regular',
      color: 'rgba(255,255,255,0.8)',
    },
    roleBadge: {
      marginTop: 8,
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 20,
      backgroundColor: 'rgba(255,255,255,0.2)',
    },
    roleText: {
      fontSize: 11,
      fontFamily: 'Inter_600SemiBold',
      color: '#FFFFFF',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    section: {
      marginTop: 24,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    sectionLabel: {
      fontSize: 11,
      fontFamily: 'Inter_600SemiBold',
      color: colors.secondary,
      paddingHorizontal: 20,
      paddingTop: 14,
      paddingBottom: 8,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    },
    bottomPad: { height: Platform.OS === 'web' ? 34 : insets.bottom + 24 },
  });

  return (
    <View style={s.container}>
      <View style={s.header}>
        <View style={s.avatar}>
          <Text style={s.avatarText}>{initials ?? '?'}</Text>
        </View>
        <Text style={s.name}>{user?.name}</Text>
        <Text style={s.email}>{user?.email}</Text>
        <View style={s.roleBadge}>
          <Text style={s.roleText}>{user?.role}</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={s.section}>
          <Text style={s.sectionLabel}>Account</Text>
          <MenuItem icon="person-outline" label="Full Name" value={user?.name} />
          <MenuItem icon="mail-outline" label="Email" value={user?.email} />
          <MenuItem icon="call-outline" label="Mobile" value={user?.mobile_number || '—'} />
        </View>

        <View style={s.section}>
          <Text style={s.sectionLabel}>Preferences</Text>
          <MenuItem icon="notifications-outline" label="Notifications" onPress={() => {}} />
          <MenuItem icon="language-outline" label="Language" value="English" onPress={() => {}} />
        </View>

        <View style={s.section}>
          <Text style={s.sectionLabel}>Support</Text>
          <MenuItem icon="help-circle-outline" label="Help & Support" onPress={() => {}} />
          <MenuItem icon="shield-checkmark-outline" label="Privacy Policy" onPress={() => {}} />
          <MenuItem icon="document-text-outline" label="Terms of Service" onPress={() => {}} />
        </View>

        <View style={s.section}>
          <MenuItem icon="log-out-outline" label="Sign Out" onPress={handleLogout} danger />
        </View>

        <View style={s.bottomPad} />
      </ScrollView>
    </View>
  );
}
