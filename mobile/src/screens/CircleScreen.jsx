import React, { useRef, useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { askCircle as getCircleReply } from '../services/circleAssistant.js';
import { useLibrary } from '../state/LibraryContext.jsx';

export default function CircleScreen() {
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState([]);
  const [requestingBookId, setRequestingBookId] = useState(null);
  const scrollRef = useRef(null);
  const { books, requests, loans, requestBook } = useLibrary();

  const ask = (message = prompt) => {
    const text = message.trim();
    if (!text) return;
    const reply = getCircleReply(text, { books, requests, loans });
    setMessages((current) => [...current, { from: 'you', text }, { from: 'circle', ...reply }]);
    setPrompt('');
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
  };

  const requestFromCircle = async (book) => {
    setRequestingBookId(book.id);
    try {
      await requestBook(book.apiId || book.id);
      setMessages((current) => [...current, {
        from: 'circle',
        text: `Your request for "${book.title}" was sent to the library desk for approval.`,
      }]);
    } catch (requestError) {
      setMessages((current) => [...current, {
        from: 'circle',
        text: requestError.response?.data?.message || `I could not submit a request for "${book.title}". Please try again.`,
      }]);
    } finally {
      setRequestingBookId(null);
      requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.hero}>
          <View style={styles.circle}><Text>✦</Text></View>
          <Text style={styles.eyebrow}>CIRCLE / LIBRARY ASSISTANT</Text>
          <Text style={styles.title}>How can I help with the library?</Text>
          <Text style={styles.subtitle}>Ask about the live catalog, your requests, or return dates.</Text>
        </View>
        <ScrollView
          ref={scrollRef}
          style={styles.messages}
          contentContainerStyle={styles.messageContent}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.sparkle}>✦</Text>
              <Text style={styles.emptyText}>Ask about available books, your requests,{'\n'}or when an active loan is due.</Text>
              <View style={styles.suggestions}>
                <Suggestion label="Available books" onPress={() => ask('What books are available?')} />
                <Suggestion label="My return dates" onPress={() => ask('What books do I need to return?')} />
                <Suggestion label="My requests" onPress={() => ask('What is my request status?')} />
              </View>
            </View>
          ) : messages.map((message, index) => (
            <View key={`${message.text}-${index}`} style={[styles.message, message.from === 'you' ? styles.you : styles.circleMessage]}>
              <Text style={message.from === 'you' ? styles.userText : styles.circleText}>{message.text}</Text>
              {message.items?.map((book) => (
                <View key={book.id} style={styles.bookResult}>
                  <Text style={styles.bookTitle}>{book.title}</Text>
                  <Text style={styles.bookMeta}>{book.author} · {book.category || 'Library'} · {book.copies} available</Text>
                  {message.canRequest && (
                    <Pressable
                      accessibilityRole="button"
                      disabled={requestingBookId !== null || book.copies < 1}
                      onPress={() => requestFromCircle(book)}
                      style={[styles.requestButton, (requestingBookId !== null || book.copies < 1) && styles.disabled]}
                    >
                      <Text style={styles.requestButtonText}>{requestingBookId === book.id ? 'Sending request...' : 'Request this book'}</Text>
                    </Pressable>
                  )}
                </View>
              ))}
            </View>
          ))}
        </ScrollView>
        <View style={styles.inputRow}>
          <TextInput
            value={prompt}
            onChangeText={setPrompt}
            onSubmitEditing={() => ask()}
            placeholder="Ask Circle about the library..."
            placeholderTextColor="#9C887A"
            returnKeyType="send"
            style={styles.input}
          />
          <Pressable accessibilityRole="button" accessibilityLabel="Send message" disabled={!prompt.trim() || requestingBookId !== null} onPress={() => ask()} style={styles.send}>
            <Text style={styles.sendText}>↑</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

function Suggestion({ label, onPress }) {
  return <Pressable onPress={onPress} style={styles.suggestion}><Text style={styles.suggestionText}>{label}</Text></Pressable>;
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#FBF8F1', flex: 1 },
  content: { flex: 1, padding: 20 },
  hero: { alignItems: 'center', borderBottomColor: '#E9DED0', borderBottomWidth: 1, paddingBottom: 18 },
  circle: { alignItems: 'center', backgroundColor: '#D5CFF1', borderRadius: 31, height: 62, justifyContent: 'center', marginBottom: 12, width: 62 },
  eyebrow: { color: '#665B98', fontSize: 10, fontWeight: '800', letterSpacing: 1.1 },
  title: { color: '#3B2418', fontFamily: 'Georgia', fontSize: 25, marginTop: 10, textAlign: 'center' },
  subtitle: { color: '#856F61', fontSize: 11, marginTop: 7, textAlign: 'center' },
  messages: { flex: 1 },
  messageContent: { flexGrow: 1, justifyContent: 'flex-end', paddingVertical: 16 },
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 25 },
  sparkle: { color: '#9A8BD1', fontSize: 30 },
  emptyText: { color: '#85867F', fontSize: 12, lineHeight: 19, marginTop: 10, textAlign: 'center' },
  suggestions: { gap: 8, marginTop: 18, width: '100%' },
  suggestion: { alignSelf: 'center', backgroundColor: '#F2EFFB', borderColor: '#D3CEE9', borderRadius: 8, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 9 },
  suggestionText: { color: '#7065A0', fontSize: 11 },
  message: { borderRadius: 8, marginBottom: 10, maxWidth: '88%', padding: 12 },
  you: { alignSelf: 'flex-end', backgroundColor: '#E9DFCF' },
  circleMessage: { alignSelf: 'flex-start', backgroundColor: '#E8E4F5' },
  userText: { color: '#4D443B', fontSize: 12, lineHeight: 18 },
  circleText: { color: '#554B85', fontSize: 12, lineHeight: 18 },
  bookResult: { borderTopColor: '#D3CEE9', borderTopWidth: 1, marginTop: 10, paddingTop: 9 },
  bookTitle: { color: '#37334A', fontFamily: 'Georgia', fontSize: 14 },
  bookMeta: { color: '#706B82', fontSize: 10, lineHeight: 15, marginTop: 4 },
  requestButton: { alignSelf: 'flex-start', backgroundColor: '#665B98', borderRadius: 6, marginTop: 8, paddingHorizontal: 10, paddingVertical: 8 },
  requestButtonText: { color: '#FFF', fontSize: 10 },
  disabled: { opacity: 0.55 },
  inputRow: { alignItems: 'center', borderColor: '#C9C5BB', borderRadius: 8, borderWidth: 1, flexDirection: 'row', paddingLeft: 13 },
  input: { color: '#3B2418', flex: 1, height: 45 },
  send: { alignItems: 'center', backgroundColor: '#665B98', borderRadius: 16, height: 32, justifyContent: 'center', marginRight: 6, width: 32 },
  sendText: { color: '#FFF', fontSize: 18 },
});
