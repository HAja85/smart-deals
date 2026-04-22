import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import { useColors } from '@/hooks/useColors';
import { EmptyState } from '@/components/ui';
import type { Order } from '@/types/models';

const STATUS_COLORS: Record<string, string> = {
  Captured: '#10B981',
  Cancelled: '#EF4444',
  Pending: '#F59E0B',
  Authorized: '#3B82F6',
};

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const { data: order, isLoading, error } = useQuery<Order>({
    queryKey: ['/api/orders', id],
    queryFn: async () => {
      const res = await api.get<Order>(`/orders/${id}`);
      return res.data;
    },
    enabled: !!id,
  });

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scrollContent: {
      padding: 20,
      paddingBottom: Platform.OS === 'ios' ? insets.bottom + 24 : 32,
    },
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    card: {
      backgroundColor: colors.card,
      borderRadius: 14,
      padding: 20,
      marginBottom: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 6,
      elevation: 3,
    },
    orderNum: {
      fontSize: 13,
      fontFamily: 'Inter_600SemiBold',
      color: colors.primary,
      marginBottom: 4,
    },
    title: {
      fontSize: 18,
      fontFamily: 'Inter_700Bold',
      color: colors.foreground,
      marginBottom: 16,
    },
    statusBadge: {
      alignSelf: 'flex-start',
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 20,
      marginBottom: 16,
    },
    statusText: {
      fontSize: 12,
      fontFamily: 'Inter_700Bold',
      color: '#FFFFFF',
    },
    infoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    infoLabel: {
      fontSize: 14,
      fontFamily: 'Inter_400Regular',
      color: colors.secondary,
    },
    infoValue: {
      fontSize: 14,
      fontFamily: 'Inter_600SemiBold',
      color: colors.foreground,
    },
    totalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 14,
    },
    totalLabel: {
      fontSize: 16,
      fontFamily: 'Inter_600SemiBold',
      color: colors.foreground,
    },
    totalValue: {
      fontSize: 20,
      fontFamily: 'Inter_700Bold',
      color: colors.primary,
    },
  });

  if (isLoading) {
    return (
      <View style={s.loader}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error || !order) {
    return (
      <View style={s.container}>
        <EmptyState icon="alert-circle-outline" message="Order not found." />
      </View>
    );
  }

  const statusColor = STATUS_COLORS[order.payment_status] ?? colors.secondary;

  return (
    <View style={s.container}>
      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={s.card}>
          <Text style={s.orderNum}>{order.order_number ?? `Order #${order.id}`}</Text>
          <Text style={s.title} numberOfLines={2}>
            {order.product_title ?? 'Order'}
          </Text>
          <View style={[s.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={s.statusText}>{order.payment_status}</Text>
          </View>

          <View style={s.infoRow}>
            <Text style={s.infoLabel}>Quantity</Text>
            <Text style={s.infoValue}>{order.quantity} units</Text>
          </View>
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>Date</Text>
            <Text style={s.infoValue}>
              {new Date(order.created_at).toLocaleDateString('en-KW', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </Text>
          </View>
          {order.delivery_status && (
            <View style={s.infoRow}>
              <Text style={s.infoLabel}>Delivery</Text>
              <Text style={s.infoValue}>{order.delivery_status}</Text>
            </View>
          )}

          <View style={s.totalRow}>
            <Text style={s.totalLabel}>Total</Text>
            <Text style={s.totalValue}>
              KWD {Number(order.total_amount).toFixed(3)}
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
