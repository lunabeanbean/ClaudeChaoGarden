import { expect, mock, test } from 'claude-code/testing'

// The chao cards in the side window: /chao opens them, tabs switch chao, Pet pets, a click on the band picks the
// chao under it, and a window the app can't show is closed again (with the text card in the chat instead).
const SEED = {
  garden: { ids: ['c1', 'c2', 'c3'], chosen: '', show: true, days: 3, lastDay: '2026-11-3', lastSeen: 1793604352118, nextId: 4, pace: 'normal', view: 'light', champ: 'c1' },
  'chao:c1': { id: 'c1', name: 'Peach', born: 1793578234577, lives: 1, parents: [], stage: 'child', hatched: true, age: 1, warmth: 8, chats: 3, messages: 9, treats: 1, tools: 0, pets: 0, animals: 0, happiness: 60, hunger: 40, align: -20, compass: { swimFly: 0, runPower: 0 }, stats: { swim: 9, fly: 24, run: 13, power: 41, stamina: 22 }, parts: {}, ate: { power: 8, swim: 0, run: 0, fly: 4 }, lastFruit: 0 },
  'chao:c2': { id: 'c2', name: '', born: Date.parse('2026-11-03T13:30:00'), lives: 1, parents: [], stage: 'egg', hatched: false, age: 0, warmth: 3, chats: 1, messages: 0, treats: 0, tools: 0, pets: 0, animals: 0, happiness: 50, hunger: 0, align: 0, compass: { swimFly: 0, runPower: 0 }, stats: { swim: 0, fly: 0, run: 0, power: 0, stamina: 0 }, parts: {} },
  'chao:c3': { id: 'c3', name: 'Bubbles', born: 1792961955935, lives: 1, parents: [], stage: 'adult', hatched: true, age: 9, warmth: 8, chats: 40, messages: 90, treats: 5, tools: 0, pets: 2, animals: 3, happiness: 90, hunger: 20, align: -60, kind: 'dark', type: 'power', grownAt: 3, compass: { swimFly: 0, runPower: 0 }, stats: { swim: 120, fly: 60, run: 200, power: 420, stamina: 150 }, parts: { tail: 'raccoon', ears: 'raccoon', face: 'raccoon' }, cls: { main: 'warrior', seed: 4242 }, ate: { power: 30, swim: 4, run: 14, fly: 9 }, lastFruit: 0 },
  race: { runs: 2, medals: { c1: [1, 0, 0], c3: [1, 1, 0] }, best: {}, since: 0, due: 13, every: 15 },
}
const BAND = { hasSurvey: false, isWorking: false, maxRows: 20, bodyColumns: 110, scroll: { offset: 0, bodyRows: 20 }, view: {} }
const PANE = { title: 'Chao', isFocused: false, bodyColumns: 64, placement: 'dock', scroll: { offset: 0, bodyRows: 40 }, view: {} }

const start = async ($: any, on: any, placed = true) => {
  const opened: string[] = []
  const closed: string[] = []
  mock.clock(on, { now: Date.parse('2026-11-03T14:00:00') })
  mock.store(on, SEED)
  on('command.register', () => ({ value: { command: 'x' } }))
  on('session.start', (_: any, e: any) => ({ cwd: e.cwd }))
  on('prompt.submit', (_: any, e: any) => e)
  on('ui.open', (_: any, e: any) => {
    opened.push(e.id)
    return { value: placed ? { isPlaced: true } : { isPlaced: false, reason: 'too narrow (test)' } }
  })
  on('ui.close', (_: any, e: any) => {
    closed.push(e.id)
    return { value: undefined }
  })
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  return { opened, closed }
}
const say = async ($: any, args: string) => String(((await $.command.run({ command: 'chao', args })) as any).text)
// The picture inside a keyed box of the window: its props (source, alt).
const svgIn = async (ui: any, key: string) => {
  const box = await ui.find({ key })
  const pic = (box?.children ?? []).find((c: any) => c && c.type === 'Svg') as any
  return pic?.props as { source: string; alt: string } | undefined
}
const pane = ($: any, surface: 'desktop' | 'terminal' = 'desktop') => $.ui.mount({ plugin: 'chao-garden', surface, component: 'Pane', requestId: 'chao-cards', props: PANE })

test('/chao opens the chao cards in the side window, with a tab for each chao', { timeoutMs: 20000 }, async ($, on) => {
  const { opened } = await start($, on)
  expect(await say($, '')).toContain('side window')
  expect(opened).toEqual(['chao-cards'])

  const ui = await pane($)
  // one tab per chao, in garden order; the egg is "Egg", the gold medal winner has its medal
  expect((await ui.find({ key: 'tab-c1' }))?.props.label).toBe('Peach 🥇')
  expect((await ui.find({ key: 'tab-c2' }))?.props.label).toBe('🥚 Egg')
  expect((await ui.find({ key: 'tab-c3' }))?.props.label).toBe('Bubbles')
  // the first hatched chao is shown first: its picture card, a Pet button, the garden card
  expect((await ui.find({ key: 'tab-c1' }))?.props.variant).toBe('primary')
  const first = await svgIn(ui, 'chao-card')
  expect(first?.alt).toBe("Peach's card")
  expect(String(first?.source)).toContain('Peach')
  expect(String(first?.source).length).toBeLessThan(131072)
  expect((await svgIn(ui, 'garden-card'))?.alt).toContain('The garden')
  expect((await ui.find({ key: 'card-pet' }))?.props.label).toBe('♥ Pet Peach')

  // a tab switches the card
  await ui.press({ key: 'tab-c3' })
  const adult = await svgIn(ui, 'chao-card')
  expect(adult?.alt).toBe("Bubbles's card")
  expect(String(adult?.source)).toContain('Master Warrior')
  expect(String(adult?.source)).toContain('Dark Power')
  expect((await ui.find({ key: 'tab-c3' }))?.props.variant).toBe('primary')

  // Pet pets the chao on the card (+5 happiness) and the card shows it
  const happy = async () => Number(/class="happiness">(\d+)</.exec(String((await svgIn(ui, 'chao-card'))?.source))?.[1])
  const before = await happy()
  expect(before).toBeGreaterThan(50)
  await ui.press({ key: 'card-pet' })
  expect(await happy()).toBe(Math.min(100, before + 5))

  // the egg has a card of its own and no Pet button
  await ui.press({ key: 'tab-c2' })
  const egg = await svgIn(ui, 'chao-card')
  expect(egg?.alt).toBe("An egg's card")
  expect(String(egg?.source)).toContain('3 of 8 messages heard')
  expect(await ui.find({ key: 'card-pet' })).toBeUndefined()

  // /chao <name> opens on that chao; /chao help still gives the whole text
  expect(await say($, 'Peach')).toContain("Peach's card is open")
  expect((await ui.find({ key: 'tab-c1' }))?.props.variant).toBe('primary')
  const help = await say($, 'help')
  expect(help).toContain('☀ Light garden')
  expect(help).toContain('/chao fight')
})

test('a click on a chao in the band opens its card', { timeoutMs: 20000 }, async ($, on) => {
  const { opened } = await start($, on)
  const band = await $.ui.mount({ plugin: 'chao-garden', surface: 'desktop', component: 'AbovePrompt', props: BAND, viewport: { columns: 110, rows: 40 } as any })
  expect(await band.find({ key: 'band-touch' })).toBeDefined()
  // the egg c2 sits at x 420 (eggSpot): column 53
  await band.pointer({ type: 'down', x: 53, y: 1, button: 'left' })
  await band.pointer({ type: 'up', x: 53, y: 1, button: 'left' })
  expect(opened).toEqual(['chao-cards'])
  const ui = await pane($)
  expect((await ui.find({ key: 'tab-c2' }))?.props.variant).toBe('primary')

  // a drag is not a click
  await band.pointer({ type: 'down', x: 10, y: 1, button: 'left' })
  await band.pointer({ type: 'up', x: 40, y: 1, button: 'left' })
  expect(opened.length).toBe(1)
})

test('a side window the app cannot show is closed again and /chao prints the text card', { timeoutMs: 20000 }, async ($, on) => {
  const { opened, closed } = await start($, on, false)
  const text = await say($, '')
  expect(opened).toEqual(['chao-cards'])
  expect(closed).toEqual(['chao-cards'])
  expect(text).toContain('☀ Light garden')
  expect(text).toContain('Peach')
})

test('outside the desktop app the side window shows the card as text', { timeoutMs: 20000 }, async ($, on) => {
  await start($, on)
  const ui = await pane($, 'terminal')
  expect(await ui.find({ type: 'Svg' })).toBeUndefined()
  expect(await ui.find({ type: 'Text', text: /✦ Peach: child/ })).toBeDefined()
})

test('/chao click off takes the touch layer off the band, and /chao click on puts it back', { timeoutMs: 20000 }, async ($, on) => {
  await start($, on)
  const band = await $.ui.mount({ plugin: 'chao-garden', surface: 'desktop', component: 'AbovePrompt', props: BAND })
  expect(await band.find({ key: 'band-touch' })).toBeDefined()
  expect(await say($, 'click off')).toContain('no longer opens')
  expect(await band.find({ key: 'band-touch' })).toBeUndefined()
  // the garden itself is still there
  expect(await band.find({ key: 'c1' })).toBeDefined()
  expect(await say($, 'click')).toContain('does not open')
  expect(await say($, 'click on')).toContain('Click a chao')
  expect(await band.find({ key: 'band-touch' })).toBeDefined()
})
