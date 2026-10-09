import { useEffect, useState } from 'react';
import Home from './pages/Home.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import Login from './pages/Login.jsx';
import { clearAuthToken, getCurrentUser, hasAuthToken, logout } from './services/api.js';
import { useLibrary } from './state/LibraryContext.jsx';

function App() {
  const [user, setUser] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [initializingLibrary, setInitializingLibrary] = useState(true);
  const role = user?.role === 'admin' ? 'admin' : 'member';
  const library = useLibrary();

  useEffect(() => {
    if (!hasAuthToken()) {
      setCheckingSession(false);
      return;
    }

    getCurrentUser()
      .then(setUser)
      .catch(() => clearAuthToken())
      .finally(() => setCheckingSession(false));
  }, []);

  useEffect(() => {
    if (!user || !role) return;
    setInitializingLibrary(true);
    library.loadLibrary(role)
      .catch(() => {})
      .finally(() => setInitializingLibrary(false));
  }, [user, role]);

  const signOut = async () => {
    try {
      await logout();
    } catch {
      clearAuthToken();
    }
    setUser(null);
  };
  const handleLogin = (authenticatedUser) => {
    setInitializingLibrary(true);
    setUser(authenticatedUser);
  };

  return (
    <div className="app-shell">
      {checkingSession ? <main className="login-page"><p>Checking your library account...</p></main>
        : !user ? <Login onLogin={handleLogin} />
          : initializingLibrary ? <main className="login-page"><p>Loading your library account...</p></main>
            : role === 'admin' ? <AdminDashboard onLogout={signOut} /> : <Home onLogout={signOut} />}
    </div>
  );
}

export default App;
