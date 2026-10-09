import React from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLibrary } from '../state/LibraryContext.jsx';

export default function HomeScreen({ navigation }) {
  const { currentUser, requests } = useLibrary();
  const penaltyTotal = Number(currentUser?.outstanding_penalty_total ?? currentUser?.penalty_balance ?? 0);
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Pressable accessibilityRole="button" accessibilityLabel="Open profile" onPress={() => navigation.navigate('Profile')} style={styles.header}>
          <View><Text style={styles.eyebrow}>YOUR READING ROOM</Text><Text style={styles.title}>Welcome, {currentUser?.name?.split(' ')[0] || 'reader'}</Text></View>
          <View style={styles.avatar}><Text style={styles.avatarText}>{currentUser?.name?.[0] || 'R'}</Text></View>
        </Pressable>
        <View style={styles.summary}>
          <Text style={styles.summaryLabel}>YOUR LIBRARY CARD</Text>
          <Text style={styles.summaryTitle}>${penaltyTotal.toFixed(2)} Penalties</Text>
          <View style={styles.progress}><View style={styles.progressFill} /></View>
        </View>
        <Text style={styles.sectionTitle}>Your journey</Text>
        <Action title="Borrow a Book" description="Search the full collection" onPress={() => navigation.navigate('Catalog')} />
        <Action title="Ask Circle" description="Get a recommendation from the library assistant" onPress={() => navigation.navigate('Circle')} />
                <Action title="History" description="See your requests and active loans" onPress={() => navigation.navigate('BorrowReturn')} />
        <Action title="Your Request" description="Track pending, approved, and declined requests" onPress={() => navigation.navigate('YourRequests')} />
        <Action title="Penalties" description="Review fees and submit a cashier receipt" onPress={() => navigation.navigate('Penalties')} />
        {requests.some((request) => request.status === 'Approved - pick up') && (
          <View style={styles.notice}><Text style={styles.noticeIcon}>!</Text><View><Text style={styles.noticeTitle}>Pickup ready</Text><Text style={styles.noticeText}>An approved request is ready at the library desk.</Text></View></View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Action({ title, description, onPress }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.action, pressed && styles.pressed]}>
      <View style={styles.actionCopy}><Text style={styles.actionTitle}>{title}</Text><Text style={styles.actionDescription}>{description}</Text></View>
      <Text style={styles.arrow}>→</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FBF8F1' },
  content: { padding: 20, paddingBottom: 42 },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  eyebrow: { color: '#A65D35', fontSize: 10, fontWeight: '800', letterSpacing: 1.1 },
  title: { color: '#3B2418', fontFamily: 'Georgia', fontSize: 25, marginTop: 7 },
  avatar: { alignItems: 'center', backgroundColor: '#E8D2B9', borderRadius: 22, height: 44, justifyContent: 'center', width: 44 },
  avatarText: { color: '#6B3E27', fontSize: 17, fontWeight: '800' },
  summary: { backgroundColor: '#6B3E27', borderRadius: 16, marginBottom: 29, padding: 21 },
  summaryLabel: { color: '#E8D2B9', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  summaryTitle: { color: '#FFFDF8', fontFamily: 'Georgia', fontSize: 31, marginTop: 17 },
  progress: { backgroundColor: '#855F4C', height: 4, marginTop: 21 },
  progressFill: { backgroundColor: '#E3AA60', height: 4, width: '66%' },
  sectionTitle: { color: '#3B2418', fontFamily: 'Georgia', fontSize: 21, marginBottom: 12 },
  action: { alignItems: 'center', backgroundColor: '#FFFDF8', borderColor: '#E9DED0', borderRadius: 13, borderWidth: 1, flexDirection: 'row', marginBottom: 10, padding: 15 },
  pressed: { opacity: 0.7 },
  actionCopy: { flex: 1, marginLeft: 13 },
  actionTitle: { color: '#3B2418', fontSize: 15, fontWeight: '700' },
  actionDescription: { color: '#856F61', fontSize: 11, marginTop: 5 },
  arrow: { color: '#A65D35', fontSize: 20 },
  notice: { alignItems: 'center', backgroundColor: '#E4EEE8', borderRadius: 12, flexDirection: 'row', marginTop: 18, padding: 15 },
  noticeIcon: { alignItems: 'center', backgroundColor: '#8BB797', borderRadius: 15, color: '#FFF', fontWeight: '800', height: 30, paddingTop: 6, textAlign: 'center', width: 30 },
  noticeTitle: { color: '#2C3A37', fontSize: 13, fontWeight: '700' },
  noticeText: { color: '#678271', fontSize: 11, marginTop: 4 },
  accountAction: { color: '#A65D35', fontSize: 11, marginTop: 20, textAlign: 'center', textDecorationLine: 'underline' },
});
