import { CLASSES, level, secondClass, classTier, classRanking, traitsOf } from './chao'
import type { ChaoSave, ChaoStats } from './chao'
import type { ClassName } from '../types'

// Auto-battles against corrupted omochao. Pure numbers and a text log; `events` carries what the band's
// fight picture plays back (fight.ts), with every unit's HP and statuses after each one.

export type Rng = () => number
export type Status = 'burn' | 'sleep' | 'guarded' | 'regen' | 'slow' | 'glitched' | 'bound'
export type Corruption = 'glitch' | 'error' | 'haywire' | 'bugged' | 'static' | 'tangled'

// Statuses in the order their icons sit over a head, and the letter each has in an event's snapshot.
export const STATUS_ORDER: Status[] = ['burn', 'sleep', 'guarded', 'regen', 'slow', 'glitched', 'bound']
export const STATUS_LETTER: Record<Status, string> = { burn: 'b', sleep: 'z', guarded: 'g', regen: 'r', slow: 'w', glitched: 'x', bound: 'n' }

// Each corruption: the class it is weak to (x1.5 damage) and strong against (x0.7), its big wound-up move,
// and the bit it drops when beaten.
export const CORRUPTIONS: Record<Corruption, { name: string; weak: ClassName[]; strong: ClassName; blurb: string; big: string; drop: string }> = {
  glitch: { name: 'Glitch omochao', weak: ['wizard'], strong: 'ranger', blurb: 'pink and cyan split; can scramble targets', big: 'Static Burst', drop: 'chip' },
  error: { name: 'Error omochao', weak: ['healer'], strong: 'warrior', blurb: 'grey, takes little damage but hits hard; crashes sometimes', big: 'Fatal Error', drop: 'button' },
  haywire: { name: 'Haywire omochao', weak: ['warrior'], strong: 'wizard', blurb: 'gets faster as it loses HP', big: 'Spin Out', drop: 'spring' },
  bugged: { name: 'Bugged omochao', weak: ['ranger'], strong: 'healer', blurb: 'calls small bug minions', big: 'Swarm', drop: 'shell' },
  static: { name: 'Static omochao', weak: ['wizard', 'ranger'], strong: 'warrior', blurb: 'dodges often, area moves hit it easily', big: 'White Noise', drop: 'spark' },
  tangled: { name: 'Tangled omochao', weak: ['warrior'], strong: 'ranger', blurb: 'can bind one chao so it cannot act', big: 'Wire Snare', drop: 'wire' },
}
export const KINDS = Object.keys(CORRUPTIONS) as Corruption[]

// Trophies a won fight leaves behind; the challenge of the day adds a star core.
export const ITEMS: Record<string, string> = {
  chip: 'Pixel chip',
  button: 'Button eye',
  spring: 'Spring',
  shell: 'Beetle shell',
  spark: 'Static spark',
  wire: 'Wire spool',
  core: 'Star core',
}

// What the band draws for a move.
export type Fx =
  | 'slash' | 'guard' | 'whirl' | 'spark' | 'fire' | 'charge' | 'meteor' | 'arrow' | 'volley' | 'pierce'
  | 'soothe' | 'lullaby' | 'chorus' | 'tackle' | 'cheer' | 'tap'
  | 'hit' | 'windup' | 'unleash' | 'bind' | 'bugs' | 'crash' | 'burn' | 'asleep' | 'stuck'
  // temperament and animal moves (1.6.0); 'glow' is Warm Heart at the start of a fight
  | 'glow' | 'rally' | 'bite' | 'swipe' | 'slide' | 'hop' | 'hug' | 'pounce' | 'count' | 'squawk' | 'ram'

type Skill = {
  name: string
  cls?: ClassName
  need: number
  kind: 'hit' | 'all' | 'multi' | 'heal' | 'healAll' | 'shield' | 'sleep' | 'burn' | 'slow' | 'bind' | 'rally' | 'squawk' | 'mimic'
  mult: number
  fx: Fx
  pierce?: boolean
  windup?: boolean
  cd: number
  // how much of its next move's meter it gets straight back (a quick move)
  fast?: number
  // from its temperament or its animals, not its class
  trait?: boolean
  // turns a sleep, slow or hold move lasts (sleep 2, slow 2, hold 1 if not given), and turns a burn lasts (3)
  nap?: number
  burns?: number
  // extra crit chance on this move, and whether it burns only when it crits (Shadow Bite)
  keen?: number
  critBurn?: boolean
  // only worth it on the omochao itself, not on a bug
  boss?: boolean
  // Swipe: may snatch an extra trophy
  snatch?: boolean
  // the word the fight log uses
  verb?: string
}

const SKILLS: Skill[] = [
  { name: 'Slash', cls: 'warrior', need: 1, kind: 'hit', mult: 1.1, fx: 'slash', cd: 0 },
  { name: 'Guard', cls: 'warrior', need: 6, kind: 'shield', mult: 0, fx: 'guard', cd: 4 },
  { name: 'Whirlwind', cls: 'warrior', need: 14, kind: 'all', mult: 0.9, fx: 'whirl', cd: 3 },
  { name: 'Spark', cls: 'wizard', need: 1, kind: 'hit', mult: 1.1, fx: 'spark', cd: 0 },
  { name: 'Starfire', cls: 'wizard', need: 6, kind: 'burn', mult: 0.8, fx: 'fire', cd: 3, verb: 'casts' },
  { name: 'Meteor', cls: 'wizard', need: 14, kind: 'all', mult: 2, fx: 'meteor', windup: true, cd: 5 },
  { name: 'Quick Shot', cls: 'ranger', need: 1, kind: 'hit', mult: 0.95, fx: 'arrow', fast: 25, cd: 0 },
  { name: 'Volley', cls: 'ranger', need: 6, kind: 'multi', mult: 0.55, fx: 'volley', cd: 3 },
  { name: 'Piercing Arrow', cls: 'ranger', need: 14, kind: 'hit', mult: 1.5, fx: 'pierce', pierce: true, cd: 3 },
  { name: 'Soothe', cls: 'healer', need: 1, kind: 'heal', mult: 1, fx: 'soothe', cd: 0 },
  { name: 'Lullaby', cls: 'healer', need: 6, kind: 'sleep', mult: 0, fx: 'lullaby', cd: 4 },
  { name: 'Healing Chorus', cls: 'healer', need: 14, kind: 'healAll', mult: 0.7, fx: 'chorus', cd: 4 },
]

// Skills from its temperament (a strong lean) and from the animals it wears and was given STACK_AT times (chao.ts traitsOf).
export const TRAIT_SKILLS: Record<string, Skill> = Object.fromEntries(
  (
    [
      { name: 'Rally', kind: 'rally', mult: 0.35, fx: 'rally', cd: 4 },
      { name: 'Shadow Bite', kind: 'burn', mult: 1, fx: 'bite', cd: 3, burns: 2, keen: 25, critBurn: true, verb: 'uses' },
      { name: 'Mimic', kind: 'mimic', mult: 0, fx: 'tap', cd: 3 },
      { name: 'Swipe', kind: 'hit', mult: 0.7, fx: 'swipe', cd: 3, boss: true, snatch: true },
      { name: 'Belly Slide', kind: 'slow', mult: 0.9, fx: 'slide', cd: 3, nap: 1 },
      { name: 'Hop Strike', kind: 'hit', mult: 0.8, fx: 'hop', cd: 2, fast: 35 },
      { name: 'Bear Hug', kind: 'bind', mult: 0.9, fx: 'hug', cd: 5, boss: true, nap: 1 },
      { name: 'Pounce', kind: 'hit', mult: 1.6, fx: 'pounce', cd: 4, boss: true },
      { name: 'Counting Sheep', kind: 'sleep', mult: 0, fx: 'count', cd: 5, nap: 1, verb: 'starts' },
      { name: 'Squawk', kind: 'squawk', mult: 0.45, fx: 'squawk', cd: 4 },
      { name: 'Charge', kind: 'hit', mult: 1.35, fx: 'ram', cd: 4, pierce: true, boss: true },
    ] as Omit<Skill, 'need' | 'trait'>[]
  ).map(s => [s.name, { ...s, need: 1, trait: true }]),
)

// A healer with nobody to heal taps the enemy; a chao without a class tackles (and cheers, if Swim is its best).
const TAP: Skill = { name: 'Tap', cls: 'healer', need: 1, kind: 'hit', mult: 0.6, fx: 'tap', cd: 0 }
const TACKLE: Skill = { name: 'Tackle', need: 1, kind: 'hit', mult: 0.85, fx: 'tackle', cd: 0 }
const CHEER: Skill = { name: 'Cheer', need: 1, kind: 'heal', mult: 0.7, fx: 'cheer', cd: 1 }

// A plain attack (no cooldown): what a chao does when none of its special moves fits right now.
const basic = (s: Skill) => s.kind === 'hit' && s.cd === 0
// Bad effects: healing moves clear them, and Woolly Coat makes them wear off sooner.
const BAD: Status[] = ['burn', 'slow', 'glitched', 'bound', 'sleep']

export type Unit = {
  id: string
  name: string
  side: 'team' | 'foe'
  cls?: ClassName
  corr?: Corruption
  hp: number
  max: number
  atk: number
  heal: number
  def: number
  spd: number
  luck: number
  meter: number
  st: Partial<Record<Status, number>>
  skills: Skill[]
  cd: Record<string, number>
  turns: number
  winding?: string
  minion?: boolean
  // traits (1.6.0): extra crit and dodge chance (percent), its passives by name, what it already used up this fight, and
  // how much its strong lean and animals add (a skill 1, a passive beyond its temperament's 0.5, a buff 0.25), which the
  // omochao grows with
  crit: number
  dodge: number
  pass: string[]
  used: Record<string, boolean>
  boost: number
}

// One hit (or heal) on one unit; `back` is what a boar's Tusks gave back to whoever hit it.
export type Hit = { id: string; n: number; crit?: boolean; miss?: boolean; weak?: boolean; resist?: boolean; heal?: boolean; back?: number }

// What the band plays back: who did what to whom, then every unit's HP and statuses (letters) after it,
// in the order of `Battle.units` (a bug called later is missing from the events before it came). `mimic`: a Mimic of
// that move; `snatch`: a Swipe that snatched a trophy.
export type BattleEvent = { actor: string; move: string; fx: Fx; targets: string[]; hits: Hit[]; status?: Status; hp: number[]; st: string[]; mimic?: boolean; snatch?: boolean }

export type BattleUnit = { id: string; name: string; side: 'team' | 'foe'; cls?: ClassName; corr?: Corruption; max: number; minion?: boolean; from: number }

export type Battle = {
  foe: Corruption
  hard: number
  challenge: boolean
  practice?: boolean
  won: boolean
  turns: number
  units: BattleUnit[]
  team: { id: string; name: string; cls?: ClassName; hp: number; max: number }[]
  log: string[]
  events: BattleEvent[]
  // who snatched an extra trophy with Swipe (paid out only if the fight is won)
  snatch?: string
  // set when the fight paid out (automatic fights only)
  reward?: string
  at?: number
}

const pick = <T>(rng: Rng, xs: T[]): T => xs[Math.floor(rng() * xs.length)] as T
const lv = (c: ChaoSave, k: keyof ChaoStats) => level(c.stats[k])

// The stat a chao fights with: its class's, or for a chao without a class the strongest class stat.
export const fightStat = (c: ChaoSave): keyof ChaoStats => CLASSES[c.cls?.main ?? classRanking(c)[0]?.[0] ?? 'warrior'].stat

// Its class's skills, the best one its second class lends it, then the skills from its temperament and animals.
export const skillsOf = (c: ChaoSave): Skill[] => {
  const traits = traitsOf(c).skills.map(n => TRAIT_SKILLS[n]).filter((s): s is Skill => !!s)
  if (!c.cls) return [...(classRanking(c)[0]?.[0] === 'healer' ? [TACKLE, CHEER] : [TACKLE]), ...traits]
  const main = SKILLS.filter(s => s.cls === c.cls!.main && lv(c, CLASSES[c.cls!.main].stat) >= s.need)
  const second = secondClass(c)
  const extra = second ? SKILLS.filter(s => s.cls === second && lv(c, CLASSES[second].stat) >= s.need).slice(-1) : []
  return [...main, ...extra, ...traits]
}

// Babies and children fight too, a little weaker than adults.
const STAGE_POWER: Partial<Record<ChaoSave['stage'], number>> = { baby: 0.7, child: 0.85, adult: 1 }

// Battle stats from what a chao already has, with its animals' small buffs on top.
export const unitOf = (c: ChaoSave): Unit => {
  const cls = c.cls?.main
  const grow = STAGE_POWER[c.stage] ?? 1
  const tier = (1 + 0.05 * classTier(c)) * grow
  const parts = Object.values(c.parts ?? {}).filter(Boolean).length
  const tr = traitsOf(c)
  const add = (k: 'hp' | 'atk' | 'heal' | 'def' | 'spd' | 'crit' | 'dodge') => tr.buffs.reduce((a, b) => a + (b[k] ?? 0), 0)
  const max = Math.round((30 + 4 * lv(c, 'stamina') + c.happiness / 4 + parts) * tier * (1 + add('hp')))
  const atkLv =
    cls === 'warrior' ? lv(c, 'power') : cls === 'wizard' ? lv(c, 'fly') : cls === 'ranger' ? lv(c, 'run') : cls === 'healer' ? lv(c, 'fly') : Math.max(lv(c, 'power'), lv(c, 'fly'), lv(c, 'run'))
  const passive = (k: keyof ChaoStats) => (lv(c, k) >= 5 ? 1 : 0)
  return {
    id: c.id,
    name: c.name,
    side: 'team',
    cls,
    hp: max,
    max,
    atk: Math.round((4 + 1.5 * atkLv + 2 * passive('power')) * tier * (1 + add('atk'))),
    heal: Math.round((4 + 1.5 * lv(c, 'swim') + 2 * passive('swim')) * grow * (1 + add('heal'))),
    def: 1 + Math.floor(lv(c, 'stamina') / 4) + passive('stamina') + add('def'),
    spd: 8 + lv(c, 'run') + 2 * passive('run') + add('spd'),
    luck: Math.min(30, Math.round(c.happiness / 10)),
    meter: 0,
    st: {},
    skills: skillsOf(c),
    cd: {},
    turns: 0,
    crit: add('crit') + (tr.passives.includes('Sharp Edge') ? 10 : 0),
    dodge: add('dodge'),
    pass: tr.passives,
    used: {},
    boost: tr.skills.length + 0.5 * (tr.passives.length - 1) + 0.25 * tr.buffs.length,
  }
}

// What an omochao or bug has of the traits: none.
const NO_TRAITS = () => ({ crit: 0, dodge: 0, pass: [] as string[], used: {} as Record<string, boolean>, boost: 0 })

// Who can fight: every hatched chao (not eggs or cocoons).
export const fighters = (chao: ChaoSave[]) => chao.filter(c => c.stage === 'baby' || c.stage === 'child' || c.stage === 'adult')

// Up to four chao that suit the enemy best: any locked in with /chao team first, then chao with a class,
// then class weakness (and not the class it is strong against), then level.
export const pickTeam = (chao: ChaoSave[], foe: Corruption, lock: string[] = []): ChaoSave[] =>
  fighters(chao)
    .map(c => ({
      c,
      score: (lock.includes(c.id) ? 1000 : 0) + (c.cls ? 200 : 0) + (c.cls && CORRUPTIONS[foe].weak.includes(c.cls.main) ? 100 : 0) - (c.cls && CORRUPTIONS[foe].strong === c.cls.main ? 50 : 0) + lv(c, fightStat(c)),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map(x => x.c)

// How strong an omochao is next to the team it meets (tuned on made-up teams).
// `boostHp` and `boostAtk`: how much bigger and stronger it comes for each point of the team's average trait boost
// (a strong lean's skill or an animal skill 1, an animal passive 0.5, a buff 0.25), so traits add variety more than ease.
// (1.6.0: hpPer 5.5 -> 5.7 for the temperament passives every chao now has and special moves no longer being skipped.)
export const TUNE = { hp: 40, hpPer: 5.7, atk: 5, atkPer: 1.05, spd: 0.75, spdPer: 0.1, weak: 1.6, strong: 0.6, maxEvents: 60, boostHp: 0.03, boostAtk: 0.05 }

export const makeFoe = (corr: Corruption, team: Unit[], hard: number): Unit => {
  const n = team.length
  const avg = team.reduce((s, u) => s + Math.max(u.atk, u.heal * 0.9), 0) / n
  const boost = team.reduce((s, u) => s + u.boost, 0) / n
  const hp = Math.round((TUNE.hp + avg * TUNE.hpPer * n) * hard * (corr === 'error' ? 0.8 : 1) * (1 + TUNE.boostHp * boost))
  const spd = team.reduce((s, x) => s + x.spd, 0) / n
  return {
    id: 'foe',
    name: CORRUPTIONS[corr].name,
    side: 'foe',
    corr,
    hp,
    max: hp,
    atk: Math.round((TUNE.atk + avg * TUNE.atkPer) * hard * (corr === 'error' ? 1.35 : 1) * (0.7 + 0.075 * n) * (1 + TUNE.boostAtk * boost)),
    heal: 0,
    def: corr === 'error' ? 3 : 1,
    spd: Math.round(spd * (TUNE.spd + TUNE.spdPer * n)),
    luck: corr === 'static' ? 40 : 5,
    meter: 0,
    st: {},
    skills: [],
    cd: {},
    turns: 0,
    ...NO_TRAITS(),
  }
}

const done = (us: Unit[], side: Unit['side']) => us.filter(u => u.side === side && u.hp > 0).length === 0

export type FightOptions = { foe?: Corruption; hard?: number; challenge?: boolean; lock?: string[] }

export const runBattle = (chao: ChaoSave[], rng: Rng, o: FightOptions = {}): Battle | undefined => {
  const kind = o.foe ?? pick(rng, KINDS)
  const hard = o.hard ?? 1
  const members = pickTeam(chao, kind, o.lock)
  if (!members.length) return undefined
  const team = members.map(unitOf)
  const foe = makeFoe(kind, team, hard)
  const us: Unit[] = [...team, foe]
  const from: Record<string, number> = {}
  const log: string[] = []
  const events: BattleEvent[] = []
  const fainted = new Set<string>()
  const alive = (side: Unit['side']) => us.filter(u => u.side === side && u.hp > 0)
  const weak = (a: Unit, d: Unit) => (a.cls && d.corr ? (CORRUPTIONS[d.corr].weak.includes(a.cls) ? TUNE.weak : CORRUPTIONS[d.corr].strong === a.cls ? TUNE.strong : 1) : 1)
  const tag = (u: Unit) => u.name + (u.cls ? ` (${CLASSES[u.cls].name.split(' ')[0]})` : '')
  // passives that speak up as they work (Adaptable, Second Wind) wait here and follow the move's own line
  const notes: string[] = []
  const say = (s: string) => {
    log.push(s, ...notes.splice(0))
  }
  // hits a move causes on top of its own (Tusks giving damage back), shown with the move
  const pend: Hit[] = []
  const emit = (e: Omit<BattleEvent, 'hp' | 'st'>) => {
    events.push({
      ...e,
      hits: [...e.hits, ...pend.splice(0)],
      hp: us.map(u => u.hp),
      st: us.map(u => STATUS_ORDER.filter(s => u.st[s]).map(s => STATUS_LETTER[s]).join('')),
    })
  }
  const has = (u: Unit, passive: string) => u.pass.includes(passive)
  const setSt = (u: Unit, s: Status, t: number) => {
    // Woolly Coat: bad effects wear off a turn sooner (never less than a turn)
    if (BAD.includes(s) && has(u, 'Woolly Coat')) t = Math.max(1, t - 1)
    u.st[s] = Math.max(u.st[s] ?? 0, t)
  }
  // Bright Song: while a chao with it is up, the team's heals are bigger
  const song = () => (team.some(t => t.hp > 0 && has(t, 'Bright Song')) ? 1.15 : 1)
  // which foe a Neutral chao has learned (Adaptable): the omochao, or the bugs as one
  const foeKey = (a: Unit) => (a.minion ? 'bug' : a.id)

  const guardOn = () => team.some(u => u.hp > 0 && u.st.guarded)
  const hurt = (a: Unit, d: Unit, mult: number, pierce = false, area = false): Hit => {
    if (d.corr === 'static' && !area && rng() * 100 < d.luck) return { id: d.id, n: 0, miss: true }
    if (d.side === 'team' && rng() * 100 < d.luck + d.dodge) {
      // Sneaky: a dodge gets its next move sooner
      if (has(d, 'Sneaky')) d.meter += 25
      return { id: d.id, n: 0, miss: true }
    }
    const w = weak(a, d)
    const crit = a.side === 'team' && rng() * 100 < a.luck + a.crit
    let dmg = a.atk * mult * w
    dmg = Math.max(1, dmg - (pierce ? 0 : d.def * 0.5))
    if (d.corr === 'error') dmg *= 0.6
    if (d.corr === 'static' && area) dmg *= 1.5
    if (d.side === 'team' && guardOn()) dmg *= 0.5
    if (crit) dmg *= 1.5
    if (has(a, 'Finisher') && d.hp < d.max / 2) dmg *= 1.15
    // the omochao's unleashed big move is the only area move coming from its side
    if (area && a.side === 'foe' && has(d, 'Thick Down')) dmg *= 0.85
    const learned = has(d, 'Adaptable') && a.side === 'foe'
    if (learned && d.used[`adapt:${foeKey(a)}`]) dmg *= 0.9
    const n = Math.max(1, Math.round(dmg))
    d.hp = Math.max(0, d.hp - n)
    const h: Hit = { id: d.id, n }
    if (crit) h.crit = true
    if (w > 1) h.weak = true
    if (w < 1) h.resist = true
    if (learned && !d.used[`adapt:${foeKey(a)}`] && d.hp > 0) {
      d.used[`adapt:${foeKey(a)}`] = true
      notes.push(`  ${d.name} is Adaptable: it learns the ${a.minion ? 'bugs' : a.name}'s moves and takes 10% less from them now.`)
    }
    if (has(d, 'Second Wind') && !d.used.wind && d.hp > 0 && d.hp < d.max / 3) {
      d.used.wind = true
      setSt(d, 'regen', 3)
      notes.push(`  ${d.name} gets a Second Wind: Regen!`)
    }
    // Tusks: whoever hits it up close takes a little back
    if (has(d, 'Tusks') && a.side === 'foe' && a.hp > 0) {
      const back = Math.max(1, Math.round(n * 0.1))
      a.hp = Math.max(0, a.hp - back)
      h.back = back
      pend.push({ id: a.id, n: back })
    }
    return h
  }
  const shown = (h: Hit) => (h.miss ? 'dodged' : `${h.n}${h.crit ? '!' : ''}${h.weak ? ' (weak)' : h.resist ? ' (resisted)' : ''}${h.back ? ` (Tusks: ${h.back} back)` : ''}`)
  const nameOf = (id: string) => us.find(u => u.id === id)?.name ?? id
  // the last special move a chao used (what Mimic copies), and who snatched an extra trophy with Swipe
  let lastMove: { s: Skill; by: string } | undefined
  let snatcher = ''
  // Each time the omochao is slowed, held or put to sleep, it gets better at shaking the next one off (25% more each
  // time), so the team can't keep it still all fight. Returns whether it took hold.
  const held: Record<string, number> = {}
  const control = (d: Unit, s: Status, t: number): boolean => {
    if (d.side === 'foe' && !d.minion) {
      const n = held[d.id] ?? 0
      if (rng() < 0.25 * n) {
        notes.push(`  The ${d.name} shrugs it off!`)
        return false
      }
      held[d.id] = n + 1
    }
    setSt(d, s, t)
    return true
  }

  const act = (u: Unit) => {
    const foes = alive(u.side === 'team' ? 'foe' : 'team')
    let tgt = (u.side === 'team' ? foes.slice().sort((a, b) => a.hp - b.hp)[0] : pick(rng, foes)) as Unit
    if (u.st.glitched) {
      tgt = pick(rng, us.filter(x => x.hp > 0))
      say(`  ${tag(u)} is Glitched and aims at ${tag(tgt)}!`)
    }

    // ---- bugs: a nibble
    if (u.minion) {
      const h = hurt(u, tgt, 1)
      emit({ actor: u.id, move: 'Nibble', fx: 'hit', targets: [tgt.id], hits: [h] })
      return say(`  A Bug nibbles ${tgt.name}: ${shown(h)}`)
    }

    // ---- enemy
    if (u.side === 'foe') {
      const k = u.corr ?? 'glitch'
      if (u.winding) {
        const hit = alive('team')
        const hits = hit.map(t => hurt(u, t, 1.8, false, true))
        say(`${u.name} unleashes ${u.winding}: ${hits.map(h => `${nameOf(h.id)} ${shown(h)}`).join(', ')}`)
        emit({ actor: u.id, move: u.winding, fx: 'unleash', targets: hit.map(t => t.id), hits })
        u.winding = undefined
        return
      }
      if (u.turns % 4 === 3) {
        u.winding = CORRUPTIONS[k].big
        say(`${u.name} winds up ${u.winding}...`)
        emit({ actor: u.id, move: u.winding, fx: 'windup', targets: [], hits: [] })
        return
      }
      if (k === 'error' && rng() < 0.2) {
        emit({ actor: u.id, move: 'Crash', fx: 'crash', targets: [], hits: [] })
        return say(`${u.name} crashes and does nothing this turn.`)
      }
      if (k === 'bugged' && u.turns % 3 === 2 && us.filter(x => x.minion && x.hp > 0).length < 2) {
        const hp = 6 + Math.round(u.atk)
        const id = `bug${u.turns}`
        us.push({ id, name: 'Bug', side: 'foe', hp, max: hp, atk: Math.max(2, Math.round(u.atk * 0.4)), heal: 0, def: 0, spd: u.spd + 2, luck: 5, meter: 0, st: {}, skills: [], cd: {}, turns: 0, minion: true, ...NO_TRAITS() })
        from[id] = events.length
        emit({ actor: u.id, move: 'Call Bugs', fx: 'bugs', targets: [id], hits: [] })
        return say(`${u.name} calls a Bug.`)
      }
      if (k === 'tangled' && u.turns % 3 === 1 && tgt && !tgt.st.bound && tgt.side === 'team') {
        setSt(tgt, 'bound', 2)
        emit({ actor: u.id, move: 'Bind', fx: 'bind', targets: [tgt.id], hits: [], status: 'bound' })
        return say(`${u.name} binds ${tag(tgt)} in wires!`)
      }
      const h = hurt(u, tgt, 1)
      let status: Status | undefined
      if (!h.miss && tgt.hp > 0 && tgt.side === 'team') {
        if (k === 'glitch' && rng() < 0.3) status = 'glitched'
        if (k === 'tangled' && rng() < 0.3) status = 'slow'
        if (status) setSt(tgt, status, 2)
      }
      emit({ actor: u.id, move: 'Hit', fx: 'hit', targets: [tgt.id], hits: [h], status })
      say(`${u.name} hits ${tgt.name}: ${shown(h)}`)
      if (status === 'glitched') say(`  ${tgt.name} is Glitched.`)
      if (status === 'slow') say(`  ${tgt.name} is Slowed.`)
      return
    }

    // ---- team: a wound-up Meteor falls now
    if (u.winding) {
      const hit = alive('foe')
      const hits = hit.map(t => hurt(u, t, 2, false, true))
      say(`${tag(u)} calls down ${u.winding}: ${hits.map(h => `${nameOf(h.id)} ${shown(h)}`).join(', ')}`)
      emit({ actor: u.id, move: u.winding, fx: 'meteor', targets: hit.map(t => t.id), hits })
      u.winding = undefined
      return
    }

    // ---- team: the AI picks a move. Special moves come first: its class's own (best first), then its temperament's
    // and animals' skills, then the one its second class lends it, each only when its test says it fits right now.
    // A plain attack (no cooldown) never stands in their way: it is what it does when none of them fits.
    const rdy = u.skills.filter(s => !u.cd[s.name])
    const ready = [
      ...rdy.filter(s => s.cls === u.cls && !s.trait && !basic(s)).reverse(),
      ...rdy.filter(s => s.trait),
      ...rdy.filter(s => s.cls !== u.cls && !s.trait && !basic(s)),
    ]
    const mates = alive('team')
    const lowest = mates.slice().sort((a, b) => a.hp / a.max - b.hp / b.max)[0] ?? u
    const hurtCount = mates.filter(x => x.hp / x.max < 0.6).length
    const sickCount = mates.filter(x => x.st.burn || x.st.slow || x.st.glitched || x.st.bound).length
    const onFoe = tgt.side === 'foe'
    const fits = (c: Skill): boolean =>
      c.kind === 'heal' ? lowest.hp / lowest.max < 0.55 :
      c.kind === 'healAll' ? hurtCount >= 2 || sickCount >= 2 :
      c.kind === 'shield' ? !guardOn() :
      c.kind === 'sleep' ? onFoe && !tgt.minion && !tgt.st.sleep && !tgt.st.bound && tgt.hp / tgt.max > 0.3 :
      c.kind === 'burn' ? !!c.critBurn || !tgt.st.burn :
      c.kind === 'slow' ? onFoe && !tgt.st.slow :
      c.kind === 'bind' ? onFoe && !tgt.minion && !tgt.st.bound && !tgt.st.sleep :
      c.kind === 'rally' ? sickCount >= 1 || hurtCount >= 2 :
      c.kind === 'squawk' ? hurtCount >= 2 || lowest.hp / lowest.max < 0.4 :
      c.kind === 'mimic' ? !!lastMove && lastMove.by !== u.id && fits(lastMove.s) :
      c.boss ? onFoe && !tgt.minion :
      true
    let s: Skill | undefined = ready.find(fits)
    s ??= rdy.find(c => basic(c) && c.cls === u.cls) ?? rdy.find(basic) ?? TAP
    u.cd[s.name] = s.cd + 1
    // Mimic: it does the move a teammate just did, as strong as the better of the two of them (Mimic's cooldown, not
    // the move's); a copied Meteor falls with the copier's own strength
    let mimic = false
    let p = u
    if (s.kind === 'mimic' && lastMove) {
      const by = us.find(x => x.id === lastMove!.by)
      say(`${tag(u)} uses Mimic: it copies ${nameOf(lastMove.by)}'s ${lastMove.s.name}!`)
      s = lastMove.s
      mimic = true
      if (by) p = { ...u, atk: Math.max(u.atk, by.atk), heal: Math.max(u.heal, by.heal) }
    } else if (!basic(s) && s.kind !== 'mimic') lastMove = { s, by: u.id }
    if (s.windup) {
      u.winding = s.name
      emit({ actor: u.id, move: s.name, fx: 'charge', targets: [], hits: [], mimic })
      return say(`${tag(u)} gathers starlight for ${s.name}...`)
    }
    const aim = tgt
    const verb = s.verb ?? 'uses'
    switch (s.kind) {
      case 'hit': {
        const h = hurt(p, aim, s.mult, s.pierce)
        say(`${tag(u)} ${verb} ${s.name} on ${aim.name}: ${shown(h)}`)
        // Swipe: a paw that lands on the omochao may come back with a bit of it (once a fight)
        let snatch = false
        if (s.snatch && !h.miss && !aim.minion && !snatcher && rng() < 0.35) {
          snatcher = u.name
          snatch = true
          say(`  ${u.name} snatches a ${ITEMS[CORRUPTIONS[kind].drop]}! (an extra trophy if the team wins)`)
        }
        emit({ actor: u.id, move: s.name, fx: s.fx, targets: [aim.id], hits: [h], mimic, snatch })
        if (s.fast) u.meter += s.fast
        break
      }
      case 'multi': {
        const hs = [0, 1, 2].map(() => hurt(p, aim, s.mult, s.pierce))
        say(`${tag(u)} fires ${s.name} at ${aim.name}: ${hs.map(h => (h.miss ? 'miss' : shown(h))).join(' + ')}`)
        emit({ actor: u.id, move: s.name, fx: s.fx, targets: [aim.id], hits: hs, mimic })
        break
      }
      case 'all': {
        const hit = alive('foe')
        const hs = hit.map(t => hurt(p, t, s.mult, s.pierce, true))
        say(`${tag(u)} uses ${s.name}: ${hs.map(h => `${nameOf(h.id)} ${shown(h)}`).join(', ')}`)
        emit({ actor: u.id, move: s.name, fx: s.fx, targets: hit.map(t => t.id), hits: hs, mimic })
        break
      }
      case 'burn': {
        const h = hurt(s.keen ? { ...p, crit: p.crit + s.keen } : p, aim, s.mult)
        // Starfire always sets it burning; a Shadow Bite only when it crits
        const lit = !h.miss && aim.hp > 0 && (!s.critBurn || !!h.crit)
        if (lit) setSt(aim, 'burn', s.burns ?? 3)
        say(`${tag(u)} ${s.verb ?? 'casts'} ${s.name} on ${aim.name}: ${h.miss ? 'dodged' : shown(h) + (lit ? ', burning' : '')}`)
        emit({ actor: u.id, move: s.name, fx: s.fx, targets: [aim.id], hits: [h], status: lit ? 'burn' : undefined, mimic })
        break
      }
      case 'slow': {
        const h = hurt(p, aim, s.mult)
        const took = !h.miss && aim.hp > 0 && control(aim, 'slow', s.nap ?? 2)
        say(`${tag(u)} ${verb} ${s.name} on ${aim.name}: ${h.miss ? 'dodged' : shown(h) + (took ? ', slowed' : '')}`)
        emit({ actor: u.id, move: s.name, fx: s.fx, targets: [aim.id], hits: [h], status: took ? 'slow' : undefined, mimic })
        break
      }
      case 'bind': {
        const h = hurt(p, aim, s.mult)
        const took = !h.miss && aim.hp > 0 && control(aim, 'bound', s.nap ?? 1)
        say(`${tag(u)} ${verb} ${s.name} on ${aim.name}: ${h.miss ? 'dodged' : shown(h) + (took ? ', held still for a turn' : '')}`)
        emit({ actor: u.id, move: s.name, fx: s.fx, targets: [aim.id], hits: [h], status: took ? 'bound' : undefined, mimic })
        break
      }
      case 'heal': {
        const n = Math.max(1, Math.round(p.heal * s.mult * song()))
        lowest.hp = Math.min(lowest.max, lowest.hp + n)
        say(`${tag(u)} uses ${s.name} on ${lowest.name}: +${n} HP`)
        emit({ actor: u.id, move: s.name, fx: s.fx, targets: [lowest.id], hits: [{ id: lowest.id, n, heal: true }], mimic })
        break
      }
      case 'healAll': {
        const n = Math.round(p.heal * s.mult * 1.2 * song())
        for (const t of mates) {
          t.hp = Math.min(t.max, t.hp + n)
          for (const b of ['burn', 'slow', 'glitched', 'bound'] as Status[]) delete t.st[b]
          setSt(t, 'regen', 2)
        }
        say(`${tag(u)} sings ${s.name}: everyone +${n} HP, bad effects cleared`)
        emit({ actor: u.id, move: s.name, fx: s.fx, targets: mates.map(t => t.id), hits: mates.map(t => ({ id: t.id, n, heal: true })), status: 'regen', mimic })
        break
      }
      case 'rally': {
        // a little HP for everyone, bad effects gone, and the others get their next move sooner
        const n = Math.max(1, Math.round(p.heal * s.mult * song()))
        for (const t of mates) {
          t.hp = Math.min(t.max, t.hp + n)
          for (const b of ['burn', 'slow', 'glitched', 'bound'] as Status[]) delete t.st[b]
          if (t !== u) t.meter += 30
        }
        say(`${tag(u)} calls a ${s.name}: everyone +${n} HP, bad effects cleared, the team moves sooner`)
        emit({ actor: u.id, move: s.name, fx: s.fx, targets: mates.map(t => t.id), hits: mates.map(t => ({ id: t.id, n, heal: true })), mimic })
        break
      }
      case 'squawk': {
        const n = Math.max(1, Math.round(p.heal * s.mult * song()))
        for (const t of mates) t.hp = Math.min(t.max, t.hp + n)
        say(`${tag(u)} lets out a ${s.name}: everyone +${n} HP`)
        emit({ actor: u.id, move: s.name, fx: s.fx, targets: mates.map(t => t.id), hits: mates.map(t => ({ id: t.id, n, heal: true })), mimic })
        break
      }
      case 'shield': {
        for (const t of mates) setSt(t, 'guarded', 2)
        say(`${tag(u)} raises ${s.name}: the party is shielded`)
        emit({ actor: u.id, move: s.name, fx: s.fx, targets: mates.map(t => t.id), hits: [], status: 'guarded', mimic })
        break
      }
      case 'sleep': {
        const nap = s.nap ?? 2
        const took = control(aim, 'sleep', nap)
        if (took) aim.winding = undefined
        say(`${tag(u)} ${s.verb ?? 'sings'} ${s.name}${took ? `: ${aim.name} falls asleep${nap === 1 ? ' for a turn' : ''}` : ` at ${aim.name}`}`)
        emit({ actor: u.id, move: s.name, fx: s.fx, targets: [aim.id], hits: [], status: took ? 'sleep' : undefined, mimic })
        break
      }
    }
  }

  // Start of a unit's turn: burn, regen, then sleep / bound skip it. Returns whether it can act.
  const startTurn = (u: Unit): boolean => {
    if (u.st.burn) {
      const n = Math.max(1, Math.round(u.max * 0.06))
      u.hp = Math.max(0, u.hp - n)
      say(`  ${u.name} burns: -${n}`)
      emit({ actor: u.id, move: 'Burn', fx: 'burn', targets: [u.id], hits: [{ id: u.id, n }] })
    }
    if (u.st.regen && u.hp > 0) {
      const n = Math.max(1, Math.round(u.max * 0.05))
      u.hp = Math.min(u.max, u.hp + n)
    }
    let can = u.hp > 0
    if (can && (u.st.sleep || u.st.bound)) {
      say(`  ${u.name} is ${u.st.sleep ? 'asleep' : u.side === 'foe' ? 'held tight' : 'tangled in wires'} and cannot act.`)
      emit({ actor: u.id, move: u.st.sleep ? 'Asleep' : 'Bound', fx: u.st.sleep ? 'asleep' : 'stuck', targets: [], hits: [] })
      can = false
    }
    for (const k of Object.keys(u.st) as Status[]) {
      u.st[k]! -= 1
      if (u.st[k]! <= 0) delete u.st[k]
    }
    for (const k of Object.keys(u.cd)) if ((u.cd[k] ?? 0) > 0) u.cd[k]! -= 1
    return can
  }

  // Says who has just run out of HP: chao faint (they are only tired), omochao wind down.
  const faints = () => {
    for (const u of us)
      if (u.hp <= 0 && !fainted.has(u.id)) {
        fainted.add(u.id)
        say(u.side === 'team' ? `  ${u.name} faints (just tired).` : u.minion ? '  The Bug pops.' : `  ${u.name} winds down...`)
      }
  }

  const weakTo = CORRUPTIONS[kind].weak.map(w => CLASSES[w].name.split(' ')[0]).join(' or ')
  if (o.challenge) say(`★ Challenge of the day ★`)
  say(`A ${foe.name} appears (${CORRUPTIONS[kind].blurb}). Weak to ${weakTo}, strong against ${CLASSES[CORRUPTIONS[kind].strong].name.split(' ')[0]}.`)
  say(`Team: ${team.map(tag).join(', ')}`)
  const extras = (t: Unit) => [...t.pass, ...t.skills.filter(s => s.trait).map(s => s.name)]
  say(`Traits: ${team.map(t => `${t.name}: ${extras(t).join(', ')}`).join(' · ')}`)

  // ---- passives that work before the first move
  const heart = team.find(t => has(t, 'Warm Heart'))
  if (heart) {
    for (const t of team) setSt(t, 'regen', 2)
    say(`${heart.name}'s Warm Heart: the whole team starts with Regen.`)
    emit({ actor: heart.id, move: 'Warm Heart', fx: 'glow', targets: team.map(t => t.id), hits: [], status: 'regen' })
  }
  for (const t of team)
    if (has(t, 'Head Start')) {
      t.meter = 50
      say(`${t.name} gets a Head Start.`)
    }

  let turns = 0
  while (!done(us, 'team') && !done(us, 'foe') && events.length < TUNE.maxEvents && turns < 400) {
    // fill the meters until someone is full
    const full = us.filter(u => u.hp > 0 && u.meter >= 100).sort((a, b) => b.meter - a.meter)[0]
    if (!full) {
      for (const u of us.filter(x => x.hp > 0)) {
        let s = u.spd * (u.st.slow ? 0.5 : 1)
        if (u.corr === 'haywire') s *= 1 + (1 - u.hp / u.max)
        u.meter += s
      }
      continue
    }
    full.meter -= 100
    turns++
    if (startTurn(full) && full.hp > 0) {
      act(full)
      full.turns++
    }
    faints()
  }

  const won = done(us, 'foe') && !done(us, 'team')
  // A fight that drags on ends when the omochao's wind-up key runs down: nobody wins.
  say(
    won
      ? `The team wins in ${turns} turns!`
      : done(us, 'team')
        ? `The team is tired out after ${turns} turns and goes home to rest.`
        : `The ${foe.name}'s wind-up key runs down and it toddles away. A draw.`,
  )
  return {
    foe: kind,
    hard,
    challenge: !!o.challenge,
    won,
    turns,
    units: us.map(u => ({ id: u.id, name: u.name, side: u.side, cls: u.cls, corr: u.corr, max: u.max, minion: u.minion, from: from[u.id] ?? 0 })),
    team: team.map(t => ({ id: t.id, name: t.name, cls: t.cls, hp: t.hp, max: t.max })),
    log,
    events,
    ...(snatcher ? { snatch: snatcher } : {}),
  }
}

// ---- Rewards and the fight record ----

// Kept in $.store under 'battle': when the last fight was (for the cooldown), wins and losses, the day the
// challenge was last met, the trophies found, who /chao team keeps in front, and the wild omochao count:
// messages since the last fight, how many the next one needs (0: not picked yet), and about how many apart
// they come (/chao fight every <n>).
export type BattleSave = { last: number; wins: number; losses: number; challengeDay: string; items: Record<string, number>; lock: string[]; since: number; due: number; every: number }

// A wild omochao wanders in about every this many messages.
export const WILD_EVERY = 12

export const normalizeBattleSave = (v: unknown): BattleSave => {
  const o = (v && typeof v === 'object' ? v : {}) as Partial<BattleSave>
  return {
    last: Number(o.last) || 0,
    wins: Number(o.wins) || 0,
    losses: Number(o.losses) || 0,
    challengeDay: typeof o.challengeDay === 'string' ? o.challengeDay : '',
    items: o.items && typeof o.items === 'object' ? { ...o.items } : {},
    lock: Array.isArray(o.lock) ? o.lock.map(String).slice(0, 4) : [],
    since: Math.max(0, Number(o.since) || 0),
    due: Math.max(0, Number(o.due) || 0),
    every: Math.min(100, Math.max(3, Number(o.every) || WILD_EVERY)),
  }
}

const STAT_NAME: Record<keyof ChaoStats, string> = { swim: 'Swim', fly: 'Fly', run: 'Run', power: 'Power', stamina: 'Stamina' }

// Pays out an automatic fight: a win trains each fighter's fighting stat and Stamina and makes it happier,
// and leaves the omochao's bit behind (a challenge pays double and adds a star core). A lost fight still
// teaches a little. Returns the line the log shows.
export const reward = (chao: ChaoSave[], b: Battle, save: BattleSave): string => {
  const k = b.challenge ? 2 : 1
  const gains: string[] = []
  for (const t of b.team) {
    const c = chao.find(o => o.id === t.id)
    if (!c) continue
    const stat = fightStat(c)
    if (b.won) {
      c.stats[stat] += 4 * k
      c.stats.stamina += 2 * k
      c.happiness = Math.min(100, c.happiness + 4 * k)
      gains.push(`${c.name} +${4 * k} ${STAT_NAME[stat]}`)
    } else {
      c.stats[stat] += 1
      gains.push(`${c.name} +1 ${STAT_NAME[stat]}`)
    }
  }
  if (!b.won) {
    if (b.team.every(t => t.hp <= 0)) save.losses++
    return `Practice for next time: ${gains.join(', ')}.`
  }
  save.wins++
  // a raccoon's Swipe may have snatched a second one of the omochao's bits
  const drop = CORRUPTIONS[b.foe].drop
  const found = [drop, ...(b.snatch ? [drop] : []), ...(b.challenge ? ['core'] : [])]
  for (const it of found) save.items[it] = (save.items[it] ?? 0) + 1
  const named = [`${ITEMS[drop]}${b.snatch ? ` ×2 (${b.snatch} swiped one)` : ''}`, ...(b.challenge ? [ITEMS.core] : [])]
  return `Rewards: ${gains.join(', ')}, everyone +${2 * k} Stamina and +${4 * k} happiness. Found: ${named.join(' and ')}.`
}

export const trophies = (save: BattleSave) =>
  Object.entries(save.items)
    .filter(([, n]) => n > 0)
    .map(([k, n]) => `${ITEMS[k] ?? k} ×${n}`)
    .join(', ')

// ---- The challenge of the day ----

export const dayOf = (now: number) => {
  const d = new Date(now)
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}

// Days since the last new moon (0 to 29.5), worked out from the date: no web call.
export const moonAge = (now: number) => {
  const SYNODIC = 29.530588853
  const known = Date.UTC(2000, 0, 6, 18, 14)
  const age = ((now - known) / 86400000) % SYNODIC
  return age < 0 ? age + SYNODIC : age
}

// A long chat, in messages sent.
export const LONG_CHAT = 50

// Why a tougher omochao is waiting today, or '' when it isn't: late at night, a new moon, or a very long chat.
// Once a day: after it is met, it waits for tomorrow.
export const challengeWhy = (now: number, grown: number, save: BattleSave): string => {
  if (save.challengeDay === dayOf(now)) return ''
  const hour = new Date(now).getHours()
  const moon = moonAge(now)
  if (hour >= 23 || hour < 5) return 'late night'
  if (moon < 1.5 || moon > 28) return 'new moon'
  if (grown >= LONG_CHAT) return 'long chat'
  return ''
}

// The day's challenger is the same all day.
export const challengerOf = (now: number): Corruption => {
  let h = 7
  for (const ch of dayOf(now)) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return KINDS[h % KINDS.length] ?? 'glitch'
}

// A fight with its numbers, for /chao fight.
export const fightText = (b: Battle) =>
  [
    ...(b.practice ? ['(practice fight: no rewards)'] : []),
    ...b.log,
    '',
    `After the fight: ${b.team.map(t => `${t.name} ${t.hp}/${t.max}`).join(', ')}`,
    ...(b.reward ? [b.reward] : []),
  ].join('\n')

// What /chao fight keeps of the last fight: the text, not the playback.
export const slim = (b: Battle): Battle => ({ ...b, events: [], units: [] })
