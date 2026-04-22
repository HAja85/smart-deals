import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/services/api';
import { useColors } from '@/hooks/useColors';
import { ScreenHeader } from '@/components/ui';
import type { Deal, Order } from '@/types/models';
import { getApiError as apiErr } from '@/types/models';

interface DealsResponse {
  deals?: Deal[];
}

interface OrdersResponse {
  orders?: Order[];
}

const PERIODS: { label: string; days: number }[] = [
  { label: '7D', days: 7 },
  { label: '30D', days: 30 },
  { label: '90D', days: 90 },
  { label: '1Y', days: 365 },
];

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

interface MetricTileProps {
  label: string;
  value: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
}

function MetricTile({ label, value, icon, color }: MetricTileProps) {
  const colors = useColors();
  const s = StyleSheet.create({
    tile: {
      flex: 1,
      minWidth: '45%',
      backgroundColor: colors.card,
      borderRadius: 14,
      padding: 16,
      margin: 6,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 6,
      elevation: 3,
    },
    iconRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
    },
    iconWrap: {
      width: 38,
      height: 38,
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
    },
    value: { fontSize: 22, fontFamily: 'Inter_700Bold', color: colors.foreground },
    label: {
      fontSize: 12,
      fontFamily: 'Inter_400Regular',
      color: colors.secondary,
      marginTop: 2,
    },
  });

  return (
    <View style={s.tile}>
      <View style={s.iconRow}>
        <View style={[s.iconWrap, { backgroundColor: color + '20' }]}>
          <Ionicons name={icon} size={18} color={color} />
        </View>
      </View>
      <Text style={s.value}>{value}</Text>
      <Text style={s.label}>{label}</Text>
    </View>
  );
}

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [periodIdx, setPeriodIdx] = useState(1);
  const [downloading, setDownloading] = useState(false);

  const fromDate = daysAgo(PERIODS[periodIdx].days);
  const toDate = todayStr();

  const { data: ordersData } = useQuery<Order[]>({
    queryKey: ['/api/orders/supplier-orders'],
    queryFn: async () => {
      const res = await api.get<Order[] | OrdersResponse>('/orders/supplier-orders');
      if (Array.isArray(res.data)) return res.data;
      return (res.data as OrdersResponse).orders ?? [];
    },
  });

  const { data: dealsData } = useQuery<Deal[]>({
    queryKey: ['/api/deals/my-deals'],
    queryFn: async () => {
      const res = await api.get<Deal[] | DealsResponse>('/deals/my-deals');
      if (Array.isArray(res.data)) return res.data;
      return (res.data as DealsResponse).deals ?? [];
    },
  });

  const ordersList: Order[] = ordersData ?? [];
  const dealsList: Deal[] = dealsData ?? [];

  const capturedOrders = ordersList.filter((o) => o.payment_status === 'Captured');
  const revenue = capturedOrders.reduce(
    (sum, o) => sum + Number(o.total_amount ?? 0),
    0
  );
  const unitsSold = capturedOrders.reduce(
    (sum, o) => sum + Number(o.quantity ?? 0),
    0
  );
  const successRate =
    dealsList.length > 0
      ? Math.round(
          (dealsList.filter((d) => d.status === 'Successful').length /
            dealsList.length) *
            100
        )
      : 0;

  const handleDownloadReport = () => {
    Alert.alert(
      'Download Report',
      `Accounting report for ${PERIODS[periodIdx].label} will be generated.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Download',
          onPress: async () => {
            setDownloading(true);
            try {
              await api.get(
                `/reports/supplier?from=${fromDate}&to=${toDate}`
              );
              Alert.alert(
                'Report Generated',
                'The PDF report has been requested.'
              );
            } catch (err: unknown) {
              Alert.alert('Error', apiErr(err, 'Failed to generate report.'));
            } finally {
              setDownloading(false);
            }
          },
        },
      ]
    );
  };

  const STATUS_COLORS: Record<string, string> = {
    Active: colors.primary,
    Successful: colors.success,
    Failed: colors.error,
  };

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    periodRow: {
      flexDirection: 'row',
      paddingHorizontal: 20,
      paddingVertical: 16,
      gap: 8,
    },
    periodBtn: {
      flex: 1,
      paddingVertical: 8,
      borderRadius: 8,
      alignItems: 'center',
      borderWidth: 1.5,
    },
    periodLabel: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
    metricsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      paddingHorizontal: 10,
    },
    section: { paddingHorizontal: 20, marginTop: 20 },
    sectionTitle: {
      fontSize: 16,
      fontFamily: 'Inter_700Bold',
      color: colors.foreground,
      marginBottom: 12,
    },
    reportBtn: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
      gap: 8,
    },
    reportBtnText: {
      fontSize: 15,
      fontFamily: 'Inter_600SemiBold',
      color: '#FFFFFF',
    },
    dealRow: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 14,
      marginBottom: 10,
      flexDirection: 'row',
      alignItems: 'center',
    },
    dealTitle: {
      flex: 1,
      fontSize: 14,
      fontFamily: 'Inter_500Medium',
      color: colors.foreground,
    },
    dealStatus: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
    bottomPad: { height: Platform.OS === 'web' ? 34 : insets.bottom + 24 },
  });

  return (
    <View style={s.container}>
      <ScreenHeader title="Dashboard" subtitle="Profits & Analytics" />

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={s.periodRow}>
          {PERIODS.map((p, i) => (
            <TouchableOpacity
              key={p.label}
              style={[
                s.periodBtn,
                {
                  backgroundColor:
                    i === periodIdx ? colors.primary : colors.card,
                  borderColor:
                    i === periodIdx ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setPeriodIdx(i)}
            >
              <Text
                style={[
                  s.periodLabel,
                  {
                    color:
                      i === periodIdx ? '#FFFFFF' : colors.secondary,
                  },
                ]}
              >
                {p.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={s.metricsGrid}>
          <MetricTile
            label="Total Revenue"
            value={`KWD ${revenue.toFixed(3)}`}
            icon="cash"
            color={colors.success}
          />
          <MetricTile
            label="Units Sold"
            value={String(unitsSold)}
            icon="cube"
            color={colors.primary}
          />
          <MetricTile
            label="Deals"
            value={String(dealsList.length)}
            icon="pricetag"
            color={colors.accent}
          />
          <MetricTile
            label="Success Rate"
            value={`${successRate}%`}
            icon="trending-up"
            color="#8B5CF6"
          />
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Accounting Report</Text>
          <TouchableOpacity
            style={s.reportBtn}
            onPress={handleDownloadReport}
            disabled={downloading}
          >
            <Ionicons name="document-text" size={18} color="#FFFFFF" />
            <Text style={s.reportBtnText}>
              {downloading
                ? 'Generating...'
                : `Download PDF — ${PERIODS[periodIdx].label}`}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Recent Deals</Text>
          {dealsList.slice(0, 5).map((deal) => (
            <View key={deal.id} style={s.dealRow}>
              <Text style={s.dealTitle} numberOfLines={1}>
                {deal.product_title ?? deal.title ?? 'Deal'}
              </Text>
              <Text
                style={[
                  s.dealStatus,
                  { color: STATUS_COLORS[deal.status] ?? colors.secondary },
                ]}
              >
                {deal.status}
              </Text>
            </View>
          ))}
        </View>

        <View style={s.bottomPad} />
      </ScrollView>
    </View>
  );
}
