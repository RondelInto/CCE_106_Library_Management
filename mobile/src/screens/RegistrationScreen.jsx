import React, { useEffect, useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useLibrary } from '../state/LibraryContext.jsx';

const fields = [
  ['library_id', 'School ID', true],
  ['first_name', 'First name', true],
  ['last_name', 'Last name', true],
  ['middle_name', 'Middle name (optional)', false],
  ['address', 'Address (optional)', false],
  ['email', 'Email address', true],
];

export default function RegistrationScreen({ navigation, route }) {
  const { registerMember, updateMember, error, loading } = useLibrary();
  const editingMember = route.params?.member || null;
  const [form, setForm] = useState({});
  const [saved, setSaved] = useState(false);
  const [temporaryPassword, setTemporaryPassword] = useState('');
  const [createdMember, setCreatedMember] = useState(null);
  const [copiedPassword, setCopiedPassword] = useState(false);
  const [copyError, setCopyError] = useState('');

  useEffect(() => {
    if (!editingMember) {
      setForm({});
      return;
    }
    const [firstName, ...lastNameParts] = editingMember.name.trim().split(/\s+/);
    setForm({
      library_id: editingMember.schoolId || '',
      first_name: firstName || '',
      last_name: lastNameParts.join(' '),
      middle_name: '',
      address: editingMember.address || '',
      email: editingMember.email || '',
      type: editingMember.role === 'Faculty / Staff' ? 'Faculty / Staff' : 'Student',
      sex: editingMember.sex || '',
    });
    setSaved(false);
    setTemporaryPassword('');
  }, [editingMember?.apiId]);

  const createAccount = async () => {
    if (!form.library_id?.trim() || !form.first_name?.trim() || !form.last_name?.trim() || !form.email?.trim()) return;
    setSaved(false);
    setTemporaryPassword('');
    setCreatedMember(null);
    setCopiedPassword(false);
    setCopyError('');
    try {
      const memberData = {
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        middle_name: form.middle_name?.trim() || null,
        email: form.email.trim(),
        library_id: form.library_id.trim(),
        member_type: form.type || 'Student',
        sex: form.sex || null,
        address: form.address || null,
      };
      if (editingMember) {
        await updateMember(editingMember.apiId, memberData);
        navigation.goBack();
        return;
      }
      const result = await registerMember(memberData);
      setSaved(true);
      setTemporaryPassword(result.temporary_password);
      setCreatedMember({ name: result.data.name, email: result.data.email });
      setForm({});
    } catch {
      // The shared library context displays the server's validation message.
    }
  };
  const copyPassword = async () => {
    try {
      await Clipboard.setStringAsync(temporaryPassword);
      setCopiedPassword(true);
      setCopyError('');
    } catch {
      setCopyError('Could not copy the password. Select and copy it manually.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>ADMIN / LIBRARY DESK</Text>
        <Text style={styles.title}>{editingMember ? 'Edit member' : 'Register a member'}</Text>
        <Text style={styles.description}>{editingMember ? 'Update this member’s profile details. Account access and penalties are not changed.' : 'Create a database-backed student or faculty account. Share its temporary password securely.'}</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {fields.map(([key, label, required]) => (
          <TextInput
            key={key}
            value={form[key] || ''}
            onChangeText={(value) => setForm({ ...form, [key]: value })}
            placeholder={`${label}${required ? ' *' : ''}`}
            placeholderTextColor="#9C887A"
            style={styles.input}
            keyboardType={key === 'email' ? 'email-address' : 'default'}
            autoCapitalize={key === 'email' ? 'none' : 'words'}
          />
        ))}
        <Text style={styles.label}>Member type</Text>
        <View style={styles.choices}>
          <Choice label="Student" selected={form.type === 'Student' || !form.type} onPress={() => setForm({ ...form, type: 'Student' })} />
          <Choice label="Faculty / Staff" selected={form.type === 'Faculty / Staff'} onPress={() => setForm({ ...form, type: 'Faculty / Staff' })} />
        </View>
        <Text style={styles.label}>Sex</Text>
        <View style={styles.choices}>
          <Choice label="Male" selected={form.sex === 'Male'} onPress={() => setForm({ ...form, sex: 'Male' })} />
          <Choice label="Female" selected={form.sex === 'Female'} onPress={() => setForm({ ...form, sex: 'Female' })} />
        </View>
        <Pressable disabled={loading || !form.library_id?.trim() || !form.first_name?.trim() || !form.last_name?.trim() || !form.email?.trim()} onPress={createAccount} style={[styles.primary, (loading || !form.library_id?.trim() || !form.first_name?.trim() || !form.last_name?.trim() || !form.email?.trim()) && styles.disabled]}>
          <Text style={styles.primaryText}>{loading ? 'Saving...' : saved ? 'Account created' : editingMember ? 'Save member details' : 'Create library account'}</Text>
        </Pressable>
        {temporaryPassword ? <View style={styles.credentials} accessibilityLiveRegion="polite">
          <Text style={styles.credentialsTitle}>Member account created</Text>
          <Text style={styles.credentialsMember}>{createdMember?.name} · {createdMember?.email}</Text>
          <Text style={styles.credentialsHelp}>Share this temporary password securely. It will only be shown here once.</Text>
          <Text selectable style={styles.temporaryPassword}>{temporaryPassword}</Text>
          <Pressable accessibilityRole="button" onPress={copyPassword} style={styles.copyButton}>
            <Text style={styles.copyText}>{copiedPassword ? 'Password copied' : 'Copy password'}</Text>
          </Pressable>
          {copyError ? <Text accessibilityRole="alert" style={styles.error}>{copyError}</Text> : null}
        </View> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function Choice({ label, selected, onPress }) {
  return <Pressable onPress={onPress} style={[styles.choice, selected && styles.choiceSelected]}><Text style={selected ? styles.choiceTextSelected : styles.choiceText}>{label}</Text></Pressable>;
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#FBF8F1', flex: 1 },
  content: { padding: 20, paddingBottom: 45 },
  eyebrow: { color: '#A65D35', fontSize: 10, fontWeight: '800', letterSpacing: 1.1 },
  title: { color: '#3B2418', fontFamily: 'Georgia', fontSize: 33, marginTop: 9 },
  description: { color: '#856F61', fontSize: 12, lineHeight: 18, marginBottom: 23, marginTop: 9 },
  error: { backgroundColor: '#F5E2D8', color: '#8D3E2C', marginBottom: 10, padding: 10 },
  credentials: { backgroundColor: '#E4EEE8', marginTop: 12, padding: 13 },
  credentialsTitle: { color: '#2C3A37', fontSize: 13, fontWeight: '700' },
  credentialsMember: { color: '#46775C', fontSize: 11, marginTop: 6 },
  credentialsHelp: { color: '#46775C', fontSize: 10, lineHeight: 15, marginTop: 8 },
  temporaryPassword: { color: '#2C3A37', fontSize: 14, marginTop: 10, paddingVertical: 6 },
  copyButton: { alignItems: 'center', backgroundColor: '#2C3A37', marginTop: 5, padding: 11 },
  copyText: { color: '#FFF', fontSize: 11 },
  input: { backgroundColor: '#F1E8DB', borderRadius: 9, color: '#3B2418', height: 47, marginBottom: 10, paddingHorizontal: 13 },
  label: { color: '#795D4B', fontSize: 11, fontWeight: '700', marginBottom: 8, marginTop: 10 },
  choices: { flexDirection: 'row', gap: 8 },
  choice: { borderColor: '#DDCDBB', borderRadius: 9, borderWidth: 1, flex: 1, padding: 12 },
  choiceSelected: { backgroundColor: '#E4EEE8', borderColor: '#72A883' },
  choiceText: { color: '#795D4B', fontSize: 11, textAlign: 'center' },
  choiceTextSelected: { color: '#46775C', fontSize: 11, fontWeight: '700', textAlign: 'center' },
  primary: { backgroundColor: '#2C3A37', marginTop: 26, padding: 15 },
  disabled: { opacity: 0.55 },
  primaryText: { color: '#FFF', fontSize: 12, textAlign: 'center' },
});
