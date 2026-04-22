import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  TextInput,
  RefreshControl,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/services/api';
import { useAuth } from '@/hooks/useAuth';
import { useColors } from '@/hooks/useColors';
import { DealCard } from '@/components/DealCard';
import { EmptyState, LoadingOverlay } from '@/components/ui';

const CATEGORIES = ['All', 'Rice', 'Oil', 'Dairy', 'Water', 'Snacks', 'Cleaning', 'Frozen'];

export default function ConsumerHome() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const { data: latestDeals, isLoading: loadingLatest, refetch: refetchLatest } = useQuery({
    queryKey: ['/api/latest-deals'],
    queryFn: async () => {
      const res = await api.get('/latest-deals');
      return res.data;
    },
  });

  const { data: trendingDeals, isLoading: loadingTrending, refetch: refetchTrending } = useQuery({
    queryKey: ['/api/deals/trending'],
    queryFn: async () => {
      const res = await api.get('/deals/trending');
      return res.data;
    },
  });

  const isLoading = loadingLatest && loadingTrending;
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchLatest(), refetchTrending()]);
    setRefreshing(false);
  };

  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      backgroundColor: colors.primary,
      paddingTop: topPad + 16,
      paddingBottom: 24,
      paddingHorizontal: 20,
    },
    greetingRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    greeting: {
      fontSize: 13,
      fontFamily: 'Inter_400Regular',
      color: 'rgba(255,255,255,0.8)',
    },
    userName: {
      fontSize: 20,
      fontFamily: 'Inter_700Bold',
      color: '#FFFFFF',
    },
    notifBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: 'rgba(255,255,255,0.2)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#FFFFFF',
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 10,
      gap: 8,
    },
    searchInput: {
      flex: 1,
      fontSize: 15,
      fontFamily: 'Inter_400Regular',
      color: colors.foreground,
    },
    body: { flex: 1 },
    section: { marginTop: 24 },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      marginBottom: 14,
    },
    sectionTitle: {
      fontSize: 17,
      fontFamily: 'Inter_700Bold',
      color: colors.foreground,
    },
    seeAll: {
      fontSize: 13,
      fontFamily: 'Inter_500Medium',
      color: colors.primary,
    },
    categoryList: {
      paddingHorizontal: 16,
    },
    categoryChip: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      marginRight: 8,
      borderWidth: 1.5,
    },
    categoryLabel: {
      fontSize: 13,
      fontFamily: 'Inter_500Medium',
    },
    horizontalList: {
      paddingHorizontal: 16,
    },
    trendingList: {
      paddingHorizontal: 20,
    },
    emptyContainer: { paddingTop: 40 },
    bottomPad: { height: Platform.OS === 'web' ? 34 : insets.bottom + 16 },
  });

  return (
    <View style={s.container}>
      <View style={s.header}>
        <View style={s.greetingRow}>
          <View>
            <Text style={s.greeting}>Good day,</Text>
            <Text style={s.userName}>{user?.name?.split(' ')[0] ?? 'Friend'}</Text>
          </View>
          <TouchableOpacity style={s.notifBtn}>
            <Ionicons name="notifications-outline" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        <View style={s.searchBar}>
          <Ionicons name="search" size={18} color={colors.secondary} />
          <TextInput
            style={s.searchInput}
            placeholder="Search deals, products..."
            placeholderTextColor={colors.secondary}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      <ScrollView
        style={s.body}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        <View style={s.section}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.categoryList}
          >
            {CATEGORIES.map((cat) => {
              const active = cat === selectedCategory;
              return (
                <TouchableOpacity
                  key={cat}
                  style={[
                    s.categoryChip,
                    {
                      backgroundColor: active ? colors.primary : colors.surface,
                      borderColor: active ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setSelectedCategory(cat)}
                >
                  <Text
                    style={[
                      s.categoryLabel,
                      { color: active ? '#FFFFFF' : colors.secondary },
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>Latest Deals</Text>
            <TouchableOpacity onPress={() => router.push('/(consumer)/deals' as any)}>
              <Text style={s.seeAll}>See all</Text>
            </TouchableOpacity>
          </View>

          {isLoading ? (
            <View style={s.emptyContainer}>
              <LoadingOverlay />
            </View>
          ) : !latestDeals?.length ? (
            <View style={s.emptyContainer}>
              <EmptyState icon="pricetag-outline" message="No active deals right now." />
            </View>
          ) : (
            <FlatList
              horizontal
              data={latestDeals}
              keyExtractor={(item: any) => String(item.id)}
              renderItem={({ item }) => (
                <DealCard deal={item} horizontal onPress={() => {}} />
              )}
              contentContainerStyle={s.horizontalList}
              showsHorizontalScrollIndicator={false}
              scrollEnabled={!!latestDeals?.length}
            />
          )}
        </View>

        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>Trending Now</Text>
            <Ionicons name="flame" size={18} color={colors.hot} />
          </View>

          {!trendingDeals?.length ? null : (
            <View style={s.trendingList}>
              {(trendingDeals as any[]).slice(0, 5).map((deal: any) => (
                <DealCard key={deal.id} deal={deal} onPress={() => {}} />
              ))}
            </View>
          )}
        </View>

        <View style={s.bottomPad} />
      </ScrollView>
    </View>
  );
}
