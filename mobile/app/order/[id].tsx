import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { api, getStoredToken } from '@/services/api';
import { useColors } from '@/hooks/useColors';
import { Badge, StatusBadge } from '@/components/Badge';
import { EmptyState } from '@/components/ui';
import type { Order } from '@/types/models';
import { getApiError } from '@/types/models';

type TimelineStep = { label: string; done: boolean; active: boolean };

function StatusTimeline({ order }: { order: Order }) {
  const colors = useColors();

  const steps: TimelineStep[] = [
    { label: 'Order Placed', done: true, active: false },
    {
      label: 'Payment Authorized',
      done: ['Authorized', 'Captured'].includes(order.payment_status),
      active: order.payment_status === 'Pending',
    },
    {
      label: 'Shipped',
      done: ['Shipped', 'Delivered'].includes(order.delivery_status ?? ''),
      active: order.delivery_status == null && order.payment_status === 'Captured',
    },
    {
      label: 'Delivered',
      done: order.delivery_status === 'Delivered',
      active: order.delivery_status === 'Shipped',
    },
  ];

  const isCancelled = order.payment_status === 'Cancelled';

  const s = StyleSheet.create({
    container: { backgroundColor: colors.card, borderRadius: 12, padding: 16, marginBottom: 16 },
    title: { fontSize: 15, fontFamily: 'Inter_700Bold', color: colors.foreground, marginBottom: 16 },
    stepsWrap: { gap: 0 },
    stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
    lineCol: { alignItems: 'center', width: 20 },
    dot: { width: 18, height: 18, borderRadius: 9, borderWidth: 2 },
    line: { width: 2, flex: 1, minHeight: 24, marginVertical: 2 },
    stepText: {
      fontSize: 14,
      fontFamily: 'Inter_500Medium',
      paddingBottom: 20,
    },
    cancelledNote: {
      backgroundColor: '#FEF2F2',
      borderRadius: 8,
      padding: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    cancelledText: { fontSize: 13, fontFamily: 'Inter_500Medium', color: '#DC2626' },
  });

  if (isCancelled) {
    return (
      <View style={s.container}>
        <Text style={s.title}>Order Status</Text>
        <View style={s.cancelledNote}>
          <Ionicons name="close-circle" size={18} color="#DC2626" />
          <Text style={s.cancelledText}>This order has been cancelled.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <Text style={s.title}>Delivery Timeline</Text>
      <View style={s.stepsWrap}>
        {steps.map((step, i) => (
          <View key={step.label} style={s.stepRow}>
            <View style={s.lineCol}>
              <View style={[
                s.dot,
                {
                  backgroundColor: step.done ? colors.primary : step.active ? colors.accent : colors.background,
                  borderColor: step.done ? colors.primary : step.active ? colors.accent : colors.border,
                }
              ]} />
              {i < steps.length - 1 && (
                <View style={[s.line, { backgroundColor: step.done ? colors.primary : colors.border }]} />
              )}
            </View>
            <Text style={[
              s.stepText,
              {
                color: step.done ? colors.primary : step.active ? colors.accent : colors.secondary,
                fontFamily: step.done || step.active ? 'Inter_600SemiBold' : 'Inter_400Regular',
              }
            ]}>
              {step.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [downloadingInvoice, setDownloadingInvoice] = useState(false);
  const [downloadingNote, setDownloadingNote] = useState(false);

  const { data: order, isLoading, error } = useQuery<Order>({
    queryKey: ['/api/orders', id],
    queryFn: async () => {
      const res = await api.get<Order>(`/orders/${id}`);
      return res.data;
    },
    enabled: !!id,
  });

  const handleDownloadPdf = async (type: 'invoice' | 'delivery-note') => {
    const setDownloading = type === 'invoice' ? setDownloadingInvoice : setDownloadingNote;
    setDownloading(true);
    try {
      const endpoint = `/orders/${id}/${type}`;
      const token = await getStoredToken();
      const url = `${process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000/api'}${endpoint}`;
      const fileUri = FileSystem.cacheDirectory + `${type}-${id}.pdf`;
      const downloadRes = await FileSystem.downloadAsync(url, fileUri, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (downloadRes.status === 200) {
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(downloadRes.uri, {
            mimeType: 'application/pdf',
            dialogTitle: type === 'invoice' ? 'Invoice' : 'Delivery Note',
          });
        } else {
          Alert.alert('Downloaded', `File saved to: ${downloadRes.uri}`);
        }
      } else {
        Alert.alert('Error', 'Failed to download PDF.');
      }
    } catch (err: unknown) {
      Alert.alert('Error', getApiError(err, 'Failed to download PDF. Please try again.'));
    } finally {
      setDownloading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error || !order) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <EmptyState icon="alert-circle-outline" message="Order not found." />
      </View>
    );
  }

  const total = Number(order.total_amount ?? 0);

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scrollContent: {
      padding: 20,
      paddingBottom: Platform.OS === 'ios' ? insets.bottom + 24 : 32,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
    },
    orderNum: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: colors.primary, marginBottom: 6 },
    productTitle: {
      fontSize: 18,
      fontFamily: 'Inter_700Bold',
      color: colors.foreground,
      marginBottom: 8,
    },
    statusRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
    infoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    infoRowLast: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingTop: 10,
    },
    infoLabel: { fontSize: 14, fontFamily: 'Inter_400Regular', color: colors.secondary },
    infoValue: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: colors.foreground, textAlign: 'right' as const, flex: 1, marginLeft: 16 },
    totalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
    },
    totalLabel: { fontSize: 16, fontFamily: 'Inter_600SemiBold', color: colors.foreground },
    totalAmount: { fontSize: 24, fontFamily: 'Inter_700Bold', color: colors.primary },
    pdfSection: { gap: 10, marginBottom: 8 },
    pdfBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 14,
      borderWidth: 1.5,
      borderColor: colors.border,
    },
    pdfBtnText: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: colors.primary },
  });

  return (
    <View style={s.container}>
      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={s.card}>
          <Text style={s.orderNum}>{order.order_number ?? `Order #${order.id}`}</Text>
          <Text style={s.productTitle} numberOfLines={2}>
            {order.product_title ?? 'Order Details'}
          </Text>
          <View style={s.statusRow}>
            <StatusBadge status={order.payment_status} />
            {order.delivery_status && <StatusBadge status={order.delivery_status} />}
          </View>

          <View style={s.infoRow}>
            <Text style={s.infoLabel}>Quantity</Text>
            <Text style={s.infoValue}>{order.quantity} unit{order.quantity > 1 ? 's' : ''}</Text>
          </View>
          {order.price_per_unit && (
            <View style={s.infoRow}>
              <Text style={s.infoLabel}>Price per unit</Text>
              <Text style={s.infoValue}>KWD {Number(order.price_per_unit).toFixed(3)}</Text>
            </View>
          )}
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>Date placed</Text>
            <Text style={s.infoValue}>
              {new Date(order.created_at).toLocaleDateString('en-KW', {
                day: 'numeric', month: 'long', year: 'numeric',
              })}
            </Text>
          </View>
          {order.delivery_address && (
            <View style={s.infoRow}>
              <Text style={s.infoLabel}>Delivery address</Text>
              <Text style={s.infoValue}>{order.delivery_address}</Text>
            </View>
          )}
          {order.mobile_number && (
            <View style={s.infoRow}>
              <Text style={s.infoLabel}>Mobile</Text>
              <Text style={s.infoValue}>{order.mobile_number}</Text>
            </View>
          )}
          {order.product_brand && (
            <View style={s.infoRowLast}>
              <Text style={s.infoLabel}>Brand</Text>
              <Text style={s.infoValue}>{order.product_brand}</Text>
            </View>
          )}
        </View>

        <StatusTimeline order={order} />

        <View style={s.totalRow}>
          <Text style={s.totalLabel}>Total Paid</Text>
          <Text style={s.totalAmount}>KWD {total.toFixed(3)}</Text>
        </View>

        <View style={s.pdfSection}>
          <TouchableOpacity
            style={s.pdfBtn}
            onPress={() => handleDownloadPdf('invoice')}
            disabled={downloadingInvoice}
          >
            <Ionicons name="document-text" size={18} color={colors.primary} />
            <Text style={s.pdfBtnText}>
              {downloadingInvoice ? 'Downloading...' : 'Download Invoice'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={s.pdfBtn}
            onPress={() => handleDownloadPdf('delivery-note')}
            disabled={downloadingNote}
          >
            <Ionicons name="cube" size={18} color={colors.primary} />
            <Text style={s.pdfBtnText}>
              {downloadingNote ? 'Downloading...' : 'Download Delivery Note'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
