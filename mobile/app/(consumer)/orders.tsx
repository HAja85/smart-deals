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
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/services/api';
import { useColors } from '@/hooks/useColors';
import { EmptyState, ScreenHeader } from '@/components/ui';

const STATUS_COLORS: Record<string, string> = {
  Captured: '#10B981',
  Cancelled: '#EF4444',
  Pending: '#F59E0B',
  Authorized: '#3B82F6',
};

function OrderCard({ order }: { order: any }) {
  const colors = useColors();
  const statusColor = STATUS_COLORS[order.payment_status] ?? colors.secondary;

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
    topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
    orderNum: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: colors.primary },
    statusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 20,
      backgroundColor: statusColor + '20',
    },
    statusText: { fontSize: 11, fontFamily: 'Inter_600SemiBold', color: statusColor },
    title: { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: colors.foreground, marginBottom: 4 },
    meta: { fontSize: 12, fontFamily: 'Inter_400Regular', color: colors.secondary, marginBottom: 10 },
    bottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    amount: { fontSize: 17, fontFamily: 'Inter_700Bold', color: colors.foreground },
    deliveryBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    deliveryText: { fontSize: 12, fontFamily: 'Inter_500Medium', color: colors.secondary },
  });

  const deliveryIcons: Record<string, any> = {
    Delivered: 'checkmark-circle',
    Shipped: 'car',
    Pending: 'time-outline',
  };

  return (
    <View style={s.card}>
      <View style={s.topRow}>
        <Text style={s.orderNum}>{order.order_number ?? `#${order.id}`}</Text>
        <View style={s.statusBadge}>
          <Text style={s.statusText}>{order.payment_status}</Text>
        </View>
      </View>
      <Text style={s.title} numberOfLines={1}>{order.product_title ?? 'Order'}</Text>
      <Text style={s.meta}>
        Qty: {order.quantity} · {new Date(order.created_at).toLocaleDateString('en-KW')}
      </Text>
      <View style={s.bottomRow}>
        <Text style={s.amount}>KWD {Number(order.total_amount ?? 0).toFixed(3)}</Text>
        {order.delivery_status && (
          <View style={s.deliveryBadge}>
            <Ionicons
              name={deliveryIcons[order.delivery_status] ?? 'time-outline'}
              size={14}
              color={order.delivery_status === 'Delivered' ? '#10B981' : colors.secondary}
            />
            <Text style={s.deliveryText}>{order.delivery_status}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

export default function OrdersScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['/api/orders/my-orders'],
    queryFn: async () => {
      const res = await api.get('/orders/my-orders');
      return res.data;
    },
  });

  const orders: any[] = Array.isArray(data) ? data : [];

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
      <ScreenHeader title="My Orders" subtitle={orders.length ? `${orders.length} orders` : undefined} />
      <FlatList
        data={orders}
        keyExtractor={(item: any) => String(item.id)}
        renderItem={({ item }) => <OrderCard order={item} />}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing || isLoading} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          isLoading ? null : (
            <EmptyState icon="receipt-outline" message="No orders yet.\nJoin a deal to get started!" />
          )
        }
        ListFooterComponent={<View style={s.bottomPad} />}
        scrollEnabled={!!orders.length}
      />
    </View>
  );
}
