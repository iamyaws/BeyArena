// Hardcoded trainer roster for the Battle Lab. 5 fictional rivals, each with
// a distinct picking style. Picking happens at fight-start (not on tap),
// so the same trainer rolls a different bey each match. See spec section 6.

import type { Bey } from '../lib/types';

export interface LabTrainer {
  id: string;
  name: string;
  emoji: string;
  flavor: string;
  pick: (allBeys: Bey[]) => Bey;
}

function pickHighest(field: 'stat_attack' | 'stat_defense' | 'stat_stamina', beys: Bey[]): Bey {
  if (beys.length === 0) throw new Error('pickHighest: empty roster');
  return [...beys].sort((a, b) => (b[field] ?? 0) - (a[field] ?? 0))[0];
}

function filterByType(type: Bey['type'], beys: Bey[]): Bey[] {
  return beys.filter((b) => b.type === type);
}

export const LAB_TRAINERS: LabTrainer[] = [
  {
    id: 'atk-koenig',
    name: 'Atk-König',
    emoji: '👑',
    flavor: 'Ich greife immer an. Komm her!',
    pick: (beys) => pickHighest('stat_attack', beys),
  },
  {
    id: 'def-mira',
    name: 'Defensiv-Mira',
    emoji: '🛡',
    flavor: 'Du kommst nicht durch.',
    pick: (beys) => pickHighest('stat_defense', beys),
  },
  {
    id: 'wild-karte',
    name: 'Wildkarte',
    emoji: '🎲',
    flavor: 'Wer weiß, was ich heute hab.',
    pick: (beys) => {
      if (beys.length === 0) throw new Error('Wildkarte: empty roster');
      return beys[Math.floor(Math.random() * beys.length)];
    },
  },
  {
    id: 'schnell-tim',
    name: 'Schnell-Tim',
    emoji: '⚡',
    flavor: 'Wir tanzen, dann kämpfen wir.',
    pick: (beys) => {
      // Prefer Attack-type with highest stamina (proxy for "fast attacker"
      // since the schema has no weight). Fall back to highest-stamina overall
      // if no Attack-types exist; final fallback to any bey.
      const attackers = filterByType('attack', beys);
      if (attackers.length > 0) return pickHighest('stat_stamina', attackers);
      if (beys.length > 0) return pickHighest('stat_stamina', beys);
      throw new Error('Schnell-Tim: empty roster');
    },
  },
  {
    id: 'schwer-pia',
    name: 'Schwer-Pia',
    emoji: '🪨',
    flavor: 'Ich bleibe stehen. Immer.',
    pick: (beys) => {
      // Stamina-type with highest stamina (proxy for "stays standing" since
      // the schema has no weight). Fall back to highest-stamina overall.
      const stayers = filterByType('stamina', beys);
      if (stayers.length > 0) return pickHighest('stat_stamina', stayers);
      if (beys.length > 0) return pickHighest('stat_stamina', beys);
      throw new Error('Schwer-Pia: empty roster');
    },
  },
];

export function getTrainer(id: string): LabTrainer {
  const t = LAB_TRAINERS.find((x) => x.id === id);
  if (!t) throw new Error(`Unknown trainer: ${id}`);
  return t;
}
