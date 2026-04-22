import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { api } from '@/services/api';
import { useColors } from '@/hooks/useColors';
import { InputField, PrimaryButton } from '@/components/ui';
import type { CartItem, CartResponse } from '@/types/models';
import { getApiError } from '@/types/models';

let CardField: React.ComponentType<{
  onCardChange?: (cardDetails: { complete: boolean }) => void;
  style?: object;
  cardStyle?: object;
}> | null = null;

let useConfirmPayment: (() => {
  confirmPayment: (
    clientSecret: string,
    data: { paymentMethodType: string }
  ) => Promise<{ paymentIntent?: unknown; error?: { message: string } }>;
}) | null = null;

if (Platform.OS !== 'web') {
  try {
    const stripe = require('@stripe/stripe-react-native');
    CardField = stripe.CardField;
    useConfirmPayment = stripe.useConfirmPayment;
  } catch {
  }
}

function useStripeConfirm() {
  if (useConfirmPayment) {
    return useConfirmPayment();
  }
  return {
    confirmPayment: async (
      _cs: string,
      _data: unknown
    ): Promise<{ paymentIntent?: unknown; error?: { message: string } | null }> => ({
      paymentIntent: null,
      error: null,
    }),
  };
}

interface CartCheckoutResponse {
  order_ids: number[];
  orders: Array<{ id: number; deal_id: number; quantity: number; total_amount: number }>;
  cart_total: number;
  stripe_client_secret: string;
}

export default function CheckoutScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<1 | 2>(1);
  const [address, setAddress] = useState('');
  const [mobile, setMobile] = useState('');
  const [cardComplete, setCardComplete] = useState(false);
  const [webCardNumber, setWebCardNumber] = useState('');
  const [webCardExpiry, setWebCardExpiry] = useState('');
  const [webCardCvc, setWebCardCvc] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

  const { confirmPayment } = useStripeConfirm();

  const { data: cartData } = useQuery<CartResponse>({
    queryKey: ['/api/cart'],
    queryFn: async () => {
      const res = await api.get<CartResponse>('/cart');
      return res.data;
    },
  });

  const items: CartItem[] = cartData?.items ?? [];
  const total = Number(cartData?.cart_total ?? 0);

  const validateStep1 = () => {
    const e: Record<string, string> = {};
    if (!address.trim()) e.address = 'Delivery address is required';
    if (!mobile.trim()) e.mobile = 'Mobile number is required';
    if (mobile.trim().length < 8) e.mobile = 'Enter a valid mobile number';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep2 = () => {
    if (Platform.OS !== 'web' && CardField) {
      if (!cardComplete) {
        setErrors({ card: 'Please complete your card details' });
        return false;
      }
      return true;
    }
    const e: Record<string, string> = {};
    const num = webCardNumber.replace(/\s/g, '');
    if (num.length < 14) e.cardNumber = 'Enter a valid card number';
    if (!webCardExpiry.match(/^\d{2}\/\d{2}$/)) e.cardExpiry = 'Enter expiry as MM/YY';
    if (webCardCvc.length < 3) e.cardCvc = 'Enter a valid CVC';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handlePlaceOrder = async () => {
    if (!validateStep2()) return;
    setIsPlacingOrder(true);

    try {
      const checkoutRes = await api.post<CartCheckoutResponse>('/cart/checkout', {
        delivery_address: address.trim(),
        mobile_number: mobile.trim(),
      });
      const { order_ids, stripe_client_secret, orders } = checkoutRes.data;

      if (stripe_client_secret && Platform.OS !== 'web' && CardField) {
        const { error } = await confirmPayment(stripe_client_secret, {
          paymentMethodType: 'Card',
        });
        if (error) {
          setIsPlacingOrder(false);
          Alert.alert('Payment Failed', error.message);
          return;
        }
      }

      await api.post('/cart/confirm-checkout', { order_ids }).catch(() => {});

      queryClient.invalidateQueries({ queryKey: ['/api/cart'] });
      queryClient.invalidateQueries({ queryKey: ['/api/orders/my-orders'] });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      const firstOrderId = orders?.[0]?.id ?? order_ids?.[0];
      if (firstOrderId) {
        router.replace(`/order/${firstOrderId}` as Href);
      } else {
        router.replace('/(consumer)/orders' as Href);
      }
    } catch (err: unknown) {
      Alert.alert('Order Failed', getApiError(err, 'Failed to place order. Please try again.'));
    } finally {
      setIsPlacingOrder(false);
    }
  };

  const formatCardNumber = (text: string) => {
    const cleaned = text.replace(/\D/g, '').slice(0, 16);
    return cleaned.replace(/(.{4})/g, '$1 ').trim();
  };

  const formatExpiry = (text: string) => {
    const cleaned = text.replace(/\D/g, '').slice(0, 4);
    if (cleaned.length >= 2) return `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;
    return cleaned;
  };

  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      backgroundColor: colors.surface,
      paddingTop: topPad + 12,
      paddingHorizontal: 20,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    backBtn: {
      width: 36, height: 36, borderRadius: 10,
      backgroundColor: colors.muted, justifyContent: 'center', alignItems: 'center',
    },
    headerTitle: { fontSize: 18, fontFamily: 'Inter_700Bold', color: colors.foreground },
    stepRow: { flexDirection: 'row', gap: 6, marginTop: 12 },
    stepDot: { flex: 1, height: 4, borderRadius: 2 },
    scrollContent: {
      padding: 20,
      paddingBottom: Platform.OS === 'ios' ? insets.bottom + 24 : 32,
    },
    section: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
    },
    sectionTitleText: {
      fontSize: 15,
      fontFamily: 'Inter_700Bold',
      color: colors.foreground,
      marginBottom: 14,
    },
    orderItemRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    orderItemName: { flex: 1, fontSize: 14, fontFamily: 'Inter_400Regular', color: colors.foreground },
    orderItemPrice: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: colors.foreground },
    totalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingTop: 12,
    },
    totalLabel: { fontSize: 16, fontFamily: 'Inter_700Bold', color: colors.foreground },
    totalAmount: { fontSize: 18, fontFamily: 'Inter_700Bold', color: colors.primary },
    nativeCardField: {
      width: '100%',
      height: 50,
      marginBottom: 16,
    },
    cardFieldWrap: {
      borderWidth: 1.5,
      borderColor: errors.card ? colors.error : colors.border,
      borderRadius: 10,
      overflow: 'hidden',
      marginBottom: 4,
    },
    cardError: { fontSize: 12, color: colors.error, marginBottom: 12, fontFamily: 'Inter_400Regular' },
    row2: { flexDirection: 'row', gap: 12 },
    demoNote: {
      backgroundColor: '#EFF6FF',
      borderRadius: 8,
      padding: 10,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: '#BFDBFE',
    },
    demoNoteText: { fontSize: 12, fontFamily: 'Inter_400Regular', color: '#1D4ED8' },
    lockRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      marginTop: 8,
    },
    lockText: { fontSize: 12, fontFamily: 'Inter_400Regular', color: colors.secondary },
  });

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={s.header}>
        <View style={s.headerRow}>
          <View style={s.backBtn}>
            <Ionicons
              name="arrow-back"
              size={18}
              color={colors.foreground}
              onPress={() => { if (step === 2) setStep(1); else router.back(); }}
            />
          </View>
          <Text style={s.headerTitle}>
            {step === 1 ? 'Delivery Info' : 'Payment'}
          </Text>
        </View>
        <View style={s.stepRow}>
          <View style={[s.stepDot, { backgroundColor: colors.primary }]} />
          <View style={[s.stepDot, { backgroundColor: step === 2 ? colors.primary : colors.border }]} />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={s.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={s.section}>
          <Text style={s.sectionTitleText}>Order Summary</Text>
          {items.map((item) => (
            <View key={item.deal_id} style={s.orderItemRow}>
              <Text style={s.orderItemName} numberOfLines={1}>
                {item.product_title ?? 'Deal'} × {item.quantity}
              </Text>
              <Text style={s.orderItemPrice}>
                KWD {(item.line_total ?? Number(item.price_per_unit) * item.quantity).toFixed(3)}
              </Text>
            </View>
          ))}
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>Total</Text>
            <Text style={s.totalAmount}>KWD {total.toFixed(3)}</Text>
          </View>
        </View>

        {step === 1 && (
          <View style={s.section}>
            <Text style={s.sectionTitleText}>Delivery Details</Text>
            <InputField
              label="Delivery Address"
              value={address}
              onChangeText={setAddress}
              placeholder="Block 5, Street 10, Kuwait City"
              multiline
              numberOfLines={2}
              error={errors.address}
            />
            <InputField
              label="Mobile Number"
              value={mobile}
              onChangeText={setMobile}
              placeholder="+965 xxxx xxxx"
              keyboardType="phone-pad"
              error={errors.mobile}
            />
            <PrimaryButton label="Continue to Payment" onPress={() => { if (validateStep1()) setStep(2); }} />
          </View>
        )}

        {step === 2 && (
          <View style={s.section}>
            <Text style={s.sectionTitleText}>Card Details</Text>

            {Platform.OS !== 'web' && CardField ? (
              <>
                <View style={s.cardFieldWrap}>
                  <CardField
                    onCardChange={(cardDetails) => {
                      setCardComplete(cardDetails.complete);
                      if (errors.card) setErrors({});
                    }}
                    style={s.nativeCardField}
                    cardStyle={{
                      backgroundColor: colors.surface,
                      textColor: colors.foreground,
                      placeholderColor: colors.secondary,
                    }}
                  />
                </View>
                {errors.card ? <Text style={s.cardError}>{errors.card}</Text> : null}
              </>
            ) : (
              <>
                <View style={s.demoNote}>
                  <Text style={s.demoNoteText}>
                    Demo: Use card 4242 4242 4242 4242, any future expiry, any 3-digit CVC.
                  </Text>
                </View>
                <InputField
                  label="Card Number"
                  value={webCardNumber}
                  onChangeText={(t) => setWebCardNumber(formatCardNumber(t))}
                  placeholder="4242 4242 4242 4242"
                  keyboardType="number-pad"
                  maxLength={19}
                  error={errors.cardNumber}
                />
                <View style={s.row2}>
                  <View style={{ flex: 1 }}>
                    <InputField
                      label="Expiry (MM/YY)"
                      value={webCardExpiry}
                      onChangeText={(t) => setWebCardExpiry(formatExpiry(t))}
                      placeholder="12/26"
                      keyboardType="number-pad"
                      maxLength={5}
                      error={errors.cardExpiry}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <InputField
                      label="CVC"
                      value={webCardCvc}
                      onChangeText={(t) => setWebCardCvc(t.replace(/\D/g, '').slice(0, 4))}
                      placeholder="123"
                      keyboardType="number-pad"
                      maxLength={4}
                      secureTextEntry
                      error={errors.cardCvc}
                    />
                  </View>
                </View>
              </>
            )}

            <PrimaryButton
              label={`Place Order — KWD ${total.toFixed(3)}`}
              onPress={handlePlaceOrder}
              loading={isPlacingOrder}
              style={{ marginTop: 4 }}
            />

            <View style={s.lockRow}>
              <Ionicons name="lock-closed" size={12} color={colors.secondary} />
              <Text style={s.lockText}>Secured with Stripe 256-bit SSL encryption</Text>
            </View>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
