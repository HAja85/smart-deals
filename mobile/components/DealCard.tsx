import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { Badge } from '@/components/Badge';
import type { Deal } from '@/types/models';

interface DealCardProps {
  deal: Deal;
  horizontal?: boolean;
  showStatus?: boolean;
  onPress: () => void;
}

function useCountdown(endTime: string | null | undefined): string {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    if (!endTime) return;

    const calc = () => {
      const end = new Date(endTime).getTime();
      const now = Date.now();
      const diff = end - now;

      if (diff <= 0) {
        setTimeLeft('Ended');
        return;
      }

      const days = Math.floor(diff / 86_400_000);
      const hours = Math.floor((diff % 86_400_000) / 3_600_000);
      const mins = Math.floor((diff % 3_600_000) / 60_000);

      if (days > 0) {
        setTimeLeft(`${days}d ${hours}h`);
      } else if (hours > 0) {
        setTimeLeft(`${hours}h ${mins}m`);
      } else {
        setTimeLeft(`${mins}m`);
      }
    };

    calc();
    const timer = setInterval(calc, 60_000);
    return () => clearInterval(timer);
  }, [endTime]);

  return timeLeft;
}

const STATUS_COLORS: Record<string, string> = {
  Active: '#34699A',
  Successful: '#10B981',
  Failed: '#EF4444',
};

export function DealCard({ deal, horizontal, showStatus, onPress }: DealCardProps) {
  const colors = useColors();
  const timeLeft = useCountdown(deal.end_time);

  const currentQty = deal.current_quantity ?? 0;
  const targetQty = deal.target_quantity ?? 1;
  const progress = Math.min(currentQty / targetQty, 1);
  const isHot = progress >= 0.8;
  const isAlmostFull = progress >= 0.6 && progress < 0.8;

  const pricePerUnit = Number(deal.price_per_unit ?? 0);
  const actualPrice = Number(deal.actual_price ?? deal.price_per_unit ?? 0);
  const savings = actualPrice - pricePerUnit;
  const savingsPct = actualPrice > 0 ? Math.round((savings / actualPrice) * 100) : 0;

  const title = deal.product?.title ?? deal.product_title ?? deal.title ?? 'Deal';
  const brand = deal.product?.brand ?? deal.product_brand ?? deal.brand ?? '';
  const image = deal.product?.image ?? deal.product_image ?? deal.image ?? null;
  const statusColor = STATUS_COLORS[deal.status] ?? colors.secondary;

  const progressColor = isHot ? colors.hot : isAlmostFull ? colors.almostFull : colors.primary;

  if (horizontal) {
    const s = StyleSheet.create({
      card: {
        width: 200,
        backgroundColor: colors.card,
        borderRadius: 16,
        marginRight: 14,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
        overflow: 'hidden',
      },
      imagePlaceholder: {
        width: '100%',
        height: 110,
        backgroundColor: colors.primary + '15',
        justifyContent: 'center',
        alignItems: 'center',
      },
      image: { width: '100%', height: 110 },
      body: { padding: 12 },
      title: {
        fontSize: 14,
        fontFamily: 'Inter_600SemiBold',
        color: colors.foreground,
        marginBottom: 2,
      },
      brand: { fontSize: 11, fontFamily: 'Inter_400Regular', color: colors.secondary, marginBottom: 8 },
      price: { fontSize: 16, fontFamily: 'Inter_700Bold', color: colors.primary },
      priceUnit: { fontSize: 11, fontFamily: 'Inter_400Regular', color: colors.secondary },
      progressBg: {
        height: 4,
        backgroundColor: colors.border,
        borderRadius: 2,
        marginTop: 8,
        marginBottom: 6,
        overflow: 'hidden',
      },
      progressFill: { height: '100%', borderRadius: 2 },
      progressText: { fontSize: 10, fontFamily: 'Inter_400Regular', color: colors.secondary },
      badgeRow: { flexDirection: 'row', gap: 4, position: 'absolute', top: 8, left: 8 },
      badge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
      },
      badgeText: { fontSize: 9, fontFamily: 'Inter_700Bold', color: '#FFFFFF' },
    });

    return (
      <TouchableOpacity style={s.card} activeOpacity={0.85} onPress={onPress}>
        <View>
          {image ? (
            <Image source={{ uri: image }} style={s.image} resizeMode="cover" />
          ) : (
            <View style={s.imagePlaceholder}>
              <Ionicons name="cube-outline" size={40} color={colors.primary} />
            </View>
          )}
          <View style={s.badgeRow}>
            {isHot && (
              <Badge label="HOT" variant="hot" icon="flame" size="xs" />
            )}
            {isAlmostFull && !isHot && (
              <Badge label="ALMOST FULL" variant="warning" size="xs" filled />
            )}
          </View>
        </View>
        <View style={s.body}>
          <Text style={s.title} numberOfLines={1}>{title}</Text>
          <Text style={s.brand}>{brand}</Text>
          <Text style={s.price}>KWD {pricePerUnit.toFixed(3)}</Text>
          {actualPrice > pricePerUnit && (
            <Text style={s.priceUnit}>Save {savingsPct}%</Text>
          )}
          <View style={s.progressBg}>
            <View
              style={[
                s.progressFill,
                { width: `${progress * 100}%`, backgroundColor: progressColor },
              ]}
            />
          </View>
          <Text style={s.progressText}>{currentQty}/{targetQty} ordered</Text>
        </View>
      </TouchableOpacity>
    );
  }

  const s = StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      borderRadius: 14,
      marginBottom: 14,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 6,
      elevation: 2,
      overflow: 'hidden',
    },
    row: { flexDirection: 'row', padding: 14, gap: 12 },
    imagePlaceholder: {
      width: 72,
      height: 72,
      borderRadius: 10,
      backgroundColor: colors.primary + '15',
      justifyContent: 'center',
      alignItems: 'center',
    },
    image: { width: 72, height: 72, borderRadius: 10 },
    content: { flex: 1 },
    topRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    title: {
      flex: 1,
      fontSize: 15,
      fontFamily: 'Inter_600SemiBold',
      color: colors.foreground,
      marginRight: 8,
    },
    timerBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      backgroundColor: colors.muted,
      paddingHorizontal: 6,
      paddingVertical: 3,
      borderRadius: 6,
    },
    timerText: { fontSize: 10, fontFamily: 'Inter_500Medium', color: colors.secondary },
    brand: {
      fontSize: 12,
      fontFamily: 'Inter_400Regular',
      color: colors.secondary,
      marginTop: 2,
      marginBottom: 8,
    },
    priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
    price: { fontSize: 18, fontFamily: 'Inter_700Bold', color: colors.primary },
    originalPrice: {
      fontSize: 12,
      fontFamily: 'Inter_400Regular',
      color: colors.secondary,
      textDecorationLine: 'line-through',
    },
    progressSection: { paddingHorizontal: 14, paddingBottom: 14 },
    progressBg: {
      height: 6,
      backgroundColor: colors.border,
      borderRadius: 3,
      marginBottom: 6,
      overflow: 'hidden',
    },
    progressFill: { height: '100%', borderRadius: 3 },
    progressRow: { flexDirection: 'row', justifyContent: 'space-between' },
    progressText: { fontSize: 11, fontFamily: 'Inter_400Regular', color: colors.secondary },
    badgeRow: { flexDirection: 'row', gap: 6, marginBottom: 4 },
    badge: {
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: 6,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
    },
    badgeText: { fontSize: 10, fontFamily: 'Inter_700Bold', color: '#FFFFFF' },
    statusDot: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
      backgroundColor: statusColor + '20',
    },
    statusText: { fontSize: 11, fontFamily: 'Inter_600SemiBold', color: statusColor },
    savingsBadge: {
      position: 'absolute',
      top: 14,
      right: 14,
      backgroundColor: colors.accent,
      borderRadius: 8,
      paddingHorizontal: 6,
      paddingVertical: 3,
    },
    savingsText: { fontSize: 10, fontFamily: 'Inter_700Bold', color: '#FFFFFF' },
  });

  return (
    <TouchableOpacity style={s.card} activeOpacity={0.85} onPress={onPress}>
      <View style={s.row}>
        {image ? (
          <Image source={{ uri: image }} style={s.image} resizeMode="cover" />
        ) : (
          <View style={s.imagePlaceholder}>
            <Ionicons name="cube-outline" size={28} color={colors.primary} />
          </View>
        )}
        <View style={s.content}>
          <View style={s.topRow}>
            <Text style={s.title} numberOfLines={2}>{title}</Text>
            {timeLeft ? (
              <View style={s.timerBadge}>
                <Ionicons name="time-outline" size={10} color={colors.secondary} />
                <Text style={s.timerText}>{timeLeft}</Text>
              </View>
            ) : null}
          </View>
          <Text style={s.brand}>{brand}</Text>

          {(isHot || isAlmostFull || showStatus) && (
            <View style={s.badgeRow}>
              {isHot && (
                <Badge label="HOT" variant="hot" icon="flame" size="xs" />
              )}
              {isAlmostFull && !isHot && (
                <Badge label="ALMOST FULL" variant="warning" size="xs" filled />
              )}
              {showStatus && (
                <Badge
                  label={deal.status}
                  variant={
                    deal.status === 'Active'
                      ? 'primary'
                      : deal.status === 'Successful'
                      ? 'success'
                      : 'error'
                  }
                  size="xs"
                />
              )}
            </View>
          )}

          <View style={s.priceRow}>
            <Text style={s.price}>KWD {pricePerUnit.toFixed(3)}</Text>
            {actualPrice > pricePerUnit && (
              <Text style={s.originalPrice}>KWD {actualPrice.toFixed(3)}</Text>
            )}
          </View>
        </View>
      </View>

      {actualPrice > pricePerUnit && savingsPct > 0 && (
        <View style={s.savingsBadge}>
          <Text style={s.savingsText}>-{savingsPct}%</Text>
        </View>
      )}

      <View style={s.progressSection}>
        <View style={s.progressBg}>
          <View
            style={[
              s.progressFill,
              { width: `${progress * 100}%`, backgroundColor: progressColor },
            ]}
          />
        </View>
        <View style={s.progressRow}>
          <Text style={s.progressText}>{currentQty} of {targetQty} ordered</Text>
          <Text style={s.progressText}>{Math.round(progress * 100)}%</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}
