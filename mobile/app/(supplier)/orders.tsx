import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import { useColors } from '@/hooks/useColors';
import { EmptyState, ScreenHeader } from '@/components/ui';

const STATUS_COLORS: Record<string, string> = {
  Captured: '#10B981',
  Cancelled: '#EF4444',
  Pending: '#F59E0B',
  Authorized: '#3B82F6',
};

function OrderRow({ order }: { order: any }) {
  const colors = useColors();
  const statusColor = STATUS_COLORS[order.payment_status] ?? colors.secondary;

  const s = StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 10,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 3,
      elevation: 2,
    },
    topRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
    orderNum: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: colors.primary },
    statusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 20,
      backgroundColor: statusColor + '20',
    },
    statusText: { fontSize: 11, fontFamily: 'Inter_600SemiBold', color: statusColor },
    title: { fontSize: 14, fontFamily: 'Inter_500Medium', color: colors.foreground, marginBottom: 4 },
    meta: { fontSize: 12, fontFamily: 'Inter_400Regular', color: colors.secondary },
    bottomRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
    buyer: { fontSize: 12, fontFamily: 'Inter_400Regular', color: colors.secondary },
    amount: { fontSize: 15, fontFamily: 'Inter_700Bold', color: colors.foreground },
  });

  return (
    <View style={s.card}>
      <View style={s.topRow}>
        <Text style={s.orderNum}>{order.order_number ?? `#${order.id}`}</Text>
        <View style={s.statusBadge}>
          <Text style={s.statusText}>{order.payment_status}</Text>
        </View>
      </View>
      <Text style={s.title} numberOfLines={1}>{order.product_title ?? 'Order'}</Text>
      <Text style={s.meta}>Qty: {order.quantity}</Text>
      <View style={s.bottomRow}>
        <Text style={s.buyer}>{order.buyer_name ?? ''}</Text>
        <Text style={s.amount}>KWD {Number(order.total_amount ?? 0).toFixed(3)}</Text>
      </View>
    </View>
  );
}

export default function SupplierOrdersScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['/api/orders/supplier-orders'],
    queryFn: async () => {
      const res = await api.get('/orders/supplier-orders');
      return res.data;
    },
  });

  const orders = Array.isArray(data) ? data : data?.orders ?? [];

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    list: { padding: 20 },
    bottomPad: { height: Platform.OS === 'web' ? 34 : insets.bottom + 16 },
  });

  return (
    <View style={s.container}>
      <ScreenHeader title="Supplier Orders" subtitle={orders.length ? `${orders.length} orders` : undefined} />
      <FlatList
        data={orders}
        keyExtractor={(item: any) => String(item.id)}
        renderItem={({ item }) => <OrderRow order={item} />}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing || isLoading} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={
          isLoading ? null : (
            <EmptyState icon="receipt-outline" message="No orders yet.\nOrders appear when consumers join your deals." />
          )
        }
        ListFooterComponent={<View style={s.bottomPad} />}
        scrollEnabled={!!orders.length}
      />
    </View>
  );
}
