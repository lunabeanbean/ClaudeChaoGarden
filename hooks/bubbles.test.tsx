import { expect, mock, test } from 'claude-code/testing'

// The animals in bubbles sit on a row under whatever draws the bubble: here a stand-in for another mod's message
// frames, loaded beneath the garden (as a mod listed after it is).
const SEED = {
  garden: { ids: ['c1'], chosen: 'c1', show: true, days: 3, lastDay: '2026-11-2', lastSeen: 1793604352118, nextId: 2, pace: 'normal' },
  'chao:c1': { id: 'c1', name: 'Mochi', born: 1793578234577, lives: 1, parents: [], stage: 'baby', hatched: true, age: 0, warmth: 8, chats: 3, messages: 9, treats: 0, tools: 0, pets: 0, animals: 0, happiness: 60, hunger: 40, align: 0, compass: { swimFly: 0, runPower: 0 }, stats: { swim: 1, fly: 1, run: 1, power: 1, stamina: 1 }, parts: {} },
}

const FRAMES = {
  name: 'frames',
  tier: 'append' as const,
  register(on: any) {
    for (const component of ['UserMessage', 'AssistantMessage'])
      on('ui.render', { component }, async ($: any, e: any) => {
        const { Box, Text } = $.ui.resolve(e)
        return h(Box, { key: 'frame', borderStyle: 'round' }, h(Text, null, e.props.text))
      })
  },
}

test('an animal shows under a framed bubble now and then, and clicking it gives its part to a chao', { plugins: [FRAMES] }, async ($, on) => {
  mock.clock(on, { now: Date.parse('2026-11-03T14:00:00') })
  const store = mock.store(on, SEED)
  on('command.register', () => ({ value: { command: 'x' } }))
  on('session.start', (_: any, e: any) => ({ cwd: e.cwd }))
  on('prompt.submit', (_: any, e: any) => e)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  // bubbles count only after you send in this chat
  await $.prompt.submit({ text: 'hello', origin: { kind: 'sdk' } } as any)

  let withAnimal: any
  let plain = 0
  for (let i = 0; i < 7; i++) {
    const ui = await $.ui.mount({ plugin: 'chao-garden', surface: 'desktop', component: 'AssistantMessage', requestId: `r${i}`, props: { text: `reply ${i}`, isFirstOfReply: true, onScreen: null } as any })
    // the frame beneath is always drawn
    expect(await ui.find({ key: 'frame' })).toBeDefined()
    if (await ui.find({ key: 'animal' })) withAnimal ??= ui
    else plain++
  }
  // one every 4-6 bubbles: at least one of seven, and not all of them
  expect(withAnimal).toBeDefined()
  expect(plain).toBeGreaterThan(0)

  await withAnimal.press({ key: 'animal' })
  expect(await withAnimal.find({ key: 'animal' })).toBeUndefined()
  expect(await withAnimal.find({ key: 'frame' })).toBeDefined()
  const card = String(((await $.command.run({ command: 'chao', args: '' })) as any).text)
  expect(card).toContain('Wearing:')
  expect(card).toMatch(/· 1 animals? ·/)
  void store
})

test('a summary or a task note gets no animal', { plugins: [FRAMES] }, async ($, on) => {
  mock.store(on, SEED)
  on('command.register', () => ({ value: { command: 'x' } }))
  on('session.start', (_: any, e: any) => ({ cwd: e.cwd }))
  on('prompt.submit', (_: any, e: any) => e)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  await $.prompt.submit({ text: 'hello', origin: { kind: 'sdk' } } as any)
  for (let i = 0; i < 7; i++) {
    const ui = await $.ui.mount({ plugin: 'chao-garden', surface: 'desktop', component: 'AssistantMessage', requestId: `s${i}`, props: { text: 'summary', isFirstOfReply: true, isSummary: true, onScreen: null } as any })
    expect(await ui.find({ key: 'animal' })).toBeUndefined()
    expect(await ui.find({ key: 'frame' })).toBeDefined()
  }
})
