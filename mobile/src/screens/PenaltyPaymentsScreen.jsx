import React, { useState } from 'react';
import { Alert, Image, Modal, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { getPenaltyReceiptPhotoSource } from '../services/api.js';
import { useLibrary } from '../state/LibraryContext.jsx';

export default function PenaltyPaymentsScreen() {
  const { payments, confirmPayment, declinePayment, error, loading } = useLibrary();
  const [reasons, setReasons] = useState({});
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [photoLoaded, setPhotoLoaded] = useState(false);
  const [photoError, setPhotoError] = useState('');

  const openReceiptReview = (payment) => {
    setPhotoLoaded(false);
    setPhotoError('');
    setSelectedReceipt(payment);
  };

  const askToDecline = (payment) => {
    const reason = (reasons[payment.apiId] || '').trim();
    if (reason.length < 5) return;
    Alert.alert('Decline payment photo', `Send this notice to ${payment.member}?\n\n${reason}`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Decline',
        style: 'destructive',
        onPress: () => declinePayment(payment.apiId, reason)
          .then(() => setSelectedReceipt(null))
          .catch(() => {}),
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>ADMIN / CASHIER CLEARANCE</Text>
        <Text style={styles.title}>Penalty receipts</Text>
        <Text style={styles.description}>Review the member's cashier receipt photo. Approving clears the receipt amount; declining sends a notice and lets the member submit a replacement photo.</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {payments.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No receipts yet</Text>
            <Text style={styles.emptyText}>Member penalty receipts will appear here.</Text>
          </View>
        ) : payments.map((payment) => (
          <View style={styles.card} key={payment.id}>
            <Text style={styles.member}>{payment.member}</Text>
            <Text style={styles.receipt}>{payment.id}</Text>
            <Text style={styles.amount}>${payment.amount.toFixed(2)}</Text>
            <Text style={styles.status}>{payment.status}</Text>
            {payment.reviewReason ? <Text style={styles.notice}>Previous notice: {payment.reviewReason}</Text> : null}
            {payment.status === 'Submitted - awaiting review' ? (
              payment.hasPhoto ? (
                <Pressable onPress={() => openReceiptReview(payment)} style={styles.reviewButton}>
                  <Text style={styles.reviewButtonText}>View receipt and review</Text>
                </Pressable>
              ) : <Text style={styles.error}>No receipt photo is available. The payment cannot be reviewed.</Text>
            ) : payment.status === 'Printed - awaiting cashier' ? (
              <Text style={styles.description}>Waiting for the member to submit a photo of the cashier receipt.</Text>
            ) : null}
          </View>
        ))}
      </ScrollView>
      <Modal
        animationType="slide"
        onRequestClose={() => setSelectedReceipt(null)}
        transparent
        visible={Boolean(selectedReceipt)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Review cashier receipt</Text>
            {selectedReceipt ? (
              <>
                <Text style={styles.modalMeta}>{selectedReceipt.member} · {selectedReceipt.id} · ${selectedReceipt.amount.toFixed(2)}</Text>
                <Image
                  accessibilityLabel={`Cashier receipt photo from ${selectedReceipt.member}`}
                  onError={() => { setPhotoLoaded(false); setPhotoError('Could not load the receipt photo.'); }}
                  onLoad={() => setPhotoLoaded(true)}
                  resizeMode="contain"
                  source={getPenaltyReceiptPhotoSource(selectedReceipt.apiId)}
                  style={styles.modalPhoto}
                />
                {photoError ? <Text accessibilityRole="alert" style={styles.error}>{photoError}</Text> : !photoLoaded ? <Text style={styles.modalMeta}>Loading receipt photo...</Text> : <Text style={styles.modalMeta}>Review the photo, then confirm whether it is valid.</Text>}
                <TextInput
                  value={reasons[selectedReceipt.apiId] || ''}
                  onChangeText={(value) => setReasons({ ...reasons, [selectedReceipt.apiId]: value })}
                  placeholder="Notice required when declining"
                  placeholderTextColor="#9C887A"
                  style={styles.reason}
                />
                <View style={styles.reviewActions}>
                  <Pressable disabled={loading || !photoLoaded || (reasons[selectedReceipt.apiId] || '').trim().length < 5} onPress={() => askToDecline(selectedReceipt)} style={[styles.decline, (!photoLoaded || (reasons[selectedReceipt.apiId] || '').trim().length < 5) && styles.disabled]}>
                    <Text style={styles.buttonText}>Decline with notice</Text>
                  </Pressable>
                  <Pressable disabled={loading || !photoLoaded} onPress={() => confirmPayment(selectedReceipt.apiId).then(() => setSelectedReceipt(null)).catch(() => {})} style={[styles.approve, !photoLoaded && styles.disabled]}>
                    <Text style={styles.buttonText}>Approve payment</Text>
                  </Pressable>
                  <Pressable onPress={() => setSelectedReceipt(null)} style={styles.closeReview}>
                    <Text style={styles.closeReviewText}>Close review</Text>
                  </Pressable>
                </View>
              </>
            ) : null}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#F5F3EE', flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  eyebrow: { color: '#9A7852', fontSize: 10, fontWeight: '700', letterSpacing: 1.1 },
  title: { color: '#25272B', fontFamily: 'Georgia', fontSize: 33, marginTop: 9 },
  description: { color: '#777A73', fontSize: 12, lineHeight: 18, marginBottom: 18, marginTop: 9 },
  error: { backgroundColor: '#F5E2D8', color: '#8D3E2C', marginBottom: 12, padding: 10 },
  card: { backgroundColor: '#FBFAF6', borderColor: '#E0DDD5', borderRadius: 11, borderWidth: 1, marginBottom: 10, padding: 15 },
  member: { color: '#25272B', fontSize: 14, fontWeight: '700' },
  receipt: { color: '#88877F', fontSize: 10, marginTop: 4 },
  amount: { color: '#B76D43', fontFamily: 'Georgia', fontSize: 24, marginTop: 9 },
  status: { color: '#B77A43', fontSize: 10, marginTop: 4 },
  notice: { backgroundColor: '#F5E2D8', color: '#8D3E2C', fontSize: 11, lineHeight: 16, marginTop: 10, padding: 10 },
  reviewActions: { gap: 8, marginTop: 12 },
  reviewButton: { alignItems: 'center', backgroundColor: '#E4EEE8', borderColor: '#C7D9CD', borderWidth: 1, marginTop: 12, padding: 12 },
  reviewButtonText: { color: '#2C3A37', fontSize: 12, fontWeight: '700' },
  modalBackdrop: { backgroundColor: '#0009', flex: 1, justifyContent: 'center', padding: 18 },
  modalContent: { backgroundColor: '#F5F3EE', borderRadius: 12, maxHeight: '92%', padding: 16 },
  modalTitle: { color: '#25272B', fontFamily: 'Georgia', fontSize: 23 },
  modalMeta: { color: '#777A73', fontSize: 11, lineHeight: 16, marginTop: 8 },
  modalPhoto: { backgroundColor: '#EEEAE2', height: 280, marginTop: 12, width: '100%' },
  closeReview: { alignItems: 'center', borderColor: '#D7D3CA', borderWidth: 1, padding: 11 },
  closeReviewText: { color: '#25272B', fontSize: 11 },
  disabled: { opacity: 0.5 },
  approve: { alignItems: 'center', backgroundColor: '#2C3A37', padding: 12 },
  decline: { alignItems: 'center', backgroundColor: '#A34B3F', padding: 12 },
  buttonText: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  reason: { backgroundColor: '#FFFDF8', borderColor: '#D7D3CA', borderWidth: 1, color: '#25272B', minHeight: 42, paddingHorizontal: 10 },
  empty: { backgroundColor: '#E4EEE8', marginTop: 18, padding: 20 },
  emptyTitle: { color: '#2C3A37', fontFamily: 'Georgia', fontSize: 20 },
  emptyText: { color: '#678271', fontSize: 11, marginTop: 6 },
});
