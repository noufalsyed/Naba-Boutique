// Generates soft, editorial placeholder artwork (SVG) for demo products so the
// store looks complete before real photography is uploaded in the admin.

export type GarmentKind = 'kurta' | 'anarkali' | 'fabric' | 'dupatta' | 'sharara';
export type PatternKind = 'buti' | 'floral' | 'stripe' | 'paisley' | 'dots' | 'chikan' | 'kasavu' | 'ikat';

export interface ArtSpec {
  base: string;
  accent: string;
  bg: string;
  kind: GarmentKind;
  pattern: PatternKind;
  gold?: boolean;
}

const GOLD = '#c8a45d';

function patternDef(id: string, p: PatternKind, accent: string, base: string): string {
  switch (p) {
    case 'buti':
      return `<pattern id="${id}" width="46" height="46" patternUnits="userSpaceOnUse">
        <g transform="translate(23 23)" fill="${accent}" opacity=".85">
          <circle r="3.2"/><ellipse cx="0" cy="-7" rx="2.6" ry="4.6"/><ellipse cx="0" cy="7" rx="2.6" ry="4.6"/>
          <ellipse cx="-7" cy="0" rx="4.6" ry="2.6"/><ellipse cx="7" cy="0" rx="4.6" ry="2.6"/></g>
        <circle cx="0" cy="0" r="1.6" fill="${accent}" opacity=".6"/><circle cx="46" cy="46" r="1.6" fill="${accent}" opacity=".6"/></pattern>`;
    case 'floral':
      return `<pattern id="${id}" width="110" height="110" patternUnits="userSpaceOnUse">
        <g transform="translate(30 32)"><path d="M0-16C8-16 10-6 0 0C-10-6-8-16 0-16Z" fill="${accent}"/><path d="M0 16C8 16 10 6 0 0C-10 6-8 16 0 16Z" fill="${accent}"/>
        <path d="M-16 0C-16 8-6 10 0 0C-6-10-16-8-16 0Z" fill="${accent}" opacity=".8"/><path d="M16 0C16 8 6 10 0 0C6-10 16-8 16 0Z" fill="${accent}" opacity=".8"/><circle r="4" fill="${base}"/></g>
        <g transform="translate(82 84) rotate(30)"><ellipse rx="12" ry="5" fill="${accent}" opacity=".55"/><ellipse rx="5" ry="12" fill="${accent}" opacity=".55"/><circle r="3" fill="${GOLD}"/></g>
        <path d="M44 50 q12 8 22 26" stroke="${accent}" stroke-width="2" fill="none" opacity=".5"/></pattern>`;
    case 'stripe':
      return `<pattern id="${id}" width="36" height="36" patternUnits="userSpaceOnUse" patternTransform="rotate(90)">
        <rect width="10" height="36" fill="${accent}" opacity=".55"/><rect x="16" width="2" height="36" fill="${accent}" opacity=".7"/></pattern>`;
    case 'paisley':
      return `<pattern id="${id}" width="80" height="96" patternUnits="userSpaceOnUse">
        <g transform="translate(40 48) rotate(-20)"><path d="M0 22C-18 22-22 2-12-10C-4-20 12-24 14-34C20-18 18 22 0 22Z" fill="none" stroke="${accent}" stroke-width="2.4"/>
        <path d="M0 14C-10 14-12 2-6-5C-1-10 6-12 7-18C10-8 9 14 0 14Z" fill="${accent}" opacity=".55"/><circle cx="-2" cy="4" r="2.4" fill="${GOLD}"/></g>
        <circle cx="0" cy="0" r="2" fill="${accent}" opacity=".5"/></pattern>`;
    case 'dots':
      return `<pattern id="${id}" width="22" height="22" patternUnits="userSpaceOnUse"><circle cx="5" cy="5" r="2" fill="${accent}" opacity=".8"/><circle cx="16" cy="16" r="1.4" fill="${accent}" opacity=".55"/></pattern>`;
    case 'chikan':
      return `<pattern id="${id}" width="60" height="60" patternUnits="userSpaceOnUse">
        <g transform="translate(30 30)" fill="none" stroke="${accent}" stroke-width="1.6" opacity=".9">
          <path d="M0-14C6-14 7-5 0 0C-7-5-6-14 0-14Z"/><path d="M0 14C6 14 7 5 0 0C-7 5-6 14 0 14Z"/><path d="M-14 0C-14 6-5 7 0 0C-5-7-14-6-14 0Z"/><path d="M14 0C14 6 5 7 0 0C5-7 14-6 14 0Z"/></g>
        <circle cx="0" cy="0" r="1.5" fill="${accent}"/><circle cx="60" cy="60" r="1.5" fill="${accent}"/></pattern>`;
    case 'kasavu':
      return `<pattern id="${id}" width="40" height="40" patternUnits="userSpaceOnUse"><rect width="40" height="40" fill="${base}"/><path d="M0 20h40" stroke="${accent}" stroke-width=".6" opacity=".25"/></pattern>`;
    case 'ikat':
      return `<pattern id="${id}" width="64" height="40" patternUnits="userSpaceOnUse">
        <path d="M0 20 L16 6 L32 20 L16 34Z" fill="${accent}" opacity=".6"/><path d="M32 20 L48 6 L64 20 L48 34Z" fill="none" stroke="${accent}" stroke-width="3" opacity=".6"/>
        <rect x="14" y="18" width="4" height="4" fill="${base}"/></pattern>`;
  }
}

const KURTA = 'M343 168 Q400 236 457 168 L532 192 Q568 300 618 438 L560 462 Q540 380 524 306 L538 878 Q400 902 262 878 L276 306 Q260 380 240 462 L182 438 Q232 300 268 192 Z';
const ANARKALI = 'M343 168 Q400 236 457 168 L530 192 Q566 300 610 430 L556 452 Q536 372 522 304 L518 410 Q600 640 650 892 Q600 914 552 900 Q500 922 450 902 Q400 924 350 902 Q300 922 248 900 Q200 914 150 892 Q200 640 282 410 L278 304 Q264 372 244 452 L190 430 Q234 300 270 192 Z';
const SHARARA_TOP = 'M343 168 Q400 236 457 168 L528 190 Q560 290 600 410 L552 430 Q536 360 522 300 L530 560 Q400 580 270 560 L278 300 Q264 360 248 430 L200 410 Q240 290 272 190 Z';
const SHARARA_BOTTOM = 'M282 590 Q400 606 518 590 L600 900 Q520 918 460 896 Q430 912 400 900 Q370 912 340 896 Q280 918 200 900 Z';

function silhouette(kind: GarmentKind): string[] {
  switch (kind) {
    case 'kurta':
      return [KURTA];
    case 'anarkali':
      return [ANARKALI];
    case 'sharara':
      return [SHARARA_BOTTOM, SHARARA_TOP];
    case 'dupatta':
      return ['M250 150 L550 150 Q600 420 520 640 Q470 780 540 900 L420 900 Q360 760 420 600 Q480 420 380 230 Q340 190 250 150 Z'];
    case 'fabric':
      return [
        'M190 640 Q190 610 220 610 L590 610 Q620 610 620 640 L620 760 Q620 790 590 790 L220 790 Q190 790 190 760 Z',
        'M210 470 Q210 440 240 440 L600 440 Q630 440 630 470 L630 590 Q630 620 600 620 L240 620 Q210 620 210 590 Z',
        'M180 300 Q180 270 210 270 L580 270 Q610 270 610 300 L610 420 Q610 450 580 450 L210 450 Q180 450 180 420 Z',
      ];
  }
}

export function productArt(spec: ArtSpec, variant: 'front' | 'detail' = 'front'): string {
  const { base, accent, bg, kind, pattern, gold } = spec;
  const defs = `<defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${bg}"/><stop offset="1" stop-color="#efe6da"/></linearGradient>
    <linearGradient id="shade" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#000" stop-opacity=".22"/><stop offset=".35" stop-color="#000" stop-opacity="0"/><stop offset=".7" stop-color="#fff" stop-opacity=".08"/><stop offset="1" stop-color="#000" stop-opacity=".18"/></linearGradient>
    <radialGradient id="glow" cx=".5" cy=".38" r=".6"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
    ${patternDef('pat', pattern, accent, base)}
  </defs>`;

  if (variant === 'detail') {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000" viewBox="0 0 800 1000">${defs}
      <rect width="800" height="1000" fill="${base}"/><rect width="800" height="1000" fill="url(#pat)" transform="scale(1.6)"/>
      <path d="M0 0 Q260 380 120 1000 L0 1000Z" fill="#000" opacity=".10"/><path d="M800 0 Q520 420 700 1000 L800 1000Z" fill="#fff" opacity=".07"/>
      <path d="M380 0 Q520 500 360 1000" stroke="#000" stroke-opacity=".12" stroke-width="40" fill="none"/>
      ${gold ? `<rect x="0" y="840" width="800" height="70" fill="${GOLD}" opacity=".9"/><rect x="0" y="850" width="800" height="4" fill="#fff" opacity=".5"/><rect x="0" y="896" width="800" height="4" fill="#fff" opacity=".5"/>` : ''}
    </svg>`;
  }

  const shapes = silhouette(kind);
  const body = shapes
    .map(
      (d) => `<path d="${d}" fill="${base}"/><path d="${d}" fill="url(#pat)"/><path d="${d}" fill="url(#shade)"/>
      <path d="${d}" fill="none" stroke="#000" stroke-opacity=".12" stroke-width="2"/>`,
    )
    .join('');
  const hanger =
    kind === 'fabric'
      ? ''
      : kind === 'dupatta'
        ? `<rect x="230" y="138" width="340" height="12" rx="6" fill="#b89c72"/>`
        : `<path d="M400 120 q0-26 20-26 q18 0 18 18" stroke="#9d8462" stroke-width="5" fill="none"/><path d="M320 168 L400 132 L480 168" stroke="#9d8462" stroke-width="5" fill="none" stroke-linejoin="round"/>`;
  const trims: string[] = [];
  if (kind === 'kurta' || kind === 'anarkali' || kind === 'sharara') {
    trims.push(`<path d="M343 168 Q400 236 457 168" fill="none" stroke="${gold ? GOLD : accent}" stroke-width="7" stroke-linecap="round"/>`);
    if (gold) trims.push(`<path d="M352 182 Q400 244 448 182" fill="none" stroke="${GOLD}" stroke-width="2.5" stroke-dasharray="3 6"/>`);
  }
  if (kind === 'kurta' && gold) trims.push(`<path d="M266 874 Q400 898 534 874" fill="none" stroke="${GOLD}" stroke-width="12"/>`);
  if (kind === 'anarkali') trims.push(`<path d="M280 410 Q400 432 520 410" fill="none" stroke="${gold ? GOLD : accent}" stroke-width="10"/><path d="M156 884 Q400 940 644 884" fill="none" stroke="${gold ? GOLD : accent}" stroke-width="10" opacity=".9"/>`);
  if (kind === 'dupatta') trims.push(`<g stroke="${gold ? GOLD : accent}" stroke-width="3">${Array.from({ length: 12 }, (_, i) => `<line x1="${424 + i * 10}" y1="900" x2="${424 + i * 10}" y2="936"/>`).join('')}</g>`);
  if (kind === 'fabric' && (gold || pattern === 'kasavu'))
    trims.push(`<rect x="180" y="404" width="430" height="20" fill="${GOLD}"/><rect x="210" y="574" width="420" height="20" fill="${GOLD}"/><rect x="190" y="744" width="430" height="20" fill="${GOLD}"/>`);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000" viewBox="0 0 800 1000">${defs}
    <rect width="800" height="1000" fill="url(#bg)"/><rect width="800" height="1000" fill="url(#glow)"/>
    <ellipse cx="400" cy="935" rx="${kind === 'anarkali' || kind === 'sharara' ? 270 : 220}" ry="22" fill="#5a4636" opacity=".13"/>
    ${hanger}${body}${trims.join('')}
  </svg>`;
}
