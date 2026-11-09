// The chao cards in the side window (/chao, or a click on a chao in the band): one picture card per chao (its
// portrait, stats, fruit, class or growing up, medals) and a smaller garden card (the tree, the ripening fruit).
// Pure drawing: everything comes in as saves, nothing is changed here. Each card is one SVG made to be drawn
// `isInteractive`, so the chao bobs and blinks; its source only changes when what it shows changes.
import type { ChaoType, GardenView, TreeLook } from '../types'
import {
  ANIMALS,
  ANIMAL_TRAITS,
  CALM_LEAN,
  CLASSES,
  STACK_AT,
  STRONG_LEAN,
  TEMPERAMENTS,
  traitsOf,
  FRUIT,
  FRUIT_COLORS,
  HATCH_TIME,
  HATCH_WARMTH,
  KIND_NAME,
  MAX_CHAO,
  PACES,
  PASSIVES,
  TASTING,
  TREE_GROWN,
  TYPE_NAME,
  chaoArt,
  classTier,
  cocoonArt,
  eatenOf,
  eggArt,
  favourites,
  leaning,
  level,
  lookOf,
  meterOf,
  nextStep,
  secondClass,
  secondOf,
  treeStage,
  treeSvg,
  typeOf,
  yearsOf,
} from './chao'
import type { ChaoSave, ChaoStats, Color, Garden } from './chao'

// Everything is laid out on a card 500 units wide and drawn at the width the window has.
const VW = 500
const FONT = `font-family="'Segoe UI','Trebuchet MS',Verdana,sans-serif"`
const SCRIPT = `font-family="'Segoe Script','Brush Script MT','Comic Sans MS',cursive"`

// Each garden's colours, so the cards look like the garden on screen (/chao visit).
type Theme = { top: string; mid: string; bottom: string; edge: string; glass: string; glassEdge: string; text: string; dim: string; name: [string, string, string] }
const THEMES: Record<GardenView, Theme> = {
  neutral: { top: '#2a1a50', mid: '#3b236c', bottom: '#52307c', edge: '#c9b6ff', glass: '#170d30', glassEdge: '#a58cf0', text: '#fff6fd', dim: '#d6c8ff', name: ['#ff8fc0', '#ffd43b', '#b197fc'] },
  dark: { top: '#0e1334', mid: '#1c1b4c', bottom: '#30205c', edge: '#b9c8ff', glass: '#080c26', glassEdge: '#8c9bea', text: '#eef3ff', dim: '#b8c3f2', name: ['#cfe8ff', '#d7c4ff', '#ff9ad5'] },
  light: { top: '#55307f', mid: '#b5588f', bottom: '#f39079', edge: '#ffe3a3', glass: '#3a1650', glassEdge: '#ffc2dc', text: '#fffaf2', dim: '#ffe1ec', name: ['#ffe066', '#ffc2dc', '#fff4e0'] },
}
export const themeOf = (view?: GardenView): Theme => THEMES[view === 'dark' || view === 'light' ? view : 'neutral']

// The five stats, in the colours of the fruit that feed them (Stamina has no fruit: it is pink).
const STATS: { key: keyof ChaoStats; name: string; color: string; deep: string }[] = [
  { key: 'swim', name: 'Swim', color: FRUIT.swim.fill, deep: FRUIT.swim.edge },
  { key: 'fly', name: 'Fly', color: FRUIT.fly.fill, deep: FRUIT.fly.edge },
  { key: 'run', name: 'Run', color: FRUIT.run.fill, deep: FRUIT.run.edge },
  { key: 'power', name: 'Power', color: FRUIT.power.fill, deep: FRUIT.power.edge },
  { key: 'stamina', name: 'Stamina', color: '#f783ac', deep: '#d6336c' },
]

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const r1 = (n: number) => Math.round(n * 10) / 10
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`
const thousands = (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',')

// Breaks a sentence into lines of about `max` characters.
const wrap = (text: string, max: number): string[] => {
  const out: string[] = []
  let line = ''
  for (const word of text.split(/\s+/).filter(Boolean)) {
    if (line && line.length + 1 + word.length > max) {
      out.push(line)
      line = word
    } else line = line ? `${line} ${word}` : word
  }
  if (line) out.push(line)
  return out
}

const text = (x: number, y: number, s: string, size: number, fill: string, more = '') =>
  `<text x="${r1(x)}" y="${r1(y)}" font-size="${size}" fill="${fill}" ${FONT} ${more}>${esc(s)}</text>`

// A frosted panel the words sit on, so they read on any garden's colours.
const glass = (t: Theme, x: number, y: number, w: number, h: number) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="14" fill="${t.glass}" fill-opacity="0.42" stroke="${t.glassEdge}" stroke-opacity="0.45" stroke-width="1"/>`

const sparkle = (x: number, y: number, r: number, color: string, begin: number, dur = 2.6) =>
  `<polygon points="${x},${y - r} ${x + r * 0.3},${y - r * 0.3} ${x + r},${y} ${x + r * 0.3},${y + r * 0.3} ${x},${y + r} ${x - r * 0.3},${y + r * 0.3} ${x - r},${y} ${x - r * 0.3},${y - r * 0.3}" fill="${color}" opacity="0">` +
  `<animate attributeName="opacity" values="0;1;0" dur="${dur}s" begin="${begin}s" repeatCount="indefinite"/></polygon>`

// A still four-point star, for marks (the stat its type comes from).
const star = (x: number, y: number, r: number, color: string) =>
  `<polygon points="${x},${y - r} ${x + r * 0.32},${y - r * 0.32} ${x + r},${y} ${x + r * 0.32},${y + r * 0.32} ${x},${y + r} ${x - r * 0.32},${y + r * 0.32} ${x - r},${y} ${x - r * 0.32},${y - r * 0.32}" fill="${color}"/>`

const HEART = 'M0,3 C-6,-2 -6,-8 -2.5,-8 C-1,-8 0,-7 0,-6 C0,-7 1,-8 2.5,-8 C6,-8 6,-2 0,3 Z'
const heart = (x: number, y: number, k: number, fill: string, stroke = '', opacity = 1) =>
  `<path d="${HEART}" transform="translate(${r1(x)},${r1(y)}) scale(${k})" fill="${fill}"${stroke ? ` stroke="${stroke}" stroke-width="${r1(1.2 / k)}"` : ''} opacity="${opacity}"/>`

// A fruit like the ones on the tree: round, a stalk, a leaf and a shine.
const fruit = (x: number, y: number, k: Color, r = 8) => {
  const f = FRUIT[k]
  return (
    `<g transform="translate(${r1(x)},${r1(y)})">` +
    `<path d="M0,${r1(-r * 0.8)} q${r1(r * 0.15)},${r1(-r * 0.5)} ${r1(r * 0.45)},${r1(-r * 0.65)}" stroke="#8a5a34" stroke-width="${r1(r * 0.16)}" fill="none" stroke-linecap="round"/>` +
    `<ellipse cx="${r1(r * 0.62)}" cy="${r1(-r * 1.02)}" rx="${r1(r * 0.48)}" ry="${r1(r * 0.24)}" transform="rotate(-28 ${r1(r * 0.62)} ${r1(-r * 1.02)})" fill="#69db7c" stroke="#2f9e44" stroke-width="${r1(r * 0.08)}"/>` +
    `<circle r="${r}" fill="${f.fill}" stroke="${f.edge}" stroke-width="${r1(Math.max(0.8, r * 0.13))}"/>` +
    `<circle cx="${r1(-r * 0.34)}" cy="${r1(-r * 0.34)}" r="${r1(r * 0.28)}" fill="#ffffff" opacity="0.65"/></g>`
  )
}

// The little white picture inside each stat's coloured circle.
const statGlyph = (key: keyof ChaoStats) => {
  const w = `stroke="#ffffff" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"`
  switch (key) {
    case 'swim':
      return `<path d="M-6,-1.5 q3,-3.5 6,0 t6,0 M-6,3.5 q3,-3.5 6,0 t6,0" ${w}/>`
    case 'fly':
      return `<path d="M-6.5,3.5 Q-3,-6.5 6.5,-5.5 Q2.5,-2.8 4.5,0 Q1,-0.5 0.5,2.6 Q-2.5,1.6 -6.5,3.5 Z" fill="#ffffff"/>`
    case 'run':
      return `<path d="M-5.5,-4.5 L-1,0 L-5.5,4.5 M0.5,-4.5 L5,0 L0.5,4.5" ${w}/>`
    case 'power':
      return `<polygon points="0,-6.5 1.9,-2 6.6,-1.9 2.9,1.1 4.1,5.8 0,3.1 -4.1,5.8 -2.9,1.1 -6.6,-1.9 -1.9,-2" fill="#ffffff"/>`
    default:
      return `<path d="${HEART}" transform="translate(0,1.6) scale(0.82)" fill="#ffffff"/>`
  }
}

// The card's backdrop: the garden's sky, its frame, and a few touches of the garden (crystals, the moon, the sun).
const backdrop = (t: Theme, view: GardenView, h: number, id: string, moonX = 172, moonY = 104) => {
  const g = `g${id}`
  let deco = ''
  if (view === 'dark') {
    // a crescent moon and a sprinkle of stars
    deco +=
      `<circle cx="${moonX}" cy="${moonY}" r="16" fill="#fff6d6" opacity="0.16"><animate attributeName="r" values="14;19;14" dur="5s" repeatCount="indefinite"/></circle>` +
      `<mask id="m${g}"><rect x="${moonX - 30}" y="${moonY - 30}" width="60" height="60" fill="#ffffff"/><circle cx="${moonX + 6}" cy="${moonY - 4}" r="8.5" fill="#000000"/></mask>` +
      `<circle cx="${moonX}" cy="${moonY}" r="9.5" fill="#fff3bf" mask="url(#m${g})"/>`
    for (let i = 0; i < 26; i++) {
      const x = 14 + ((i * 97) % 472)
      const y = 10 + ((i * 53) % (h - 20))
      deco += `<circle cx="${x}" cy="${y}" r="${i % 3 === 0 ? 1.1 : 0.7}" fill="#ffffff" opacity="${0.25 + (i % 4) * 0.12}"/>`
    }
  } else if (view === 'light') {
    // the low sun glowing at the top right, and little flowers in the bottom corners
    deco += `<circle cx="470" cy="12" r="60" fill="url(#sun${g})"/>`
    const flower = (x: number, y: number, petal: string, k: number) =>
      `<g transform="translate(${x},${y}) scale(${k})">${[0, 72, 144, 216, 288].map(a => `<ellipse cx="0" cy="-4" rx="2.6" ry="4" fill="${petal}" transform="rotate(${a})"/>`).join('')}<circle r="2.2" fill="#ffd43b"/></g>`
    deco += flower(18, h - 14, '#ffc2dc', 1.2) + flower(36, h - 8, '#ffffff', 0.9) + flower(482, h - 14, '#fff4e0', 1.2) + flower(464, h - 7, '#ffc2dc', 0.85)
  } else {
    // crystals growing up from the bottom corners
    const crystal = (x: number, ht: number, w: number, tilt: number, fill: string) =>
      `<polygon points="${x - w},${h} ${x - w * 0.8},${h - ht * 0.75} ${x},${h - ht} ${x + w * 0.8},${h - ht * 0.75} ${x + w},${h}" fill="${fill}" opacity="0.55" transform="rotate(${tilt} ${x} ${h})"/>`
    deco +=
      crystal(14, 34, 6, -14, '#b197fc') + crystal(26, 22, 5, 8, '#9fe0ff') + crystal(486, 36, 6, 14, '#9fe0ff') + crystal(474, 22, 5, -8, '#ff8fc0') +
      `<ellipse cx="20" cy="${h - 6}" rx="26" ry="8" fill="#b197fc" opacity="0.18"><animate attributeName="opacity" values="0.1;0.28;0.1" dur="4s" repeatCount="indefinite"/></ellipse>` +
      `<ellipse cx="480" cy="${h - 6}" rx="26" ry="8" fill="#9fe0ff" opacity="0.18"><animate attributeName="opacity" values="0.28;0.1;0.28" dur="4s" repeatCount="indefinite"/></ellipse>`
  }
  return (
    `<defs><linearGradient id="bg${g}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${t.top}"/><stop offset="0.55" stop-color="${t.mid}"/><stop offset="1" stop-color="${t.bottom}"/></linearGradient>` +
    `<linearGradient id="nm${g}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${t.name[0]}"/><stop offset="0.5" stop-color="${t.name[1]}"/><stop offset="1" stop-color="${t.name[2]}"/></linearGradient>` +
    `<radialGradient id="sun${g}"><stop offset="0" stop-color="#fff4c2" stop-opacity="0.95"/><stop offset="0.35" stop-color="#ffd8a8" stop-opacity="0.5"/><stop offset="1" stop-color="#ffd8a8" stop-opacity="0"/></radialGradient>` +
    `<radialGradient id="spot${g}"><stop offset="0" stop-color="#ffffff" stop-opacity="0.28"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></radialGradient></defs>` +
    `<rect x="1" y="1" width="${VW - 2}" height="${h - 2}" rx="20" fill="url(#bg${g})" stroke="${t.edge}" stroke-width="1.6"/>` +
    `<rect x="6" y="6" width="${VW - 12}" height="${h - 12}" rx="16" fill="none" stroke="${t.edge}" stroke-opacity="0.35" stroke-width="0.8" stroke-dasharray="2 4"/>` +
    deco +
    sparkle(22, 22, 5, t.name[1], 0) +
    sparkle(VW - 70, 18, 4, t.name[0], 1.1) +
    sparkle(VW - 22, h - 46, 4.5, t.name[2], 0.6) +
    sparkle(30, h - 60, 3.5, t.name[0], 1.7)
  )
}

// The name in big script with the garden's colours, as the band's title is drawn.
const bigName = (name: string, x: number, y: number, g: string, size = 30) =>
  `<text x="${x}" y="${y}" font-size="${size}" font-style="italic" font-weight="bold" fill="url(#nm${g})" stroke="#ffffff" stroke-width="0.7" paint-order="stroke" ${SCRIPT} letter-spacing="0.5">${esc(name)}</text>`

// A rounded label: the chao's form ("Dark Power"), "Child", a skill...
const pill = (xRight: number, y: number, label: string, fill: string, ink: string, edge: string, size = 12) => {
  const w = Math.round(label.length * size * 0.6 + 22)
  return (
    `<rect x="${xRight - w}" y="${y - size - 4}" width="${w}" height="${size + 11}" rx="${(size + 11) / 2}" fill="${fill}" stroke="${edge}" stroke-width="1"/>` +
    `<text x="${xRight - w / 2}" y="${y + 1}" font-size="${size}" font-weight="bold" fill="${ink}" text-anchor="middle" ${FONT}>${esc(label)}</text>`
  )
}
const chip = (x: number, y: number, label: string, fill: string, ink: string, size = 11) => {
  const w = Math.round(label.length * size * 0.56 + 16)
  return { w, svg: `<rect x="${x}" y="${y - size - 3}" width="${w}" height="${size + 8}" rx="${(size + 8) / 2}" fill="${fill}"/>${text(x + w / 2, y + 0.5, label, size, ink, 'text-anchor="middle" font-weight="bold"')}` }
}

const KIND_PILL: Record<'hero' | 'dark' | 'neutral', [string, string, string]> = {
  hero: ['#fff3bf', '#8a5a00', '#ffd43b'],
  dark: ['#3b1d5e', '#ffc2ea', '#ff9ad5'],
  neutral: ['#d0ebff', '#1c5d99', '#74c0fc'],
}

// The chao itself, big, standing on a soft spotlight; it bobs, blinks now and then, and happy ones float hearts.
const portrait = (gd: Garden, c: ChaoSave, cx: number, ground: number, g: string) => {
  const spot = `<ellipse cx="${cx}" cy="${ground - 52}" rx="82" ry="80" fill="url(#spot${g})"/>` + `<ellipse cx="${cx}" cy="${ground + 2}" rx="56" ry="10" fill="#000000" opacity="0.18"/>`
  if (c.stage === 'egg') return spot + `<g transform="translate(${cx},${ground}) scale(3.6)">${eggArt(0, 0)}</g>`
  if (c.stage === 'cocoon') return spot + `<g transform="translate(${cx},${ground}) scale(3.1)">${cocoonArt(0)}</g>`
  const look = lookOf(c, PACES[gd.g.pace])
  if (gd.g.champ === c.id) look.medal = true
  const art = chaoArt(look)
  const blink = art.sleepy(4.2, '0;0.92;0.96', '0;1;0', 0)
  const hearts =
    c.happiness >= 70
      ? [0, 1.4, 2.8]
          .map(
            (b, i) =>
              `<g opacity="0"><animate attributeName="opacity" values="0;1;0" dur="4.2s" begin="${b}s" repeatCount="indefinite"/>` +
              `<animateTransform attributeName="transform" type="translate" values="0 0;${i === 1 ? -6 : 6} -34" dur="4.2s" begin="${b}s" repeatCount="indefinite"/>` +
              heart(cx + (i - 1) * 42, ground - 92 + i * 8, 1.1 - i * 0.15, '#ff8fc0') +
              `</g>`,
          )
          .join('')
      : ''
  // the art faces right with its feet at (0,0); its middle is about 3 units right of that
  return (
    spot +
    hearts +
    `<g transform="translate(${cx - 9},${ground}) scale(3)"><g><animateTransform attributeName="transform" type="translate" values="0 0;0 -1.3;0 0" dur="1.9s" repeatCount="indefinite"/>` +
    art.body +
    blink +
    `</g></g>`
  )
}

// Five hearts for happiness and a tummy bar under the portrait.
const moodRow = (t: Theme, c: ChaoSave, x: number, y: number) => {
  let s = ''
  for (let i = 0; i < 5; i++) {
    const full = c.happiness >= (i + 1) * 20 - 10
    s += heart(x + 12 + i * 24, y + 4, 1.35, full ? '#ff6b9d' : 'none', full ? '#ffffff' : t.dim, full ? 1 : 0.6)
  }
  s += text(x + 172, y + 2, String(c.happiness), 13, t.text, 'text-anchor="end" font-weight="bold" class="happiness"')
  const full = Math.max(0, Math.min(100, 100 - c.hunger))
  s +=
    text(x + 2, y + 31, full >= 60 ? 'Full tummy' : full >= 30 ? 'Peckish' : 'Hungry', 11, t.dim) +
    `<rect x="${x + 72}" y="${y + 22}" width="100" height="9" rx="4.5" fill="#ffffff" fill-opacity="0.16"/>` +
    `<rect x="${x + 72}" y="${y + 22}" width="${Math.max(4, full)}" height="9" rx="4.5" fill="#ffd8a8"/>`
  return s
}

// The type mark goes on the stat a chao's type comes from (a smaller one on its second type).
const typeMarks = (c: ChaoSave): { main?: ChaoType; second?: ChaoType } => {
  if (c.stage === 'egg') return {}
  if (c.stage === 'adult' || c.stage === 'cocoon') return { main: c.type ?? typeOf(c), second: secondOf(c) }
  return { main: typeOf(c), second: secondOf(c) }
}

// The stats: a coloured bar each, as long as the stat against its biggest (so you see which one leads, and
// so which type it is heading for), its level, and a thin line for how close the next level is.
const statsPanel = (t: Theme, c: ChaoSave, x: number, y: number, w: number) => {
  const marks = typeMarks(c)
  const top = Math.max(1, ...STATS.map(s => c.stats[s.key]))
  const barX = x + 104
  const barW = w - 160
  let s = glass(t, x, y, w, 252) + text(x + 16, y + 22, 'STATS', 11, t.dim, 'font-weight="bold" letter-spacing="2"')
  STATS.forEach((st, i) => {
    const cy = y + 50 + i * 42
    const xp = Math.max(0, c.stats[st.key])
    const lv = level(xp)
    const lo = lv * lv
    const hi = (lv + 1) * (lv + 1)
    const toNext = lv >= 99 ? 1 : (xp - lo) / (hi - lo)
    const len = xp > 0 ? Math.max(5, (barW * xp) / top) : 0
    s +=
      `<g transform="translate(${x + 24},${cy})"><circle r="12" fill="${st.color}" stroke="${st.deep}" stroke-width="1.2"/>${statGlyph(st.key)}</g>` +
      text(x + 44, cy + 5, st.name, 14, t.text, 'font-weight="bold"') +
      `<rect x="${barX}" y="${cy - 6}" width="${barW}" height="12" rx="6" fill="#ffffff" fill-opacity="0.14"/>` +
      (len ? `<rect x="${barX}" y="${cy - 6}" width="${r1(len)}" height="12" rx="6" fill="${st.color}" stroke="${st.deep}" stroke-width="0.8"/>` + `<rect x="${barX + 3}" y="${cy - 4}" width="${r1(Math.max(0, len - 6))}" height="3" rx="1.5" fill="#ffffff" opacity="0.45"/>` : '') +
      `<rect x="${barX}" y="${cy + 9}" width="${r1(barW * toNext)}" height="2.5" rx="1.25" fill="#ffffff" opacity="0.7"/>` +
      text(x + w - 14, cy + 6, `Lv ${lv}`, 15, st.color, `text-anchor="end" font-weight="bold" stroke="${t.glass}" stroke-width="2.5" paint-order="stroke"`)
    if (marks.main === st.key) s += star(barX - 9, cy, 6, '#ffe066')
    else if (marks.second === st.key) s += star(barX - 9, cy, 4, '#fff4e0')
  })
  if (marks.main && marks.main !== 'normal')
    s +=
      star(x + 20, y + 240, 4.5, '#ffe066') +
      text(x + 29, y + 244, c.stage === 'adult' ? 'its type' : 'the type it is heading for', 10, t.dim) +
      (marks.second ? star(x + (c.stage === 'adult' ? 92 : 168), y + 240, 3.5, '#fff4e0') + text(x + (c.stage === 'adult' ? 99 : 175), y + 244, 'a touch of', 10, t.dim) : '')
  return s
}

// Hero on the left, Dark on the right, the chao's lean between (it settles when it makes its cocoon).
const leanBar = (t: Theme, c: ChaoSave, x: number, y: number, w: number) => {
  const mid = x + w / 2
  const half = w / 2 - 6
  const a = Math.max(-100, Math.min(100, c.align))
  const at = mid - (a / 100) * half
  const lean = leaning(c.align)
  return (
    `<defs><linearGradient id="lean${c.id}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff3bf"/><stop offset="0.5" stop-color="#d0ebff"/><stop offset="1" stop-color="#7048e8"/></linearGradient></defs>` +
    `<rect x="${x}" y="${y - 5}" width="${w}" height="10" rx="5" fill="url(#lean${c.id})" opacity="0.9"/>` +
    `<rect x="${r1(mid - half * 0.3 - 0.75)}" y="${y - 8}" width="1.5" height="16" fill="#ffffff" opacity="0.6"/>` +
    `<rect x="${r1(mid + half * 0.3 - 0.75)}" y="${y - 8}" width="1.5" height="16" fill="#ffffff" opacity="0.6"/>` +
    `<circle cx="${r1(at)}" cy="${y}" r="8" fill="#ffffff" stroke="${lean === 'dark' ? '#7048e8' : lean === 'hero' ? '#f0b400' : '#4a94d4'}" stroke-width="2"/>` +
    heart(at, y + 1.2, 0.7, '#ff6b9d') +
    text(x, y + 22, '☀ Hero', 11, t.dim, 'font-weight="bold"') +
    text(mid, y + 22, 'Neutral', 11, t.dim, 'text-anchor="middle"') +
    text(x + w, y + 22, 'Dark ☾', 11, t.dim, 'text-anchor="end" font-weight="bold"')
  )
}

// Each class's emblem: a sword, a star hat, a bow, a lyre.
const emblem = (cls: string, x: number, y: number) => {
  const inner =
    cls === 'warrior'
      ? `<path d="M-1.4,6 L-1.4,-9 L0,-11.5 L1.4,-9 L1.4,6 Z" fill="#e9ecef" stroke="#868e96" stroke-width="0.6"/><rect x="-5" y="5.4" width="10" height="2" rx="1" fill="#ffd43b"/><rect x="-1" y="7.2" width="2" height="4" fill="#a8774a"/>`
      : cls === 'wizard'
        ? `<path d="M-8,6 L8,6 L2,-3 L4.5,-11 L-2,-3 Z" fill="#7048e8" stroke="#e5dbff" stroke-width="0.7"/><polygon points="0,-1 1,1.6 3.6,1.6 1.5,3.1 2.3,5.6 0,4 -2.3,5.6 -1.5,3.1 -3.6,1.6 -1,1.6" fill="#ffe066"/>`
        : cls === 'ranger'
          ? `<path d="M-3,-10 Q7,0 -3,10" fill="none" stroke="#a8774a" stroke-width="2"/><path d="M-3,-10 L-3,10" stroke="#f1f3f5" stroke-width="0.7"/><path d="M-6,0 L7,0 M7,0 L4.5,-2 M7,0 L4.5,2" stroke="#69db7c" stroke-width="1.3" fill="none"/>`
          : `<path d="M-6,-8 Q-8,6 0,8 Q8,6 6,-8" fill="none" stroke="#ffd43b" stroke-width="2"/><path d="M-6,-8 L6,-8 M-2.5,-7 L-2.5,6 M0,-7 L0,7 M2.5,-7 L2.5,6" stroke="#fff4e0" stroke-width="0.7"/>`
  return `<g transform="translate(${x},${y})"><circle r="15" fill="#ffffff" fill-opacity="0.16" stroke="#ffffff" stroke-opacity="0.4"/>${inner}</g>`
}

const TIER = ['Novice', 'Adept', 'Master']

// The "In fights" panel: its temperament (passive, and the signature skill a strong lean brings) and each animal it
// wears (buff, passive at 2 pieces, skill once given STACK_AT times), lit when on and faded with what it still needs
// when not, each with a line on what the lit ones do. Returns the drawing and its height.
const TEMPER_PILL: Record<'hero' | 'dark' | 'neutral', [string, string]> = { hero: ['#fff3bf', '#8a5a00'], dark: ['#e5dbff', '#4b2a7a'], neutral: ['#d0ebff', '#1c5d99'] }
const traitsPanel = (t: Theme, c: ChaoSave, x: number, y: number, w: number) => {
  const tr = traitsOf(c)
  const T = TEMPERAMENTS[tr.temper]
  const [pf, pi] = TEMPER_PILL[tr.temper]
  const signed = (n: number) => `${n > 0 ? '+' : ''}${n}`
  let s = ''
  let yy = y + 22
  s += text(x + 16, yy, 'IN FIGHTS', 11, t.dim, 'font-weight="bold" letter-spacing="2"')
  yy += 24
  // a row of chips, lit or faded
  const chips = (list: [string, boolean][]) => {
    let cx = x + 16
    for (const [label, on] of list) {
      const one = chip(cx, yy, label, on ? pf : '#ffffff', on ? pi : '#5b3a6e', 11)
      if (cx + one.w > x + w - 8) break
      s += on ? one.svg : `<g opacity="0.4">${one.svg}</g>`
      cx += one.w + 6
    }
    yy += 22
  }
  const say = (line: string, size = 11, fill = t.text) => {
    for (const part of wrap(line, 82)) {
      s += text(x + 16, yy, part, size, fill)
      yy += 15
    }
  }
  s += text(x + 16, yy, `${T.icon} ${T.name}`, 15, t.text, 'font-weight="bold"') + text(x + 16 + (T.name.length + 2) * 9, yy, `lean ${signed(c.align)}${c.stage === 'baby' || c.stage === 'child' ? ' · follows its lean until its cocoon' : ''}`, 11, t.dim)
  yy += 22
  chips([[T.passive.name, true], [tr.strong ? T.skill.name : `${T.skill.name} · ${tr.temper === 'neutral' ? `lean ±${CALM_LEAN}` : `lean ${tr.temper === 'hero' ? '+' : '-'}${STRONG_LEAN}`}`, tr.strong]])
  say(`${T.passive.name}: ${T.passive.text}.`)
  say(`${T.skill.name}: ${T.skill.text}${tr.strong ? '.' : ` (needs ${T.need}).`}`, 11, tr.strong ? t.text : t.dim)
  if (!tr.animals.length) {
    yy += 4
    say('No animal pieces on: each animal in a bubble brings a buff, two pieces a passive, three gifts a skill.', 11, t.dim)
  }
  for (const a of tr.animals) {
    const A = ANIMAL_TRAITS[a.animal]!
    yy += 8
    s += text(x + 16, yy, `${ANIMALS[a.animal]?.emoji ?? ''} ${A.name}`, 13, t.text, 'font-weight="bold"') + text(x + 16 + (A.name.length + 3) * 8, yy, `${a.spots.join(', ')} · given ${a.given}×`, 11, t.dim)
    yy += 20
    chips([
      [`${A.buff.name} ${A.buff.text}`, true],
      [a.passive ? A.passive.name : `${A.passive.name} · 2 pieces`, a.passive],
      [a.skill ? A.skill.name : `${A.skill.name} · given ${STACK_AT}×`, a.skill],
    ])
    const on = [...(a.passive ? [`${A.passive.name}: ${A.passive.text}`] : []), ...(a.skill ? [`${A.skill.name}: ${A.skill.text}`] : [])]
    if (on.length) say(`${on.join('. ')}.`)
  }
  const worn = new Set(tr.animals.map(a => a.animal))
  const gone = Object.entries(c.gifts ?? {}).filter(([k, n]) => n > 0 && !worn.has(k) && ANIMALS[k])
  if (gone.length) {
    yy += 4
    say(`Given before, no piece on now: ${gone.map(([k, n]) => `${ANIMAL_TRAITS[k]?.name ?? k} ×${n}`).join(', ')}`, 11, t.dim)
  }
  const h = yy - y + 2
  return { svg: glass(t, x, y, w, h) + s, h }
}

// The card's lower half: fruit, then growing up (babies, children, cocoons) or the class (adults), then medals,
// animal parts and how it has been fed. Returns the drawing and the height it took.
const lowerPanels = (t: Theme, gd: Garden, c: ChaoSave, now: number, medals: [number, number, number] | undefined, y0: number) => {
  let s = ''
  let y = y0
  const x = 16
  const w = VW - 32

  // Fruit: its two favourites and how many of each colour it has eaten.
  s += glass(t, x, y, w, 74) + text(x + 16, y + 22, 'FAVOURITE FRUIT', 11, t.dim, 'font-weight="bold" letter-spacing="2"') + text(x + 262, y + 22, 'FRUIT EATEN', 11, t.dim, 'font-weight="bold" letter-spacing="2"')
  const eaten = eatenOf(c)
  if (eaten < TASTING) s += fruit(x + 30, y + 50, 'power', 7) + fruit(x + 50, y + 50, 'swim', 7) + fruit(x + 70, y + 50, 'run', 7) + fruit(x + 90, y + 50, 'fly', 7) + text(x + 108, y + 48, 'Tasting everything', 13, t.text, 'font-weight="bold"') + text(x + 108, y + 63, `${eaten} of ${TASTING} fruit so far`, 10, t.dim)
  else {
    const [a, b] = favourites(c) as [Color, Color]
    s += fruit(x + 32, y + 51, a, 10) + fruit(x + 60, y + 51, b, 10) + text(x + 80, y + 50, `${TYPE_NAME[a]} & ${TYPE_NAME[b]}`, 14, t.text, 'font-weight="bold"') + text(x + 80, y + 64, `${FRUIT[a].work} & ${FRUIT[b].work}`, 10, t.dim)
  }
  FRUIT_COLORS.forEach((k, i) => {
    s += fruit(x + 274 + i * 50, y + 51, k, 8) + text(x + 286 + i * 50, y + 56, String(c.ate[k] ?? 0), 14, t.text, 'font-weight="bold"')
  })
  y += 84

  // Growing up, or its class.
  const lines: string[] = []
  let head = ''
  let body = ''
  let h = 0
  if (c.stage === 'adult') {
    if (c.cls) {
      const cl = CLASSES[c.cls.main]
      const lv = level(c.stats[cl.stat])
      head = 'CLASS'
      body += emblem(c.cls.main, x + 32, y + 50) + text(x + 56, y + 47, `${TIER[classTier(c)]} ${cl.name}`, 15, t.text, 'font-weight="bold"') + text(x + 56, y + 62, `Lv ${lv} · ${cl.item}`, 11, t.dim)
      let cx = x + 16
      for (const [need, name] of cl.skills) {
        const ok = lv >= need
        const ch = ok ? chip(cx, y + 92, name, '#ffffff', '#5b3a6e') : chip(cx, y + 92, `${name} · Lv ${need}`, '#ffffff', '#5b3a6e')
        body += ok ? ch.svg : `<g opacity="0.4">${ch.svg}</g>`
        cx += ch.w + 6
      }
      const second = secondClass(c)
      if (second) {
        const sc = CLASSES[second]
        const slv = level(c.stats[sc.stat])
        // the best one it has unlocked: the one fights lend it
        lines.push(`Second class: ${sc.name} Lv ${slv} · extra skill: ${sc.skills.filter(([need]) => slv >= need).slice(-1)[0]?.[1] ?? 'none yet'}`)
      }
      const pass = (Object.keys(PASSIVES) as (keyof ChaoStats)[]).filter(k => level(c.stats[k]) >= 5 && k !== cl.stat).map(k => PASSIVES[k])
      if (pass.length) lines.push(`Passives: ${pass.join(', ')}`)
      h = 106
    } else {
      head = 'CLASS'
      lines.push('Not found yet: an adult finds its class after half a chao year, from its strongest class stat (Swim: Healer, Power: Warrior, Run: Ranger, Fly: Wizard).')
      h = 30
    }
  } else {
    head = c.stage === 'cocoon' ? 'CHANGING INSIDE' : 'GROWING UP'
    if (c.stage !== 'cocoon') {
      body += leanBar(t, c, x + 24, y + 46, w - 48)
      h = 78
    } else h = 30
    const next = nextStep(gd, c, now)
    if (next) lines.push(`${next}.`)
    if (c.stage !== 'cocoon') lines.push('Daytime chats and petting lean Hero, late nights lean Dark. Its type comes from its biggest stat.')
  }
  const wrapped = lines.flatMap(l => wrap(l, 74).map(part => ({ part })))
  const panelH = h + wrapped.length * 16 + 12
  s += glass(t, x, y, w, panelH) + text(x + 16, y + 22, head, 11, t.dim, 'font-weight="bold" letter-spacing="2"') + body
  wrapped.forEach((l, k) => {
    s += text(x + 16, y + h + 16 + k * 16, l.part, 12, t.text)
  })
  y += panelH + 10

  // What it brings to fights besides its class: its temperament and the animals it wears.
  const fights = traitsPanel(t, c, x, y, w)
  s += fights.svg
  y += fights.h + 10

  // Medals and how it was fed (the animal parts it wears are in the panel above).
  const chips: { label: string; fill: string; ink: string }[] = []
  const [gold, silver, bronze] = medals ?? [0, 0, 0]
  const hasMedals = gold + silver + bronze > 0
  const champ = gd.g.champ === c.id
  const badgeH = 26 + (hasMedals || champ ? 34 : 20) + (chips.length ? 30 : 0) + 22
  s += glass(t, x, y, w, badgeH) + text(x + 16, y + 22, 'MEDALS & KEEPSAKES', 11, t.dim, 'font-weight="bold" letter-spacing="2"')
  let by = y + 30
  if (!hasMedals && !champ) {
    s += text(x + 16, by + 12, 'No race medals yet (/chao race)', 12, t.text)
    by += 20
  } else {
    let mx = x + 26
    const medal = (fill: string, edge: string, n: number) => {
      const out = `<path d="M${mx - 5},${by - 4} L${mx - 2},${by + 6} M${mx + 5},${by - 4} L${mx + 2},${by + 6}" stroke="#ff8fc0" stroke-width="3"/><circle cx="${mx}" cy="${by + 13}" r="9" fill="${fill}" stroke="${edge}" stroke-width="1.4"/>${star(mx, by + 13, 4.5, '#ffffff')}${text(mx + 14, by + 18, `× ${n}`, 13, t.text, 'font-weight="bold"')}`
      mx += 64
      return out
    }
    if (gold) s += medal('#ffd43b', '#e0aa1a', gold)
    if (silver) s += medal('#dee2e6', '#adb5bd', silver)
    if (bronze) s += medal('#e8a87c', '#c27c4a', bronze)
    if (champ) s += text(mx + 2, by + 18, 'wears the gold medal', 12, '#ffe066', 'font-weight="bold"')
    by += 34
  }
  if (chips.length) {
    let cx = x + 16
    for (const ch of chips) {
      const one = chip(cx, by + 16, ch.label, ch.fill, ch.ink)
      if (cx + one.w > x + w - 10) break
      s += one.svg
      cx += one.w + 6
    }
    by += 30
  }
  s += text(x + 16, by + 14, `${plural(c.messages, 'snack')} · ${plural(c.treats, 'treat')} · ${plural(c.pets, 'pet')} · ${plural(c.animals, 'animal')} · ${plural(c.chats, 'chat')}`, 11, t.dim)
  y += badgeH + 10
  return { svg: s, bottom: y }
}

// One chao's card. `medals` is [gold, silver, bronze] from the races.
export const chaoCardSvg = (gd: Garden, c: ChaoSave, now: number, view: GardenView | undefined, width: number, medals?: [number, number, number]) => {
  const t = themeOf(view)
  const g = c.id
  const look = view === 'dark' || view === 'light' ? view : 'neutral'
  let body = ''
  let h: number
  const years = Math.round(yearsOf(gd, c) * 10) / 10
  if (c.stage === 'egg') {
    const warm = Math.max(0, Math.min(HATCH_WARMTH, c.warmth))
    const mins = Math.max(0, Math.ceil((c.born + HATCH_TIME - now) / 60000))
    body += bigName('Egg', 24, 48, g) + text(24, 68, 'warm and wiggly', 12, t.dim)
    body += pill(VW - 18, 36, 'Egg', '#eaf6ff', '#1c5d99', '#9ad8ff')
    body += glass(t, 16, 78, 180, 192) + portrait(gd, c, 106, 236, g)
    body += glass(t, 206, 78, 278, 192) + text(222, 100, 'HATCHING', 11, t.dim, 'font-weight="bold" letter-spacing="2"')
    for (let i = 0; i < HATCH_WARMTH; i++) body += heart(234 + i * 31, 132, 1.5, i < warm ? '#ff6b9d' : 'none', i < warm ? '#ffffff' : t.dim, i < warm ? 1 : 0.6)
    body +=
      text(222, 166, `${warm} of ${HATCH_WARMTH} messages heard`, 14, t.text, 'font-weight="bold"') +
      text(222, 186, `It hatches after ${plural(HATCH_WARMTH - warm, 'more message')},`, 12, t.dim) +
      text(222, 202, `or in ${plural(mins, 'minute')}, whichever comes first.`, 12, t.dim) +
      text(222, 236, 'Eggs like to be warm: just keep chatting.', 12, t.text)
    h = 290
  } else {
    const kind = c.stage === 'adult' || c.stage === 'cocoon' ? (c.kind ?? 'neutral') : leaning(c.align)
    const [pf, pi, pe] = KIND_PILL[kind]
    const second = c.stage === 'adult' ? secondOf(c) : undefined
    const form =
      c.stage === 'adult'
        ? `${KIND_NAME[kind]} ${TYPE_NAME[c.type ?? 'normal']}${second ? ` + ${TYPE_NAME[second]}` : ''}`
        : c.stage === 'cocoon'
          ? 'Cocoon'
          : c.stage === 'child'
            ? 'Child'
            : 'Baby'
    body += bigName(c.name || 'Chao', 24, 48, g) + text(24, 68, `${c.stage === 'adult' ? 'adult' : c.stage === 'cocoon' ? `becoming a ${KIND_NAME[kind]} ${TYPE_NAME[c.type ?? 'normal']}` : c.stage} · ${years} chao year${years === 1 ? '' : 's'} old · ${plural(c.age, 'garden day')}`, 12, t.dim)
    body += pill(VW - 18, 36, form, pf, pi, pe)
    body += glass(t, 16, 78, 180, 192) + portrait(gd, c, 106, 240, g)
    body += glass(t, 16, 280, 180, 50) + moodRow(t, c, 24, 296)
    body += statsPanel(t, c, 206, 78, 278)
    const low = lowerPanels(t, gd, c, now, medals, 340)
    body += low.svg
    h = low.bottom + 6
  }
  const height = Math.round((h * width) / VW)
  return { src: `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${VW} ${h}">${backdrop(t, look, h, g)}${body}</svg>`, height }
}

// The garden's card: its name and day, the shared tree with its kind and snacks, and how ripe each colour's next
// fruit is (Claude's work ripens them), with any ripe ones waiting and the last fruit eaten.
export const gardenCardSvg = (gd: Garden, treeLook: TreeLook, view: GardenView | undefined, width: number) => {
  const t = themeOf(view)
  const look = view === 'dark' || view === 'light' ? view : 'neutral'
  const g = 'garden'
  const h = 250
  const tr = gd.tree
  const name = look === 'dark' ? 'Dark Garden' : look === 'light' ? 'Light Garden' : 'Chao Garden'
  const level = treeStage(tr.grown, tr.snacks)
  const tree = treeSvg(level, undefined, treeLook).replace(/^<svg[^>]*>/, '<svg x="22" y="92" width="88" height="132" viewBox="0 0 56 84">')
  const status =
    tr.grown < TREE_GROWN ? `Growing: ${tr.grown} of ${TREE_GROWN} messages` : tr.snacks > 0 ? `${plural(tr.snacks, 'snack')} left on it` : 'Bare: a new seed after this turn'
  const kind = tr.kind
  const kindLine =
    kind.kind === ''
      ? 'Its kind settles when it is full grown'
      : kind.kind === 'twin' && kind.a && kind.b
        ? `A twin tree: ${TYPE_NAME[kind.a]} + ${TYPE_NAME[kind.b]}`
        : kind.kind === 'plain'
          ? `A plain tree${kind.a ? `: mostly ${FRUIT[kind.a].work}` : ''}`
          : 'A rainbow tree: a bit of everything'
  let s =
    bigName(name, 24, 40, g, 24) +
    text(VW - 22, 36, `garden day ${gd.g.days} · ${gd.chao.length} of ${MAX_CHAO} chao`, 11, t.dim, 'text-anchor="end"') +
    glass(t, 16, 54, 140, 182) +
    `<ellipse cx="66" cy="226" rx="44" ry="5" fill="#000000" opacity="0.15"/>` +
    tree +
    glass(t, 166, 54, 318, 182) +
    text(182, 76, 'THE TREE', 11, t.dim, 'font-weight="bold" letter-spacing="2"') +
    text(182, 96, status, 13, t.text, 'font-weight="bold"') +
    text(182, 112, kindLine, 11, t.dim) +
    text(182, 138, 'RIPENING', 11, t.dim, 'font-weight="bold" letter-spacing="2"')
  FRUIT_COLORS.forEach((k, i) => {
    const cx = 214 + i * 74
    const cy = 164
    const m = meterOf(gd.g, k)
    const waiting = gd.g.ready.includes(k)
    const f = waiting ? 1 : Math.max(0, Math.min(1, gd.g.ripe[k] / m))
    const circ = 2 * Math.PI * 15
    const done = k === 'fly' ? Math.floor(gd.g.ripe[k] / 100) * 100 : Math.floor(gd.g.ripe[k])
    s +=
      `<circle cx="${cx}" cy="${cy}" r="15" fill="none" stroke="#ffffff" stroke-opacity="0.16" stroke-width="4"/>` +
      `<circle cx="${cx}" cy="${cy}" r="15" fill="none" stroke="${FRUIT[k].fill}" stroke-width="4" stroke-linecap="round" stroke-dasharray="${r1(circ * f)} ${r1(circ)}" transform="rotate(-90 ${cx} ${cy})"/>` +
      fruit(cx, cy + 1, k, 7) +
      text(cx, cy + 30, waiting ? 'ripe!' : `${thousands(done)}/${thousands(m)}`, 10, waiting ? '#ffe066' : t.text, 'font-weight="bold" text-anchor="middle"') +
      text(cx, cy + 42, FRUIT[k].work, 9, t.dim, 'text-anchor="middle"')
  })
  if (gd.g.lastMeal.length) {
    const eater = (id: string) => gd.chao.find(o => o.id === id)?.name || 'a chao'
    const meal = gd.g.lastMeal.slice(0, 3)
    s += text(182, 226, `Last fruit: ${meal.map(([, id]) => eater(id)).join(', ')}${gd.g.lastMeal.length > 3 ? '…' : ''}`, 10, t.dim)
    meal.forEach(([k], i) => {
      s += fruit(VW - 34 - (meal.length - 1 - i) * 18, 222, k, 5)
    })
  }
  const height = Math.round((h * width) / VW)
  return { src: `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${VW} ${h}">${backdrop(t, look, h, g, 246, 30)}${s}</svg>`, height }
}
