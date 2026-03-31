import React from 'react';
import './Sidebar.css';

const Sidebar: React.FC = () => {
  return (
    <aside className="vwanou-sidebar glass-panel">
      <div className="sidebar-section">
        <h3>Filtre Dapre Kalite</h3>
        <div className="filter-options">
          <label className="filter-checkbox">
            <input type="checkbox" defaultChecked />
            <span className="checkmark" style={{ borderColor: 'var(--danger-red)' }}></span>
            Aksidan
          </label>
          <label className="filter-checkbox">
            <input type="checkbox" defaultChecked />
            <span className="checkmark" style={{ borderColor: 'var(--risk-orange)' }}></span>
            Manifestasyon
          </label>
          <label className="filter-checkbox">
            <input type="checkbox" defaultChecked />
            <span className="checkmark" style={{ borderColor: 'var(--info-green)' }}></span>
            Sekirite Piblik
          </label>
        </div>
      </div>
      
      <div className="sidebar-section">
        <h3>Estatistik (Jodi a)</h3>
        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-value text-red">12</span>
            <span className="stat-label">Ensidan</span>
          </div>
          <div className="stat-card">
            <span className="stat-value text-orange">4</span>
            <span className="stat-label">Zòn Danje</span>
          </div>
        </div>
      </div>

      <div className="sidebar-section incidents-list">
        <h3>Dènye Rapò Yo</h3>
        <div className="incident-item">
          <div className="incident-icon accident"></div>
          <div className="incident-details">
            <h4>Aksidan Sikilasyon</h4>
            <p>Wout Dèlma - Sa gen 15 minit</p>
          </div>
        </div>
        <div className="incident-item">
          <div className="incident-icon protest"></div>
          <div className="incident-details">
            <h4>Rasanbleman</h4>
            <p>Anba Lavil - Sa gen 1èdtan</p>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
