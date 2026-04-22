import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';

export interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  scrollable?: boolean;
}

export function BottomSheet({
  visible,
  onClose,
  title,
  children,
  scrollable = false,
}: BottomSheetProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const s = StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingTop: 12,
      paddingHorizontal: 20,
      paddingBottom: Math.max(insets.bottom, 16),
      maxHeight: '85%',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.12,
      shadowRadius: 12,
      elevation: 20,
    },
    handle: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      alignSelf: 'center',
      marginBottom: 16,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    title: {
      fontSize: 17,
      fontFamily: 'Inter_700Bold',
      color: colors.foreground,
    },
    closeBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.muted,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });

  const body = (
    <>
      <View style={s.handle} />
      {title && (
        <View style={s.header}>
          <Text style={s.title}>{title}</Text>
          <TouchableOpacity style={s.closeBtn} onPress={onClose}>
            <Ionicons name="close" size={16} color={colors.secondary} />
          </TouchableOpacity>
        </View>
      )}
      {children}
    </>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={s.backdrop}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
              <View style={s.sheet}>
                {scrollable ? (
                  <ScrollView showsVerticalScrollIndicator={false}>
                    {body}
                  </ScrollView>
                ) : (
                  body
                )}
              </View>
            </KeyboardAvoidingView>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}
