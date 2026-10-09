import React, { useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLibrary } from '../state/LibraryContext.jsx';

export default function BorrowReturnScreen({ route }) {
  const { requests, loans, requestBook, requestLoanExtension, error, loading } = useLibrary();
  const [actionError, setActionError] = useState('');
  const [extensionReasons, setExtensionReasons] = useState({});
  const book = route?.params?.book;
  const pending = requests;
  const myLoans = loans;

  const submitRequest = async () => {
    setActionError('');
    try {
      await requestBook(book.apiId || book.id);
    } catch {
      setActionError('Could not submit the borrow request.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>MEMBER ACCOUNT</Text>
        <Text style={styles.title}>Borrow Book</Text>
        {(error || actionError) ? <Text style={styles.error}>{error || actionError}</Text> : null}
        {book && (
          <View style={styles.selected}>
            <Text style={styles.selectedLabel}>SELECTED BOOK</Text>
            <Text style={styles.selectedTitle}>{book.title}</Text>
            <Text style={styles.selectedMeta}>{book.author} · {book.copies ? 'Available for request' : 'Unavailable'}</Text>
            <Pressable disabled={loading || !book.copies} onPress={submitRequest} style={styles.primary}>
              <Text style={styles.primaryText}>{loading ? 'Submitting...' : 'Request to borrow'}</Text><Text style={styles.primaryArrow}>→</Text>
            </Pressable>
          </View>
        )}
        <Text style={styles.section}>Your requests</Text>
        {pending.map((request) => <StatusCard key={request.id} title={request.book} status={request.status} due={request.due} tone={request.status.includes('pick') ? 'ready' : 'pending'} />)}
        {pending.length === 0 && <Text style={styles.empty}>No active requests.</Text>}
        <Text style={styles.section}>Active loans</Text>
        {myLoans.map((loan) => (
          <View style={styles.loan} key={loan.id}>
            <View style={styles.loanCopy}><Text style={styles.loanTitle}>{loan.title}</Text><Text style={styles.loanDue}>Return by {loan.due}</Text></View>
            <Text style={styles.waiting}>Return at desk</Text>
          </View>
        ))}
        {myLoans.length === 0 && <Text style={styles.empty}>Approved requests will appear as active loans here.</Text>}
        {myLoans.map((loan) => (
          <View style={styles.extensionForm} key={`extension-${loan.id}`}>
            <Text style={styles.extensionTitle}>Need more time for {loan.title}?</Text>
            <TextInput value={extensionReasons[loan.id] || ''} onChangeText={(value) => setExtensionReasons({ ...extensionReasons, [loan.id]: value })} placeholder="Reason for extension" placeholderTextColor="#9C887A" style={styles.extensionInput} />
            <Pressable disabled={loading || (extensionReasons[loan.id] || '').trim().length < 5 || (loan.extensions || []).some((extension) => extension.status === 'pending')} onPress={() => requestLoanExtension(loan.apiId || loan.id, extensionReasons[loan.id].trim()).catch(() => {})} style={styles.extensionButton}><Text style={styles.extensionButtonText}>{(loan.extensions || []).some((extension) => extension.status === 'pending') ? 'Extension pending' : 'Request extension'}</Text></Pressable>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function StatusCard({ title, status, due, tone }) {
  return (
    <View style={styles.statusCard}>
      <View style={[styles.statusDot, tone === 'ready' && styles.readyDot]} />
      <View style={styles.statusCopy}><Text style={styles.cardTitle}>{title}</Text><Text style={[styles.status, tone === 'ready' && styles.ready]}>{status}</Text>{due ? <Text style={styles.due}>Return by {due}</Text> : null}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#FBF8F1', flex: 1 },
  content: { padding: 20, paddingBottom: 45 },
  eyebrow: { color: '#A65D35', fontSize: 10, fontWeight: '800', letterSpacing: 1.1 },
  title: { color: '#3B2418', fontFamily: 'Georgia', fontSize: 33, marginBottom: 20, marginTop: 9 },
  error: { backgroundColor: '#F5E2D8', color: '#8D3E2C', marginBottom: 12, padding: 10 },
  selected: { backgroundColor: '#E4EEE8', borderRadius: 13, marginBottom: 20, padding: 17 },
  selectedLabel: { color: '#598267', fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  selectedTitle: { color: '#2C3A37', fontFamily: 'Georgia', fontSize: 20, marginTop: 10 },
  selectedMeta: { color: '#678271', fontSize: 11, marginTop: 4 },
  primary: { alignItems: 'center', backgroundColor: '#2C3A37', flexDirection: 'row', justifyContent: 'space-between', marginTop: 16, padding: 13 },
  primaryText: { color: '#FFF', fontSize: 11 },
  primaryArrow: { color: '#E3AA60', fontSize: 17 },
  section: { color: '#3B2418', fontFamily: 'Georgia', fontSize: 20, marginBottom: 12, marginTop: 15 },
  statusCard: { alignItems: 'center', backgroundColor: '#FFFDF8', borderColor: '#E9DED0', borderRadius: 12, borderWidth: 1, flexDirection: 'row', marginBottom: 9, padding: 14 },
  statusDot: { backgroundColor: '#E3AA60', borderRadius: 7, height: 12, width: 12 },
  readyDot: { backgroundColor: '#72A883' },
  statusCopy: { flex: 1, marginLeft: 12 },
  cardTitle: { color: '#3B2418', fontSize: 14, fontWeight: '700' },
  status: { color: '#B77A43', fontSize: 10, marginTop: 5 },
  due: { color: '#856F61', fontSize: 10, marginTop: 5 },
  ready: { color: '#548263' },
  loan: { alignItems: 'center', backgroundColor: '#FFFDF8', borderColor: '#E9DED0', borderRadius: 12, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', padding: 14 },
  loanCopy: { flex: 1 },
  loanTitle: { color: '#3B2418', fontSize: 14, fontWeight: '700' },
  loanDue: { color: '#856F61', fontSize: 10, marginTop: 5 },
  waiting: { color: '#598267', fontSize: 10, marginLeft: 10 },
  empty: { color: '#856F61', fontSize: 11, marginBottom: 8 },
  extensionForm: { backgroundColor: '#E4EEE8', borderRadius: 11, marginTop: 10, padding: 13 },
  extensionTitle: { color: '#2C3A37', fontSize: 12, fontWeight: '700', marginBottom: 8 },
  extensionInput: { backgroundColor: '#FFFDF8', borderRadius: 7, color: '#3B2418', height: 42, paddingHorizontal: 10 },
  extensionButton: { alignItems: 'center', backgroundColor: '#2C3A37', marginTop: 8, padding: 11 },
  extensionButtonText: { color: '#FFF', fontSize: 11 },
  paymentPanel: { borderTopColor: '#E9DED0', borderTopWidth: 1, marginTop: 24, paddingTop: 8 },
  balance: { color: '#A65D35', fontSize: 14, fontWeight: '700', marginBottom: 10 },
  paymentRow: { alignItems: 'center', backgroundColor: '#FFFDF8', borderColor: '#E9DED0', borderRadius: 10, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, padding: 12 },
  printButton: { color: '#548263', fontSize: 10 },
});
