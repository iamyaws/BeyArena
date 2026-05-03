// LabPrimaryNudgeBanner — one-time nudge if the kid hasn't set primary_bey_id.
// Prompts them to set it so crew kids can fight against them. Dismissable via
// X button (localStorage flag).

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCurrentKid } from '../../hooks/useKid';

const STORAGE_KEY = 'beyarena.lab.primarySetNudgeDismissed';

export function LabPrimaryNudgeBanner() {
  const { data: me } = useCurrentKid();
  const nav = useNavigate();
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(STORAGE_KEY) === '1');

  // Don't render if: not loaded yet, primary already set, or dismissed.
  if (!me || me.primary_bey_id || dismissed) return null;

  return (
    <div
      role="status"
      style={{
        marginBottom: 14,
        padding: 12,
        background: 'rgba(37,99,235,0.10)',
        border: '1px solid rgba(37,99,235,0.30)',
        borderRadius: 10,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
      }}
    >
      <div style={{ fontSize: 18 }}>💡</div>
      <button
        onClick={() => nav('/profil')}
        style={{
          flex: 1,
          background: 'transparent',
          border: 'none',
          color: 'rgba(255,255,255,0.85)',
          textAlign: 'left',
          cursor: 'pointer',
          fontSize: 12,
          lineHeight: 1.45,
          padding: 0,
        }}
      >
        Setz deinen Haupt-Bey im Karte-Tab — dann können deine Freunde gegen dich kämpfen.
      </button>
      <button
        onClick={() => {
          localStorage.setItem(STORAGE_KEY, '1');
          setDismissed(true);
        }}
        aria-label="Nicht mehr zeigen"
        style={{
          background: 'transparent',
          border: 'none',
          color: 'rgba(255,255,255,0.5)',
          cursor: 'pointer',
          fontSize: 14,
          padding: 0,
          lineHeight: 1,
        }}
      >
        ✕
      </button>
    </div>
  );
}
