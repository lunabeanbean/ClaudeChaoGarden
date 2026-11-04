import type { ChaoClass } from '../types'

// Class gear: small layers that go on any adult chao without hiding its features.
//   back: behind the body (quiver, shield, so the chao's own hand sits on top of the grip)
//   off:  in front of the body, drawn before the left hand (the warrior's sword; the left hand then holds it)
//   head: on the head, over the floating ball
//   hand: in the front hand (wand, bow, lyre)
//   fx:   sparkles around the chao
// Colours come from the chao's gear seed, so every chao's hat, shield and sparkles are their own colours.
export type Gear = { back: string; off: string; head: string; hand: string; fx: string }

const O = '#4a3b52'
const st = `stroke="${O}" stroke-width="0.6" stroke-linejoin="round"`
const GOLD = '#e0a82e'

// A steady pseudo-random number between 0 and 1 for a seed and a slot.
const sr = (seed: number, i: number) => {
  const x = Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453
  return x - Math.floor(x)
}

export const gearColors = (seed: number) => {
  const h1 = Math.floor(sr(seed, 1) * 360)
  const h2 = (h1 + 90 + Math.floor(sr(seed, 2) * 180)) % 360
  const h3 = Math.floor(sr(seed, 3) * 360)
  return {
    muted: `hsl(${h1},18%,52%)`,
    main: `hsl(${h1},62%,52%)`,
    dark: `hsl(${h1},58%,32%)`,
    light: `hsl(${h1},72%,82%)`,
    shield: `hsl(${h2},58%,50%)`,
    aura: `hsl(${h3},85%,78%)`,
  }
}

const star = (x: number, y: number, r: number, f: string) =>
  `<polygon points="${x},${y - r} ${x + r * 0.3},${y - r * 0.3} ${x + r},${y} ${x + r * 0.3},${y + r * 0.3} ${x},${y + r} ${x - r * 0.3},${y + r * 0.3} ${x - r},${y} ${x - r * 0.3},${y - r * 0.3}" fill="${f}" ${st}/>`
const glow = (x: number, y: number, r: number, c: string) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}" opacity="0.35"/>`
const band = (c: string, ribbon: string, extra = '') =>
  `<path d="M-8.2,-17.8 Q1,-27.5 10.2,-17.8" fill="none" stroke="${c}" stroke-width="1.9" stroke-linecap="round"/>` +
  `<path d="M-8,-18 q-5,0 -8,4.5 M-8,-18.4 q-5,-2.2 -8.4,-1.4" fill="none" stroke="${ribbon}" stroke-width="1.3" stroke-linecap="round"/>` +
  extra
const leaf = (x: number, y: number, rot: number, f: string) => `<path d="M${x},${y} q2,-3.4 4.4,0 q-2.4,3.4 -4.4,0 z" transform="rotate(${rot} ${x} ${y})" fill="${f}" ${st}/>`

const warrior = (t: 0 | 1 | 2, c: ReturnType<typeof gearColors>): Gear => {
  const blade = ['#c9a06a', '#e6eef7', '#d4f6ff'][t]
  const len = t === 2 ? 20 : 17
  return {
    back:
      `<g transform="translate(8.6,-7) rotate(8)">${t === 2 ? glow(0, 0, 8.5, '#ffe27a') : ''}<ellipse rx="5" ry="5.8" fill="${t === 0 ? '#b98a56' : c.shield}" ${st}/><ellipse rx="3.3" ry="3.9" fill="none" stroke="#f2ead8" stroke-width="0.6"/>` +
      (t === 2 ? star(0, 0, 2.4, '#fff7c2') : t === 1 ? `<circle r="1.2" fill="${GOLD}" ${st}/>` : `<path d="M-3,0 L3,0 M0,-3.4 L0,3.4" stroke="#7a5230" stroke-width="0.7"/>`) +
      `</g>`,
    off:
      `<g transform="translate(-4.6,-6) rotate(78)">${t === 2 ? `<rect x="-2.2" y="${-len - 3}" width="4.4" height="${len + 1}" rx="2" fill="#bff3ff" opacity="0.35"/>` : ''}` +
      `<path d="M-1.1,${-len} L0,${-len - 3} L1.1,${-len} L1.1,-3 L-1.1,-3 Z" fill="${blade}" ${st}/><path d="M0,${-len} L0,-3" stroke="#a9b8c8" stroke-width="0.5"/>` +
      `<rect x="-3.6" y="-3.4" width="7.2" height="1.7" rx="0.7" fill="${t === 0 ? '#8a5a3c' : GOLD}" ${st}/>` +
      (t === 2 ? `<circle cx="0" cy="-2.55" r="0.8" fill="#7ee0ff"/>` : '') +
      `<rect x="-0.8" y="-1.8" width="1.6" height="3.6" rx="0.6" fill="#8a4b2b" ${st}/></g>`,
    head: band(t === 0 ? c.muted : c.main, c.dark, t === 2 ? `<circle cx="1" cy="-23.6" r="1.4" fill="#7ee0ff" ${st}/>` : ''),
    hand: '',
    fx: t === 2 ? [[16, -26], [-14, -26], [19, -8]].map(([x, y]) => star(x!, y!, 2.2, c.aura)).join('') : '',
  }
}

const wizard = (t: 0 | 1 | 2, c: ReturnType<typeof gearColors>): Gear => {
  const hat = t === 0 ? c.muted : t === 1 ? c.main : c.dark
  const sparks = t === 2 ? [[-14, -30, 1], [17, -33, 1.3], [-17, -14, 0.9], [19, -12, 1], [0, -44, 1.1]] : t === 1 ? [[-14, -30, 1], [17, -33, 1.3], [-17, -14, 0.9]] : []
  return {
    back: '',
    off: t ? `<path d="M-5.5,-9.6 Q1,-7.6 7.4,-9.6" fill="none" stroke="${c.main}" stroke-width="1.5"/><circle cx="1" cy="-8.4" r="1.2" fill="#ffe066"/>` : '',
    head:
      `<g transform="rotate(-24 1 -24)"><path d="M-5.5,-24.6 Q1,-27 7.5,-24.6 L${t === 0 ? 2.5 : 3.5},${t === 0 ? -35 : -39} Z" fill="${hat}" ${st}/>` +
      `<ellipse cx="1" cy="-24.6" rx="9.2" ry="2" fill="${hat}" ${st}/><ellipse cx="1" cy="-24.6" rx="9.2" ry="2" fill="#000" opacity="0.12"/>` +
      (t ? `<path d="M-4.6,-26.6 Q1,-28.6 6.4,-26.6" fill="none" stroke="#ffd84a" stroke-width="1"/>` : '') +
      (t ? star(3.6, -33, 1.7, '#ffe066') : '') +
      (t === 2 ? `<path d="M-0.4,-30 a2.1,2.1 0 1,0 2.6,2.6 a1.6,1.6 0 1,1 -2.6,-2.6 z" fill="#ffe066"/>` : '') +
      `</g>`,
    hand:
      (t === 2 ? glow(14, -20, 7, c.aura) : t === 1 ? glow(14, -20, 5.5, '#ffe27a') : '') +
      `<g transform="translate(6,-6.5) rotate(28)"><rect x="-0.6" y="-17" width="1.3" height="17" rx="0.6" fill="${t === 2 ? c.light : '#8a5a3c'}" ${st}/>` +
      (t === 0
        ? `<circle cx="0" cy="-18.2" r="1.9" fill="#9be7ff" ${st}/>`
        : t === 1
          ? star(0, -19.4, 3.1, '#ffe066')
          : `<circle cx="0" cy="-19.4" r="3.2" fill="${c.aura}" ${st}/><circle cx="0" cy="-19.4" r="1.3" fill="#fff"/><path d="M-3.8,-19.4 a3.8,3.8 0 0,1 7.6,0" fill="none" stroke="#ffd84a" stroke-width="0.8"/>`) +
      `</g>`,
    fx: sparks.map(([x, y, r]) => star(x!, y!, r! * 2.2, c.aura)).join(''),
  }
}

const ranger = (t: 0 | 1 | 2, c: ReturnType<typeof gearColors>): Gear => {
  const g1 = t === 0 ? c.muted : t === 1 ? c.main : c.light
  const g2 = t === 2 ? '#b99a3b' : c.dark
  const arrows = t === 0 ? [0] : [-1.2, 0, 1.2]
  const bow = t === 2 ? '#e9d9a8' : t === 1 ? '#8a5a3c' : '#a67c52'
  const reach = t === 0 ? 6.2 : t === 1 ? 6.5 : 7.4
  const pts = [[-15, -28], [17, -30], [-16, -10], ...(t === 2 ? [[19, -12]] : [])]
  return {
    back:
      `<g transform="translate(-9,-9) rotate(-22)"><rect x="-2.4" y="-7" width="4.8" height="11" rx="1.1" fill="${t === 2 ? '#a07a3a' : '#7a4a2a'}" ${st}/>` +
      arrows.map((dx, i) => `<path d="M${dx},-7 L${dx},-11.5" stroke="#8a5a3c" stroke-width="0.5"/><path d="M${dx},-11.5 l-1,2 M${dx},-11.5 l1,2" stroke="${i === 1 ? '#fff' : g1}" stroke-width="0.8"/>`).join('') +
      `</g>`,
    off: `<path d="M-5.6,-10.6 Q1,-8.2 7.6,-10.6 L7.2,-8.4 Q1,-5.8 -5.2,-8.4 Z" fill="${g1}" ${st}/><path d="M-5,-9 l-3.4,5.4 l3.2,-0.4 z" fill="${g2}" ${st}/>`,
    head:
      band(g1, g2) +
      `<path d="M-6.2,-23.6 q-2.6,-4.6 -0.8,-9.4 q4.2,3.4 3.4,8.6 z" fill="${t === 2 ? '#fff' : c.light}" ${st}/>` +
      (t === 2 ? `<path d="M-6.4,-24 q-1,-4 -0.9,-8" stroke="#b99a3b" stroke-width="0.6" fill="none"/>` : ''),
    hand:
      (t === 2 ? glow(12, -6, 8, c.aura) : '') +
      `<path d="M8.2,${-reach - 12.5} Q${17 + (t === 2 ? 1.5 : 0)},-6.5 8.2,${reach}" fill="none" stroke="${bow}" stroke-width="${t === 2 ? 2 : 1.7}" stroke-linecap="round"/><path d="M8.2,${-reach - 12.5} L8.2,${reach}" stroke="#eef2f6" stroke-width="0.5"/>` +
      (t === 2 ? `<path d="M12,-15 q3,0 3,2.5 M13.5,2 q2.4,-0.6 2.6,-3" fill="none" stroke="${c.light}" stroke-width="0.9"/>` : '') +
      `<path d="M3,-6.5 L16.5,-6.5" stroke="${t === 2 ? '#fff' : '#8a5a3c'}" stroke-width="0.9"/><path d="M16.5,-8.1 L19.4,-6.5 L16.5,-4.9 Z" fill="${t === 2 ? '#bff3ff' : '#cfd8e3'}" ${st}/><path d="M3,-6.5 l-1.8,-1.6 M3,-6.5 l-1.8,1.6 M5,-6.5 l-1.8,-1.6 M5,-6.5 l-1.8,1.6" stroke="${t === 2 ? c.main : g1}" stroke-width="0.8"/>`,
    fx: t ? pts.map(([x, y]) => leaf(x!, y!, 0, c.aura)).join('') : '',
  }
}

// The healer is a bard: a lyre in the front hand, a flower circlet, floating music notes and hearts.
const healer = (t: 0 | 1 | 2, c: ReturnType<typeof gearColors>): Gear => {
  const frame = t === 0 ? '#b98a56' : GOLD
  const n = t === 0 ? 3 : t === 1 ? 4 : 5
  const strings = Array.from({ length: n }, (_, i) => {
    const x = -2.8 + (5.6 * i) / (n - 1)
    return `<path d="M${x},-12.4 L${x * 0.85},-1.6" stroke="#fff7e0" stroke-width="0.45"/>`
  }).join('')
  const note = (x: number, y: number, ch: string, size: number) =>
    `<text x="${x}" y="${y}" font-size="${size}" font-family="'Segoe UI Symbol','Arial Unicode MS',sans-serif" font-weight="bold" fill="${c.aura}" stroke="${O}" stroke-width="0.3">${ch}</text>`
  const flower = `<g transform="translate(6.6,-23)">${[0, 72, 144, 216, 288].map(a => `<circle cx="${(Math.cos((a * Math.PI) / 180) * 1.5).toFixed(2)}" cy="${(Math.sin((a * Math.PI) / 180) * 1.5).toFixed(2)}" r="1.1" fill="${c.light}" ${st}/>`).join('')}<circle r="0.9" fill="${GOLD}"/></g>`
  return {
    back: '',
    off: t ? `<path d="M-3.4,-10.2 Q1,-7.6 5.4,-10.2" fill="none" stroke="${c.light}" stroke-width="0.9"/><path d="M1,-6.6 C-1.2,-8.2 -1.2,-9.8 0.1,-9.8 C0.7,-9.8 1,-9.3 1,-9 C1,-9.3 1.3,-9.8 1.9,-9.8 C3.2,-9.8 3.2,-8.2 1,-6.6 Z" fill="#ff8fc0" ${st}/>` : '',
    head: band(c.main, c.dark) + leaf(-5.6, -22.4, -50, '#6fcf8a') + (t ? flower : '') + (t === 2 ? `<circle cx="1" cy="-23.4" r="1.3" fill="#7ee0ff" ${st}/>` : ''),
    hand:
      (t === 2 ? glow(10.5, -9, 8, c.aura) : '') +
      `<g transform="translate(7.6,-5.2) rotate(10)"><path d="M-4,-12.6 Q-6.6,-3 0,-0.4 Q6.6,-3 4,-12.6" fill="none" stroke="${frame}" stroke-width="1.5" stroke-linecap="round"/>` +
      `<path d="M-4.8,-12.6 L4.8,-12.6" stroke="${frame}" stroke-width="1.5" stroke-linecap="round"/>${strings}` +
      `<circle cx="-4.8" cy="-12.6" r="0.9" fill="${t === 0 ? '#8a5a3c' : c.main}"/><circle cx="4.8" cy="-12.6" r="0.9" fill="${t === 0 ? '#8a5a3c' : c.main}"/>` +
      (t === 2 ? `<circle cx="0" cy="-1.4" r="1.1" fill="#bff3ff" ${st}/>` : '') +
      `</g>`,
    fx: note(-16, -26, '♪', 8) + (t ? note(17, -31, '♫', 9) : '') + (t === 2 ? note(-18, -10, '♪', 7) + `<text x="19" y="-12" font-size="8" fill="${c.light}" stroke="${O}" stroke-width="0.3" font-weight="bold">+</text>` : ''),
  }
}

export const classGear = (cls: ChaoClass): Gear => {
  const c = gearColors(cls.seed)
  switch (cls.name) {
    case 'warrior':
      return warrior(cls.tier, c)
    case 'wizard':
      return wizard(cls.tier, c)
    case 'ranger':
      return ranger(cls.tier, c)
    default:
      return healer(cls.tier, c)
  }
}
