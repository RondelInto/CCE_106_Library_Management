import { useState } from 'react';
import { login } from '../services/api.js';
import './Login.css';

function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      onLogin(await login({ email, password }));
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to sign in. Check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="login-page">
      <header className="role-brand"><span className="brand-mark">R</span><span>Reverie<br /><small>library services</small></span></header>
      <div className="login-layout">
        <section className="login-intro">
          <span className="eyebrow">YOUR LIBRARY, IN REACH</span>
          <h1>A place for<br /><em>what's next.</em></h1>
          <p>Sign in to find your next read and manage your library account.</p>
          <span className="login-rule" />
        </section>
        <section className="login-card" aria-labelledby="login-title">
          <span className="eyebrow">MEMBER ACCESS / 01</span>
          <h2 id="login-title">Welcome back.</h2>
          <p className="login-caption">Use the email and password associated with your library account.</p>
          <form onSubmit={handleSubmit}>
            <label htmlFor="login-email">Email address</label>
            <input id="login-email" name="email" type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} />
            <label htmlFor="login-password">Password</label>
            <input id="login-password" name="password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} />
            {error && <p className="login-error" role="alert">{error}</p>}
            <button className="primary-button login-submit" type="submit" disabled={submitting}>
              {submitting ? 'Signing in...' : 'Sign in'} <span aria-hidden="true">→</span>
            </button>
          </form>
          <p className="login-footnote">Need an account? Ask the library desk for access.</p>
        </section>
      </div>
      <footer className="login-footer">A calm way to find, borrow, and return what matters.</footer>
    </main>
  );
}

export default Login;