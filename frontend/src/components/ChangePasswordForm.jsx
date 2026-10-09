import { useState } from 'react';
import { updatePassword } from '../services/api.js';

function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setMessage('');
    setError('');
    if (password !== passwordConfirmation) {
      setError('The new passwords do not match.');
      return;
    }

    setSaving(true);
    try {
      const result = await updatePassword({
        current_password: currentPassword,
        password,
        password_confirmation: passwordConfirmation,
      });
      setMessage(result.message);
      setCurrentPassword('');
      setPassword('');
      setPasswordConfirmation('');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Your password could not be changed.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="password-form" onSubmit={submit}>
      <span className="eyebrow">YOUR ACCOUNT</span>
      <h3>Change your password</h3>
      <label>Current password<input type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required /></label>
      <label>New password<input type="password" autoComplete="new-password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
      <label>Confirm new password<input type="password" autoComplete="new-password" minLength={8} value={passwordConfirmation} onChange={(event) => setPasswordConfirmation(event.target.value)} required /></label>
      {error && <p className="login-error" role="alert">{error}</p>}
      {message && <p className="success-message" role="status">{message}</p>}
      <button className="primary-button" disabled={saving} type="submit">{saving ? 'Saving...' : 'Change password'} <span>→</span></button>
    </form>
  );
}

export default ChangePasswordForm;
