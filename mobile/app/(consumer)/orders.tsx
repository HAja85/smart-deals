import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter, type Href, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/services/api';
import { useColors } from '@/hooks/useColors';
import { ScreenHeader, EmptyState, LoadingOverlay } from '@/components/ui';
import { StatusBadge } from '@/components/Badge';
import type { Order } from '@/types/models';

type StatusFilter = 'All' | 'Pending' | 'Authorized' | 'Captured' | 'Cancelled';
const STATUS_TABS: StatusFilter[] = ['All', 'Pending', 'Authorized', 'Captured', 'Cancelled'];
const PAGE_SIZE = 30;

interface OrdersPage {
  items: Order[];
  total: number;
  has_more: boolean;
}

interface Section {
  title: string;
  data: Order[];
}

const STATUS_GROUPS: { label: string; statuses: string[] }[] = [
  { label: 'Pending Payment', statuses: ['Pending'] },
  { label: 'Paid / Authorized', statuses: ['Authorized', 'Captured'] },
  { label: 'Delivered', statuses: ['Delivered'] },
  { label: 'Other', statuses: ['Cancelled', 'Refunded', 'Failed'] },
];

function groupOrdersByStatus(orders: Order[]): Section[] {
  return STATUS_GROUPS
    .map(({ label, statuses }) => ({
      title: label,
      data: orders.filter((o) => statuses.includes(o.payment_status ?? '') || statuses.includes(o.delivery_status ?? '')),
    }))
    .filter((s) => s.data.length > 0);
}

function OrderCard({ order, onPress }: { order: Order; onPress: () => void }) {
  const colors = useColors();

  const s = StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 10,
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
    orderNum: { fontSize: 12, fontFamily: 'Inter_500Medium', color: colors.secondary },
    title: { flex: 1, fontSize: 15, fontFamily: 'Inter_600SemiBold', color: colors.foreground, marginRight: 8, marginBottom: 4 },
    meta: { fontSize: 12, fontFamily: 'Inter_400Regular', color: colors.secondary, marginBottom: 10 },
    bottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    statusRow: { flexDirection: 'row', gap: 6 },
    amount: { fontSize: 17, fontFamily: 'Inter_700Bold', color: colors.foreground },
  });

  const dateStr = order.created_at
    ? new Date(order.created_at).toLocaleDateString('en-KW', { day: 'numeric', month: 'short', year: 'numeric' })
    : '';

  return (
    <TouchableOpacity style={s.card} activeOpacity={0.7} onPress={onPress}>
      <View style={s.topRow}>
        <Text style={s.orderNum}>Order #{order.id}</Text>
        <Text style={s.orderNum}>{dateStr}</Text>
      </View>
      <Text style={s.title} numberOfLines={2}>{order.product_title ?? 'Deal Order'}</Text>
      <Text style={s.meta}>Qty: {order.quantity} · {order.product_brand ?? ''}</Text>
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

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
    isRefetching,
  } = useInfiniteQuery<OrdersPage>({
    queryKey: ['/api/orders/my-orders', filterStatus],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const params: Record<string, string | number> = {
        limit: PAGE_SIZE,
        offset: Number(pageParam),
      };
      if (filterStatus !== 'All') params.status = filterStatus;
      const res = await api.get<OrdersPage>('/orders/my-orders', { params });
      return res.data;
    },
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((sum, p) => sum + p.items.length, 0);
      return lastPage.has_more ? loaded : undefined;
    },
  });

  useFocusEffect(useCallback(() => {
    refetch();
  }, [refetch]));

  const allOrders = data?.pages.flatMap((p) => p.items) ?? [];
  const total = data?.pages[0]?.total ?? 0;
  const sections = groupOrdersByStatus(allOrders);

  const confirmedOrders = allOrders.filter((o) => ['Authorized', 'Captured'].includes(o.payment_status)).length;
  const totalSpent = allOrders.reduce((sum, o) => sum + Number(o.total_amount), 0);

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    statsRow: { flexDirection: 'row', padding: 16, gap: 10 },
    statCard: {
      flex: 1, backgroundColor: colors.card, borderRadius: 12, padding: 12, alignItems: 'center',
      shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
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
    tab: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, borderWidth: 1.5 },
    tabLabel: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      paddingHorizontal: 16,
      backgroundColor: colors.background,
      gap: 8,
    },
    sectionTitle: { fontSize: 13, fontFamily: 'Inter_700Bold', color: colors.secondary, textTransform: 'uppercase', letterSpacing: 0.5 },
    sectionLine: { flex: 1, height: 1, backgroundColor: colors.border },
    list: { paddingHorizontal: 16, paddingTop: 4 },
    footer: { paddingVertical: 20, alignItems: 'center' as const },
    bottomPad: { height: Platform.OS === 'web' ? 34 : insets.bottom + 16 },
  });

  return (
    <View style={s.container}>
      <ScreenHeader title="My Orders" subtitle={`${total} total`} />

      <View style={s.statsRow}>
        <View style={s.statCard}>
          <Text style={s.statNum}>{total}</Text>
          <Text style={s.statLabel}>Orders</Text>
        </View>
        <View style={s.statCard}>
          <Text style={s.statNum}>{confirmedOrders}</Text>
          <Text style={s.statLabel}>Confirmed</Text>
        </View>
        <View style={s.statCard}>
          <Text style={[s.statNum, { fontSize: 14 }]}>KWD {totalSpent.toFixed(1)}</Text>
          <Text style={s.statLabel}>Loaded Spent</Text>
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
        <SectionList
          sections={sections}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <OrderCard
              order={item}
              onPress={() => router.push(`/order/${item.id}` as Href)}
            />
          )}
          renderSectionHeader={({ section }) => (
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>{section.title}</Text>
              <View style={s.sectionLine} />
            </View>
          )}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => refetch()}
              tintColor={colors.primary}
            />
          }
          onEndReached={() => { if (hasNextPage && !isFetchingNextPage) fetchNextPage(); }}
          onEndReachedThreshold={0.3}
          ListEmptyComponent={
            <EmptyState
              icon="receipt-outline"
              message={filterStatus === 'All'
                ? "No orders yet.\nJoin a deal and checkout to get started!"
                : `No ${filterStatus.toLowerCase()} orders.`}
            />
          }
          ListFooterComponent={
            isFetchingNextPage ? (
              <View style={s.footer}>
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : !hasNextPage && allOrders.length > 0 ? (
              <View style={s.footer}>
                <Text style={{ fontSize: 12, fontFamily: 'Inter_400Regular', color: colors.secondary }}>
                  All orders loaded
                </Text>
              </View>
            ) : (
              <View style={s.bottomPad} />
            )
          }
          scrollEnabled
        />
      )}
    </View>
  );
}
