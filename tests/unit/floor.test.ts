import { describe, it, expect } from 'vitest';
import { eloToFloor } from '../../src/lib/floor';

describe('eloToFloor (Section 6.2 of spec)', () => {
  it('returns 1 for starting elo 800', () => expect(eloToFloor(800)).toBe(1));
  it('returns 1 for elo 800-809', () => expect(eloToFloor(809)).toBe(1));
  it('returns 2 for elo 810', () => expect(eloToFloor(810)).toBe(2));
  it('returns 90 for elo 1690', () => expect(eloToFloor(1690)).toBe(90));
  it('returns 90 for elo 1699', () => expect(eloToFloor(1699)).toBe(90));
  it('returns 91 for elo 1700', () => expect(eloToFloor(1700)).toBe(91));
  it('returns 91 for elo 1732', () => expect(eloToFloor(1732)).toBe(91));
  it('returns 92 for elo 1733', () => expect(eloToFloor(1733)).toBe(92));
  it('returns 99 for elo 1964', () => expect(eloToFloor(1964)).toBe(99));
  it('returns 99 for elo 5000 (no king-of-hill applied)', () => expect(eloToFloor(5000)).toBe(99));
});
