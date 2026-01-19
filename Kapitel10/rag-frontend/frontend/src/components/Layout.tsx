/**
 * Layout-Komponente mit Navigation
 * Kapitel 10: RAG-Frontend & Zugriffskontrolle
 */

import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore, isAdmin } from '../stores/auth-store';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const { user, logout } = useAuthStore();

  const navItems = [
    { path: '/', label: 'Chat', icon: '💬' },
    { path: '/documents', label: 'Dokumente', icon: '📄' },
    ...(isAdmin(user) ? [{ path: '/audit', label: 'Audit', icon: '📋' }] : []),
  ];

  return (
    <div className="app-layout">
      <header className="app-header">
        <div className="header-left">
          <h1 className="app-title">Wissensdatenbank</h1>
          <nav className="main-nav">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`nav-link ${location.pathname === item.path ? 'active' : ''}`}
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
              </Link>
            ))}
          </nav>
        </div>

        <div className="header-right">
          <div className="user-info">
            <span className="user-name">{user?.name}</span>
            <span className={`role-badge role-${user?.role}`}>
              {user?.role}
            </span>
          </div>
          <button onClick={logout} className="logout-button">
            Abmelden
          </button>
        </div>
      </header>

      <main className="app-main">
        {children}
      </main>
    </div>
  );
}
