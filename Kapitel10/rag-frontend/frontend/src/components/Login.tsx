/**
 * Login-Komponente
 * Kapitel 10: RAG-Frontend & Zugriffskontrolle
 */

import { useState, FormEvent } from 'react';
import { useAuthStore } from '../stores/auth-store';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading, error, clearError } = useAuthStore();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    clearError();

    try {
      await login(email, password);
    } catch {
      // Fehler wird im Store behandelt
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>Wissensdatenbank</h1>
          <p>Melden Sie sich an, um fortzufahren</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">E-Mail</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@firma.de"
              required
              autoFocus
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Passwort</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="********"
              required
              autoComplete="current-password"
            />
          </div>

          <button type="submit" disabled={isLoading} className="login-button">
            {isLoading ? 'Anmelden...' : 'Anmelden'}
          </button>
        </form>

        <div className="demo-accounts">
          <p>Demo-Accounts:</p>
          <ul>
            <li><code>admin@demo.de</code> / <code>admin123</code></li>
            <li><code>manager@demo.de</code> / <code>manager123</code></li>
            <li><code>mitarbeiter@demo.de</code> / <code>mitarbeiter123</code></li>
          </ul>
        </div>
      </div>
    </div>
  );
}
