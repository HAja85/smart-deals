import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter, type Href, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { api } from '@/services/api';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/hooks/useAuth';
import { DealCard } from '@/components/DealCard';
import { Badge } from '@/components/Badge';
import { PrimaryButton, EmptyState } from '@/components/ui';
import type { Deal } from '@/types/models';
import { getApiError } from '@/types/models';

function useCountdown(endTime: string | undefined): string {
  const [timeLeft, setTimeLeft] = React.useState('');
  React.useEffect(() => {
    if (!endTime) return;
    const calc = () => {
      const diff = new Date(endTime).getTime() - Date.now();
      if (diff <= 0) { setTimeLeft('Ended'); return; }
      const d = Math.floor(diff / 86_400_000);
      const h = Math.floor((diff % 86_400_000) / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      if (d > 0) setTimeLeft(`${d}d ${h}h left`);
      else if (h > 0) setTimeLeft(`${h}h ${m}m left`);
      else setTimeLeft(`${m}m left`);
    };
    calc();
    const t = setInterval(calc, 60_000);
    return () => clearInterval(t);
  }, [endTime]);
  return timeLeft;
}

export default function DealDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [qty, setQty] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);

  const { data: deal, isLoading } = useQuery<Deal>({
    queryKey: ['/api/deals', id],
    queryFn: async () => {
      const res = await api.get<Deal>(`/deals/${id}`);
      return res.data;
    },
    enabled: !!id,
  });

  const { data: related } = useQuery<Deal[]>({
    queryKey: ['/api/deals/related', id],
    queryFn: async () => {
      const res = await api.get<Deal[]>(`/deals/related/${id}`);
      return res.data;
    },
    enabled: !!id && !!deal,
  });

  useFocusEffect(useCallback(() => {
    if (id) {
      api.post(`/deals/${id}/view`).catch(() => {});
    }
  }, [id]));

  const timeLeft = useCountdown(deal?.end_time);

  const handleAddToCart = async () => {
    if (!user) {
      router.push('/(auth)/login' as Href);
      return;
    }
    if (user.role !== 'consumer') {
      Alert.alert('Consumers Only', 'Only consumers can add items to cart.');
      return;
    }
    setAddingToCart(true);
    try {
      await api.post('/cart', { deal_id: Number(id), quantity: qty });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setAddedToCart(true);
      queryClient.invalidateQueries({ queryKey: ['/api/cart'] });
      setTimeout(() => setAddedToCart(false), 3000);
    } catch (err: unknown) {
      Alert.alert('Error', getApiError(err, 'Failed to add to cart.'));
    } finally {
      setAddingToCart(false);
    }
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!deal) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <EmptyState icon="alert-circle-outline" message="Deal not found." />
      </View>
    );
  }

  const title = deal.product?.title ?? deal.product_title ?? deal.title ?? 'Deal';
  const brand = deal.product?.brand ?? deal.product_brand ?? deal.brand ?? '';
  const image = deal.product?.image ?? deal.product_image ?? deal.image ?? null;
  const description = deal.product?.description ?? '';
  const unit = deal.product?.unit ?? '';
  const category = deal.product?.category ?? deal.category ?? '';
  const pricePerUnit = Number(deal.price_per_unit ?? 0);
  const actualPrice = Number(deal.actual_price ?? pricePerUnit);
  const discountPct = deal.discount_percent ?? (actualPrice > pricePerUnit ? Math.round(((actualPrice - pricePerUnit) / actualPrice) * 100) : 0);
  const currentQty = deal.current_quantity ?? 0;
  const targetQty = deal.target_quantity ?? 1;
  const progress = Math.min(currentQty / targetQty, 1);
  const progressPct = deal.progress_percent ?? Math.round(progress * 100);
  const isHot = progress >= 0.8;
  const isAlmostFull = progress >= 0.6 && progress < 0.8;
  const lineTotal = (pricePerUnit * qty).toFixed(3);
  const isActive = deal.status === 'Active';

  const progressColor = isHot ? colors.hot : isAlmostFull ? colors.almostFull : colors.primary;

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    hero: { width: '100%', height: 240, backgroundColor: colors.muted },
    heroPlaceholder: {
      width: '100%',
      height: 240,
      backgroundColor: colors.primary + '15',
      justifyContent: 'center',
      alignItems: 'center',
    },
    badgeRow: {
      position: 'absolute',
      top: 12,
      left: 12,
      flexDirection: 'row',
      gap: 6,
    },
    viewBadge: {
      position: 'absolute',
      top: 12,
      right: 12,
      backgroundColor: 'rgba(0,0,0,0.55)',
      borderRadius: 12,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 4,
      gap: 4,
    },
    viewBadgeText: { fontSize: 11, fontFamily: 'Inter_500Medium', color: '#FFFFFF' },
    body: { padding: 20 },
    titleText: {
      fontSize: 22,
      fontFamily: 'Inter_700Bold',
      color: colors.foreground,
      marginBottom: 4,
    },
    brandText: {
      fontSize: 14,
      fontFamily: 'Inter_400Regular',
      color: colors.secondary,
      marginBottom: 4,
    },
    catRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
    priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10, marginBottom: 16 },
    priceMain: { fontSize: 28, fontFamily: 'Inter_700Bold', color: colors.primary },
    priceOrig: {
      fontSize: 16,
      fontFamily: 'Inter_400Regular',
      color: colors.secondary,
      textDecorationLine: 'line-through',
    },
    discountBadge: {
      backgroundColor: colors.accent,
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    discountText: { fontSize: 12, fontFamily: 'Inter_700Bold', color: '#FFFFFF' },
    progressSection: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
    },
    progressHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 10,
    },
    progressLabel: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: colors.foreground },
    progressPct: { fontSize: 14, fontFamily: 'Inter_700Bold', color: progressColor },
    progressBg: {
      height: 10,
      backgroundColor: colors.border,
      borderRadius: 5,
      overflow: 'hidden',
      marginBottom: 8,
    },
    progressFill: { height: '100%', borderRadius: 5 },
    progressRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    progressSub: { fontSize: 12, fontFamily: 'Inter_400Regular', color: colors.secondary },
    timerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 20,
    },
    timerText: {
      fontSize: 14,
      fontFamily: 'Inter_600SemiBold',
      color: colors.secondary,
    },
    stepperSection: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
    },
    stepperLabel: {
      fontSize: 14,
      fontFamily: 'Inter_600SemiBold',
      color: colors.foreground,
      marginBottom: 12,
    },
    stepperRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    stepperControls: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    stepperBtn: {
      width: 38,
      height: 38,
      borderRadius: 10,
      backgroundColor: colors.muted,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    stepperNum: { fontSize: 20, fontFamily: 'Inter_700Bold', color: colors.foreground, minWidth: 28, textAlign: 'center' },
    lineTotal: { fontSize: 18, fontFamily: 'Inter_700Bold', color: colors.primary },
    inactiveNote: {
      backgroundColor: '#FEF2F2',
      borderRadius: 10,
      padding: 12,
      marginBottom: 16,
      borderLeftWidth: 3,
      borderLeftColor: colors.error,
    },
    inactiveText: { fontSize: 13, fontFamily: 'Inter_500Medium', color: colors.error },
    descSection: { marginBottom: 20 },
    sectionTitle: {
      fontSize: 16,
      fontFamily: 'Inter_700Bold',
      color: colors.foreground,
      marginBottom: 10,
    },
    descText: { fontSize: 14, fontFamily: 'Inter_400Regular', color: colors.secondary, lineHeight: 22 },
    infoCard: { backgroundColor: colors.card, borderRadius: 12, marginBottom: 20 },
    infoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    infoRowLast: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    infoLabel: { fontSize: 14, fontFamily: 'Inter_400Regular', color: colors.secondary },
    infoValue: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: colors.foreground, textAlign: 'right', flex: 1, marginLeft: 16 },
    relatedSection: { marginBottom: 20 },
    relatedList: { gap: 0 },
    addedBanner: {
      backgroundColor: '#ECFDF5',
      borderRadius: 10,
      padding: 12,
      marginBottom: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      borderWidth: 1,
      borderColor: '#A7F3D0',
    },
    addedText: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: '#047857' },
    bottomPad: { height: Platform.OS === 'ios' ? insets.bottom + 16 : 24 },
  });

  return (
    <View style={s.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View>
          {image ? (
            <Image source={{ uri: image }} style={s.hero} resizeMode="cover" />
          ) : (
            <View style={s.heroPlaceholder}>
              <Ionicons name="cube-outline" size={64} color={colors.primary} />
            </View>
          )}
          <View style={s.badgeRow}>
            {isHot && <Badge label="🔥 HOT" variant="hot" size="sm" />}
            {isAlmostFull && !isHot && <Badge label="⚡ ALMOST FULL" variant="warning" size="sm" filled />}
          </View>
          {(deal.view_count ?? 0) > 0 && (
            <View style={s.viewBadge}>
              <Ionicons name="eye" size={12} color="#FFFFFF" />
              <Text style={s.viewBadgeText}>{deal.view_count} views</Text>
            </View>
          )}
        </View>

        <View style={s.body}>
          <Text style={s.titleText}>{title}</Text>
          <Text style={s.brandText}>{brand}{unit ? ` · ${unit}` : ''}</Text>

          <View style={s.catRow}>
            {category ? <Badge label={category} variant="info" size="xs" /> : null}
            {deal.status !== 'Active' && <Badge label={deal.status} variant={deal.status === 'Successful' ? 'success' : 'error'} size="xs" />}
          </View>

          <View style={s.priceRow}>
            <Text style={s.priceMain}>KWD {pricePerUnit.toFixed(3)}</Text>
            {actualPrice > pricePerUnit && (
              <Text style={s.priceOrig}>KWD {actualPrice.toFixed(3)}</Text>
            )}
            {discountPct > 0 && (
              <View style={s.discountBadge}>
                <Text style={s.discountText}>-{discountPct}%</Text>
              </View>
            )}
          </View>

          <View style={s.progressSection}>
            <View style={s.progressHeader}>
              <Text style={s.progressLabel}>Group Progress</Text>
              <Text style={s.progressPct}>{progressPct}% filled</Text>
            </View>
            <View style={s.progressBg}>
              <View style={[s.progressFill, { width: `${progressPct}%`, backgroundColor: progressColor }]} />
            </View>
            <View style={s.progressRow}>
              <Text style={s.progressSub}>{currentQty} of {targetQty} units ordered</Text>
              <Text style={s.progressSub}>{targetQty - currentQty} remaining</Text>
            </View>
          </View>

          {timeLeft ? (
            <View style={s.timerRow}>
              <Ionicons name="time-outline" size={16} color={colors.secondary} />
              <Text style={s.timerText}>{timeLeft}</Text>
            </View>
          ) : null}

          {!isActive && (
            <View style={s.inactiveNote}>
              <Text style={s.inactiveText}>
                {deal.status === 'Successful' ? '✅ This deal reached its target!' :
                 deal.status === 'Failed' ? '❌ This deal did not reach its target.' :
                 'This deal is no longer active.'}
              </Text>
            </View>
          )}

          {addedToCart && (
            <View style={s.addedBanner}>
              <Ionicons name="checkmark-circle" size={18} color="#047857" />
              <Text style={s.addedText}>Added to cart!</Text>
            </View>
          )}

          {isActive && (
            <View style={s.stepperSection}>
              <Text style={s.stepperLabel}>Select Quantity</Text>
              <View style={s.stepperRow}>
                <View style={s.stepperControls}>
                  <TouchableOpacity
                    style={s.stepperBtn}
                    onPress={() => { if (qty > 1) { setQty(qty - 1); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } }}
                  >
                    <Ionicons name="remove" size={18} color={colors.foreground} />
                  </TouchableOpacity>
                  <Text style={s.stepperNum}>{qty}</Text>
                  <TouchableOpacity
                    style={s.stepperBtn}
                    onPress={() => { setQty(qty + 1); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                  >
                    <Ionicons name="add" size={18} color={colors.foreground} />
                  </TouchableOpacity>
                </View>
                <Text style={s.lineTotal}>KWD {lineTotal}</Text>
              </View>
            </View>
          )}

          {isActive && (
            <PrimaryButton
              label={addingToCart ? 'Adding...' : addedToCart ? '✓ Added to Cart' : 'Add to Cart'}
              onPress={handleAddToCart}
              loading={addingToCart}
              disabled={addedToCart}
              style={{ marginBottom: 12 }}
            />
          )}

          {isActive && (
            <PrimaryButton
              label="View Cart"
              variant="outline"
              onPress={() => router.push('/(consumer)/cart' as Href)}
              style={{ marginBottom: 20 }}
            />
          )}

          {description ? (
            <View style={s.descSection}>
              <Text style={s.sectionTitle}>About this Product</Text>
              <Text style={s.descText}>{description}</Text>
            </View>
          ) : null}

          <Text style={s.sectionTitle}>Deal Information</Text>
          <View style={s.infoCard}>
            <View style={s.infoRow}>
              <Text style={s.infoLabel}>Price per unit</Text>
              <Text style={s.infoValue}>KWD {pricePerUnit.toFixed(3)}</Text>
            </View>
            {actualPrice > pricePerUnit && (
              <View style={s.infoRow}>
                <Text style={s.infoLabel}>Original price</Text>
                <Text style={s.infoValue}>KWD {actualPrice.toFixed(3)}</Text>
              </View>
            )}
            <View style={s.infoRow}>
              <Text style={s.infoLabel}>Target quantity</Text>
              <Text style={s.infoValue}>{targetQty} units</Text>
            </View>
            <View style={s.infoRow}>
              <Text style={s.infoLabel}>Ordered so far</Text>
              <Text style={s.infoValue}>{currentQty} units</Text>
            </View>
            {deal.end_time && (
              <View style={s.infoRow}>
                <Text style={s.infoLabel}>Deal ends</Text>
                <Text style={s.infoValue}>
                  {new Date(deal.end_time).toLocaleDateString('en-KW', {
                    day: 'numeric', month: 'short', year: 'numeric',
                  })}
                </Text>
              </View>
            )}
            <View style={s.infoRowLast}>
              <Text style={s.infoLabel}>Status</Text>
              <Text style={s.infoValue}>{deal.status}</Text>
            </View>
          </View>

          {(related?.length ?? 0) > 0 && (
            <View style={s.relatedSection}>
              <Text style={s.sectionTitle}>Related Deals</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {related!.map((item) => (
                  <DealCard
                    key={item.id}
                    deal={item}
                    horizontal
                    onPress={() => router.push(`/deal/${item.id}` as Href)}
                  />
                ))}
              </ScrollView>
            </View>
          )}

          <View style={s.bottomPad} />
        </View>
      </ScrollView>
    </View>
  );
}
