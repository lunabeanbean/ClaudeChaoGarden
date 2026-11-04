export type ChaoType = 'normal' | 'swim' | 'fly' | 'run' | 'power'

// What the band needs to draw one chao. Changes only when it hatches, grows, is renamed or petted,
// or a new chat opens, so the band is not redrawn on every message.
export type ChaoLook = {
  id: string
  stage: 'egg' | 'baby' | 'child' | 'cocoon' | 'adult'
  kind: 'neutral' | 'hero' | 'dark'
  name: string
  happy: boolean
  parts: ChaoParts
  // babies and children: how far along the year they are (0-3), the type they lean to, and how far
  // their colour has drifted toward Hero white or Dark red (0-1)
  grow?: number
  lean?: ChaoType
  tint?: number
  // adults: the type it evolved into, the second type on top at half strength, how bold its features
  // have grown with age (0-2), and the lots-of-Run touch (Neutral Run turns dark blue, Dark Run's marks red)
  type?: ChaoType
  second?: ChaoType
  bold?: number
  special?: boolean
  // adults that have found their class
  cls?: ChaoClass
}

// The four adventurer classes. Each comes from one stat: Healer (a bard with a lyre) from Swim, Warrior from Power,
// Ranger from Run, Wizard from Fly.
export type ClassName = 'warrior' | 'wizard' | 'ranger' | 'healer'

// The class gear a chao wears: its class, how good the gear is (0 novice, 1 adept, 2 master) and the seed its
// colours (hat, shield, sparkles...) are drawn from.
export type ChaoClass = { name: ClassName; tier: 0 | 1 | 2; seed: number }

// Which animal each body spot came from (SA2-style animal parts).
export type ChaoParts = { tail?: string; ears?: string; face?: string; forehead?: string; feet?: string; horns?: string }

export type TreeLevel = 'seed' | 'sprout' | 'sapling' | 'young' | 'full' | 'half' | 'bare'

// The four fruit colours, each named after the stat it feeds: red Power (Claude's commands), blue Swim (Claude's reading),
// green Run (Claude's edits), yellow Fly (Claude's talking and web use).
export type FruitColor = 'swim' | 'fly' | 'run' | 'power'

// This chat's tree kind, settled once when the tree is full grown ('' until then): plain (one kind of work), twin
// (two kinds, `a` and `b`) or rainbow (a mix). It changes the fruit's recipe.
export type TreeKind = { kind: '' | 'plain' | 'twin' | 'rainbow'; a?: FruitColor; b?: FruitColor }

// What the band draws of the tree beyond its stage: its kind and how ripe each colour's fruit is (0 bud, 1 small,
// 2 half, 3 ripe). Changes only at the end of Claude's turn and when a chat starts.
export type TreeLook = TreeKind & { ripe: Record<FruitColor, number> }

// Claude's work in this turn so far, per colour (runs, or characters for yellow); `heard` is how much of Claude's talking
// came through session.append (when none did, the turn's answer is counted instead).
export type TurnWork = Record<FruitColor, number> & { heard: number }

// A fruit drop: it falls, lies on the ground while a chao walks in, then is eaten. `by` remembers which
// chao has played its walk-in in this chat (and for which drop), so its picture does not change again.
// `color` is the colour of the fruit that falls.
export type Scene = { phase: 'none' | 'fall' | 'walk'; eater: string; n: number; by: Record<string, { n: number; x0: number }>; color?: FruitColor }

// What the band needs to draw the garden: whether it shows, the fruit tree and each chao.
export type GardenLook = {
  show: boolean
  tree: TreeLevel
  chao: ChaoLook[]
}

// The fight playing in the band: its number (its picture is kept by number in module memory), whether it is on,
// and which chao are in it (their walkers step out of the band while it plays).
export type FightLook = { n: number; on: boolean; team: string[] }

declare module 'claude-code' {
  interface PluginState {
    // garden: the band's look; fruits: fruits left on this chat's tree (-1 until the chat's first welcome)
    // animalTaken: per message, whether its animal was already given to a chao
    // fight: the fight playing in the band; challenge: the day's challenger waiting by the tree ('' when none)
    // treeKind: this chat's tree kind; chatWork: this chat's work in fruit (work / meter per colour);
    // turnWork: Claude's work in the turn so far; treeLook: what the band draws of the tree (kind and ripeness)
    'chao-garden': {
      garden: GardenLook
      fruits: number
      grown: number
      scene: Scene
      animalTaken: StateFamily<boolean>
      eggTaken: StateFamily<boolean>
      fight: FightLook
      challenge: string
      treeKind: TreeKind
      chatWork: Record<FruitColor, number>
      turnWork: TurnWork
      treeLook: TreeLook
    }
  }
}
