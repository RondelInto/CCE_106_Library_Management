import React, { useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput } from 'react-native';
import { updatePassword } from '../services/api.js';

export default function ChangePasswordScreen() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setError('');
    setMessage('');
    if (password.length < 8) {
      setError('Your new password must be at least 8 characters.');
      return;
    }
    if (password !== confirmation) {
      setError('The new passwords do not match.');
      return;
    }

    setSaving(true);
    try {
      const result = await updatePassword({
        current_password: currentPassword,
        password,
        password_confirmation: confirmation,
      });
      setMessage(result.message);
      setCurrentPassword('');
      setPassword('');
      setConfirmation('');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Your password could not be changed.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.eyebrow}>YOUR ACCOUNT</Text>
        <Text style={styles.title}>Change your password</Text>
        <Text style={styles.description}>Only your signed-in account password will be changed.</Text>
        <Text style={styles.label}>Current password</Text>
        <TextInput autoCapitalize="none" autoComplete="current-password" onChangeText={setCurrentPassword} secureTextEntry style={styles.input} value={currentPassword} />
        <Text style={styles.label}>New password</Text>
        <TextInput autoCapitalize="none" autoComplete="new-password" onChangeText={setPassword} secureTextEntry style={styles.input} value={password} />
        <Text style={styles.label}>Confirm new password</Text>
        <TextInput autoCapitalize="none" autoComplete="new-password" onChangeText={setConfirmation} onSubmitEditing={submit} secureTextEntry style={styles.input} value={confirmation} />
        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
        {message ? <Text accessibilityRole="status" style={styles.success}>{message}</Text> : null}
        <Pressable accessibilityRole="button" disabled={saving || !currentPassword || !password || !confirmation} onPress={submit} style={[styles.button, (saving || !currentPassword || !password || !confirmation) && styles.disabled]}>
          <Text style={styles.buttonText}>{saving ? 'Saving...' : 'Change password'}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#FBF8F1', flex: 1 },
  content: { padding: 20, paddingBottom: 45 },
  eyebrow: { color: '#A65D35', fontSize: 10, fontWeight: '800', letterSpacing: 1.1 },
  title: { color: '#3B2418', fontFamily: 'Georgia', fontSize: 30, marginTop: 9 },
  description: { color: '#856F61', fontSize: 12, lineHeight: 18, marginBottom: 22, marginTop: 9 },
  label: { color: '#795D4B', fontSize: 11, marginBottom: 7, marginTop: 10 },
  input: { backgroundColor: '#FFFDF8', borderColor: '#DDCDBB', borderRadius: 9, borderWidth: 1, color: '#3B2418', height: 48, paddingHorizontal: 13 },
  error: { backgroundColor: '#F5E2D8', color: '#8D3E2C', marginTop: 14, padding: 10 },
  success: { backgroundColor: '#E4EEE8', color: '#46775C', marginTop: 14, padding: 10 },
  button: { alignItems: 'center', backgroundColor: '#2C3A37', marginTop: 24, padding: 15 },
  disabled: { opacity: 0.55 },
  buttonText: { color: '#FFF', fontSize: 12 },
});
