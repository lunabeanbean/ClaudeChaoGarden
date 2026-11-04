import { CLASSES, level, secondClass, classTier, classRanking } from './chao'
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

type Skill = {
  name: string
  cls?: ClassName
  need: number
  kind: 'hit' | 'all' | 'multi' | 'heal' | 'healAll' | 'shield' | 'sleep' | 'burn'
  mult: number
  fx: Fx
  pierce?: boolean
  windup?: boolean
  cd: number
  fast?: boolean
}

const SKILLS: Skill[] = [
  { name: 'Slash', cls: 'warrior', need: 1, kind: 'hit', mult: 1.1, fx: 'slash', cd: 0 },
  { name: 'Guard', cls: 'warrior', need: 6, kind: 'shield', mult: 0, fx: 'guard', cd: 4 },
  { name: 'Whirlwind', cls: 'warrior', need: 14, kind: 'all', mult: 0.9, fx: 'whirl', cd: 3 },
  { name: 'Spark', cls: 'wizard', need: 1, kind: 'hit', mult: 1.1, fx: 'spark', cd: 0 },
  { name: 'Starfire', cls: 'wizard', need: 6, kind: 'burn', mult: 0.8, fx: 'fire', cd: 3 },
  { name: 'Meteor', cls: 'wizard', need: 14, kind: 'all', mult: 2, fx: 'meteor', windup: true, cd: 5 },
  { name: 'Quick Shot', cls: 'ranger', need: 1, kind: 'hit', mult: 0.95, fx: 'arrow', fast: true, cd: 0 },
  { name: 'Volley', cls: 'ranger', need: 6, kind: 'multi', mult: 0.55, fx: 'volley', cd: 3 },
  { name: 'Piercing Arrow', cls: 'ranger', need: 14, kind: 'hit', mult: 1.5, fx: 'pierce', pierce: true, cd: 3 },
  { name: 'Soothe', cls: 'healer', need: 1, kind: 'heal', mult: 1, fx: 'soothe', cd: 0 },
  { name: 'Lullaby', cls: 'healer', need: 6, kind: 'sleep', mult: 0, fx: 'lullaby', cd: 4 },
  { name: 'Healing Chorus', cls: 'healer', need: 14, kind: 'healAll', mult: 0.7, fx: 'chorus', cd: 4 },
]

// A healer with nobody to heal taps the enemy; a chao without a class tackles (and cheers, if Swim is its best).
const TAP: Skill = { name: 'Tap', cls: 'healer', need: 1, kind: 'hit', mult: 0.6, fx: 'tap', cd: 0 }
const TACKLE: Skill = { name: 'Tackle', need: 1, kind: 'hit', mult: 0.85, fx: 'tackle', cd: 0 }
const CHEER: Skill = { name: 'Cheer', need: 1, kind: 'heal', mult: 0.7, fx: 'cheer', cd: 1 }

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
}

// One hit (or heal) on one unit.
export type Hit = { id: string; n: number; crit?: boolean; miss?: boolean; weak?: boolean; resist?: boolean; heal?: boolean }

// What the band plays back: who did what to whom, then every unit's HP and statuses (letters) after it,
// in the order of `Battle.units` (a bug called later is missing from the events before it came).
export type BattleEvent = { actor: string; move: string; fx: Fx; targets: string[]; hits: Hit[]; status?: Status; hp: number[]; st: string[] }

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
  // set when the fight paid out (automatic fights only)
  reward?: string
  at?: number
}

const pick = <T>(rng: Rng, xs: T[]): T => xs[Math.floor(rng() * xs.length)] as T
const lv = (c: ChaoSave, k: keyof ChaoStats) => level(c.stats[k])

// The stat a chao fights with: its class's, or for a chao without a class the strongest class stat.
export const fightStat = (c: ChaoSave): keyof ChaoStats => CLASSES[c.cls?.main ?? classRanking(c)[0]?.[0] ?? 'warrior'].stat

export const skillsOf = (c: ChaoSave): Skill[] => {
  if (!c.cls) return classRanking(c)[0]?.[0] === 'healer' ? [TACKLE, CHEER] : [TACKLE]
  const main = SKILLS.filter(s => s.cls === c.cls!.main && lv(c, CLASSES[c.cls!.main].stat) >= s.need)
  const second = secondClass(c)
  const extra = second ? SKILLS.filter(s => s.cls === second && lv(c, CLASSES[second].stat) >= s.need).slice(-1) : []
  return [...main, ...extra]
}

// Babies and children fight too, a little weaker than adults.
const STAGE_POWER: Partial<Record<ChaoSave['stage'], number>> = { baby: 0.7, child: 0.85, adult: 1 }

// Battle stats from what a chao already has.
export const unitOf = (c: ChaoSave): Unit => {
  const cls = c.cls?.main
  const grow = STAGE_POWER[c.stage] ?? 1
  const tier = (1 + 0.05 * classTier(c)) * grow
  const parts = Object.values(c.parts ?? {}).filter(Boolean).length
  const max = Math.round((30 + 4 * lv(c, 'stamina') + c.happiness / 4 + parts) * tier)
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
    atk: Math.round((4 + 1.5 * atkLv + 2 * passive('power')) * tier),
    heal: Math.round((4 + 1.5 * lv(c, 'swim') + 2 * passive('swim')) * grow),
    def: 1 + Math.floor(lv(c, 'stamina') / 4) + passive('stamina'),
    spd: 8 + lv(c, 'run') + 2 * passive('run'),
    luck: Math.min(30, Math.round(c.happiness / 10)),
    meter: 0,
    st: {},
    skills: skillsOf(c),
    cd: {},
    turns: 0,
  }
}

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
export const TUNE = { hp: 40, hpPer: 5.5, atk: 5, atkPer: 1.05, spd: 0.75, spdPer: 0.1, weak: 1.6, strong: 0.6, maxEvents: 60 }

export const makeFoe = (corr: Corruption, team: Unit[], hard: number): Unit => {
  const n = team.length
  const avg = team.reduce((s, u) => s + Math.max(u.atk, u.heal * 0.9), 0) / n
  const hp = Math.round((TUNE.hp + avg * TUNE.hpPer * n) * hard * (corr === 'error' ? 0.8 : 1))
  const spd = team.reduce((s, x) => s + x.spd, 0) / n
  return {
    id: 'foe',
    name: CORRUPTIONS[corr].name,
    side: 'foe',
    corr,
    hp,
    max: hp,
    atk: Math.round((TUNE.atk + avg * TUNE.atkPer) * hard * (corr === 'error' ? 1.35 : 1) * (0.7 + 0.075 * n)),
    heal: 0,
    def: corr === 'error' ? 3 : 1,
    spd: Math.round(spd * (TUNE.spd + TUNE.spdPer * n)),
    luck: corr === 'static' ? 40 : 5,
    meter: 0,
    st: {},
    skills: [],
    cd: {},
    turns: 0,
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
  const say = (s: string) => {
    log.push(s)
  }
  const emit = (e: Omit<BattleEvent, 'hp' | 'st'>) => {
    events.push({
      ...e,
      hp: us.map(u => u.hp),
      st: us.map(u => STATUS_ORDER.filter(s => u.st[s]).map(s => STATUS_LETTER[s]).join('')),
    })
  }
  const setSt = (u: Unit, s: Status, t: number) => {
    u.st[s] = Math.max(u.st[s] ?? 0, t)
  }

  const guardOn = () => team.some(u => u.hp > 0 && u.st.guarded)
  const hurt = (a: Unit, d: Unit, mult: number, pierce = false, area = false): Hit => {
    if (d.corr === 'static' && !area && rng() * 100 < d.luck) return { id: d.id, n: 0, miss: true }
    if (d.side === 'team' && rng() * 100 < d.luck) return { id: d.id, n: 0, miss: true }
    const w = weak(a, d)
    const crit = a.side === 'team' && rng() * 100 < a.luck
    let dmg = a.atk * mult * w
    dmg = Math.max(1, dmg - (pierce ? 0 : d.def * 0.5))
    if (d.corr === 'error') dmg *= 0.6
    if (d.corr === 'static' && area) dmg *= 1.5
    if (d.side === 'team' && guardOn()) dmg *= 0.5
    if (crit) dmg *= 1.5
    const n = Math.max(1, Math.round(dmg))
    d.hp = Math.max(0, d.hp - n)
    const h: Hit = { id: d.id, n }
    if (crit) h.crit = true
    if (w > 1) h.weak = true
    if (w < 1) h.resist = true
    return h
  }
  const shown = (h: Hit) => (h.miss ? 'dodged' : `${h.n}${h.crit ? '!' : ''}${h.weak ? ' (weak)' : h.resist ? ' (resisted)' : ''}`)
  const nameOf = (id: string) => us.find(u => u.id === id)?.name ?? id

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
        us.push({ id, name: 'Bug', side: 'foe', hp, max: hp, atk: Math.max(2, Math.round(u.atk * 0.4)), heal: 0, def: 0, spd: u.spd + 2, luck: 5, meter: 0, st: {}, skills: [], cd: {}, turns: 0, minion: true })
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

    // ---- team: the AI picks a move
    const rdy = u.skills.filter(s => !u.cd[s.name])
    const ready = [...rdy.filter(s => s.cls === u.cls).reverse(), ...rdy.filter(s => s.cls !== u.cls)]
    const mates = alive('team')
    const lowest = mates.slice().sort((a, b) => a.hp / a.max - b.hp / b.max)[0] ?? u
    const hurtCount = mates.filter(x => x.hp / x.max < 0.6).length
    const sickCount = mates.filter(x => x.st.burn || x.st.slow || x.st.glitched || x.st.bound).length
    let s: Skill | undefined
    for (const c of ready) {
      const ok =
        c.kind === 'heal' ? lowest.hp / lowest.max < 0.55 :
        c.kind === 'healAll' ? hurtCount >= 2 || sickCount >= 2 :
        c.kind === 'shield' ? !guardOn() :
        c.kind === 'sleep' ? tgt.side === 'foe' && !tgt.minion && !tgt.st.sleep && tgt.hp / tgt.max > 0.3 :
        c.kind === 'burn' ? !tgt.st.burn :
        true
      if (ok) {
        s = c
        break
      }
    }
    s ??= ready.filter(c => c.kind === 'hit')[0] ?? TAP
    u.cd[s.name] = s.cd + 1
    if (s.windup) {
      u.winding = s.name
      emit({ actor: u.id, move: s.name, fx: 'charge', targets: [], hits: [] })
      return say(`${tag(u)} gathers starlight for ${s.name}...`)
    }
    const aim = tgt
    switch (s.kind) {
      case 'hit': {
        const h = hurt(u, aim, s.mult, s.pierce)
        say(`${tag(u)} uses ${s.name} on ${aim.name}: ${shown(h)}`)
        emit({ actor: u.id, move: s.name, fx: s.fx, targets: [aim.id], hits: [h] })
        if (s.fast) u.meter += 25
        break
      }
      case 'multi': {
        const hs = [0, 1, 2].map(() => hurt(u, aim, s.mult, s.pierce))
        say(`${tag(u)} fires ${s.name} at ${aim.name}: ${hs.map(h => (h.miss ? 'miss' : shown(h))).join(' + ')}`)
        emit({ actor: u.id, move: s.name, fx: s.fx, targets: [aim.id], hits: hs })
        break
      }
      case 'all': {
        const hit = alive('foe')
        const hs = hit.map(t => hurt(u, t, s.mult, s.pierce, true))
        say(`${tag(u)} uses ${s.name}: ${hs.map(h => `${nameOf(h.id)} ${shown(h)}`).join(', ')}`)
        emit({ actor: u.id, move: s.name, fx: s.fx, targets: hit.map(t => t.id), hits: hs })
        break
      }
      case 'burn': {
        const h = hurt(u, aim, s.mult)
        if (!h.miss) setSt(aim, 'burn', 3)
        say(`${tag(u)} casts ${s.name} on ${aim.name}: ${h.miss ? 'dodged' : shown(h) + ', burning'}`)
        emit({ actor: u.id, move: s.name, fx: s.fx, targets: [aim.id], hits: [h], status: h.miss ? undefined : 'burn' })
        break
      }
      case 'heal': {
        const n = Math.max(1, Math.round(u.heal * s.mult))
        lowest.hp = Math.min(lowest.max, lowest.hp + n)
        say(`${tag(u)} uses ${s.name} on ${lowest.name}: +${n} HP`)
        emit({ actor: u.id, move: s.name, fx: s.fx, targets: [lowest.id], hits: [{ id: lowest.id, n, heal: true }] })
        break
      }
      case 'healAll': {
        const n = Math.round(u.heal * s.mult * 1.2)
        for (const t of mates) {
          t.hp = Math.min(t.max, t.hp + n)
          for (const b of ['burn', 'slow', 'glitched', 'bound'] as Status[]) delete t.st[b]
          setSt(t, 'regen', 2)
        }
        say(`${tag(u)} sings ${s.name}: everyone +${n} HP, bad effects cleared`)
        emit({ actor: u.id, move: s.name, fx: s.fx, targets: mates.map(t => t.id), hits: mates.map(t => ({ id: t.id, n, heal: true })), status: 'regen' })
        break
      }
      case 'shield': {
        for (const t of mates) setSt(t, 'guarded', 2)
        say(`${tag(u)} raises ${s.name}: the party is shielded`)
        emit({ actor: u.id, move: s.name, fx: s.fx, targets: mates.map(t => t.id), hits: [], status: 'guarded' })
        break
      }
      case 'sleep': {
        setSt(aim, 'sleep', 2)
        aim.winding = undefined
        say(`${tag(u)} sings ${s.name}: ${aim.name} falls asleep`)
        emit({ actor: u.id, move: s.name, fx: s.fx, targets: [aim.id], hits: [], status: 'sleep' })
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
      say(`  ${u.name} is ${u.st.sleep ? 'asleep' : 'tangled in wires'} and cannot act.`)
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
  const found = [CORRUPTIONS[b.foe].drop, ...(b.challenge ? ['core'] : [])]
  for (const it of found) save.items[it] = (save.items[it] ?? 0) + 1
  return `Rewards: ${gains.join(', ')}, everyone +${2 * k} Stamina and +${4 * k} happiness. Found: ${found.map(it => ITEMS[it]).join(' and ')}.`
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
