import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from './src/screens/HomeScreen.jsx';
import AdminScreen from './src/screens/AdminScreen.jsx';
import CatalogScreen from './src/screens/CatalogScreen.jsx';
import CircleScreen from './src/screens/CircleScreen.jsx';
import BorrowReturnScreen from './src/screens/BorrowReturnScreen.jsx';
import AdminBooksScreen from './src/screens/AdminBooksScreen.jsx';
import AdminBookFormScreen from './src/screens/AdminBookFormScreen.jsx';
import RegistrationScreen from './src/screens/RegistrationScreen.jsx';
import ReturnConfirmScreen from './src/screens/ReturnConfirmScreen.jsx';
import AdminUsersScreen from './src/screens/AdminUsersScreen.jsx';
import { LibraryProvider } from './src/state/LibraryContext.jsx';
import PenaltyPaymentsScreen from './src/screens/PenaltyPaymentsScreen.jsx';
import PenaltiesScreen from './src/screens/PenaltiesScreen.jsx';
import YourRequestsScreen from './src/screens/YourRequestsScreen.jsx';
import LoginScreen from './src/screens/LoginScreen.jsx';
import ChangePasswordScreen from './src/screens/ChangePasswordScreen.jsx';
import ProfileScreen from './src/screens/ProfileScreen.jsx';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <LibraryProvider>
      <NavigationContainer>
        <Stack.Navigator
        initialRouteName="Login"
        screenOptions={{
          headerStyle: { backgroundColor: '#FBF8F1' },
          headerTintColor: '#3B2418',
          headerTitleStyle: { fontWeight: '700' },
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ title: 'Member library' }}
        />
        <Stack.Screen name="YourRequests" component={YourRequestsScreen} options={{ title: 'Your Request' }} />
        <Stack.Screen name="Penalties" component={PenaltiesScreen} options={{ title: 'Penalties' }} />
        <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
        <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} options={{ title: 'Change password' }} />
        <Stack.Screen name="Catalog" component={CatalogScreen} options={{ title: 'Borrow a Book' }} />
        <Stack.Screen name="Circle" component={CircleScreen} options={{ title: 'Circle' }} />
        <Stack.Screen name="BorrowReturn" component={BorrowReturnScreen} options={{ title: 'History' }} />
        <Stack.Screen
          name="Admin"
          component={AdminScreen}
          options={{ title: 'Admin desk' }}
        />
        <Stack.Screen name="AdminBooks" component={AdminBooksScreen} options={{ title: 'Manage books' }} />
        <Stack.Screen name="AdminBookForm" component={AdminBookFormScreen} options={{ title: 'Add book' }} />
        <Stack.Screen name="Registration" component={RegistrationScreen} options={{ title: 'Register member' }} />
        <Stack.Screen name="ReturnConfirm" component={ReturnConfirmScreen} options={{ title: 'Confirm return' }} />
          <Stack.Screen name="AdminUsers" component={AdminUsersScreen} options={{ title: 'Find users' }} />
        <Stack.Screen name="PenaltyPayments" component={PenaltyPaymentsScreen} options={{ title: 'Penalty receipts' }} />
        </Stack.Navigator>
      </NavigationContainer>
    </LibraryProvider>
  );
}
