import { chaoArt, chaoSize, level } from './chao'
import type { ChaoSave, Garden } from './chao'
import { dayOf } from './battle'
import { plainOmochao } from './omochao'
import type { ChaoLook, GardenView } from '../types'

// ---- The Chao Race ----
// /chao race: up to four hatched chao race along the band, on one of five courses (a new one each day, or the one
// you name). Each part of a course runs on one stat: running on Run, the ponds on Swim, the rock climbs on Power and
// the glides off the top on Fly; Stamina keeps a chao fast over the last stretch. Babies and children are slower.
// The race is worked out at once and played back as ONE picture over the band, like a fight. Medals and course
// records are kept in the store (every chat sees them), and the winner wears the gold medal in the garden until
// another chao wins it. A surprise race also breaks out on its own every so many of your messages (like the wild
// omochao; /chao race every <n>, /chao race off). Races give medals and a little happiness, never stats, so a chao's
// type still comes only from Claude's work.

export type Leg = 'run' | 'swim' | 'climb' | 'glide'
export type CourseId = 'meadow' | 'lagoon' | 'cliffs' | 'sky' | 'grand'

// Every course is LENGTH px long in the band (in the front lane), in parts. A climb always goes up a rock and the
// glide after it comes back down to the ground. `hedges` are little hedges to hop (no time lost).
export const LENGTH = 700
export type Course = { name: string; blurb: string; legs: [Leg, number][]; hedges?: number[] }
export const COURSES: Record<CourseId, Course> = {
  meadow: { name: 'Meadow Sprint', blurb: 'all running, with hedges to hop: Run and Stamina', legs: [['run', 700]], hedges: [190, 320, 450, 580] },
  lagoon: { name: 'Splash Lagoon', blurb: 'two big ponds: Swim', legs: [['run', 80], ['swim', 195], ['run', 90], ['swim', 185], ['run', 150]] },
  cliffs: {
    name: 'Cliffside Climb',
    blurb: 'three rock climbs: Power',
    legs: [['run', 80], ['climb', 85], ['glide', 55], ['run', 70], ['climb', 85], ['glide', 55], ['run', 70], ['climb', 85], ['glide', 55], ['run', 60]],
  },
  sky: { name: 'Sky Hop', blurb: 'two long glides: Fly', legs: [['run', 70], ['climb', 60], ['glide', 185], ['climb', 60], ['glide', 185], ['run', 140]] },
  grand: { name: 'Grand Prix', blurb: 'a bit of everything', legs: [['run', 105], ['swim', 150], ['run', 70], ['climb', 60], ['glide', 160], ['run', 155]] },
}
export const COURSE_LIST = Object.keys(COURSES) as CourseId[]

// The course of the day, the same all day.
export const courseOfDay = (now: number): CourseId => {
  let h = 11
  for (const ch of dayOf(now)) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return COURSE_LIST[h % COURSE_LIST.length] ?? 'grand'
}

// "pond", "swim", "lagoon"... -> the course.
export const courseOf = (arg: string): CourseId | undefined => {
  const a = arg.trim().toLowerCase()
  if (/^(meadow|sprint|run|dash)/.test(a)) return 'meadow'
  if (/^(lagoon|pond|swim|splash|water)/.test(a)) return 'lagoon'
  if (/^(cliff|climb|power|rock)/.test(a)) return 'cliffs'
  if (/^(sky|glide|fly|hop)/.test(a)) return 'sky'
  if (/^(grand|prix|gp|mix|all)/.test(a)) return 'grand'
  return undefined
}

// ---- Speeds ----
const STAT: Record<Leg, 'run' | 'swim' | 'power' | 'fly'> = { run: 'run', swim: 'swim', climb: 'power', glide: 'fly' }
const STAT_NAME = { run: 'Run', swim: 'Swim', power: 'Power', fly: 'Fly' } as const
export const LEG_NAME: Record<Leg, string> = { run: 'running', swim: 'swimming', climb: 'climbing', glide: 'gliding' }
// px a second at a middling level; a stat's level makes it 0.65x (Lv 0) to about 1.4x (Lv 60+)
const BASE: Record<Leg, number> = { run: 70, swim: 44, climb: 30, glide: 82 }
const PACE_OF: Partial<Record<ChaoSave['stage'], number>> = { baby: 0.8, child: 0.9, adult: 1 }
const pep = (lv: number) => lv / (lv + 12)
const speedOf = (leg: Leg, lv: number) => BASE[leg] * (0.65 + 0.85 * pep(lv))
// Past this part of the course a chao tires: down to 0.8x with no Stamina, hardly at all with lots.
export const TIRED_AT = 0.6
const tiredOf = (stamina: number) => 0.8 + 0.2 * pep(level(stamina))
// The chance to trip on a running part (happy chao trip half as often), and the time it costs.
const TRIP = 0.07
const TRIP_HAPPY = 0.035
const TRIP_S = 0.6
export const RACERS = 4

const racing = (c: ChaoSave) => c.stage === 'baby' || c.stage === 'child' || c.stage === 'adult'
const expected = (c: ChaoSave, course: Course) =>
  course.legs.reduce((t, [leg, len]) => t + len / (speedOf(leg, level(c.stats[STAT[leg]])) * (PACE_OF[c.stage] ?? 1)), 0)

// One stretch of a runner's race: waiting for the start, a part of the course (from distance d0 to d1, race time t0
// to t1), or lying flat after a trip.
export type Seg = { leg: Leg | 'wait' | 'trip'; d0: number; d1: number; t0: number; t1: number }
export type Runner = {
  id: string
  name: string
  // 0 is the front lane
  lane: number
  time: number
  place: number
  legs: Partial<Record<Leg, number>>
  trips: number
  segs: Seg[]
  // the levels that count, for the results
  lv: Record<'run' | 'swim' | 'power' | 'fly' | 'stamina', number>
}
export type Race = {
  course: CourseId
  at: number
  runners: Runner[]
  // a new course record (and the one it beat)
  record?: { t: number; name: string; was?: { t: number; name: string } }
  // a surprise race that broke out on its own
  wild?: boolean
}

// The race, worked out at once. The four chao that should do best on this course race (with fewer, all of them).
export const runRace = (chao: ChaoSave[], id: CourseId, rng: () => number = Math.random): Race | undefined => {
  const course = COURSES[id]
  const field = chao
    .filter(racing)
    .map(c => ({ c, e: expected(c, course) }))
    .sort((a, b) => a.e - b.e || (a.c.id < b.c.id ? -1 : 1))
    .slice(0, RACERS)
    .map(x => x.c)
  if (!field.length) return undefined
  const lanes = field.map((_, i) => i)
  for (let i = lanes.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    const swap = lanes[i]!
    lanes[i] = lanes[j]!
    lanes[j] = swap
  }
  const tiredD = TIRED_AT * LENGTH
  const runners = field.map((c, i): Runner => {
    const happy = c.happiness >= 70
    const pace = (PACE_OF[c.stage] ?? 1) * (happy ? 1.03 : 1)
    let t = Math.round((0.05 + rng() * 0.25) * 100) / 100
    const segs: Seg[] = [{ leg: 'wait', d0: 0, d1: 0, t0: 0, t1: t }]
    const legs: Partial<Record<Leg, number>> = {}
    let d = 0
    let trips = 0
    for (const [leg, len] of course.legs) {
      const v0 = speedOf(leg, level(c.stats[STAT[leg]])) * pace * (0.94 + rng() * 0.12)
      const tripAt = leg === 'run' && len >= 60 && rng() < (happy ? TRIP_HAPPY : TRIP) ? Math.round(d + len * (0.25 + rng() * 0.5)) : -1
      const cuts = [d, ...[tiredD, tripAt].filter(x => x > d && x < d + len).sort((a, b) => a - b), d + len]
      for (let k = 0; k + 1 < cuts.length; k++) {
        const a = cuts[k]!
        const b = cuts[k + 1]!
        const v = a >= tiredD - 0.001 ? v0 * tiredOf(c.stats.stamina) : v0
        const dt = (b - a) / v
        segs.push({ leg, d0: a, d1: b, t0: t, t1: t + dt })
        legs[leg] = (legs[leg] ?? 0) + dt
        t += dt
        if (b === tripAt) {
          segs.push({ leg: 'trip', d0: b, d1: b, t0: t, t1: t + TRIP_S })
          legs[leg] = (legs[leg] ?? 0) + TRIP_S
          t += TRIP_S
          trips++
        }
      }
      d += len
    }
    const s = c.stats
    return {
      id: c.id,
      name: c.name || 'a chao',
      lane: lanes[i]!,
      time: t,
      place: 0,
      legs,
      trips,
      segs,
      lv: { run: level(s.run), swim: level(s.swim), power: level(s.power), fly: level(s.fly), stamina: level(s.stamina) },
    }
  })
  runners
    .slice()
    .sort((a, b) => a.time - b.time)
    .forEach((r, k) => (r.place = k + 1))
  return { course: id, at: 0, runners }
}

// ---- Medals, records and the surprise races (store key 'race'; the last race is 'lastRace') ----
// `since` counts your messages since the last race, `due` is how many the next surprise race needs (about `every`,
// give or take 30%), `off` stops the surprise ones (/chao race still works).
export type RaceSave = {
  runs: number
  medals: Record<string, [number, number, number]>
  best: Partial<Record<CourseId, { t: number; name: string }>>
  since: number
  due: number
  every: number
  off?: boolean
}
// About how many of your messages apart the surprise races come, to start with.
export const RACE_EVERY = 15

export const normalizeRaceSave = (v: unknown): RaceSave => {
  const o = v && typeof v === 'object' ? (v as Partial<RaceSave>) : {}
  const medals: RaceSave['medals'] = {}
  for (const [id, m] of Object.entries(o.medals ?? {}))
    if (Array.isArray(m)) medals[id] = [Number(m[0]) || 0, Number(m[1]) || 0, Number(m[2]) || 0]
  const best: RaceSave['best'] = {}
  for (const k of COURSE_LIST) {
    const b = o.best?.[k]
    if (b && typeof b.t === 'number' && Number.isFinite(b.t)) best[k] = { t: b.t, name: String(b.name ?? 'a chao') }
  }
  return {
    runs: typeof o.runs === 'number' ? o.runs : 0,
    medals,
    best,
    since: Math.max(0, Number(o.since) || 0),
    due: Math.max(0, Number(o.due) || 0),
    every: Math.min(100, Math.max(3, Number(o.every) || RACE_EVERY)),
    ...(o.off ? { off: true } : {}),
  }
}

const tenths = (t: number) => Math.round(t * 10) / 10
const byPlace = (r: Race) => r.runners.slice().sort((a, b) => a.place - b.place)

// Pays out a race: medals for the first three (with two or more racing), the gold medal to wear for the winner, a
// little happiness for everyone who ran, and the course record. `save` is a copy the caller stores afterwards.
export const payRace = (gd: Garden, r: Race, save: RaceSave) => {
  save.runs++
  const order = byPlace(r)
  const win = order[0]
  if (!win) return
  if (order.length > 1) {
    for (const x of order.slice(0, 3)) {
      const m = save.medals[x.id] ?? [0, 0, 0]
      m[(x.place - 1) as 0 | 1 | 2]++
      save.medals[x.id] = m
    }
    gd.g.champ = win.id
  }
  for (const x of order) {
    const c = gd.chao.find(o => o.id === x.id)
    if (c) c.happiness = Math.min(100, c.happiness + (x.place === 1 && order.length > 1 ? 3 : 1))
  }
  const t = tenths(win.time)
  const best = save.best[r.course]
  if (!best || t < best.t) {
    r.record = { t, name: win.name, ...(best ? { was: best } : {}) }
    save.best[r.course] = { t, name: win.name }
  }
}

// What /chao race last keeps: everything but the playback.
export const slimRace = (r: Race): Race => ({ ...r, runners: r.runners.map(x => ({ ...x, segs: [] })) })

const MEDAL = ['🥇', '🥈', '🥉']
const PLACE = ['1st', '2nd', '3rd', '4th']

// The race in words, for /chao race last.
export const raceText = (r: Race): string => {
  const c = COURSES[r.course]
  const kinds = [...new Set(c.legs.map(l => l[0]))]
  const order = byPlace(r)
  const many = order.length > 1
  const lines = [`🏁 ${r.wild ? 'Surprise race! ' : ''}${c.name} (${c.blurb}): ${c.legs.map(l => l[0]).join(', ')}`]
  for (const x of order)
    lines.push(
      `${many ? (MEDAL[x.place - 1] ?? '  ') : '⏱'} ${x.name} ${tenths(x.time).toFixed(1)} s  (${kinds.map(k => `${k} ${(x.legs[k] ?? 0).toFixed(1)}`).join(' · ')})` +
        (x.trips ? `, tripped ${x.trips === 1 ? 'once' : `${x.trips} times`}` : ''),
    )
  if (r.record) lines.push(`★ New course record: ${r.record.name}, ${r.record.t.toFixed(1)} s${r.record.was ? ` (the old one was ${r.record.was.t.toFixed(1)} s by ${r.record.was.name})` : ''}`)
  if (many)
    lines.push(
      `Quickest at ${kinds
        .map(k => {
          const q = order.reduce((a, b) => ((b.legs[k] ?? 0) < (a.legs[k] ?? 0) ? b : a))
          return `${LEG_NAME[k]}: ${q.name} (${STAT_NAME[STAT[k]]} Lv ${q.lv[STAT[k]]})`
        })
        .join(' · ')}`,
    )
  lines.push('Running goes on Run, the ponds on Swim, the climbs on Power and the glides on Fly; Stamina keeps a chao fast over the last stretch.')
  return lines.join('\n')
}

// How many more of your messages until the next surprise race.
export const racesLeft = (save: RaceSave) => (save.due ? Math.max(1, save.due - save.since) : save.every)

// The /chao card's race lines.
export const raceLines = (save: RaceSave, names: Record<string, string>, champ: string | undefined, today: CourseId): string[] => {
  const medals = Object.entries(save.medals)
    .filter(([id, m]) => names[id] && m.some(n => n > 0))
    .sort((a, b) => b[1][0] - a[1][0] || b[1][1] - a[1][1] || b[1][2] - a[1][2])
    .map(([id, m]) => `${names[id]} ${m.map((n, k) => (n ? `${MEDAL[k]}${n}` : '')).filter(Boolean).join(' ')}`)
  return [
    `🏁 Races: ${save.runs}${medals.length ? ` · medals: ${medals.join(', ')}` : ''}${champ && names[champ] ? ` · ${names[champ]} wears the gold medal` : ''}`,
    `   Today's course: ${COURSES[today].name} (${COURSES[today].blurb}). /chao race starts it; /chao race <course> runs another.`,
    save.off
      ? '   Surprise races are off (/chao race on brings them back).'
      : `   Next surprise race: in ${racesLeft(save)} message${racesLeft(save) === 1 ? '' : 's'} (about every ${save.every}; /chao race every <n> changes it).`,
  ]
}

// /chao race courses: every course with its record.
export const coursesText = (save: RaceSave, today: CourseId) =>
  [
    ...COURSE_LIST.map(k => {
      const b = save.best[k]
      return `${k === today ? '▸' : ' '} ${COURSES[k].name} (/chao race ${k}): ${COURSES[k].blurb}${b ? ` · record ${b.t.toFixed(1)} s by ${b.name}` : ''}`
    }),
    '▸ is today\'s course. Running goes on Run, the ponds on Swim, the climbs on Power and the glides on Fly; Stamina helps at the end.',
  ].join('\n')

// ---- The picture ----
// The whole race as ONE 900 x 84 picture that plays once from the moment it appears, over the garden: the racers
// walk to the start line, an omochao counts them down and drops its flag, they run, swim, climb and glide (a stopwatch
// ticks where the title was), confetti flies when the first one crosses the line, everyone slows to a stop past it,
// the medals come out and the whole thing fades. The lanes go back and up a little, so the course is drawn slanted.

const GROUND = 80
const START = 56
const FINISH = START + LENGTH
const LANE_X = 9
const LANE_Y = -3.5
const LANE_SCALE = [1.1, 1.04, 0.98, 0.92]
// how high a climb goes and how far a swimmer sinks; the water comes up WET above its feet (the band shows little
// below the chao's feet, so the water has to rise round them rather than they sink into it)
const H = 12
const DIP = 2.5
const WET = 5.5
const WALK_IN = 1.4
const HEADER = 1.6
const BEAT = 0.65
const GO = WALK_IN + HEADER + 3 * BEAT
// The running itself plays in at most this many seconds (a slow race plays faster; the times shown are the race's).
const PLAY = 14
// where each place slows to a stop past the line
const STOPS = [882, 852, 822, 794]
const ENDING = 4.2
const FADE = 0.7
const MID = 450

const s = (n: number) => String(Math.round(n * 100) / 100)
const at = (t: number) => `${s(t)}s`

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
const flash = (shape: string, x: number, y: number, t: number, d: number) =>
  `<g transform="translate(${s(x)},${s(y)})" opacity="0"><animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.15;0.7;1" begin="${at(t)}" dur="${s(d)}s"/>${shape}</g>`
const rise = (shape: string, x: number, y: number, t: number, d: number, dy = -8) =>
  `<g transform="translate(${s(x)},${s(y)})"><g opacity="0"><animate attributeName="opacity" values="0;0.9;0.6;0" keyTimes="0;0.15;0.6;1" begin="${at(t)}" dur="${s(d)}s"/><animateTransform attributeName="transform" type="translate" values="0 0;0 ${dy}" begin="${at(t)}" dur="${s(d)}s"/>${shape}</g></g>`
const during = (shape: string, t: number, u: number) =>
  `<g opacity="0"><set attributeName="opacity" to="1" begin="${at(t)}" dur="${s(Math.max(0.05, u - t))}s"/>${shape}</g>`
const showFrom = (shape: string, t: number) => `<g opacity="0"><set attributeName="opacity" to="1" begin="${at(t)}" fill="freeze"/>${shape}</g>`
const star4 = (r: number, fill: string) => {
  const k = Math.round(r * 25) / 100
  return `<path d="M0,-${r} L${k},-${k} L${r},0 L${k},${k} L0,${r} L-${k},${k} L-${r},0 L-${k},-${k} Z" fill="${fill}"/>`
}
const txt = (t: string, size: number, fill: string, extra = '') =>
  `<text font-size="${size}" font-weight="bold" font-family="sans-serif" text-anchor="middle" fill="${fill}" stroke="#2a1838" stroke-width="1.5" paint-order="stroke"${extra}>${t}</text>`
// a word popping in big and settling
const pop = (shape: string, x: number, y: number, t: number, d: number) =>
  `<g transform="translate(${s(x)},${s(y)})">${during(`<g><animateTransform attributeName="transform" type="scale" values="1.7;1" begin="${at(t)}" dur="0.22s" fill="freeze"/>${shape}</g>`, t, t + d)}</g>`

const CONFETTI = ['#ff8fc0', '#ffd43b', '#7ee0ff', '#b197fc', '#7ee081', '#ff9a3c']
const MEDAL_FILL = ['#ffd43b', '#dfe6ee', '#e8a066']
const MEDAL_EDGE = ['#b8860b', '#8a96a6', '#9a5a2a']

// The rock, pond and hedge colours fit the garden on screen.
const ROCK: Record<GardenView, [string, string, string, string]> = {
  neutral: ['#b9a6dd', '#8f7bb8', '#6c5a94', '#e2d6ff'],
  dark: ['#7d7a9e', '#5a5779', '#423f5c', '#a9a6d0'],
  light: ['#e8c39a', '#c9996a', '#a5774c', '#fff0d6'],
}
const WATER: Record<GardenView, [string, string]> = { neutral: ['#8fdcff', '#4aa8e0'], dark: ['#5f8fd6', '#2f5a9e'], light: ['#8fe0f5', '#4ab0d8'] }
const HEDGE: Record<GardenView, [string, string]> = { neutral: ['#7ccb6f', '#4f9a4a'], dark: ['#4f8a5a', '#2f5a3a'], light: ['#8fd67a', '#5aa64f'] }

const FALLBACK = (id: string, name: string): ChaoLook => ({ id, stage: 'baby', kind: 'neutral', name, happy: false, parts: {} })

export type RacePicture = { src: string; total: number }

// `looks` are the chao as the band draws them; `from` is where each one was walking when the race was called
// (undefined: it walks in from a little to the right of the start).
export const raceSvg = (r: Race, looks: Record<string, ChaoLook>, from0: Record<string, number | undefined>, view: GardenView = 'neutral', label = ''): RacePicture => {
  const course = COURSES[r.course]
  const n = r.runners.length
  // the course is drawn at least two lanes deep, so it looks like a track even for one or two
  const D = Math.max(2, n - 1) + 0.6
  const DX = LANE_X * D
  const DY = LANE_Y * D
  const gy = (k: number) => GROUND + LANE_Y * k
  const xOf = (d: number, k: number) => START + d + LANE_X * k

  const ranges: { leg: Leg; d0: number; d1: number }[] = []
  let acc = 0
  for (const [leg, len] of course.legs) {
    ranges.push({ leg, d0: acc, d1: acc + len })
    acc += len
  }
  const liftAt = (d: number) => {
    let y = 0
    for (const g of ranges) {
      if (d < g.d0 - 1e-6 || d > g.d1 + 1e-6) continue
      const f = g.d1 > g.d0 ? (d - g.d0) / (g.d1 - g.d0) : 0
      if (g.leg === 'climb') y = -H * f
      else if (g.leg === 'glide') y = -H * (1 - f)
      else if (g.leg === 'swim') y = DIP * Math.max(0, Math.min(1, (d - g.d0) / 8, (g.d1 - d) / 8))
      break
    }
    for (const h of course.hedges ?? []) {
      const u = Math.abs(d - h) / 14
      if (u < 1) y -= 9 * (1 - u * u)
    }
    return y
  }
  // points inside a stretch where the path bends (into and out of the water, over a hedge)
  const bends = (a: number, b: number) => {
    const pts: number[] = []
    for (const g of ranges) if (g.leg === 'swim') pts.push(g.d0 + 8, g.d1 - 8)
    for (const h of course.hedges ?? []) pts.push(h - 14, h - 7, h, h + 7, h + 14)
    return pts.filter(p => p > a + 0.01 && p < b - 0.01).sort((x, y) => x - y)
  }

  const maxTime = Math.max(...r.runners.map(x => x.time))
  const play = Math.min(1, PLAY / maxTime)
  const T_of = (rt: number) => GO + rt * play
  // a runner's distance at a race time, and its race time at a distance
  const dAt = (x: Runner, rt: number) => {
    for (const g of x.segs) if (rt >= g.t0 && rt <= g.t1) return g.leg === 'wait' || g.leg === 'trip' || g.t1 === g.t0 ? g.d0 : g.d0 + ((g.d1 - g.d0) * (rt - g.t0)) / (g.t1 - g.t0)
    return rt < 0 ? 0 : LENGTH
  }
  const tAt = (x: Runner, d: number) => {
    for (const g of x.segs) if (g.leg !== 'wait' && g.leg !== 'trip' && d >= g.d0 && d <= g.d1) return g.d1 === g.d0 ? g.t0 : g.t0 + ((g.t1 - g.t0) * (d - g.d0)) / (g.d1 - g.d0)
    return x.time
  }
  const stopAt = (x: Runner) => T_of(x.time) + Math.max(0.4, ((STOPS[x.place - 1] ?? 794) - xOf(LENGTH, x.lane)) / 110)
  const tEnd = Math.max(...r.runners.map(stopAt)) + 0.2
  const T = Math.round((tEnd + ENDING) * 100) / 100
  const order = byPlace(r)
  const win = order[0]!
  const many = n > 1
  const winAt = T_of(win.time)

  const rock = ROCK[view]
  const water = WATER[view]
  const hedge = HEDGE[view]
  const G = GROUND + 1
  const fx: string[] = []

  // ---- the course, behind the racers
  let back = ''
  for (const g of ranges) {
    const a = xOf(g.d0, 0)
    const b = xOf(g.d1, 0)
    if (g.leg === 'swim') {
      back +=
        `<polygon points="${s(a - 6)},84 ${s(b + 6)},84 ${s(b + 6 + DX)},${s(G + DY - 6)} ${s(a - 6 + DX)},${s(G + DY - 6)}" fill="url(#rwater)" opacity="0.92"/>` +
        `<path d="M${s(a - 6 + DX)},${s(G + DY - 6)} L${s(b + 6 + DX)},${s(G + DY - 6)}" stroke="#e6f8ff" stroke-width="0.8" opacity="0.8"/>`
      for (let k = 0; k < 5; k++) {
        const gx = a + 12 + ((b - a - 24) * (k + 0.5)) / 5 + DX * ((k * 37) % 10) / 12
        const gyv = 79 + (DY - 9) * (((k * 53) % 10) / 10)
        back += `<path d="M${s(gx - 3)},${s(gyv)} h6" stroke="#ffffff" stroke-width="0.7" stroke-linecap="round" opacity="0.6"><animate attributeName="opacity" values="0.1;0.7;0.1" dur="${s(1.4 + k * 0.3)}s" repeatCount="indefinite"/></path>`
      }
    } else if (g.leg === 'climb') {
      back +=
        `<polygon points="${s(a)},${G} ${s(b)},${G - H} ${s(b + DX)},${s(G - H + DY)} ${s(a + DX)},${s(G + DY)}" fill="${rock[0]}"/>` +
        `<polygon points="${s(b)},${G - H} ${s(b + DX)},${s(G - H + DY)} ${s(b + DX + 1.5)},${s(G + DY)} ${s(b + 1.5)},84" fill="${rock[2]}"/>` +
        `<polygon points="${s(a)},${G} ${s(b)},${G - H} ${s(b + 1.5)},84 ${s(a)},84" fill="${rock[1]}"/>` +
        `<path d="M${s(a + DX)},${s(G + DY)} L${s(b + DX)},${s(G - H + DY)}" stroke="${rock[3]}" stroke-width="0.8" fill="none"/>` +
        `<path d="M${s(a + (b - a) * 0.35)},${s(G - H * 0.35 + 3)} l5,-1 M${s(a + (b - a) * 0.7)},${s(G - H * 0.7 + 4)} l6,-1.5" stroke="${rock[2]}" stroke-width="0.7" opacity="0.7"/>`
    } else if (g.leg === 'glide') {
      // a few breezes over the gap
      for (let k = 0; k < 3; k++) {
        const wx = a + ((b - a) * (k + 0.6)) / 3.4
        const wy = G - H - 6 + k * 3
        back += `<path d="M${s(wx)},${s(wy)} q6,-3 12,0 q-4,1 -6,-1" fill="none" stroke="#ffffff" stroke-width="0.7" opacity="0.5"><animate attributeName="opacity" values="0.15;0.6;0.15" dur="${s(1.6 + k * 0.4)}s" repeatCount="indefinite"/></path>`
      }
    }
  }
  for (const h of course.hedges ?? []) {
    const hx = xOf(h, 0)
    back +=
      `<polygon points="${s(hx - 3)},76.5 ${s(hx + 3)},76.5 ${s(hx + 3 + DX)},${s(76.5 + DY)} ${s(hx - 3 + DX)},${s(76.5 + DY)}" fill="${hedge[0]}"/>` +
      `<polygon points="${s(hx + 3)},76.5 ${s(hx + 3 + DX)},${s(76.5 + DY)} ${s(hx + 3 + DX)},${s(G + DY)} ${s(hx + 3)},84" fill="${hedge[1]}"/>` +
      `<rect x="${s(hx - 3)}" y="76.5" width="6" height="7.5" fill="${hedge[1]}"/>` +
      `<circle cx="${s(hx + DX * 0.3)}" cy="${s(76 + DY * 0.3)}" r="1" fill="#ff8fc0"/><circle cx="${s(hx + DX * 0.7)}" cy="${s(76 + DY * 0.7)}" r="1" fill="#ffe066"/>`
  }
  // the start line and the checkered finish line, slanted across the lanes, and the finish flag
  const line = (x: number, fill: string, w: number) =>
    `<polygon points="${s(x - w / 2)},84 ${s(x + w / 2)},84 ${s(x + w / 2 + DX)},${s(G + DY - 1)} ${s(x - w / 2 + DX)},${s(G + DY - 1)}" fill="${fill}"/>`
  back += line(START, '#ffffff', 2.6).replace('/>', ' opacity="0.8"/>') + line(FINISH, 'url(#rcheck)', 5)
  const px = FINISH + DX + 4
  const py = G + DY - 1
  back +=
    `<path d="M${s(px)},${s(py)} V${s(py - 30)}" stroke="#e8e0f0" stroke-width="1.2"/>` +
    `<g transform="translate(${s(px)},${s(py - 30)})"><g><animateTransform attributeName="transform" type="skewY" values="0;-10;0;8;0" dur="1.1s" repeatCount="indefinite"/><rect x="0" y="0" width="11" height="7" fill="url(#rcheck)" stroke="#2a1838" stroke-width="0.3"/></g></g>` +
    `<circle cx="${s(px)}" cy="${s(py - 30.5)}" r="1.2" fill="#ffd43b"/>`

  // ---- the starter: a friendly omochao by the start line, flag up for 3, 2, 1, swept down for GO
  const ox = 24
  const oy = 62
  const flag =
    `<g transform="translate(${ox + 4},${oy - 4})"><g>${track(
      'animateTransform',
      'transform',
      [[0, '-25'], [GO - 0.05, '-25'], [GO + 0.12, '70'], [GO + 1.4, '70'], [GO + 1.9, '0']],
      T,
      ' type="rotate"',
    )}<path d="M0,0 V-16" stroke="#8a6a4a" stroke-width="1"/><rect x="0" y="-16" width="9" height="6" fill="#ff5a7a" stroke="#2a1838" stroke-width="0.3"/></g></g>`
  const starter =
    `<g transform="translate(${ox},${oy})"><g><animateTransform attributeName="transform" type="translate" values="0 0;0 -2;0 0" dur="1.2s" repeatCount="indefinite"/><g transform="scale(0.62)">${plainOmochao()}</g></g></g>` + flag

  // ---- the racers, back lane first, each followed by the water over it in the ponds
  const runnersSvg = r.runners
    .slice()
    .sort((a, b) => b.lane - a.lane)
    .map(x => {
      const k = x.lane
      const y0 = gy(k)
      const sc = LANE_SCALE[k] ?? 0.92
      const look = looks[x.id] ?? FALLBACK(x.id, x.name)
      const art = chaoArt(look)
      const xs = xOf(0, k)
      const x0 = from0[x.id] ?? xs + 50
      const pos: Key[] = [
        [0, `${s(x0)} ${y0}`],
        [WALK_IN, `${s(xs)} ${y0}`],
      ]
      const rot: Key[] = [[0, '0']]
      const wing: Key[] = [[0, '0']]
      let tilt = 0
      for (const g of x.segs) {
        if (g.leg === 'wait') {
          pos.push([T_of(g.t1), `${s(xs)} ${y0}`])
          continue
        }
        if (g.leg === 'trip') {
          const p = `${s(xOf(g.d0, k))} ${s(y0 + liftAt(g.d0))}`
          const a = T_of(g.t0)
          const b = T_of(g.t1)
          pos.push([a, p], [b, p])
          rot.push([a, '0'], [a + 0.12, '80'], [b - 0.15, '80'], [b, '0'])
          fx.push(flash(`<g><animateTransform attributeName="transform" type="rotate" values="0;360" dur="0.6s" repeatCount="indefinite"/>${star4(2.4, '#ffe066')}<g transform="translate(5,1)">${star4(1.8, '#ffffff')}</g></g>`, xOf(g.d0, k) + 14 * sc, y0 - 6 * sc, a + 0.1, b - a))
          fx.push(flash(`<circle r="3.5" fill="#d8c8b0" opacity="0.7"/><circle cx="4" cy="-1" r="2.5" fill="#e8dcc8" opacity="0.7"/>`, xOf(g.d0, k) + 10, y0 - 1, a + 0.08, 0.5))
          continue
        }
        for (const d of [g.d0, ...bends(g.d0, g.d1), g.d1]) {
          const rt = g.d1 === g.d0 ? g.t0 : g.t0 + ((g.t1 - g.t0) * (d - g.d0)) / (g.d1 - g.d0)
          pos.push([T_of(rt), `${s(xOf(d, k))} ${s(y0 + liftAt(d))}`])
        }
        const want = g.leg === 'climb' ? 14 : g.leg === 'glide' ? 6 : 0
        if (want !== tilt) {
          rot.push([T_of(g.t0), String(tilt)], [T_of(g.t0) + 0.12, String(want)])
          tilt = want
        }
        wing.push([T_of(g.t0), g.leg === 'glide' ? '1' : '0'])
      }
      if (tilt) rot.push([T_of(x.time), String(tilt)], [T_of(x.time) + 0.12, '0'])
      wing.push([T_of(x.time), '0'])
      // past the line it slows to a stop at its place's spot; the winner hops for joy at the end
      const stop = STOPS[x.place - 1] ?? 794
      const stopT = stopAt(x)
      pos.push([stopT, `${stop} ${y0}`])
      if (x.place === 1)
        for (let j = 0; j < 3; j++) {
          const t0 = Math.max(stopT, tEnd - 0.2) + 0.15 + j * 0.5
          pos.push([t0, `${stop} ${y0}`], [t0 + 0.2, `${stop} ${y0 - 7}`], [t0 + 0.4, `${stop} ${y0}`])
        }

      // dust behind the runners, splashes into and out of the ponds, rings while swimming
      for (const g of x.segs) {
        if (g.leg !== 'run') continue
        for (let rt = g.t0 + 0.2; rt < g.t1; rt += 1.1 / play) {
          const d = dAt(x, rt)
          if (liftAt(d) < -2) continue
          fx.push(rise(`<circle r="2.2" fill="#e8dcc8" opacity="0.6"/><circle cx="-2.5" cy="0.5" r="1.6" fill="#f2ead8" opacity="0.6"/>`, xOf(d, k) - 9 * sc, y0 - 1.5, T_of(rt), 0.7, -3))
        }
      }
      for (const g of ranges) {
        if (g.leg !== 'swim') continue
        for (const d of [g.d0 + 4, g.d1 - 4]) {
          const t = T_of(tAt(x, d))
          fx.push(
            flash(
              `<path d="M-5,0 Q-6,-6 -3,-8 M0,-1 Q0,-8 1,-10 M5,0 Q6,-6 3,-8" fill="none" stroke="#e6f8ff" stroke-width="1" stroke-linecap="round"/><circle cx="-6" cy="-9" r="0.9" fill="#e6f8ff"/><circle cx="6" cy="-10" r="0.9" fill="#e6f8ff"/>`,
              xOf(d, k),
              y0 - WET + 2,
              t,
              0.45,
            ),
          )
        }
        const t1 = tAt(x, g.d0 + 10)
        const t2 = tAt(x, g.d1 - 10)
        for (let rt = t1; rt < t2; rt += 0.9 / play)
          fx.push(
            `<g transform="translate(${s(xOf(dAt(x, rt), k) - 4)},${s(y0 - WET + 0.5)})" opacity="0"><animate attributeName="opacity" values="0;0.7;0" begin="${at(T_of(rt))}" dur="0.8s"/><ellipse rx="3" ry="0.9" fill="none" stroke="#e6f8ff" stroke-width="0.6"><animate attributeName="rx" values="3;9" begin="${at(T_of(rt))}" dur="0.8s" fill="freeze"/></ellipse></g>`,
          )
      }
      // GO!: a puff of dust as it sets off
      fx.push(rise(`<circle r="3" fill="#e8dcc8" opacity="0.7"/><circle cx="-3.5" cy="0.5" r="2.2" fill="#f2ead8" opacity="0.7"/>`, xs - 8, y0 - 1, T_of(x.segs[0]?.t1 ?? 0), 0.8, -4))

      const wingFill = look.kind === 'dark' ? '#b9a0d8' : look.kind === 'hero' ? '#ffffff' : '#eef6ff'
      const glideWings =
        `<g opacity="0">${track('animate', 'opacity', wing, T, ' calcMode="discrete"')}<g transform="scale(${chaoSize(look)})"><g><animateTransform attributeName="transform" type="rotate" values="0 -3 -10;-24 -3 -10;0 -3 -10" dur="0.32s" repeatCount="indefinite"/>` +
        `<path d="M-3,-12 Q-12,-24 -19,-18 Q-14,-16 -16,-11 Q-10,-12 -12,-7 Q-7,-9 -3,-8 Z" fill="${wingFill}" stroke="#9cc8ea" stroke-width="0.8" stroke-linejoin="round"/></g></g></g>`
      const face = x0 > xs ? track('animateTransform', 'transform', [[0, '-1 1'], [WALK_IN, '1 1']], T, ' type="scale" calcMode="discrete"') : ''
      const bob = `<animateTransform attributeName="transform" type="translate" values="0 0;0 -1.3;0 0" dur="0.34s" begin="-${s(k * 0.09)}s" repeatCount="indefinite"/>`
      const shadowKeys = pos.map(([t, v]): Key => [t, `${v.split(' ')[0]} ${y0}`])
      const shadow = `<g>${track('animateTransform', 'transform', shadowKeys, T, ' type="translate"')}<ellipse cx="1" cy="0" rx="${s(9 * sc)}" ry="1.7" fill="#1a1030" opacity="0.22"/></g>`
      const body =
        `<g>${track('animateTransform', 'transform', pos, T, ' type="translate"')}<g transform="scale(${sc})"><g>${face}<g>${track('animateTransform', 'transform', rot, T, ' type="rotate"')}` +
        `<g>${bob}${glideWings}${art.body}</g></g></g></g></g>`
      // the water in front of this lane's swimmers
      let lips = ''
      for (const g of ranges) {
        if (g.leg !== 'swim') continue
        const a = xOf(g.d0, k) - 5
        const b = xOf(g.d1, k) + 5
        const top = y0 - WET
        const waves = Math.max(1, Math.round((b - a) / 8))
        const w = (b - a) / waves
        let path = `M${s(a)},${s(top)} q${s(w / 2)},-1.6 ${s(w)},0`
        for (let j = 1; j < waves; j++) path += ` t${s(w)},0`
        lips += `<path d="${path} L${s(b)},${s(y0 + 6)} L${s(a)},${s(y0 + 6)} Z" fill="url(#rwater)" opacity="0.88"/><path d="${path}" fill="none" stroke="#e6f8ff" stroke-width="0.7" opacity="0.9"/>`
      }
      return shadow + body + lips
    })
    .join('')

  // ---- the header, the countdown and the stopwatch where the title was
  const head =
    // it makes way for the countdown
    `<g opacity="0">${track('animate', 'opacity', [[0.2, '0'], [0.5, '1'], [WALK_IN + HEADER - 0.3, '1'], [WALK_IN + HEADER - 0.05, '0']], T)}` +
    `<rect x="${MID - 120}" y="${s(23.5)}" width="9" height="6" fill="url(#rcheck)" stroke="#2a1838" stroke-width="0.4"/><rect x="${MID + 111}" y="${s(23.5)}" width="9" height="6" fill="url(#rcheck)" stroke="#2a1838" stroke-width="0.4"/>` +
    `<text x="${MID}" y="30" font-size="10" font-weight="bold" font-family="sans-serif" text-anchor="middle" fill="#ffe8a8" stroke="#2a1838" stroke-width="1.5" paint-order="stroke">${r.wild ? 'Surprise race!' : 'Chao Race:'} ${course.name}` +
    `<tspan x="${MID}" y="40" font-size="7" font-weight="normal" fill="#d9ccff">${course.blurb}</tspan></text></g>`
  const count = ['3', '2', '1']
    .map((c, j) => pop(txt(c, 17, '#ffffff'), MID, 44, WALK_IN + HEADER + j * BEAT, BEAT - 0.05))
    .join('') + pop(txt('GO!', 17, '#7ee081'), MID, 44, GO, 0.75)
  let clock = ''
  const shown = Math.floor(maxTime)
  for (let sec = 0; sec <= shown; sec++) {
    const t = T_of(sec)
    const u = Math.min(T_of(sec + 1), T_of(maxTime))
    if (t >= u) continue
    clock += during(`<text x="${MID + 4}" y="30" font-size="9" font-weight="bold" font-family="sans-serif" fill="#ffffff" stroke="#2a1838" stroke-width="1.4" paint-order="stroke">${sec} s</text>`, t, u)
  }
  if (clock)
    clock =
      `<g opacity="0">${track('animate', 'opacity', [[GO + 0.6, '0'], [GO + 0.9, '1'], [T_of(maxTime), '1'], [T_of(maxTime) + 0.2, '0']], T)}` +
      `<g transform="translate(${MID - 6},26.5)"><circle r="4" fill="#ffffff" stroke="#2a1838" stroke-width="0.8"/><rect x="-1" y="-6.2" width="2" height="1.6" fill="#2a1838"/>` +
      `<path d="M0,0 V-2.8" stroke="#ff5a7a" stroke-width="0.8" stroke-linecap="round"><animateTransform attributeName="transform" type="rotate" values="0;360" dur="1s" repeatCount="indefinite"/></path></g>${clock}</g>`

  // ---- the first one over the line: confetti
  for (let j = 0; j < 28; j++) {
    const ang = (j / 28) * Math.PI * 2
    const sx = FINISH + DX / 2 + Math.cos(ang) * 4
    const ex = FINISH + DX / 2 + Math.cos(ang) * (40 + ((j * 37) % 30))
    const ey = 84 + ((j * 13) % 10)
    const top = 30 - ((j * 17) % 12)
    const c = CONFETTI[j % CONFETTI.length]!
    const d = 1.8 + ((j * 7) % 8) / 10
    const t = winAt + (j % 4) * 0.05
    fx.push(
      `<g opacity="0"><set attributeName="opacity" to="1" begin="${at(t)}" dur="${s(d)}s"/><g><animateTransform attributeName="transform" type="translate" values="${s(sx)} 40;${s((sx + ex) / 2)} ${top};${s(ex)} ${ey}" keyTimes="0;0.3;1" begin="${at(t)}" dur="${s(d)}s" fill="freeze"/>` +
        `<rect x="-1.2" y="-0.7" width="2.4" height="1.4" fill="${c}"><animateTransform attributeName="transform" type="rotate" values="0;360" dur="${s(0.5 + (j % 3) * 0.2)}s" repeatCount="indefinite"/></rect></g></g>`,
    )
  }

  // ---- the ending: medals over the first three (a star for a lone runner), the result and any record
  for (const x of order) {
    const sc = LANE_SCALE[x.lane] ?? 0.92
    const hx = STOPS[x.place - 1] ?? 794
    const hy = gy(x.lane) - 44 * sc - 4
    const t = Math.max(stopAt(x), tEnd - 0.4)
    if (!many) fx.push(showFrom(`<g transform="translate(${hx},${s(hy)})">${star4(4.5, '#ffd43b')}${star4(2, '#fff8d6')}</g>`, t))
    else if (x.place <= 3) {
      const p = x.place - 1
      fx.push(
        showFrom(
          `<g transform="translate(${hx},${s(hy)})"><g><animateTransform attributeName="transform" type="scale" values="0.2;1.25;1" begin="${at(t)}" dur="0.35s" fill="freeze"/>` +
            `<path d="M-2.4,-5.5 L0,-1.5 L2.4,-5.5" fill="none" stroke="${p === 0 ? '#ff5a7a' : '#7ea6ff'}" stroke-width="1.6"/>` +
            `<circle r="3.6" fill="${MEDAL_FILL[p]}" stroke="${MEDAL_EDGE[p]}" stroke-width="0.6"/>` +
            `<text y="2" font-size="5" font-weight="bold" font-family="sans-serif" text-anchor="middle" fill="${MEDAL_EDGE[p]}">${p + 1}</text></g></g>`,
          t,
        ),
      )
    }
    if (x.place === 1) fx.push(rise(`<text font-size="8" font-family="sans-serif" text-anchor="middle" fill="#ff8fc0">♥</text>`, hx - 6, hy - 1, tEnd + 0.2, 1.4, -10), rise(`<text font-size="6" font-family="sans-serif" text-anchor="middle" fill="#ffb3d9">♥</text>`, hx + 7, hy + 2, tEnd + 0.6, 1.4, -10))
  }
  const rec = r.record ? `<tspan fill="#7ee0ff"> ★ new record</tspan>` : ''
  const result = many
    ? `<text x="${MID}" y="30" font-size="11" font-weight="bold" font-family="sans-serif" text-anchor="middle" fill="#ffd43b" stroke="#2a1838" stroke-width="1.6" paint-order="stroke">${win.name} wins! ${tenths(win.time).toFixed(1)} s${rec}` +
      `<tspan x="${MID}" y="41" font-size="7.5" fill="#ffe8f4">${order
        .slice(1)
        .map(x => `${PLACE[x.place - 1]} ${x.name} ${tenths(x.time).toFixed(1)} s`)
        .join('  ·  ')}</tspan></text>`
    : `<text x="${MID}" y="30" font-size="11" font-weight="bold" font-family="sans-serif" text-anchor="middle" fill="#ffd43b" stroke="#2a1838" stroke-width="1.6" paint-order="stroke">${win.name} runs the ${course.name} in ${tenths(win.time).toFixed(1)} s${rec}</text>`
  fx.push(showFrom(result, T_of(maxTime) + 0.25))

  const defs =
    `<defs><pattern id="rcheck" width="3" height="3" patternUnits="userSpaceOnUse"><rect width="3" height="3" fill="#ffffff"/><rect width="1.5" height="1.5" fill="#2a1838"/><rect x="1.5" y="1.5" width="1.5" height="1.5" fill="#2a1838"/></pattern>` +
    `<linearGradient id="rwater" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${water[0]}"/><stop offset="1" stop-color="${water[1]}"/></linearGradient></defs>`
  const src =
    `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="84" viewBox="0 0 900 84"><desc>race ${label}</desc>${defs}` +
    `<g opacity="0">${track('animate', 'opacity', [[0, '0'], [0.4, '1'], [T - FADE, '1'], [T, '0']], T)}` +
    back + starter + runnersSvg + fx.join('') + head + count + clock +
    `</g></svg>`
  return { src, total: T }
}
