import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  Platform,
} from 'react-native';
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

export default function DealsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, refetch } = useQuery<Deal[]>({
    queryKey: ['/api/deals', { status: 'Active' }],
    queryFn: async () => {
      const res = await api.get<Deal[] | DealsResponse>('/deals', {
        params: { status: 'Active', limit: 50 },
      });
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
        title="All Deals"
        subtitle="Group buying deals in Kuwait"
      />
      <FlatList
        data={deals}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <DealCard
            deal={item}
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
              message="No active deals right now.{'\n'}Check back soon!"
            />
          )
        }
        ListFooterComponent={<View style={s.bottomPad} />}
        scrollEnabled
      />
    </View>
  );
}
