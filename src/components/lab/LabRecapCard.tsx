// LabRecapCard — slides up after the battle screen finishes. Margin word in
// stencil, type-chart trio (tinted), reason copy keyed off Outcome.reasonKey,
// odds bar, and Nochmal/Anderes buttons. Spec section 5.5.

import { motion, useReducedMotion } from 'motion/react';
import type { Outcome, ReasonKey } from '../../lib/labEngine';
import type { Bey as DbBey } from '../../lib/types';

const REASON_COPY: Record<ReasonKey, string> = {
  'atk-cracks-def': 'Dein Angriff hat ihre Verteidigung geknackt.',
  'def-walls-atk': 'Deine Verteidigung hat alles gehalten.',
  'sta-outlasts-sta': 'Du hast länger gespinnt.',
  'atk-beats-sta': 'Dein Atk hat ihre Stamina zerlegt.',
  'sta-beats-def': 'Deine Stamina hat ihre Verteidigung überdauert.',
  'def-beats-atk': 'Deine Defense hat ihren Angriff abgeblockt.',
  'closer-stats': 'War echt knapp!',
  'upset': 'Pures Glück! Sie waren stärker, du hast trotzdem gewonnen.',
};

const REASON_COPY_LOSS: Record<ReasonKey, string> = {
  'atk-cracks-def': 'Ihr Angriff war zu stark.',
  'def-walls-atk': 'Ihre Verteidigung war zu fest.',
  'sta-outlasts-sta': 'Sie hat länger gespinnt.',
  'atk-beats-sta': 'Ihr Atk hat deine Stamina zerlegt.',
  'sta-beats-def': 'Ihre Stamina hat deine Verteidigung überdauert.',
  'def-beats-atk': 'Ihre Defense hat deinen Angriff abgeblockt.',
  'closer-stats': 'War echt knapp!',
  'upset': 'Pech! Du warst eigentlich stärker.',
};

const MARGIN_WORD = {
  knapp: 'KNAPP',
  klar: 'KLAR',
  zerstoert: 'ZERSTÖRT',
} as const;

interface Props {
  outcome: Outcome;
  myBey: DbBey;
  oppBey: DbBey;
  onAgain: () => void;
  onOther: () => void;
}

export function LabRecapCard({ outcome, myBey, oppBey, onAgain, onOther }: Props) {
  const reducedMotion = useReducedMotion();
  const winnerIsMe = outcome.winner === 'me';
  const copy = winnerIsMe ? REASON_COPY[outcome.reasonKey] : REASON_COPY_LOSS[outcome.reasonKey];
  const marginWord = MARGIN_WORD[outcome.margin];

  return (
    <motion.div
      initial={reducedMotion ? { opacity: 0 } : { y: '100%', opacity: 0.5 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: reducedMotion ? 0.2 : 0.4, ease: 'easeOut' }}
      className="bx fixed bottom-0 left-0 right-0 z-[60]"
      style={{
        background: 'var(--bx-ink)',
        borderTop: '1px solid rgba(255,255,255,0.12)',
        borderRadius: '20px 20px 0 0',
        padding: '20px 18px max(22px, calc(env(safe-area-inset-bottom) + 12px))',
      }}
    >
      <div
        className="bx-display"
        style={{
          fontSize: 36,
          textAlign: 'center',
          color: winnerIsMe ? '#22c55e' : 'var(--bx-crimson)',
          letterSpacing: '0.04em',
          lineHeight: 1,
        }}
      >
        {winnerIsMe ? marginWord + ' GEWONNEN' : marginWord + ' VERLOREN'}
      </div>

      <TypeTrio myType={myBey.type} oppType={oppBey.type} winnerIsMe={winnerIsMe} />

      <div
        style={{
          marginTop: 12,
          fontSize: 13,
          lineHeight: 1.45,
          color: 'rgba(255,255,255,0.85)',
          textAlign: 'center',
        }}
      >
        {copy}
      </div>

      <OddsBar myOdds={outcome.myOdds} winnerIsMe={winnerIsMe} />

      <div className="flex" style={{ gap: 8, marginTop: 18 }}>
        <button
          onClick={onOther}
          className="bx-btn bx-btn-ghost"
          style={{ flex: 1, padding: 14, fontSize: 14 }}
        >
          Anderes
        </button>
        <button
          onClick={onAgain}
          className="bx-btn bx-btn-crimson"
          style={{ flex: 1, padding: 14, fontSize: 14 }}
        >
          Nochmal
        </button>
      </div>
    </motion.div>
  );
}

function TypeTrio({ myType, oppType, winnerIsMe }: { myType: DbBey['type']; oppType: DbBey['type']; winnerIsMe: boolean }) {
  const TYPE_EMOJI: Record<NonNullable<DbBey['type']>, string> = {
    attack: '⚔', defense: '🛡', stamina: '⏱', balance: '⚖',
  };
  const me = myType ? TYPE_EMOJI[myType] : '?';
  const opp = oppType ? TYPE_EMOJI[oppType] : '?';

  // Tint: green if matchup favored the winner of this fight, red if not, grey if mirror/balance.
  const TYPE_BEATS = { attack: 'stamina', stamina: 'defense', defense: 'attack' } as const;
  let arrowColor = 'rgba(255,255,255,0.4)';
  if (myType && oppType && myType !== 'balance' && oppType !== 'balance') {
    const myBeats = TYPE_BEATS[myType as 'attack' | 'defense' | 'stamina'] === oppType;
    const oppBeats = TYPE_BEATS[oppType as 'attack' | 'defense' | 'stamina'] === myType;
    if (myBeats && winnerIsMe) arrowColor = '#22c55e';
    else if (oppBeats && !winnerIsMe) arrowColor = '#22c55e';
    else if (myBeats && !winnerIsMe) arrowColor = 'var(--bx-crimson)';
    else if (oppBeats && winnerIsMe) arrowColor = 'var(--bx-crimson)';
  }

  return (
    <div className="flex items-center justify-center" style={{ gap: 12, marginTop: 12, fontSize: 24 }}>
      <span>{me}</span>
      <span style={{ color: arrowColor, fontSize: 18 }}>➤</span>
      <span>{opp}</span>
    </div>
  );
}

function OddsBar({ myOdds, winnerIsMe }: { myOdds: number; winnerIsMe: boolean }) {
  const pct = Math.round(myOdds * 100);
  return (
    <div style={{ marginTop: 14 }}>
      <div className="bx-mono" style={{ fontSize: 9, color: 'var(--bx-mute)', marginBottom: 4 }}>
        DEINE CHANCEN VOR DEM KAMPF: {pct}%
      </div>
      <div
        style={{
          height: 6,
          background: 'rgba(255,255,255,0.08)',
          borderRadius: 3,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            background: winnerIsMe ? '#22c55e' : 'var(--bx-crimson)',
            transition: 'width 0.3s ease-out',
          }}
        />
      </div>
    </div>
  );
}
