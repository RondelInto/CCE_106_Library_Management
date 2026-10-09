import React, { useState } from 'react';
import { Alert, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLibrary } from '../state/LibraryContext.jsx';

const isbnSuggestion = () => {
  const digits = `979${String(Date.now()).slice(-9).padStart(9, '0')}`;
  const sum = [...digits].reduce((total, digit, index) => total + Number(digit) * (index % 2 ? 3 : 1), 0);
  return `${digits}${(10 - (sum % 10)) % 10}`;
};

export default function AdminBookFormScreen({ navigation, route }) {
  const existing = route.params?.book;
  const { saveBook, genres, createGenre, updateGenre, deleteGenre, error, loading } = useLibrary();
  const [isbn, setIsbn] = useState(existing?.isbn || isbnSuggestion());
  const [title, setTitle] = useState(existing?.title || '');
  const [author, setAuthor] = useState(existing?.author || '');
  const [quantity, setQuantity] = useState(String(existing?.quantity ?? 1));
  const [genre, setGenre] = useState(existing?.category || '');
  const [newGenre, setNewGenre] = useState('');
  const [editingGenre, setEditingGenre] = useState('');
  const [genreMenuOpen, setGenreMenuOpen] = useState(false);
  const save = async () => {
    if (!isbn.trim() || !title.trim() || !author.trim() || !genre || !Number.isInteger(Number(quantity)) || Number(quantity) < 0) return;
    try {
      await saveBook({ isbn: isbn.trim(), title: title.trim(), author: author.trim(), category: genre, quantity: Number(quantity) }, existing?.apiId || existing?.id);
      navigation.goBack();
    } catch {
      // The shared library context displays the server validation message.
    }
  };
  const addGenre = async () => {
    if (!newGenre.trim()) return;
    try {
      const saved = editingGenre
        ? await updateGenre(editingGenre, newGenre.trim())
        : await createGenre(newGenre.trim());
      if (!editingGenre || genre.toLowerCase() === editingGenre.toLowerCase()) setGenre(saved);
      setNewGenre('');
      setEditingGenre('');
    } catch {
      // The shared library context displays duplicate and validation errors.
    }
  };
  const startEditingGenre = (item) => {
    setEditingGenre(item);
    setNewGenre(item);
  };
  const cancelEditingGenre = () => {
    setEditingGenre('');
    setNewGenre('');
  };
  const confirmDeleteGenre = (item) => {
    Alert.alert('Delete genre?', `Delete "${item}"? Genres assigned to books cannot be deleted.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteGenre(item).then(() => {
          if (genre.toLowerCase() === item.toLowerCase()) setGenre('');
        }).catch(() => {}),
      },
    ]);
  };
  return <SafeAreaView style={styles.container}><ScrollView contentContainerStyle={styles.content}>
    <Text style={styles.eyebrow}>ADMIN / COLLECTION</Text><Text style={styles.title}>{existing ? 'Edit book' : 'Add book'}</Text>
    {error ? <Text style={styles.error}>{error}</Text> : null}
    <Field label="Book ID / ISBN"><TextInput value={isbn} onChangeText={setIsbn} autoCapitalize="none" style={styles.input} /></Field>
    <Field label="Title"><TextInput value={title} onChangeText={setTitle} style={styles.input} /></Field>
    <Field label="Author"><TextInput value={author} onChangeText={setAuthor} style={styles.input} /></Field>
    <Field label="Quantity"><TextInput value={quantity} onChangeText={setQuantity} keyboardType="number-pad" style={styles.input} /></Field>
    <Text style={styles.label}>Genre</Text>
    <Pressable accessibilityRole="button" accessibilityLabel="Choose book genre" accessibilityState={{ expanded: genreMenuOpen }} onPress={() => setGenreMenuOpen((open) => !open)} style={styles.dropdown}><Text style={genre ? styles.dropdownValue : styles.dropdownPlaceholder}>{genre || 'Choose a genre'}</Text><Text style={styles.dropdownArrow}>{genreMenuOpen ? '−' : '+'}</Text></Pressable>
    {genreMenuOpen && <View style={styles.dropdownOptions}>{genres.map((item) => <View key={item} style={styles.dropdownOption}><Pressable onPress={() => { setGenre(item); setGenreMenuOpen(false); }} style={styles.genreChoice}><Text style={styles.genreText}>{item}</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel={`Edit ${item} genre`} disabled={loading} onPress={() => startEditingGenre(item)} style={styles.editGenre}><Text style={styles.editGenreText}>Edit</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel={`Delete ${item} genre`} disabled={loading} onPress={() => confirmDeleteGenre(item)} style={styles.deleteGenre}><Text style={styles.deleteGenreText}>Delete</Text></Pressable></View>)}</View>}
    <View style={styles.newGenreRow}><TextInput value={newGenre} onChangeText={setNewGenre} placeholder={editingGenre ? `Rename ${editingGenre}` : 'Add a new genre'} style={[styles.input, styles.genreInput]} /><Pressable disabled={loading || !newGenre.trim()} onPress={addGenre} style={styles.secondary}><Text style={styles.secondaryText}>{editingGenre ? 'Save' : 'Add genre'}</Text></Pressable>{editingGenre ? <Pressable onPress={cancelEditingGenre} style={styles.cancelGenre}><Text style={styles.cancelGenreText}>Cancel</Text></Pressable> : null}</View>
    <View style={styles.buttons}><Pressable onPress={() => navigation.goBack()} style={styles.cancel}><Text style={styles.cancelText}>Cancel</Text></Pressable><Pressable disabled={loading || !genre} onPress={save} style={styles.primary}><Text style={styles.primaryText}>{loading ? 'Saving...' : existing ? 'Save changes' : 'Add book'}</Text></Pressable></View>
  </ScrollView></SafeAreaView>;
}

function Field({ label, children }) {
  return <View style={styles.field}><Text style={styles.label}>{label}</Text>{children}</View>;
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#FBF8F1', flex: 1 }, content: { padding: 20, paddingBottom: 40 },
  eyebrow: { color: '#A65D35', fontSize: 10, fontWeight: '800', letterSpacing: 1.1 },
  title: { color: '#3B2418', fontFamily: 'Georgia', fontSize: 33, marginBottom: 20, marginTop: 9 },
  error: { backgroundColor: '#F5E2D8', color: '#8D3E2C', marginBottom: 10, padding: 10 },
  field: { marginBottom: 13 }, label: { color: '#795D4B', fontSize: 11, fontWeight: '700', marginBottom: 7 },
  input: { backgroundColor: '#F1E8DB', borderRadius: 9, color: '#3B2418', height: 46, paddingHorizontal: 13 },
  dropdown: { alignItems: 'center', backgroundColor: '#F1E8DB', borderRadius: 9, flexDirection: 'row', justifyContent: 'space-between', minHeight: 46, paddingHorizontal: 13 },
  dropdownValue: { color: '#3B2418', fontSize: 12 }, dropdownPlaceholder: { color: '#9C887A', fontSize: 12 }, dropdownArrow: { color: '#A65D35', fontSize: 18 },
  dropdownOptions: { backgroundColor: '#FFFDF8', borderColor: '#DDCDBB', borderWidth: 1, marginTop: 3 },
  dropdownOption: { alignItems: 'center', borderBottomColor: '#E9DED0', borderBottomWidth: 1, flexDirection: 'row', padding: 8 }, genreChoice: { flex: 1, padding: 5 }, genreText: { color: '#795D4B', fontSize: 11 },
  editGenre: { borderColor: '#C7D9CD', borderWidth: 1, marginRight: 6, paddingHorizontal: 9, paddingVertical: 7 }, editGenreText: { color: '#46775C', fontSize: 10 },
  deleteGenre: { borderColor: '#EBC5B4', borderWidth: 1, paddingHorizontal: 9, paddingVertical: 7 }, deleteGenreText: { color: '#8D3E2C', fontSize: 10 },
  newGenreRow: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 13 }, genreInput: { flex: 1 },
  secondary: { backgroundColor: '#E4EEE8', padding: 13 }, secondaryText: { color: '#2C3A37', fontSize: 10 },
  cancelGenre: { borderColor: '#DDCDBB', borderWidth: 1, padding: 12 }, cancelGenreText: { color: '#795D4B', fontSize: 10 },
  buttons: { flexDirection: 'row', gap: 9, marginTop: 24 }, cancel: { alignItems: 'center', borderColor: '#DDCDBB', borderWidth: 1, flex: 1, justifyContent: 'center', padding: 14 },
  cancelText: { color: '#795D4B', fontSize: 12 }, primary: { alignItems: 'center', backgroundColor: '#2C3A37', flex: 1, padding: 14 }, primaryText: { color: '#FFF', fontSize: 12 },
});
