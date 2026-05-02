// Curated Beyblade X GIF set (Giphy, rating=g) for celebratory moments.
// Sourced from giphy.com search 'beyblade-x' and hand-picked for kid-safe
// action / character / bey content. We hit the public CDN directly — no API
// key required for displaying known GIF IDs.
//
// URL variants (Giphy CDN):
//   giphy.gif             — original size (multi-MB on action gifs)
//   giphy.webp            — webp original
//   200w.webp             — 200px-wide animated webp, ~500KB-2MB. Sweet spot
//                           for in-card playback on mobile data.
//   200.webp              — 200px-tall variant
//   480w_s.jpg            — static poster frame, <100KB. Used as
//                           preview-while-loading or reduced-motion fallback.
//
// Animated webp is supported in iOS Safari 14+, Chrome 32+, Firefox 65+,
// Android browsers since 2020. Universal support for our audience.

export type GiphyId = string;

/** Pulled when a kid logs a winning battle. Random pick from this bucket. */
export const BATTLE_WON_GIFS: GiphyId[] = [
  'kwAhb5i5PMlOPPOefO', // beyblade ekusu kurosu — bey action
  'Bu1jlCmrGbj2otaSJZ', // beyblade-x ekusu kurosu — character
  'Dayz0C9sq9mpI4zWcV', // multi nanairo — bey
  '5p0BalM8Wi8aPhbeUr', // beyblade-x kamen — character
  'ExnlcbnAxEvq5gLwub', // beyblade-x kazami kamen
  'MPyt2LHUGUWkLTjkSq', // beyblade-x kamen
];

/** Played when a kid hits a new tier band (Lokal, Regional, National). */
export const FLOOR_UP_GIFS: GiphyId[] = [
  'R1VbNOvs9nEuAkbR6x', // anime knight beyblade-x
  '9nmGP6Ur7yyQZrno6O', // knight beyblade multi
  'fTvOKKEHAqAQNCpTbO', // kuromu ekusu shiguru — character
];

/** The biggest moment — kid claims The Peak (floor 100). */
export const PEAK_CLAIM_GIFS: GiphyId[] = [
  '77xvRURqAGxXF8trhF', // x-knight beyblade dransword — flagship action
  'ZakjkgUP3AgFSK7ngX', // spacetoon drandagger — dramatic
];

/** Random pick from any of the three buckets. */
export function randomGifFrom(bucket: GiphyId[]): GiphyId {
  return bucket[Math.floor(Math.random() * bucket.length)];
}

/** Build the CDN URL for a given variant. */
export function giphyUrl(
  id: GiphyId,
  variant: '200w.webp' | '200.webp' | 'giphy.webp' | 'giphy.gif' | '480w_s.jpg' = '200w.webp',
): string {
  return `https://media.giphy.com/media/${id}/${variant}`;
}
