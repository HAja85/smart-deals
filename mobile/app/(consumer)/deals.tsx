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
import { DealCard } from '@/components/DealCard';
import { EmptyState, ScreenHeader } from '@/components/ui';

export default function DealsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['/api/deals', { status: 'Active' }],
    queryFn: async () => {
      const res = await api.get('/deals', { params: { status: 'Active', limit: 50 } });
      return res.data;
    },
  });

  const deals = Array.isArray(data) ? data : data?.deals ?? [];

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
      <ScreenHeader title="All Deals" subtitle="Group buying deals in Kuwait" />
      <FlatList
        data={deals}
        keyExtractor={(item: any) => String(item.id)}
        renderItem={({ item }) => <DealCard deal={item} onPress={() => {}} />}
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
            <EmptyState icon="pricetag-outline" message="No active deals right now.\nCheck back soon!" />
          )
        }
        ListFooterComponent={<View style={s.bottomPad} />}
        scrollEnabled={!!deals.length}
      />
    </View>
  );
}
