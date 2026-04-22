import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import { useColors } from '@/hooks/useColors';
import { EmptyState, ScreenHeader } from '@/components/ui';

function ProductCard({ product }: { product: any }) {
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
      gap: 12,
    },
    iconWrap: {
      width: 48,
      height: 48,
      borderRadius: 12,
      backgroundColor: colors.muted,
      justifyContent: 'center',
      alignItems: 'center',
    },
    iconText: { fontSize: 22 },
    info: { flex: 1 },
    title: { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: colors.foreground },
    meta: { fontSize: 12, fontFamily: 'Inter_400Regular', color: colors.secondary, marginTop: 2 },
    categoryBadge: {
      alignSelf: 'flex-start',
      marginTop: 6,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 6,
      backgroundColor: colors.primary + '15',
    },
    categoryText: { fontSize: 11, fontFamily: 'Inter_500Medium', color: colors.primary },
  });

  return (
    <View style={s.card}>
      <View style={s.iconWrap}>
        <Text style={s.iconText}>📦</Text>
      </View>
      <View style={s.info}>
        <Text style={s.title} numberOfLines={1}>{product.title}</Text>
        <Text style={s.meta}>{product.brand} · {product.unit}</Text>
        <View style={s.categoryBadge}>
          <Text style={s.categoryText}>{product.category}</Text>
        </View>
      </View>
    </View>
  );
}

export default function ProductsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['/api/products/my-products'],
    queryFn: async () => {
      const res = await api.get('/products/my-products');
      return res.data;
    },
  });

  const products = Array.isArray(data) ? data : [];

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
      <ScreenHeader title="My Products" subtitle={products.length ? `${products.length} products` : undefined} />
      <FlatList
        data={products}
        keyExtractor={(item: any) => String(item.id)}
        renderItem={({ item }) => <ProductCard product={item} />}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing || isLoading} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={
          isLoading ? null : (
            <EmptyState icon="cube-outline" message="No products yet.\nAdd your first product!" />
          )
        }
        ListFooterComponent={<View style={s.bottomPad} />}
        scrollEnabled={!!products.length}
      />
    </View>
  );
}
