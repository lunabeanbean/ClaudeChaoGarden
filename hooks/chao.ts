import { classGear } from './gear'
import type { ChaoLook, ChaoParts, ChaoType, ClassName, FruitColor, GardenLook, GardenView, TreeKind, TreeLevel, TreeLook } from '../types'

// The chao garden: up to MAX_CHAO chao living in the band, growing from what happens in chats.
// Saved in $.store: 'garden' holds the garden-wide record and each chao has its own key 'chao:<id>',
// so two open chats rarely overwrite each other.

export const MAX_CHAO = 8
// One tree for the whole garden, whatever chat you are in: each message gives the hungriest chao a snack from it
// (+1 Stamina) while snacks are left; once it is full grown and bare, a new seed is planted. (The coloured fruit that
// grow the stats are ripened by Claude's work: see "Fruit" below.)
export const TREE_FRUITS = 12
// An egg hatches after this many messages, or this long after it was laid, whichever comes first.
export const HATCH_WARMTH = 8
export const HATCH_TIME = 2 * 60 * 60 * 1000
// The life cycle runs on garden days (days you open a chat). A baby becomes a child a third of the
// way through its first chao year (or once well fed); at one chao year a child that has eaten enough
// makes its cocoon, which opens after COCOON_TIME or when a new chat opens.
export const CHILD_FOOD = 60
export const COCOON_FOOD = 50
const COCOON_TIME = 30 * 60 * 1000
// Garden days per chao year: /chao pace slow|normal|fast.
export const PACES = { slow: 5, normal: 3, fast: 1 } as const
export type Pace = keyof typeof PACES

export type Stage = ChaoLook['stage']
const STAGE_LIST: Stage[] = ['egg', 'baby', 'child', 'cocoon', 'adult']

export type ChaoStats = { swim: number; fly: number; run: number; power: number; stamina: number }
const STAT_KEYS: (keyof ChaoStats)[] = ['swim', 'fly', 'run', 'power', 'stamina']

// The old type compass (two sliders, Swim-Fly and Run-Power). No longer used since 0.7.0: types come straight from
// the four stats. The field stays in saves because chats still running 0.6.3 read and write it.
export type Compass = { swimFly: number; runPower: number }

export type Color = FruitColor
// The four colours in the order the card lists them.
export const FRUIT_COLORS: Color[] = ['power', 'swim', 'run', 'fly']
const noColor = (): Record<Color, number> => ({ power: 0, swim: 0, run: 0, fly: 0 })

// ---- Fruit knobs ----
// Claude's work ripens coloured fruit; the chao grow their stats by eating them. Each colour has a meter: this much work
// ripens one fruit (runs for red, blue and green, characters of Claude's text for yellow). The start values make all four
// colours ripen about equally often in a typical chat, about one fruit per turn in all, and the meters slowly adapt.
export const METER_START: Record<Color, number> = { power: 16, swim: 10, run: 7, fly: 6000 }
// A web or browser tool run counts as this many characters of talking.
export const WEB_CHARS = 400
// At every turn end the meters' history fades by this much before the turn's work is added.
export const METER_DECAY = 0.995
// The history starts as if this many turns had averaged the start values.
const METER_HISTORY = 200
const startWork = (): Record<Color, number> => ({
  power: (METER_START.power / 4) * METER_HISTORY,
  swim: (METER_START.swim / 4) * METER_HISTORY,
  run: (METER_START.run / 4) * METER_HISTORY,
  fly: (METER_START.fly / 4) * METER_HISTORY,
})
// Coloured fruit a chao tastes before its two favourites form ("babies eat anything").
export const TASTING = 4
// How sharply a chao prefers what it likes (weight = like^PICKY_SHARP x hunger).
export const PICKY_SHARP = 2
// Hunger for fruit grows by this much each turn without one.
export const HUNGER_STEP = 0.3
// After this many turns without a coloured fruit a chao eats any colour, as keenly as a favourite ("too hungry to be picky").
export const TOO_HUNGRY = 12
const HUNGRY_LIKE = 0.5
// What one fruit gives: its own stat, the partner colour's stat (twin trees), each other stat (rainbow trees),
// then +1 to a random other stat `sprinkle` times. Plain and twin give 9 points, rainbow 8 (3 + 4 x 1 + 1).
export const RECIPES = {
  plain: { own: 6, partner: 0, each: 0, sprinkle: 3 },
  twin: { own: 4, partner: 4, each: 0, sprinkle: 1 },
  rainbow: { own: 3, partner: 0, each: 1, sprinkle: 1 },
} as const
// The tree kind: one colour over TREE_ONE of the chat's work grows a plain tree, the top two over TREE_TWO a twin tree,
// anything more mixed a rainbow tree.
export const TREE_ONE = 0.55
export const TREE_TWO = 0.75
// A second type shows once its stat is SECOND_AT of the main type's. Normal when the biggest of the four stats is
// under NORMAL_BELOW of their sum, or they add up to under NEWBORN_SUM.
export const SECOND_AT = 2 / 3
export const NORMAL_BELOW = 0.3
const NEWBORN_SUM = 12
// Ripe fruit waiting for the end of Claude's turn, at most.
export const READY_MAX = 12

export type ChaoSave = {
  id: string
  name: string
  born: number
  lives: number
  parents: string[]
  stage: Stage
  // kept for chats still running the code from before the life cycle
  hatched: boolean
  // garden days lived since hatching
  age: number
  // messages an egg has heard; it hatches at HATCH_WARMTH
  warmth: number
  chats: number
  messages: number
  treats: number
  tools: number
  pets: number
  animals: number
  happiness: number
  hunger: number
  // above 0 leans Hero, below 0 leans Dark; settled into `kind` when it goes into its cocoon
  align: number
  kind?: ChaoLook['kind']
  // the type it evolves into, also settled in the cocoon; when the cocoon was made; its age then
  type?: ChaoType
  cocoonAt?: number
  grownAt?: number
  compass: Compass
  stats: ChaoStats
  parts: ChaoParts
  // how many times each animal was given to it (from 1.6.0; older chao start empty, and an animal it wears counts as
  // given at least once). Given STACK_AT times while one of its pieces is still worn, the animal's skill is on.
  gifts: Record<string, number>
  // the class it found as an adult (from its strongest class stat) and the seed its gear colours come from
  cls?: { main: ClassName; seed: number }
  // coloured fruit eaten (its two favourites are its two most eaten), and the garden turn it last had one
  ate: Record<Color, number>
  lastFruit: number
}

export type GardenSave = {
  ids: string[]
  // the chao that gets Claude's training and the animals from bubbles
  chosen: string
  show: boolean
  // which garden the band shows (/chao visit); older saves have none and show the Neutral one
  view?: GardenView
  // the chao wearing the gold medal from the last race (/chao race); none before the first race with two or more
  champ?: string
  days: number
  lastDay: string
  lastSeen: number
  nextId: number
  pace: Pace
  // Fruit: each colour's progress towards its next fruit (in work: runs, or characters for yellow), ripe fruit
  // waiting for the end of Claude's turn, Claude's turns so far (all chats), the faded totals the meters adapt from, and the
  // last turn's meal (colour and eater).
  ripe: Record<Color, number>
  ready: Color[]
  turns: number
  work: Record<Color, number>
  workTurns: number
  lastMeal: [Color, string][]
}

// The one tree, shared by every chat (store key 'tree', apart from 'garden' so chats still on older code never write
// over it): `grown` counts your messages since it was planted (in any chat), `snacks` are left on it, `kind` settles
// when it is full grown, and `work` is Claude's work in fruit (work / meter per colour) since it was planted, which
// decides that kind. `n` counts the trees.
export type TreeSave = { n: number; grown: number; snacks: number; kind: TreeKind; work: Record<Color, number> }

// The whole garden while one event changes it.
export type Garden = { g: GardenSave; chao: ChaoSave[]; tree: TreeSave }

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

const DAY = 24 * 60 * 60 * 1000

export const freshChao = (id: string, now: number): ChaoSave => ({
  id,
  name: '',
  born: now,
  lives: 1,
  parents: [],
  stage: 'egg',
  hatched: false,
  age: 0,
  warmth: 0,
  chats: 0,
  messages: 0,
  treats: 0,
  tools: 0,
  pets: 0,
  animals: 0,
  happiness: 60,
  hunger: 50,
  align: 0,
  compass: { swimFly: 0, runPower: 0 },
  stats: { swim: 0, fly: 0, run: 0, power: 0, stamina: 0 },
  parts: {},
  gifts: {},
  ate: noColor(),
  lastFruit: 0,
})

const num = (v: unknown, fallback: number) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback)
const colorRecord = (v: unknown, fallback: Record<Color, number>): Record<Color, number> => {
  const o = v && typeof v === 'object' ? (v as Record<string, unknown>) : {}
  return { power: num(o.power, fallback.power), swim: num(o.swim, fallback.swim), run: num(o.run, fallback.run), fly: num(o.fly, fallback.fly) }
}
// Times each animal was given: whole numbers of 0 or more; anything else is dropped.
const giftRecord = (v: unknown): Record<string, number> => {
  const out: Record<string, number> = {}
  if (v && typeof v === 'object') for (const [k, n] of Object.entries(v as Record<string, unknown>)) if (typeof n === 'number' && Number.isFinite(n) && n > 0) out[k] = Math.floor(n)
  return out
}

// Fills in anything an older save lacks. Saves from before the life cycle have no stage: nobody had
// made a cocoon yet, so they are babies or children, and an adult kind settled by the old code is dropped.
// Their age is the garden days since they were born, at most the garden's own age. A chao from before the fruit
// (0.7.0) starts with no coloured fruit eaten, so its favourites form fresh; its hunger for fruit counts from `turns`.
export const normalizeChao = (v: unknown, id: string, now: number, gardenDays = 0, turns = 0): ChaoSave => {
  const f = freshChao(id, now)
  f.lastFruit = turns
  if (!v || typeof v !== 'object') return f
  const o = v as Partial<ChaoSave>
  const c: ChaoSave = {
    ...f,
    ...o,
    id,
    stats: { ...f.stats, ...(o.stats ?? {}) },
    compass: { ...f.compass, ...(o.compass ?? {}) },
    parts: { ...(o.parts ?? {}) },
    gifts: giftRecord(o.gifts),
    ate: colorRecord(o.ate, noColor()),
    lastFruit: num(o.lastFruit, turns),
  }
  if (!STAGE_LIST.includes(o.stage as Stage)) {
    c.stage = !c.hatched ? 'egg' : growth(c) >= CHILD_FOOD ? 'child' : 'baby'
    delete c.kind
  }
  // an egg hatched by a chat still running the older code
  if (c.stage === 'egg' && c.hatched) c.stage = 'baby'
  c.hatched = c.stage !== 'egg'
  if (typeof o.age !== 'number') c.age = c.hatched ? Math.max(0, Math.min(gardenDays, Math.floor((now - c.born) / DAY))) : 0
  return c
}

export const freshGarden = (now: number): GardenSave => ({
  ids: [],
  chosen: '',
  show: true,
  days: 0,
  lastDay: '',
  lastSeen: now,
  nextId: 1,
  pace: 'normal',
  ripe: noColor(),
  ready: [],
  turns: 0,
  // as if METER_HISTORY turns had averaged the start values, so the meters don't jump on day one
  work: startWork(),
  workTurns: METER_HISTORY,
  lastMeal: [],
})

export const normalizeGarden = (v: unknown, now: number): GardenSave => {
  const f = freshGarden(now)
  if (!v || typeof v !== 'object') return f
  const o = v as Partial<GardenSave>
  const isColor = (x: unknown): x is Color => typeof x === 'string' && (FRUIT_COLORS as string[]).includes(x)
  return {
    ...f,
    ...o,
    ids: Array.isArray(o.ids) ? o.ids.map(String) : [],
    view: o.view === 'dark' || o.view === 'light' ? o.view : 'neutral',
    pace: o.pace && o.pace in PACES ? o.pace : 'normal',
    ripe: colorRecord(o.ripe, f.ripe),
    ready: Array.isArray(o.ready) ? o.ready.filter(isColor).slice(0, READY_MAX) : [],
    turns: num(o.turns, 0),
    work: colorRecord(o.work, f.work),
    workTurns: num(o.workTurns, f.workTurns) > 0 ? num(o.workTurns, f.workTurns) : f.workTurns,
    lastMeal: Array.isArray(o.lastMeal) ? o.lastMeal.filter(m => Array.isArray(m) && isColor(m[0])).map(m => [m[0], String(m[1])] as [Color, string]) : [],
  }
}

export const eatenOf = (c: ChaoSave) => FRUIT_COLORS.reduce((a, k) => a + (c.ate?.[k] ?? 0), 0)

// Food so far, for growing up: snacks, treats, pets, animals, coloured fruit (and the old tool runs, which no longer rise).
export const growth = (c: ChaoSave) => c.messages + c.treats * 3 + c.pets + c.animals * 3 + Math.floor(c.tools / 3) + eatenOf(c)

export const stageOf = (c: ChaoSave): Stage => c.stage

// Chao years lived, from garden days and the garden's pace.
export const yearsOf = (gd: Garden, c: ChaoSave) => c.age / PACES[gd.g.pace]

export const leaning = (align: number): ChaoLook['kind'] => (align >= 30 ? 'hero' : align <= -30 ? 'dark' : 'neutral')

// ---- Types, straight from the four stats (no push and pull: every main + second pair is possible) ----
const FOUR: Color[] = ['swim', 'fly', 'run', 'power']
const ranked = (c: ChaoSave) => FOUR.map(k => [k, c.stats[k]] as [Color, number]).sort((a, b) => b[1] - a[1])

// The type its stats point to: the biggest of Swim, Fly, Run and Power, or Normal while they are small (a newborn)
// or even (the biggest under NORMAL_BELOW of their sum).
export const typeOf = (c: ChaoSave): ChaoType => {
  const r = ranked(c)
  const top = r[0] as [Color, number]
  const sum = r.reduce((a, x) => a + x[1], 0)
  return sum < NEWBORN_SUM || top[1] < NORMAL_BELOW * sum ? 'normal' : top[0]
}

// The second type: the next biggest of the four once it reaches SECOND_AT of the main type's own stat. An adult's
// (or cocoon's) main type is the one it settled in its cocoon (say it settled Swim with Swim 620 and Power 1019: Power
// shows on top); a settled Normal shows whatever its stats point to now.
export const secondOf = (c: ChaoSave): ChaoType | undefined => {
  const settled = c.stage === 'adult' || c.stage === 'cocoon'
  const main = settled ? (c.type ?? 'normal') : typeOf(c)
  if (main === 'normal') {
    const now = settled ? typeOf(c) : 'normal'
    return now === 'normal' ? undefined : now
  }
  const next = ranked(c).find(([k]) => k !== main)
  return next && next[1] > 0 && next[1] >= SECOND_AT * c.stats[main] ? next[0] : undefined
}

const NAMES = ['Mochi', 'Pip', 'Bun', 'Puff', 'Mimi', 'Tofu', 'Nova', 'Kiki', 'Peach', 'Sugar', 'Momo', 'Pudding', 'Cocoa', 'Bubbles', 'Taffy', 'Sprout']

// Up to `n` cute names no chao in the garden has yet, in random order.
export const freeNames = (gd: Garden, n: number) => {
  const used = new Set(gd.chao.map(o => o.name.toLowerCase()))
  const free = NAMES.filter(x => !used.has(x.toLowerCase()))
  for (let i = free.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const swap = free[i] as string
    free[i] = free[j] as string
    free[j] = swap
  }
  return free.slice(0, n)
}

// Hatched and awake: eggs and cocoons don't eat or train.
export const active = (c: ChaoSave) => c.stage === 'baby' || c.stage === 'child' || c.stage === 'adult'

const hatch = (gd: Garden, c: ChaoSave) => {
  c.stage = 'baby'
  c.hatched = true
  c.age = 0
  c.name = freeNames(gd, 1)[0] ?? `Chao ${c.id.slice(1)}`
  c.lastFruit = gd.g.turns
}

// Into the cocoon: its alignment and type are decided the moment it goes in.
const enterCocoon = (c: ChaoSave, now: number) => {
  c.stage = 'cocoon'
  c.cocoonAt = now
  c.kind = leaning(c.align)
  c.type = typeOf(c)
}

const emerge = (c: ChaoSave) => {
  c.stage = 'adult'
  c.grownAt = c.age
  delete c.cocoonAt
}

// Moves each chao along its life when it is due. Runs after every change to the garden.
export const tick = (gd: Garden, now: number) => {
  for (const c of gd.chao) {
    if (c.stage === 'egg' && (c.warmth >= HATCH_WARMTH || now - c.born >= HATCH_TIME)) hatch(gd, c)
    const years = yearsOf(gd, c)
    if (c.stage === 'baby' && (years >= 1 / 3 || growth(c) >= CHILD_FOOD)) c.stage = 'child'
    if (c.stage === 'child' && years >= 1 && growth(c) >= COCOON_FOOD) enterCocoon(c, now)
    if (c.stage === 'cocoon' && now - (c.cocoonAt ?? now) >= COCOON_TIME) emerge(c)
    if (c.stage === 'adult' && !c.cls) awaken(c, (c.age - (c.grownAt ?? c.age)) / PACES[gd.g.pace])
  }
}

// ---- Classes ----
// A grown-up chao finds its class: after CLASS_YEARS of chao years as an adult, the strongest of the four class stats
// picks it (Swim -> Healer, Power -> Warrior, Run -> Ranger, Fly -> Wizard), once that stat has CLASS_MIN_XP.
// The second-strongest stat gives a second class (extra skills); the other stats give passives.
export const CLASS_YEARS = 0.5
export const CLASS_MIN_XP = 16

export const CLASSES: Record<ClassName, { stat: keyof ChaoStats; name: string; item: string; skills: [number, string][] }> = {
  warrior: { stat: 'power', name: 'Warrior', item: 'sword and shield', skills: [[1, 'Slash'], [6, 'Guard'], [14, 'Whirlwind']] },
  wizard: { stat: 'fly', name: 'Wizard', item: 'hat and wand', skills: [[1, 'Spark'], [6, 'Starfire'], [14, 'Meteor']] },
  ranger: { stat: 'run', name: 'Ranger', item: 'bow and quiver', skills: [[1, 'Quick Shot'], [6, 'Volley'], [14, 'Piercing Arrow']] },
  healer: { stat: 'swim', name: 'Healer (bard)', item: 'lyre', skills: [[1, 'Soothe'], [6, 'Lullaby'], [14, 'Healing Chorus']] },
}
const CLASS_LIST = Object.keys(CLASSES) as ClassName[]

// Passives from the stats a chao has, whatever its class (shown from level 5).
export const PASSIVES: Record<keyof ChaoStats, string> = {
  swim: 'Soothing Voice',
  fly: 'Light Step',
  run: 'Quick Feet',
  power: 'Strong Arms',
  stamina: 'Hearty',
}

// The four classes, strongest stat first.
export const classRanking = (c: ChaoSave): [ClassName, number][] =>
  CLASS_LIST.map(k => [k, c.stats[CLASSES[k].stat]] as [ClassName, number]).sort((a, b) => b[1] - a[1])

const awaken = (c: ChaoSave, adultYears: number) => {
  if (adultYears < CLASS_YEARS) return
  const top = classRanking(c)[0]
  if (top && top[1] >= CLASS_MIN_XP) c.cls = { main: top[0], seed: 1 + Math.floor(Math.random() * 99999) }
}

// Gear grows with the class stat's level: novice, adept at level 8, master at level 16.
export const classTier = (c: ChaoSave): 0 | 1 | 2 => {
  if (!c.cls) return 0
  const lv = level(c.stats[CLASSES[c.cls.main].stat])
  return lv >= 16 ? 2 : lv >= 8 ? 1 : 0
}

// The second class: the next-strongest class stat, once it has some training.
export const secondClass = (c: ChaoSave): ClassName | undefined => {
  if (!c.cls) return undefined
  const next = classRanking(c).find(([k]) => k !== c.cls?.main)
  return next && next[1] >= 9 ? next[0] : undefined
}

// The lines the card shows: class, its skills (by the class stat's level), the second class and the passives.
export const classLines = (c: ChaoSave): string[] => {
  if (c.stage !== 'adult') return []
  if (!c.cls) return [`Class: not found yet (after ${CLASS_YEARS} chao year as an adult, from its strongest class stat)`]
  const cl = CLASSES[c.cls.main]
  const lv = level(c.stats[cl.stat])
  const tier = ['Novice', 'Adept', 'Master'][classTier(c)]
  const skills = cl.skills.filter(([need]) => lv >= need).map(([, n]) => n)
  const out = [`Class: ${cl.name} Lv ${lv} (${tier} ${cl.item}) · skills: ${skills.join(', ') || 'none yet'}`]
  const second = secondClass(c)
  if (second) {
    const sc = CLASSES[second]
    const slv = level(c.stats[sc.stat])
    // the best one it has unlocked: the one fights lend it
    out.push(`Second class: ${sc.name} Lv ${slv} · extra skill: ${sc.skills.filter(([need]) => slv >= need).slice(-1)[0]?.[1] ?? 'none yet'}`)
  }
  const pass = (Object.keys(PASSIVES) as (keyof ChaoStats)[]).filter(k => level(c.stats[k]) >= 5 && !(k === cl.stat)).map(k => PASSIVES[k])
  if (pass.length) out.push(`Passives: ${pass.join(', ')}`)
  return out
}

// ---- Traits: temperament and animals ----
// Two more sources of fight passives and skills, apart from the four stats its class comes from: its temperament
// (Hero, Dark or Neutral) and the animal pieces it wears. Nothing here is rolled: all of it follows from what the card
// shows. The numbers the fights use sit beside the words the card says (battle.ts reads both from here).

export type Temperament = ChaoLook['kind']
export type Trait = { name: string; text: string }

// The temperament is the Hero / Dark / Neutral it shows: an adult's (and a cocoon's) was fixed when it made its cocoon,
// a baby's or child's follows its lean until then. How strong it is comes from its lean now (`align`, on the card, still
// moving with when you chat and pet): a Hero at +60 or more, a Dark at -60 or less, or a Neutral within 15 of zero also
// knows its signature skill.
export const STRONG_LEAN = 60
export const CALM_LEAN = 15
export const temperamentOf = (c: ChaoSave): Temperament => (c.stage === 'adult' || c.stage === 'cocoon' ? (c.kind ?? 'neutral') : leaning(c.align))
export const strongLean = (c: ChaoSave) => {
  const t = temperamentOf(c)
  return t === 'hero' ? c.align >= STRONG_LEAN : t === 'dark' ? c.align <= -STRONG_LEAN : Math.abs(c.align) <= CALM_LEAN
}

export const TEMPERAMENTS: Record<Temperament, { icon: string; name: string; passive: Trait; skill: Trait; need: string }> = {
  hero: {
    icon: '☀',
    name: 'Hero',
    passive: { name: 'Warm Heart', text: 'the whole team starts each fight with Regen' },
    skill: { name: 'Rally', text: 'heals the team a little, clears bad effects and gets everyone moving sooner' },
    need: `a lean of +${STRONG_LEAN} or more`,
  },
  dark: {
    icon: '☾',
    name: 'Dark',
    passive: { name: 'Sharp Edge', text: '+10% crit chance' },
    skill: { name: 'Shadow Bite', text: 'a shadowy bite that crits easily, and a critical bite sets the omochao burning' },
    need: `a lean of -${STRONG_LEAN} or less`,
  },
  neutral: {
    icon: '✦',
    name: 'Neutral',
    passive: { name: 'Adaptable', text: 'after its first hit from the omochao (or from a bug), it takes 10% less from that one' },
    skill: { name: 'Mimic', text: 'copies the last special move a teammate used, even a Meteor' },
    need: `a lean between -${CALM_LEAN} and +${CALM_LEAN}`,
  },
}

// Animals in fights. One piece worn gives its small buff, two pieces worn its passive, and once that animal has been
// given STACK_AT times its skill too, as long as at least one of its pieces is still on. A new animal's piece can push an
// old one off (and ears and horns push each other off), so what a chao knows changes with what it wears.
// `buff` is what fights add: hp, atk and heal are fractions (0.08 = +8%), def and spd points, crit and dodge percent.
export const STACK_AT = 3
export type Buff = Partial<Record<'hp' | 'atk' | 'heal' | 'def' | 'spd' | 'crit' | 'dodge', number>>
export const ANIMAL_TRAITS: Record<string, { name: string; buff: Trait & { add: Buff }; passive: Trait; skill: Trait }> = {
  raccoon: {
    name: 'Raccoon',
    buff: { name: 'Slippery', text: '+4% dodge', add: { dodge: 4 } },
    passive: { name: 'Sneaky', text: 'after it dodges, it gets its next move sooner' },
    skill: { name: 'Swipe', text: 'a quick paw that may snatch an extra trophy' },
  },
  penguin: {
    name: 'Penguin',
    buff: { name: 'Sturdy', text: '+1 defence', add: { def: 1 } },
    passive: { name: 'Thick Down', text: "takes 15% less from the omochao's big wound-up move" },
    skill: { name: 'Belly Slide', text: 'slides into the omochao and slows it' },
  },
  rabbit: {
    name: 'Rabbit',
    buff: { name: 'Springy', text: '+2 speed', add: { spd: 2 } },
    passive: { name: 'Head Start', text: 'starts each fight half way to its first move' },
    skill: { name: 'Hop Strike', text: 'a quick hop and kick that gets its next move sooner' },
  },
  bear: {
    name: 'Bear',
    buff: { name: 'Big Hearted', text: '+8% HP', add: { hp: 0.08 } },
    passive: { name: 'Second Wind', text: 'once a fight, when under a third of its HP, it gets Regen' },
    skill: { name: 'Bear Hug', text: 'a squeeze that holds the omochao still for a turn' },
  },
  tiger: {
    name: 'Tiger',
    buff: { name: 'Keen Eye', text: '+5% crit chance', add: { crit: 5 } },
    passive: { name: 'Finisher', text: 'hits 15% harder on a foe under half its HP' },
    skill: { name: 'Pounce', text: 'a big leap: 1.6x damage' },
  },
  sheep: {
    name: 'Sheep',
    buff: { name: 'Fluffy', text: '+4% HP and +1 defence', add: { hp: 0.04, def: 1 } },
    passive: { name: 'Woolly Coat', text: 'bad effects on it wear off a turn sooner' },
    skill: { name: 'Counting Sheep', text: 'sends the omochao to sleep for a turn' },
  },
  parrot: {
    name: 'Parrot',
    buff: { name: 'Sweet Voice', text: '+12% healing', add: { heal: 0.12 } },
    passive: { name: 'Bright Song', text: "while it is still up, the whole team's heals are 15% bigger" },
    skill: { name: 'Squawk', text: 'a cheerful squawk that heals the team a little' },
  },
  boar: {
    name: 'Boar',
    buff: { name: 'Brawny', text: '+8% attack', add: { atk: 0.08 } },
    passive: { name: 'Tusks', text: 'an omochao or bug that hits it takes a little damage back' },
    skill: { name: 'Charge', text: 'a heavy run that goes straight through defence' },
  },
}

const SPOTS: (keyof ChaoParts)[] = ['tail', 'ears', 'horns', 'forehead', 'face', 'feet']

// What each worn animal does for it: the spots it covers, how many times that animal was given, and which tiers are on.
export type AnimalTier = { animal: string; spots: (keyof ChaoParts)[]; given: number; buff: boolean; passive: boolean; skill: boolean }
export const animalTiers = (c: ChaoSave): AnimalTier[] => {
  const by: Record<string, (keyof ChaoParts)[]> = {}
  for (const spot of SPOTS) {
    const a = c.parts?.[spot]
    if (a && ANIMAL_TRAITS[a]) (by[a] ??= []).push(spot)
  }
  return Object.entries(by)
    .map(([animal, spots]) => {
      const given = Math.max(c.gifts?.[animal] ?? 0, 1)
      return { animal, spots, given, buff: true, passive: spots.length >= 2, skill: given >= STACK_AT }
    })
    .sort((a, b) => b.spots.length - a.spots.length || b.given - a.given || a.animal.localeCompare(b.animal))
}

// Everything a chao brings to a fight beyond its class: its temperament, whether its lean is strong, the passives and
// skills it has from both, and the buffs from what it wears.
export const traitsOf = (c: ChaoSave) => {
  const temper = temperamentOf(c)
  const strong = strongLean(c)
  const animals = animalTiers(c)
  const T = TEMPERAMENTS[temper]
  return {
    temper,
    strong,
    animals,
    passives: [T.passive.name, ...animals.filter(a => a.passive).map(a => ANIMAL_TRAITS[a.animal]!.passive.name)],
    skills: [...(strong ? [T.skill.name] : []), ...animals.filter(a => a.skill).map(a => ANIMAL_TRAITS[a.animal]!.skill.name)],
    buffs: animals.map(a => ANIMAL_TRAITS[a.animal]!.buff.add),
  }
}

const signed = (n: number) => `${n > 0 ? '+' : ''}${n}`

// The card's lines for its temperament and animals: what is on now, and what it is still short of.
export const traitLines = (c: ChaoSave): string[] => {
  const t = traitsOf(c)
  const T = TEMPERAMENTS[t.temper]
  const young = c.stage === 'baby' || c.stage === 'child'
  const out = [
    `${T.icon} Temperament: ${T.name} (lean ${signed(c.align)}${young ? ', it follows the lean until its cocoon' : ''}) · ${T.passive.name} (passive): ${T.passive.text}`,
    `   ${T.skill.name} (skill, at ${T.need}): ${t.strong ? `${T.skill.text} ✓` : `not yet, lean now ${signed(c.align)}`}`,
  ]
  for (const a of t.animals) {
    const A = ANIMAL_TRAITS[a.animal]!
    const emoji = ANIMALS[a.animal]?.emoji ?? ''
    const parts = [
      `${A.buff.name}: ${A.buff.text}`,
      a.passive ? `${A.passive.name} (passive): ${A.passive.text}` : `${A.passive.name} (passive) at 2 pieces worn`,
      a.skill ? `${A.skill.name} (skill): ${A.skill.text}` : `${A.skill.name} (skill) once given ${STACK_AT} times`,
    ]
    out.push(`${emoji} ${A.name}: wears ${a.spots.join(' and ')}, given ${a.given} time${a.given === 1 ? '' : 's'} · ${parts.join(' · ')}`)
  }
  const worn = new Set(t.animals.map(a => a.animal))
  const gone = Object.entries(c.gifts ?? {}).filter(([a, n]) => n > 0 && !worn.has(a) && ANIMALS[a])
  if (gone.length) out.push(`   Given before, no piece worn now (no effect until one is): ${gone.map(([a, n]) => `${ANIMALS[a]!.emoji} ${a} ×${n}`).join(', ')}`)
  return out
}

// "☀ Rally · 🐯 Pounce": the trait skills it knows, for its line in the garden list.
export const traitSkillTags = (c: ChaoSave): string => {
  const t = traitsOf(c)
  const tags = [...(t.strong ? [`${TEMPERAMENTS[t.temper].icon} ${TEMPERAMENTS[t.temper].skill.name}`] : []), ...t.animals.filter(a => a.skill).map(a => `${ANIMALS[a.animal]?.emoji ?? ''} ${ANIMAL_TRAITS[a.animal]!.skill.name}`)]
  return tags.join(' · ')
}

// Lays a new egg if there is room; returns it.
export const layEgg = (gd: Garden, now: number): ChaoSave | undefined => {
  if (gd.chao.length >= MAX_CHAO) return undefined
  const c = freshChao(`c${gd.g.nextId++}`, now)
  c.lastFruit = gd.g.turns
  gd.chao.push(c)
  gd.g.ids.push(c.id)
  return c
}

// A brand-new garden: two eggs to start.
export const newGarden = (now: number): Garden => {
  const gd: Garden = { g: freshGarden(now), chao: [], tree: newTree() }
  layEgg(gd, now)
  layEgg(gd, now)
  return gd
}

// Fruit goes to the hungriest chao; on a tie, the smaller one.
export const hungriest = (gd: Garden) =>
  gd.chao.filter(active).reduce<ChaoSave | undefined>((best, c) => (!best || c.hunger > best.hunger || (c.hunger === best.hunger && growth(c) < growth(best)) ? c : best), undefined)

// No chosen chao: the animals from bubbles go to a random hatched chao each time (never an egg or
// cocoon). Tool runs used to as well; since 0.7.0 they ripen fruit instead.
export const trainee = (gd: Garden) => {
  const live = gd.chao.filter(active)
  return live[Math.floor(Math.random() * live.length)]
}

// The first hatched chao in garden order: a steady one for the garden card.
export const firstActive = (gd: Garden) => gd.g.ids.map(id => gd.chao.find(o => o.id === id)).find(c => c && active(c))

export const byName = (gd: Garden, name: string) => gd.chao.find(c => c.hatched && c.name.toLowerCase() === name.trim().toLowerCase())

const dayOf = (now: number) => {
  const d = new Date(now)
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}

// A new chat: cocoons open, the chao get a little hungry, time away lowers happiness, and the first
// chat of the day counts a garden day (every hatched chao a day older) and brings the morning basket.
export const welcome = (gd: Garden, now: number) => {
  const away = Math.floor((now - gd.g.lastSeen) / DAY)
  const morning = dayOf(now) !== gd.g.lastDay
  for (const c of gd.chao) {
    if (c.stage === 'cocoon') emerge(c)
    if (away > 0) {
      c.happiness = Math.max(0, c.happiness - away * 4)
      c.align -= away * 3
    }
    if (morning) {
      c.happiness = Math.min(100, c.happiness + 3)
      if (c.hatched) c.age++
    }
    if (active(c)) c.hunger = Math.min(100, c.hunger + 30)
    c.chats++
  }
  if (morning) {
    gd.g.days++
    gd.g.lastDay = dayOf(now)
  }
  gd.g.lastSeen = now
  return { morning }
}

// Each message you send: eggs hear it, the time of day leans everyone Hero or Dark, and while the
// tree has fruit the hungriest chao eats one. A picture is a treat on top. Returns whether a fruit was eaten.
export const message = (gd: Garden, now: number, pictures: boolean, fruitLeft: boolean) => {
  const hour = new Date(now).getHours()
  for (const c of gd.chao) {
    if (c.stage === 'egg') c.warmth++
    if (hour >= 7 && hour < 22) c.align += 1
    else if (hour < 5) c.align -= 2
  }
  let ate = false
  const eater = hungriest(gd)
  if (eater && fruitLeft) {
    eater.messages++
    eater.stats.stamina++
    eater.happiness = Math.min(100, eater.happiness + 2)
    eater.hunger = Math.max(0, eater.hunger - 25)
    ate = true
  }
  if (eater && pictures) {
    eater.treats++
    eater.happiness = Math.min(100, eater.happiness + 3)
    eater.hunger = Math.max(0, eater.hunger - 35)
  }
  gd.g.lastSeen = now
  return ate
}

// ---- Fruit ----
// Claude's work ripens coloured fruit (knobs at the top of this file); at the end of each of Claude's turns every ripe fruit is
// eaten by a picky chao, and the fruit's recipe (by the tree's kind) gives its stats. Tool runs give no stats.
export const FRUIT: Record<Color, { emoji: string; fill: string; edge: string; leaf: string; leafEdge: string; work: string }> = {
  power: { emoji: '🔴', fill: '#ff6b6b', edge: '#d94848', leaf: '#ffc4c4', leafEdge: '#e58e8e', work: 'commands' },
  swim: { emoji: '🔵', fill: '#74c0fc', edge: '#4a94d4', leaf: '#bde0fd', leafEdge: '#7fb3de', work: 'reads' },
  run: { emoji: '🟢', fill: '#69db7c', edge: '#3fae55', leaf: '#aeeeb8', leafEdge: '#5fbf74', work: 'edits' },
  fly: { emoji: '🟡', fill: '#ffd43b', edge: '#e0aa1a', leaf: '#ffeaa6', leafEdge: '#dcc062', work: 'talking' },
}

// Which colour a tool run ripens, and how much work it is. Other tools (task list, wrap-up, ToolSearch, Skill,
// Agent, MCP tools...) ripen nothing.
export const workOf = (tool: string): [Color, number] | undefined =>
  /^(Bash|PowerShell|Monitor)$/.test(tool)
    ? ['power', 1]
    : /^(Read|Grep|Glob)$/.test(tool)
      ? ['swim', 1]
      : /^(Edit|Write|NotebookEdit|MultiEdit)$/.test(tool)
        ? ['run', 1]
        : /^(WebFetch|WebSearch)$/.test(tool) || /Web|Browser|chrome|navigate/i.test(tool)
          ? ['fly', WEB_CHARS]
          : undefined

const tidy = (n: number) => Math.round(n * 1000) / 1000

// How much work ripens one fruit of a colour now: 4 x its faded work per turn, rounded (characters to the nearest
// 500), between half and double the start value.
export const meterOf = (g: GardenSave, color: Color) => {
  const start = METER_START[color]
  const raw = (4 * g.work[color]) / Math.max(0.001, g.workTurns)
  const round = color === 'fly' ? Math.round(raw / 500) * 500 : Math.round(raw)
  return clamp(round, Math.ceil(start / 2), start * 2)
}

// Adds work to a colour; each time its meter fills, a fruit is ripe and waits for the end of Claude's turn.
// Returns how many ripened.
export const addWork = (gd: Garden, color: Color, amount: number) => {
  const g = gd.g
  if (!(amount > 0)) return 0
  g.ripe[color] = tidy(g.ripe[color] + amount)
  const meter = meterOf(g, color)
  let n = 0
  while (g.ripe[color] >= meter) {
    g.ripe[color] = tidy(g.ripe[color] - meter)
    if (g.ready.length < READY_MAX) g.ready.push(color)
    n++
  }
  return n
}

// The end of one of Claude's turns: the meters' history fades a little and takes in this turn's work; the turn counts.
export const endTurn = (gd: Garden, turnWork: Partial<Record<Color, number>>) => {
  const g = gd.g
  for (const k of FRUIT_COLORS) g.work[k] = tidy(g.work[k] * METER_DECAY + Math.max(0, turnWork[k] ?? 0))
  g.workTurns = tidy(g.workTurns * METER_DECAY + 1)
  g.turns++
}

// A chao's two favourite colours: the two it has eaten most. Until it has tasted TASTING fruit it wants every colour.
// Ties go by a fixed order of its own (from its id), so they are never random.
export const favourites = (c: ChaoSave): Color[] => {
  const turn = idNumber(c.id) % 4
  const order = [...FRUIT_COLORS.slice(turn), ...FRUIT_COLORS.slice(0, turn)]
  return eatenOf(c) < TASTING ? order : order.sort((a, b) => c.ate[b] - c.ate[a]).slice(0, 2)
}

const sinceFruit = (gd: Garden, c: ChaoSave) => Math.max(0, gd.g.turns - c.lastFruit)
const hungerFor = (gd: Garden, c: ChaoSave) => 1 + HUNGER_STEP * sinceFruit(gd, c)
const likeOf = (c: ChaoSave, color: Color) => (c.ate[color] + 1) / (eatenOf(c) + 4)

// Who eats a ripe fruit: a draw among the hatched chao that want it (it is one of their favourites, or they have gone
// TOO_HUNGRY turns without fruit), weighted like^PICKY_SHARP x hunger, so keener and hungrier chao have a better
// chance. If nobody wants it, the hungriest hatched chao eats it. Eggs and cocoons don't eat.
export const pickEater = (gd: Garden, color: Color, rng: () => number = Math.random): ChaoSave | undefined => {
  const live = gd.chao.filter(active)
  if (!live.length) return undefined
  const starving = (c: ChaoSave) => sinceFruit(gd, c) >= TOO_HUNGRY
  const want = live.filter(c => favourites(c).includes(color) || starving(c))
  if (!want.length)
    return live.reduce((b, c) => (hungerFor(gd, c) > hungerFor(gd, b) || (hungerFor(gd, c) === hungerFor(gd, b) && c.hunger > b.hunger) ? c : b))
  const weights = want.map(c => Math.pow(starving(c) ? Math.max(HUNGRY_LIKE, likeOf(c, color)) : likeOf(c, color), PICKY_SHARP) * hungerFor(gd, c))
  let r = rng() * weights.reduce((a, b) => a + b, 0)
  for (let i = 0; i < want.length; i++) {
    r -= weights[i] as number
    if (r <= 0) return want[i]
  }
  return want[want.length - 1]
}

// A twin tree's other colour for a fruit of one of its two colours.
export const partnerOf = (tree: TreeKind, color: Color): Color | undefined =>
  tree.kind === 'twin' ? (color === tree.a ? tree.b : color === tree.b ? tree.a : undefined) : undefined

// The stats one fruit gives, by its tree: plain 6 own + 3 random +1s; twin 4 own + 4 partner + 1 random +1 (a fruit
// that is neither of the twin's colours uses the plain recipe); rainbow 3 own + 1 each other + 1 random +1.
export const fruitStats = (tree: TreeKind['kind'], color: Color, partner: Color | undefined, rng: () => number = Math.random): ChaoStats => {
  const s: ChaoStats = { swim: 0, fly: 0, run: 0, power: 0, stamina: 0 }
  const kind = tree === 'twin' && partner && partner !== color ? 'twin' : tree === 'rainbow' ? 'rainbow' : 'plain'
  const r = RECIPES[kind]
  s[color] += r.own
  if (kind === 'twin' && partner) s[partner] += r.partner
  const others = STAT_KEYS.filter(k => k !== color && !(kind === 'twin' && k === partner))
  for (const k of others) s[k] += r.each
  for (let i = 0; i < r.sprinkle; i++) s[others[Math.floor(rng() * others.length)] ?? 'stamina'] += 1
  return s
}

export const eatFruit = (gd: Garden, c: ChaoSave, color: Color, tree: TreeKind, rng: () => number = Math.random) => {
  const s = fruitStats(tree.kind, color, partnerOf(tree, color), rng)
  for (const k of STAT_KEYS) c.stats[k] += s[k]
  c.ate[color]++
  c.lastFruit = gd.g.turns
  c.hunger = Math.max(0, c.hunger - 15)
  c.happiness = Math.min(100, c.happiness + 1)
}

// Every ripe fruit is eaten, one by one (so a chao that just ate is less hungry for the next). With nobody hatched
// they wait on the tree. Returns who ate what, in order; the garden keeps it as the last meal.
export const eatReady = (gd: Garden, tree: TreeKind, rng: () => number = Math.random): [Color, string][] => {
  const meal: [Color, string][] = []
  if (!gd.chao.some(active)) return meal
  for (const color of gd.g.ready.splice(0)) {
    const c = pickEater(gd, color, rng)
    if (!c) continue
    eatFruit(gd, c, color, tree, rng)
    meal.push([color, c.id])
  }
  if (meal.length) gd.g.lastMeal = meal
  return meal
}

// The morning basket: one ripe fruit of each colour, eaten at the end of Claude's next turn.
export const morningBasket = (gd: Garden) => {
  for (const k of FRUIT_COLORS) if (gd.g.ready.length < READY_MAX) gd.g.ready.push(k)
}

// The tree's kind, from Claude's work in fruit while it grew (work / meter per colour).
export const treeKindOf = (chatWork: Partial<Record<Color, number>>): TreeKind => {
  const r = FRUIT_COLORS.map(k => [k, Math.max(0, chatWork[k] ?? 0)] as [Color, number]).sort((a, b) => b[1] - a[1])
  const [first, second] = r as [[Color, number], [Color, number]]
  const sum = r.reduce((a, x) => a + x[1], 0)
  if (!(sum > 0) || first[1] / sum > TREE_ONE) return sum > 0 ? { kind: 'plain', a: first[0] } : { kind: 'plain' }
  if ((first[1] + second[1]) / sum > TREE_TWO) return { kind: 'twin', a: first[0], b: second[0] }
  return { kind: 'rainbow' }
}

// How ripe each colour's next fruit looks on the tree: 0 bud, 1 small, 2 half, 3 ripe (or one waiting to be eaten).
export const ripeness = (g: GardenSave): Record<Color, number> => {
  const out = noColor()
  for (const k of FRUIT_COLORS) out[k] = g.ready.includes(k) ? 3 : clamp(Math.floor((4 * g.ripe[k]) / meterOf(g, k)), 0, 3)
  return out
}

export const treeLookOf = (g: GardenSave, kind: TreeKind): TreeLook => ({ ...kind, ripe: ripeness(g) })

export const level = (xp: number) => Math.min(99, Math.floor(Math.sqrt(xp)))

// Animals that pop up in message bubbles. Each one gives stats and puts its parts on the chao.
// `parts` are put on all at once (the raccoon); `pick` lists spots of which one is chosen at random, as in SA2.
export const ANIMALS: Record<string, { emoji: string; stats: Partial<ChaoStats>; parts?: ChaoParts; pick?: (keyof ChaoParts)[] }> = {
  raccoon: { emoji: '🦝', stats: { run: 12, power: 6, stamina: 6 }, parts: { tail: 'raccoon', ears: 'raccoon', face: 'raccoon' } },
  penguin: { emoji: '🐧', stats: { swim: 12, stamina: 6, run: 3 }, pick: ['forehead', 'feet'] },
  rabbit: { emoji: '🐰', stats: { run: 12, fly: 3, stamina: 6 }, pick: ['ears', 'tail'] },
  bear: { emoji: '🐻', stats: { power: 12, stamina: 9 }, pick: ['ears', 'feet'] },
  tiger: { emoji: '🐯', stats: { power: 12, run: 6, stamina: 3 }, pick: ['ears', 'tail'] },
  sheep: { emoji: '🐑', stats: { power: 9, stamina: 12 }, pick: ['horns', 'tail', 'ears'] },
  parrot: { emoji: '🦜', stats: { fly: 12, swim: 3, stamina: 6 }, pick: ['forehead', 'tail'] },
  boar: { emoji: '🐗', stats: { run: 12, power: 6, stamina: 6 }, pick: ['ears', 'tail'] },
}

export const giveAnimal = (c: ChaoSave, animal: string) => {
  const a = ANIMALS[animal]
  if (!a) return
  c.animals++
  c.gifts = { ...(c.gifts ?? {}), [animal]: (c.gifts?.[animal] ?? 0) + 1 }
  for (const [k, v] of Object.entries(a.stats)) c.stats[k as keyof ChaoStats] += v ?? 0
  const parts: ChaoParts = { ...c.parts, ...(a.parts ?? {}) }
  if (a.pick?.length) {
    const spot = a.pick[Math.floor(Math.random() * a.pick.length)]
    parts[spot] = animal
    // ears and horns from different animals can't both be on
    if (spot === 'horns' && parts.ears && parts.ears !== animal) delete parts.ears
    if (spot === 'ears' && parts.horns && parts.horns !== animal) delete parts.horns
  }
  c.parts = parts
  c.happiness = Math.min(100, c.happiness + 5)
}

export const pet = (c: ChaoSave) => {
  c.pets++
  c.happiness = Math.min(100, c.happiness + 5)
  c.align += 2
}

// Lots of Run: Neutral Run turns dark blue and Dark Run's green marks turn red.
const LOTS_OF_RUN = 15

export const lookOf = (c: ChaoSave, perYear: number): ChaoLook => {
  const grownUp = c.stage === 'adult' || c.stage === 'cocoon'
  const look: ChaoLook = {
    id: c.id,
    stage: c.stage,
    kind: grownUp ? (c.kind ?? 'neutral') : leaning(c.align),
    name: c.name,
    happy: c.happiness >= 70,
    parts: { ...c.parts },
  }
  if (c.stage === 'baby' || c.stage === 'child') {
    look.grow = c.stage === 'baby' ? 0 : Math.min(3, Math.max(1, Math.floor((c.age / perYear) * 3)))
    look.lean = typeOf(c)
    look.tint = Math.round(Math.min(1, Math.abs(c.align) / 100) * 10) / 10
  }
  if (c.stage === 'adult') {
    look.type = c.type ?? 'normal'
    const second = secondOf(c)
    if (second) look.second = second
    look.bold = Math.min(2, Math.max(0, Math.floor((c.age - (c.grownAt ?? c.age)) / perYear)))
    look.special = look.type === 'run' && look.kind !== 'hero' && level(c.stats.run) >= LOTS_OF_RUN
    if (c.cls) look.cls = { name: c.cls.main, tier: classTier(c), seed: c.cls.seed }
  }
  return look
}

// ---- The shared tree ----
export const newTree = (n = 1): TreeSave => ({ n, grown: 0, snacks: TREE_FRUITS, kind: { kind: '' }, work: noColor() })

const KINDS_OF_TREE = ['', 'plain', 'twin', 'rainbow']
export const normalizeTree = (v: unknown): TreeSave => {
  const f = newTree()
  if (!v || typeof v !== 'object') return f
  const o = v as Partial<TreeSave>
  const isColor = (x: unknown): x is Color => typeof x === 'string' && (FRUIT_COLORS as string[]).includes(x)
  const k = o.kind && typeof o.kind === 'object' && KINDS_OF_TREE.includes(String(o.kind.kind)) ? o.kind : { kind: '' as const }
  const kind: TreeKind = { kind: k.kind }
  if (isColor(k.a)) kind.a = k.a
  if (isColor(k.b)) kind.b = k.b
  return {
    n: Math.max(1, num(o.n, 1)),
    grown: Math.max(0, num(o.grown, 0)),
    snacks: clamp(num(o.snacks, TREE_FRUITS), 0, TREE_FRUITS),
    kind,
    work: colorRecord(o.work, f.work),
  }
}

// One of your messages (any chat): the tree grows, and the message that makes it full grown settles its kind from
// Claude's work since it was planted. Returns whether a snack was left for the hungriest chao (it takes one).
export const growTree = (gd: Garden): boolean => {
  const t = gd.tree
  t.grown++
  if (t.grown >= TREE_GROWN && t.kind.kind === '') t.kind = treeKindOf(t.work)
  return t.snacks > 0
}

// Claude's work goes into the tree's kind while it is still growing.
export const treeWork = (gd: Garden, color: Color, amount: number, meter: number) => {
  const t = gd.tree
  if (t.kind.kind !== '' || !(amount > 0) || !(meter > 0)) return
  t.work[color] = tidy(t.work[color] + amount / meter)
}

// At the end of Claude's turn: a full-grown tree with no snacks left goes, and a new seed is planted.
export const replantTree = (gd: Garden): boolean => {
  if (gd.tree.grown < TREE_GROWN || gd.tree.snacks > 0) return false
  gd.tree = newTree(gd.tree.n + 1)
  return true
}

export const treeLevel = (fruits: number): TreeLevel => (fruits >= 5 ? 'full' : fruits > 0 ? 'half' : 'bare')

// The tree is full grown from this many of your messages (in any chat); its kind settles then.
export const TREE_GROWN = 7

// The tree grows with your messages, in any chat: seed, sprout, sapling, young tree with blossoms,
// then the full tree (paler once its snacks are gone).
export const treeStage = (grown: number, fruits: number): TreeLevel =>
  grown < 1 ? 'seed' : grown < 3 ? 'sprout' : grown < 5 ? 'sapling' : grown < TREE_GROWN ? 'young' : treeLevel(fruits)

export const EMPTY_GARDEN: GardenLook = { show: true, view: 'neutral', tree: 'full', chao: [] }

// The band's look. Unless `mood` is set (a new chat, petting, a new pace), each chao keeps the look it
// showed, apart from its name and animal parts, so the band doesn't redraw on every message or tool run;
// a new stage always shows at once.
export const gardenLook = (gd: Garden, tree: TreeLevel, old: GardenLook, mood: boolean): GardenLook => ({
  show: gd.g.show,
  view: gd.g.view === 'dark' || gd.g.view === 'light' ? gd.g.view : 'neutral',
  tree,
  chao: gd.g.ids.flatMap(id => {
    const c = gd.chao.find(o => o.id === id)
    if (!c) return []
    const fresh = lookOf(c, PACES[gd.g.pace])
    // the gold medal from the last race shows at once, like a new name or animal part (not on an egg or cocoon)
    if (gd.g.champ === id && fresh.stage !== 'egg' && fresh.stage !== 'cocoon') fresh.medal = true
    const prev = old.chao.find(o => o.id === id)
    // finding a class shows at once; a better tier of gear waits for the next chat like the rest of a look
    const foundClass = !!fresh.cls !== !!prev?.cls
    if (mood || !prev || prev.stage !== fresh.stage || foundClass) return [fresh]
    const kept: ChaoLook = { ...prev, name: fresh.name, parts: fresh.parts }
    if (fresh.medal) kept.medal = true
    else delete kept.medal
    return [kept]
  }),
})

export const sameLook = (a: GardenLook, b: GardenLook) => JSON.stringify(a) === JSON.stringify(b)

export const cleanName = (s: string) => s.replace(/[^A-Za-z0-9 '\-]/g, '').trim().slice(0, 12)

export const KIND_NAME = { hero: 'Hero', dark: 'Dark', neutral: 'Neutral' }
export const TYPE_NAME: Record<ChaoType, string> = { normal: 'Normal', swim: 'Swim', fly: 'Fly', run: 'Run', power: 'Power' }

// "Dark Swim", the name of an adult's (or cocoon's) form.
export const formName = (c: ChaoSave) => `${KIND_NAME[c.kind ?? 'neutral']} ${TYPE_NAME[c.type ?? 'normal']}`

const hearts = (h: number) => {
  const n = Math.round(h / 20)
  return `${'♥'.repeat(n)}${'♡'.repeat(5 - n)}`
}

export const stageName = (c: ChaoSave) => {
  if (c.stage === 'adult') {
    const second = secondOf(c)
    return `${formName(c)} adult${second ? ` with a touch of ${TYPE_NAME[second]}` : ''}`
  }
  return c.stage === 'cocoon' ? 'in its cocoon' : c.stage
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

// What comes next in its life, in a line.
export const nextStep = (gd: Garden, c: ChaoSave, now: number) => {
  const perYear = PACES[gd.g.pace]
  const food = growth(c)
  if (c.stage === 'baby') {
    const days = Math.max(1, Math.ceil(perYear / 3 - c.age))
    return `Grows into a child in ${plural(days, 'garden day')}${food < CHILD_FOOD ? `, or sooner after ${CHILD_FOOD - food} more food` : ''}`
  }
  if (c.stage === 'child') {
    const days = Math.ceil(perYear - c.age)
    const hungry = food < COCOON_FOOD ? `${COCOON_FOOD - food} more food` : ''
    if (days > 0) return `Makes its cocoon in ${plural(days, 'garden day')}${hungry ? `, once it has eaten ${hungry}` : ''}`
    return `Ready for its cocoon after ${hungry}`
  }
  if (c.stage === 'cocoon') {
    const mins = Math.max(1, Math.ceil(((c.cocoonAt ?? now) + COCOON_TIME - now) / 60000))
    return `Comes out as a ${formName(c)} chao in about ${mins} min, or when a new chat opens`
  }
  return ''
}

// "1,234"
const thousands = (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
const fruitName = (k: Color) => `${FRUIT[k].emoji} ${TYPE_NAME[k]}`

const favouriteLine = (c: ChaoSave) => {
  const eaten = eatenOf(c)
  if (eaten < TASTING) return `Still tasting everything (${eaten} of ${TASTING} fruit eaten)`
  const [a, b] = favourites(c) as [Color, Color]
  return `Favourite fruit: ${fruitName(a)} and ${fruitName(b)} (${c.ate[a]} and ${c.ate[b]} eaten)`
}

// "The tree: twin (🔵 Swim + 🟢 Run)", or "still growing" before it is full grown.
export const treeLine = (t: TreeKind) =>
  `The tree: ${
    t.kind === ''
      ? "still growing (its kind settles when it is full grown, from Claude's work while it grows)"
      : t.kind === 'twin' && t.a && t.b
        ? `twin (${fruitName(t.a)} + ${fruitName(t.b)})`
        : t.kind === 'plain'
          ? `plain${t.a ? ` (mostly ${FRUIT[t.a].emoji} ${FRUIT[t.a].work})` : ''}`
          : 'rainbow (a bit of everything)'
  }`

// "Ripening: 🔴 11/16 commands · 🔵 3/10 reads · 🟢 6/7 edits · 🟡 2,100/6,000 talking"
export const ripeningLine = (g: GardenSave) =>
  `Ripening: ${FRUIT_COLORS.map(k => {
    const done = k === 'fly' ? Math.floor(g.ripe[k] / 100) * 100 : Math.floor(g.ripe[k])
    return `${FRUIT[k].emoji} ${thousands(done)}/${thousands(meterOf(g, k))} ${FRUIT[k].work}`
  }).join(' · ')}`

// One chao's full card.
export const card =(gd: Garden, c: ChaoSave, now: number) => {
  if (c.stage === 'egg') {
    const mins = Math.max(0, Math.ceil((c.born + HATCH_TIME - now) / 60000))
    return `🥚 An egg, ${c.warmth} of ${HATCH_WARMTH} messages heard. It hatches after ${HATCH_WARMTH - c.warmth} more, or in ${mins} min, whichever comes first.`
  }
  const s = c.stats
  const years = Math.round(yearsOf(gd, c) * 10) / 10
  const lines = [
    `✦ ${c.name}: ${stageName(c)}, ${years} chao year${years === 1 ? '' : 's'} old (${plural(c.age, 'garden day')})`,
    `Happiness ${hearts(c.happiness)} ${c.happiness}/100 · Hunger ${c.hunger}/100`,
    `Swim Lv ${level(s.swim)} · Fly Lv ${level(s.fly)} · Run Lv ${level(s.run)} · Power Lv ${level(s.power)} · Stamina Lv ${level(s.stamina)}`,
    favouriteLine(c),
    `Ate ${FRUIT_COLORS.map(k => `${FRUIT[k].emoji} ${c.ate[k]}`).join(' ')} fruit, ${plural(c.messages, 'snack')} and ${plural(c.treats, 'treat')} · ${c.animals} animals · ${c.chats} chats · ${c.pets} pets`,
  ]
  if (gd.g.champ === c.id) lines.push('🥇 Wears the gold medal: it won the last race (/chao race)')
  lines.push(...classLines(c))
  // its temperament and each animal it wears, with what each gives in fights
  lines.push(...traitLines(c))
  if (c.stage === 'baby' || c.stage === 'child') {
    const second = secondOf(c)
    lines.push(`Leaning: ${KIND_NAME[leaning(c.align)]} (${c.align > 0 ? '+' : ''}${c.align}), type ${TYPE_NAME[typeOf(c)]}${second ? ` with a touch of ${TYPE_NAME[second]}` : ''}`)
  }
  const next = nextStep(gd, c, now)
  if (next) lines.push(next)
  return lines.join('\n')
}

// The garden at a glance: the fruit, one line per chao, then the first one's card.
export const gardenCard = (gd: Garden, now: number) => {
  const g = gd.g
  const t = gd.tree
  const nameOf = (id: string) => gd.chao.find(o => o.id === id)?.name || 'a chao'
  const lines = [
    `${g.view === 'dark' ? '☾ Dark garden (the moonlit wood)' : g.view === 'light' ? '☀ Light garden (the sunset meadow)' : '✦ Chao garden'}: ${gd.chao.length} of ${MAX_CHAO} · garden day ${g.days} · pace ${g.pace} (1 chao year = ${plural(PACES[g.pace], 'garden day')}) · ${t.grown < TREE_GROWN ? `the tree is growing (${t.grown} of ${TREE_GROWN} messages)` : t.snacks > 0 ? `${plural(t.snacks, 'snack')} left on the tree` : 'the tree is bare: a new seed after this turn'}`,
    treeLine(t.kind),
    ripeningLine(g),
  ]
  if (g.ready.length) lines.push(`Ripe and waiting for the end of Claude's turn: ${g.ready.map(k => FRUIT[k].emoji).join(' ')}`)
  if (g.lastMeal.length) lines.push(`Last fruit: ${g.lastMeal.map(([k, id]) => `${FRUIT[k].emoji} to ${nameOf(id)}`).join(', ')}`)
  for (const id of g.ids) {
    const c = gd.chao.find(o => o.id === id)
    if (!c) continue
    if (c.stage === 'egg') lines.push(`   🥚 an egg · ${c.warmth} of ${HATCH_WARMTH} messages heard`)
    else if (c.stage === 'cocoon') lines.push(`   ✧ ${c.name} · in its cocoon`)
    else {
      const second = c.stage === 'adult' ? undefined : secondOf(c)
      const type = c.stage === 'adult' ? '' : ` · type ${TYPE_NAME[typeOf(c)]}${second ? ` + ${TYPE_NAME[second]}` : ''}`
      const favs = eatenOf(c) < TASTING ? ' · tasting everything' : ` · likes ${favourites(c).map(k => FRUIT[k].emoji).join('')}`
      const tags = traitSkillTags(c)
      lines.push(`   ${c.name}${g.champ === c.id ? ' 🥇' : ''} · ${stageName(c)} · ${hearts(c.happiness)}${type}${favs}${tags ? ` · ${tags}` : ''}`)
    }
  }
  const shown = firstActive(gd)
  if (shown) lines.push('', card(gd, shown, now))
  return lines.join('\n')
}

// Drawing. A chao faces right with its feet at (0,0).

// Colours and finishing touches of one look. `tip` colours hands, feet and head tip; `ball` the floating ball.
type Palette = {
  body: string
  edge: string
  tip: string
  eye: string
  ball: string
  tummy?: string
  mark?: string
  wing?: string
  wingSize?: number
  ballY?: number
  stripes?: string
}

const NEWBORN: Palette = { body: '#a8dcff', edge: '#5fa8dc', tip: '#ffe066', eye: '#1e2a4a', ball: '#ffe066' }
// Children drift toward these as they grow, by how far they lean Hero or Dark.
const DRIFT = {
  hero: { body: '#f8fbff', edge: '#9cc8ea' },
  dark: { body: '#8a3358', edge: '#b0507a' },
}

const HERO = { body: '#f8fbff', edge: '#9cc8ea', eye: '#1e2a4a' }
const EYE = '#1e2a4a'

// The 15 adult forms, from Chao Island's descriptions: colours, then the head piece behind the head
// and any marks in front of it.
type Form = Palette & { head: (p: Palette) => string; front?: (p: Palette) => string }
const FORMS: Record<ChaoLook['kind'], Record<ChaoType, Form>> = {
  neutral: {
    // the newborn look, green tips, tummy patch, sandy ball
    normal: {
      body: '#a8dcff', edge: '#5fa8dc', tip: '#7bd88f', eye: EYE, ball: '#e8cf8a', tummy: '#fff2c4',
      head: p => `<path d="M-4,-22 Q2,-28 1,-33 Q6,-27 6,-22 Z" fill="${p.body}"/>`,
      front: p => `<circle cx="1" cy="-32.6" r="1.4" fill="${p.tip}"/>`,
    },
    // green and yellow, a fin head tip, dark green forehead, green ball
    swim: {
      body: '#cdeca0', edge: '#7fb85a', tip: '#ffe066', eye: EYE, ball: '#5cc87a',
      head: () => `<path d="M-7,-20 Q-10,-31 -1,-33.5 Q-3,-28 6,-23 Z" fill="#8fd66a"/>`,
      front: () => `<ellipse cx="4" cy="-22.4" rx="4.4" ry="1.7" fill="#3f8f4a"/>`,
    },
    // purple-pink, big green-blue wings, two violet-tipped head spikes
    fly: {
      body: '#eab4e6', edge: '#b678c0', tip: '#9b59d0', eye: EYE, ball: '#c08cf0', wing: '#7fd6d0', wingSize: 1.35, ballY: -40,
      head: p => `<path d="M-3,-23 Q-8,-28 -11,-33 Q-5,-30 1,-24 Z" fill="${p.body}"/><path d="M3,-24 Q8,-30 12,-33 Q8,-27 7,-22.5 Z" fill="${p.body}"/>`,
      front: p => `<circle cx="-11" cy="-33" r="1.8" fill="${p.tip}"/><circle cx="12" cy="-33" r="1.8" fill="${p.tip}"/>`,
    },
    // green, three swept-back spikes, big feet
    run: {
      body: '#8fdcae', edge: '#4fa874', tip: '#ffe066', eye: EYE, ball: '#ffe066',
      head: p => `<path d="M-2,-24 L-13,-29 L-6,-21 Z M-6,-21 L-16,-22 L-8,-17 Z M-8,-17 L-15,-14 L-8.5,-14 Z" fill="${p.body}"/>`,
    },
    // orange, red tummy, three upward spikes
    power: {
      body: '#ffb366', edge: '#d9822b', tip: '#e8504a', eye: EYE, ball: '#ffe066', tummy: '#ff7a5c',
      head: p => `<path d="M-5,-22 L-4.5,-31 L-1,-24 Z M-1,-24.5 L1.5,-34 L4,-24.5 Z M4,-24 L8,-31 L7.5,-22 Z" fill="${p.body}"/>`,
    },
  },
  hero: {
    // white, two head buds, blue hands and feet, yellow tummy, turquoise halo
    normal: {
      ...HERO, tip: '#6aa8ff', ball: '#4fe0d0', tummy: '#fff0a0',
      head: p => `<circle cx="-2.5" cy="-24.6" r="2.7" fill="${p.tip}"/><circle cx="4.6" cy="-25" r="2.7" fill="${p.tip}"/>`,
    },
    // green marks, two long leaf head-pieces, yellow halo
    swim: {
      ...HERO, tip: '#5cc87a', ball: '#ffd84a',
      head: p => `<path d="M-1,-24 Q-9,-35 -19,-31 Q-10,-29 -4,-21.5 Z" fill="${p.tip}"/><path d="M3,-24.5 Q-2,-37 -12,-38 Q-5,-33 0,-23.5 Z" fill="${p.tip}"/>`,
    },
    // purple marks, two short curled leaves, purple halo
    fly: {
      ...HERO, tip: '#b48cf0', ball: '#b48cf0', wing: '#ffffff',
      head: p => `<path d="M-1,-24 Q-4,-31 -9,-30 Q-11,-27 -8,-26 Q-6,-28 -4.5,-23 Z" fill="${p.tip}"/><path d="M3.5,-24.5 Q5,-31 10,-31 Q12,-28 9,-27 Q7,-29 6.5,-23.8 Z" fill="${p.tip}"/>`,
    },
    // blue and yellow marks, a small straight spike, yellow halo
    run: {
      ...HERO, tip: '#4a90e2', mark: '#ffd84a', ball: '#ffd84a',
      head: p => `<path d="M-3,-23.5 L-13,-27 L-6.5,-20 Z" fill="${p.mark}"/>`,
    },
    // red marks, three head buds, purple halo
    power: {
      ...HERO, tip: '#ff6b6b', ball: '#b48cf0',
      head: p => `<circle cx="-3.2" cy="-24" r="2.3" fill="${p.tip}"/><circle cx="1.2" cy="-25.6" r="2.3" fill="${p.tip}"/><circle cx="5.8" cy="-24.6" r="2.3" fill="${p.tip}"/>`,
    },
  },
  dark: {
    // very dark red, jagged head tip, purple spiked ball
    normal: {
      body: '#5a1f2e', edge: '#9a3f58', tip: '#c0405e', eye: '#ffd6e4', ball: '#a070ff',
      head: p => `<path d="M-4,-22 L-3,-29 L-0.5,-26 L1,-34 L3.2,-27 L5.5,-30 L6,-22 Z" fill="${p.body}"/>`,
    },
    // black and aqua, one sharp rear spike, turquoise spiked ball
    swim: {
      body: '#26282f', edge: '#4f5666', tip: '#3fe0d0', eye: '#d6fffa', ball: '#3fe0d0',
      head: p => `<path d="M-3,-24 Q-10,-27 -19,-32 Q-12,-24 -7.5,-19.5 Z" fill="${p.body}"/>`,
      front: p => `<path d="M-6,-23 Q-11,-26 -16,-30" stroke="${p.tip}" stroke-width="1" fill="none" stroke-linecap="round"/>`,
    },
    // dark purple, jester spikes, bat wings, blue spiked ball
    fly: {
      body: '#3d2a5c', edge: '#6f55a8', tip: '#ff5c9a', eye: '#ffd6e4', ball: '#6aa8ff', ballY: -41,
      head: p => `<path d="M-2,-24 Q-8,-29 -17,-34 Q-10,-27 -6,-20.5 Z" fill="${p.body}"/><path d="M3,-24.5 Q5,-33 13,-38 Q9,-30 7.5,-22.5 Z" fill="${p.body}"/>`,
      front: p => `<circle cx="-17" cy="-34" r="1.6" fill="${p.tip}"/><circle cx="13" cy="-38" r="1.6" fill="${p.tip}"/>`,
    },
    // dark with bright green marks, three rear spikes
    run: {
      body: '#2a2d3a', edge: '#525a74', tip: '#4cff8a', eye: '#ffd6e4', ball: '#4cff8a',
      head: p =>
        `<path d="M-2,-24 Q-10,-27 -15,-31 Q-11,-24 -6,-21 Z M-6,-21 Q-13,-22 -18,-24 Q-13,-18 -8,-17 Z M-8,-17 Q-13,-16 -16,-15 Q-12,-12 -8.5,-13.5 Z" fill="${p.body}"/>`,
      front: p => `<path d="M-5,-23.5 Q-10,-26 -13.5,-29.5 M-8.5,-20 Q-13,-21 -16.5,-23" stroke="${p.tip}" stroke-width="0.9" fill="none" stroke-linecap="round"/>`,
    },
    // dark with orange and red, cone head with a wavy top, striped hands
    power: {
      body: '#3a2626', edge: '#6e4444', tip: '#ff8a3a', eye: '#ffd6e4', ball: '#ff8a3a', tummy: '#e8504a', stripes: '#e8504a',
      head: p => `<path d="M-5,-22 Q-2,-30 -1,-33 Q0.5,-35 2,-33.5 Q3.5,-35.5 5,-33 Q6,-29 7.5,-22 Z" fill="${p.tip}"/>`,
      front: () => `<path d="M-2.6,-27.5 Q1.2,-29.5 5.6,-27.5" stroke="#e8504a" stroke-width="1.3" fill="none"/>`,
    },
  },
}

const mixHex = (a: string, b: string, t: number) => {
  const pa = [1, 3, 5].map(i => parseInt(a.slice(i, i + 2), 16))
  const pb = [1, 3, 5].map(i => parseInt(b.slice(i, i + 2), 16))
  return `#${pa.map((v, i) => Math.round(v + ((pb[i] ?? v) - v) * t).toString(16).padStart(2, '0')).join('')}`
}

const formOf = (look: ChaoLook): Form | undefined => (look.stage === 'adult' ? FORMS[look.kind][look.type ?? 'normal'] : undefined)

// Babies and children keep the newborn colours, drifting toward Hero white or Dark red as they grow.
const paletteOf = (look: ChaoLook): Palette => {
  const form = formOf(look)
  if (form) {
    if (!look.special) return form
    return look.kind === 'dark' ? { ...form, tip: '#ff4a4a', ball: '#ff4a4a' } : { ...form, body: '#3a5bd0', edge: '#22398a', eye: '#d6f5ff' }
  }
  const to = look.kind === 'hero' ? DRIFT.hero : look.kind === 'dark' ? DRIFT.dark : undefined
  if (!to) return NEWBORN
  const t = (look.tint ?? 0) * ((look.grow ?? 0) / 3) * 0.85
  return { ...NEWBORN, body: mixHex(NEWBORN.body, to.body, t), edge: mixHex(NEWBORN.edge, to.edge, t), eye: look.kind === 'dark' && t > 0.45 ? '#ffd6e4' : NEWBORN.eye }
}

// How strongly each type's features show: an adult's main type in full and its second at half, both
// bolder with age; a child's lean buds as it grows.
type Features = Record<ChaoType, number>
const featuresOf = (look: ChaoLook): Features => {
  const f: Features = { normal: 0, swim: 0, fly: 0, run: 0, power: 0 }
  if (look.stage === 'adult') {
    const bold = look.bold ?? 0
    f[look.type ?? 'normal'] = 1 + 0.15 * bold
    if (look.second) f[look.second] = Math.max(f[look.second], 0.5 + 0.1 * bold)
  } else if (look.lean) f[look.lean] = ((look.grow ?? 0) / 3) * 0.8
  return f
}

// Scales a piece around a point, so features can grow in place.
const around = (x: number, y: number, k: number, svg: string) => (k === 1 ? svg : `<g transform="translate(${x},${y}) scale(${k}) translate(${-x},${-y})">${svg}</g>`)

// Fly: wings on the back, flapping. Feathered, or bat wings for Dark.
const wings = (look: ChaoLook, p: Palette, s: number) => {
  if (s <= 0) return ''
  const k = s * (p.wingSize ?? 1)
  const shape =
    look.kind === 'dark'
      ? 'M-3,-12 L-12,-21 L-13,-15 L-18,-16 L-15,-10 L-19,-8 L-10,-8 L-3,-8 Z'
      : 'M-3,-12 Q-12,-24 -19,-18 Q-14,-16 -16,-11 Q-10,-12 -12,-7 Q-7,-9 -3,-8 Z'
  return around(
    -3,
    -10,
    k,
    `<g><animateTransform attributeName="transform" type="rotate" values="0 -3 -10;-14 -3 -10;0 -3 -10" dur="0.9s" repeatCount="indefinite"/>` +
      `<path d="${shape}" fill="${p.wing ?? p.body}" stroke="${p.edge}" stroke-width="0.8" stroke-linejoin="round"/></g>`,
  )
}

// Feet, the back arm, the body, the front hand, the swim fin, the head piece and the head.
const body = (look: ChaoLook, p: Palette, f: Features) => {
  const form = formOf(look)
  const hand = form ? p.tip : p.body
  const fx = f.run
  // Power grows a big fist in front. (The other hand is its own layer, `leftHand`, drawn after anything it holds.)
  const handRx = 1.8 + 1.7 * f.power
  const handRy = 1.2 + 1.4 * f.power
  const stripes = p.stripes
    ? `<path d="M${5.5 - handRx * 0.4},${-6 - handRy} v${handRy * 2} M${5.5 + handRx * 0.3},${-6 - handRy} v${handRy * 2}" stroke="${p.stripes}" stroke-width="0.7"/>`
    : ''
  const fin = f.swim > 0 ? around(-8, -17, f.swim, `<path d="M-8,-19 Q-15,-22 -14,-14 Q-11,-16 -8.5,-15 Z" fill="${p.tip}"/>`) : ''
  const head = form ? around(1, -24, 1 + 0.08 * (look.bold ?? 0), form.head(p)) : `<path d="M-4,-22 Q2,-28 1,-33 Q6,-27 6,-22 Z" fill="${p.body}"/>`
  const front = form ? (form.front ? around(1, -24, 1 + 0.08 * (look.bold ?? 0), form.front(p)) : '') : `<circle cx="1" cy="-32.6" r="1.4" fill="${p.tip}"/>`
  return (
    `<g stroke="${p.edge}" stroke-width="0.8">` +
    `<ellipse cx="${-3 - 0.6 * fx}" cy="-1.2" rx="${2.8 + 1.6 * fx}" ry="${1.5 + 0.4 * fx}" fill="${p.tip}"/>` +
    `<ellipse cx="${3.5 + 0.8 * fx}" cy="-1.2" rx="${2.8 + 1.6 * fx}" ry="${1.5 + 0.4 * fx}" fill="${p.tip}"/>` +
    `<ellipse cx="0" cy="-6.5" rx="6" ry="5.5" fill="${p.body}"/>` +
    (p.tummy ? `<ellipse cx="1.5" cy="-5.6" rx="3.6" ry="3.4" fill="${p.tummy}" stroke="none"/>` : '') +
    `<ellipse cx="5.5" cy="-6" rx="${handRx}" ry="${handRy}" fill="${hand}"/>` +
    stripes +
    fin +
    head +
    `<ellipse cx="1" cy="-17" rx="10" ry="8" fill="${p.body}"/>` +
    `</g>` +
    front
  )
}

// Animal parts, as in SA2: each animal given to the chao puts its parts on it.
const MASK = '#3c3f46'
const OUT = '#5b4a5e'
const st = `stroke="${OUT}" stroke-width="0.6"`
// a round ear pair in an animal's colours
const roundEars = (fill: string, inner: string) =>
  `<circle cx="-5" cy="-23.5" r="3.4" fill="${fill}" ${st}/><circle cx="-5" cy="-23.5" r="1.7" fill="${inner}"/>` +
  `<circle cx="7.5" cy="-24" r="3.4" fill="${fill}" ${st}/><circle cx="7.5" cy="-24" r="1.7" fill="${inner}"/>`
// a long striped or plain tail pointing back and up
const longTail = (fill: string, marks: string) =>
  `<g transform="translate(-6,-5) rotate(-30)"><ellipse cx="-6" cy="0" rx="7" ry="2.8" fill="${fill}" ${st}/>${marks}</g>`
const tailPart = (kind?: string) => {
  switch (kind) {
    case 'raccoon':
      return (
        `<g transform="translate(-6,-5) rotate(-30)">` +
        `<ellipse cx="-6" cy="0" rx="7" ry="3.2" fill="#8a8f99" stroke="${MASK}" stroke-width="0.6"/>` +
        `<path d="M-9,-2.6 L-9,2.6 M-4.5,-2.9 L-4.5,2.9" stroke="${MASK}" stroke-width="1.6"/>` +
        `<ellipse cx="-11.6" cy="0" rx="1.6" ry="1.9" fill="${MASK}"/></g>`
      )
    case 'rabbit':
      return `<circle cx="-8" cy="-5.5" r="3.3" fill="#ffffff" ${st}/><circle cx="-8.6" cy="-6" r="1.2" fill="#fde8f1"/>`
    case 'tiger':
      return longTail('#f2a03d', `<path d="M-9,-2.5 v5 M-5.5,-2.7 v5.4 M-2,-2.6 v5.2" stroke="${MASK}" stroke-width="1.3"/><ellipse cx="-12.6" cy="0" rx="1.4" ry="1.6" fill="${MASK}"/>`)
    case 'sheep':
      return (
        `<circle cx="-8" cy="-5" r="3" fill="#f6efe0" ${st}/><circle cx="-10.5" cy="-7" r="2.5" fill="#f6efe0" ${st}/>` +
        `<circle cx="-10.5" cy="-3" r="2.5" fill="#f6efe0" ${st}/><circle cx="-8" cy="-5" r="2" fill="#f6efe0"/>`
      )
    case 'parrot':
      return (
        `<g transform="translate(-6,-5)">` +
        `<ellipse cx="-8" cy="-3" rx="6.5" ry="1.6" transform="rotate(-24 -8 -3)" fill="#e84a5f" ${st}/>` +
        `<ellipse cx="-8" cy="0" rx="7" ry="1.6" fill="#ffd84a" ${st}/>` +
        `<ellipse cx="-8" cy="3" rx="6.5" ry="1.6" transform="rotate(24 -8 3)" fill="#3fbf8f" ${st}/></g>`
      )
    case 'boar':
      return `<path d="M-5.5,-6 Q-12,-8 -10,-3 Q-8,0 -11,-1" fill="none" stroke="#6b4a3a" stroke-width="1.6" stroke-linecap="round"/>`
    default:
      return ''
  }
}
const earsPart = (kind?: string) => {
  switch (kind) {
    case 'raccoon':
      return roundEars('#8a8f99', '#f1c6d4').replace(/stroke="#5b4a5e"/g, `stroke="${MASK}"`)
    case 'bear':
      return roundEars('#8b5e3c', '#d9a679')
    case 'tiger':
      return roundEars('#f2a03d', '#ffffff')
    case 'rabbit':
      return (
        `<ellipse cx="-3.5" cy="-30" rx="2.4" ry="5.6" fill="#ffffff" ${st}/><ellipse cx="-3.5" cy="-30" rx="1.1" ry="3.8" fill="#f9b8d0"/>` +
        `<ellipse cx="6.5" cy="-30.5" rx="2.4" ry="5.6" fill="#ffffff" ${st}/><ellipse cx="6.5" cy="-30.5" rx="1.1" ry="3.8" fill="#f9b8d0"/>`
      )
    case 'sheep':
      return (
        `<ellipse cx="-10" cy="-20.5" rx="4.2" ry="2" transform="rotate(25 -10 -20.5)" fill="#f6efe0" ${st}/>` +
        `<ellipse cx="12" cy="-21" rx="4.2" ry="2" transform="rotate(-25 12 -21)" fill="#f6efe0" ${st}/>`
      )
    case 'boar':
      return (
        `<path d="M-8,-22 L-6,-28 L-2,-24 Z" fill="#6b4a3a" ${st}/><path d="M4,-24 L8,-29 L11,-23 Z" fill="#6b4a3a" ${st}/>`
      )
    default:
      return ''
  }
}
// Horns sit behind the head like ears.
const hornsPart = (kind?: string) =>
  kind === 'sheep'
    ? `<path d="M-6,-23 Q-14,-26 -11,-31 Q-7,-33 -6,-29" fill="none" stroke="#c9b37e" stroke-width="2.2" stroke-linecap="round"/>` +
      `<path d="M8,-23.5 Q16,-26.5 13,-31.5 Q9,-33.5 8,-29.5" fill="none" stroke="#c9b37e" stroke-width="2.2" stroke-linecap="round"/>`
    : ''
// Forehead pieces sit on top of the head, between the ears.
const foreheadPart = (kind?: string) => {
  switch (kind) {
    case 'penguin':
      return `<path d="M-1,-24.6 Q-3,-30 -4,-29 Q-2,-31 1,-30 Q4,-31 5,-29 Q3,-30 3,-24.6 Z" fill="#ffd84a" ${st}/>`
    case 'parrot':
      return `<path d="M-2,-24.8 Q-5,-31 -2,-33 Q-1,-30 1,-33 Q3,-30 4,-32 Q5,-28 3,-24.8 Z" fill="#e84a5f" ${st}/>`
    default:
      return ''
  }
}
// Feet cover the chao's own two feet.
const feetPart = (kind?: string) => {
  const feet = (fill: string, extra = '') =>
    `<ellipse cx="-3.4" cy="-1.2" rx="3.6" ry="1.8" fill="${fill}" ${st}/><ellipse cx="3.9" cy="-1.2" rx="3.6" ry="1.8" fill="${fill}" ${st}/>${extra}`
  switch (kind) {
    case 'penguin':
      return feet('#ff9d2e')
    case 'bear':
      return feet('#8b5e3c', `<circle cx="-3.4" cy="-1.2" r="0.9" fill="#d9a679"/><circle cx="3.9" cy="-1.2" r="0.9" fill="#d9a679"/>`)
    default:
      return ''
  }
}
const facePart = (kind?: string) =>
  kind === 'raccoon'
    ? `<path d="M-1.5,-17.5 Q5.5,-22.5 11,-17.5 Q5.5,-14.5 -1.5,-17.5 Z" fill="${MASK}"/>` +
      `<ellipse cx="3" cy="-17.5" rx="2.1" ry="2.8" fill="#ffffff"/><ellipse cx="8" cy="-17.5" rx="2.1" ry="2.8" fill="#ffffff"/>`
    : ''

// The floating ball over its head: a heart when happy; for adults a halo for Hero, spikes for Dark and
// a dot for Neutral, in the form's colour. Babies and children have the plain yellow dot.
const ball = (look: ChaoLook, p: Palette) => {
  const grown = look.stage === 'adult'
  let b = `<circle cx="1" cy="-38" r="2.6" fill="${p.ball}"/>`
  if (look.happy)
    b = `<path d="M1,-34 C-3,-37 -4,-40 -1.6,-41.4 C-0.2,-42 0.8,-41.2 1,-40 C1.2,-41.2 2.2,-42 3.6,-41.4 C6,-40 5,-37 1,-34 Z" fill="#ff8fc0"/>`
  else if (grown && look.kind === 'hero') b = `<ellipse cx="1" cy="-38" rx="4.5" ry="1.4" fill="none" stroke="${p.ball}" stroke-width="1.2"/>`
  else if (grown && look.kind === 'dark') b = `<polygon points="1,-42 2.2,-39.2 5,-38 2.2,-36.8 1,-34 -0.2,-36.8 -3,-38 -0.2,-39.2" fill="${p.ball}"/>`
  const lift = (p.ballY ?? -38) + 38
  return `<g transform="translate(0,${lift})"><g><animateTransform attributeName="transform" type="translate" values="0 0;0 -2;0 0" dur="1.6s" repeatCount="indefinite"/>${b}</g></g>`
}

// The picture is built from the chao's look one layer at a time, back to front, so later phases can
// add layers (colours, faces, finishes) without touching the others.
type Layer = (look: ChaoLook, p: Palette, f: Features) => string
// The hand on the belly's left edge, an oval like the front hand (it used to be a flipper reaching behind). It is its
// own layer so it sits on top of whatever the chao holds in it (the warrior's sword).
const leftHand = (look: ChaoLook, p: Palette, f: Features) => {
  const hand = formOf(look) ? p.tip : p.body
  const rx = 1.9 + 1.7 * f.power
  const ry = 1.3 + 1.4 * f.power
  return `<g stroke="${p.edge}" stroke-width="0.8"><ellipse cx="-4.6" cy="-6.2" rx="${rx}" ry="${ry}" fill="${hand}"/></g>`
}

// The gold medal the last race's winner wears on a ribbon round its neck, with a glint now and then.
const MEDAL_ART =
  `<path d="M-1.6,-9.6 L0.9,-5.6 M3.8,-9.6 L1.5,-5.6" stroke="#ff5a7a" stroke-width="1.3" stroke-linecap="round"/>` +
  `<circle cx="1.2" cy="-4.3" r="2.2" fill="#ffd43b" stroke="#b8860b" stroke-width="0.5"/>` +
  `<path d="M1.2,-5.6 L1.6,-4.7 L2.5,-4.6 L1.8,-4 L2,-3.1 L1.2,-3.6 L0.4,-3.1 L0.6,-4 L-0.1,-4.6 L0.8,-4.7 Z" fill="#fff3bf"/>` +
  `<circle cx="0.3" cy="-5.1" r="0.5" fill="#ffffff" opacity="0"><animate attributeName="opacity" values="0;1;0;0" keyTimes="0;0.1;0.2;1" dur="2.6s" repeatCount="indefinite"/></circle>`

const LAYERS: Layer[] = [
  look => tailPart(look.parts?.tail),
  look => (look.cls ? classGear(look.cls).back : ''),
  (look, p, f) => wings(look, p, f.fly),
  look => earsPart(look.parts?.ears) + hornsPart(look.parts?.horns),
  (look, p, f) => body(look, p, f),
  look => feetPart(look.parts?.feet) + foreheadPart(look.parts?.forehead),
  look => (look.cls ? classGear(look.cls).off : ''),
  (look, p, f) => leftHand(look, p, f),
  look => (look.medal ? MEDAL_ART : ''),
  look => facePart(look.parts?.face),
  // eyes, cheeks and smile; on a raccoon mask's white patches the eyes stay dark, whatever the body
  (look, p) =>
    `<ellipse cx="3" cy="-17.5" rx="1.5" ry="2.3" fill="${look.parts?.face === 'raccoon' ? EYE : p.eye}"/><ellipse cx="8" cy="-17.5" rx="1.5" ry="2.3" fill="${look.parts?.face === 'raccoon' ? EYE : p.eye}"/>` +
    `<circle cx="3.4" cy="-18.5" r="0.6" fill="#ffffff"/><circle cx="8.4" cy="-18.5" r="0.6" fill="#ffffff"/>` +
    `<ellipse cx="0" cy="-14" rx="1.6" ry="1" fill="#ff8fc0" opacity="0.5"/><ellipse cx="10.3" cy="-14" rx="1.4" ry="1" fill="#ff8fc0" opacity="0.5"/>` +
    `<path d="M4.6,-13.6 Q5.5,-12.6 6.4,-13.6" fill="none" stroke="#5b3a6e" stroke-width="0.6" stroke-linecap="round"/>`,
  (look, p) => ball(look, p),
  look => {
    if (!look.cls) return ''
    const g = classGear(look.cls)
    return g.head + g.hand + g.fx
  },
]

const SIZE = { egg: 1, baby: 0.75, child: 0.88, cocoon: 1, adult: 1 }

// A child grows from baby size to almost adult size over its year.
const sizeOf = (look: ChaoLook) => (look.stage === 'child' ? Math.round((0.8 + 0.06 * (look.grow ?? 1)) * 100) / 100 : SIZE[look.stage])
// How big a chao's art is drawn against an adult's (for pieces added around it, such as the race's glide wings).
export const chaoSize = (look: ChaoLook) => sizeOf(look)

const chaoSleepy = (look: ChaoLook, p: Palette, dur: number, times: string, values: string, begin: number) => {
  // With a mask the closed eyes sit on the mask, not on the body colour.
  const lid = look.parts?.face === 'raccoon' ? MASK : p.body
  const line = look.parts?.face === 'raccoon' ? '#ffffff' : p.eye
  return (
    `<g opacity="0"><animate attributeName="opacity" calcMode="discrete" values="${values}" keyTimes="${times}" dur="${dur}s" begin="${begin}s" repeatCount="indefinite"/>` +
    `<ellipse cx="3" cy="-17.5" rx="2.3" ry="3" fill="${lid}"/><ellipse cx="8" cy="-17.5" rx="2.3" ry="3" fill="${lid}"/>` +
    `<path d="M1.6,-17.4 Q3,-16 4.4,-17.4" fill="none" stroke="${line}" stroke-width="0.7" stroke-linecap="round"/>` +
    `<path d="M6.6,-17.4 Q8,-16 9.4,-17.4" fill="none" stroke="${line}" stroke-width="0.7" stroke-linecap="round"/></g>`
  )
}

// What the walker draws: the body, and closed eyes laid over it while napping.
export const chaoArt = (look: ChaoLook) => {
  const k = sizeOf(look)
  const p = paletteOf(look)
  const f = featuresOf(look)
  return {
    body: `<g transform="scale(${k})">${LAYERS.map(layer => layer(look, p, f)).join('')}</g>`,
    sleepy: (dur: number, times: string, values: string, begin: number) =>
      `<g transform="scale(${k})">${chaoSleepy(look, p, dur, times, values, begin)}</g>`,
  }
}

const TYPE_LINES: Record<ChaoType, string> = {
  normal: 'Chao chao~',
  swim: 'Splish splash!',
  fly: 'Look, I can glide!',
  run: 'Gotta go fast!',
  power: 'So strong!',
}
const LEAN_LINES: Record<ChaoType, string> = {
  normal: 'Growing big!',
  swim: 'My fin is growing!',
  fly: 'My wings are budding!',
  run: 'My feet are getting big!',
  power: 'Feel my arms!',
}

// The name the chao say they love: the mod's `name` option. Without one they just say "I love you!".
let friend = ''
export const setFriend = (name: unknown) => {
  friend = typeof name === 'string' ? cleanName(name) : ''
}

export const chaoLines = (look: ChaoLook): string[] => [
  `${look.name}: Chao!`,
  look.happy ? (friend ? `I love you, ${friend}!` : 'I love you!') : 'Pet me? /chao pet',
  look.stage === 'baby'
    ? 'Chao chao~'
    : look.stage === 'child'
      ? LEAN_LINES[look.lean ?? 'normal']
      : look.kind === 'dark'
        ? 'Fear the night~'
        : look.kind === 'hero'
          ? 'Shine bright!'
          : TYPE_LINES[look.type ?? 'normal'],
  look.stage === 'adult' ? TYPE_LINES[look.second ?? look.type ?? 'normal'] : 'Feed me messages!',
]

// Each chao walks its own stretch of the band at its own pace, from its id, so its path stays the
// same between redraws. Eggs and cocoons each sit in their own spot.
const idNumber = (id: string) => Number(id.replace(/\D/g, '')) || 1
export const walkOf = (id: string) => {
  const n = idNumber(id)
  const dur = 120 + ((n * 29) % 7) * 10
  return {
    left: 150 + ((n * 67) % 5) * 25,
    right: 770 - ((n * 41) % 5) * 25,
    dur,
    begin: -Math.round((((n * 53) % 100) / 100) * dur),
  }
}
export const eggSpot = (id: string) => 200 + ((idNumber(id) * 173) % 9) * 55

// The egg sits still and wobbles now and then, each on its own beat.
export const eggArt = (x: number, beat = 0) =>
  `<g transform="translate(${x},0)"><g><animateTransform attributeName="transform" type="rotate" values="0;-8;0;8;0;0" keyTimes="0;0.08;0.16;0.24;0.32;1" dur="3.5s" begin="${-beat}s" repeatCount="indefinite"/>` +
  `<ellipse cx="0" cy="-11" rx="8.5" ry="11" fill="#eaf6ff" stroke="#9ad8ff" stroke-width="0.8"/>` +
  `<circle cx="-3" cy="-14" r="2" fill="#a8dcff"/><circle cx="3.5" cy="-8" r="2.5" fill="#a8dcff"/><circle cx="2" cy="-18.5" r="1.3" fill="#ffe066"/></g></g>`

const sparkle = (x: number, y: number, r: number, color: string, begin: number) =>
  `<polygon points="${x},${y - r} ${x + r * 0.3},${y - r * 0.3} ${x + r},${y} ${x + r * 0.3},${y + r * 0.3} ${x},${y + r} ${x - r * 0.3},${y + r * 0.3} ${x - r},${y} ${x - r * 0.3},${y - r * 0.3}" fill="${color}" opacity="0">` +
  `<animate attributeName="opacity" values="0;1;0" dur="2.2s" begin="${begin}s" repeatCount="indefinite"/></polygon>`

// The cocoon: pale blue-green, breathing slowly, with sparkles around it while the chao changes inside.
export const cocoonArt = (x: number) =>
  `<g transform="translate(${x},0)">` +
  `<ellipse cx="0" cy="-0.6" rx="10" ry="1.6" fill="#5fa8a0" opacity="0.18"/>` +
  `<g><animateTransform attributeName="transform" type="scale" values="1 1;1.04 0.97;1 1" dur="2.6s" repeatCount="indefinite"/>` +
  `<path d="M0,-31 C9,-31 11.5,-15 9.5,-7 C8,-0.5 -8,-0.5 -9.5,-7 C-11.5,-15 -9,-31 0,-31 Z" fill="#cdf3ea" stroke="#7fcfc0" stroke-width="0.9"/>` +
  `<path d="M-8,-22 Q0,-18 8,-23 M-9.5,-14 Q0,-10 9.5,-15 M-8,-6 Q0,-3 8,-7" fill="none" stroke="#9fe0d4" stroke-width="1"/>` +
  `<ellipse cx="-3.5" cy="-23" rx="2" ry="4" fill="#ffffff" opacity="0.55"/></g>` +
  sparkle(-13, -26, 2.6, '#9fe0d4', 0) +
  sparkle(13, -18, 2.2, '#ffe066', 0.8) +
  sparkle(-11, -9, 1.8, '#ff8fc0', 1.5) +
  `</g>`

// The garden's fruit tree, drawn with its feet at the bottom of a TREE_W x 84 picture. Once full grown it carries
// the four coloured fruit, each as ripe as its colour's meter, on a canopy that shows the chat's tree kind.
export const TREE_W = 56
const FRUIT_SPOTS: [number, number][] = [
  [21, 47],
  [35, 43],
  [28, 56],
  [14, 56],
  [42, 56],
  [26, 37],
  [37, 33],
]
// Where each colour's fruit grows on the full tree.
const COLOR_SPOT: Record<Color, [number, number]> = {
  power: FRUIT_SPOTS[3] as [number, number],
  swim: FRUIT_SPOTS[5] as [number, number],
  run: FRUIT_SPOTS[4] as [number, number],
  fly: FRUIT_SPOTS[1] as [number, number],
}
// A ripe fruit, on a branch, falling or on the ground, drawn at (x, y): coloured, or the old orange without a colour.
const fruitAt = (x: number, y: number, color?: Color, k = 1) => {
  const f = color ? FRUIT[color] : { fill: '#ffb347', edge: '#e8822a' }
  return (
    `<circle cx="${x}" cy="${y}" r="${3.4 * k}" fill="${f.fill}" stroke="${f.edge}" stroke-width="${0.6 * k}"/>` +
    `<circle cx="${x - k}" cy="${y - 1.2 * k}" r="${0.9 * k}" fill="#ffffff" opacity="0.8"/>` +
    `<path d="M${x},${y - 3.2 * k} q${1.6 * k},${-2 * k} ${3 * k},${-1.4 * k}" fill="none" stroke="#3f9e5a" stroke-width="${0.8 * k}"/>`
  )
}
// A fruit that is falling or lying in the grass is drawn bigger than one on the branch, so it can be seen.
const DROP_K = 1.8
// A colour's fruit as it ripens: a bud, small, half grown, ripe. A soft light ring keeps it clear of the leaves
// (a green fruit on a green tree).
const branchFruit = (color: Color, ripe: number) => {
  const [x, y] = COLOR_SPOT[color]
  const f = FRUIT[color]
  const ring = (r: number) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#ffffff" opacity="0.55"/>`
  if (ripe >= 3) return ring(4.4) + fruitAt(x, y, color)
  if (ripe === 2)
    return (
      ring(3.6) +
      `<circle cx="${x}" cy="${y}" r="2.7" fill="${mixHex(f.fill, '#ffffff', 0.2)}" stroke="${f.edge}" stroke-width="0.5"/>` +
      `<circle cx="${x - 0.8}" cy="${y - 0.9}" r="0.6" fill="#ffffff" opacity="0.7"/>` +
      `<path d="M${x},${y - 2.5} q1.2,-1.5 2.3,-1" fill="none" stroke="#3f9e5a" stroke-width="0.7"/>`
    )
  if (ripe === 1)
    return (
      ring(2.7) +
      `<circle cx="${x}" cy="${y}" r="1.9" fill="${mixHex(f.fill, '#ffffff', 0.45)}" stroke="${mixHex(f.edge, '#ffffff', 0.3)}" stroke-width="0.5"/>` +
      `<path d="M${x},${y - 1.8} q0.9,-1.1 1.7,-0.8" fill="none" stroke="#3f9e5a" stroke-width="0.6"/>`
    )
  return `<circle cx="${x}" cy="${y}" r="1.3" fill="${mixHex('#7bd88f', f.fill, 0.45)}" stroke="#3f9e5a" stroke-width="0.5"/>`
}

// Where a fallen fruit lies, and where the chao stands to eat it, in band pixels (the tree sits at x 96).
export const GROUND_FRUIT: [number, number] = [46, 77]

// The tree as it grows through a chat, from seed to a full tree with fruit. Each stage sways gently.
const sway = (inner: string) =>
  `<g><animateTransform attributeName="transform" type="rotate" values="0 28 80;1.1 28 80;0 28 80;-1.1 28 80;0 28 80" dur="6s" repeatCount="indefinite"/>${inner}</g>`
const GRASS = `<path d="M14,80 q3,-5 5,0 q3,-6 6,0 M33,80 q3,-6 6,0 q2,-5 5,0" fill="#8fd694" stroke="#5cbf74" stroke-width="0.6"/>`
type Growing = 'seed' | 'sprout' | 'sapling' | 'young'
const growingTree = (level: Growing) => {
  if (level === 'seed')
    return (
      `<ellipse cx="28" cy="80" rx="9" ry="2.8" fill="#a8774a"/><ellipse cx="28" cy="78.8" rx="3" ry="2" fill="#7a5230"/>` +
      `<path d="M28,78 q-1,-3 0,-5" fill="none" stroke="#3f9e5a" stroke-width="1.3" stroke-linecap="round"/>`
    )
  if (level === 'sprout')
    return (
      sway(
        `<path d="M28,80 L28,64" stroke="#3f9e5a" stroke-width="1.8" stroke-linecap="round"/>` +
          `<ellipse cx="23.5" cy="64" rx="5" ry="2.6" transform="rotate(-25 23.5 64)" fill="#7bd88f" stroke="#3f9e5a" stroke-width="0.7"/>` +
          `<ellipse cx="32.5" cy="64" rx="5" ry="2.6" transform="rotate(25 32.5 64)" fill="#7bd88f" stroke="#3f9e5a" stroke-width="0.7"/>`,
      ) + `<ellipse cx="28" cy="80" rx="8" ry="2.4" fill="#a8774a" opacity="0.8"/>`
    )
  if (level === 'sapling')
    return sway(
      `<path d="M26.5,80 L27.2,54 L29.2,54 L29.8,80 Z" fill="#a8774a" stroke="#7a5230" stroke-width="0.7"/>` +
        `<g fill="#7bd88f" stroke="#3f9e5a" stroke-width="0.8"><circle cx="22" cy="52" r="6.5"/><circle cx="34" cy="52" r="6.5"/><circle cx="28" cy="46" r="8"/></g>`,
    )
  return sway(
    `<path d="M25,80 L26,56 L30,56 L31,80 Z" fill="#a8774a" stroke="#7a5230" stroke-width="0.8"/>` +
      `<g fill="#7bd88f" stroke="#3f9e5a" stroke-width="0.8"><circle cx="19" cy="52" r="8.5"/><circle cx="37" cy="52" r="8.5"/><circle cx="28" cy="45" r="11"/><circle cx="29" cy="37" r="7"/></g>` +
      `<g fill="#ffc2dc"><circle cx="21" cy="48" r="1.7"/><circle cx="35" cy="46" r="1.7"/><circle cx="28" cy="40" r="1.7"/><circle cx="25" cy="55" r="1.5"/><circle cx="33" cy="55" r="1.5"/></g>`,
  )
}
// Where a fruit falls from on a tree still growing (a seed has nothing to fall from: the fruit is just there).
const GROWING_DROP: Record<Growing, [number, number] | undefined> = { seed: undefined, sprout: [28, 62], sapling: [28, 50], young: [28, 50] }

// The full tree's canopy: today's green for a plain tree (paler when its snacks are gone), a two-tone canopy in
// the two colours' soft tints for a twin tree, leaf clusters in soft rainbow tints for a rainbow tree.
const RAINBOW_LEAVES: [string, string][] = [
  ['#ffc4c4', '#e58e8e'],
  ['#ffd9ad', '#e0a868'],
  ['#ffeaa6', '#dcc062'],
  ['#aeeeb8', '#5fbf74'],
  ['#bde0fd', '#7fb3de'],
  ['#dccbff', '#a58ad8'],
]
const canopy = (kind: TreeKind, bare: boolean) => {
  const pale = (c: string) => (bare ? mixHex(c, '#ffffff', 0.35) : c)
  const circle = (cx: number, cy: number, r: number, fill: string, edge: string) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${pale(fill)}" stroke="${edge}" stroke-width="0.8"/>`
  if (kind.kind === 'twin' && kind.a && kind.b) {
    const A = FRUIT[kind.a]
    const B = FRUIT[kind.b]
    const id = `tw${kind.a}${kind.b}${bare ? 'p' : ''}`
    return (
      `<defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="0"><stop offset="0.3" stop-color="${pale(A.leaf)}"/><stop offset="0.7" stop-color="${pale(B.leaf)}"/></linearGradient>` +
      `<linearGradient id="${id}e" x1="0" y1="0" x2="1" y2="0"><stop offset="0.3" stop-color="${A.leafEdge}"/><stop offset="0.7" stop-color="${B.leafEdge}"/></linearGradient></defs>` +
      circle(16, 52, 10, A.leaf, A.leafEdge) +
      circle(40, 52, 10, B.leaf, B.leafEdge) +
      `<circle cx="28" cy="47" r="15" fill="url(#${id})" stroke="url(#${id}e)" stroke-width="0.8"/>` +
      `<circle cx="30" cy="36" r="10" fill="url(#${id})" stroke="url(#${id}e)" stroke-width="0.8"/>`
    )
  }
  if (kind.kind === 'rainbow') {
    const spots: [number, number, number][] = [
      [16, 52, 10],
      [40, 52, 10],
      [28, 47, 15],
      [30, 36, 10],
      [19, 40, 7],
      [39, 41, 7],
    ]
    return spots.map(([x, y, r], i) => circle(x, y, r, (RAINBOW_LEAVES[i] as [string, string])[0], (RAINBOW_LEAVES[i] as [string, string])[1])).join('')
  }
  const leaf = bare ? '#a3d9a5' : '#7bd88f'
  return `<g fill="${leaf}" stroke="#3f9e5a" stroke-width="0.8"><circle cx="16" cy="52" r="10"/><circle cx="40" cy="52" r="10"/><circle cx="28" cy="47" r="15"/><circle cx="30" cy="36" r="10"/></g>`
}

// The tree. `fruit`: a fruit falls from the tree and lands (fall), or lies on the ground (ground), in `color` (the
// fruit being eaten). `look` gives the full tree's kind and how ripe each colour's fruit is.
export const treeSvg = (level: TreeLevel, fruit?: 'fall' | 'ground', look?: TreeLook, color?: Color) => {
  const growing = level === 'seed' || level === 'sprout' || level === 'sapling' || level === 'young'
  const [gx, gy] = GROUND_FRUIT
  const from: [number, number] | undefined = growing ? GROWING_DROP[level] : color ? COLOR_SPOT[color] : FRUIT_SPOTS[0]
  const dropped = !fruit
    ? ''
    : fruit === 'ground' || !from
      ? fruitAt(gx, gy, color, DROP_K)
      : `<g><animateTransform attributeName="transform" type="translate" values="0 0;${(gx - from[0]) * 0.8} ${(gy - from[1]) * 0.9};${gx - from[0]} ${gy - from[1] - 6};${gx - from[0]} ${gy - from[1]};${gx - from[0]} ${gy - from[1] - 2};${gx - from[0]} ${gy - from[1]}" keyTimes="0;0.5;0.7;0.82;0.92;1" dur="1.5s" fill="freeze"/>${fruitAt(from[0], from[1], color, DROP_K)}</g>`
  const open = `<svg xmlns="http://www.w3.org/2000/svg" width="${TREE_W}" height="84" viewBox="0 0 ${TREE_W} 84">`
  if (growing) return `${open}${GRASS}${growingTree(level)}${dropped}</svg>`
  const kind: TreeKind = look ?? { kind: '' }
  const ripe = look?.ripe
  const fruits = ripe ? FRUIT_COLORS.map(k => branchFruit(k, ripe[k] ?? 0)).join('') : ''
  return (
    open +
    `<path d="M24,80 L25.5,58 L30.5,58 L32,80 Z" fill="#a8774a" stroke="#7a5230" stroke-width="0.8"/>` +
    GRASS +
    canopy(kind, level === 'bare') +
    `<path d="M18,44 q4,-4 8,-2 M32,40 q3,-3 6,-1" fill="none" stroke="#ffffff" stroke-opacity="0.55" stroke-width="1.2" stroke-linecap="round"/>` +
    fruits +
    dropped +
    `</svg>`
  )
}
