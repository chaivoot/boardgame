import { ROLES, COLOR, floorOf, colOf, type RoleKey } from "./roles.ts";

const ICONS: Record<RoleKey, string> = {
  murderer:'<path d="M32 4 L38 14 V38 H26 V14 Z"/><path d="M32 12 V34"/><path d="M18 38 H46"/><path d="M28 42 H36 V54 H28 Z"/><circle cx="32" cy="58" r="2.5"/>',
  accomplice:'<path d="M5 24 C5 17 16 17 32 22 C48 17 59 17 59 24 C59 37 50 43 42 41 C36 39 34 33 32 33 C30 33 28 39 22 41 C14 43 5 37 5 24Z"/><path d="M14 28 C17 25 23 25 26 29 C23 32 17 32 14 28Z"/><path d="M38 29 C41 25 47 25 50 28 C47 32 41 32 38 29Z"/>',
  detective:'<circle cx="26" cy="26" r="16"/><path d="M19 22 C20 18 24 16 28 17"/><path d="M38 38 L56 56" stroke-width="5"/>',
  keymaster:'<circle cx="18" cy="32" r="11"/><circle cx="18" cy="32" r="4"/><path d="M29 32 H58"/><path d="M50 32 V42"/><path d="M42 32 V39"/>',
  housekeeper:'<path d="M46 4 L33 32"/><path d="M24 30 L42 38 L36 58 C27 58 16 54 11 47 Z"/><path d="M19 44 L33 50"/><path d="M15 39 L22 46"/><path d="M28 34 L24 55"/>',
  windowcleaner:'<rect x="8" y="6" width="40" height="46" rx="2"/><path d="M28 6 V52 M8 29 H48"/><path d="M40 36 L56 52"/><path d="M50 58 L62 46"/>',
  witness:'<path d="M4 32 C14 15 50 15 60 32 C50 49 14 49 4 32Z"/><circle cx="32" cy="32" r="9"/><circle cx="32" cy="32" r="3" fill="currentColor"/>',
  drunk:'<path d="M10 10 H54 L32 34 Z"/><path d="M15 15 H49"/><path d="M32 34 V54 M20 56 H44"/><circle cx="44" cy="8" r="4"/><path d="M41 11 L36 18"/>',
  guest:'<rect x="8" y="20" width="48" height="34" rx="4"/><path d="M24 20 V13 H40 V20"/><path d="M8 33 H56"/><path d="M28 30 V36 H36 V30"/>'
};
export const LOGO = '<svg viewBox="0 0 64 36" fill="currentColor" aria-hidden="true"><path d="M2 6 H62 V10 H58 C58 24 50 30 42 30 C35 30 34 22 33 14 H31 C30 22 29 30 22 30 C14 30 6 24 6 10 H2 Z"/></svg>';

export function cardSVG(k: RoleKey): string {
  const r = ROLES[k], c = COLOR[r.team];
  const badge = r.order ? `<g transform="translate(38 38)"><path d="M0 -16 L16 0 L0 16 L-16 0Z" fill="#0d0f12" stroke="${c}" stroke-width="1.5"/><text y="6" text-anchor="middle" font-family="Oswald" font-size="16" fill="${c}">${r.order}</text></g>` : '';
  return `<svg class="card" viewBox="0 0 250 350" role="img" aria-label="${r.en} ${r.th}">
  <defs><linearGradient id="g${k}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#181b20"/><stop offset="1" stop-color="#0a0b0d"/></linearGradient></defs>
  <rect x="2" y="2" width="246" height="346" rx="16" fill="url(#g${k})" stroke="#2a2f37" stroke-width="2"/>
  <path d="M16 34 L34 16 H216 L234 34 V316 L216 334 H34 L16 316Z" fill="none" stroke="${c}" stroke-width="1.2" opacity=".85"/>
  <path d="M60 16 H190" stroke="${c}" stroke-width="4"/>
  ${badge}
  <circle cx="125" cy="128" r="64" fill="#101317" stroke="${c}" stroke-width="2"/>
  <circle cx="125" cy="128" r="56" fill="none" stroke="${c}" stroke-width=".8" stroke-dasharray="2 5" opacity=".7"/>
  <g transform="translate(83 86) scale(1.31)" fill="none" stroke="${c}" color="${c}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">${ICONS[k]}</g>
  <text x="125" y="236" text-anchor="middle" font-family="Oswald" font-weight="600" font-size="${r.en.length>11?22:27}" letter-spacing="3" fill="#e8ebf0">${r.en}</text>
  <text x="125" y="262" text-anchor="middle" font-family="Kanit" font-size="17" fill="${c}">${r.th}</text>
  <path d="M70 280 H180" stroke="#2a2f37"/>
  <text x="125" y="304" text-anchor="middle" font-family="Oswald" font-size="12" letter-spacing="4" fill="#8d95a1">${r.team==='evil'?'SHADOW SIDE':r.team==='neutral'?'LONE SIDE':'TENANT SIDE'}</text>
  </svg>`;
}
export function keycardSVG(room: number): string {
  return `<svg class="keycard" viewBox="0 0 250 150" role="img" aria-label="Keycard ${room}">
  <rect x="2" y="2" width="246" height="146" rx="14" fill="#e8ebf0"/>
  <rect x="2" y="2" width="246" height="34" rx="14" fill="#0b0c0e"/><rect x="2" y="22" width="246" height="14" fill="#0b0c0e"/>
  <text x="18" y="25" font-family="Oswald" font-size="14" letter-spacing="4" fill="#e8ebf0">KEYCARD</text>
  <g transform="translate(196 9) scale(.7)" fill="#e8ebf0">${LOGO.replace(/<\/?svg[^>]*>/g,'')}</g>
  <text x="18" y="112" font-family="Oswald" font-weight="600" font-size="64" fill="#0b0c0e">${room}</text>
  <text x="232" y="98" text-anchor="end" font-family="Kanit" font-size="15" fill="#4a515c">ชั้น ${floorOf(room)}</text>
  <text x="232" y="118" text-anchor="end" font-family="Kanit" font-size="15" fill="#4a515c">แถว ${colOf(room)}</text>
  <rect x="18" y="126" width="80" height="8" rx="2" fill="#c9ced6"/>
  </svg>`;
}
