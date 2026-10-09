export const categories = ['All books', 'Fiction', 'History', 'Science'];

export const books = [
  { id: '1', title: 'The Midnight Library', author: 'Matt Haig', category: 'Fiction', copies: 2, accent: '#A65D35' },
  { id: '2', title: 'Sapiens', author: 'Yuval Noah Harari', category: 'History', copies: 4, accent: '#496B58' },
  { id: '3', title: 'A Brief History of Time', author: 'Stephen Hawking', category: 'Science', copies: 1, accent: '#D0924A' },
  { id: '4', title: 'The Book Thief', author: 'Markus Zusak', category: 'Fiction', copies: 0, accent: '#7B4B35' },
];

export const borrowRequests = [
  { id: '1', member: 'Maya Chen', book: 'The Midnight Library', requested: 'Today', status: 'Ready to approve', due: 'Oct 04' },
  { id: '2', member: 'Daniel Okafor', book: 'Atomic Habits', requested: 'Yesterday', status: 'Approved - pick up', due: 'Oct 08' },
];
