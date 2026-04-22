import React, { useState } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, Platform } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import { useColors } from '@/hooks/useColors';
import { DealCard } from '@/components/DealCard';
import { EmptyState, ScreenHeader } from '@/components/ui';
import type { Deal } from '@/types/models';

interface DealsResponse {
  deals?: Deal[];
}

export default function SupplierDealsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, refetch } = useQuery<Deal[]>({
    queryKey: ['/api/deals/my-deals'],
    queryFn: async () => {
      const res = await api.get<Deal[] | DealsResponse>('/deals/my-deals');
      if (Array.isArray(res.data)) return res.data;
      return (res.data as DealsResponse).deals ?? [];
    },
  });

  const deals: Deal[] = data ?? [];

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
      <ScreenHeader
        title="My Deals"
        subtitle={deals.length ? `${deals.length} deals` : undefined}
      />
      <FlatList
        data={deals}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <DealCard
            deal={item}
            showStatus
            onPress={() => router.push(`/deal/${item.id}` as Href)}
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
              icon="pricetag-outline"
              message="No deals yet.{'\n'}Create your first deal!"
            />
          )
        }
        ListFooterComponent={<View style={s.bottomPad} />}
        scrollEnabled
      />
    </View>
  );
}
