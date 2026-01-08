'use client';

import { useState } from 'react';

interface TopbarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onNewPostClick: () => void;
  onSavedClick?: () => void;
  loading?: boolean;
}

export default function Topbar({ searchQuery, onSearchChange, onNewPostClick, onSavedClick, loading = false }: TopbarProps) {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  return (
    <div className="topbar">
      <div className="container">
        <div className="topbar-inner">
          <div className="brand">
            <div className="logo">FA</div>
            <div>
              Failure Atlas
              <div className="tagline">Learn from what broke</div>
            </div>
          </div>
          <div className="search-box">
            <input
              type="text"
              placeholder="Search failures, causes, products…"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              disabled={loading}
            />
          </div>
          <div className="actions">
            <button className="btn icon" onClick={toggleTheme}>
              {theme === 'dark' ? '🌙' : '☀️'}
            </button>
            <button className="btn" onClick={onSavedClick}>🔖 Saved</button>
            <button className="btn primary" onClick={onNewPostClick}>
              ➕ New Failure
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

