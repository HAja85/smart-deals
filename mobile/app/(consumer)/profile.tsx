import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { useColors } from '@/hooks/useColors';
import { Avatar, Badge } from '@/components';

interface MenuRow {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  subtitle?: string;
  destructive?: boolean;
  onPress: () => void;
}

function MenuItem({ icon, label, subtitle, destructive, onPress }: MenuRow) {
  const colors = useColors();

  const s = StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      paddingHorizontal: 20,
      backgroundColor: colors.card,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      gap: 14,
    },
    iconWrap: {
      width: 38,
      height: 38,
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: destructive ? '#FEF2F2' : colors.muted,
    },
    text: { flex: 1 },
    label: {
      fontSize: 15,
      fontFamily: 'Inter_500Medium',
      color: destructive ? '#DC2626' : colors.foreground,
    },
    subtitle: {
      fontSize: 12,
      fontFamily: 'Inter_400Regular',
      color: colors.secondary,
      marginTop: 1,
    },
  });

  return (
    <TouchableOpacity style={s.row} activeOpacity={0.7} onPress={onPress}>
      <View style={s.iconWrap}>
        <Ionicons
          name={icon}
          size={18}
          color={destructive ? '#DC2626' : colors.primary}
        />
      </View>
      <View style={s.text}>
        <Text style={s.label}>{label}</Text>
        {subtitle ? <Text style={s.subtitle}>{subtitle}</Text> : null}
      </View>
      {!destructive && (
        <Ionicons name="chevron-forward" size={16} color={colors.secondary} />
      )}
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
        onPress: logout,
      },
    ]);
  };

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      backgroundColor: colors.primary,
      paddingTop: topPad + 16,
      paddingBottom: 32,
      paddingHorizontal: 24,
      alignItems: 'center',
    },
    name: {
      fontSize: 20,
      fontFamily: 'Inter_700Bold',
      color: '#FFFFFF',
      marginTop: 12,
    },
    email: {
      fontSize: 13,
      fontFamily: 'Inter_400Regular',
      color: 'rgba(255,255,255,0.75)',
      marginTop: 4,
      marginBottom: 10,
    },
    section: { marginTop: 20 },
    sectionLabel: {
      fontSize: 11,
      fontFamily: 'Inter_600SemiBold',
      color: colors.secondary,
      textTransform: 'uppercase',
      letterSpacing: 1,
      paddingHorizontal: 20,
      marginBottom: 8,
    },
    bottomPad: {
      height: Platform.OS === 'web' ? 34 : insets.bottom + 16,
    },
  });

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Avatar
          name={user?.name}
          uri={user?.image}
          size={72}
          bgColor="rgba(255,255,255,0.25)"
        />
        <Text style={s.name}>{user?.name ?? 'User'}</Text>
        <Text style={s.email}>{user?.email ?? ''}</Text>
        <Badge label="Consumer" variant="info" filled />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={s.section}>
          <Text style={s.sectionLabel}>Account</Text>
          <MenuItem
            icon="person-outline"
            label="Edit Profile"
            subtitle="Update your name and photo"
            onPress={() => {}}
          />
          <MenuItem
            icon="lock-closed-outline"
            label="Change Password"
            onPress={() => {}}
          />
          <MenuItem
            icon="notifications-outline"
            label="Notification Settings"
            onPress={() => {}}
          />
        </View>

        <View style={s.section}>
          <Text style={s.sectionLabel}>Activity</Text>
          <MenuItem
            icon="receipt-outline"
            label="Order History"
            subtitle="View all past orders"
            onPress={() => {}}
          />
          <MenuItem
            icon="bag-outline"
            label="Saved Deals"
            onPress={() => {}}
          />
          <MenuItem
            icon="location-outline"
            label="Delivery Addresses"
            onPress={() => {}}
          />
        </View>

        <View style={s.section}>
          <Text style={s.sectionLabel}>Support</Text>
          <MenuItem
            icon="help-circle-outline"
            label="Help & FAQs"
            onPress={() => {}}
          />
          <MenuItem
            icon="chatbubble-outline"
            label="Contact Support"
            onPress={() => {}}
          />
        </View>

        <View style={[s.section, { marginTop: 8 }]}>
          <MenuItem
            icon="log-out-outline"
            label="Sign Out"
            destructive
            onPress={handleLogout}
          />
        </View>

        <View style={s.bottomPad} />
      </ScrollView>
    </View>
  );
}
