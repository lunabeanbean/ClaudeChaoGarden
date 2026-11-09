import { expect, mock, test } from 'claude-code/testing'

// /chao visit switches the band between the crystal cave, the moonlit Dark Garden and the sunset Light Garden, and the choice is saved.
const SEED = {
  garden: { ids: ['c1'], chosen: 'c1', show: true, days: 3, lastDay: '2026-11-3', lastSeen: 1793604352118, nextId: 2, pace: 'normal' },
  'chao:c1': { id: 'c1', name: 'Mochi', born: 1793578234577, lives: 1, parents: [], stage: 'baby', hatched: true, age: 0, warmth: 8, chats: 3, messages: 9, treats: 0, tools: 0, pets: 0, animals: 0, happiness: 60, hunger: 40, align: 0, compass: { swimFly: 0, runPower: 0 }, stats: { swim: 1, fly: 1, run: 1, power: 1, stamina: 1 }, parts: {} },
}
const BAND = { hasSurvey: false, isWorking: false, maxRows: 20, bodyColumns: 110, scroll: { offset: 0, bodyRows: 20 }, view: {} }

const start = async ($: any, on: any, store: Record<string, unknown>) => {
  mock.clock(on, { now: Date.parse('2026-11-03T14:00:00') })
  mock.store(on, store)
  on('command.register', () => ({ value: { command: 'x' } }))
  on('session.start', (_: any, e: any) => ({ cwd: e.cwd }))
  on('prompt.submit', (_: any, e: any) => e)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  return $.ui.mount({ plugin: 'chao-garden', surface: 'desktop', component: 'AbovePrompt', props: BAND })
}
const say = async ($: any, args: string) => String(((await $.command.run({ command: 'chao', args })) as any).text)

test('the band starts in the crystal cave and /chao visit moves it to the Dark Garden, the Light Garden and back', async ($, on) => {
  const band = await start($, on, SEED)
  expect(await band.find({ key: 'scene-neutral' })).toBeDefined()
  expect(await band.find({ key: 'scene-dark' })).toBeUndefined()
  expect(await band.find({ key: 'c1' })).toBeDefined()

  expect(await say($, 'visit')).toContain('/chao visit dark')
  expect(await say($, 'visit dark')).toContain('Dark Garden')
  expect(await band.find({ key: 'scene-dark' })).toBeDefined()
  expect(await band.find({ key: 'scene-neutral' })).toBeUndefined()
  // the chao and the title come along
  expect(await band.find({ key: 'c1' })).toBeDefined()
  expect(await band.find({ key: 'title' })).toBeDefined()
  expect(await say($, '')).toContain('☾ Dark garden')

  expect(await say($, 'visit light')).toContain('Light Garden')
  expect(await band.find({ key: 'scene-light' })).toBeDefined()
  expect(await band.find({ key: 'scene-dark' })).toBeUndefined()
  expect(await band.find({ key: 'c1' })).toBeDefined()
  expect(await say($, '')).toContain('☀ Light garden')

  expect(await say($, 'visit neutral')).toContain('crystal cave')
  expect(await band.find({ key: 'scene-neutral' })).toBeDefined()
  expect(await say($, '')).toContain('✦ Chao garden')
})

test('a chat opens on the garden picked in another chat', async ($, on) => {
  const band = await start($, on, { ...SEED, garden: { ...SEED.garden, view: 'dark' } })
  expect(await band.find({ key: 'scene-dark' })).toBeDefined()
  expect(await band.find({ key: 'c1' })).toBeDefined()
})
