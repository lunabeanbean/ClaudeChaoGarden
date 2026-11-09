import { atom, memberOf, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { CardLook, ChaoLook, FightLook, FruitColor, GardenView, Scene, TreeLook, TurnWork } from '../types'
import {
  ANIMALS,
  EMPTY_GARDEN,
  FRUIT_COLORS,
  PACES,
  TREE_W,
  addWork,
  byName,
  card,
  chaoArt,
  chaoLines,
  cleanName,
  cocoonArt,
  eatReady,
  eggArt,
  eggSpot,
  endTurn,
  firstActive,
  freshGarden,
  gardenCard,
  gardenLook,
  giveAnimal,
  growTree,
  layEgg,
  lookOf,
  message,
  meterOf,
  morningBasket,
  newGarden,
  normalizeChao,
  normalizeGarden,
  normalizeTree,
  pet,
  replantTree,
  sameLook,
  setFriend,
  tick,
  trainee,
  treeLookOf,
  treeStage,
  treeSvg,
  treeWork,
  walkOf,
  welcome,
  workOf,
} from './chao'
import type { Color, Garden, Pace } from './chao'
import {
  CORRUPTIONS,
  challengeWhy,
  challengerOf,
  dayOf,
  fightText,
  fighters,
  normalizeBattleSave,
  pickTeam,
  reward,
  runBattle,
  slim,
  trophies,
  WILD_EVERY,
} from './battle'
import type { Battle, BattleSave, Corruption } from './battle'
import { chaoCardSvg, gardenCardSvg } from './card'
import { challengerSvg, fightSvg } from './fight'
import { COURSES, RACE_EVERY, courseOf, courseOfDay, coursesText, normalizeRaceSave, payRace, raceLines, racesLeft, raceSvg, raceText, runRace, slimRace } from './race'
import type { CourseId, Race, RaceSave } from './race'
import { CAVE_SVG, NIGHT_SVG, SUNSET_SVG } from './scenery'

// How many rows tall the band is (what the Gmail box used to hold up: on the desktop its border is a thin line,
// so it was about 3 rows, marginTop 2 plus one text row). Raise it to make the band taller.
const BAND_ROWS = 3

// The garden's look for the band; the full saves are in $.store under 'garden' and 'chao:<id>'.
const gardenAtom = atom({ plugin: 'chao-garden', key: 'garden' } as const, EMPTY_GARDEN)
// -1 until this chat's first welcome, so a reload of the mod doesn't welcome the chao again. (Before 1.2.0 it held
// the snacks on this chat's own tree; the one tree is in the store now, under 'tree'.)
const fruitsAtom = atom({ plugin: 'chao-garden', key: 'fruits' } as const, -1)
// Messages you sent in this chat, for the "long chat" challenger. (The tree counts its own, from every chat.)
const grownAtom = atom({ plugin: 'chao-garden', key: 'grown' } as const, 0)
// The fruit drop in progress, and which chao have walked in for which drop.
const sceneAtom = atom({ plugin: 'chao-garden', key: 'scene' } as const, { phase: 'none', eater: '', n: 0, by: {} } as Scene)

// The chao cards in the side window (/chao, or a click on a chao in the band): which chao it shows, and a counter
// that goes up whenever the garden changes, so the window (the only thing that reads it) draws again.
const cardAtom = atom({ plugin: 'chao-garden', key: 'card' } as const, { pick: '', rev: 0 } as CardLook)
const CARD_PANE = 'chao-cards'
// The garden as last loaded or saved, for the side window to draw from without reading the store each time.
let lastGarden: Garden | undefined
let lastGardenSig = ''
// Whether a click on the band opens the cards (/chao click on|off, kept in the store under 'cardsTouch' for every chat).
const touchAtom = atom({ plugin: 'chao-garden', key: 'touch' } as const, true)
const refreshTouch = async ($: any) => {
  try {
    const want = (await $.store.get('cardsTouch')) !== false
    if ((await read($, touchAtom)) !== want) await update($, touchAtom, () => want)
  } catch {}
}
// Whether the side window is open (set when it draws, cleared when it closes), so a closed window costs nothing.
let cardsUp = false

// A chao walks at this many pixels a second to the fruit; it then pauses to notice (NOTICE_S) and eats (EAT_S).
const WALK_SPEED = 55
const NOTICE_S = 0.9
const EAT_S = 3
// A drop: the fruit falls for FALL_MS, lies there while the chao walks over, then is eaten.
const FALL_MS = 1600

// Where each chao's picture started, so we can tell where it is walking. The picture plays on its own,
// so we only know the moment its source last changed (the engine draws a changed source afresh).
type Mount = { src: string; t: number; begin: number; trips: number; still: boolean }
const mounts = new Map<string, Mount>()
const track = (id: string, pic: { src: string; begin: number; trips: number; still: boolean }, now: number) => {
  if (mounts.get(id)?.src !== pic.src) mounts.set(id, { ...pic, t: now })
}

// Where a walking chao is now, from the same timings its walk is drawn with (see `walker`):
// nap, walk right, nap, walk left, nap, once per line it says. Undefined when it is not walking (or
// not yet known), so the walk-in then starts from the edge.
const whereIs = (id: string, now: number): number | undefined => {
  const m = mounts.get(id)
  if (!m || m.still) return undefined
  const w = walkOf(id)
  const local = (now - m.t) / 1000 - m.begin
  if (local < 0) return undefined
  const trip = w.dur / m.trips
  const f = (local % trip) / trip
  const span = w.right - w.left
  if (f < 0.1 || f >= 0.9) return w.left
  if (f < 0.4) return w.left + (span * (f - 0.1)) / 0.3
  if (f < 0.6) return w.right
  return w.right - (span * (f - 0.6)) / 0.3
}

// Runs one fruit drop for the chao that will eat it, on a timer: the tree redraws a few times, and only
// that chao's picture is swapped for its walk to the fruit, starting from where it is right now.
// Everything between is each picture's own animation. The falling fruit has the colour that chao ate.
const runDrop = async ($: any, eater: string, color?: Color) => {
  try {
    const n = (await read($, sceneAtom)).n + 1
    await update($, sceneAtom, s => ({ ...s, phase: 'fall', eater, n, color }))
    $.clock.after(FALL_MS, async () => {
      const x0 = Math.round(whereIs(eater, await $.clock.now()) ?? 880)
      void update($, sceneAtom, s => ({ ...s, phase: 'walk', by: { ...s.by, [eater]: { n, x0 } } }))
      $.clock.after((walkInSecs(x0) + NOTICE_S) * 1000, () => {
        void update($, sceneAtom, s => ({ ...s, phase: 'none' }))
      })
    })
  } catch {}
}
// The fight playing in the band, and the day's challenger waiting by the tree ('' when none).
const fightAtom = atom({ plugin: 'chao-garden', key: 'fight' } as const, { n: 0, on: false, team: [] } as FightLook)
const challengeAtom = atom({ plugin: 'chao-garden', key: 'challenge' } as const, '')

// Per message: whether the animal in that bubble was already given to a chao.
const takenAtom = atom({ plugin: 'chao-garden', key: 'animalTaken' } as const, false)

// Gives a bubble's animal to a random hatched chao, once. Only that bubble and the band redraw. No pop-ups:
// the new look in the band says it.
const takeAnimal = async ($: any, requestId: string, animal: string) => {
  try {
    if (await read($, memberOf(takenAtom, { requestId }))) return
    await update($, memberOf(takenAtom, { requestId }), () => true)
    let given = false
    await tendGarden($, gd => {
      const c = trainee(gd)
      if (c) {
        giveAnimal(c, animal)
        given = true
      }
    })
    // only eggs so far: the animal stays in its bubble until one hatches
    if (!given) await update($, memberOf(takenAtom, { requestId }), () => false)
  } catch {}
}

// Per message: whether the egg in that bubble was already taken.
const eggTakenAtom = atom({ plugin: 'chao-garden', key: 'eggTaken' } as const, false)
// Chance that any one bubble holds an egg: 1 in EGG_ODDS.
const EGG_ODDS = 50

// Lays a new egg in the garden, once per bubble. If the garden is full the egg stays in its bubble.
const takeEgg = async ($: any, requestId: string) => {
  try {
    if (await read($, memberOf(eggTakenAtom, { requestId }))) return
    await update($, memberOf(eggTakenAtom, { requestId }), () => true)
    let laid = false
    await tendGarden($, (gd, now) => {
      laid = !!layEgg(gd, now)
    })
    if (!laid) await update($, memberOf(eggTakenAtom, { requestId }), () => false)
  } catch {}
}

// The clickable animal and/or egg for a bubble that has them, until taken.
const animalButton = async ($: any, e: any, Button: any, has: boolean, hasEgg = false) => {
  if (!Button) return null
  const id = String(e.requestId)
  const animal = has && !(await read($, memberOf(takenAtom, e)))
  const egg = hasEgg && !(await read($, memberOf(eggTakenAtom, e)))
  if (!animal && !egg) return null
  const eggButton = <Button key="egg" plain label="🥚" onPress={() => void takeEgg($, id)} />
  // which animal a bubble holds follows from its id, so a redraw never changes it
  const names = Object.keys(ANIMALS)
  let hash = 0
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  const kind = names[hash % names.length]
  const animalBtn = <Button key="animal" plain label={ANIMALS[kind]?.emoji} onPress={() => void takeAnimal($, id, kind)} />
  if (!egg) return animalBtn
  if (!animal) return eggButton
  const { Box } = $.ui.resolve(e)
  return (
    <Box flexDirection="row">
      {eggButton}
      {animalBtn}
    </Box>
  )
}

// The saved values the garden is made of, as stored (to notice when another chat saved in between).
const rawGarden = async ($: any, ids: string[]): Promise<string> => {
  const out: unknown[] = [await $.store.get('garden'), await $.store.get('tree')]
  for (const id of ids) out.push(await $.store.get(`chao:${id}`))
  return JSON.stringify(out)
}

// Loads the whole garden and the one tree. The first time, a new garden is made with two eggs.
const loadGarden = async ($: any, now: number, make = true): Promise<Garden & { raw: string }> => {
  const saved = await $.store.get('garden')
  if (!saved && !make) throw new Error('no garden yet')
  if (!saved) {
    const gd = newGarden(now)
    for (const c of gd.chao) await $.store.set(`chao:${c.id}`, c)
    await $.store.set('garden', gd.g)
    await $.store.set('tree', gd.tree)
    return { ...gd, raw: await rawGarden($, gd.g.ids) }
  }
  const g = normalizeGarden(saved, now)
  const savedTree = await $.store.get('tree')
  const tree = normalizeTree(savedTree)
  const chao = []
  const raws: unknown[] = [saved, savedTree]
  for (const id of g.ids) {
    const v = await $.store.get(`chao:${id}`)
    raws.push(v)
    chao.push(normalizeChao(v, id, now, g.days, g.turns))
  }
  return { g, chao, tree, raw: JSON.stringify(raws) }
}

// Loads the garden, changes it, moves each chao along its life when due, saves what changed, and
// refreshes the band's look when it changed. `mood` also lets the looks catch up (heart balls, a child's
// lean and colour); otherwise they wait for the next chat.
// One change at a time: Claude's tool runs, Claude's replies and turn ends come close together, and two changes loading the
// garden at once would lose one of them. Other chats save to the same store, so just before saving it checks that
// nothing changed since it loaded; if another chat saved in between, it starts over on what that chat saved
// (`change` must only set things outside the garden, never add to them, so running it again is safe).
let gardenLock: Promise<unknown> = Promise.resolve()
const tendGarden = ($: any, change: (gd: Garden, now: number) => void, mood = false): Promise<Garden | undefined> => {
  const run = gardenLock.then(() => tendGardenNow($, change, mood))
  gardenLock = run.catch(() => undefined)
  return run
}
const tendGardenNow = async ($: any, change: (gd: Garden, now: number) => void, mood: boolean): Promise<Garden | undefined> => {
  try {
    let gd: Garden
    for (let tries = 0; ; tries++) {
      const now: number = await $.clock.now()
      const { raw, ...loaded } = await loadGarden($, now)
      gd = loaded
      const ids = [...gd.g.ids]
      const before = new Map(gd.chao.map(c => [c.id, JSON.stringify(c)]))
      const garden = JSON.stringify(gd.g)
      const tree = JSON.stringify(gd.tree)
      change(gd, now)
      tick(gd, now)
      const changed =
        before.size !== gd.chao.length || gd.chao.some(c => before.get(c.id) !== JSON.stringify(c)) || garden !== JSON.stringify(gd.g) || tree !== JSON.stringify(gd.tree)
      if (!changed) break
      if (tries < 3 && (await rawGarden($, ids)) !== raw) continue
      for (const c of gd.chao) if (before.get(c.id) !== JSON.stringify(c)) await $.store.set(`chao:${c.id}`, c)
      if (garden !== JSON.stringify(gd.g)) await $.store.set('garden', gd.g)
      if (tree !== JSON.stringify(gd.tree)) await $.store.set('tree', gd.tree)
      break
    }
    const old = await read($, gardenAtom)
    const want = gardenLook(gd, treeStage(gd.tree.grown, gd.tree.snacks), old, mood)
    if (!sameLook(old, want)) await update($, gardenAtom, () => want)
    // the side window draws from this copy; it draws again only when something in the garden changed (here or in
    // another chat, which the catch-up timer brings in)
    lastGarden = gd
    if (cardsUp) {
      const sig = JSON.stringify([gd.g, gd.chao, gd.tree])
      if (sig !== lastGardenSig) {
        lastGardenSig = sig
        await pokeCards($)
      }
    }
    // New stages and new chao show in the band itself; nothing pops up (the garden is only played when you
    // choose to). A hatched chao keeps its random name until /chao name.
    return gd
  } catch {
    return undefined
  }
}

// ---- Fruit ----
// Claude's work ripens coloured fruit: commands red, reading blue, edits green, Claude's talking (and web use) yellow. The meters
// live in the garden save; Claude's work while the tree grows decides its kind; at the end of each of Claude's turns the ripe fruit are
// eaten by picky chao and one of them falls from the tree in the band. Nothing in the band redraws while I work:
// the tree's ripeness and kind have their own atom, changed only at a turn end, at your message, when a chat starts and
// when it catches up with the other chats.
const noWork = (): Record<FruitColor, number> => ({ power: 0, swim: 0, run: 0, fly: 0 })
const turnWorkAtom = atom({ plugin: 'chao-garden', key: 'turnWork' } as const, { ...noWork(), heard: 0 } as TurnWork)
const treeLookAtom = atom({ plugin: 'chao-garden', key: 'treeLook' } as const, { kind: '', ripe: noWork() } as TreeLook)

// Adds Claude's work to its colour: to the garden's meter (fruit ripen there), to this turn's work (the meters adapt
// from it) and, while the tree grows, to the tree's work counted in fruit (its kind comes from it). `heard`: talking
// that came through session.append.
const recordWork = async ($: any, color: Color, amount: number, heard = false) => {
  if (!(amount > 0)) return
  let meter = 0
  const gd = await tendGarden($, gd => {
    meter = meterOf(gd.g, color)
    treeWork(gd, color, amount, meter)
    addWork(gd, color, amount)
  })
  if (!gd || !meter) return
  await update($, turnWorkAtom, w => ({ ...w, [color]: (w[color] ?? 0) + amount, heard: (w.heard ?? 0) + (heard ? amount : 0) }))
}

// The tree's picture catches up with the garden: its kind and each colour's ripeness.
const refreshTreeLook = async ($: any, gd: Garden) => {
  const want = treeLookOf(gd.g, gd.tree.kind)
  if (JSON.stringify(await read($, treeLookAtom)) !== JSON.stringify(want)) await update($, treeLookAtom, () => want)
}

// The end of one of Claude's turns (on the main loop): if no reply came through session.append, the turn's answer counts
// as its talking; the meters adapt; every ripe fruit is eaten (by the tree's kind); a bare full-grown tree goes and a new
// seed is planted; the tree's picture catches up; and the last fruit eaten falls in the band for its eater (not while
// that chao is fighting, nor while another drop still plays).
const finishTurn = async ($: any, answer: string) => {
  try {
    const heard = (await read($, turnWorkAtom)).heard
    if (!heard && answer.length) await recordWork($, 'fly', answer.length)
    const work = await read($, turnWorkAtom)
    await update($, turnWorkAtom, () => ({ ...noWork(), heard: 0 }))
    let meal: [Color, string][] = []
    const gd = await tendGarden($, gd => {
      endTurn(gd, work)
      meal = eatReady(gd, gd.tree.kind)
      replantTree(gd)
    })
    if (!gd) return
    await refreshTreeLook($, gd)
    const last = meal[meal.length - 1]
    if (!last) return
    const [color, eater] = last
    const fight = await read($, fightAtom)
    const race = await read($, raceAtom)
    const scene = await read($, sceneAtom)
    if (!(fight.on && fight.team.includes(eater)) && !(race.on && race.team.includes(eater)) && scene.phase === 'none') void runDrop($, eater, color)
  } catch {}
}

// ---- Fights ----
// A corrupted omochao turns up on its own every so many of your messages (a wild one), when one of Claude's tool runs
// fails, or when the day's challenger has waited by the tree for a few messages (one fight at a time, then a
// cooldown); /chao fight now plays a practice one.
// The whole fight is worked out at once, paid out into the save, and played back as ONE picture over the band:
// only that picture comes and goes (and the fighters' walkers step out meanwhile), so the band never redraws
// while it plays. No pop-ups: results show in the band, the /chao card and /chao fight.
const FIGHT_COOLDOWN = 4 * 60 * 1000
// The challenger is this much tougher, and charges in by itself after this many messages.
const CHALLENGE_HARD = 1.2
const CHALLENGE_WAIT = 5
// Each fight's picture by its number (too big to keep in the session's state).
const fightPics = new Map<number, string>()
let fightBusy = false
let challengeWait = 0

const loadBattle = async ($: any): Promise<BattleSave & { off?: boolean }> => {
  const v = await $.store.get('battle')
  return { ...normalizeBattleSave(v), off: !!(v && typeof v === 'object' && (v as any).off) }
}

// How many messages the next wild omochao needs: about `every`, give or take 30%.
const wildDue = (every: number) => Math.max(2, Math.round(every * (0.7 + Math.random() * 0.6)))
const messagesLeft = (save: BattleSave) => (save.due ? Math.max(1, save.due - save.since) : save.every)
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

// Counts one of your messages towards the next wild omochao; true once it is due.
const countWild = async ($: any): Promise<boolean> => {
  try {
    const save = await loadBattle($)
    if (save.off) return false
    if (!save.due) save.due = wildDue(save.every)
    save.since++
    await $.store.set('battle', save)
    return save.since >= save.due
  } catch {
    return false
  }
}

// Starts a fight and plays it in the band. Returns the fight, or why there is none.
const startFight = async ($: any, why: 'error' | 'challenge' | 'wild' | 'practice'): Promise<Battle | string> => {
  if (fightBusy) return 'A fight is already starting.'
  fightBusy = true
  try {
    const now: number = await $.clock.now()
    const f = await read($, fightAtom)
    if (f.on) return 'A fight is already playing in the band.'
    if (raceBusy || (await read($, raceAtom)).on) return 'A race is running in the band: the omochao waits until it is over.'
    const save = await loadBattle($)
    const practice = why === 'practice'
    if (!practice && (save.off || now - save.last < FIGHT_COOLDOWN)) return 'not now'
    const ch = practice ? '' : await read($, challengeAtom)
    const challenge = ch in CORRUPTIONS
    // the reward is paid into a copy of the battle save, since the change runs again if another chat saved meanwhile
    const out: { b?: Battle; paid?: typeof save } = {}
    const gd = await tendGarden($, gd => {
      const b = runBattle(gd.chao, Math.random, { foe: challenge ? (ch as Corruption) : undefined, hard: challenge ? CHALLENGE_HARD : 1, challenge, lock: save.lock })
      const paid = JSON.parse(JSON.stringify(save)) as typeof save
      if (b && !practice) b.reward = reward(gd.chao, b, paid)
      out.b = b
      out.paid = paid
    })
    if (out.paid) Object.assign(save, out.paid)
    const b = out.b
    if (!gd) return 'Could not reach the garden save.'
    if (!b) return 'No fight yet: it needs at least one hatched chao.'
    b.at = now
    if (practice) b.practice = true
    else {
      // any fight that came on its own starts the count to the next wild one again
      save.last = now
      save.since = 0
      save.due = wildDue(save.every)
      if (challenge) save.challengeDay = dayOf(now)
      await $.store.set('battle', save)
      await pokeCards($)
    }
    await $.store.set('lastFight', slim(b))
    // the fighters as the band draws them, each walking in from where it is right now
    const look = await read($, gardenAtom)
    const looks: Record<string, ChaoLook> = {}
    for (const c of gd.chao) looks[c.id] = look.chao.find(o => o.id === c.id) ?? lookOf(c, PACES[gd.g.pace])
    const from: Record<string, number | undefined> = {}
    for (const t of b.team) from[t.id] = whereIs(t.id, now)
    const n = f.n + 1
    const pic = fightSvg(b, looks, from, String(n))
    fightPics.clear()
    fightPics.set(n, pic.src)
    await update($, fightAtom, () => ({ n, on: true, team: b.team.map(t => t.id) }))
    if (challenge) {
      challengeWait = 0
      await update($, challengeAtom, () => '')
    }
    $.clock.after(Math.round(pic.total * 1000) + 300, () => {
      void update($, fightAtom, s => (s.n === n ? { ...s, on: false, team: [] } : s))
    })
    return b
  } catch {
    return 'The fight could not start.'
  } finally {
    fightBusy = false
  }
}

// Puts the day's challenger by the tree when one is due (late night, new moon, a very long chat), or takes it away.
const refreshChallenge = async ($: any, gd?: Garden): Promise<string> => {
  try {
    const now: number = await $.clock.now()
    const save = await loadBattle($)
    const can = !save.off && (!gd || fighters(gd.chao).length > 0)
    const want = can && challengeWhy(now, await read($, grownAtom), save) ? challengerOf(now) : ''
    if ((await read($, challengeAtom)) !== want) await update($, challengeAtom, () => want)
    return want
  } catch {
    return ''
  }
}

// The fight lines of the /chao card.
const fightCard = async ($: any, gd: Garden): Promise<string[]> => {
  const save = await loadBattle($)
  const now: number = await $.clock.now()
  const left = Math.ceil((save.last + FIGHT_COOLDOWN - now) / 60000)
  const why = challengeWhy(now, await read($, grownAtom), save)
  const lines = [
    `⚔ Fights: ${save.wins} won, ${save.losses} lost${trophies(save) ? ` · trophies: ${trophies(save)}` : ''}`,
    save.off
      ? '   Fights are off (/chao fight on brings them back).'
      : `   ${fighters(gd.chao).length ? `Next omochao: in ${plural(messagesLeft(save), 'message')}, or sooner if one of Claude's commands fails.${left > 0 ? ` The chao rest ${left} more min first.` : ''}` : 'Nobody can fight yet: eggs and cocoons stay home.'}` +
        (why ? ` Challenge of the day waiting (${why}): a tougher ${CORRUPTIONS[challengerOf(now)].name}.` : ''),
  ]
  if (save.lock.length) lines.push(`   Always in front: ${save.lock.map(id => gd.chao.find(c => c.id === id)?.name ?? id).join(', ')}`)
  return lines
}

// ---- Races ----
// /chao race: up to four hatched chao race along the band on the course of the day (or the one named). Like a fight,
// the race is worked out at once, paid out (medals, the gold medal to wear, a little happiness, the course record)
// and played back as ONE picture over the band while the racers' walkers step out. Only ever when you ask.
const raceAtom = atom({ plugin: 'chao-garden', key: 'race' } as const, { n: 0, on: false, team: [] } as FightLook)
const racePics = new Map<number, string>()
let raceBusy = false

const loadRace = async ($: any): Promise<RaceSave> => normalizeRaceSave(await $.store.get('race'))

// `wild`: a surprise race that broke out on its own. Any race starts the count to the next surprise one again.
const startRace = async ($: any, course?: CourseId, wild = false): Promise<Race | string> => {
  if (raceBusy) return 'A race is already starting.'
  if (fightBusy) return 'A fight is starting: race once it is over.'
  raceBusy = true
  try {
    const now: number = await $.clock.now()
    const ra = await read($, raceAtom)
    if (ra.on) return 'A race is already running in the band.'
    if ((await read($, fightAtom)).on) return 'A fight is playing in the band: race once it is over.'
    const id = course ?? courseOfDay(now)
    const saved = await loadRace($)
    // the racers as the band draws them now (before the winner's medal goes on)
    const look = await read($, gardenAtom)
    // the payout goes into a copy of the race save, since the change runs again if another chat saved meanwhile
    const out: { r?: Race; paid?: RaceSave } = {}
    const gd = await tendGarden(
      $,
      gd => {
        const r = runRace(gd.chao, id, Math.random)
        const paid = JSON.parse(JSON.stringify(saved)) as RaceSave
        if (r) payRace(gd, r, paid)
        out.r = r
        out.paid = paid
      },
      true,
    )
    const r = out.r
    if (!gd) return 'Could not reach the garden save.'
    if (!r || !out.paid) return 'No race yet: it needs at least one hatched chao (eggs and cocoons stay home).'
    r.at = now
    if (wild) r.wild = true
    out.paid.since = 0
    out.paid.due = wildDue(out.paid.every)
    await $.store.set('race', out.paid)
    await $.store.set('lastRace', slimRace(r))
    await pokeCards($)
    const looks: Record<string, ChaoLook> = {}
    for (const c of gd.chao) looks[c.id] = look.chao.find(o => o.id === c.id) ?? lookOf(c, PACES[gd.g.pace])
    const from: Record<string, number | undefined> = {}
    for (const x of r.runners) from[x.id] = whereIs(x.id, now)
    const n = ra.n + 1
    const view: GardenView = gd.g.view === 'dark' || gd.g.view === 'light' ? gd.g.view : 'neutral'
    const pic = raceSvg(r, looks, from, view, String(n))
    racePics.clear()
    racePics.set(n, pic.src)
    await update($, raceAtom, () => ({ n, on: true, team: r.runners.map(x => x.id) }))
    $.clock.after(Math.round(pic.total * 1000) + 300, () => {
      void update($, raceAtom, s => (s.n === n ? { ...s, on: false, team: [] } : s))
    })
    return r
  } catch {
    return 'The race could not start.'
  } finally {
    raceBusy = false
  }
}

// Counts one of your messages towards the next surprise race; true once it is due.
const countRace = async ($: any): Promise<boolean> => {
  try {
    const save = await loadRace($)
    if (save.off) return false
    if (!save.due) save.due = wildDue(save.every)
    save.since++
    await $.store.set('race', save)
    return save.since >= save.due
  } catch {
    return false
  }
}

// The race lines of the /chao card.
const raceCard = async ($: any, gd: Garden, now: number): Promise<string[]> => {
  const save = await loadRace($)
  const names: Record<string, string> = {}
  for (const c of gd.chao) if (c.hatched) names[c.id] = c.name
  return raceLines(save, names, gd.g.champ, courseOfDay(now))
}

const hatchedNames = (gd: Garden) =>
  gd.chao
    .filter(c => c.hatched)
    .map(c => c.name)
    .join(', ') || 'only eggs so far'


// ---- The chao cards (the side window) ----
// Opened only when you ask: /chao, /chao <name>, or a click on the garden band (the chao nearest the click). Never on
// its own. It shows one chao's picture card (tabs to switch), a Pet button, the garden's card, and the fights and races.

// Tells the side window the garden changed. Only the window reads this, so nothing else redraws.
const pokeCards = async ($: any) => {
  if (!cardsUp) return
  try {
    await update($, cardAtom, c => ({ ...c, rev: (c.rev ?? 0) + 1 }))
  } catch {}
}

// Opens the side window, on a chao if one is named. A window that the app cannot show right now (too narrow when it
// was not asked for by a command) is closed again at once, so it can never turn up later by itself.
const openCards = async ($: any, pick?: string): Promise<boolean> => {
  try {
    if (pick) await update($, cardAtom, c => ({ ...c, pick }))
    const r = await $.ui.open({ id: CARD_PANE, title: 'Chao', columns: 64 })
    if (r?.isPlaced) return true
    await $.ui.close({ id: CARD_PANE })
  } catch {}
  return false
}

// Pixels per column in the desktop app (measured in the Phase 0 tests), for a click on the band.
const PX_PER_COLUMN = 8

// A click on the band (from the touch layer, `touch.tsx`): the chao nearest the click, if one is near, gets its
// card in the side window; any other click on the garden opens the window as it was.
const tapBand = async ($: any, column: number) => {
  try {
    const look = await read($, gardenAtom)
    const now: number = await $.clock.now()
    const px = (column + 0.5) * PX_PER_COLUMN
    let best = ''
    let bestD = 60
    for (const c of look.chao) {
      // walkers have their feet at x and their middle a little right of it; eggs and cocoons sit at their spot
      const x = c.stage === 'egg' || c.stage === 'cocoon' ? eggSpot(c.id) : whereIs(c.id, now)
      if (x === undefined) continue
      const d = Math.abs(px - (x + 4 * BIG))
      if (d < bestD) {
        best = c.id
        bestD = d
      }
    }
    await openCards($, best || undefined)
  } catch {}
}

// The Pet button on a card.
const petCard = async ($: any, id: string) => {
  await tendGarden(
    $,
    gd => {
      const c = gd.chao.find(o => o.id === id)
      if (c && c.stage !== 'egg') pet(c)
    },
    true,
  )
}

// The garden for the side window: the copy kept from the last change, else a look at the store (never a save).
const peekGarden = async ($: any, now: number): Promise<Garden | undefined> => {
  if (lastGarden) return lastGarden
  try {
    const { raw, ...gd } = await loadGarden($, now, false)
    return gd
  } catch {
    return undefined
  }
}

// The words /chao help prints: the whole garden as text, the commands, and how it all works.
const helpText = async ($: any, gd: Garden | undefined, now: number) =>
  [
    gd ? gardenCard(gd, now) : 'Could not reach the garden save.',
    ...(gd ? ['', ...(await fightCard($, gd)), ...(await raceCard($, gd, now))] : []),
    '',
    ...COMMAND_LINES,
    ...HOW_IT_WORKS,
  ].join('\n')

const HOW_IT_WORKS = [
  "Claude's work ripens coloured fruit on the tree: commands red (Power), reading blue (Swim), edits green (Run), talking yellow (Fly). At the end of each of Claude's turns the ripe fruit fall to the chao that like that colour most (each chao has two favourites), and a fruit gives a lot of its own stat plus a little of others.",
  "There is one tree, whatever chat you are in: your messages grow it (7 to full grown), and Claude's work while it grows makes it plain, twin or rainbow, which changes what the fruit give. Each message you send gives the hungriest chao a snack from it (+1 Stamina); once its 12 snacks are gone, the bare tree goes at the end of Claude's turn and a new seed is planted. Pictures are treats, the animals in bubbles go to a random hatched chao, and eggs hatch after 8 messages or 2 hours.",
  'A garden day passes each day you open a chat. At one chao year a well-fed child makes a cocoon and comes out as one of 15 adult forms: Hero, Dark or Neutral from the hours you chat and petting, and Normal, Swim, Fly, Run or Power from its biggest stat (the next biggest can show on top).',
  `Every so many messages (about ${WILD_EVERY} to start; /chao fight every <n> changes it), and when one of Claude's commands fails, a corrupted omochao turns up in the band and up to four hatched chao fight it on their own. Wins train them and leave a trophy; late nights, new moons and very long chats bring a tougher challenger once a day.`,
  'In fights each chao also brings its temperament and its animals. Hero, Dark or Neutral each gives a passive, and a strong lean (+60 for a Hero, -60 for a Dark, within 15 of zero for a Neutral) a signature skill too: Rally, Shadow Bite or Mimic. Each animal it wears gives a small buff, two of its pieces a passive, and once that animal was given 3 times its skill too, while a piece is still on. The omochao grow a little with what the team brings. Each chao\'s card shows it all.',
  "/chao race: up to four chao race along the band on the course of the day (meadow, lagoon, cliffs, sky or grand). Running goes on Run, the ponds on Swim, the climbs on Power and the glides on Fly; Stamina keeps them fast at the end. The first three win medals and the winner wears the gold one in the garden. A surprise race also breaks out on its own every so many messages (about " + RACE_EVERY + " to start; /chao race every <n> changes it, /chao race off stops them). Races give no stats.",
]

const COMMAND_LINES = [
  '/chao [name] opens the chao cards in the side window (or click a chao in the garden; /chao click off stops that)  ·  /chao help shows all this as text',
  '/chao name <old name> > <new name>  ·  /chao pet [name]  ·  /chao pace <slow|normal|fast>  ·  /chao visit <light|dark|neutral>  ·  /chao garden <on|off>  ·  /chao reset',
  '/chao fight [now|off|on|every <n>]  ·  /chao team [<name>, <name>|clear]  ·  /chao race [<course>|last|courses|every <n>|off|on]',
]

// The garden's name in cute script across the top of the band: "Chao Garden" over the crystal cave, "Dark Garden"
// in moonlight colours over the night wood, "Light Garden" in sunny colours over the sunset meadow.
const title = (name: string, from: string, mid: string, to: string, left: string, right: string): string =>
  `<defs><linearGradient id="smg" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${from}"/><stop offset="0.5" stop-color="${mid}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs>` +
  `<text x="450" y="34" font-size="19" font-style="italic" font-weight="bold" text-anchor="middle" fill="url(#smg)" stroke="#ffffff" stroke-width="0.6" paint-order="stroke" font-family="'Segoe Script','Brush Script MT','Comic Sans MS',cursive" letter-spacing="1">` +
  `${name}</text>` +
  `<text x="362" y="31" font-size="10" fill="${left}" text-anchor="middle">✦<animate attributeName="opacity" values="1;0.2;1" dur="2s" repeatCount="indefinite"/></text>` +
  `<text x="538" y="31" font-size="10" fill="${right}" text-anchor="middle">✦<animate attributeName="opacity" values="0.2;1;0.2" dur="2.4s" repeatCount="indefinite"/></text>`
const titleSvg = (...a: Parameters<typeof title>) => `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="84" viewBox="0 0 900 84">${title(...a)}</svg>`

// The three gardens the band can show (/chao visit): the scenery behind everything and the title over it.
const GARDENS: Record<GardenView, { scene: string; sceneAlt: string; title: string; name: string }> = {
  neutral: { scene: CAVE_SVG, sceneAlt: 'A glowing crystal cave', title: titleSvg('Chao Garden', '#ff8fc0', '#ffd43b', '#b197fc', '#ffd43b', '#ff8fc0'), name: 'Chao Garden' },
  light: { scene: SUNSET_SVG, sceneAlt: 'A flower meadow at sunset', title: titleSvg('Light Garden', '#ffe066', '#ffc2dc', '#fff4e0', '#ffe066', '#ffc2dc'), name: 'Light Garden' },
  dark: { scene: NIGHT_SVG, sceneAlt: 'A moonlit night wood under the stars', title: titleSvg('Dark Garden', '#cfe8ff', '#d7c4ff', '#ff9ad5', '#fff3bf', '#ff9ad5'), name: 'Dark Garden' },
}

// `lift` raises the bubble, e.g. over the chao's floating ball; `side` puts it that far right of the head
// instead, pointing back at it (a big chao leaves no room above it in the band).
const speech = (line: string, lift = 0, side = 0): string => {
  const w = Math.round(line.length * 4.6 + 16)
  if (side)
    return (
      `<g transform="translate(${side},${lift})">` +
      `<rect x="0" y="-54" width="${w}" height="15" rx="7.5" fill="#ffffff" stroke="#ff8fc0" stroke-width="0.8"/>` +
      `<polygon points="3,-39.5 10,-39.5 -3,-35" fill="#ffffff"/>` +
      `<text x="${w / 2}" y="-43.5" font-size="8.5" font-family="sans-serif" fill="#5b3a6e" text-anchor="middle">${line}</text></g>`
    )
  return (
    `<g transform="translate(0,${lift})">` +
    `<rect x="${8 - w / 2}" y="-54" width="${w}" height="15" rx="7.5" fill="#ffffff" stroke="#ff8fc0" stroke-width="0.8"/>` +
    `<polygon points="5,-39.5 11,-39.5 8,-35" fill="#ffffff"/>` +
    `<text x="8" y="-43.5" font-size="8.5" font-family="sans-serif" fill="#5b3a6e" text-anchor="middle">${line}</text></g>`
  )
}

// Something that walks: its body, and closed eyes laid over it while napping.
type Art = { body: string; sleepy: (dur: number, times: string, values: string, begin: number) => string }

// One chao that walks end to end, naps at each end (eyes shut, zzz) and turns around.
// It makes several round trips per cycle, saying a different line on each walk.
// `size` is how much bigger than usual the art is drawn: its zzz move out with it and its bubbles sit beside it.
const walker = (art: Art, left: number, right: number, dur: number, begin: number, lines?: string[], lift = 0, size = 1): string => {
  const cat = art.body
  const trips = lines ? lines.length : 1
  const t = (k: number, f: number) => ((k + f) / trips).toFixed(4)
  const pos: string[] = []
  const posTimes: string[] = []
  const face: string[] = []
  const faceTimes: string[] = []
  for (let k = 0; k < trips; k++) {
    // phases of one trip: nap left .0-.1, walk right .1-.4, nap right .4-.6, walk left .6-.9, nap left .9-1
    pos.push(`${left} 0`, `${left} 0`, `${right} 0`, `${right} 0`)
    posTimes.push(t(k, 0), t(k, 0.1), t(k, 0.4), t(k, 0.6))
    if (k === trips - 1) {
      pos.push(`${left} 0`, `${left} 0`)
      posTimes.push(t(k, 0.9), '1')
    } else {
      pos.push(`${left} 0`)
      posTimes.push(t(k, 0.9))
    }
    face.push('1 1', '-1 1')
    faceTimes.push(t(k, 0), t(k, 0.4))
    face.push('1 1')
    faceTimes.push(t(k, 0.9))
  }
  // Eyes shut and zzz show during the three naps of each trip.
  const napV: string[] = []
  const napT: string[] = []
  for (let k = 0; k < trips; k++) {
    napV.push('1', '0', '1', '0', '1')
    napT.push(t(k, 0), t(k, 0.1), t(k, 0.4), t(k, 0.6), t(k, 0.9))
  }
  const napValues = napV.join(';')
  const napTimesStr = napT.join(';')
  const zzz =
    `<g opacity="0"><animate attributeName="opacity" calcMode="discrete" values="${napValues}" keyTimes="${napTimesStr}" dur="${dur}s" begin="${begin}s" repeatCount="indefinite"/>` +
    `<text x="${Math.round(14 * size)}" y="${Math.round(-33 * size)}" font-size="8" font-family="sans-serif" fill="#b197fc">z</text>` +
    `<text x="${Math.round(19 * size)}" y="${Math.round(-39 * size)}" font-size="10" font-family="sans-serif" fill="#b197fc">Z</text></g>`
  let bubbles = ''
  if (lines) {
    for (let k = 0; k < trips; k++) {
      // shown while walking right, then again while walking left (same line twice per trip)
      bubbles +=
        `<g opacity="0"><animate attributeName="opacity" calcMode="discrete" values="0;1;0;1;0" keyTimes="${t(k, 0)};${t(k, 0.15)};${t(k, 0.35)};${t(k, 0.65)};${t(k, 0.85)}" dur="${dur}s" begin="${begin}s" repeatCount="indefinite"/>` +
        `${speech(lines[k], lift, size > 1 ? Math.round(12 * size) : 0)}</g>`
    }
  }
  const flip =
    `<g><animateTransform attributeName="transform" type="scale" calcMode="discrete" values="${face.join(';')}" keyTimes="${faceTimes.join(';')}" dur="${dur}s" begin="${begin}s" repeatCount="indefinite"/>` +
    `<g><animateTransform attributeName="transform" type="translate" values="0 0;0 -2;0 0" dur="0.6s" repeatCount="indefinite"/>${cat}${art.sleepy(dur, napTimesStr, napValues, begin)}</g></g>`
  return (
    `<g><animateTransform attributeName="transform" type="translate" values="${pos.join(';')}" keyTimes="${posTimes.join(';')}" dur="${dur}s" begin="${begin}s" repeatCount="indefinite"/>` +
    flip + zzz + bubbles + `</g>`
  )
}

// One chao in the band, as its own picture: an egg wobbling in its spot, a cocoon in its spot, or the
// chao walking its own stretch.
// Where the chao stands to eat a fallen fruit (the fruit lies at x 142, just right of the tree).
const EAT_X = 172

// The band draws its chao, eggs and cocoons this much bigger than their art, so they are easy to see.
const BIG = 1.3
const bigger = (svg: string) => `<g transform="scale(${BIG})">${svg}</g>`
const bigArt = (art: Art): Art => ({ body: bigger(art.body), sleepy: (dur, times, values, begin) => bigger(art.sleepy(dur, times, values, begin)) })
// An egg or cocoon grows around its own spot.
const bigAt = (x: number, svg: string) => `<g transform="translate(${x},0) scale(${BIG}) translate(${-x},0)">${svg}</g>`

// The walk-in for a fruit drop: from the right edge to the tree, a "!" as it notices, a few bites with
// hearts, then a short walk to where its usual walk begins. Plays once when the picture appears.
// Returns the picture and how many seconds it lasts; the usual walk starts at that moment.
const walkInSecs = (x0: number) => Math.max(0.8, Math.abs(x0 - EAT_X) / WALK_SPEED)

const eaterIntro = (art: Art, left: number, x0: number) => {
  const T1 = walkInSecs(x0)
  const heading = x0 > EAT_X ? '-1 1' : '1 1'
  const T2 = T1 + NOTICE_S
  const T3 = T2 + EAT_S
  const leg = Math.max(0.6, Math.abs(left - EAT_X) / 60)
  const total = Math.round((T3 + leg) * 100) / 100
  const k = (s: number) => (s / total).toFixed(4)
  const face = left > EAT_X ? '1 1' : '-1 1'
  const when = (a: number, b: number, shown: string) =>
    `<animate attributeName="opacity" calcMode="discrete" values="0;${shown};0" keyTimes="0;${k(a)};${k(b)}" dur="${total}s" begin="0s" fill="freeze"/>`
  return {
    total,
    svg:
      `<desc>eat</desc><g><animateTransform attributeName="transform" type="translate" values="${x0} 0;${EAT_X} 0;${EAT_X} 0;${left} 0" keyTimes="0;${k(T1)};${k(T3)};1" dur="${total}s" begin="0s" fill="freeze"/>` +
      `<animate attributeName="opacity" calcMode="discrete" values="1;0" keyTimes="0;1" dur="${total}s" begin="0s" fill="freeze"/>` +
      `<g><animateTransform attributeName="transform" type="scale" calcMode="discrete" values="${heading};-1 1;${face}" keyTimes="0;${k(T1)};${k(T3)}" dur="${total}s" begin="0s" fill="freeze"/>` +
      `<g><animateTransform attributeName="transform" type="translate" values="0 0;0 -2;0 0" dur="0.6s" repeatCount="indefinite"/>${art.body}</g></g>` +
      `<g opacity="0">${when(T1, T2, '1')}<text x="${Math.round(18 * BIG)}" y="${Math.round(-34 * BIG)}" font-size="15" font-weight="bold" font-family="sans-serif" fill="#ff6b9d" text-anchor="middle">!</text></g>` +
      `<g opacity="0">${when(T2, T3, '1')}<g><animateTransform attributeName="transform" type="translate" values="0 0;0 -7" dur="1s" repeatCount="indefinite"/>` +
      `<text x="${Math.round(-4 * BIG)}" y="${Math.round(-34 * BIG)}" font-size="9" font-family="sans-serif" fill="#ff8fc0">♥</text><text x="${Math.round(8 * BIG)}" y="${Math.round(-30 * BIG)}" font-size="7" font-family="sans-serif" fill="#ffb3d9">♥</text></g></g></g>`,
  }
}

const chaoSvg = (look: ChaoLook, width: number, y: number, ate?: { n: number; x0: number }) => {
  const w = walkOf(look.id)
  const trips = chaoLines(look).length
  let chao: string
  let begin = w.begin
  let still = false
  if (look.stage === 'egg') {
    chao = bigAt(eggSpot(look.id), eggArt(eggSpot(look.id), (eggSpot(look.id) % 35) / 10))
    still = true
  } else if (look.stage === 'cocoon') {
    chao = bigAt(eggSpot(look.id), cocoonArt(eggSpot(look.id)))
    still = true
  } else if (ate) {
    // The walk to the fruit starts where the chao was walking; after it, the usual walk begins where the walk ended.
    const art = bigArt(chaoArt(look))
    const intro = eaterIntro(art, w.left, ate.x0)
    begin = intro.total
    chao =
      `<desc>drop ${ate.n}</desc>${intro.svg}` +
      `<g opacity="0"><set attributeName="opacity" to="1" begin="${intro.total}s" fill="freeze"/>${walker(art, w.left, w.right, w.dur, intro.total, chaoLines(look), -4, BIG)}</g>`
  } else chao = walker(bigArt(chaoArt(look)), w.left, w.right, w.dur, w.begin, chaoLines(look), -4, BIG)
  const src = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="84" viewBox="0 0 ${width} 84"><g transform="translate(0,${y})">${chao}</g></svg>`
  return { src, begin, trips, still }
}

// Set when the band's touch layer failed in the app: the band is drawn without it from then on.
let touchBroken = false

// How often an open chat's band catches up with what the other chats did to the garden.
const CATCH_UP_MS = 15_000

export const register: Register = (on, options) => {
  // the name the chao say they love (the `name` option; none: "I love you!")
  setFriend(options?.name)

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'chao',
      description: 'Your chao garden: see the chao, name them, pet them, their fights and races',
    })

    // A mod reload cancels the drop and fight timers, so a drop or fight caught half way is closed.
    await update($, sceneAtom, s => ({ ...s, phase: 'none' }))
    await update($, fightAtom, f => ({ ...f, on: false, team: [] }))
    await update($, raceAtom, f => ({ ...f, on: false, team: [] }))

    // A new chat: the chao remember you. A reload of the mod runs this again in the same chat; `fruits` tells them
    // apart. The tree is the one every chat shares, so it carries on where it was. The first chat of the day brings
    // the morning basket, one ripe fruit of each colour, eaten at the end of my first turn.
    let gd: Garden | undefined
    if ((await read($, fruitsAtom)) < 0) {
      await update($, turnWorkAtom, () => ({ ...noWork(), heard: 0 }))
      gd = await tendGarden(
        $,
        (gd, now) => {
          const { morning } = welcome(gd, now)
          if (morning) morningBasket(gd)
        },
        true,
      )
      if (gd) await update($, fruitsAtom, () => 0)
    } else gd = await tendGarden($, () => {}, true)
    if (gd) await refreshTreeLook($, gd)
    await refreshChallenge($, gd)
    await refreshTouch($)

    // Other chats grow the same tree and feed the same chao: every so often this chat's band catches up with them
    // (it reads the store; nothing redraws unless something changed). A reload of the mod cancels the old timer.
    $.clock.every(CATCH_UP_MS, () => {
      void (async () => {
        const gd = await tendGarden($, () => {})
        if (gd) await refreshTreeLook($, gd)
        await refreshTouch($)
      })()
    })

    return next(e)
  })

  on('command.run', { command: 'chao' }, async ($, e) => {
    const [what, ...rest] = e.args.trim().split(/\s+/)
    const arg = rest.join(' ')
    const lost = 'Could not reach the garden save.'

    if (what === 'name' && arg.includes('>') && cleanName(arg.split('>')[1])) {
      const [from, to] = arg.split('>')
      const name = cleanName(to)
      let said = `No hatched chao called "${from.trim()}".`
      const gd = await tendGarden($, gd => {
        const c = byName(gd, from.trim())
        if (!c) return
        if (gd.chao.some(o => o !== c && o.name.toLowerCase() === name.toLowerCase())) {
          said = `Another chao is already called ${name}.`
          return
        }
        said = `${c.name} is now called ${name}.`
        c.name = name
      })
      return { text: gd ? said : lost }
    }

    if (what === 'pet') {
      let said = arg ? `No hatched chao called "${arg}".` : 'No chao has hatched yet. Eggs like to be warm: just keep chatting.'
      const gd = await tendGarden(
        $,
        gd => {
          const c = arg ? byName(gd, arg) : trainee(gd)
          if (!c) return
          pet(c)
          said = `${c.name} wiggles happily. ♥ (${c.happiness}/100)`
        },
        true,
      )
      return { text: gd ? said : lost }
    }

    // /chao fight shows the last fight with its numbers; /chao fight now plays a practice fight in the band (no
    // rewards); /chao fight off|on stops or allows the ones that start on their own; /chao fight every <n> sets
    // about how many messages apart the wild ones come.
    if (what === 'fight') {
      if (rest[0] === 'now') {
        const r = await startFight($, 'practice')
        return { text: typeof r === 'string' ? r : `A practice fight against a ${CORRUPTIONS[r.foe].name} is playing in the band (no rewards). Type /chao fight when it is over for the numbers.` }
      }
      if (rest[0] === 'every') {
        try {
          const save = await loadBattle($)
          const n = Math.round(Number(rest[1]))
          if (!(n >= 3 && n <= 100))
            return { text: `A wild omochao comes about every ${save.every} messages (next in ${plural(messagesLeft(save), 'message')}). Change it with /chao fight every <3-100>.` }
          save.every = n
          save.due = wildDue(n)
          await $.store.set('battle', save)
          return { text: `A wild omochao now comes about every ${n} messages. The next one in ${plural(messagesLeft(save), 'message')}.` }
        } catch {
          return { text: lost }
        }
      }
      if (rest[0] === 'off' || rest[0] === 'on') {
        try {
          const save = await loadBattle($)
          await $.store.set('battle', { ...save, off: rest[0] === 'off' })
          await refreshChallenge($)
        } catch {
          return { text: lost }
        }
        return { text: rest[0] === 'off' ? 'Fights are off: no omochao will turn up. /chao fight on brings them back.' : "Fights are on: an omochao turns up every so many messages, or when one of Claude's commands fails." }
      }
      try {
        const last = (await $.store.get('lastFight')) as Battle | undefined
        if (last && Array.isArray(last.log)) return { text: fightText(last) }
      } catch {}
      return { text: "No fight yet. An omochao turns up every so many messages, or when one of Claude's commands fails; /chao fight now plays a practice fight." }
    }

    // /chao race runs the course of the day in the band; /chao race <course> another one; /chao race last shows
    // the last race's times; /chao race courses lists the courses and their records.
    if (what === 'race') {
      const now: number = await $.clock.now()
      if (/^(last|results?|times?)$/i.test(arg)) {
        try {
          const last = (await $.store.get('lastRace')) as Race | undefined
          if (last && Array.isArray(last.runners) && last.course in COURSES) return { text: raceText(last) }
        } catch {}
        return { text: "No race yet. /chao race starts today's course in the band." }
      }
      if (/^(courses?|list|help|records?)$/i.test(arg)) {
        try {
          return { text: coursesText(await loadRace($), courseOfDay(now)) }
        } catch {
          return { text: lost }
        }
      }
      if (rest[0] === 'every') {
        try {
          const save = await loadRace($)
          const n = Math.round(Number(rest[1]))
          if (!(n >= 3 && n <= 100))
            return { text: `A surprise race breaks out about every ${save.every} messages (next in ${plural(racesLeft(save), 'message')}). Change it with /chao race every <3-100>.` }
          save.every = n
          save.due = wildDue(n)
          await $.store.set('race', save)
          return { text: `A surprise race now breaks out about every ${n} messages. The next one in ${plural(racesLeft(save), 'message')}.` }
        } catch {
          return { text: lost }
        }
      }
      if (arg === 'off' || arg === 'on') {
        try {
          const save = await loadRace($)
          if (arg === 'off') save.off = true
          else delete save.off
          await $.store.set('race', save)
        } catch {
          return { text: lost }
        }
        return {
          text:
            arg === 'off'
              ? 'Surprise races are off. /chao race still starts one whenever you like, and /chao race on brings the surprise ones back.'
              : 'Surprise races are on: every so many messages your chao race along the band on their own.',
        }
      }
      const course = arg ? courseOf(arg) : courseOfDay(now)
      if (!course) return { text: `There is no course called "${arg}".\n${coursesText(await loadRace($), courseOfDay(now))}` }
      const r = await startRace($, course)
      if (typeof r === 'string') return { text: r }
      const names = r.runners.map(x => x.name)
      const who = names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]} line up` : `${names[0]} lines up for a time trial`
      return { text: `🏁 ${COURSES[course].name}! ${who} in the band (${COURSES[course].blurb}). Type /chao race last once they cross the line for the times.` }
    }

    // /chao team shows who would fight; /chao team <name>, <name> keeps those in front; /chao team clear.
    if (what === 'team') {
      const gd = await tendGarden($, () => {})
      if (!gd) return { text: lost }
      const save = await loadBattle($)
      if (arg === 'clear') {
        await $.store.set('battle', { ...save, lock: [] })
        return { text: 'The team is picked fresh for each omochao again.' }
      }
      if (arg) {
        const names = arg.split(/[,&]|\band\b/).map(x => x.trim()).filter(Boolean)
        const picked = names.map(x => byName(gd, x))
        const missing = names.filter((_, i) => !picked[i])
        if (missing.length) return { text: `No hatched chao called ${missing.map(x => `"${x}"`).join(', ')}.` }
        const ids = [...new Set(picked.map(c => c!.id))].slice(0, 4)
        await $.store.set('battle', { ...save, lock: ids })
        return { text: `Always in front: ${ids.map(id => gd.chao.find(c => c.id === id)?.name).join(', ')}. The rest of the team still fits each omochao. /chao team clear undoes it.` }
      }
      const fit = (k: Corruption) => pickTeam(gd.chao, k, save.lock).map(c => c.name).join(', ')
      return {
        text: fighters(gd.chao).length
          ? [
              `Always in front: ${save.lock.map(id => gd.chao.find(c => c.id === id)?.name ?? id).join(', ') || 'nobody (the team fits each omochao)'}`,
              ...(Object.keys(CORRUPTIONS) as Corruption[]).map(k => `   vs ${CORRUPTIONS[k].name}: ${fit(k)}`),
              '/chao team <name>, <name> keeps chao in front · /chao team clear',
            ].join('\n')
          : 'Nobody can fight yet: eggs and cocoons stay home.',
      }
    }

    if (what === 'pace') {
      const pace = rest[0] as Pace
      if (!Object.keys(PACES).includes(pace)) return { text: 'How fast the chao grow: /chao pace slow, normal or fast (1 chao year = 5, 3 or 1 garden days).' }
      const gd = await tendGarden(
        $,
        gd => {
          gd.g.pace = pace
        },
        true,
      )
      return { text: gd ? `Pace: ${pace}. 1 chao year is now ${PACES[pace]} garden day${PACES[pace] === 1 ? '' : 's'}.` : lost }
    }

    // /chao visit light|dark|neutral picks which garden the band shows (kept in the save, so every chat opens on it).
    if (what === 'visit') {
      const want: GardenView | undefined = /^(dark|night|moon)/i.test(arg)
        ? 'dark'
        : /^(light|hero|sun|flower|meadow)/i.test(arg)
          ? 'light'
          : /^(neutral|chao|cave|crystal|home)/i.test(arg)
            ? 'neutral'
            : undefined
      if (!want)
        return { text: 'Which garden should the band show? /chao visit light (a flower meadow at sunset), /chao visit dark (a moonlit night wood) or /chao visit neutral (the crystal cave).' }
      const gd = await tendGarden($, gd => {
        gd.g.view = want
      })
      return {
        text: !gd
          ? lost
          : want === 'dark'
            ? 'Your chao wander into the Dark Garden, a moonlit night wood full of stars. /chao visit neutral takes them back to the crystal cave.'
            : want === 'light'
              ? 'Your chao skip into the Light Garden, a meadow full of flowers at sunset. /chao visit neutral takes them back to the crystal cave.'
              : 'Your chao head home to the crystal cave. /chao visit light or /chao visit dark takes them to another garden.',
      }
    }

    // /chao click off|on: whether a click on the garden band opens the chao cards (for every chat)
    if (what === 'click' || what === 'touch') {
      if (arg !== 'on' && arg !== 'off')
        return { text: `A click on a chao in the garden ${(await read($, touchAtom)) ? 'opens' : 'does not open'} its card. /chao click on or /chao click off changes it.` }
      try {
        await $.store.set('cardsTouch', arg === 'on')
      } catch {
        return { text: lost }
      }
      await update($, touchAtom, () => arg === 'on')
      return { text: arg === 'on' ? 'Click a chao in the garden to open its card in the side window.' : 'Clicking the garden no longer opens the chao cards (/chao still does). /chao click on brings it back.' }
    }

    if (what === 'garden' && (rest[0] === 'on' || rest[0] === 'off')) {
      const gd = await tendGarden($, gd => {
        gd.g.show = rest[0] === 'on'
      })
      return { text: !gd ? lost : rest[0] === 'on' ? 'The garden is back above the typing box.' : 'The garden is hidden (your chao are safe and keep growing). /chao garden on brings it back.' }
    }

    if (what === 'reset') {
      if (arg !== 'confirm') return { text: 'This starts the whole garden over with one new egg and loses every chao. Type /chao reset confirm to do it.' }
      try {
        const now: number = await $.clock.now()
        const old = await loadGarden($, now)
        for (const id of old.g.ids) await $.store.delete(`chao:${id}`)
        const races = await loadRace($)
        await $.store.set('race', { ...races, medals: {} })
        const gd: Garden = { g: { ...freshGarden(now), show: old.g.show, days: old.g.days, lastDay: old.g.lastDay }, chao: [], tree: old.tree }
        layEgg(gd, now)
        for (const c of gd.chao) await $.store.set(`chao:${c.id}`, c)
        await $.store.set('garden', gd.g)
      } catch {
        return { text: lost }
      }
      await tendGarden($, () => {}, true)
      return { text: 'A new egg appears in the garden.' }
    }

    const gd = await tendGarden($, () => {})
    const now: number = await $.clock.now()
    if (/^(help|text|card|info|\?)$/i.test(what ?? '')) return { text: await helpText($, gd, now) }
    // /chao or /chao <name>: the chao cards in the side window; the text only where no window can be shown
    const named = gd && e.args.trim() ? gd.chao.find(c => c.name && c.name.toLowerCase() === e.args.trim().toLowerCase()) : undefined
    if (await openCards($, named?.id)) return { text: `🐣 ${named ? `${named.name}'s card is` : 'Your chao cards are'} open in the side window. Click a chao in the garden to see its card; /chao help shows everything as text.` }
    return { text: await helpText($, gd, now) }
  })

  // ---- The side window ----
  on('ui.render', { component: 'Pane', requestId: CARD_PANE }, async ($, e) => {
    const { Box, Text, Button, Svg } = $.ui.resolve(e) as any
    cardsUp = true
    const pane = await read($, cardAtom)
    const now: number = await $.clock.now()
    const gd = await peekGarden($, now)
    if (!gd || !gd.chao.length) return <Text>Could not reach the garden save yet. Type /chao again in a moment.</Text>
    const order = gd.g.ids.map(id => gd.chao.find(c => c.id === id)).filter(Boolean) as Garden['chao']
    const shown = order.find(c => c.id === pane.pick) ?? firstActive(gd) ?? order[0]
    let eggs = 0
    const labelOf = (c: Garden['chao'][number]) => {
      if (c.stage === 'egg') return `🥚 Egg${++eggs > 1 ? ` ${eggs}` : ''}`
      return `${c.stage === 'cocoon' ? '✧ ' : ''}${c.name || 'Chao'}${gd.g.champ === c.id ? ' 🥇' : ''}`
    }
    const tabs = (
      <Box key="tabs" flexDirection="row" flexWrap="wrap">
        {order.map(c => (
          <Box key={`tabbox-${c.id}`} marginRight={1}>
            <Button key={`tab-${c.id}`} label={labelOf(c)} {...(c.id === shown?.id ? { variant: 'primary' } : {})} onPress={() => void update($, cardAtom, p => ({ ...p, pick: c.id }))} />
          </Box>
        ))}
      </Box>
    )
    let fights: string[] = []
    let races: string[] = []
    try {
      fights = await fightCard($, gd)
      races = await raceCard($, gd, now)
    } catch {}

    // Anywhere but the desktop app (no pictures there): the same card as text.
    if (e.surface !== 'desktop' || !Svg) {
      return (
        <Box flexDirection="column">
          {tabs}
          <Text>{shown ? card(gd, shown, now) : ''}</Text>
          <Text> </Text>
          <Text>{[...fights, ...races].join('\n')}</Text>
        </Box>
      )
    }

    const width = Math.max(280, Math.min(560, (e.props?.bodyColumns ?? 64) * PX_PER_COLUMN - 8))
    let medals: [number, number, number] | undefined
    try {
      const m = (await loadRace($)).medals?.[shown?.id ?? '']
      if (Array.isArray(m)) medals = [m[0] ?? 0, m[1] ?? 0, m[2] ?? 0]
    } catch {}
    const chaoPic = shown ? chaoCardSvg(gd, shown, now, gd.g.view, width, medals) : undefined
    const gardenPic = gardenCardSvg(gd, treeLookOf(gd.g, gd.tree.kind), gd.g.view, width)
    const canPet = shown && shown.stage !== 'egg'
    return (
      <Box flexDirection="column">
        {tabs}
        {chaoPic && shown ? (
          <Box key="chao-card" marginTop={1}>
            <Svg source={chaoPic.src} alt={`${shown.stage === 'egg' ? 'An egg' : shown.name}'s card`} width={width} height={chaoPic.height} />
          </Box>
        ) : null}
        {canPet ? (
          <Box key="card-buttons" flexDirection="row" marginTop={1}>
            <Button key="card-pet" label={`♥ Pet ${shown.name}`} onPress={() => void petCard($, shown.id)} />
          </Box>
        ) : null}
        <Box key="garden-card" marginTop={1}>
          <Svg source={gardenPic.src} alt="The garden: the tree and the ripening fruit" width={width} height={gardenPic.height} />
        </Box>
        <Box key="card-words" flexDirection="column" marginTop={1}>
          {[...fights, ...races].map((line, i) => (
            <Text key={`w${i}`}>{line}</Text>
          ))}
          <Text> </Text>
          {COMMAND_LINES.map((line, i) => (
            <Text key={`c${i}`} dimColor>
              {line}
            </Text>
          ))}
        </Box>
      </Box>
    )
  })

  // A click on the garden band, from its touch layer: the nearest chao's card opens in the side window.
  on('ui.message', async ($, e, next) => {
    if (e.element !== 'band-touch') return next(e)
    const d = (e.data ?? {}) as { kind?: string; x?: number }
    if (d.kind === 'tap' && Number.isFinite(d.x)) void tapBand($, Number(d.x))
    return {}
  })

  // The side window closed (its close mark, or the app): nothing needs to tell it about changes any more.
  on('ui.close', async ($, e, next) => {
    const r = await next(e)
    if (e.id === CARD_PANE) {
      cardsUp = false
      lastGardenSig = ''
    }
    return r
  })

  // If the touch layer ever fails in the app, the band goes on without it (until the mod reloads).
  on('ui.fault', async ($, e, next) => {
    if (e.element === 'band-touch') touchBroken = true
    return next(e)
  })


  // Each tool run of Claude's on the main loop ripens its colour's fruit (no stats here any more: the chao get those by
  // eating), and a failed one calls up a corrupted omochao (not when you turned the run down yourself). Helpers'
  // runs (agentId) ripen nothing, since you don't see their work. Never gets in the tool's way.
  on('tool.call', async ($, e, next) => {
    const result = await next(e)
    try {
      const w = e.agentId ? undefined : workOf(String(e.tool))
      if (w) await recordWork($, w[0], w[1])
    } catch {}
    if (result && 'isError' in result && result.isError && !/doesn't want to|does not want to|rejected|denied|interrupted/i.test(String(result.text ?? ''))) void startFight($, 'error')
    return result
  })

  // Claude's replies on the main loop (the bubbles between tool calls too) ripen yellow fruit by their length. The row is
  // stored first and passed on unchanged; the counting comes after.
  on('session.append', { door: 'response' }, async ($, e, next) => {
    const r = await next(e)
    try {
      if (!e.agentId && e.message?.type === 'assistant') {
        let n = 0
        for (const b of e.message.content ?? []) if (b && b.type === 'text' && typeof b.text === 'string') n += b.text.length
        if (n > 0) await recordWork($, 'fly', n, true)
      }
    } catch {}
    return r
  })

  // The end of each of Claude's turns on the main loop (an interrupted one too): the ripe fruit are eaten and one falls.
  on('turn.complete', async ($, e, next) => {
    const r = await next(e)
    if (!e.agentId) await finishTurn($, typeof e.answer === 'string' ? e.answer : '')
    return r
  })

  // An animal pops up in a bubble (yours or mine) every 4-6 messages. Only bubbles that appear after
  // you send in this chat count, so opening an old chat does not fill its history with animals.
  let live = false
  let bubbles = 0
  let nextAnimal = 0
  const counted = new Set<string>()
  const animalAt = new Set<string>()
  const eggAt = new Set<string>()
  const gap = () => 4 + Math.floor(Math.random() * 3)
  const spawn = (id: string) => {
    if (live && !counted.has(id)) {
      counted.add(id)
      if (Math.random() < 1 / EGG_ODDS) eggAt.add(id)
      bubbles++
      if (!nextAnimal) nextAnimal = gap()
      if (bubbles >= nextAnimal) {
        animalAt.add(id)
        nextAnimal = bubbles + gap()
      }
    }
    return animalAt.has(id)
  }

  on('prompt.submit', async ($, e, next) => {
    live = true
    // Every message you send (in any chat) grows the one tree and gives the hungriest chao a snack from it; pictures
    // are treats. Commands are not food. (The coloured fruit fall at the end of Claude's turns instead.) The message
    // that makes the tree full grown settles its kind, from Claude's work since it was planted.
    if (!e.command && !e.text.trim().startsWith('/')) {
      await update($, grownAtom, n => (n ?? 0) + 1)
      const gd = await tendGarden($, (gd, now) => {
        if (message(gd, now, !!e.attachments?.length, growTree(gd))) gd.tree.snacks--
      })
      if (gd) await refreshTreeLook($, gd)
      // the day's challenger waits by the tree for a few messages, then charges in; otherwise a wild omochao
      // wanders in every so many messages
      let fightNow = false
      if (await refreshChallenge($, gd)) {
        challengeWait++
        if (challengeWait >= CHALLENGE_WAIT) {
          fightNow = true
          void startFight($, 'challenge')
        }
      } else {
        challengeWait = 0
        if (gd && fighters(gd.chao).length && (await countWild($))) {
          fightNow = true
          void startFight($, 'wild')
        }
      }
      // a surprise race breaks out every so many messages too; never on a message that brings a fight (it waits for
      // the next message, and for any fight or race still playing to end)
      if (gd && fighters(gd.chao).length && (await countRace($)) && !fightNow) void startRace($, undefined, true)
      await pokeCards($)
    }
    return next(e)
  })

  // The animal and egg buttons go on a short row under the bubble, on the right. The bubble itself is whatever the
  // rest of the chain draws (the app's own, or another mod's frame), passed on untouched; bubbles without an animal
  // or egg are not wrapped at all. The wrapper takes no `position`: the app's own row can't sit under one.
  const withButtons = (Box: any, row: any, buttons: any) =>
    !buttons || !row ? row : (
      <Box flexDirection="column">
        {row}
        <Box flexDirection="row" justifyContent="flex-end" paddingRight={1}>
          {buttons}
        </Box>
      </Box>
    )

  on('ui.render', { component: 'UserMessage' }, async ($, e, next) => {
    // The desktop app sends your messages as 'sdk' turns; other kinds (task notes and the like) get no animals.
    if (!['composer', 'sdk', 'bridge'].includes(e.props.origin?.kind)) return next(e)
    const id = String(e.requestId)
    const { Box, Button } = $.ui.resolve(e)
    const buttons = await animalButton($, e, Button, spawn(id), eggAt.has(id))
    return withButtons(Box, await next(e), buttons)
  })

  on('ui.render', { component: 'AssistantMessage' }, async ($, e, next) => {
    if (e.props.isSummary) return next(e)
    const id = String(e.requestId)
    const { Box, Button } = $.ui.resolve(e)
    const buttons = await animalButton($, e, Button, spawn(id), eggAt.has(id))
    return withButtons(Box, await next(e), buttons)
  })

  // The garden band above the typing box (desktop app only): the garden's scenery (the crystal cave, the moonlit night wood or the sunset meadow, scenery.ts), the title, the tree, each chao, the day's
  // challenger and any fight. With /chao garden off it shows nothing.
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey || e.surface !== 'desktop') return next(e)
    const look = await read($, gardenAtom)
    if (!look.show) return next(e)

    const { Svg, Box, Client } = $.ui.resolve(e) as any
    const touchOn = await read($, touchAtom)
    const touchColumns = Math.max(10, Math.min(Math.ceil(900 / PX_PER_COLUMN), e.props.bodyColumns ?? 113))
    const garden: GardenView = look.view === 'dark' || look.view === 'light' ? look.view : 'neutral'
    const drop = await read($, sceneAtom)
    const treeLook = await read($, treeLookAtom)
    const fight = await read($, fightAtom)
    const race = await read($, raceAtom)
    const challenger = await read($, challengeAtom)
    const now: number = await $.clock.now()
    // While a fight or a race plays, its picture holds the chao in it, so their walkers step out of the band.
    const fightPic = fight.on ? fightPics.get(fight.n) : undefined
    const racePic = race.on ? racePics.get(race.n) : undefined
    const away = new Set([...(fightPic ? fight.team : []), ...(racePic ? race.team : [])])

    // The tree and each chao are pictures of their own over the stars, so a change to one chao redraws only that
    // one: the stars and the other chao keep going.
    const chao = look.chao.map(c => {
      if (away.has(c.id)) {
        // it walks back in afresh when the fight is over
        mounts.delete(c.id)
        return null
      }
      const pic = chaoSvg(c, 900, 80, drop.by[c.id])
      track(c.id, pic, now)
      return (
        <Box key={c.id} position="absolute" top={-1} left={0}>
          <Svg source={pic.src} alt={c.stage === 'egg' ? 'A chao egg' : c.stage === 'cocoon' ? `${c.name}'s cocoon` : `${c.name} the chao`} width={900} height={84} isInteractive />
        </Box>
      )
    })

    return (
      <Box position="relative" overflow="hidden" flexDirection="column">
        <Box key={`scene-${garden}`} position="absolute" top={-1} left={0}>
          <Svg source={GARDENS[garden].scene} alt={GARDENS[garden].sceneAlt} width={900} height={84} isInteractive />
        </Box>
        {/* The title is its own picture, so it can step aside while a fight plays in the middle of the band. */}
        {fightPic || racePic ? null : (
          <Box key="title" position="absolute" top={-1} left={0}>
            <Svg source={GARDENS[garden].title} alt={GARDENS[garden].name} width={900} height={84} />
          </Box>
        )}
        <Box key="tree" position="absolute" top={-1} left={12}>
          <Svg
            source={treeSvg(look.tree, drop.phase === 'fall' ? 'fall' : drop.phase === 'walk' ? 'ground' : undefined, treeLook, drop.color)}
            alt={`Fruit tree, ${look.tree}${treeLook.kind ? `, ${treeLook.kind}` : ''}`}
            width={TREE_W}
            height={84}
          />
        </Box>
        {chao}
        {challenger in CORRUPTIONS && !fightPic && !racePic ? (
          <Box key="challenger" position="absolute" top={-1} left={20}>
            <Svg source={challengerSvg(challenger as Corruption)} alt={`A ${CORRUPTIONS[challenger as Corruption].name} waits by the tree`} width={64} height={84} isInteractive />
          </Box>
        ) : null}
        {fightPic ? (
          <Box key={`fight${fight.n}`} position="absolute" top={-1} left={0}>
            <Svg source={fightPic} alt="Your chao fight a corrupted omochao" width={900} height={84} isInteractive />
          </Box>
        ) : null}
        {racePic ? (
          <Box key={`race${race.n}`} position="absolute" top={-1} left={0}>
            <Svg source={racePic} alt="Your chao race along the garden" width={900} height={84} isInteractive />
          </Box>
        ) : null}
        {/* An invisible touch layer on top: a click on a chao opens its card in the side window. */}
        {Client && touchOn && !touchBroken ? (
          <Box key="touch" position="absolute" top={0} left={0} width={touchColumns} height={BAND_ROWS}>
            <Client key="band-touch" module="./touch.tsx" props={{ rows: BAND_ROWS }} width={touchColumns} height={BAND_ROWS} />
          </Box>
        ) : null}
        {/* Everything above is absolute; this empty box is what gives the band its height. */}
        <Box height={BAND_ROWS} />
      </Box>
    )
  })
}
