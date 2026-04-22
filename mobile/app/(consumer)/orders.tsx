import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Platform,
} from 'react-native';
import { useRouter, type Href, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/services/api';
import { useColors } from '@/hooks/useColors';
import { ScreenHeader, EmptyState, LoadingOverlay } from '@/components/ui';
import { StatusBadge } from '@/components/Badge';
import type { Order } from '@/types/models';

type StatusFilter = 'All' | 'Pending' | 'Authorized' | 'Captured' | 'Cancelled';

const STATUS_TABS: StatusFilter[] = ['All', 'Pending', 'Authorized', 'Captured', 'Cancelled'];

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-KW', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function OrderCard({ order, onPress }: { order: Order; onPress: () => void }) {
  const colors = useColors();

  const s = StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 4,
      elevation: 2,
    },
    topRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 6,
    },
    orderNum: {
      fontSize: 13,
      fontFamily: 'Inter_600SemiBold',
      color: colors.primary,
    },
    title: {
      fontSize: 15,
      fontFamily: 'Inter_600SemiBold',
      color: colors.foreground,
      marginBottom: 4,
      flex: 1,
      marginRight: 8,
    },
    meta: {
      fontSize: 12,
      fontFamily: 'Inter_400Regular',
      color: colors.secondary,
      marginBottom: 10,
    },
    bottomRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    statusRow: { flexDirection: 'row', gap: 6 },
    amount: {
      fontSize: 17,
      fontFamily: 'Inter_700Bold',
      color: colors.foreground,
    },
  });

  return (
    <TouchableOpacity style={s.card} activeOpacity={0.8} onPress={onPress}>
      <View style={s.topRow}>
        <View style={{ flex: 1 }}>
          <Text style={s.orderNum}>{order.order_number ?? `Order #${order.id}`}</Text>
          <Text style={s.title} numberOfLines={1}>
            {order.product_title ?? 'Order'}
          </Text>
          <Text style={s.meta}>
            {order.quantity} unit{order.quantity > 1 ? 's' : ''} · {formatDate(order.created_at)}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.secondary} />
      </View>
      <View style={s.bottomRow}>
        <View style={s.statusRow}>
          <StatusBadge status={order.payment_status} />
          {order.delivery_status && <StatusBadge status={order.delivery_status} />}
        </View>
        <Text style={s.amount}>KWD {Number(order.total_amount).toFixed(3)}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function OrdersScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [filterStatus, setFilterStatus] = useState<StatusFilter>('All');

  const { data: allOrders, isLoading, refetch, isRefetching } = useQuery<Order[]>({
    queryKey: ['/api/orders/my-orders'],
    queryFn: async () => {
      const res = await api.get<Order[]>('/orders/my-orders');
      return res.data;
    },
  });

  useFocusEffect(useCallback(() => {
    refetch();
  }, [refetch]));

  const orders = allOrders ?? [];
  const filtered = filterStatus === 'All' ? orders : orders.filter((o) => o.payment_status === filterStatus);

  const totalOrders = orders.length;
  const confirmedOrders = orders.filter((o) => ['Authorized', 'Captured'].includes(o.payment_status)).length;
  const totalSpent = orders.reduce((sum, o) => sum + Number(o.total_amount), 0);

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    statsRow: {
      flexDirection: 'row',
      padding: 16,
      gap: 10,
    },
    statCard: {
      flex: 1,
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 12,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 3,
      elevation: 1,
    },
    statNum: { fontSize: 20, fontFamily: 'Inter_700Bold', color: colors.primary, marginBottom: 2 },
    statLabel: { fontSize: 10, fontFamily: 'Inter_400Regular', color: colors.secondary, textAlign: 'center' as const },
    tabContainer: {
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      paddingVertical: 10,
    },
    tabContent: { paddingHorizontal: 16, gap: 8 },
    tab: {
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 16,
      borderWidth: 1.5,
    },
    tabLabel: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
    list: { padding: 16 },
    bottomPad: { height: Platform.OS === 'web' ? 34 : insets.bottom + 16 },
  });

  return (
    <View style={s.container}>
      <ScreenHeader
        title="My Orders"
        subtitle={`${totalOrders} total`}
      />

      <View style={s.statsRow}>
        <View style={s.statCard}>
          <Text style={s.statNum}>{totalOrders}</Text>
          <Text style={s.statLabel}>Orders</Text>
        </View>
        <View style={s.statCard}>
          <Text style={s.statNum}>{confirmedOrders}</Text>
          <Text style={s.statLabel}>Confirmed</Text>
        </View>
        <View style={s.statCard}>
          <Text style={[s.statNum, { fontSize: 14 }]}>KWD {totalSpent.toFixed(1)}</Text>
          <Text style={s.statLabel}>Total Spent</Text>
        </View>
      </View>

      <View style={s.tabContainer}>
        <FlatList
          horizontal
          data={STATUS_TABS}
          keyExtractor={(item) => item}
          renderItem={({ item }) => {
            const active = item === filterStatus;
            return (
              <TouchableOpacity
                style={[
                  s.tab,
                  {
                    backgroundColor: active ? colors.primary : colors.surface,
                    borderColor: active ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setFilterStatus(item)}
              >
                <Text style={[s.tabLabel, { color: active ? '#FFFFFF' : colors.secondary }]}>
                  {item}
                </Text>
              </TouchableOpacity>
            );
          }}
          contentContainerStyle={s.tabContent}
          showsHorizontalScrollIndicator={false}
          scrollEnabled
        />
      </View>

      {isLoading ? (
        <LoadingOverlay />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <OrderCard
              order={item}
              onPress={() => router.push(`/order/${item.id}` as Href)}
            />
          )}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => refetch()}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon="receipt-outline"
              message={filterStatus === 'All'
                ? "No orders yet.\nJoin a deal and checkout to get started!"
                : `No ${filterStatus.toLowerCase()} orders.`}
            />
          }
          ListFooterComponent={<View style={s.bottomPad} />}
          scrollEnabled
        />
      )}
    </View>
  );
}
