import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/services/api';
import { useColors } from '@/hooks/useColors';
import { DealCard } from '@/components/DealCard';
import { EmptyState, LoadingOverlay } from '@/components/ui';
import { Badge } from '@/components/Badge';
import type { Deal } from '@/types/models';

const CATEGORIES = ['All', 'Rice', 'Oil', 'Dairy', 'Water', 'Snacks', 'Cleaning', 'Frozen', 'Eggs', 'Beverages'];

type TabMode = 'Active' | 'Upcoming' | 'Completed' | 'Trending';

const STATUS_TABS: { label: string; mode: TabMode; icon?: React.ComponentProps<typeof Ionicons>['name'] }[] = [
  { label: 'Active', mode: 'Active' },
  { label: 'Upcoming', mode: 'Upcoming' },
  { label: 'Completed', mode: 'Completed' },
  { label: '🔥 Trending', mode: 'Trending' },
];

const PAGE_SIZE = 20;

interface DealsPage {
  items: Deal[];
  total: number;
  has_more: boolean;
}

function ViewCountBadge({ count }: { count: number }) {
  const colors = useColors();
  return (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      backgroundColor: 'rgba(0,0,0,0.55)',
      borderRadius: 10,
      paddingHorizontal: 6,
      paddingVertical: 2,
      position: 'absolute',
      top: 6,
      right: 6,
    }}>
      <Ionicons name="eye" size={10} color="#FFFFFF" />
      <Text style={{ fontSize: 9, fontFamily: 'Inter_600SemiBold', color: '#FFFFFF' }}>
        {count >= 1000 ? `${(count / 1000).toFixed(1)}k` : count}
      </Text>
    </View>
  );
}

function TrendingDealCard({ deal, onPress }: { deal: Deal; onPress: () => void }) {
  return (
    <View style={{ position: 'relative' }}>
      <DealCard deal={deal} onPress={onPress} />
      {(deal.view_count ?? 0) > 0 && (
        <ViewCountBadge count={deal.view_count!} />
      )}
    </View>
  );
}

export default function DealsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [search, setSearch] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [tabMode, setTabMode] = useState<TabMode>('Active');

  const { data: trendingData, isLoading: trendingLoading, refetch: refetchTrending, isRefetching: isTrendingRefetching } = useQuery<Deal[]>({
    queryKey: ['/api/deals/trending'],
    queryFn: async () => {
      const res = await api.get<Deal[]>('/deals/trending');
      return res.data;
    },
    enabled: tabMode === 'Trending',
  });

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage, refetch, isRefetching } =
    useInfiniteQuery<DealsPage>({
      queryKey: ['/api/deals/list', { status: tabMode, search: activeSearch }],
      initialPageParam: 0,
      queryFn: async ({ pageParam }) => {
        const params: Record<string, string | number> = {
          limit: PAGE_SIZE,
          offset: Number(pageParam),
          status: tabMode,
        };
        if (activeSearch.trim()) params.search = activeSearch.trim();
        const res = await api.get<DealsPage>('/deals', { params });
        return res.data;
      },
      getNextPageParam: (lastPage, allPages) => {
        const loaded = allPages.reduce((sum, p) => sum + p.items.length, 0);
        return lastPage.has_more ? loaded : undefined;
      },
      enabled: tabMode !== 'Trending',
    });

  const deals: Deal[] = data?.pages.flatMap((p) => p.items) ?? [];

  const filteredDeals = selectedCategory === 'All'
    ? deals
    : deals.filter((d) => {
        const cat = d.product?.category ?? d.category ?? '';
        return cat.toLowerCase().includes(selectedCategory.toLowerCase());
      });

  const filteredTrending = selectedCategory === 'All'
    ? (trendingData ?? [])
    : (trendingData ?? []).filter((d) => {
        const cat = d.product?.category ?? d.category ?? '';
        return cat.toLowerCase().includes(selectedCategory.toLowerCase());
      });

  const handleSearch = () => setActiveSearch(search);

  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      backgroundColor: colors.surface,
      paddingTop: topPad + 12,
      paddingHorizontal: 16,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.muted,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 8,
      gap: 8,
      marginBottom: 10,
    },
    searchInput: {
      flex: 1,
      fontSize: 15,
      fontFamily: 'Inter_400Regular',
      color: colors.foreground,
    },
    tabRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 8,
    },
    tab: {
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 20,
      borderWidth: 1.5,
    },
    tabLabel: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
    catChip: {
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 20,
      marginRight: 8,
      borderWidth: 1.5,
    },
    catLabel: { fontSize: 12, fontFamily: 'Inter_500Medium' },
    list: { paddingHorizontal: 16, paddingTop: 12 },
    footer: { paddingVertical: 20, alignItems: 'center' as const },
    footerText: { fontSize: 13, fontFamily: 'Inter_400Regular', color: colors.secondary },
    trendingHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 16,
      paddingTop: 14,
      paddingBottom: 4,
    },
    trendingTitle: { fontSize: 16, fontFamily: 'Inter_700Bold', color: colors.foreground },
    trendingSub: { fontSize: 12, fontFamily: 'Inter_400Regular', color: colors.secondary, marginLeft: 'auto' as const },
    bottomPad: { height: Platform.OS === 'web' ? 34 : insets.bottom + 16 },
  });

  const isTrending = tabMode === 'Trending';

  return (
    <View style={s.container}>
      <View style={s.header}>
        <View style={s.searchBar}>
          <Ionicons name="search" size={18} color={colors.secondary} />
          <TextInput
            style={s.searchInput}
            placeholder="Search deals..."
            placeholderTextColor={colors.secondary}
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => { setSearch(''); setActiveSearch(''); }}>
              <Ionicons name="close-circle" size={18} color={colors.secondary} />
            </TouchableOpacity>
          )}
        </View>

        <FlatList
          horizontal
          data={STATUS_TABS}
          keyExtractor={(item) => item.mode}
          renderItem={({ item }) => {
            const active = item.mode === tabMode;
            return (
              <TouchableOpacity
                style={[
                  s.tab,
                  {
                    backgroundColor: active ? colors.primary : colors.surface,
                    borderColor: active ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setTabMode(item.mode)}
              >
                <Text style={[s.tabLabel, { color: active ? '#FFFFFF' : colors.secondary }]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          }}
          contentContainerStyle={s.tabRow}
          showsHorizontalScrollIndicator={false}
          scrollEnabled
        />

        <FlatList
          horizontal
          data={CATEGORIES}
          keyExtractor={(item) => item}
          renderItem={({ item }) => {
            const active = item === selectedCategory;
            return (
              <TouchableOpacity
                style={[
                  s.catChip,
                  {
                    backgroundColor: active ? colors.accent + '20' : colors.surface,
                    borderColor: active ? colors.accent : colors.border,
                  },
                ]}
                onPress={() => setSelectedCategory(item)}
              >
                <Text style={[s.catLabel, { color: active ? colors.accent : colors.secondary }]}>
                  {item}
                </Text>
              </TouchableOpacity>
            );
          }}
          contentContainerStyle={{ paddingBottom: 2 }}
          showsHorizontalScrollIndicator={false}
          scrollEnabled
        />
      </View>

      {isTrending ? (
        <FlatList
          data={filteredTrending}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <TrendingDealCard
              deal={item}
              onPress={() => router.push(`/deal/${item.id}` as Href)}
            />
          )}
          contentContainerStyle={s.list}
          ListHeaderComponent={
            <View style={[s.trendingHeader, { paddingHorizontal: 0 }]}>
              <Ionicons name="flame" size={16} color={colors.hot} />
              <Text style={s.trendingTitle}>Trending Deals</Text>
              <Text style={s.trendingSub}>Sorted by most viewed</Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isTrendingRefetching}
              onRefresh={() => refetchTrending()}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            trendingLoading ? (
              <LoadingOverlay />
            ) : (
              <EmptyState icon="flame-outline" message="No trending deals right now." />
            )
          }
          ListFooterComponent={<View style={s.bottomPad} />}
          scrollEnabled
        />
      ) : (
        <FlatList
          data={filteredDeals}
          keyExtractor={(item) => String(item.id)}
          numColumns={2}
          columnWrapperStyle={{ gap: 12, paddingHorizontal: 16, marginBottom: 12 }}
          renderItem={({ item }) => (
            <View style={{ flex: 1 }}>
              <DealCard
                deal={item}
                showStatus={tabMode !== 'Active'}
                onPress={() => router.push(`/deal/${item.id}` as Href)}
              />
            </View>
          )}
          contentContainerStyle={{ paddingTop: 12, paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
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
            isLoading ? (
              <View style={s.footer}>
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : (
              <EmptyState
                icon="pricetag-outline"
                message={`No ${tabMode.toLowerCase()} deals found.`}
              />
            )
          }
          ListFooterComponent={
            isFetchingNextPage ? (
              <View style={s.footer}>
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : hasNextPage ? null : filteredDeals.length > 0 ? (
              <View style={s.footer}>
                <Text style={s.footerText}>All deals loaded</Text>
              </View>
            ) : null
          }
          scrollEnabled
        />
      )}
    </View>
  );
}
