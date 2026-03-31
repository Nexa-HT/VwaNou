import './FloatingActions.css';

interface Props {
  is3DMode?: boolean;
  toggle3D?: () => void;
  onReport?: () => void;
  onLocate?: () => void;
}

const FloatingActions: React.FC<Props> = ({ is3DMode = false, toggle3D, onReport, onLocate }) => {
  return (
    <div className="vwanou-fab-container">
      {toggle3D && (
        <button 
          className={`fab ${is3DMode ? 'fab-primary' : 'fab-secondary'}`} 
          onClick={toggle3D} 
          aria-label={is3DMode ? 'Pase an 2D' : 'Pase an 3D'}
          title={is3DMode ? 'Pase an 2D' : 'Pase an 3D'}
          style={{ marginBottom: '16px' }}
        >
          {is3DMode ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="3" y1="9" x2="21" y2="9"></line>
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"></polygon>
              <line x1="8" y1="2" x2="8" y2="18"></line>
              <line x1="16" y1="6" x2="16" y2="22"></line>
            </svg>
          )}
          <span>{is3DMode ? '2D' : '3D'}</span>
        </button>
      )}

      <button
        className="fab fab-report"
        onClick={onReport}
        aria-label="Rapòte yon ensidan"
        title="Rapòte yon ensidan"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
        </svg>
        <span>Rapòte</span>
      </button>

      <button className="fab fab-secondary" aria-label="Pozisyon m" title="Pozisyon m" onClick={onLocate}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="3 11 22 2 13 21 11 13 3 11"></polygon>
        </svg>
      </button>
    </div>
  );
};

export default FloatingActions;
