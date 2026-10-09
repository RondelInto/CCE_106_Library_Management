import React, { useMemo, useState } from 'react';
import { Alert, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLibrary } from '../state/LibraryContext.jsx';

export default function AdminBooksScreen({ navigation }) {
  const { books, deleteBook, error, loading } = useLibrary();
  const [query, setQuery] = useState('');
  const visibleBooks = useMemo(() => books.filter((book) => `${book.code} ${book.title} ${book.author}`.toLowerCase().includes(query.toLowerCase())), [books, query]);
  return <SafeAreaView style={styles.container}><ScrollView contentContainerStyle={styles.content}>
    <Text style={styles.eyebrow}>ADMIN / COLLECTION</Text><Text style={styles.title}>Manage books</Text>
    {error ? <Text style={styles.error}>{error}</Text> : null}
    <TextInput value={query} onChangeText={setQuery} placeholder="Search Book ID, title, author..." placeholderTextColor="#9C887A" style={styles.search} />
    <Pressable style={styles.primary} onPress={() => navigation.navigate('AdminBookForm')}><Text style={styles.primaryText}>Add book</Text></Pressable>
    <Text style={styles.section}>Book inventory · {visibleBooks.length}</Text>
    {visibleBooks.map((book) => <View style={styles.row} key={book.id}>
      <View style={styles.copy}><Text style={styles.bookTitle}>{book.title}</Text><Text style={styles.meta}>{book.code} · {book.author} · {book.copies} available / {book.quantity} total · {book.category}</Text></View>
      <Pressable onPress={() => navigation.navigate('AdminBookForm', { book })}><Text style={styles.edit}>Edit</Text></Pressable>
      <Pressable disabled={loading} onPress={() => Alert.alert('Delete book?', 'Books with circulation history cannot be deleted. You can set quantity to 0 instead.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => deleteBook(book.apiId || book.id).catch(() => {}) }])}><Text style={styles.delete}>Delete</Text></Pressable>
    </View>)}
    {visibleBooks.length === 0 ? <Text style={styles.meta}>No books match this search.</Text> : null}
  </ScrollView></SafeAreaView>;
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#FBF8F1', flex: 1 }, content: { padding: 20, paddingBottom: 40 },
  eyebrow: { color: '#A65D35', fontSize: 10, fontWeight: '800', letterSpacing: 1.1 },
  title: { color: '#3B2418', fontFamily: 'Georgia', fontSize: 33, marginBottom: 20, marginTop: 9 },
  error: { backgroundColor: '#F5E2D8', color: '#8D3E2C', marginBottom: 10, padding: 10 },
  search: { backgroundColor: '#E4EEE8', borderRadius: 9, color: '#2C3A37', height: 47, marginBottom: 12, paddingHorizontal: 13 },
  primary: { alignItems: 'center', backgroundColor: '#2C3A37', padding: 14 },
  primaryText: { color: '#FFF', fontSize: 12 },
  section: { color: '#3B2418', fontFamily: 'Georgia', fontSize: 20, marginBottom: 12, marginTop: 28 },
  row: { alignItems: 'center', backgroundColor: '#FFFDF8', borderBottomColor: '#E9DED0', borderBottomWidth: 1, flexDirection: 'row', gap: 12, padding: 12 },
  copy: { flex: 1 }, bookTitle: { color: '#3B2418', fontSize: 13, fontWeight: '700' },
  meta: { color: '#856F61', fontSize: 10, marginTop: 5 }, edit: { color: '#548263', fontSize: 10 }, delete: { color: '#BD7659', fontSize: 10 },
});
