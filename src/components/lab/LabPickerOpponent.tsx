// LabPickerOpponent — bottom sheet with two segments: Wild (5 trainer cards
// + Zufällig + "Bey bestimmen") and Crew (kids with a primary_bey_id set).
// Spec section 5.3.

import { useState } from 'react';
import { LAB_TRAINERS } from '../../data/labTrainers';
import { useCrewKidsWithPrimary } from '../../hooks/useCrewKidsWithPrimary';
import { LabPickerBey } from './LabPickerBey';
import type { OpponentKind } from '../../lib/labEngine';
import { Bey } from '../bey/Bey';
import { beyVisualFromDb } from '../bey/beyVisual';

interface Props {
  open: boolean;
  onPick: (k: OpponentKind, label: string) => void;
  onClose: () => void;
}

type Tab = 'wild' | 'crew';

export function LabPickerOpponent({ open, onPick, onClose }: Props) {
  const [tab, setTab] = useState<Tab>('wild');
  const [chooseBeyOpen, setChooseBeyOpen] = useState(false);
  const { data: crew = [] } = useCrewKidsWithPrimary();

  if (!open) return null;

  return (
    <>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Gegner wählen"
        onClick={onClose}
        className="fixed inset-0 z-40 flex flex-col justify-end"
        style={{ background: 'rgba(0,0,0,0.55)' }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="bx-card"
          style={{
            maxHeight: '80vh',
            overflowY: 'auto',
            borderRadius: '20px 20px 0 0',
            padding: '18px 18px max(22px, calc(env(safe-area-inset-bottom) + 12px))',
          }}
        >
          <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
            <div className="bx-eyebrow">Gegner wählen</div>
            <button
              onClick={onClose}
              aria-label="Schließen"
              className="bx-btn bx-btn-ghost"
              style={{ padding: '6px 10px', fontSize: 12 }}
            >
              Schließen
            </button>
          </div>

          <div className="flex" style={{ gap: 6, marginBottom: 14 }}>
            <button
              onClick={() => setTab('wild')}
              className={`bx-btn ${tab === 'wild' ? 'bx-btn-yellow' : 'bx-btn-ghost'}`}
              style={{ flex: 1, padding: '8px', fontSize: 12 }}
            >
              Wild
            </button>
            <button
              onClick={() => setTab('crew')}
              className={`bx-btn ${tab === 'crew' ? 'bx-btn-yellow' : 'bx-btn-ghost'}`}
              style={{ flex: 1, padding: '8px', fontSize: 12 }}
            >
              Crew
            </button>
          </div>

          {tab === 'wild' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
                {LAB_TRAINERS.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => onPick({ kind: 'trainer', trainerId: t.id }, t.name)}
                    className="bx-card"
                    style={{
                      minWidth: 140,
                      padding: 12,
                      textAlign: 'center',
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                  >
                    <div style={{ fontSize: 28 }}>{t.emoji}</div>
                    <div className="bx-display" style={{ fontSize: 13, marginTop: 4 }}>
                      {t.name}
                    </div>
                    <div className="bx-mono" style={{ fontSize: 9, marginTop: 6, color: 'var(--bx-mute)' }}>
                      „{t.flavor}"
                    </div>
                  </button>
                ))}
              </div>

              <button
                onClick={() => onPick({ kind: 'wild' }, 'Zufällig')}
                className="bx-btn bx-btn-ghost"
                style={{ width: '100%', padding: '12px' }}
              >
                🎲 Komplett zufällig
              </button>

              <button
                onClick={() => setChooseBeyOpen(true)}
                className="bx-btn bx-btn-ghost"
                style={{ width: '100%', padding: '12px' }}
              >
                Bey bestimmen
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {crew.length === 0 && (
                <div className="bx-mono" style={{ fontSize: 11, color: 'var(--bx-mute)', padding: 12 }}>
                  Keine Crew-Kids gefunden.
                </div>
              )}
              {crew.map((k) => {
                const hasPrimary = !!k.primary_bey;
                const visual = k.primary_bey ? beyVisualFromDb(k.primary_bey) : null;
                return (
                  <button
                    key={k.id}
                    disabled={!hasPrimary}
                    onClick={() =>
                      hasPrimary && onPick({ kind: 'crew', kidId: k.id }, k.display_name)
                    }
                    className="bx-card flex items-center"
                    style={{
                      padding: 10,
                      gap: 10,
                      cursor: hasPrimary ? 'pointer' : 'default',
                      opacity: hasPrimary ? 1 : 0.45,
                      textAlign: 'left',
                    }}
                  >
                    <Bey bey={visual} size={36} spin={hasPrimary} />
                    <div style={{ flex: 1 }}>
                      <div className="bx-display" style={{ fontSize: 13 }}>
                        {k.display_name}
                      </div>
                      <div className="bx-mono" style={{ fontSize: 9, color: 'var(--bx-mute)' }}>
                        {hasPrimary ? (k.primary_bey?.name_de ?? k.primary_bey?.name_en) : 'Kein Haupt-Bey gewählt'}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <LabPickerBey
        open={chooseBeyOpen}
        onPick={(beyId) => {
          onPick({ kind: 'wild', beyId }, 'Bey gewählt');
          setChooseBeyOpen(false);
        }}
        onClose={() => setChooseBeyOpen(false)}
      />
    </>
  );
}
