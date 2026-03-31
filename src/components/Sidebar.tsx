import type { Incident } from '../types/Incident';
import type { Zone } from '../types/Zone';
import './Sidebar.css';

interface SidebarProps {
  incidents: Incident[];
  zones: Zone[];
}

const Sidebar: React.FC<SidebarProps> = ({ incidents, zones }) => {
  const recentReports = incidents
    .slice()
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
    .slice(0, 5);

  const getIconClass = (type: string | undefined) => {
    const t = type?.toLowerCase() || '';
    if (t.includes('accident') || t.includes('violence') || t.includes('gunfire')) return 'accident';
    return 'protest';
  };

  const getRelativeTime = (timeStr?: string) => {
    if (!timeStr) return 'Sa gen kèk minit';
    const diffMs = Date.now() - new Date(timeStr).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `Sa gen ${Math.max(1, diffMins)} minit`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `Sa gen ${diffHours} èdtan`;
    return `Sa gen ${Math.floor(diffHours / 24)} jou`;
  };

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
            <span className="stat-value text-red">{incidents.length}</span>
            <span className="stat-label">Ensidan</span>
          </div>
          <div className="stat-card">
            <span className="stat-value text-orange">{zones.length}</span>
            <span className="stat-label">Zòn Danje</span>
          </div>
        </div>
      </div>

      <div className="sidebar-section incidents-list">
        <h3>Dènye Rapò Yo</h3>
        {recentReports.length === 0 ? (
          <p style={{ fontSize: '12px', color: '#94a3b8' }}>Pa gen oken rapò.</p>
        ) : (
          recentReports.map(incident => (
            <div key={incident.id} className="incident-item">
              <div className={`incident-icon ${getIconClass(incident.type)}`}></div>
              <div className="incident-details">
                <h4>{incident.type || 'Ensidan'}</h4>
                <p>
                  {incident.description ? (incident.description.substring(0, 30) + (incident.description.length > 30 ? '...' : '')) : 'Pa gen detay'} - {getRelativeTime(incident.createdAt)}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
