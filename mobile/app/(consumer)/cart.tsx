import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { api } from '@/services/api';
import { useColors } from '@/hooks/useColors';
import { EmptyState, ScreenHeader, PrimaryButton } from '@/components/ui';
import type { Cart, CartItem } from '@/types/models';

function CartItemRow({
  item,
  onRemove,
}: {
  item: CartItem;
  onRemove: (dealId: number) => void;
}) {
  const colors = useColors();

  const s = StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      flexDirection: 'row',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 4,
      elevation: 2,
    },
    info: { flex: 1 },
    title: {
      fontSize: 15,
      fontFamily: 'Inter_600SemiBold',
      color: colors.foreground,
      marginBottom: 4,
    },
    brand: {
      fontSize: 12,
      fontFamily: 'Inter_400Regular',
      color: colors.secondary,
      marginBottom: 8,
    },
    priceRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    price: { fontSize: 16, fontFamily: 'Inter_700Bold', color: colors.primary },
    qty: { fontSize: 13, fontFamily: 'Inter_400Regular', color: colors.secondary },
    removeBtn: { padding: 8 },
  });

  const unitPrice = Number(item.price_per_unit ?? 0);
  const qty = item.quantity ?? 1;
  const total = (unitPrice * qty).toFixed(3);

  return (
    <View style={s.card}>
      <View style={s.info}>
        <Text style={s.title} numberOfLines={1}>
          {item.product_title ?? 'Deal'}
        </Text>
        <Text style={s.brand}>{item.product_brand ?? ''}</Text>
        <View style={s.priceRow}>
          <Text style={s.price}>KWD {total}</Text>
          <Text style={s.qty}>
            × {qty} @ {unitPrice.toFixed(3)}
          </Text>
        </View>
      </View>
      <TouchableOpacity
        style={s.removeBtn}
        onPress={() => onRemove(item.deal_id)}
      >
        <Ionicons name="trash-outline" size={20} color="#EF4444" />
      </TouchableOpacity>
    </View>
  );
}

export default function CartScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const { data: cart, isLoading, refetch } = useQuery<Cart>({
    queryKey: ['/api/cart'],
    queryFn: async () => {
      const res = await api.get<Cart>('/cart');
      return res.data;
    },
  });

  const removeMutation = useMutation({
    mutationFn: (dealId: number) => api.delete(`/cart/${dealId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cart'] });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
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
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => removeMutation.mutate(dealId),
      },
    ]);
  };

  const handleClear = () => {
    Alert.alert('Clear Cart', 'Remove all items from cart?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: () => clearMutation.mutate(),
      },
    ]);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const items: CartItem[] = cart?.items ?? [];
  const total = Number(cart?.cart_total ?? 0);

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    list: { padding: 20 },
    footer: {
      backgroundColor: colors.card,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      padding: 20,
      paddingBottom:
        Platform.OS === 'ios' ? insets.bottom + 4 : 20,
    },
    totalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    totalLabel: {
      fontSize: 15,
      fontFamily: 'Inter_500Medium',
      color: colors.secondary,
    },
    totalValue: {
      fontSize: 22,
      fontFamily: 'Inter_700Bold',
      color: colors.foreground,
    },
    bottomPad: {
      height: Platform.OS === 'web' ? 34 : insets.bottom + 16,
    },
  });

  return (
    <View style={s.container}>
      <ScreenHeader
        title="My Cart"
        subtitle={items.length ? `${items.length} deal${items.length > 1 ? 's' : ''}` : undefined}
        action={
          items.length
            ? { icon: 'trash-outline', onPress: handleClear }
            : undefined
        }
      />
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.deal_id)}
        renderItem={({ item }) => (
          <CartItemRow item={item} onRemove={handleRemove} />
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
              icon="bag-outline"
              message="Your cart is empty.{'\n'}Add deals to get started!"
            />
          )
        }
        ListFooterComponent={<View style={s.bottomPad} />}
        scrollEnabled
      />
      {items.length > 0 && (
        <View style={s.footer}>
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>Total</Text>
            <Text style={s.totalValue}>KWD {total.toFixed(3)}</Text>
          </View>
          <PrimaryButton label="Proceed to Checkout" onPress={() => {}} />
        </View>
      )}
    </View>
  );
}
