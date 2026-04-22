import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Platform,
  Animated,
  RefreshControl,
} from 'react-native';
import { useRouter, type Href, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { api } from '@/services/api';
import { useColors } from '@/hooks/useColors';
import { EmptyState, ScreenHeader, PrimaryButton } from '@/components/ui';
import type { CartItem, CartResponse } from '@/types/models';
import { getApiError } from '@/types/models';

function ExpiredBanner({ onDismiss }: { onDismiss: () => void }) {
  const colors = useColors();
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const t = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }).start(() => onDismiss());
    }, 3000);
    return () => clearTimeout(t);
  }, []);

  return (
    <Animated.View style={{ opacity }}>
      <View style={{
        backgroundColor: '#FEF2F2',
        borderRadius: 8,
        padding: 10,
        marginBottom: 8,
        borderLeftWidth: 3,
        borderLeftColor: '#EF4444',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
      }}>
        <Ionicons name="alert-circle" size={16} color="#EF4444" />
        <Text style={{ fontSize: 12, fontFamily: 'Inter_500Medium', color: '#DC2626', flex: 1 }}>
          This deal has ended and will be removed from your cart.
        </Text>
      </View>
    </Animated.View>
  );
}

function CartItemRow({
  item,
  onRemove,
  onUpdateQty,
  isUpdating,
}: {
  item: CartItem;
  onRemove: (dealId: number) => void;
  onUpdateQty: (dealId: number, qty: number) => void;
  isUpdating: boolean;
}) {
  const colors = useColors();
  const [showExpired, setShowExpired] = useState(
    item.deal_status != null && item.deal_status !== 'Active'
  );

  const unitPrice = Number(item.price_per_unit ?? 0);
  const qty = item.quantity ?? 1;
  const lineTotal = (item.line_total ?? unitPrice * qty).toFixed(3);
  const actualPrice = Number(item.actual_price ?? unitPrice);
  const discountPct = item.discount_percent ?? 0;

  const s = StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 14,
      marginBottom: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 4,
      elevation: 2,
    },
    topRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
    title: { flex: 1, fontSize: 15, fontFamily: 'Inter_600SemiBold', color: colors.foreground },
    removeBtn: { padding: 4 },
    brand: { fontSize: 12, fontFamily: 'Inter_400Regular', color: colors.secondary, marginBottom: 10 },
    priceRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
    price: { fontSize: 16, fontFamily: 'Inter_700Bold', color: colors.primary },
    origPrice: {
      fontSize: 12,
      fontFamily: 'Inter_400Regular',
      color: colors.secondary,
      textDecorationLine: 'line-through',
    },
    discountBadge: {
      backgroundColor: colors.accent + '20',
      borderRadius: 6,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    discountText: { fontSize: 11, fontFamily: 'Inter_700Bold', color: colors.accent },
    stepperRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    stepperControls: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    stepperBtn: {
      width: 32,
      height: 32,
      borderRadius: 8,
      backgroundColor: colors.muted,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    stepperNum: { fontSize: 16, fontFamily: 'Inter_700Bold', color: colors.foreground, minWidth: 24, textAlign: 'center' as const },
    lineTotal: { fontSize: 16, fontFamily: 'Inter_700Bold', color: colors.foreground },
  });

  return (
    <View style={s.card}>
      {showExpired && (
        <ExpiredBanner onDismiss={() => { setShowExpired(false); onRemove(item.deal_id); }} />
      )}
      <View style={s.topRow}>
        <Text style={s.title} numberOfLines={1}>{item.product_title ?? 'Deal'}</Text>
        <TouchableOpacity style={s.removeBtn} onPress={() => onRemove(item.deal_id)}>
          <Ionicons name="trash-outline" size={18} color="#EF4444" />
        </TouchableOpacity>
      </View>
      <Text style={s.brand}>{item.product_brand ?? ''}{item.product_unit ? ` · ${item.product_unit}` : ''}</Text>
      <View style={s.priceRow}>
        <Text style={s.price}>KWD {unitPrice.toFixed(3)}/unit</Text>
        {actualPrice > unitPrice && (
          <Text style={s.origPrice}>KWD {actualPrice.toFixed(3)}</Text>
        )}
        {discountPct > 0 && (
          <View style={s.discountBadge}>
            <Text style={s.discountText}>-{discountPct}%</Text>
          </View>
        )}
      </View>
      <View style={s.stepperRow}>
        <View style={s.stepperControls}>
          <TouchableOpacity
            style={s.stepperBtn}
            onPress={() => {
              if (qty > 1) {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onUpdateQty(item.deal_id, qty - 1);
              } else {
                onRemove(item.deal_id);
              }
            }}
            disabled={isUpdating}
          >
            <Ionicons name={qty <= 1 ? 'trash-outline' : 'remove'} size={16} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={s.stepperNum}>{qty}</Text>
          <TouchableOpacity
            style={s.stepperBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onUpdateQty(item.deal_id, qty + 1);
            }}
            disabled={isUpdating}
          >
            <Ionicons name="add" size={16} color={colors.foreground} />
          </TouchableOpacity>
        </View>
        <Text style={s.lineTotal}>KWD {lineTotal}</Text>
      </View>
    </View>
  );
}

function ExpiredItemsBanner({ count, onDismiss }: { count: number; onDismiss: () => void }) {
  const opacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const t = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 600, useNativeDriver: true }).start(onDismiss);
    }, 5000);
    return () => clearTimeout(t);
  }, []);
  return (
    <Animated.View style={{ opacity, marginBottom: 12 }}>
      <View style={{
        backgroundColor: '#FEF2F2', borderRadius: 10, padding: 12,
        borderLeftWidth: 4, borderLeftColor: '#EF4444',
        flexDirection: 'row', alignItems: 'center', gap: 10,
      }}>
        <Ionicons name="alert-circle" size={18} color="#EF4444" />
        <Text style={{ fontSize: 13, fontFamily: 'Inter_500Medium', color: '#DC2626', flex: 1 }}>
          {count} expired deal{count > 1 ? 's were' : ' was'} automatically removed from your cart.
        </Text>
        <TouchableOpacity onPress={onDismiss}>
          <Ionicons name="close" size={16} color="#EF4444" />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

export default function CartScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [removedCount, setRemovedCount] = useState(0);
  const prevItemIds = useRef<Set<number>>(new Set());

  const { data: cartData, isLoading, refetch, isRefetching } = useQuery<CartResponse>({
    queryKey: ['/api/cart'],
    queryFn: async () => {
      const res = await api.get<CartResponse>('/cart');
      return res.data;
    },
    refetchInterval: 30_000,
  });

  useEffect(() => {
    if (!cartData) return;
    const now = Date.now();
    const currentIds = new Set(cartData.items.map((i) => i.deal_id));
    const serverRemovedCount = [...prevItemIds.current].filter((id) => !currentIds.has(id)).length;
    const clientExpiredCount = cartData.items.filter((item) => {
      if (!item.end_time) return false;
      return new Date(item.end_time).getTime() < now;
    }).length;
    const dropped = serverRemovedCount + clientExpiredCount;
    if (prevItemIds.current.size > 0 && dropped > 0) {
      setRemovedCount(dropped);
    }
    prevItemIds.current = currentIds;
  }, [cartData]);

  useFocusEffect(useCallback(() => {
    refetch();
  }, [refetch]));

  const removeMutation = useMutation({
    mutationFn: (dealId: number) => api.delete(`/cart/${dealId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cart'] });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
    onError: (err: unknown) => {
      Alert.alert('Error', getApiError(err, 'Failed to remove item.'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ dealId, quantity }: { dealId: number; quantity: number }) =>
      api.put(`/cart/${dealId}`, { quantity }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cart'] });
    },
    onError: (err: unknown) => {
      Alert.alert('Error', getApiError(err, 'Failed to update quantity.'));
    },
    onSettled: () => setUpdatingId(null),
  });

  const clearMutation = useMutation({
    mutationFn: () => api.delete('/cart'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cart'] });
    },
  });

  const handleRemove = (dealId: number) => {
    Alert.alert('Remove Item', 'Remove this deal from your cart?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => removeMutation.mutate(dealId) },
    ]);
  };

  const handleUpdateQty = (dealId: number, qty: number) => {
    setUpdatingId(dealId);
    updateMutation.mutate({ dealId, quantity: qty });
  };

  const handleClear = () => {
    Alert.alert('Clear Cart', 'Remove all items?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear All', style: 'destructive', onPress: () => clearMutation.mutate() },
    ]);
  };

  const items: CartItem[] = cartData?.items ?? [];
  const total = Number(cartData?.cart_total ?? 0);

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    list: { padding: 16 },
    footer: {
      backgroundColor: colors.card,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      padding: 16,
      paddingBottom: Platform.OS === 'ios' ? insets.bottom + 4 : 16,
    },
    summaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    summaryLabel: { fontSize: 13, fontFamily: 'Inter_400Regular', color: colors.secondary },
    summaryCount: { fontSize: 13, fontFamily: 'Inter_400Regular', color: colors.secondary },
    totalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 14,
    },
    totalLabel: { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: colors.foreground },
    totalAmount: { fontSize: 22, fontFamily: 'Inter_700Bold', color: colors.foreground },
    bottomPad: { height: Platform.OS === 'web' ? 34 : insets.bottom + 16 },
  });

  return (
    <View style={s.container}>
      <ScreenHeader
        title="My Cart"
        subtitle={items.length > 0 ? `${items.length} deal${items.length > 1 ? 's' : ''}` : undefined}
        action={items.length > 0 ? { icon: 'trash-outline', onPress: handleClear } : undefined}
      />
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.deal_id)}
        renderItem={({ item }) => (
          <CartItemRow
            item={item}
            onRemove={handleRemove}
            onUpdateQty={handleUpdateQty}
            isUpdating={updatingId === item.deal_id}
          />
        )}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor={colors.primary} />
        }
        ListHeaderComponent={
          removedCount > 0 ? (
            <ExpiredItemsBanner count={removedCount} onDismiss={() => setRemovedCount(0)} />
          ) : null
        }
        ListEmptyComponent={
          isLoading ? null : (
            <EmptyState icon="bag-outline" message={`Your cart is empty.\nBrowse deals to get started!`} />
          )
        }
        ListFooterComponent={<View style={s.bottomPad} />}
        scrollEnabled
      />
      {items.length > 0 && (
        <View style={s.footer}>
          <View style={s.summaryRow}>
            <Text style={s.summaryLabel}>Items</Text>
            <Text style={s.summaryCount}>{items.length} deal{items.length > 1 ? 's' : ''}</Text>
          </View>
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>Total</Text>
            <Text style={s.totalAmount}>KWD {total.toFixed(3)}</Text>
          </View>
          <PrimaryButton
            label="Proceed to Checkout"
            onPress={() => router.push('/checkout' as Href)}
          />
        </View>
      )}
    </View>
  );
}
