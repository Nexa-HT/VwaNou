import { useState } from 'react';
import type { Incident } from '../types/Incident';
import './AlertBanner.css';

interface Alert {
  id: string;
  level: 'kritik' | 'suspèk' | 'enfo';
  message: string;
  zone: string;
  time: string;
}

interface AlertBannerProps {
  incidents: Incident[];
}

const AlertBanner: React.FC<AlertBannerProps> = ({ incidents }) => {
  const [dismissed, setDismissed] = useState<string[]>([]);

  // Map the most recent urgent incidents to alerts
  const mapIncidentToAlert = (i: Incident): Alert => {
    let level: Alert['level'] = 'enfo';
    const t = i.type?.toLowerCase() || '';
    if (t.includes('accident') || t.includes('violence') || t.includes('gunfire')) level = 'kritik';
    else if (t.includes('protest') || t.includes('hazard') || t.includes('roadblock')) level = 'suspèk';
    
    return {
      id: i.id,
      level,
      message: i.description || i.type,
      zone: `Kowòdone: ${i.position[0].toFixed(3)}, ${i.position[1].toFixed(3)}`,
      time: i.createdAt ? new Date(i.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Kounye a'
    };
  };

  const alertList = incidents
    .slice()
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
    .slice(0, 3)
    .map(mapIncidentToAlert);

  const visible = alertList.filter(a => !dismissed.includes(a.id));

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
            title="Fèmen"
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
