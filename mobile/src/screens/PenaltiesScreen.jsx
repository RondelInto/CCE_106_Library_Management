import React, { useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useLibrary } from '../state/LibraryContext.jsx';

const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}[character]));

export default function PenaltiesScreen() {
  const {
    currentUser,
    payments,
    createPenaltyReceipt,
    submitPenaltyReceiptPhoto,
    error,
    loading,
  } = useLibrary();
  const [actionError, setActionError] = useState('');
  const [exportingReceiptId, setExportingReceiptId] = useState(null);
  const outstanding = Number(currentUser?.outstanding_penalty_total ?? currentUser?.penalty_balance ?? 0);
  const hasUnpaidReceipt = payments.some((payment) => payment.status !== 'Paid - cleared');

  const exportReceipt = async (payment) => {
    setActionError('');
    setExportingReceiptId(payment.id);
    try {
      const file = await Print.printToFileAsync({
        html: `<html><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>body{font-family:Arial,sans-serif;color:#25272b;padding:36px}h1{font-size:22px;font-weight:600}p{line-height:1.5}.receipt{border:1px solid #d7d3ca;padding:24px;margin-top:24px}.label{color:#656a67;font-size:12px;text-transform:uppercase;letter-spacing:.08em}.amount{font-size:26px;font-weight:700;margin:12px 0 24px}.notice{border-top:1px solid #d7d3ca;padding-top:16px;margin-top:22px}</style></head><body><h1>Library penalty payment receipt</h1><p>Payment slip for cashier processing</p><section class="receipt"><p class="label">Receipt number</p><p>${escapeHtml(payment.id)}</p><p class="label">Member</p><p>${escapeHtml(currentUser?.name || 'Library member')}</p><p class="label">Issued</p><p>${escapeHtml(payment.createdAt ? new Date(payment.createdAt).toLocaleDateString() : new Date().toLocaleDateString())}</p><p class="label">Amount due</p><p class="amount">$${Number(payment.amount).toFixed(2)}</p><p class="notice">Pay this amount at the cashier. After payment, submit a clear photo of the cashier-issued receipt in the library app for administrator review.</p></section></body></html>`,
        width: 612,
        height: 792,
        margins: { left: 36, top: 36, right: 36, bottom: 36 },
      });
      const sharingAvailable = await Sharing.isAvailableAsync();
      if (!sharingAvailable) {
        setActionError('PDF created, but sharing is not available on this device. Try the website to print or save the receipt.');
        return;
      }
      await Sharing.shareAsync(file.uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Save or share penalty receipt',
        UTI: 'com.adobe.pdf',
      });
    } catch {
      setActionError('Could not create or open the receipt PDF. Try again or use the website to print the receipt.');
    } finally {
      setExportingReceiptId(null);
    }
  };

  const takeReceiptPhoto = async (payment) => {
    setActionError('');
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        setActionError('Allow camera access to photograph your cashier receipt.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({ quality: 0.75 });
      if (result.canceled) return;
      await submitPenaltyReceiptPhoto(payment.apiId, result.assets[0]);
    } catch (photoError) {
      setActionError(photoError.response?.data?.message || 'Could not submit the receipt photo.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>MEMBER ACCOUNT</Text>
        <Text style={styles.title}>Penalties</Text>
        <Text style={styles.description}>Overdue books accrue a penalty of $2.50 per day. Print a payment slip, pay at the cashier, then send a photo of the cashier receipt.</Text>
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>OUTSTANDING BALANCE</Text>
          <Text style={styles.balance}>${outstanding.toFixed(2)}</Text>
          <Pressable
            disabled={loading || outstanding <= 0 || hasUnpaidReceipt}
            onPress={() => createPenaltyReceipt().catch(() => {})}
            style={[styles.primaryButton, (loading || outstanding <= 0 || hasUnpaidReceipt) && styles.disabled]}
          >
            <Text style={styles.primaryText}>{hasUnpaidReceipt ? 'Resolve your current receipt' : 'Create payment receipt'}</Text>
          </Pressable>
        </View>
        {error || actionError ? <Text accessibilityRole="alert" style={styles.error}>{actionError || error}</Text> : null}
        <Text style={styles.sectionTitle}>Payment receipts</Text>
        {payments.length ? payments.map((payment) => {
          const canSubmitPhoto = payment.status === 'Printed - awaiting cashier' || payment.status === 'Declined - resubmission required';
          return (
            <View style={styles.receiptCard} key={payment.id}>
              <Text style={styles.receiptTitle}>{payment.id}</Text>
              <Text style={styles.amount}>${payment.amount.toFixed(2)}</Text>
              <Text style={styles.status}>{payment.status}</Text>
              {payment.reviewReason ? <Text style={styles.notice}>Admin notice: {payment.reviewReason}</Text> : null}
              <Pressable disabled={exportingReceiptId === payment.id} onPress={() => exportReceipt(payment)} style={[styles.secondaryButton, exportingReceiptId === payment.id && styles.disabled]}>
                <Text style={styles.secondaryText}>{exportingReceiptId === payment.id ? 'Preparing PDF...' : 'Download / Print PDF'}</Text>
              </Pressable>
              {canSubmitPhoto ? (
                <Pressable disabled={loading} onPress={() => takeReceiptPhoto(payment)} style={styles.primaryButton}>
                  <Text style={styles.primaryText}>{payment.status.startsWith('Declined') ? 'Take a new receipt photo' : 'Submit cashier receipt photo'}</Text>
                </Pressable>
              ) : null}
            </View>
          );
        }) : <Text style={styles.empty}>No penalty receipts yet.</Text>}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#FBF8F1', flex: 1 },
  content: { padding: 20, paddingBottom: 42 },
  eyebrow: { color: '#A65D35', fontSize: 10, fontWeight: '800', letterSpacing: 1.1 },
  title: { color: '#3B2418', fontFamily: 'Georgia', fontSize: 32, marginTop: 9 },
  description: { color: '#856F61', fontSize: 12, lineHeight: 18, marginBottom: 18, marginTop: 8 },
  balanceCard: { backgroundColor: '#6B3E27', borderRadius: 14, marginBottom: 18, padding: 18 },
  balanceLabel: { color: '#E8D2B9', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  balance: { color: '#FFFDF8', fontFamily: 'Georgia', fontSize: 31, marginVertical: 12 },
  primaryButton: { alignItems: 'center', backgroundColor: '#2C3A37', marginTop: 9, padding: 12 },
  primaryText: { color: '#FFF', fontSize: 11, fontWeight: '700', textAlign: 'center' },
  disabled: { opacity: 0.55 },
  error: { backgroundColor: '#F5E2D8', color: '#8D3E2C', fontSize: 12, marginBottom: 12, padding: 10 },
  sectionTitle: { color: '#3B2418', fontFamily: 'Georgia', fontSize: 20, marginBottom: 10 },
  receiptCard: { backgroundColor: '#FFFDF8', borderColor: '#E9DED0', borderRadius: 12, borderWidth: 1, marginBottom: 10, padding: 14 },
  receiptTitle: { color: '#3B2418', fontSize: 13, fontWeight: '700' },
  amount: { color: '#B76D43', fontFamily: 'Georgia', fontSize: 23, marginTop: 8 },
  status: { color: '#856F61', fontSize: 10, marginTop: 5 },
  notice: { backgroundColor: '#F5E2D8', color: '#8D3E2C', fontSize: 11, lineHeight: 16, marginTop: 10, padding: 10 },
  secondaryButton: { alignItems: 'center', borderColor: '#D7D3CA', borderWidth: 1, marginTop: 12, padding: 11 },
  secondaryText: { color: '#3B2418', fontSize: 11, fontWeight: '700' },
  empty: { color: '#856F61', fontSize: 11 },
});
