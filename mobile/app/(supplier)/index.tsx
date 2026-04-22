import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, type Href } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/services/api';
import { useAuth } from '@/hooks/useAuth';
import { useColors } from '@/hooks/useColors';
import type { Deal, Order } from '@/types/models';

interface DealsResponse {
  deals?: Deal[];
}

interface OrdersResponse {
  orders?: Order[];
}

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
}

function StatCard({ label, value, icon, color }: StatCardProps) {
  const colors = useColors();
  const s = StyleSheet.create({
    card: {
      flex: 1,
      backgroundColor: colors.card,
      borderRadius: 14,
      padding: 16,
      margin: 6,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 6,
      elevation: 3,
    },
    iconWrap: {
      width: 42,
      height: 42,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 10,
    },
    value: {
      fontSize: 24,
      fontFamily: 'Inter_700Bold',
      color: colors.foreground,
    },
    label: {
      fontSize: 12,
      fontFamily: 'Inter_400Regular',
      color: colors.secondary,
      marginTop: 2,
    },
  });

  return (
    <View style={s.card}>
      <View style={[s.iconWrap, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={s.value}>{value}</Text>
      <Text style={s.label}>{label}</Text>
    </View>
  );
}

export default function SupplierHome() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();

  const { data: dealsData } = useQuery<Deal[]>({
    queryKey: ['/api/deals/my-deals'],
    queryFn: async () => {
      const res = await api.get<Deal[] | DealsResponse>('/deals/my-deals');
      if (Array.isArray(res.data)) return res.data;
      return (res.data as DealsResponse).deals ?? [];
    },
  });

  const { data: ordersData } = useQuery<Order[]>({
    queryKey: ['/api/orders/supplier-orders'],
    queryFn: async () => {
      const res = await api.get<Order[] | OrdersResponse>('/orders/supplier-orders');
      if (Array.isArray(res.data)) return res.data;
      return (res.data as OrdersResponse).orders ?? [];
    },
  });

  const dealsList: Deal[] = dealsData ?? [];
  const ordersList: Order[] = ordersData ?? [];

  const activeDeals = dealsList.filter((d) => d.status === 'Active').length;
  const successDeals = dealsList.filter((d) => d.status === 'Successful').length;
  const totalOrders = ordersList.length;
  const revenue = ordersList
    .filter((o) => o.payment_status === 'Captured')
    .reduce((sum, o) => sum + Number(o.total_amount ?? 0), 0);

  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      backgroundColor: colors.primary,
      paddingTop: topPad + 16,
      paddingHorizontal: 20,
      paddingBottom: 24,
    },
    greeting: {
      fontSize: 13,
      fontFamily: 'Inter_400Regular',
      color: 'rgba(255,255,255,0.8)',
    },
    name: {
      fontSize: 22,
      fontFamily: 'Inter_700Bold',
      color: '#FFFFFF',
      marginBottom: 4,
    },
    roleBadge: {
      alignSelf: 'flex-start',
      backgroundColor: colors.accent,
      borderRadius: 20,
      paddingHorizontal: 10,
      paddingVertical: 3,
    },
    roleText: { fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#FFFFFF' },
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 10, marginTop: 20 },
    section: { paddingHorizontal: 20, marginTop: 24 },
    sectionTitle: {
      fontSize: 17,
      fontFamily: 'Inter_700Bold',
      color: colors.foreground,
      marginBottom: 14,
    },
    quickActions: { flexDirection: 'row', gap: 12 },
    actionBtn: {
      flex: 1,
      backgroundColor: colors.card,
      borderRadius: 14,
      padding: 16,
      alignItems: 'center',
      gap: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 4,
      elevation: 2,
    },
    actionLabel: {
      fontSize: 13,
      fontFamily: 'Inter_500Medium',
      color: colors.foreground,
    },
    bottomPad: { height: Platform.OS === 'web' ? 34 : insets.bottom + 24 },
  });

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.greeting}>Supplier Portal</Text>
        <Text style={s.name}>{user?.name?.split(' ')[0] ?? 'Supplier'}</Text>
        <View style={s.roleBadge}>
          <Text style={s.roleText}>SUPPLIER</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={s.statsGrid}>
          <StatCard
            label="Active Deals"
            value={activeDeals}
            icon="flash"
            color={colors.primary}
          />
          <StatCard
            label="Successful"
            value={successDeals}
            icon="checkmark-circle"
            color={colors.success}
          />
          <StatCard
            label="Orders"
            value={totalOrders}
            icon="receipt"
            color={colors.accent}
          />
          <StatCard
            label="Revenue (KWD)"
            value={revenue.toFixed(3)}
            icon="cash"
            color="#8B5CF6"
          />
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Quick Actions</Text>
          <View style={s.quickActions}>
            <TouchableOpacity
              style={s.actionBtn}
              onPress={() => router.push('/(supplier)/products' as Href)}
            >
              <Ionicons name="add-circle" size={28} color={colors.primary} />
              <Text style={s.actionLabel}>Add Product</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.actionBtn}
              onPress={() => router.push('/(supplier)/deals' as Href)}
            >
              <Ionicons name="pricetag" size={28} color={colors.accent} />
              <Text style={s.actionLabel}>Create Deal</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.actionBtn}
              onPress={() => router.push('/(supplier)/dashboard' as Href)}
            >
              <Ionicons name="bar-chart" size={28} color="#8B5CF6" />
              <Text style={s.actionLabel}>Reports</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={s.bottomPad} />
      </ScrollView>
    </View>
  );
}
