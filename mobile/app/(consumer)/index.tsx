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
import { useRouter, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/services/api';
import { useAuth } from '@/hooks/useAuth';
import { useColors } from '@/hooks/useColors';
import { DealCard } from '@/components/DealCard';
import { EmptyState, LoadingOverlay } from '@/components/ui';
import type { Deal } from '@/types/models';

const CATEGORIES = ['All', 'Rice', 'Oil', 'Dairy', 'Water', 'Snacks', 'Cleaning', 'Frozen'];

interface UpcomingDeal {
  id: number;
  product_title?: string;
  product_brand?: string;
  price_per_unit: number;
  target_quantity: number;
  start_time?: string;
}

export default function ConsumerHome() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [refreshing, setRefreshing] = useState(false);

  const { data: latestDeals, isLoading: loadingLatest, refetch: refetchLatest } = useQuery<Deal[]>({
    queryKey: ['/api/latest-deals'],
    queryFn: async () => {
      const res = await api.get<Deal[]>('/latest-deals');
      return res.data;
    },
  });

  const { data: trendingDeals, isLoading: loadingTrending, refetch: refetchTrending } = useQuery<Deal[]>({
    queryKey: ['/api/deals/trending'],
    queryFn: async () => {
      const res = await api.get<Deal[]>('/deals/trending');
      return res.data;
    },
  });

  const { data: upcomingDeals, refetch: refetchUpcoming } = useQuery<UpcomingDeal[]>({
    queryKey: ['/api/upcoming-deals'],
    queryFn: async () => {
      const res = await api.get<UpcomingDeal[]>('/upcoming-deals');
      return res.data;
    },
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchLatest(), refetchTrending(), refetchUpcoming()]);
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
    greeting: { fontSize: 13, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.8)' },
    userName: { fontSize: 20, fontFamily: 'Inter_700Bold', color: '#FFFFFF' },
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
    sectionTitle: { fontSize: 17, fontFamily: 'Inter_700Bold', color: colors.foreground },
    seeAll: { fontSize: 13, fontFamily: 'Inter_500Medium', color: colors.primary },
    categoryList: { paddingHorizontal: 16 },
    categoryChip: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      marginRight: 8,
      borderWidth: 1.5,
    },
    categoryLabel: { fontSize: 13, fontFamily: 'Inter_500Medium' },
    horizontalList: { paddingHorizontal: 16 },
    trendingList: { paddingHorizontal: 20 },
    emptyContainer: { paddingTop: 40 },
    upcomingCard: {
      backgroundColor: colors.card,
      borderRadius: 12,
      marginRight: 14,
      padding: 14,
      width: 180,
      borderLeftWidth: 3,
      borderLeftColor: colors.accent,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 4,
      elevation: 2,
    },
    upcomingBadge: {
      backgroundColor: colors.accent + '20',
      alignSelf: 'flex-start',
      borderRadius: 6,
      paddingHorizontal: 6,
      paddingVertical: 2,
      marginBottom: 8,
    },
    upcomingBadgeText: { fontSize: 9, fontFamily: 'Inter_700Bold', color: colors.accent },
    upcomingTitle: {
      fontSize: 13,
      fontFamily: 'Inter_600SemiBold',
      color: colors.foreground,
      marginBottom: 4,
    },
    upcomingPrice: { fontSize: 15, fontFamily: 'Inter_700Bold', color: colors.primary },
    upcomingMeta: { fontSize: 11, fontFamily: 'Inter_400Regular', color: colors.secondary, marginTop: 4 },
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
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
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
            <TouchableOpacity onPress={() => router.push('/(consumer)/deals' as Href)}>
              <Text style={s.seeAll}>See all</Text>
            </TouchableOpacity>
          </View>

          {loadingLatest ? (
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
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item }) => (
                <DealCard
                  deal={item}
                  horizontal
                  onPress={() => router.push(`/deal/${item.id}` as Href)}
                />
              )}
              contentContainerStyle={s.horizontalList}
              showsHorizontalScrollIndicator={false}
              scrollEnabled
            />
          )}
        </View>

        {(upcomingDeals?.length ?? 0) > 0 && (
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>Coming Soon</Text>
              <Ionicons name="time-outline" size={18} color={colors.accent} />
            </View>
            <FlatList
              horizontal
              data={upcomingDeals}
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item }) => (
                <View style={s.upcomingCard}>
                  <View style={s.upcomingBadge}>
                    <Text style={s.upcomingBadgeText}>UPCOMING</Text>
                  </View>
                  <Text style={s.upcomingTitle} numberOfLines={2}>
                    {item.product_title ?? 'Upcoming Deal'}
                  </Text>
                  <Text style={s.upcomingPrice}>
                    KWD {Number(item.price_per_unit).toFixed(3)}
                  </Text>
                  {item.start_time && (
                    <Text style={s.upcomingMeta}>
                      Starts {new Date(item.start_time).toLocaleDateString('en-KW', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </Text>
                  )}
                </View>
              )}
              contentContainerStyle={s.horizontalList}
              showsHorizontalScrollIndicator={false}
              scrollEnabled
            />
          </View>
        )}

        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>Trending Now</Text>
            <Ionicons name="flame" size={18} color={colors.hot} />
          </View>

          {loadingTrending ? (
            <View style={s.emptyContainer}>
              <LoadingOverlay />
            </View>
          ) : !trendingDeals?.length ? (
            <View style={s.emptyContainer}>
              <EmptyState icon="trending-up-outline" message="No trending deals yet." />
            </View>
          ) : (
            <View style={s.trendingList}>
              {trendingDeals.slice(0, 5).map((deal) => (
                <DealCard
                  key={deal.id}
                  deal={deal}
                  onPress={() => router.push(`/deal/${deal.id}` as Href)}
                />
              ))}
            </View>
          )}
        </View>

        <View style={s.bottomPad} />
      </ScrollView>
    </View>
  );
}
