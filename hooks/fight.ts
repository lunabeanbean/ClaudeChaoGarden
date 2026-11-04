import { CLASSES, chaoArt } from './chao'
import { bugArt, omochaoArt } from './omochao'
import { CORRUPTIONS, STATUS_LETTER, STATUS_ORDER } from './battle'
import type { Battle, BattleUnit, Corruption, Status } from './battle'
import type { ChaoLook } from '../types'

// The fight in the band: ONE picture that plays the whole fight once, from the moment it appears. It happens
// right in the garden, on the ground the chao walk on (no window of its own; the band's title steps aside while
// it plays and the header and ending take its place). The team walks in from where each chao was walking, the
// omochao flies in from the edge (the challenger from its spot by the tree), close-up attacks run at their
// target, every move plays its own effect, with HP bars, status icons and damage numbers, then the ending and a
// fade. Nothing redraws while it plays: the band puts this picture in and takes it out once.
// Same 900 x 84 frame as the walkers, ground at y 80.

const GROUND = 80
// The fighters' size against their art (the walkers are drawn at 1.3, so they shrink a little as the fight
// starts), and the challenger's.
const SCALE = 1.1
const BOSS = 1.15
// A height on a fighter (in its art's units, feet at 0) as a y in the picture.
const up = (h: number) => Math.round((GROUND - h * SCALE) * 10) / 10
const MID = 450
const HEAD_Y = 30
// Team spots, front (nearest the omochao) to back; the omochao; its bugs.
const TEAM_X = [446, 394, 342, 290]
const FOE_X = 590
const MINION_X = [542, 640]
// Where the challenger waits by the tree (the band's challenger picture: column 20, omochao 30 px in).
const PERCH = 190
const HIT_Y = up(21)
// The team's HP bars, over their heads; an omochao's sits just over its own top, from how tall it stands in its
// art's units (the error one carries its warning sign).
const HP_Y = 29.5
const TALL: Partial<Record<Corruption, number>> = { error: 46 }
const WALK_IN = 1.4
// After the walk-in, a moment face to face while the header names the omochao (the HP bars would sit on
// it); the bars come up as it goes.
const LEAD = 1.6
const ENDING = 3.4
// The ending's words, between the team and the omochao, where no hearts rise.
const END_X = (TEAM_X[0]! + FOE_X) / 2
const FADE = 0.7
// Front to back: warriors lead, healers stay at the back.
const ROLE: Record<string, number> = { warrior: 0, none: 1, ranger: 2, wizard: 3, healer: 4 }
const WAVE: Record<Corruption, string> = { glitch: '#ff2fd0', error: '#ff5a5a', haywire: '#ff3a5a', bugged: '#6bbf3a', static: '#8a9bff', tangled: '#ffb347' }

const s = (n: number) => String(Math.round(n * 1000) / 1000)
const at = (t: number) => `${s(t)}s`

// A keyframe track over the whole fight: values at times (seconds), held at both ends.
type Key = [number, string]
const track = (tag: 'animate' | 'animateTransform', attr: string, keys: Key[], T: number, more = '') => {
  const out: Key[] = []
  for (const [t0, v] of keys.slice().sort((a, b) => a[0] - b[0])) {
    let t = Math.min(T, Math.max(0, t0))
    const prev = out[out.length - 1]
    if (prev && t <= prev[0]) t = prev[0] + 0.002
    if (t > T) continue
    out.push([t, v])
  }
  const first = out[0]
  if (!first) return ''
  if (first[0] > 0) out.unshift([0, first[1]])
  const last = out[out.length - 1] as Key
  if (last[0] < T) out.push([T, last[1]])
  const times = out.map(([t]) => (t / T).toFixed(5))
  times[0] = '0'
  times[times.length - 1] = '1'
  return `<${tag} attributeName="${attr}"${more} values="${out.map(k => k[1]).join(';')}" keyTimes="${times.join(';')}" dur="${s(T)}s" fill="freeze"/>`
}

// One-shot effects: shown at (x, y) from t for d seconds; moving from a to b; floating up.
const use = (id: string) => `<use href="#${id}"/>`
const flash = (shape: string, x: number, y: number, t: number, d: number) =>
  `<g transform="translate(${s(x)},${s(y)})" opacity="0"><animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.15;0.7;1" begin="${at(t)}" dur="${s(d)}s"/>${shape}</g>`
const fly = (shape: string, x1: number, y1: number, x2: number, y2: number, t: number, d: number) =>
  `<g opacity="0"><set attributeName="opacity" to="1" begin="${at(t)}" dur="${s(d)}s"/><g><animateTransform attributeName="transform" type="translate" values="${s(x1)} ${s(y1)};${s(x2)} ${s(y2)}" begin="${at(t)}" dur="${s(d)}s" fill="freeze"/>${shape}</g></g>`
const rise = (shape: string, x: number, y: number, t: number, d: number, dy = -12) =>
  `<g transform="translate(${s(x)},${s(y)})"><g opacity="0"><animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.12;0.65;1" begin="${at(t)}" dur="${s(d)}s"/><animateTransform attributeName="transform" type="translate" values="0 0;0 ${dy}" begin="${at(t)}" dur="${s(d)}s"/>${shape}</g></g>`
// Shown from t until u (or the end).
const during = (shape: string, t: number, u: number) =>
  `<g opacity="0"><set attributeName="opacity" to="1" begin="${at(t)}" dur="${s(Math.max(0.05, u - t))}s"/>${shape}</g>`

const star4 = (r: number, fill: string) => {
  const k = Math.round(r * 25) / 100
  return `<path d="M0,-${r} L${k},-${k} L${r},0 L${k},${k} L0,${r} L-${k},${k} L-${r},0 L-${k},-${k} Z" fill="${fill}"/>`
}
const txt = (t: string, size: number, fill: string, extra = '') =>
  `<text font-size="${size}" font-weight="bold" font-family="sans-serif" text-anchor="middle" fill="${fill}" stroke="#2a1838" stroke-width="1.5" paint-order="stroke"${extra}>${t}</text>`

// Shapes the effects reuse, drawn once.
const DEFS =
  `<defs>` +
  `<g id="impact">${star4(6, '#fff3bf')}${star4(3, '#ffffff')}</g>` +
  `<g id="slash"><path d="M-5,-9 Q4,-3 -1,8" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/><path d="M-1,-10 Q8,-3 3,7" fill="none" stroke="#ffe066" stroke-width="1" stroke-linecap="round"/></g>` +
  `<g id="spark"><circle r="3.6" fill="#ffe066" opacity="0.45"/>${star4(3.2, '#fffbe0')}</g>` +
  `<g id="fire"><circle r="3.8" fill="#ff7a2a" opacity="0.6"/><circle r="2.2" fill="#ffd43b"/></g>` +
  `<g id="flame"><path d="M0,-7 C3.5,-3.5 3.5,0 0,2.4 C-3.5,0 -3.5,-3.5 0,-7Z" fill="#ff7a2a"/><path d="M0,-3.4 C1.6,-1.8 1.6,0 0,1.2 C-1.6,0 -1.6,-1.8 0,-3.4Z" fill="#ffd43b"/></g>` +
  `<g id="arrow"><path d="M-8,0 L5,0" stroke="#a0703a" stroke-width="1"/><path d="M4.5,-2 L8.5,0 L4.5,2 Z" fill="#dfe6ee"/><path d="M-8,0 l-2.2,-1.8 M-8,0 l-2.2,1.8" stroke="#ff8fc0" stroke-width="0.8"/></g>` +
  `<g id="pierce"><path d="M-24,0 L-6,0" stroke="#7ee0ff" stroke-width="2.6" opacity="0.5" stroke-linecap="round"/><use href="#arrow"/></g>` +
  `<g id="note"><text font-size="9" font-family="sans-serif" text-anchor="middle" fill="#c5a3ff">♪</text></g>` +
  `<g id="note2"><text font-size="9" font-family="sans-serif" text-anchor="middle" fill="#ff9ed2">♫</text></g>` +
  `<g id="plus"><circle r="5" fill="#7ee081" opacity="0.25"/><text y="3" font-size="9" font-weight="bold" font-family="sans-serif" text-anchor="middle" fill="#7ee081">+</text></g>` +
  `<g id="heart"><text font-size="8" font-family="sans-serif" text-anchor="middle" fill="#ff8fc0">♥</text></g>` +
  `<g id="zz"><text font-size="8" font-weight="bold" font-family="sans-serif" fill="#a5b4ff">z<tspan dx="1" dy="-3" font-size="6">z</tspan></text></g>` +
  `<g id="shield"><ellipse cx="0" cy="${s(-20 * SCALE)}" rx="${s(15.3 * SCALE)}" ry="${s(21.2 * SCALE)}" fill="#74c0fc" fill-opacity="0.2" stroke="#a5d8ff" stroke-width="1"/></g>` +
  `<g id="rock"><path d="M9,-9 L2,-2" stroke="#ffd43b" stroke-width="3" opacity="0.5" stroke-linecap="round"/><circle r="5" fill="#ff922b" stroke="#c2410c" stroke-width="1"/><circle cx="-1.5" cy="-1.5" r="1.4" fill="#ffd8a8"/></g>` +
  `<g id="wires"><g transform="scale(${SCALE})"><path d="M-11.8,-7 Q0,-14 11.8,-7" fill="none" stroke="#ff6a3a" stroke-width="1"/><path d="M-11.8,-16.5 Q0,-9.4 11.8,-16.5" fill="none" stroke="#3ad06a" stroke-width="1"/><path d="M-10.6,-26 Q0,-20 10.6,-26" fill="none" stroke="#ffd54a" stroke-width="1"/></g></g>` +
  `<g id="puff"><circle cx="-4" cy="-4" r="4" fill="#d8d0e8" opacity="0.85"/><circle cx="3" cy="-6" r="5" fill="#ece6f6" opacity="0.85"/><circle cx="2" cy="0" r="3.5" fill="#d8d0e8" opacity="0.85"/></g>` +
  `<g id="err"><rect x="-10" y="-6.5" width="20" height="9" rx="2" fill="#2b2f3a" stroke="#ff5a5a" stroke-width="0.6"/><text y="0.6" font-size="6.5" font-weight="bold" font-family="monospace" text-anchor="middle" fill="#ff5a5a">ERR</text></g>` +
  `<g id="warn">${txt('!', 12, '#ff5a7a')}</g>` +
  `</defs>`

// Status icons over a head.
const ICON: Record<Status, string> = {
  burn: `<path d="M0,-3.4 C1.8,-1.6 1.8,0.4 0,1.6 C-1.8,0.4 -1.8,-1.6 0,-3.4Z" fill="#ff7a2a"/>`,
  sleep: `<text y="1.8" font-size="6" font-weight="bold" font-family="sans-serif" text-anchor="middle" fill="#a5b4ff">z</text>`,
  guarded: `<path d="M-2.2,-3 L2.2,-3 L2.2,-0.4 Q2.2,1.6 0,2.6 Q-2.2,1.6 -2.2,-0.4Z" fill="#74c0fc" stroke="#ffffff" stroke-width="0.4"/>`,
  regen: `<text y="2.2" font-size="7" font-weight="bold" font-family="sans-serif" text-anchor="middle" fill="#7ee081">+</text>`,
  slow: `<circle r="2.2" fill="none" stroke="#c0a0ff" stroke-width="0.8"/><circle r="0.9" fill="#c0a0ff"/>`,
  glitched: `<text y="2.2" font-size="7" font-weight="bold" font-family="sans-serif" text-anchor="middle" fill="#ff2fd0">?</text>`,
  bound: `<path d="M-2.8,0 C-2.8,-2 -0.6,-2 0,0 C0.6,2 2.8,2 2.8,0 C2.8,-2 0.6,-2 0,0 C-0.6,2 -2.8,2 -2.8,0Z" fill="none" stroke="#ffb347" stroke-width="0.8"/>`,
}
const LETTER_STATUS = Object.fromEntries(STATUS_ORDER.map(k => [STATUS_LETTER[k], k])) as Record<string, Status>

// The bit a beaten omochao leaves behind.
export const ITEM_ART: Record<string, string> = {
  chip: `<rect x="-4" y="-4" width="8" height="8" rx="1" fill="#ff2fd0"/><rect x="-1" y="-4" width="5" height="8" fill="#00f0ff" opacity="0.85"/><path d="M-5.5,-2 h1.5 M-5.5,1.5 h1.5 M4,-2 h1.5 M4,1.5 h1.5" stroke="#c9c9d9" stroke-width="0.8"/>`,
  button: `<circle r="4" fill="#232c48" stroke="#7aa6cf" stroke-width="0.8"/><circle cx="-1" cy="-1" r="0.6" fill="#fff"/><circle cx="1" cy="-1" r="0.6" fill="#fff"/><circle cx="-1" cy="1" r="0.6" fill="#fff"/><circle cx="1" cy="1" r="0.6" fill="#fff"/>`,
  spring: `<path d="M-3,4 L3,2.6 L-3,1.2 L3,-0.2 L-3,-1.6 L3,-3 L-3,-4.4" fill="none" stroke="#d0d8e0" stroke-width="1.2" stroke-linecap="round"/>`,
  shell: `<ellipse rx="4.4" ry="3.4" fill="#6bbf3a" stroke="#2f5a10" stroke-width="0.6"/><path d="M0,-3.4 L0,3.4" stroke="#2f5a10" stroke-width="0.5"/><circle cx="-2" cy="-0.6" r="0.7" fill="#4a8a2a"/>`,
  spark: `<path d="M1,-5 L-2.6,0.6 L0,0.6 L-1,5 L2.6,-0.8 L0,-0.8 Z" fill="#ffe066" stroke="#8a9bff" stroke-width="0.4"/>`,
  wire: `<rect x="-3.5" y="-4" width="7" height="8" rx="1.2" fill="#a0703a"/><path d="M-3.5,-2 h7 M-3.5,0 h7 M-3.5,2 h7" stroke="#ff6a3a" stroke-width="0.9"/>`,
  core: `<circle r="5.5" fill="#ffd43b" opacity="0.3"/>${star4(5, '#ffd43b')}${star4(2.4, '#fff8d6')}`,
}

const FALLBACK = (id: string, name: string): ChaoLook => ({ id, stage: 'adult', kind: 'neutral', name, happy: false, parts: {} })

export type FightPicture = { src: string; total: number }

// The whole fight as one picture. `looks` are the chao as the band draws them; `from` is where each team chao
// was walking when the fight began (undefined: it walks in from just behind its spot).
export const fightSvg = (b: Battle, looks: Record<string, ChaoLook>, from: Record<string, number | undefined>, label = ''): FightPicture => {
  const n = b.events.length
  const S = Math.min(0.85, Math.max(0.38, 16 / Math.max(1, n)))
  const ev = (i: number) => WALK_IN + LEAD + i * S
  const land = (i: number) => ev(i) + S * 0.5
  const tEnd = ev(n) + 0.3
  const T = Math.round((tEnd + ENDING) * 100) / 100

  const units = b.units
  const team = units.filter(u => u.side === 'team').sort((a, c) => (ROLE[a.cls ?? 'none'] ?? 1) - (ROLE[c.cls ?? 'none'] ?? 1))
  const boss = units.find(u => u.side === 'foe' && !u.minion)
  const X: Record<string, number> = {}
  team.forEach((u, k) => (X[u.id] = TEAM_X[k] ?? TEAM_X[3]!))
  if (boss) X[boss.id] = FOE_X
  const idx: Record<string, number> = {}
  units.forEach((u, i) => (idx[u.id] = i))
  const unit = (id: string) => units[idx[id] ?? -1] as BattleUnit | undefined
  const dirOf = (u?: BattleUnit) => (u?.side === 'team' ? 1 : -1)

  // per unit: position track, hit blinks, HP width track, status tracks, when it appears and faints
  const pos: Record<string, Key[]> = {}
  const blinks: Record<string, string[]> = {}
  const hpKeys: Record<string, Key[]> = {}
  const stKeys: Record<string, Partial<Record<Status, Key[]>>> = {}
  const ko: Record<string, number> = {}
  const shown: Record<string, number> = {}
  const W = (u: BattleUnit) => (u.minion ? 12 : 20)
  for (const u of units) {
    blinks[u.id] = []
    stKeys[u.id] = {}
    hpKeys[u.id] = [[0, String(W(u))]]
    shown[u.id] = u.minion ? land(u.from) : 0
  }
  for (const u of team) {
    const x = X[u.id]!
    const x0 = from[u.id] ?? x - 36
    pos[u.id] = [
      [0, `${s(x0)} ${GROUND}`],
      [WALK_IN, `${x} ${GROUND}`],
    ]
  }
  // the omochao flies in on its propeller from the far edge; the challenger hops over from the tree
  const enterX = b.challenge ? PERCH : 940
  if (boss)
    pos[boss.id] = b.challenge
      ? [
          [0, `${PERCH} ${GROUND}`],
          [0.35, `${PERCH} ${GROUND - 5}`],
          [WALK_IN * 0.55, `${(PERCH + FOE_X) / 2} 62`],
          [WALK_IN - 0.2, `${FOE_X} ${GROUND - 6}`],
          [WALK_IN, `${FOE_X} ${GROUND}`],
        ]
      : [
          [0, `${enterX} 52`],
          [WALK_IN - 0.3, `${FOE_X} ${GROUND - 8}`],
          [WALK_IN, `${FOE_X} ${GROUND}`],
        ]

  const fx: string[] = []
  const bump = (id: string, t: number, dx: number, dy = 0, d = S * 0.75) => {
    const x = X[id]
    if (x === undefined) return
    pos[id]?.push([t, `${x} ${GROUND}`], [t + d * 0.45, `${s(x + dx)} ${GROUND + dy}`], [t + d, `${x} ${GROUND}`])
  }
  // a close-up attack: it runs up to its target, strikes as the hit lands, and runs back
  const lunge = (id: string, t: number, to: number) => {
    const x = X[id]
    if (x === undefined) return
    const gap = to - x
    const dx = Math.sign(gap) * Math.max(8, Math.abs(gap) - 30)
    pos[id]?.push([t, `${x} ${GROUND}`], [t + S * 0.4, `${s(x + dx)} ${GROUND}`], [t + S * 0.6, `${s(x + dx)} ${GROUND}`], [t + S * 0.92, `${x} ${GROUND}`])
  }
  const shake = (id: string, t: number, d: number) => {
    const x = X[id]
    if (x === undefined) return
    const k: Key[] = [[t, `${x} ${GROUND}`]]
    for (let j = 1; j <= 5; j++) k.push([t + (d * j) / 6, `${s(x + (j % 2 ? 1.6 : -1.6))} ${GROUND}`])
    k.push([t + d, `${x} ${GROUND}`])
    pos[id]?.push(...k)
  }
  const blink = (id: string, t: number, hard = false) =>
    blinks[id]?.push(`<animate attributeName="opacity" values="1;${hard ? '0.1;1;0.3' : '0.3;1;0.5'};1" begin="${at(t)}" dur="${hard ? '0.22' : '0.3'}s"/>`)

  // minions take whichever bug spot is free when they are called
  const busy: (string | undefined)[] = [undefined, undefined]
  let prevHp = units.map(u => u.max)
  let prevSt = units.map(() => '')

  b.events.forEach((e, i) => {
    const t = ev(i)
    const tl = land(i)
    const a = unit(e.actor)
    const ax = X[e.actor] ?? FOE_X
    const dir = dirOf(a)
    const tgts = e.targets
    const tx = (id?: string) => (id !== undefined ? (X[id] ?? FOE_X) : FOE_X)
    const t0 = tgts[0]
    const corr = boss?.corr ?? 'glitch'

    if (e.fx === 'bugs' && t0) {
      const alive = (id?: string) => !!id && (e.hp[idx[id] ?? -1] ?? 0) > 0
      const k = alive(busy[0]) ? 1 : 0
      busy[k] = t0
      X[t0] = MINION_X[k]!
      pos[t0] = [[0, `${MINION_X[k]} ${GROUND}`]]
    }

    switch (e.fx) {
      case 'slash':
        lunge(e.actor, t, tx(t0))
        fx.push(flash(use('slash'), tx(t0), HIT_Y, tl - 0.05, 0.32))
        break
      case 'tackle':
      case 'tap':
        lunge(e.actor, t, tx(t0))
        fx.push(flash(use('impact'), tx(t0), HIT_Y, tl, 0.28))
        break
      case 'whirl':
        bump(e.actor, t, 6 * dir, -3)
        fx.push(flash(`<ellipse cx="0" cy="0" rx="17" ry="6" fill="none" stroke="#e0f0ff" stroke-width="1.4"/><ellipse cx="0" cy="0" rx="12" ry="4" fill="none" stroke="#ffe066" stroke-width="0.8"/>`, ax, up(16.5), t + S * 0.1, S * 0.6))
        for (const id of tgts) fx.push(flash(use('slash'), tx(id), HIT_Y, tl, 0.3))
        break
      case 'guard':
        bump(e.actor, t, 0, -4)
        for (const id of tgts) fx.push(flash(use('shield'), tx(id), GROUND, t + S * 0.2, Math.max(0.6, S * 1.2)))
        break
      case 'spark':
      case 'fire':
        bump(e.actor, t, 0, -4)
        fx.push(fly(use(e.fx), ax + 8 * dir, up(27), tx(t0) - 6 * dir, HIT_Y, t + S * 0.15, S * 0.35))
        fx.push(flash(use(e.fx === 'fire' ? 'flame' : 'impact'), tx(t0), HIT_Y + 2, tl, 0.35))
        break
      case 'charge':
        bump(e.actor, t, 0, -3)
        fx.push(flash(`<circle r="11" fill="#ffe066" opacity="0.3"/>${star4(5, '#fff3bf')}`, ax, up(26), t, S * 1.1))
        fx.push(rise(star4(2, '#ffe066'), ax - 6, up(19), t + S * 0.1, 0.8), rise(star4(2, '#c5a3ff'), ax + 6, up(16.5), t + S * 0.3, 0.8))
        break
      case 'meteor':
        bump(e.actor, t, 0, -4)
        for (const id of tgts) {
          fx.push(fly(use('rock'), tx(id) + 26, 20, tx(id), HIT_Y, t + S * 0.1, S * 0.4))
          fx.push(flash(`<g transform="scale(1.6)">${use('impact')}</g>`, tx(id), HIT_Y, tl, 0.4))
        }
        break
      case 'arrow':
      case 'pierce':
        bump(e.actor, t, -3 * dir)
        fx.push(fly(use(e.fx), ax + 8 * dir, up(23.5), tx(t0) - 6 * dir, HIT_Y, t + S * 0.15, S * 0.35))
        break
      case 'volley':
        bump(e.actor, t, -3 * dir)
        for (let k = 0; k < 3; k++) fx.push(fly(use('arrow'), ax + 8 * dir, up(26) + k * 2, tx(t0) - 6 * dir, HIT_Y - 2 + k * 2, t + S * (0.1 + k * 0.12), S * 0.3))
        break
      case 'soothe':
      case 'cheer':
        bump(e.actor, t, 0, -3)
        fx.push(rise(use(e.fx === 'cheer' ? 'heart' : 'note'), ax - 4, up(35), t, 0.9), rise(use(e.fx === 'cheer' ? 'heart' : 'note2'), ax + 5, up(30.5), t + S * 0.2, 0.9))
        for (const id of tgts) fx.push(rise(use('plus'), tx(id), HIT_Y, tl - 0.1, 0.6, -8))
        break
      case 'lullaby':
        bump(e.actor, t, 0, -3)
        fx.push(fly(use('note'), ax + 6, up(33), tx(t0), up(35), t, S * 0.5), fly(use('note2'), ax + 6, up(28), tx(t0), up(30.5), t + S * 0.15, S * 0.45))
        fx.push(rise(use('zz'), tx(t0) + 4, up(40), tl, 1))
        break
      case 'chorus':
        bump(e.actor, t, 0, -4)
        fx.push(rise(use('note'), ax - 5, up(35), t, 1), rise(use('note2'), ax + 5, up(33), t + S * 0.15, 1), rise(use('note'), ax, up(40), t + S * 0.3, 1))
        for (const id of tgts) fx.push(rise(use('plus'), tx(id), HIT_Y, tl, 0.6, -8))
        break
      case 'hit':
        if (a?.corr === 'glitch') blink(e.actor, t, true)
        lunge(e.actor, t, tx(t0))
        fx.push(flash(use('impact'), tx(t0), HIT_Y, tl, 0.28))
        break
      case 'windup': {
        // it shows its wind-up until it next acts
        const next = b.events.findIndex((o, j) => j > i && o.actor === e.actor)
        const until = next > 0 ? ev(next) : tEnd
        if (a?.corr === 'glitch') for (let k = 0; k < 3; k++) blink(e.actor, t + k * 0.25, true)
        else shake(e.actor, t, Math.min(0.8, until - t))
        fx.push(during(`<g transform="translate(${ax},${GROUND})"><ellipse cx="0" cy="${s(-20 * SCALE)}" rx="${s(18.8 * SCALE)}" ry="${s(24.7 * SCALE)}" fill="${WAVE[corr]}" opacity="0.2"><animate attributeName="opacity" values="0.08;0.32;0.08" dur="0.6s" repeatCount="indefinite"/></ellipse></g>`, t, until))
        // the "!" by its head, on the side it faces, clear of its HP bar
        fx.push(during(`<g transform="translate(${ax + 22 * dir},${up(30)})">${use('warn')}<animate attributeName="opacity" values="1;0.3;1" dur="0.5s" repeatCount="indefinite"/></g>`, t, until))
        break
      }
      case 'unleash': {
        bump(e.actor, t, 22 * dir, 0, S * 0.8)
        const c = WAVE[a?.corr ?? corr]
        const far = Math.min(...tgts.map(tx))
        fx.push(fly(`<path d="M0,0 Q-7,-12 -2,-24" stroke="${c}" stroke-width="3" fill="none" opacity="0.8"/><path d="M5,0 Q-1,-9 3,-17" stroke="#ffffff" stroke-width="1" fill="none" opacity="0.7"/>`, ax - 12, GROUND, far - 8, GROUND, t + S * 0.15, S * 0.4))
        for (const id of tgts) fx.push(flash(use('impact'), tx(id), HIT_Y, tl, 0.3))
        break
      }
      case 'bind':
        bump(e.actor, t, 8 * dir)
        fx.push(fly(use('wires'), ax - 10, GROUND, tx(t0), GROUND, t + S * 0.1, S * 0.4))
        fx.push(flash(`<g transform="translate(0,${GROUND - HIT_Y})">${use('wires')}</g>`, tx(t0), HIT_Y, tl, Math.max(0.8, S * 1.4)))
        break
      case 'bugs':
        bump(e.actor, t, 0, -5)
        if (t0) fx.push(flash(use('puff'), tx(t0), GROUND - 4, tl - 0.1, 0.5))
        break
      case 'crash':
        fx.push(flash(use('err'), ax + 24 * dir, up(34), t + S * 0.1, Math.max(0.7, S)))
        fx.push(rise(use('puff'), ax + 6, up(35), t + S * 0.2, 0.8, -8))
        break
      case 'burn':
        fx.push(flash(use('flame'), ax, up(14), t, Math.max(0.5, S * 0.8)))
        break
      case 'asleep':
        fx.push(rise(use('zz'), ax + 5, up(40), t, 1))
        break
      case 'stuck':
        shake(e.actor, t, Math.min(0.5, S * 0.8))
        fx.push(flash(`<g transform="translate(0,${GROUND - HIT_Y})">${use('wires')}</g>`, ax, HIT_Y, t, Math.max(0.5, S * 0.8)))
        break
    }

    // numbers and blinks for each hit; several on one target are spread out
    const seen: Record<string, number> = {}
    for (const h of e.hits) {
      const k = (seen[h.id] = (seen[h.id] ?? -1) + 1)
      const hu = unit(h.id)
      const when = tl + k * 0.12
      const x = (X[h.id] ?? FOE_X) + (k - (e.hits.filter(o => o.id === h.id).length - 1) / 2) * 10
      const label = h.miss ? 'miss' : h.heal ? `+${h.n}` : `${h.n}${h.crit ? '!' : ''}`
      const color = h.miss ? '#d0d0e0' : h.heal ? '#7ee081' : hu?.side === 'team' ? '#ff8a8a' : h.crit ? '#ffd43b' : h.weak ? '#ffb347' : h.resist ? '#b8c0d0' : '#ffffff'
      fx.push(rise(txt(label, h.crit ? 10 : h.miss ? 6.5 : 8, color), x, up(35), when, 0.9))
      if (!h.miss && !h.heal) blink(h.id, when)
      if (!h.miss && !h.heal && e.fx !== 'burn') bump(h.id, when, -3 * dirOf(hu), 0, 0.22)
    }

    // HP and statuses as they stand after this move
    units.forEach((u, j) => {
      const hp = e.hp[j]
      if (hp === undefined) return
      const old = prevHp[j] ?? u.max
      if (hp !== old) {
        hpKeys[u.id]!.push([tl, s((W(u) * old) / u.max)], [tl + 0.25, s((W(u) * hp) / u.max)])
        if (hp <= 0 && ko[u.id] === undefined) ko[u.id] = tl + 0.1
      }
      const st = e.st[j] ?? ''
      if (st !== (prevSt[j] ?? '')) {
        const have = new Set(Array.from(st).map(c => LETTER_STATUS[c]))
        const was = new Set(Array.from(prevSt[j] ?? '').map(c => LETTER_STATUS[c]))
        for (const k of STATUS_ORDER)
          if (have.has(k) !== was.has(k)) ((stKeys[u.id]![k] ??= [[0, '0']]) as Key[]).push([tl, have.has(k) ? '1' : '0'])
      }
    })
    prevHp = units.map((u, j) => e.hp[j] ?? prevHp[j] ?? u.max)
    prevSt = units.map((_, j) => e.st[j] ?? prevSt[j] ?? '')
  })

  // ---- the ending
  const alive = team.filter(u => (prevHp[idx[u.id] ?? 0] ?? 0) > 0)
  let ending = ''
  let toddles = false
  if (b.won && boss) {
    ko[boss.id] = tEnd
    fx.push(flash(`<g transform="scale(${s(1.6 * SCALE)})">${use('puff')}</g>`, FOE_X, GROUND - 8, tEnd, 0.9))
    const item = ITEM_ART[CORRUPTIONS[b.foe].drop] ?? ''
    // the bit it leaves behind floats up and stays until the window closes
    fx.push(`<g transform="translate(${FOE_X},64)" opacity="0"><set attributeName="opacity" to="1" begin="${at(tEnd + 0.4)}" fill="freeze"/><animateTransform attributeName="transform" type="translate" values="${FOE_X} 70;${FOE_X} 54" begin="${at(tEnd + 0.4)}" dur="0.7s" fill="freeze"/><g><animateTransform attributeName="transform" type="translate" values="0 0;0 -1.5;0 0" dur="1s" repeatCount="indefinite"/>${item}${b.challenge ? `<g transform="translate(11,2)">${ITEM_ART.core}</g>` : ''}</g></g>`)
    for (const u of alive) {
      const x = X[u.id]!
      pos[u.id]?.push([tEnd + 0.3, `${x} ${GROUND}`], [tEnd + 0.55, `${x} ${GROUND - 6}`], [tEnd + 0.8, `${x} ${GROUND}`], [tEnd + 1.05, `${x} ${GROUND - 6}`], [tEnd + 1.3, `${x} ${GROUND}`])
      fx.push(rise(use('heart'), x, up(40), tEnd + 0.5, 1.2))
    }
    ending = txt(b.challenge ? '★ Challenge cleared! ★' : 'Victory! ♥', 11, '#ffd43b')
  } else if (boss && alive.length === 0) {
    fx.push(rise(txt('hehe', 7, '#ffb3d9'), FOE_X + 20, 42, tEnd + 0.3, 1.4, -10))
    bump(boss.id, tEnd + 0.2, 0, -5, 0.5)
    bump(boss.id, tEnd + 0.8, 0, -5, 0.5)
    ending = txt('Time for a nap... they’ll be back!', 8.5, '#a5d8ff')
  } else if (boss) {
    // a draw: its wind-up key runs down and it toddles off
    toddles = true
    pos[boss.id]?.push([tEnd + 0.2, `${FOE_X} ${GROUND}`], [tEnd + 3, `${FOE_X + 200} ${GROUND}`])
    ending = txt('Its key ran down... it toddles away', 8.5, '#c5b3ff')
  }
  if (ending) fx.push(`<g transform="translate(${END_X},${HEAD_Y + 2})" opacity="0"><set attributeName="opacity" to="1" begin="${at(tEnd + 0.2)}" fill="freeze"/>${ending}</g>`)

  // ---- the units
  const unitSvg = (u: BattleUnit) => {
    const x = X[u.id] ?? FOE_X
    const sc = u.side === 'team' ? SCALE : u.minion ? 1 : b.challenge ? BOSS : SCALE
    let art: string
    if (u.side === 'team') art = `<g transform="scale(${sc})">${chaoArt(looks[u.id] ?? FALLBACK(u.id, u.name)).body}</g>`
    else if (u.minion) art = `<g transform="scale(-1,1)">${bugArt()}</g>`
    else
      art =
        (b.challenge ? `<ellipse cx="0" cy="${s(-20 * BOSS)}" rx="${s(20 * BOSS)}" ry="${s(25 * BOSS)}" fill="#7a1030" opacity="0.25"><animate attributeName="opacity" values="0.15;0.4;0.15" dur="1.6s" repeatCount="indefinite"/></ellipse>` : '') +
        `<g transform="scale(-${sc},${sc})">${omochaoArt(u.corr ?? 'glitch')}</g>`
    const k = ko[u.id]
    let koAnim = ''
    if (k !== undefined) {
      if (u.side === 'team') koAnim = track('animateTransform', 'transform', [[k, '0'], [k + 0.35, '-78']], T, ' type="rotate"') + track('animate', 'opacity', [[k, '1'], [k + 0.35, '0.55']], T)
      else koAnim = track('animateTransform', 'transform', [[k, '1'], [k + 0.45, '0.01']], T, ' type="scale"') + track('animate', 'opacity', [[k, '1'], [k + 0.45, '0']], T)
    }
    // coming in the other way, it faces where it is going until it arrives (chao face right, omochao left);
    // an omochao that toddles off turns to go
    const x0 = u.side === 'team' ? (from[u.id] ?? x - 36) : u.minion ? x : enterX
    const turns: Key[] = (u.side === 'team' ? x0 > x : x0 < x) ? [[0, '-1 1'], [WALK_IN, '1 1']] : [[0, '1 1']]
    if (u === boss && toddles) turns.push([tEnd + 0.2, '-1 1'])
    const face = turns.length > 1 ? track('animateTransform', 'transform', turns, T, ' type="scale" calcMode="discrete"') : ''
    const bob = `<animateTransform attributeName="transform" type="translate" values="0 0;0 -1.4;0 0" dur="0.7s" begin="-${s((idx[u.id] ?? 0) * 0.17)}s" repeatCount="indefinite"/>`
    const body =
      `<g>${track('animateTransform', 'transform', pos[u.id] ?? [[0, `${x} ${GROUND}`]], T, ' type="translate"')}` +
      `<g>${face}<g>${koAnim}<g>${(blinks[u.id] ?? []).join('')}<g>${bob}${art}</g></g></g></g></g>`

    // HP bar above the spot, its status icons in a row after it and the challenger's star before it
    const w = W(u)
    const hy = u.side === 'team' ? HP_Y : u.minion ? 60 : Math.round((GROUND - (TALL[u.corr ?? 'glitch'] ?? 39) * sc - 4.5) * 10) / 10
    const col = u.side === 'team' ? '#7ee081' : '#ff5a7a'
    const bar =
      `<rect x="${s(x - w / 2)}" y="${hy}" width="${w}" height="2.6" rx="1.3" fill="#1a1030" fill-opacity="0.7" stroke="#ffffff" stroke-opacity="0.6" stroke-width="0.4"/>` +
      `<rect x="${s(x - w / 2)}" y="${hy}" width="${w}" height="2.6" rx="1.3" fill="${col}">${track('animate', 'width', hpKeys[u.id] ?? [], T)}</rect>`
    const kinds = STATUS_ORDER.filter(k2 => stKeys[u.id]?.[k2])
    const icons = kinds
      .map((k2, j) => {
        const ix = x + w / 2 + 4.5 + j * 6.5
        return `<g transform="translate(${s(ix)},${s(hy + 1.3)})" opacity="0">${track('animate', 'opacity', stKeys[u.id]![k2]!, T, ' calcMode="discrete"')}${ICON[k2]}</g>`
      })
      .join('')
    const badge = u === boss && b.challenge ? `<g transform="translate(${s(x - w / 2 - 5)},${s(hy + 1.3)})">${star4(3.4, '#ffd43b')}</g>` : ''
    // it comes up as the header goes, follows its fighter sideways (runs, the walk off), steps aside for the
    // ending's words, and a beaten omochao's goes with it
    const hudFrom = u.side === 'team' || !u.minion ? WALK_IN + LEAD - 0.2 : shown[u.id]!
    const hudShow: Key[] = [[hudFrom, '0'], [hudFrom + 0.3, '1']]
    if (u === boss && k !== undefined) hudShow.push([k, '1'], [k + 0.45, '0'])
    else hudShow.push([tEnd, '1'], [tEnd + 0.3, '0'])
    const follow = (pos[u.id] ?? []).map(([t, v]): Key => [t, `${s(Number(v.split(' ')[0]) - x)} 0`])
    const hud =
      `<g opacity="0">${track('animate', 'opacity', hudShow, T)}` +
      `<g>${follow.length > 1 ? track('animateTransform', 'transform', follow, T, ' type="translate"') : ''}${bar}${badge}${icons}</g></g>`
    // a bug appears when it is called and is gone once it pops
    const appear = u.minion ? track('animate', 'opacity', [[shown[u.id]!, '0'], [shown[u.id]! + 0.2, '1'], ...(k !== undefined ? ([[k + 0.45, '1'], [k + 0.5, '0']] as Key[]) : [])], T) : ''
    return `<g opacity="${u.minion ? 0 : 1}">${appear}${body}${hud}</g>`
  }

  // ---- the header where the title was, and the whole thing fading in and out
  const c = CORRUPTIONS[b.foe]
  const name = `${b.practice ? 'Practice: ' : ''}${c.name}`
  const head = b.challenge ? `★ Challenge of the day: ${c.name} ★` : `⚠ ${name} appears!`
  const hint = `weak: ${c.weak.map(w => CLASSES[w].name.split(' ')[0]).join('/')} · strong: ${CLASSES[c.strong].name.split(' ')[0]}`
  const header =
    `<g opacity="0">${track('animate', 'opacity', [[0.2, '0'], [0.5, '1'], [WALK_IN + LEAD - 0.3, '1'], [WALK_IN + LEAD, '0']], T)}` +
    `<text x="${MID}" y="${HEAD_Y}" font-size="10" font-weight="bold" font-family="sans-serif" text-anchor="middle" fill="${b.challenge ? '#ffd43b' : '#ffd6ec'}" stroke="#2a1838" stroke-width="1.5" paint-order="stroke">${head}` +
    `<tspan dx="9" font-size="7" font-weight="normal" fill="#c9b8ff">${hint}</tspan></text></g>`

  const order = [...team.slice().reverse(), ...units.filter(u => u.side === 'foe')]
  const body = header + order.map(unitSvg).join('') + fx.join('')
  const src =
    `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="84" viewBox="0 0 900 84"><desc>fight ${label}</desc>${DEFS}` +
    `<g opacity="0">${track('animate', 'opacity', [[0, '0'], [0.3, '1'], [T - FADE, '1'], [T, '0']], T)}${body}</g></svg>`
  return { src, total: T }
}

// The challenger waiting at the edge of the garden: the day's omochao peeking out, glowing, with a star over it.
// Drawn at 1.04, as big next to the walkers as it was before they grew.
export const challengerSvg = (corr: Corruption) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="84" viewBox="0 0 64 84"><desc>challenge ${corr}</desc>` +
  `<g transform="translate(30,80)"><ellipse cx="0" cy="-21" rx="22" ry="27" fill="${WAVE[corr]}" opacity="0.2"><animate attributeName="opacity" values="0.1;0.35;0.1" dur="1.6s" repeatCount="indefinite"/></ellipse>` +
  `<g><animateTransform attributeName="transform" type="translate" values="0 0;0 -1.5;0 0" dur="0.9s" repeatCount="indefinite"/><g transform="scale(1.04)">${omochaoArt(corr)}</g></g>` +
  `<g transform="translate(1,-53)">${star4(4, '#ffd43b')}<animate attributeName="opacity" values="1;0.35;1" dur="1.2s" repeatCount="indefinite"/></g>` +
  `<g transform="translate(17,-42)">${txt('!', 9, '#ff5a7a')}<animate attributeName="opacity" values="0;1;0" dur="1.4s" repeatCount="indefinite"/></g></g></svg>`
