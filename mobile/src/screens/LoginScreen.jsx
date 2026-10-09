import React, { useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { login } from '../services/api.js';
import { useLibrary } from '../state/LibraryContext.jsx';

export default function LoginScreen({ navigation }) {
  const { loadLibrary } = useLibrary();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const signIn = async () => {
    setError('');
    setSubmitting(true);

    try {
      const user = await login({ email: email.trim(), password });
      const role = user.role === 'admin' ? 'admin' : 'member';
      await loadLibrary(role);
      navigation.reset({ index: 0, routes: [{ name: role === 'admin' ? 'Admin' : 'Home' }] });
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to sign in. Check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.brand}>
          <View style={styles.mark}><Text style={styles.markText}>R</Text></View>
          <Text style={styles.brandText}>Reverie{'\n'}<Text style={styles.brandSmall}>LIBRARY SERVICES</Text></Text>
        </View>
        <View style={styles.form}>
          <Text style={styles.eyebrow}>MEMBER ACCESS / 01</Text>
          <Text style={styles.title}>Welcome{ '\n' }back.</Text>
          <Text style={styles.description}>Sign in with the email and password associated with your library account.</Text>
          <Text style={styles.label}>Email address</Text>
          <TextInput
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor="#9B978F"
            style={styles.input}
            value={email}
          />
          <Text style={styles.label}>Password</Text>
          <TextInput
            autoCapitalize="none"
            onChangeText={setPassword}
            onSubmitEditing={signIn}
            placeholder="Enter your password"
            placeholderTextColor="#9B978F"
            secureTextEntry
            style={styles.input}
            value={password}
          />
          {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
          <Pressable accessibilityRole="button" disabled={submitting || !email || !password} onPress={signIn} style={[styles.button, (submitting || !email || !password) && styles.buttonDisabled]}>
            <Text style={styles.buttonText}>{submitting ? 'Signing in...' : 'Sign in'}</Text>
            <Text style={styles.arrow}>→</Text>
          </Pressable>
          <Text style={styles.footnote}>Need an account? Ask the library desk for access.</Text>
        </View>
        <Text style={styles.footer}>A calm way to find, borrow, and return what matters.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#202629', flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', padding: 22 },
  brand: { alignItems: 'center', flexDirection: 'row', gap: 11, marginBottom: 22 },
  mark: { alignItems: 'center', backgroundColor: '#E3AA60', borderRadius: 18, height: 36, justifyContent: 'center', width: 36 },
  markText: { color: '#202629', fontSize: 18, fontWeight: '700' },
  brandText: { color: '#F5F3EE', fontFamily: 'Georgia', fontSize: 19, lineHeight: 18 },
  brandSmall: { color: '#AEB8B2', fontFamily: 'Arial', fontSize: 8, letterSpacing: 1 },
  form: { backgroundColor: '#F5F3EE', padding: 24 },
  eyebrow: { color: '#9A7852', fontSize: 10, fontWeight: '800', letterSpacing: 1.1 },
  title: { color: '#25272B', fontFamily: 'Georgia', fontSize: 38, lineHeight: 38, marginTop: 13 },
  description: { color: '#777A73', fontSize: 12, lineHeight: 18, marginBottom: 23, marginTop: 12 },
  label: { color: '#777A73', fontSize: 11, marginBottom: 7, marginTop: 5 },
  input: { backgroundColor: '#FBFAF6', borderColor: '#D7D3CA', borderWidth: 1, color: '#25272B', height: 47, marginBottom: 15, paddingHorizontal: 12 },
  error: { backgroundColor: '#F5E2D8', color: '#8D3E2C', fontSize: 12, lineHeight: 18, marginBottom: 10, padding: 10 },
  button: { alignItems: 'center', backgroundColor: '#2C3A37', flexDirection: 'row', justifyContent: 'space-between', marginTop: 4, padding: 15 },
  buttonDisabled: { opacity: 0.55 },
  buttonText: { color: '#FFF', fontSize: 12 },
  arrow: { color: '#E3AA60', fontSize: 19 },
  footnote: { borderTopColor: '#D7D3CA', borderTopWidth: 1, color: '#898980', fontSize: 10, lineHeight: 15, marginTop: 21, paddingTop: 14 },
  footer: { color: '#85908A', fontSize: 11, marginTop: 22, textAlign: 'center' },
});