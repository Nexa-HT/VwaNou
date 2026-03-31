import React, { useState } from 'react';
import './AlertBanner.css';

interface Alert {
  id: string;
  level: 'kritik' | 'suspèk' | 'enfo';
  message: string;
  zone: string;
  time: string;
}

const DEMO_ALERTS: Alert[] = [
  { id: '1', level: 'kritik', message: 'Evitye zòn nan — Gen cho k ap tire', zone: 'Martissant', time: 'il y a 5 min' },
  { id: '2', level: 'suspèk', message: 'Blokis wout — Manifestasyon an cours', zone: 'Delmas 33', time: 'il y a 12 min' },
  { id: '3', level: 'enfo', message: 'Aksidan sikilasyon — Fe atansyon', zone: 'Pétion-Ville', time: 'il y a 22 min' },
];

const AlertBanner: React.FC = () => {
  const [dismissed, setDismissed] = useState<string[]>([]);
  const visible = DEMO_ALERTS.filter(a => !dismissed.includes(a.id));

  if (visible.length === 0) return null;

  const top = visible[0];

  const levelConfig = {
    kritik: { emoji: '🔴', label: 'DANJE KRITIK', color: 'banner-kritik' },
    suspèk: { emoji: '🟠', label: 'SITIYASYON SISPÈK', color: 'banner-suspek' },
    enfo: { emoji: 'ℹ️', label: 'ENFÒMASYON', color: 'banner-enfo' },
  };

  const cfg = levelConfig[top.level];

  return (
    <div className={`alert-banner ${cfg.color}`}>
      <div className="alert-inner">
        <div className="alert-left">
          <span className="alert-emoji">{cfg.emoji}</span>
          <div className="alert-text">
            <span className="alert-level">{cfg.label}</span>
            <span className="alert-message">{top.message}</span>
            <span className="alert-meta">📍 {top.zone} · {top.time}</span>
          </div>
        </div>
        <div className="alert-right">
          {visible.length > 1 && (
            <span className="alert-count">+{visible.length - 1} lòt</span>
          )}
          <button
            className="alert-dismiss"
            onClick={() => setDismissed(prev => [...prev, top.id])}
            aria-label="Fèmen"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AlertBanner;
