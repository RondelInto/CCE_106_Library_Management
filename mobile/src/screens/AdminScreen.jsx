import React from 'react';
import { Alert, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
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

export default function AdminScreen({ navigation }) {
  const { currentUser, requests, approveRequest, rejectRequest, error, loading, loans, users, books } = useLibrary();
  const [query, setQuery] = React.useState('');
  const [fromDate, setFromDate] = React.useState('');
  const [toDate, setToDate] = React.useState('');
  const [dueDates, setDueDates] = React.useState({});
  const [reasons, setReasons] = React.useState({});
  const [activeDatePicker, setActiveDatePicker] = React.useState(null);
  const dateFilterError = fromDate && toDate && fromDate > toDate
    ? 'The start date must be on or before the end date.'
    : '';
  const suggestedDate = (base = new Date()) => {
    const date = new Date(base);
    date.setDate(date.getDate() + 3);
    return formatDate(date);
  };
  const setPickedDueDate = (pickerKey, event, selectedDate) => {
    setActiveDatePicker(null);
    if (event.type === 'set' && selectedDate) {
      setDueDates((current) => ({ ...current, [pickerKey]: formatDate(selectedDate) }));
    }
  };
  const setPickedFilterDate = (filter, event, selectedDate) => {
    setActiveDatePicker(null);
    if (event.type === 'set' && selectedDate) {
      const setDate = filter === 'from' ? setFromDate : setToDate;
      setDate(formatDate(selectedDate));
    }
  };
  const filterDateLabel = (date) => (date ? parseDate(date).toLocaleDateString() : 'Choose date');
  const pending = requests.filter((request) => request.status === 'Ready to approve');
  const filteredRequests = requests.filter((request) => {
    const requestedDate = request.createdAt?.slice(0, 10) || '';
    const dueDate = request.dueDate || '';
    const localizedRequestedDate = request.createdAt ? new Date(request.createdAt).toLocaleDateString() : '';
    const localizedDueDate = request.dueDate ? new Date(request.dueDate).toLocaleDateString() : '';
    const dateText = [requestedDate, dueDate, localizedRequestedDate, localizedDueDate].filter(Boolean).join(' ');
    const matchesQuery = `${request.id} ${request.member} ${request.book} ${request.status} ${dateText}`.toLowerCase().includes(query.trim().toLowerCase());
    const matchesFrom = !fromDate || requestedDate >= fromDate;
    const matchesTo = !toDate || requestedDate <= toDate;

    return matchesQuery && matchesFrom && matchesTo && !dateFilterError;
  });
  const availableCopies = books.reduce((total, book) => total + book.copies, 0);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Pressable accessibilityRole="button" accessibilityLabel="Open profile" onPress={() => navigation.navigate('Profile')} style={styles.header}>
          <View><Text style={styles.eyebrow}>OPERATIONS / TODAY</Text><Text style={styles.title}>Welcome, {currentUser?.name?.split(' ')[0] || 'admin'}<Text style={styles.dot}>.</Text></Text><Text style={styles.subtitle}>Keep every request moving.</Text></View>
          <View style={styles.avatar}><Text>{currentUser?.name?.[0] || 'A'}</Text></View>
        </Pressable>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <View style={styles.actions}>
          <AdminAction title="Books" onPress={() => navigation.navigate('AdminBooks')} />
          <AdminAction title="Users" onPress={() => navigation.navigate('AdminUsers')} />
          <AdminAction title="Register" onPress={() => navigation.navigate('Registration')} />
          <AdminAction title="Returns" onPress={() => navigation.navigate('ReturnConfirm')} />
          <AdminAction title="Receipts" onPress={() => navigation.navigate('PenaltyPayments')} />
        </View>
        <View style={styles.stats}>
          <Stat label="Pending requests" value={pending.length} meta="Needs attention" />
          <Stat label="Books out" value={loans.length} meta="Active loans" />
          <Stat label="Copies available" value={availableCopies} meta="In the collection" />
          <Stat label="Members" value={users.filter((user) => user.role !== 'admin').length} meta="Library accounts" />
        </View>
        <View style={styles.sectionHeader}>
          <View><Text style={styles.eyebrow}>CLICK-AND-COLLECT</Text><Text style={styles.sectionTitle}>Borrow requests</Text></View>
          <Text style={styles.count}>{pending.length} pending</Text>
        </View>
        <TextInput value={query} onChangeText={setQuery} placeholder="Search requests, members, and dates" placeholderTextColor="#9C887A" style={styles.search} />
        <View style={styles.dateFilters}>
          <View style={styles.dateField}>
            <Text style={styles.dateLabel}>From date</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Select request start date${fromDate ? `, ${filterDateLabel(fromDate)}` : ''}`}
              onPress={() => setActiveDatePicker('filter-from')}
              style={styles.filterDateButton}
            >
              <Text style={fromDate ? styles.filterDateText : styles.filterDatePlaceholder}>{filterDateLabel(fromDate)}</Text>
            </Pressable>
            {activeDatePicker === 'filter-from' ? (
              <DateTimePicker
                value={fromDate ? parseDate(fromDate) : new Date()}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => setPickedFilterDate('from', event, selectedDate)}
              />
            ) : null}
          </View>
          <View style={styles.dateField}>
            <Text style={styles.dateLabel}>To date</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Select request end date${toDate ? `, ${filterDateLabel(toDate)}` : ''}`}
              onPress={() => setActiveDatePicker('filter-to')}
              style={styles.filterDateButton}
            >
              <Text style={toDate ? styles.filterDateText : styles.filterDatePlaceholder}>{filterDateLabel(toDate)}</Text>
            </Pressable>
            {activeDatePicker === 'filter-to' ? (
              <DateTimePicker
                value={toDate ? parseDate(toDate) : new Date()}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => setPickedFilterDate('to', event, selectedDate)}
              />
            ) : null}
          </View>
          {(fromDate || toDate) ? (
            <Pressable accessibilityRole="button" onPress={() => { setFromDate(''); setToDate(''); }} style={styles.clearDates}>
              <Text style={styles.clearDatesText}>Clear dates</Text>
            </Pressable>
          ) : null}
        </View>
        {dateFilterError ? <Text accessibilityRole="alert" style={styles.error}>{dateFilterError}</Text> : null}
        {!dateFilterError && filteredRequests.length === 0 ? <Text style={styles.emptyRequests}>No requests match this search and date range.</Text> : null}
        {filteredRequests.map((request) => (
          <View style={styles.request} key={request.id}>
            <View style={styles.bookMark}><Text style={styles.markText}>R</Text></View>
            <View style={styles.requestInfo}>
              <Text style={styles.person}>{request.member}</Text>
              <Text style={styles.meta}>{request.book}</Text>
              <Text style={styles.meta}>Requested {request.createdAt ? new Date(request.createdAt).toLocaleDateString() : 'date unavailable'}</Text>
              <Text style={styles.meta}>{request.due ? `Due ${request.due}` : 'Due date after approval'}</Text>
              <Text style={[styles.status, request.status.includes('pick') && styles.ready]}>{request.status}{request.reason ? `: ${request.reason}` : ''}</Text>
            </View>
            {request.status === 'Ready to approve' ? <View style={styles.requestButtons}>
              <Text style={styles.dateLabel}>Loan due date</Text>
              <Pressable accessibilityRole="button" accessibilityLabel={`Choose due date, currently ${dueDates[request.id] || suggestedDate()}`} onPress={() => setActiveDatePicker(`request-${request.id}`)} style={styles.datePickerButton}>
                <Text style={styles.datePickerText}>{dueDates[request.id] || suggestedDate()}</Text>
              </Pressable>
              {activeDatePicker === `request-${request.id}` ? (
                <DateTimePicker
                  value={parseDate(dueDates[request.id] || suggestedDate())}
                  mode="date"
                  display="default"
                  minimumDate={new Date()}
                  onChange={(event, selectedDate) => setPickedDueDate(request.id, event, selectedDate)}
                />
              ) : null}
              <Pressable disabled={loading} onPress={() => approveRequest(request.id, dueDates[request.id] || suggestedDate()).catch(() => {})} style={styles.approve}><Text style={styles.approveText}>Approve</Text></Pressable>
              <TextInput value={reasons[request.id] || ''} onChangeText={(value) => setReasons({ ...reasons, [request.id]: value })} placeholder="Required decline notice" style={styles.reasonInput} />
              <Pressable disabled={loading || (reasons[request.id] || '').trim().length < 5} onPress={() => Alert.alert('Confirm decline', `Send this required notice?\n\n${reasons[request.id]}`, [{ text: 'Cancel', style: 'cancel' }, { text: 'Decline', style: 'destructive', onPress: () => rejectRequest(request.id, reasons[request.id].trim()).catch(() => {}) }])} style={styles.decline}><Text style={styles.approveText}>Decline</Text></Pressable>
            </View> : null}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function AdminAction({ title, onPress }) {
  const iconType = {
    Books: 'books',
    Users: 'users',
    Register: 'register',
    Returns: 'returns',
    Receipts: 'receipt',
  }[title];

  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.adminAction, pressed && styles.adminActionPressed]}>
      <AdminActionIcon type={iconType} />
      <Text style={styles.actionTitle}>{title}</Text>
    </Pressable>
  );
}

function AdminActionIcon({ type }) {
  if (type === 'books') {
    return (
      <View accessible={false} style={styles.iconBooks}>
        <View style={styles.bookIconBack}><View style={styles.iconSpine} /></View>
        <View style={styles.bookIconFront}><View style={styles.iconSpine} /></View>
      </View>
    );
  }

  if (type === 'users') {
    return (
      <View accessible={false} style={styles.iconUsers}>
        <View style={styles.userFigure}>
          <View style={styles.userHead} />
          <View style={styles.userShoulders} />
        </View>
        <View style={styles.userFigureSecondary}>
          <View style={styles.userHeadSecondary} />
          <View style={styles.userShouldersSecondary} />
        </View>
      </View>
    );
  }

  if (type === 'register') {
    return (
      <View accessible={false} style={styles.iconDocument}>
        <View style={styles.documentLineLong} />
        <View style={styles.documentLineShort} />
        <View style={styles.documentLineLong} />
        <View style={styles.addMarkHorizontal} />
        <View style={styles.addMarkVertical} />
      </View>
    );
  }

  if (type === 'returns') {
    return (
      <View accessible={false} style={styles.iconReturn}>
        <View style={styles.returnLine} />
        <View style={styles.returnArrowHeadTop} />
        <View style={styles.returnArrowHeadBottom} />
        <View style={styles.returnBase} />
      </View>
    );
  }

  return (
    <View accessible={false} style={styles.iconDocument}>
      <View style={styles.documentLineLong} />
      <View style={styles.documentLineShort} />
      <View style={styles.documentLineLong} />
      <View style={styles.documentLineShort} />
    </View>
  );
}

function Stat({ label, value, meta }) {
  return <View style={styles.stat}><Text style={styles.statLabel}>{label}</Text><Text style={styles.statValue}>{value}</Text><Text style={styles.meta}>{meta}</Text></View>;
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#F5F3EE', flex: 1 },
  content: { padding: 20, paddingBottom: 45 },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25 },
  eyebrow: { color: '#9A7852', fontSize: 10, fontWeight: '700', letterSpacing: 1.1 },
  title: { color: '#25272B', fontFamily: 'Georgia', fontSize: 30, marginTop: 11 },
  dot: { color: '#CA7F47' },
  subtitle: { color: '#777A73', fontSize: 12, marginTop: 6 },
  avatar: { alignItems: 'center', backgroundColor: '#E3AA60', borderRadius: 20, height: 40, justifyContent: 'center', width: 40 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 25 },
  adminAction: { alignItems: 'center', backgroundColor: '#E4EEE8', borderRadius: 9, flexBasis: '18%', justifyContent: 'center', minHeight: 78, padding: 8 },
  adminActionPressed: { backgroundColor: '#D6E5DC' },
  actionTitle: { color: '#2C3A37', fontSize: 10, fontWeight: '600', marginTop: 8, textAlign: 'center' },
  iconBooks: { alignItems: 'center', flexDirection: 'row', height: 24, justifyContent: 'center', width: 28 },
  bookIconBack: { borderColor: '#496559', borderRadius: 2, borderWidth: 1.5, height: 19, justifyContent: 'center', marginRight: 2, width: 11 },
  bookIconFront: { backgroundColor: '#E4EEE8', borderColor: '#496559', borderRadius: 2, borderWidth: 1.5, height: 22, justifyContent: 'center', width: 12 },
  iconSpine: { backgroundColor: '#799587', height: 1.5, marginHorizontal: 2 },
  iconUsers: { alignItems: 'flex-end', flexDirection: 'row', height: 24, justifyContent: 'center', width: 30 },
  userFigure: { alignItems: 'center', height: 22, justifyContent: 'flex-end', width: 17 },
  userHead: { backgroundColor: '#E4EEE8', borderColor: '#496559', borderRadius: 6, borderWidth: 1.5, height: 9, position: 'absolute', top: 0, width: 9 },
  userShoulders: { backgroundColor: '#E4EEE8', borderColor: '#496559', borderTopLeftRadius: 7, borderTopRightRadius: 7, borderWidth: 1.5, height: 10, width: 16 },
  userFigureSecondary: { alignItems: 'center', height: 19, justifyContent: 'flex-end', marginLeft: -4, width: 15 },
  userHeadSecondary: { backgroundColor: '#E4EEE8', borderColor: '#496559', borderRadius: 5, borderWidth: 1.3, height: 8, position: 'absolute', top: 0, width: 8 },
  userShouldersSecondary: { backgroundColor: '#E4EEE8', borderColor: '#496559', borderTopLeftRadius: 6, borderTopRightRadius: 6, borderWidth: 1.3, height: 8, width: 14 },
  iconDocument: { alignItems: 'flex-start', backgroundColor: '#E4EEE8', borderColor: '#496559', borderRadius: 2, borderWidth: 1.5, height: 24, justifyContent: 'center', paddingHorizontal: 4, position: 'relative', width: 20 },
  documentLineLong: { backgroundColor: '#799587', height: 1.5, marginVertical: 2, width: 10 },
  documentLineShort: { backgroundColor: '#799587', height: 1.5, marginVertical: 2, width: 7 },
  addMarkHorizontal: { backgroundColor: '#496559', height: 1.5, position: 'absolute', right: -6, top: 8, width: 9 },
  addMarkVertical: { backgroundColor: '#496559', height: 9, position: 'absolute', right: -2, top: 4, width: 1.5 },
  iconReturn: { alignItems: 'center', borderColor: '#496559', borderRadius: 3, borderWidth: 1.5, height: 23, justifyContent: 'center', marginTop: 1, position: 'relative', width: 23 },
  returnLine: { backgroundColor: '#496559', height: 1.5, left: 5, position: 'absolute', top: 8, width: 12 },
  returnArrowHeadTop: { backgroundColor: '#496559', height: 1.5, left: 4, position: 'absolute', top: 6, transform: [{ rotate: '45deg' }], width: 6 },
  returnArrowHeadBottom: { backgroundColor: '#496559', height: 1.5, left: 4, position: 'absolute', top: 10, transform: [{ rotate: '-45deg' }], width: 6 },
  returnBase: { borderBottomColor: '#799587', borderBottomWidth: 1.5, borderLeftColor: '#799587', borderLeftWidth: 1.5, borderRadius: 2, borderRightColor: '#799587', borderRightWidth: 1.5, height: 7, marginTop: 9, width: 13 },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 1, marginBottom: 34 },
  stat: { backgroundColor: '#FBFAF6', borderColor: '#E0DDD5', borderWidth: 1, flexBasis: '48%', padding: 14 },
  statLabel: { color: '#86877F', fontSize: 10 },
  statValue: { color: '#25272B', fontFamily: 'Georgia', fontSize: 27, marginVertical: 7 },
  meta: { color: '#88877F', fontSize: 10 },
  sectionHeader: { alignItems: 'flex-end', borderBottomColor: '#D7D3CA', borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', paddingBottom: 13 },
  sectionTitle: { color: '#25272B', fontFamily: 'Georgia', fontSize: 23, marginTop: 7 },
  count: { color: '#598267', fontSize: 11 },
  error: { backgroundColor: '#F5E2D8', color: '#8D3E2C', marginBottom: 12, padding: 10 },
  request: { alignItems: 'center', backgroundColor: '#FBFAF6', borderBottomColor: '#EEEAE2', borderBottomWidth: 1, flexDirection: 'row', gap: 12, paddingVertical: 15 },
  bookMark: { alignItems: 'center', backgroundColor: '#685C89', height: 44, justifyContent: 'center', width: 34 },
  markText: { color: '#FFF', fontWeight: '700' },
  requestInfo: { flex: 1 },
  person: { color: '#25272B', fontSize: 13 },
  status: { color: '#B77A43', fontSize: 10, marginTop: 6 },
  ready: { color: '#548263' },
  approve: { backgroundColor: '#E4EEE8', borderColor: '#C7D9CD', borderWidth: 1, paddingHorizontal: 9, paddingVertical: 8 },
  approved: { backgroundColor: 'transparent', borderColor: 'transparent' },
  approveText: { color: '#46775C', fontSize: 10 },
  accountAction: { color: '#A65D35', fontSize: 11, marginTop: 20, textAlign: 'center', textDecorationLine: 'underline' },
  search: { backgroundColor: '#FBFAF6', borderColor: '#E0DDD5', borderRadius: 8, borderWidth: 1, color: '#25272B', height: 44, marginTop: 15, paddingHorizontal: 12 },
  dateFilters: { alignItems: 'flex-end', flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 10, marginTop: 10 },
  dateField: { flex: 1, minWidth: 125 },
  dateLabel: { color: '#777A73', fontSize: 10, marginBottom: 5 },
  filterDateButton: { backgroundColor: '#FBFAF6', borderColor: '#E0DDD5', borderRadius: 8, borderWidth: 1, height: 42, justifyContent: 'center', paddingHorizontal: 10 },
  filterDateText: { color: '#25272B', fontSize: 12 },
  filterDatePlaceholder: { color: '#9C887A', fontSize: 12 },
  clearDates: { borderColor: '#D7D3CA', borderRadius: 8, borderWidth: 1, justifyContent: 'center', minHeight: 42, paddingHorizontal: 12 },
  clearDatesText: { color: '#496559', fontSize: 11, fontWeight: '600' },
  emptyRequests: { color: '#777A73', fontSize: 12, paddingVertical: 20, textAlign: 'center' },
  requestButtons: { alignItems: 'flex-end', gap: 5 },
  dateInput: { backgroundColor: '#FBFAF6', borderColor: '#D7D3CA', borderWidth: 1, color: '#25272B', fontSize: 10, minWidth: 130, padding: 8 },
  dateLabel: { color: '#777A73', fontSize: 10 },
  datePickerButton: { backgroundColor: '#FBFAF6', borderColor: '#D7D3CA', borderWidth: 1, minWidth: 130, paddingHorizontal: 10, paddingVertical: 9 },
  datePickerText: { color: '#25272B', fontSize: 11 },
  reasonInput: { backgroundColor: '#FBFAF6', borderColor: '#D7D3CA', borderWidth: 1, color: '#25272B', fontSize: 10, minWidth: 150, padding: 8 },
  decline: { backgroundColor: '#F5E2D8', borderColor: '#EBC5B4', borderWidth: 1, padding: 8 },
  extension: { backgroundColor: '#FBFAF6', borderColor: '#E0DDD5', borderWidth: 1, gap: 8, marginTop: 10, padding: 12 },
});
