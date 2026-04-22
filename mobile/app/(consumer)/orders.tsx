import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/services/api';
import { useColors } from '@/hooks/useColors';
import { EmptyState, ScreenHeader } from '@/components/ui';
import { StatusBadge } from '@/components/Badge';
import type { Order } from '@/types/models';

const DELIVERY_ICONS: Record<string, React.ComponentProps<typeof Ionicons>['name']> = {
  Delivered: 'checkmark-circle',
  Shipped: 'car',
  Pending: 'time-outline',
};

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
      marginBottom: 10,
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
    amount: { fontSize: 17, fontFamily: 'Inter_700Bold', color: colors.foreground },
    deliveryBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    deliveryText: { fontSize: 12, fontFamily: 'Inter_500Medium', color: colors.secondary },
  });

  return (
    <TouchableOpacity style={s.card} activeOpacity={0.85} onPress={onPress}>
      <View style={s.topRow}>
        <Text style={s.orderNum}>{order.order_number ?? `#${order.id}`}</Text>
        <StatusBadge status={order.payment_status} />
      </View>
      <Text style={s.title} numberOfLines={1}>
        {order.product_title ?? 'Order'}
      </Text>
      <Text style={s.meta}>
        Qty: {order.quantity} ·{' '}
        {new Date(order.created_at).toLocaleDateString('en-KW')}
      </Text>
      <View style={s.bottomRow}>
        <Text style={s.amount}>
          KWD {Number(order.total_amount ?? 0).toFixed(3)}
        </Text>
        {order.delivery_status && (
          <View style={s.deliveryBadge}>
            <Ionicons
              name={DELIVERY_ICONS[order.delivery_status] ?? 'time-outline'}
              size={14}
              color={
                order.delivery_status === 'Delivered'
                  ? '#10B981'
                  : colors.secondary
              }
            />
            <Text style={s.deliveryText}>{order.delivery_status}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function OrdersScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, refetch } = useQuery<Order[]>({
    queryKey: ['/api/orders/my-orders'],
    queryFn: async () => {
      const res = await api.get<Order[]>('/orders/my-orders');
      return res.data;
    },
  });

  const orders: Order[] = Array.isArray(data) ? data : [];

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    list: { padding: 20 },
    bottomPad: {
      height: Platform.OS === 'web' ? 34 : insets.bottom + 16,
    },
  });

  return (
    <View style={s.container}>
      <ScreenHeader
        title="My Orders"
        subtitle={orders.length ? `${orders.length} orders` : undefined}
      />
      <FlatList
        data={orders}
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
            refreshing={refreshing || isLoading}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          isLoading ? null : (
            <EmptyState
              icon="receipt-outline"
              message="No orders yet.{'\n'}Join a deal to get started!"
            />
          )
        }
        ListFooterComponent={<View style={s.bottomPad} />}
        scrollEnabled
      />
    </View>
  );
}
