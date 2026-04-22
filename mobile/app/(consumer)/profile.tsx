import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  Image,
  TextInput,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, type Href } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/hooks/useAuth';
import { useColors } from '@/hooks/useColors';
import { Avatar, Badge } from '@/components';
import { InputField, PrimaryButton } from '@/components/ui';
import { api } from '@/services/api';
import type { Order } from '@/types/models';
import { getApiError } from '@/types/models';

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

function EditProfileModal({
  visible,
  onClose,
  currentName,
  currentMobile,
}: {
  visible: boolean;
  onClose: () => void;
  currentName: string;
  currentMobile: string;
}) {
  const colors = useColors();
  const { refreshUser } = useAuth();
  const [name, setName] = useState(currentName);
  const [mobile, setMobile] = useState(currentMobile);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await api.put('/users/me', { name: name.trim(), mobile_number: mobile.trim() });
      await refreshUser?.();
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onClose();
    } catch (err: unknown) {
      Alert.alert('Error', getApiError(err, 'Failed to update profile.'));
    } finally {
      setSaving(false);
    }
  };

  const s = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 24,
      paddingBottom: 40,
    },
    title: { fontSize: 18, fontFamily: 'Inter_700Bold', color: colors.foreground, marginBottom: 20 },
  });

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={s.sheet}>
          <Text style={s.title}>Edit Profile</Text>
          <InputField label="Full Name" value={name} onChangeText={setName} placeholder="Your full name" />
          <InputField label="Mobile Number" value={mobile} onChangeText={setMobile} placeholder="+965 xxxx xxxx" keyboardType="phone-pad" />
          <PrimaryButton label={saving ? 'Saving...' : 'Save Changes'} onPress={handleSave} loading={saving} />
          <PrimaryButton label="Cancel" variant="outline" onPress={onClose} style={{ marginTop: 10 }} />
        </View>
      </View>
    </Modal>
  );
}

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, logout, refreshUser } = useAuth();
  const [editVisible, setEditVisible] = useState(false);

  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const { data: orders } = useQuery<Order[]>({
    queryKey: ['/api/orders/my-orders'],
    queryFn: async () => {
      const res = await api.get<Order[]>('/orders/my-orders');
      return res.data;
    },
  });

  const totalOrders = orders?.length ?? 0;
  const totalSpent = orders?.reduce((sum, o) => sum + Number(o.total_amount), 0) ?? 0;
  const activeDeals = orders?.filter((o) => o.payment_status === 'Authorized' || o.payment_status === 'Pending').length ?? 0;

  const handlePickImage = async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Not Available', 'Image upload is not available on web.');
      return;
    }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow access to your photos to change your avatar.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      try {
        const form = new FormData();
        const uri = asset.uri;
        const ext = uri.split('.').pop() ?? 'jpg';
        form.append('file', { uri, name: `avatar.${ext}`, type: `image/${ext}` } as unknown as Blob);
        await api.post('/users/me/avatar', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        await refreshUser?.();
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (err: unknown) {
        Alert.alert('Upload failed', getApiError(err, 'Could not update avatar.'));
      }
    }
  };

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
    avatarWrap: {
      position: 'relative',
      marginBottom: 12,
    },
    editAvatarBtn: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: colors.accent,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: colors.primary,
    },
    name: {
      fontSize: 20,
      fontFamily: 'Inter_700Bold',
      color: '#FFFFFF',
      marginTop: 4,
    },
    email: {
      fontSize: 13,
      fontFamily: 'Inter_400Regular',
      color: 'rgba(255,255,255,0.75)',
      marginTop: 4,
      marginBottom: 10,
    },
    statsRow: {
      flexDirection: 'row',
      margin: 16,
      gap: 10,
    },
    statCard: {
      flex: 1,
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 14,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 3,
      elevation: 1,
    },
    statNum: { fontSize: 20, fontFamily: 'Inter_700Bold', color: colors.primary, marginBottom: 2 },
    statLabel: { fontSize: 10, fontFamily: 'Inter_400Regular', color: colors.secondary, textAlign: 'center' as const },
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
        <TouchableOpacity style={s.avatarWrap} onPress={handlePickImage} activeOpacity={0.8}>
          <Avatar
            name={user?.name}
            uri={user?.image}
            size={72}
            bgColor="rgba(255,255,255,0.25)"
          />
          <View style={s.editAvatarBtn}>
            <Ionicons name="camera" size={12} color="#FFFFFF" />
          </View>
        </TouchableOpacity>
        <Text style={s.name}>{user?.name ?? 'User'}</Text>
        <Text style={s.email}>{user?.email ?? ''}</Text>
        <Badge label="Consumer" variant="info" filled />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={s.statsRow}>
          <View style={s.statCard}>
            <Text style={s.statNum}>{totalOrders}</Text>
            <Text style={s.statLabel}>Orders</Text>
          </View>
          <View style={s.statCard}>
            <Text style={s.statNum}>{activeDeals}</Text>
            <Text style={s.statLabel}>Active</Text>
          </View>
          <View style={s.statCard}>
            <Text style={[s.statNum, { fontSize: 14 }]}>KWD {totalSpent.toFixed(1)}</Text>
            <Text style={s.statLabel}>Spent</Text>
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionLabel}>Account</Text>
          <MenuItem
            icon="person-outline"
            label="Edit Profile"
            subtitle="Update your name and photo"
            onPress={() => setEditVisible(true)}
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
            label="My Orders"
            subtitle="View all past orders"
            onPress={() => router.push('/(consumer)/orders' as Href)}
          />
          <MenuItem
            icon="bag-outline"
            label="My Cart"
            onPress={() => router.push('/(consumer)/cart' as Href)}
          />
          <MenuItem
            icon="pricetag-outline"
            label="Browse Deals"
            onPress={() => router.push('/(consumer)/deals' as Href)}
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

      <EditProfileModal
        visible={editVisible}
        onClose={() => setEditVisible(false)}
        currentName={user?.name ?? ''}
        currentMobile={user?.mobile_number ?? ''}
      />
    </View>
  );
}
