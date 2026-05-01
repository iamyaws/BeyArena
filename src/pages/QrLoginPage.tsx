// QrLoginPage — kid QR-card login.
// Hero of the auth flow. Big tournament-card energy, halftone hero glow,
// scanner viewfinder with corner brackets + sweep animation.
//
// Two entry paths:
//   1. /q/:token  — kid scanned with the phone's NATIVE camera; URL has the token.
//      Auto-exchange on mount, navigate to / on success.
//   2. /q (no token) — kid landed without a token (KidRoute redirect, "Nochmal
//      scannen", or bookmark). Show a "Karte scannen" button that opens the
//      device camera IN-APP via html5-qrcode and decodes the QR live.

import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import { useAuth } from '../hooks/useAuth';

type LoginState =
  | 'auto-scanning' // /q/:token: exchangeQrToken in progress
  | 'idle' // /q (no token): waiting for user to start camera
  | 'camera-scanning' // camera active, looking for a QR
  | 'exchanging' // QR detected, calling exchangeQrToken
  | 'error'; // any failure (token invalid, camera denied, etc.)

const READER_ID = 'bx-qr-reader';

// Pull the token out of a scanned URL. Accepts both absolute
// (`https://beyarena.vercel.app/q/<token>`) and path-only (`/q/<token>`) forms,
// case-insensitive on the hex.
function extractTokenFromQrPayload(payload: string): string | null {
  const m = payload.match(/\/q\/([a-fA-F0-9]{32,})/);
  return m ? m[1] : null;
}

export function QrLoginPage() {
  const { token } = useParams<{ token: string }>();
  const { exchangeQrToken } = useAuth();
  const nav = useNavigate();
  const [state, setState] = useState<LoginState>(token ? 'auto-scanning' : 'idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  // Auto-exchange when URL has :token (native-camera scan path)
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    exchangeQrToken(token)
      .then(() => {
        if (!cancelled) nav('/', { replace: true });
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setErrorMsg(e instanceof Error ? e.message : 'fehler');
        setState('error');
      });
    return () => {
      cancelled = true;
    };
  }, [token, exchangeQrToken, nav]);

  // Cleanup camera on unmount or state change away from camera-scanning
  useEffect(() => {
    return () => {
      const s = scannerRef.current;
      if (s) {
        s.stop()
          .catch(() => {})
          .finally(() => {
            try {
              s.clear();
            } catch {
              /* ignore */
            }
          });
        scannerRef.current = null;
      }
    };
  }, []);

  const handleScannedToken = useCallback(
    async (scannedToken: string) => {
      setState('exchanging');
      try {
        await exchangeQrToken(scannedToken);
        nav('/', { replace: true });
      } catch (e) {
        setErrorMsg(e instanceof Error ? e.message : 'fehler');
        setState('error');
      }
    },
    [exchangeQrToken, nav],
  );

  const startCamera = useCallback(async () => {
    setErrorMsg(null);
    // Move to camera-scanning so the viewfinder div mounts, THEN start the camera
    // (Html5Qrcode needs the target div in the DOM).
    setState('camera-scanning');
    // Wait one tick for React to render the target div
    await new Promise((r) => setTimeout(r, 50));
    try {
      const scanner = new Html5Qrcode(READER_ID, /* verbose */ false);
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 220, height: 220 },
          aspectRatio: 1.0,
        },
        async (decodedText) => {
          // Decoded — try to extract a token. Library may keep firing; we stop
          // the camera before exchanging so we don't double-fire.
          const t = extractTokenFromQrPayload(decodedText);
          if (!t) return; // unknown QR, keep scanning
          try {
            await scanner.stop();
          } catch {
            /* ignore */
          }
          try {
            scanner.clear();
          } catch {
            /* ignore */
          }
          scannerRef.current = null;
          await handleScannedToken(t);
        },
        () => {
          /* per-frame "no QR found" — ignore */
        },
      );
    } catch (e) {
      // Common failures: NotAllowedError (permission denied),
      // NotFoundError (no camera), NotReadableError (camera busy)
      const msg =
        e instanceof Error && e.message
          ? e.message
          : 'kamera nicht verfügbar';
      // eslint-disable-next-line no-console
      console.error('Camera start failed:', e);
      setErrorMsg(msg);
      setState('error');
      const s = scannerRef.current;
      if (s) {
        s.stop().catch(() => {});
        scannerRef.current = null;
      }
    }
  }, [handleScannedToken]);

  const cancelCamera = useCallback(async () => {
    const s = scannerRef.current;
    if (s) {
      try {
        await s.stop();
      } catch {
        /* ignore */
      }
      try {
        s.clear();
      } catch {
        /* ignore */
      }
      scannerRef.current = null;
    }
    setState('idle');
  }, []);

  const showSweep =
    state === 'auto-scanning' ||
    state === 'camera-scanning' ||
    state === 'exchanging';

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
            : state === 'camera-scanning'
              ? 'Halt deine Karte vor die Kamera.'
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
          {/* Camera feed target (only mounted when scanning to keep DOM clean
              between sessions). Html5Qrcode injects a <video> element here that
              fills the container. */}
          {state === 'camera-scanning' && (
            <div
              id={READER_ID}
              style={{
                position: 'absolute',
                inset: 0,
                background: '#000',
              }}
            />
          )}
          <style>{`
            #${READER_ID} video {
              width: 100% !important;
              height: 100% !important;
              object-fit: cover;
            }
          `}</style>

          {/* corner brackets — always visible to frame the viewfinder */}
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
                pointerEvents: 'none',
                zIndex: 2,
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

          {/* Sweep animation while scanning/exchanging */}
          {showSweep && (
            <div
              className="absolute overflow-hidden rounded-lg pointer-events-none"
              style={{ left: 14, right: 14, top: 14, bottom: 14, zIndex: 2 }}
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
          )}

          {/* "SCANNE..." label only for the URL-token (no live camera) flow */}
          {state === 'auto-scanning' && (
            <div
              className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
              style={{ zIndex: 3 }}
            >
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
          )}

          {/* Exchanging — QR found, calling backend */}
          {state === 'exchanging' && (
            <div
              className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
              style={{ zIndex: 3 }}
            >
              <div
                className="bx-display bx-yellow-glow"
                style={{ fontSize: 28, color: 'var(--bx-yellow)' }}
              >
                LOG DICH EIN…
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
                gleich da
              </div>
            </div>
          )}

          {/* error state */}
          {state === 'error' && (
            <div
              className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center px-4"
              style={{ zIndex: 3 }}
            >
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

          {/* idle (/q without token + camera not started) */}
          {state === 'idle' && (
            <div
              className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-white/60"
              style={{ zIndex: 3 }}
            >
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
                  <path d="M2 7V5a2 2 0 0 1 2-2h2" />
                  <path d="M22 7V5a2 2 0 0 0-2-2h-2" />
                  <path d="M2 17v2a2 2 0 0 0 2 2h2" />
                  <path d="M22 17v2a2 2 0 0 1-2 2h-2" />
                  <rect x="7" y="7" width="10" height="10" rx="1" />
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
                Tipp auf Karte scannen
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action area */}
      <div className="relative" style={{ padding: '20px 24px 16px' }}>
        {state === 'idle' ? (
          <button
            className="bx-btn bx-btn-yellow"
            style={{ width: '100%', fontSize: 17, padding: '16px' }}
            onClick={startCamera}
          >
            ⚡ Karte scannen
          </button>
        ) : state === 'camera-scanning' ? (
          <button
            className="bx-btn bx-btn-ghost"
            style={{ width: '100%', fontSize: 15, padding: '16px' }}
            onClick={cancelCamera}
          >
            Abbrechen
          </button>
        ) : state === 'error' ? (
          <button
            className="bx-btn bx-btn-yellow"
            style={{ width: '100%', fontSize: 17, padding: '16px' }}
            onClick={() => {
              // Retry: go to idle so the kid can try the camera again. We do NOT
              // navigate to '/' (KidRoute would bounce them to /admin/login —
              // kids don't have admin access).
              setErrorMsg(null);
              setState('idle');
            }}
          >
            ⚡ Nochmal scannen
          </button>
        ) : (
          // auto-scanning or exchanging
          <button
            disabled
            className="bx-btn bx-btn-yellow opacity-60"
            style={{ width: '100%', fontSize: 17, padding: '16px' }}
          >
            {state === 'exchanging' ? 'Anmelden…' : 'Lese Karte…'}
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
        <span className="bx-mono">v0.5 · CAMERA-OK</span>
      </div>
    </div>
  );
}
