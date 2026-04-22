import React, { useState, useCallback } from 'react';
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
import { useInfiniteQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/services/api';
import { useColors } from '@/hooks/useColors';
import { DealCard } from '@/components/DealCard';
import { EmptyState } from '@/components/ui';
import type { Deal } from '@/types/models';

const CATEGORIES = ['All', 'Rice', 'Oil', 'Dairy', 'Water', 'Snacks', 'Cleaning', 'Frozen', 'Eggs', 'Beverages'];
const STATUS_TABS: { label: string; value: string | null }[] = [
  { label: 'Active', value: 'Active' },
  { label: 'Upcoming', value: 'Upcoming' },
  { label: 'Completed', value: 'Successful' },
];

const PAGE_SIZE = 20;

interface DealsPage {
  items: Deal[];
  total: number;
  has_more: boolean;
}

export default function DealsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [search, setSearch] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [statusTab, setStatusTab] = useState<string | null>('Active');

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage, refetch, isRefetching } =
    useInfiniteQuery<DealsPage>({
      queryKey: ['/api/deals', { status: statusTab, search: activeSearch }],
      initialPageParam: 0,
      queryFn: async ({ pageParam }) => {
        const params: Record<string, string | number> = {
          limit: PAGE_SIZE,
          offset: Number(pageParam),
        };
        if (statusTab) params.status = statusTab;
        if (activeSearch.trim()) params.search = activeSearch.trim();
        const res = await api.get<DealsPage>('/deals', { params });
        return res.data;
      },
      getNextPageParam: (lastPage, allPages) => {
        const loaded = allPages.reduce((sum, p) => sum + p.items.length, 0);
        return lastPage.has_more ? loaded : undefined;
      },
    });

  const deals: Deal[] = data?.pages.flatMap((p) => p.items) ?? [];

  const filteredDeals = selectedCategory === 'All'
    ? deals
    : deals.filter((d) => {
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
    categoryList: { marginBottom: 2 },
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
    bottomPad: { height: Platform.OS === 'web' ? 34 : insets.bottom + 16 },
  });

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

        <View style={s.tabRow}>
          {STATUS_TABS.map((tab) => {
            const active = tab.value === statusTab;
            return (
              <TouchableOpacity
                key={tab.label}
                style={[
                  s.tab,
                  {
                    backgroundColor: active ? colors.primary : colors.surface,
                    borderColor: active ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setStatusTab(tab.value)}
              >
                <Text style={[s.tabLabel, { color: active ? '#FFFFFF' : colors.secondary }]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

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
          contentContainerStyle={s.categoryList}
          showsHorizontalScrollIndicator={false}
          scrollEnabled
        />
      </View>

      <FlatList
        data={filteredDeals}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <DealCard
            deal={item}
            showStatus={statusTab !== 'Active'}
            onPress={() => router.push(`/deal/${item.id}` as Href)}
          />
        )}
        contentContainerStyle={s.list}
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
              message={`No ${statusTab?.toLowerCase() ?? ''} deals found.`}
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
      <View style={s.bottomPad} />
    </View>
  );
}
