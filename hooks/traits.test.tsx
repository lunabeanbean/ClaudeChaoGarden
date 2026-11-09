import { expect, mock, test } from 'claude-code/testing'

// Temperaments and animals in fights (1.7.0). The saves are from before 1.7.0: no `gifts` anywhere.
// Puff: a Neutral adult Warrior with a calm lean (Mimic) wearing three raccoon pieces, given once (so no Swipe yet).
// Kiki: a child leaning far Dark (Shadow Bite), wearing tiger ears and tail. Sugar: a Hero child, lean +35 (no Rally).
const SEED = {
  garden: { ids: ['c1', 'c2', 'c3'], chosen: 'c1', show: true, days: 10, lastDay: '2026-11-2', lastSeen: 1793604352118, nextId: 4, pace: 'normal' },
  'chao:c1': { id: 'c1', name: 'Puff', born: 1792961955935, lives: 1, parents: [], stage: 'adult', hatched: true, age: 7, warmth: 3, chats: 79, messages: 129, treats: 22, tools: 1900, pets: 0, animals: 6, happiness: 100, hunger: 75, align: 4, compass: { swimFly: 0, runPower: 0 }, stats: { swim: 554, fly: 56, run: 343, power: 898, stamina: 319 }, parts: { ears: 'raccoon', tail: 'raccoon', face: 'raccoon' }, kind: 'neutral', type: 'swim', grownAt: 3, cls: { main: 'warrior', seed: 40545 } },
  'chao:c2': { id: 'c2', name: 'Kiki', born: 1793578234577, lives: 1, parents: [], stage: 'child', hatched: true, age: 1, warmth: 8, chats: 30, messages: 48, treats: 4, tools: 50, pets: 0, animals: 2, happiness: 100, hunger: 65, align: -134, compass: { swimFly: 0, runPower: 0 }, stats: { swim: 10, fly: 0, run: 6, power: 28, stamina: 54 }, parts: { ears: 'tiger', tail: 'tiger' } },
  'chao:c3': { id: 'c3', name: 'Sugar', born: 1793596541057, lives: 1, parents: [], stage: 'child', hatched: true, age: 1, warmth: 8, chats: 12, messages: 30, treats: 0, tools: 0, pets: 0, animals: 0, happiness: 82, hunger: 65, align: 35, compass: { swimFly: 0, runPower: 0 }, stats: { swim: 11, fly: 0, run: 10, power: 34, stamina: 19 }, parts: {} },
}
const DAY = Date.parse('2026-11-02T14:00:00')
const BAND = { hasSurvey: false, isWorking: false, maxRows: 20, bodyColumns: 110, scroll: { offset: 0, bodyRows: 20 }, view: {} }
const PANE = { title: 'Chao', isFocused: false, bodyColumns: 64, placement: 'dock', scroll: { offset: 0, bodyRows: 40 }, view: {} }

const start = async ($: any, on: any, store: Record<string, unknown> = SEED) => {
  const clock = mock.clock(on, { now: DAY })
  mock.store(on, store)
  on('command.register', () => ({ value: { command: 'x' } }))
  on('session.start', (_: any, e: any) => ({ cwd: e.cwd }))
  on('prompt.submit', (_: any, e: any) => e)
  on('tool.call', () => ({ result: 'ok', text: 'ok' }))
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  const band = await $.ui.mount({ plugin: 'chao-garden', surface: 'desktop', component: 'AbovePrompt', props: BAND })
  return { clock, band }
}
const text = async ($: any, args: string) => String(((await $.command.run({ command: 'chao', args })) as any).text)
// the picture card in the side window, for the chao on the given tab
const cardSource = async (ui: any, tab: string) => {
  await ui.press({ key: tab })
  const box = await ui.find({ key: 'chao-card' })
  const pic = (box?.children ?? []).find((c: any) => c && c.type === 'Svg') as any
  return String(pic?.props?.source ?? '')
}
const pane = ($: any) => $.ui.mount({ plugin: 'chao-garden', surface: 'desktop', component: 'Pane', requestId: 'chao-cards', props: PANE })

test('an old save loads and the cards show each temperament and animal', { timeoutMs: 20000 }, async ($, on) => {
  await start($, on)
  // the text card (/chao help) shows the first chao in full
  const help = await text($, 'help')
  console.log(help)
  // Puff (shown first): Neutral, calm, so Mimic is on; raccoon x3 worn once: buff and passive, skill not yet
  expect(help).toContain('✦ Temperament: Neutral (lean +4) · Adaptable (passive)')
  expect(help).toMatch(/Mimic \(skill, at a lean between -15 and \+15\): copies .* ✓/)
  expect(help).toContain('🦝 Raccoon: wears tail and ears and face, given 1 time · Slippery: +4% dodge · Sneaky (passive): ')
  expect(help).toContain('Swipe (skill) once given 3 times')
  // the garden list tags the trait skills each one knows
  expect(help).toMatch(/Puff · .* · ✦ Mimic/)
  expect(help).toMatch(/Kiki · .* · ☾ Shadow Bite/)
  expect(help).not.toMatch(/Sugar · .*☀ Rally/)
  expect(help).toContain('In fights each chao also brings its temperament and its animals.')

  // the picture cards in the side window have an "In fights" panel
  const ui = await pane($)
  const puff = await cardSource(ui, 'tab-c1')
  expect(puff).toContain('IN FIGHTS')
  expect(puff).toContain('✦ Neutral')
  expect(puff).toContain('Mimic: copies the last special move')
  expect(puff).toContain('Swipe · given 3×')
  const kiki = await cardSource(ui, 'tab-c2')
  expect(kiki).toContain('☾ Dark')
  expect(kiki).toContain('Shadow Bite: a shadowy bite')
  expect(kiki).toContain('🐯 Tiger')
  expect(kiki).toContain('Finisher: hits 15% harder')
  expect(kiki.length).toBeLessThan(131072)
  const sugar = await cardSource(ui, 'tab-c3')
  expect(sugar).toContain('☀ Hero')
  expect(sugar).toContain('Rally · lean +60')
  expect(sugar).toContain('No animal pieces on')
})

test('fights use the new skills and passives, and the log names them', { timeoutMs: 40000 }, async ($, on) => {
  const { clock, band } = await start($, on)
  const seen = new Set<string>()
  for (let i = 1; i <= 6 && !(seen.has('Shadow Bite') && seen.has('Mimic')); i++) {
    const r = await text($, 'fight now')
    expect(r).toContain('practice fight')
    await clock.settle()
    expect(await band.find({ key: `fight${i}` })).toBeDefined()
    await clock.advance(40_000)
    const log = await text($, 'fight')
    if (i === 1) console.log(log)
    expect(log).toMatch(/Traits: Puff: Adaptable, Sneaky, Mimic/)
    expect(log).toMatch(/Kiki: Sharp Edge, Finisher, Shadow Bite/)
    if (log.includes('uses Shadow Bite on')) seen.add('Shadow Bite')
    if (log.includes('uses Mimic: it copies')) seen.add('Mimic')
    if (log.includes("Sugar's Warm Heart: the whole team starts with Regen.")) seen.add('Warm Heart')
  }
  expect(seen.has('Shadow Bite')).toBe(true)
  expect(seen.has('Mimic')).toBe(true)
  // Sugar's Hero passive starts every fight she is in with Regen for the team
  expect(seen.has('Warm Heart')).toBe(true)
})

test('an animal given three times teaches its skill while a piece is worn', { timeoutMs: 20000 }, async ($, on) => {
  const store = { ...SEED, 'chao:c1': { ...SEED['chao:c1'], gifts: { raccoon: 3, rabbit: 2 } } }
  await start($, on, store)
  const help = await text($, 'help')
  expect(help).toContain('Swipe (skill): a quick paw that may snatch an extra trophy')
  // a rabbit given twice but with no piece worn now does nothing until one is back on
  expect(help).toContain('Given before, no piece worn now (no effect until one is): 🐰 rabbit ×2')
  expect(help).toMatch(/Puff · .* · ✦ Mimic · 🦝 Swipe/)
  const ui = await pane($)
  const puff = await cardSource(ui, 'tab-c1')
  expect(puff).toContain('Swipe: a quick paw')
  expect(puff).toContain('Given before, no piece on now: Rabbit ×2')
})
