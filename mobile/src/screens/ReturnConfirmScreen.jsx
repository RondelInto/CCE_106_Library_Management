import React, { useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useLibrary } from '../state/LibraryContext.jsx';

const parseDate = (value) => {
  if (!value) return new Date();
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const formatDate = (date) => (
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
);

const suggestedExtensionDate = (dueDate) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const currentDueDate = dueDate ? parseDate(dueDate) : today;
  const base = currentDueDate > today ? currentDueDate : today;
  base.setDate(base.getDate() + 3);
  return formatDate(base);
};

export default function ReturnConfirmScreen() {
  const { loans, confirmReturn, approveLoanExtension, declineLoanExtension, error, loading } = useLibrary();
  const [query, setQuery] = useState('');
  const [dueDates, setDueDates] = useState({});
  const [activeDatePicker, setActiveDatePicker] = useState(null);
  const filtered = loans.filter((loan) => (
    `${loan.id} ${loan.title} ${loan.member} ${loan.memberId}`.toLowerCase().includes(query.trim().toLowerCase())
  ));

  const selectExtensionDate = (extensionId, event, selectedDate) => {
    setActiveDatePicker(null);
    if (event.type === 'set' && selectedDate) {
      setDueDates((current) => ({ ...current, [extensionId]: formatDate(selectedDate) }));
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.eyebrow}>ADMIN / CIRCULATION</Text>
        <Text style={styles.title}>Returns</Text>
        <Text style={styles.description}>Confirm physical returns and review loan extension requests.</Text>
        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search loan, member, or book"
          placeholderTextColor="#9C887A"
          style={styles.search}
        />
        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>{loans.length ? 'No matching returns' : 'All returns cleared'}</Text>
            <Text style={styles.emptyText}>{loans.length ? 'Try another search.' : 'There are no active loans waiting for return.'}</Text>
          </View>
        ) : filtered.map((loan) => {
          const pendingExtensions = (loan.extensions || []).filter((extension) => extension.status === 'pending');
          return (
            <View style={styles.card} key={loan.id}>
              <View style={styles.loanRow}>
                <View style={styles.cover}><Text style={styles.coverMark}>R</Text></View>
                <View style={styles.copy}>
                  <Text style={styles.book}>{loan.title}</Text>
                  <Text style={styles.member}>{loan.member}</Text>
                  <Text style={styles.due}>Due {loan.due || 'not set'}</Text>
                </View>
                <Pressable disabled={loading} onPress={() => confirmReturn(loan.apiId).catch(() => {})} style={styles.primary}>
                  <Text style={styles.primaryText}>{loading ? 'Saving...' : 'Confirm return'}</Text>
                </Pressable>
              </View>
              {pendingExtensions.map((extension) => {
                const pickerKey = `extension-${extension.id}`;
                const selectedDate = dueDates[pickerKey] || suggestedExtensionDate(loan.dueDate);
                return (
                  <View style={styles.extension} key={extension.id}>
                    <Text style={styles.extensionTitle}>Extension request</Text>
                    <Text style={styles.member}>{extension.reason}</Text>
                    <Text style={styles.label}>New due date</Text>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Choose extension due date, currently ${selectedDate}`}
                      onPress={() => setActiveDatePicker(pickerKey)}
                      style={styles.datePicker}
                    >
                      <Text style={styles.dateText}>{selectedDate}</Text>
                    </Pressable>
                    {activeDatePicker === pickerKey ? (
                      <DateTimePicker
                        value={parseDate(selectedDate)}
                        mode="date"
                        display="default"
                        minimumDate={parseDate(suggestedExtensionDate(loan.dueDate))}
                        onChange={(event, date) => selectExtensionDate(pickerKey, event, date)}
                      />
                    ) : null}
                    <View style={styles.extensionActions}>
                      <Pressable
                        disabled={loading}
                        onPress={() => approveLoanExtension(extension.id, selectedDate).catch(() => {})}
                        style={styles.approve}
                      >
                        <Text style={styles.approveText}>Approve extension</Text>
                      </Pressable>
                      <Pressable
                        disabled={loading}
                        onPress={() => declineLoanExtension(extension.id).catch(() => {})}
                        style={styles.decline}
                      >
                        <Text style={styles.declineText}>Decline extension</Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#FBF8F1', flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  eyebrow: { color: '#A65D35', fontSize: 10, fontWeight: '800', letterSpacing: 1.1 },
  title: { color: '#3B2418', fontFamily: 'Georgia', fontSize: 33, marginTop: 9 },
  description: { color: '#856F61', fontSize: 12, lineHeight: 18, marginBottom: 24, marginTop: 9 },
  error: { backgroundColor: '#F5E2D8', color: '#8D3E2C', marginBottom: 12, padding: 10 },
  search: { backgroundColor: '#FFFDF8', borderColor: '#E9DED0', borderWidth: 1, color: '#3B2418', height: 44, marginBottom: 14, paddingHorizontal: 12 },
  card: { backgroundColor: '#FFFDF8', borderColor: '#E9DED0', borderRadius: 12, borderWidth: 1, marginBottom: 10, padding: 13 },
  loanRow: { alignItems: 'center', flexDirection: 'row' },
  cover: { alignItems: 'center', backgroundColor: '#496B58', height: 60, justifyContent: 'center', width: 45 },
  coverMark: { color: '#FFF', fontSize: 18 },
  copy: { flex: 1, marginLeft: 12 },
  book: { color: '#3B2418', fontFamily: 'Georgia', fontSize: 16 },
  member: { color: '#856F61', fontSize: 10, marginTop: 5 },
  due: { color: '#BD7659', fontSize: 10, marginTop: 4 },
  primary: { backgroundColor: '#2C3A37', paddingHorizontal: 12, paddingVertical: 10 },
  primaryText: { color: '#FFF', fontSize: 10 },
  extension: { borderTopColor: '#E9DED0', borderTopWidth: 1, marginTop: 13, paddingTop: 12 },
  extensionTitle: { color: '#3B2418', fontSize: 12, fontWeight: '700' },
  label: { color: '#856F61', fontSize: 10, marginBottom: 5, marginTop: 12 },
  datePicker: { backgroundColor: '#FBFAF6', borderColor: '#D7D3CA', borderWidth: 1, padding: 10 },
  dateText: { color: '#25272B', fontSize: 11 },
  extensionActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  approve: { backgroundColor: '#E4EEE8', borderColor: '#C7D9CD', borderWidth: 1, padding: 10 },
  approveText: { color: '#46775C', fontSize: 10 },
  decline: { backgroundColor: '#F5E2D8', borderColor: '#EBC5B4', borderWidth: 1, padding: 10 },
  declineText: { color: '#8D3E2C', fontSize: 10 },
  empty: { backgroundColor: '#E4EEE8', marginTop: 15, padding: 20 },
  emptyTitle: { color: '#2C3A37', fontFamily: 'Georgia', fontSize: 20 },
  emptyText: { color: '#678271', fontSize: 11 },
});
