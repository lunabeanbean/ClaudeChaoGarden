import { atom, memberOf, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { ChaoLook, FightLook, FruitColor, Scene, TreeKind, TreeLook, TurnWork } from '../types'
import {
  ANIMALS,
  EMPTY_GARDEN,
  FRUIT_COLORS,
  PACES,
  TREE_FRUITS,
  TREE_GROWN,
  TREE_W,
  addWork,
  byName,
  chaoArt,
  chaoLines,
  cleanName,
  cocoonArt,
  eatReady,
  eggArt,
  eggSpot,
  endTurn,
  freshGarden,
  gardenCard,
  gardenLook,
  giveAnimal,
  layEgg,
  lookOf,
  message,
  meterOf,
  morningBasket,
  newGarden,
  normalizeChao,
  normalizeGarden,
  pet,
  sameLook,
  setFriend,
  tick,
  trainee,
  treeKindOf,
  treeLookOf,
  treeStage,
  treeSvg,
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
import { challengerSvg, fightSvg } from './fight'

// How many rows tall the band is (what the Gmail box used to hold up: on the desktop its border is a thin line,
// so it was about 3 rows, marginTop 2 plus one text row). Raise it to make the band taller.
const BAND_ROWS = 3

// The garden's look for the band; the full saves are in $.store under 'garden' and 'chao:<id>'.
const gardenAtom = atom({ plugin: 'chao-garden', key: 'garden' } as const, EMPTY_GARDEN)
// Fruits left on this chat's tree; -1 until the chat's first welcome, so a reload doesn't grow a new tree.
const fruitsAtom = atom({ plugin: 'chao-garden', key: 'fruits' } as const, -1)
// Messages you sent in this chat: they grow the tree, seed to full.
const grownAtom = atom({ plugin: 'chao-garden', key: 'grown' } as const, 0)
// The fruit drop in progress, and which chao have walked in for which drop.
const sceneAtom = atom({ plugin: 'chao-garden', key: 'scene' } as const, { phase: 'none', eater: '', n: 0, by: {} } as Scene)

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

// Loads the whole garden. The first time, a new garden is made with two eggs.
const loadGarden = async ($: any, now: number): Promise<Garden> => {
  const saved = await $.store.get('garden')
  if (!saved) {
    const gd = newGarden(now)
    for (const c of gd.chao) await $.store.set(`chao:${c.id}`, c)
    await $.store.set('garden', gd.g)
    return gd
  }
  const g = normalizeGarden(saved, now)
  const chao = []
  for (const id of g.ids) chao.push(normalizeChao(await $.store.get(`chao:${id}`), id, now, g.days, g.turns))
  return { g, chao }
}

type Tree = { fruits: number; grown: number }

// Loads the garden, changes it, moves each chao along its life when due, saves what changed, and
// refreshes the band's look when it changed. `mood` also lets the looks catch up (heart balls, a child's
// lean and colour); otherwise they wait for the next chat.
// One change at a time: Claude's tool runs, Claude's replies and turn ends come close together, and two changes loading the
// garden at once would lose one of them.
let gardenLock: Promise<unknown> = Promise.resolve()
const tendGarden = ($: any, change: (gd: Garden, now: number, tree: Tree) => void, mood = false): Promise<Garden | undefined> => {
  const run = gardenLock.then(() => tendGardenNow($, change, mood))
  gardenLock = run.catch(() => undefined)
  return run
}
const tendGardenNow = async ($: any, change: (gd: Garden, now: number, tree: Tree) => void, mood: boolean): Promise<Garden | undefined> => {
  try {
    const now: number = await $.clock.now()
    const gd = await loadGarden($, now)
    const before = new Map(gd.chao.map(c => [c.id, JSON.stringify(c)]))
    const garden = JSON.stringify(gd.g)
    const tree: Tree = { fruits: await read($, fruitsAtom), grown: await read($, grownAtom) }
    const fruits = tree.fruits
    const grown = tree.grown
    change(gd, now, tree)
    tick(gd, now)
    for (const c of gd.chao) if (before.get(c.id) !== JSON.stringify(c)) await $.store.set(`chao:${c.id}`, c)
    if (garden !== JSON.stringify(gd.g)) await $.store.set('garden', gd.g)
    if (tree.fruits !== fruits) await update($, fruitsAtom, () => tree.fruits)
    if (tree.grown !== grown) await update($, grownAtom, () => tree.grown)
    const old = await read($, gardenAtom)
    const want = gardenLook(gd, treeStage(tree.grown, tree.fruits), old, mood)
    if (!sameLook(old, want)) await update($, gardenAtom, () => want)
    // New stages and new chao show in the band itself; nothing pops up (the garden is only played when you
    // choose to). A hatched chao keeps its random name until /chao name.
    return gd
  } catch {
    return undefined
  }
}

// ---- Fruit ----
// Claude's work ripens coloured fruit: commands red, reading blue, edits green, Claude's talking (and web use) yellow. The meters
// live in the garden save; this chat's work decides its tree kind; at the end of each of Claude's turns the ripe fruit are
// eaten by picky chao and one of them falls from the tree in the band. Nothing in the band redraws while I work:
// the tree's ripeness and kind have their own atom, changed only at a turn end and when a chat starts.
const noWork = (): Record<FruitColor, number> => ({ power: 0, swim: 0, run: 0, fly: 0 })
const treeKindAtom = atom({ plugin: 'chao-garden', key: 'treeKind' } as const, { kind: '' } as TreeKind)
const chatWorkAtom = atom({ plugin: 'chao-garden', key: 'chatWork' } as const, noWork())
const turnWorkAtom = atom({ plugin: 'chao-garden', key: 'turnWork' } as const, { ...noWork(), heard: 0 } as TurnWork)
const treeLookAtom = atom({ plugin: 'chao-garden', key: 'treeLook' } as const, { kind: '', ripe: noWork() } as TreeLook)

// Adds Claude's work to its colour: to the garden's meter (fruit ripen there), to this turn's work (the meters adapt
// from it) and to this chat's work counted in fruit (the tree kind comes from it). `heard`: talking that came
// through session.append.
const recordWork = async ($: any, color: Color, amount: number, heard = false) => {
  if (!(amount > 0)) return
  let meter = 0
  const gd = await tendGarden($, gd => {
    meter = meterOf(gd.g, color)
    addWork(gd, color, amount)
  })
  if (!gd || !meter) return
  await update($, turnWorkAtom, w => ({ ...w, [color]: (w[color] ?? 0) + amount, heard: (w.heard ?? 0) + (heard ? amount : 0) }))
  await update($, chatWorkAtom, w => ({ ...w, [color]: Math.round(((w[color] ?? 0) + amount / meter) * 1000) / 1000 }))
}

// The tree's picture catches up with the garden: its kind and each colour's ripeness.
const refreshTreeLook = async ($: any, gd: Garden) => {
  const want = treeLookOf(gd.g, await read($, treeKindAtom))
  if (JSON.stringify(await read($, treeLookAtom)) !== JSON.stringify(want)) await update($, treeLookAtom, () => want)
}

// The end of one of Claude's turns (on the main loop): if no reply came through session.append, the turn's answer counts
// as its talking; the meters adapt; every ripe fruit is eaten; the tree's picture catches up; and the last fruit
// eaten falls in the band for its eater (not while that chao is fighting, nor while another drop still plays).
const finishTurn = async ($: any, answer: string) => {
  try {
    const heard = (await read($, turnWorkAtom)).heard
    if (!heard && answer.length) await recordWork($, 'fly', answer.length)
    const work = await read($, turnWorkAtom)
    await update($, turnWorkAtom, () => ({ ...noWork(), heard: 0 }))
    const tree = await read($, treeKindAtom)
    let meal: [Color, string][] = []
    const gd = await tendGarden($, gd => {
      endTurn(gd, work)
      meal = eatReady(gd, tree)
    })
    if (!gd) return
    await refreshTreeLook($, gd)
    const last = meal[meal.length - 1]
    if (!last) return
    const [color, eater] = last
    const fight = await read($, fightAtom)
    const scene = await read($, sceneAtom)
    if (!(fight.on && fight.team.includes(eater)) && scene.phase === 'none') void runDrop($, eater, color)
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
    const save = await loadBattle($)
    const practice = why === 'practice'
    if (!practice && (save.off || now - save.last < FIGHT_COOLDOWN)) return 'not now'
    const ch = practice ? '' : await read($, challengeAtom)
    const challenge = ch in CORRUPTIONS
    const out: { b?: Battle } = {}
    const gd = await tendGarden($, gd => {
      const b = runBattle(gd.chao, Math.random, { foe: challenge ? (ch as Corruption) : undefined, hard: challenge ? CHALLENGE_HARD : 1, challenge, lock: save.lock })
      if (b && !practice) b.reward = reward(gd.chao, b, save)
      out.b = b
    })
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

const hatchedNames = (gd: Garden) =>
  gd.chao
    .filter(c => c.hatched)
    .map(c => c.name)
    .join(', ') || 'only eggs so far'

// Deterministic pseudo-random so the drawing is stable between redraws.
const rand = (i: number) => {
  const x = Math.sin(i * 9301 + 49297) * 233280
  return x - Math.floor(x)
}

// Twinkling stars behind the garden, on a jittered grid (cells, each with one star placed randomly inside) so they
// fill evenly.
const STAR_COLORS = ['#ffec99', '#fff3bf', '#a5d8ff']
const starsSvg = (width: number, height: number, density: number): string => {
  const cols = Math.max(6, Math.round(width / density))
  const rows = Math.max(1, Math.round(height / 28))
  const items: string[] = []
  for (let i = 0; i < cols * rows; i++) {
    const cellW = width / cols
    const cellH = height / rows
    const x = Math.round((i % cols + 0.15 + rand(i + 1) * 0.7) * cellW)
    const y = Math.round((Math.floor(i / cols) + 0.3 + rand(i + 101) * 0.6) * cellH) + 4
    const size = 8 + Math.round(rand(i + 201) * 10)
    const dur = (2 + rand(i + 301) * 3).toFixed(1)
    const begin = (rand(i + 401) * 3).toFixed(1)
    items.push(
      `<text x="${x}" y="${y}" font-size="${size}" fill="${STAR_COLORS[i % STAR_COLORS.length]}" text-anchor="middle">\u2726` +
        `<animate attributeName="opacity" values="0.1;1;0.1" dur="${dur}s" begin="${begin}s" repeatCount="indefinite"/></text>`,
    )
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${items.join('')}</svg>`
}
// The stars never change, so they are built once.
const STARS_SVG = starsSvg(900, 84, 52)

// "Chao Garden" in cute script across the top of the band.
const title = (): string =>
  `<defs><linearGradient id="smg" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ff8fc0"/><stop offset="0.5" stop-color="#ffd43b"/><stop offset="1" stop-color="#b197fc"/></linearGradient></defs>` +
  `<text x="450" y="34" font-size="19" font-style="italic" font-weight="bold" text-anchor="middle" fill="url(#smg)" stroke="#ffffff" stroke-width="0.6" paint-order="stroke" font-family="'Segoe Script','Brush Script MT','Comic Sans MS',cursive" letter-spacing="1">` +
  `Chao Garden</text>` +
  `<text x="362" y="31" font-size="10" fill="#ffd43b" text-anchor="middle">\u2726<animate attributeName="opacity" values="1;0.2;1" dur="2s" repeatCount="indefinite"/></text>` +
  `<text x="538" y="31" font-size="10" fill="#ff8fc0" text-anchor="middle">\u2726<animate attributeName="opacity" values="0.2;1;0.2" dur="2.4s" repeatCount="indefinite"/></text>`
const TITLE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="84" viewBox="0 0 900 84">${title()}</svg>`

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

export const register: Register = (on, options) => {
  // the name the chao say they love (the `name` option; none: "I love you!")
  setFriend(options?.name)

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'chao',
      description: 'Your chao garden: see the chao, name them, pet them, their fights',
    })

    // A mod reload cancels the drop and fight timers, so a drop or fight caught half way is closed.
    await update($, sceneAtom, s => ({ ...s, phase: 'none' }))
    await update($, fightAtom, f => ({ ...f, on: false, team: [] }))

    // A new chat: the chao remember you and a fresh tree grows. A reload of the mod runs this again in the same
    // chat; the tree tells them apart.
    // A new chat also starts a new tree kind and its own count of Claude's work; the first chat of the day brings the
    // morning basket, one ripe fruit of each colour, eaten at the end of my first turn.
    let gd: Garden | undefined
    if ((await read($, fruitsAtom)) < 0) {
      await update($, treeKindAtom, () => ({ kind: '' }))
      await update($, chatWorkAtom, () => noWork())
      await update($, turnWorkAtom, () => ({ ...noWork(), heard: 0 }))
      gd = await tendGarden(
        $,
        (gd, now, tree) => {
          const { morning } = welcome(gd, now)
          if (morning) morningBasket(gd)
          tree.fruits = TREE_FRUITS
        },
        true,
      )
    } else gd = await tendGarden($, () => {}, true)
    if (gd) await refreshTreeLook($, gd)
    await refreshChallenge($, gd)

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
        const gd: Garden = { g: { ...freshGarden(now), show: old.g.show, days: old.g.days, lastDay: old.g.lastDay }, chao: [] }
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
    return {
      text: [
        gd ? gardenCard(gd, await read($, fruitsAtom), now, await read($, treeKindAtom)) : lost,
        ...(gd ? ['', ...(await fightCard($, gd))] : []),
        '',
        '/chao name <old name> > <new name>  ·  /chao pet [name]  ·  /chao pace <slow|normal|fast>  ·  /chao garden <on|off>  ·  /chao reset',
        '/chao fight [now|off|on|every <n>]  ·  /chao team [<name>, <name>|clear]',
        "Claude's work ripens coloured fruit on the tree: commands red (Power), reading blue (Swim), edits green (Run), talking yellow (Fly). At the end of each of Claude's turns the ripe fruit fall to the chao that like that colour most (each chao has two favourites), and a fruit gives a lot of its own stat plus a little of others.",
        "Each new chat grows a new tree, and how it went makes it plain, twin or rainbow, which changes what the fruit give. Each message you send gives the hungriest chao a snack (+1 Stamina), pictures are treats, the animals in bubbles go to a random hatched chao, and eggs hatch after 8 messages or 2 hours.",
        'A garden day passes each day you open a chat. At one chao year a well-fed child makes a cocoon and comes out as one of 15 adult forms: Hero, Dark or Neutral from the hours you chat and petting, and Normal, Swim, Fly, Run or Power from its biggest stat (the next biggest can show on top).',
        `Every so many messages (about ${WILD_EVERY} to start; /chao fight every <n> changes it), and when one of Claude's commands fails, a corrupted omochao turns up in the band and up to four hatched chao fight it on their own. Wins train them and leave a trophy; late nights, new moons and very long chats bring a tougher challenger once a day.`,
      ].join('\n'),
    }
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
    // Every message you send grows the tree and gives the hungriest chao a snack from it; pictures are treats.
    // Commands are not food. (The coloured fruit fall at the end of Claude's turns instead.)
    if (!e.command && !e.text.trim().startsWith('/')) {
      let grown = 0
      const gd = await tendGarden($, (gd, now, tree) => {
        tree.grown++
        grown = tree.grown
        if (message(gd, now, !!e.attachments?.length, tree.fruits > 0)) tree.fruits--
      })
      // the message that makes the tree full grown settles its kind, from Claude's work in this chat so far
      if (gd && grown >= TREE_GROWN && (await read($, treeKindAtom)).kind === '') {
        const kind = treeKindOf(await read($, chatWorkAtom))
        await update($, treeKindAtom, () => kind)
        await refreshTreeLook($, gd)
      }
      // the day's challenger waits by the tree for a few messages, then charges in; otherwise a wild omochao
      // wanders in every so many messages
      if (await refreshChallenge($, gd)) {
        challengeWait++
        if (challengeWait >= CHALLENGE_WAIT) void startFight($, 'challenge')
      } else {
        challengeWait = 0
        if (gd && fighters(gd.chao).length && (await countWild($))) void startFight($, 'wild')
      }
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

  // The garden band above the typing box (desktop app only): twinkling stars, the title, the tree, each chao, the day's
  // challenger and any fight. With /chao garden off it shows nothing.
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey || e.surface !== 'desktop') return next(e)
    const look = await read($, gardenAtom)
    if (!look.show) return next(e)

    const { Svg, Box } = $.ui.resolve(e)
    const drop = await read($, sceneAtom)
    const treeLook = await read($, treeLookAtom)
    const fight = await read($, fightAtom)
    const challenger = await read($, challengeAtom)
    const now: number = await $.clock.now()
    // While a fight plays, its picture holds the fighters, so their walkers step out of the band.
    const fightPic = fight.on ? fightPics.get(fight.n) : undefined
    const away = new Set(fightPic ? fight.team : [])

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
        <Box position="absolute" top={-1} left={0}>
          <Svg source={STARS_SVG} alt="Twinkling stars" width={900} height={84} isInteractive />
        </Box>
        {/* The title is its own picture, so it can step aside while a fight plays in the middle of the band. */}
        {fightPic ? null : (
          <Box key="title" position="absolute" top={-1} left={0}>
            <Svg source={TITLE_SVG} alt="Chao Garden" width={900} height={84} />
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
        {challenger in CORRUPTIONS && !fightPic ? (
          <Box key="challenger" position="absolute" top={-1} left={20}>
            <Svg source={challengerSvg(challenger as Corruption)} alt={`A ${CORRUPTIONS[challenger as Corruption].name} waits by the tree`} width={64} height={84} isInteractive />
          </Box>
        ) : null}
        {fightPic ? (
          <Box key={`fight${fight.n}`} position="absolute" top={-1} left={0}>
            <Svg source={fightPic} alt="Your chao fight a corrupted omochao" width={900} height={84} isInteractive />
          </Box>
        ) : null}
        {/* Everything above is absolute; this empty box is what gives the band its height. */}
        <Box height={BAND_ROWS} />
      </Box>
    )
  })
}
