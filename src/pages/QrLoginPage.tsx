// QrLoginPage — kid QR-card login.
// Hero of the auth flow. Big tournament-card energy, halftone hero glow,
// scanner viewfinder with corner brackets + sweep animation.
//
// Visual structure ported from .design-handoff/project/login.jsx (LoginScreen).
// The design's mock click-to-scan is replaced with the real flow:
//   - URL has :token → call exchangeQrToken on mount, show "scanning" state
//   - on success → navigate to /
//   - on error → show "Karte hat nicht funktioniert" state
//   - no token (raw /q) → "Frag Marc nach einer Karte" placeholder

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

type LoginState = 'scanning' | 'error' | 'no-token';

export function QrLoginPage() {
  const { token } = useParams<{ token: string }>();
  const { exchangeQrToken } = useAuth();
  const nav = useNavigate();
  const [state, setState] = useState<LoginState>(token ? 'scanning' : 'no-token');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    exchangeQrToken(token)
      .then(() => nav('/', { replace: true }))
      .catch((e: unknown) => {
        setErrorMsg(e instanceof Error ? e.message : 'fehler');
        setState('error');
      });
  }, [token, exchangeQrToken, nav]);

  return (
    <div
      className="bx min-h-screen w-full flex flex-col relative overflow-hidden"
      style={{
        background:
          'radial-gradient(140% 70% at 50% -10%, #1a1410 0%, var(--bx-ink) 55%)',
      }}
    >
      {/* halftone hero glow */}
      <div
        className="bx-halftone absolute pointer-events-none"
        style={{ inset: '-10% -10% 60% -10%', opacity: 0.5 }}
      />
      <div
        className="absolute"
        style={{
          top: -120,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 320,
          height: 320,
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(253,224,71,0.18), transparent 60%)',
          filter: 'blur(20px)',
        }}
      />

      {/* Header */}
      <div className="relative" style={{ padding: '64px 24px 0' }}>
        <div className="bx-eyebrow flex items-center gap-2">
          <span
            className="bx-pulse"
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: '#22c55e',
            }}
          />
          <span>Saison 04 · Etage 1–100</span>
        </div>
        <div
          className="bx-display"
          style={{
            fontSize: 56,
            lineHeight: 0.85,
            marginTop: 14,
            letterSpacing: '0.01em',
          }}
        >
          BEY
          <br />
          ARENA<span style={{ color: 'var(--bx-yellow)' }}>.</span>
        </div>
        <div
          style={{
            marginTop: 12,
            color: 'var(--bx-mute)',
            fontSize: 14,
            lineHeight: 1.4,
            maxWidth: 280,
          }}
        >
          {state === 'error'
            ? 'Karte hat nicht funktioniert. Frag Marc nach einer neuen.'
            : 'Halt deine Karte vors Handy. Wir wissen dann, wer du bist.'}
        </div>
      </div>

      {/* Scanner viewfinder */}
      <div className="relative z-10" style={{ padding: '28px 24px 0' }}>
        <div
          className="bx-grid-fine relative"
          style={{
            aspectRatio: '1 / 1',
            borderRadius: 24,
            overflow: 'hidden',
            background: '#0a0a0e',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          {/* corner brackets */}
          {[
            { top: 14, left: 14, rot: 0 },
            { top: 14, right: 14, rot: 90 },
            { bottom: 14, right: 14, rot: 180 },
            { bottom: 14, left: 14, rot: 270 },
          ].map((p, i) => (
            <svg
              key={i}
              width="32"
              height="32"
              viewBox="0 0 32 32"
              style={{
                position: 'absolute',
                top: p.top,
                left: p.left,
                right: p.right,
                bottom: p.bottom,
                transform: `rotate(${p.rot}deg)`,
              }}
            >
              <path
                d="M 2 12 V 2 H 12"
                stroke="var(--bx-yellow)"
                strokeWidth="3"
                fill="none"
                strokeLinecap="square"
              />
            </svg>
          ))}

          {/* scanning sweep + label */}
          {state === 'scanning' && (
            <>
              <div
                className="absolute overflow-hidden rounded-lg"
                style={{ left: 14, right: 14, top: 14, bottom: 14 }}
              >
                <div
                  className="bx-sweep absolute"
                  style={{
                    left: 0,
                    right: 0,
                    height: 60,
                    background:
                      'linear-gradient(to bottom, transparent, rgba(253,224,71,0.45), transparent)',
                  }}
                />
              </div>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div
                  className="bx-display bx-yellow-glow"
                  style={{ fontSize: 28, color: 'var(--bx-yellow)' }}
                >
                  SCANNE…
                </div>
                <div
                  className="bx-mono"
                  style={{
                    marginTop: 8,
                    fontSize: 10,
                    letterSpacing: '0.2em',
                    color: 'rgba(255,255,255,0.4)',
                    textTransform: 'uppercase',
                  }}
                >
                  halt still
                </div>
              </div>
            </>
          )}

          {/* error state */}
          {state === 'error' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center px-4">
              <div
                className="bx-display"
                style={{ fontSize: 24, color: 'var(--bx-crimson)' }}
              >
                NICHT GEKLAPPT
              </div>
              <div
                className="bx-mono"
                style={{
                  fontSize: 10,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: 'rgba(255,255,255,0.45)',
                }}
              >
                {errorMsg ?? 'fehler'}
              </div>
            </div>
          )}

          {/* no token: idle "Karte hier hin" */}
          {state === 'no-token' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-white/60">
              <div
                className="flex items-center justify-center"
                style={{
                  width: 84,
                  height: 84,
                  borderRadius: 14,
                  border: '2px solid rgba(255,255,255,0.18)',
                }}
              >
                <svg
                  width="40"
                  height="40"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <rect x="3" y="3" width="6" height="6" />
                  <rect x="15" y="3" width="6" height="6" />
                  <rect x="3" y="15" width="6" height="6" />
                  <path d="M15 15 H 18 V 18 H 15 Z M 18 18 H 21 V 21 H 18 Z M 15 21 H 18" />
                </svg>
              </div>
              <div
                className="bx-mono"
                style={{
                  fontSize: 11,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: 'rgba(255,255,255,0.45)',
                }}
              >
                Karte hier hin
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action area */}
      <div className="relative" style={{ padding: '20px 24px 16px' }}>
        {state === 'no-token' ? (
          <div
            className="bx-btn bx-btn-ghost text-center"
            style={{ width: '100%', fontSize: 15, padding: '16px' }}
          >
            Frag Marc nach einer Karte
          </div>
        ) : state === 'error' ? (
          <button
            className="bx-btn bx-btn-yellow"
            style={{ width: '100%', fontSize: 17, padding: '16px' }}
            onClick={() => {
              // Go to the no-token idle state so the kid can re-scan a different card.
              // We deliberately do NOT navigate to '/' — that's KidRoute-protected and
              // would bounce them to /admin/login, which kids don't have access to.
              nav('/q', { replace: true });
            }}
          >
            ⚡ Nochmal scannen
          </button>
        ) : (
          <button
            disabled
            className="bx-btn bx-btn-yellow opacity-60"
            style={{ width: '100%', fontSize: 17, padding: '16px' }}
          >
            Lese Karte…
          </button>
        )}
      </div>

      {/* Footer — admin login link removed. Kids see this page; admin reaches their
          login via the dedicated /admin/login URL only (not exposed in kid UI). */}
      <div className="flex-1" />
      <div
        className="flex justify-end items-center"
        style={{
          padding: '10px 24px 28px',
          fontSize: 11,
          color: 'rgba(255,255,255,0.35)',
        }}
      >
        <span className="bx-mono">v0.4 · OFFLINE-OK</span>
      </div>
    </div>
  );
}
