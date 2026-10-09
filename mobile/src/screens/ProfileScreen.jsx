import React from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { logout } from '../services/api.js';
import { useLibrary } from '../state/LibraryContext.jsx';

export default function ProfileScreen({ navigation }) {
  const { currentUser } = useLibrary();
  const signOut = async () => {
    try {
      await logout();
    } catch {
      // Local credentials are cleared even when the API cannot be reached.
    }
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  };
  const details = [
    ['Full name', currentUser?.name],
    ['Email address', currentUser?.email],
    ['Account type', currentUser?.member_type || currentUser?.role],
    ['School ID', currentUser?.library_id || 'Not applicable'],
    ['Address', currentUser?.address || 'Not provided'],
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>YOUR ACCOUNT</Text>
        <Text style={styles.title}>Profile</Text>
        <Text style={styles.description}>Your account details and password settings.</Text>
        <View style={styles.card}>
          <View style={styles.avatar}><Text style={styles.avatarText}>{currentUser?.name?.[0] || 'R'}</Text></View>
          <Text style={styles.name}>{currentUser?.name || 'Library account'}</Text>
          {details.map(([label, value]) => (
            <View style={styles.detail} key={label}>
              <Text style={styles.label}>{label}</Text>
              <Text style={styles.value}>{value || 'Not provided'}</Text>
            </View>
          ))}
        </View>
        <Pressable onPress={() => navigation.navigate('ChangePassword')} style={styles.button}>
          <Text style={styles.buttonText}>Change password</Text><Text style={styles.arrow}>→</Text>
        </Pressable>
        <Pressable onPress={signOut} style={styles.logout}><Text style={styles.logoutText}>Log out</Text></Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#FBF8F1', flex: 1 },
  content: { padding: 20, paddingBottom: 45 },
  eyebrow: { color: '#A65D35', fontSize: 10, fontWeight: '800', letterSpacing: 1.1 },
  title: { color: '#3B2418', fontFamily: 'Georgia', fontSize: 33, marginTop: 9 },
  description: { color: '#856F61', fontSize: 12, lineHeight: 18, marginBottom: 20, marginTop: 9 },
  card: { alignItems: 'center', backgroundColor: '#FFFDF8', borderColor: '#E9DED0', borderRadius: 13, borderWidth: 1, padding: 18 },
  avatar: { alignItems: 'center', backgroundColor: '#E8D2B9', borderRadius: 30, height: 60, justifyContent: 'center', width: 60 },
  avatarText: { color: '#6B3E27', fontSize: 24, fontWeight: '800' },
  name: { color: '#3B2418', fontFamily: 'Georgia', fontSize: 21, marginBottom: 12, marginTop: 12 },
  detail: { alignSelf: 'stretch', borderTopColor: '#E9DED0', borderTopWidth: 1, paddingVertical: 12 },
  label: { color: '#856F61', fontSize: 10 },
  value: { color: '#3B2418', fontSize: 13, marginTop: 5 },
  button: { alignItems: 'center', backgroundColor: '#2C3A37', flexDirection: 'row', justifyContent: 'space-between', marginTop: 18, padding: 15 },
  buttonText: { color: '#FFF', fontSize: 12 },
  arrow: { color: '#E3AA60', fontSize: 18 },
  logout: { alignItems: 'center', borderColor: '#DDCDBB', borderWidth: 1, marginTop: 12, padding: 14 },
  logoutText: { color: '#A65D35', fontSize: 12 },
});
