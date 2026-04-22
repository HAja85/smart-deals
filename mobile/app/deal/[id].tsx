import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import { useColors } from '@/hooks/useColors';
import { DealCard } from '@/components/DealCard';
import { PrimaryButton, EmptyState } from '@/components/ui';
import type { Deal } from '@/types/models';

export default function DealDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const { data: deal, isLoading, error } = useQuery<Deal>({
    queryKey: ['/api/deals', id],
    queryFn: async () => {
      const res = await api.get<Deal>(`/deals/${id}`);
      api.post(`/deals/${id}/view`).catch(() => {});
      return res.data;
    },
    enabled: !!id,
  });

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scrollContent: {
      padding: 20,
      paddingBottom: Platform.OS === 'ios' ? insets.bottom + 24 : 32,
    },
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    sectionTitle: {
      fontSize: 16,
      fontFamily: 'Inter_700Bold',
      color: colors.foreground,
      marginTop: 20,
      marginBottom: 10,
    },
    infoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    infoLabel: {
      fontSize: 14,
      fontFamily: 'Inter_400Regular',
      color: colors.secondary,
    },
    infoValue: {
      fontSize: 14,
      fontFamily: 'Inter_600SemiBold',
      color: colors.foreground,
    },
  });

  if (isLoading) {
    return (
      <View style={s.loader}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error || !deal) {
    return (
      <View style={s.container}>
        <EmptyState icon="alert-circle-outline" message="Deal not found." />
      </View>
    );
  }

  return (
    <View style={s.container}>
      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        <DealCard deal={deal} onPress={() => {}} />

        <Text style={s.sectionTitle}>Deal Details</Text>
        <View style={s.infoRow}>
          <Text style={s.infoLabel}>Status</Text>
          <Text style={s.infoValue}>{deal.status}</Text>
        </View>
        <View style={s.infoRow}>
          <Text style={s.infoLabel}>Price per Unit</Text>
          <Text style={s.infoValue}>KWD {Number(deal.price_per_unit).toFixed(3)}</Text>
        </View>
        {deal.actual_price != null && deal.actual_price > deal.price_per_unit && (
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>Original Price</Text>
            <Text style={s.infoValue}>KWD {Number(deal.actual_price).toFixed(3)}</Text>
          </View>
        )}
        <View style={s.infoRow}>
          <Text style={s.infoLabel}>Target Qty</Text>
          <Text style={s.infoValue}>{deal.target_quantity} units</Text>
        </View>
        <View style={s.infoRow}>
          <Text style={s.infoLabel}>Current Qty</Text>
          <Text style={s.infoValue}>{deal.current_quantity} units</Text>
        </View>
        {deal.end_time && (
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>Ends</Text>
            <Text style={s.infoValue}>
              {new Date(deal.end_time).toLocaleDateString('en-KW', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>
        )}

        <PrimaryButton
          label="Add to Cart"
          onPress={() => {}}
          style={{ marginTop: 24 }}
        />
      </ScrollView>
    </View>
  );
}
