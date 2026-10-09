import React from 'react';
import { Alert, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLibrary } from '../state/LibraryContext.jsx';

const isPending = (request) => request.status === 'Ready to approve';

export default function YourRequestsScreen() {
  const { requests } = useLibrary();
  const pending = requests.filter(isPending);
  const decided = requests.filter((request) => !isPending(request));

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>MEMBER ACCOUNT</Text>
        <Text style={styles.title}>Your Request</Text>
        <Text style={styles.description}>Follow requests waiting for review and see the outcome of past requests.</Text>
        <Text style={styles.sectionTitle}>Pending requests</Text>
        {pending.length ? pending.map((request) => <RequestCard key={request.id} request={request} />) : <Text style={styles.empty}>No pending requests.</Text>}
        <Text style={styles.sectionTitle}>Request history</Text>
        {decided.length ? decided.map((request) => <RequestCard key={request.id} request={request} />) : <Text style={styles.empty}>Approved and declined requests will appear here.</Text>}
      </ScrollView>
    </SafeAreaView>
  );
}

function RequestCard({ request }) {
  const declined = request.status === 'Declined';
  const displayStatus = request.status === 'Ready to approve'
    ? 'Pending'
    : request.status === 'Approved - pick up'
      ? 'Approved'
      : request.status;
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.bookTitle}>{request.book}</Text>
        <Text style={[styles.status, declined && styles.declined]}>{displayStatus}</Text>
      </View>
      {request.due ? <Text style={styles.meta}>Return by {request.due}</Text> : null}
      {declined ? (
        request.reason ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => Alert.alert('Notice from the library', request.reason)}
            style={styles.viewButton}
          >
            <Text style={styles.viewText}>View notice</Text>
          </Pressable>
        ) : <Text style={styles.meta}>No notice was provided.</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#FBF8F1', flex: 1 },
  content: { padding: 20, paddingBottom: 42 },
  eyebrow: { color: '#A65D35', fontSize: 10, fontWeight: '800', letterSpacing: 1.1 },
  title: { color: '#3B2418', fontFamily: 'Georgia', fontSize: 32, marginTop: 9 },
  description: { color: '#856F61', fontSize: 12, lineHeight: 18, marginBottom: 22, marginTop: 8 },
  sectionTitle: { color: '#3B2418', fontFamily: 'Georgia', fontSize: 20, marginBottom: 10, marginTop: 14 },
  card: { backgroundColor: '#FFFDF8', borderColor: '#E9DED0', borderRadius: 12, borderWidth: 1, marginBottom: 9, padding: 14 },
  cardHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  bookTitle: { color: '#3B2418', flex: 1, fontSize: 14, fontWeight: '700', marginRight: 10 },
  status: { color: '#B77A43', fontSize: 10, fontWeight: '700' },
  declined: { color: '#A34B3F' },
  meta: { color: '#856F61', fontSize: 11, marginTop: 7 },
  viewButton: { alignSelf: 'flex-start', backgroundColor: '#F5E2D8', marginTop: 11, paddingHorizontal: 14, paddingVertical: 9 },
  viewText: { color: '#8D3E2C', fontSize: 11, fontWeight: '700' },
  empty: { color: '#856F61', fontSize: 11, marginBottom: 8 },
});
