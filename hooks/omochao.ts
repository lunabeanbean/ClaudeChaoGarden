import { chaoArt } from './chao'
import type { ChaoLook } from '../types'
import type { Corruption } from './battle'

// The corrupted omochao: a plush wind-up robot with the normal chao's own body (head tip included).
// Drawn at the same size and feet-on-zero origin as `chaoArt(look).body`, so it can stand where a chao stands.

const LOOK: ChaoLook = { id: 'omochao', stage: 'adult', kind: 'neutral', name: '', happy: false, parts: {}, type: 'normal', bold: 0 } as ChaoLook

const strip = (s: string) =>
  s
    .replace(/<ellipse cx="3" cy="-17.5"[^>]*\/>/, '')
    .replace(/<ellipse cx="8" cy="-17.5"[^>]*\/>/, '')
    .replace(/<circle cx="3.4" cy="-18.5"[^>]*\/>/, '')
    .replace(/<circle cx="8.4" cy="-18.5"[^>]*\/>/, '')

let rawBody = ''
// The plain chao body without its eyes, head tip ball and wings, with orange hands and feet.
const raw = () =>
  (rawBody ||= strip(chaoArt(LOOK).body)
    .replace(/<g transform="translate\(0,0\)">.*<\/g><\/g><\/g>$/, '</g>')
    .replace(/<circle cx="1" cy="-32.6"[^>]*\/>/, '')
    .replace(/#7bd88f/g, '#ffc857'))

const KEY = `<g><rect x="-9.5" y="-9.6" width="5" height="1.6" fill="#c9a227" stroke="#7a6410" stroke-width="0.3"/><ellipse cx="-11.5" cy="-12.6" rx="2.2" ry="3" fill="#ffd54a" stroke="#7a6410" stroke-width="0.4"/><ellipse cx="-11.5" cy="-5" rx="2.2" ry="3" fill="#ffd54a" stroke="#7a6410" stroke-width="0.4"/><circle cx="-11.5" cy="-8.8" r="1.2" fill="#c9a227" stroke="#7a6410" stroke-width="0.3"/></g>`

const prop = (blade = '#ff9a3c', stem = '#5fa8dc', tilt = 0) =>
  `<line x1="1" y1="-32.5" x2="1" y2="-35.5" stroke="${stem}" stroke-width="1"/><ellipse cx="-4.5" cy="-36" rx="5.8" ry="1.2" fill="${blade}" stroke="#a65a10" stroke-width="0.35" transform="rotate(${tilt} -4.5 -36)"/><ellipse cx="6.5" cy="-36" rx="5.8" ry="1.2" fill="${blade}" stroke="#a65a10" stroke-width="0.35"/><circle cx="1" cy="-35.6" r="1.2" fill="#ffd54a" stroke="#a65a10" stroke-width="0.3"/>`

const stitch = (col = '#4d86b4') =>
  `<g fill="none" stroke="${col}" stroke-width="0.5" stroke-dasharray="1.3 1" stroke-linecap="round"><path d="M-5.5,-23 Q-9.5,-17 -6,-10.5"/><rect x="-1.4" y="-8.4" width="6" height="5.2" rx="1.2"/><path d="M-0.5,-12 Q1.5,-10.4 3.5,-12"/></g><circle cx="-0.4" cy="-7.5" r="0.4" fill="${col}"/><circle cx="4.2" cy="-3.9" r="0.4" fill="${col}"/>`

const button = (cx: number, col = '#232c48', rim = '#7aa6cf') =>
  `<circle cx="${cx}" cy="-17.5" r="2.8" fill="${col}" stroke="${rim}" stroke-width="0.5"/><circle cx="${cx - 0.7}" cy="-18.2" r="0.45" fill="#fff"/><circle cx="${cx + 0.7}" cy="-18.2" r="0.45" fill="#fff"/><circle cx="${cx - 0.7}" cy="-16.8" r="0.45" fill="#fff"/><circle cx="${cx + 0.7}" cy="-16.8" r="0.45" fill="#fff"/>`

type Opt = { eyes?: string; prop?: string; extra?: string; stitchCol?: string; map?: Record<string, string> }

const recolor = (s: string, m: Record<string, string>) => Object.entries(m).reduce((a, [k, v]) => a.split(k).join(v), s)

const build = (o: Opt = {}) => {
  let body = raw().replace(/<\/g>$/, '') + (o.eyes ?? button(3) + button(8)) + stitch(o.stitchCol) + (o.prop ?? prop()) + '</g>'
  body = body.replace('<g transform="scale(1)">', '<g transform="scale(1)">' + KEY)
  if (o.map) body = recolor(body, o.map)
  return body + (o.extra ?? '')
}

const xBtn = (cx: number) =>
  `<circle cx="${cx}" cy="-17.5" r="2.8" fill="#aab4bf" stroke="#667789" stroke-width="0.5"/><path d="M${cx - 1.6},-19.1 L${cx + 1.6},-15.9 M${cx + 1.6},-19.1 L${cx - 1.6},-15.9" stroke="#e03030" stroke-width="0.9" stroke-linecap="round"/>`
const HANG = `<line x1="8" y1="-16" x2="9.6" y2="-11" stroke="#667789" stroke-width="0.4"/><circle cx="9.6" cy="-9.8" r="2.4" fill="#232c48" stroke="#7aa6cf" stroke-width="0.5"/>`
const redBtn = (cx: number) => `<circle cx="${cx}" cy="-17.5" r="2.8" fill="#1d1430" stroke="#ff3a5a" stroke-width="0.5"/><ellipse cx="${cx}" cy="-17.5" rx="1.9" ry="0.7" fill="#ff3a5a"/>`
const STUFF = `<path d="M-6,-6 q-2.4,-1 -3.4,0.4 q1.6,0.2 1.2,1.4 q1.4,-0.2 2.2,-1.8 z" fill="#f4eee0" stroke="#8a8070" stroke-width="0.3"/><path d="M-4,-4.8 q-1.6,-1.2 -2.8,-0.4 q1.2,0.8 0.8,1.8 q1.4,-0.2 2,-1.4 z" fill="#f4eee0" stroke="#8a8070" stroke-width="0.3"/>`
const bug = (x: number, y: number) =>
  `<ellipse cx="${x}" cy="${y}" rx="2" ry="1.4" fill="#6bbf3a" stroke="#2f5a10" stroke-width="0.4"/><path d="M${x - 1.2},${y - 1.2} l-1,-1.4 M${x + 1.2},${y - 1.2} l1,-1.4 M${x - 1.5},${y + 0.8} l-1.2,1 M${x + 1.5},${y + 0.8} l1.2,1" stroke="#2f5a10" stroke-width="0.4" stroke-linecap="round"/>`

const DRAW: Record<Corruption, () => string> = {
  glitch: () => {
    const g0 = build()
    return (
      `<g transform="translate(-1.6 0)" opacity="0.5">${recolor(g0, { '#a8dcff': '#ff2fd0', '#5fa8dc': '#ff2fd0' })}</g>` +
      `<g transform="translate(1.6 0)" opacity="0.5">${recolor(g0, { '#a8dcff': '#00f0ff', '#5fa8dc': '#00f0ff' })}</g>${g0}` +
      `<rect x="-12" y="-14" width="26" height="1.5" fill="#ff2fd0" opacity="0.85" transform="translate(3 0)"/>` +
      `<rect x="-12" y="-3" width="26" height="1.2" fill="#00f0ff" opacity="0.85" transform="translate(-3 0)"/>` +
      `<rect x="-8" y="-21" width="20" height="1" fill="#fff" opacity="0.9" transform="translate(2 0)"/>`
    )
  },
  error: () =>
    build({
      eyes: xBtn(3) + `<circle cx="8" cy="-17.5" r="2.8" fill="#8d9aa8" stroke="#667789" stroke-width="0.5" stroke-dasharray="0.8 0.8"/>` + HANG,
      prop: prop('#bba24a', '#6f7f8f', -25),
      stitchCol: '#667789',
      map: { '#a8dcff': '#a9b6c3', '#5fa8dc': '#667789', '#fff2c4': '#d5dbe1', '#ffc857': '#8d9aa8' },
      extra: `<polygon points="1,-46 6,-38.5 -4,-38.5" fill="#ffd54a" stroke="#b8901a" stroke-width="0.6" stroke-linejoin="round"/><text x="1" y="-40" font-size="5.5" font-weight="bold" text-anchor="middle" fill="#6b4e00" font-family="sans-serif">!</text>`,
    }),
  haywire: () =>
    build({
      eyes: redBtn(3) + redBtn(8),
      prop: prop('#6a5a8a', '#1d1430', 15),
      stitchCol: '#ff4a6a',
      map: { '#a8dcff': '#4a3668', '#5fa8dc': '#1d1430', '#fff2c4': '#6a5a8a', '#ffc857': '#3a2b52', '#ff8fc0': '#ff3a5a' },
      extra: `<path d="M-1,-24 L2,-18 L-2,-12" fill="none" stroke="#ff4a6a" stroke-width="0.7" stroke-linecap="round" stroke-linejoin="round"/>${STUFF}<path d="M13,-26 L15,-30 L16,-26 L19,-28 M-14,-24 L-17,-28 L-18,-24 L-21,-26" fill="none" stroke="#ffd54a" stroke-width="0.7" stroke-linecap="round"/>`,
    }),
  bugged: () =>
    build({
      eyes: button(3) + `<circle cx="8" cy="-17.5" r="2.9" fill="#5a8a2a" stroke="#2f5a10" stroke-width="0.4"/><circle cx="7.2" cy="-18.3" r="0.6" fill="#d7ff7a"/><circle cx="9" cy="-16.6" r="0.6" fill="#d7ff7a"/>`,
      extra: bug(-6, -21) + bug(9.5, -7) + bug(-3, 1.5) + `<ellipse cx="-3.5" cy="-10" rx="1.7" ry="1.2" fill="#f4eee0" stroke="#8a8070" stroke-width="0.3"/>`,
    }),
  static: () => {
    const s = build()
    return (
      `<g opacity="0.45" transform="translate(1.5 1)">${recolor(s, { '#a8dcff': 'none' })}</g>` +
      `<g opacity="0.7">${recolor(s, { '#a8dcff': '#dfe6ff', '#5fa8dc': '#8a9bff', '#fff2c4': '#f3f0ff', '#ffc857': '#cfd8ff' })}</g>` +
      [-27, -22, -17, -12, -7, -2, 3].map(y => `<line x1="-10" y1="${y}" x2="12" y2="${y}" stroke="#8a9bff" stroke-width="0.35" opacity="0.7"/>`).join('')
    )
  },
  tangled: () =>
    build({
      eyes: button(3) + `<circle cx="8" cy="-17.5" r="2.8" fill="#aab4bf" stroke="#667789" stroke-width="0.5"/>`,
      extra:
        `<path d="M5.5,-23 L8.5,-16 L4.5,-12.5 L8.5,-7.5 L5.5,-3" fill="#1b1b2a" stroke="#1b1b2a" stroke-width="1.5" stroke-linejoin="round"/>` +
        `<path d="M7.5,-15 Q15,-16 13,-9 Q11,-3 18,-4" fill="none" stroke="#ff6a3a" stroke-width="0.8" stroke-linecap="round"/>` +
        `<path d="M5.5,-9.5 Q16,-8 14,-1 Q13,4 20,3" fill="none" stroke="#3ad06a" stroke-width="0.8" stroke-linecap="round"/>` +
        `<path d="M5.5,-6 Q11,-3.5 9,2.5 Q8,6.5 13,6.5" fill="none" stroke="#ffd54a" stroke-width="0.8" stroke-linecap="round"/>`,
    }),
}

// One corrupted omochao as an SVG group, feet on y = 0, about 40 units tall (the same scale as a chao).
export const omochaoArt = (corr: Corruption) => `<g>${DRAW[corr]()}</g>`
// A plain (uncorrupted) one, for previews.
export const plainOmochao = () => `<g>${build()}</g>`

// The Bugged omochao's minion: a little green beetle with a button eye, facing right, feet on y = 0.
export const bugArt = () =>
  `<g><path d="M-4,-2 l-2,2 M0,-2 l-0.6,2.2 M4,-2 l1.6,2" stroke="#2f5a10" stroke-width="0.7" stroke-linecap="round"/>` +
  `<ellipse cx="0" cy="-5.5" rx="6.5" ry="4.6" fill="#6bbf3a" stroke="#2f5a10" stroke-width="0.6"/>` +
  `<path d="M0,-10 L0,-1" stroke="#2f5a10" stroke-width="0.5"/><circle cx="-3" cy="-6.5" r="1" fill="#4a8a2a"/><circle cx="2.8" cy="-4.5" r="0.9" fill="#4a8a2a"/>` +
  `<circle cx="6.6" cy="-6" r="3" fill="#4a8a2a" stroke="#2f5a10" stroke-width="0.5"/>` +
  `<circle cx="7.4" cy="-6.6" r="1.3" fill="#232c48" stroke="#7aa6cf" stroke-width="0.3"/><circle cx="7.1" cy="-6.9" r="0.3" fill="#fff"/><circle cx="7.7" cy="-6.3" r="0.3" fill="#fff"/>` +
  `<path d="M7,-8.6 q0.6,-2.6 3,-3.2 M8.2,-8.2 q1.8,-1.8 4,-1.4" fill="none" stroke="#2f5a10" stroke-width="0.5" stroke-linecap="round"/></g>`
