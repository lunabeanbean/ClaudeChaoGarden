import { expect, mock, test } from 'claude-code/testing'

// A sample garden (Puff the Warrior, Kiki a child, Bubbles a baby).
const SEED = {"garden":{"ids":["c1","c2","c3"],"chosen":"c1","show":true,"days":10,"lastDay":"2026-11-2","lastSeen":1793604352118,"nextId":4,"pace":"normal"},"chao:c1":{"id":"c1","name":"Puff","born":1792961955935,"lives":1,"parents":[],"stage":"adult","hatched":true,"age":7,"warmth":3,"chats":79,"messages":129,"treats":22,"tools":1900,"pets":0,"animals":6,"happiness":100,"hunger":75,"align":-49,"compass":{"swimFly":-0.745,"runPower":0.367},"stats":{"swim":554,"fly":56,"run":343,"power":898,"stamina":319},"parts":{"ears":"raccoon","tail":"raccoon","face":"raccoon"},"kind":"neutral","type":"swim","grownAt":3,"cls":{"main":"warrior","seed":40545}},"chao:c2":{"id":"c2","name":"Kiki","born":1793578234577,"lives":1,"parents":[],"stage":"child","hatched":true,"age":1,"warmth":8,"chats":30,"messages":48,"treats":4,"tools":50,"pets":0,"animals":0,"happiness":100,"hunger":65,"align":-134,"compass":{"swimFly":-0.183,"runPower":0.318},"stats":{"swim":10,"fly":0,"run":6,"power":28,"stamina":54},"parts":{}},"chao:c3":{"id":"c3","name":"Bubbles","born":1793596541057,"lives":1,"parents":[],"stage":"baby","hatched":true,"age":0,"warmth":8,"chats":12,"messages":11,"treats":0,"tools":63,"pets":0,"animals":0,"happiness":82,"hunger":65,"align":-112,"compass":{"swimFly":-0.199,"runPower":0.346},"stats":{"swim":11,"fly":0,"run":10,"power":34,"stamina":19},"parts":{}}}
const DAY = Date.parse('2026-11-02T14:00:00')
const NIGHT = Date.parse('2026-11-02T23:30:00')
const BAND = { hasSurvey: false, isWorking: false, maxRows: 20, bodyColumns: 110, scroll: { offset: 0, bodyRows: 20 }, view: {} }
const FAIL = { isError: true, result: 'Exit code 1', text: 'Exit code 1' } as const

const start = async ($: any, on: any, now: number, store: Record<string, unknown> = SEED) => {
  const clock = mock.clock(on, { now })
  mock.store(on, store)
  on('command.register', () => ({ value: { command: 'x' } }))
  on('session.start', (_: any, e: any) => ({ cwd: e.cwd }))
  on('prompt.submit', (_: any, e: any) => e)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  const band = await $.ui.mount({ plugin: 'chao-garden', surface: 'desktop', component: 'AbovePrompt', props: BAND })
  return { clock, band }
}

test('a failed command starts a fight in the band, once per cooldown', async ($, on) => {
  let fail = true
  on('tool.call', () => (fail ? FAIL : { result: 'ok', text: 'ok' }))
  const { clock, band } = await start($, on, DAY)
  expect(await band.find({ key: 'fight1' })).toBeUndefined()
  expect(await band.find({ key: 'c1' })).toBeDefined()
  expect(await band.find({ key: 'challenger' })).toBeUndefined()
  expect(await band.find({ key: 'title' })).toBeDefined()

  fail = false
  await $.tool.call({ tool: 'Bash', command: 'true' })
  await clock.settle()
  expect(await band.find({ key: 'fight1' })).toBeUndefined()

  fail = true
  await $.tool.call({ tool: 'Bash', command: 'false' })
  await clock.settle()
  const fight = await band.find({ key: 'fight1' })
  expect(fight).toBeDefined()
  const svg = await band.find({ type: 'Svg', text: /fight/ })
  console.log('fight svg', svg ? 'found' : 'not found by text')
  // the fighters' walkers step out while it plays, and the title makes room for it
  expect(await band.find({ key: 'c1' })).toBeUndefined()
  expect(await band.find({ key: 'title' })).toBeUndefined()

  await clock.advance(40_000)
  expect(await band.find({ key: 'fight1' })).toBeUndefined()
  expect(await band.find({ key: 'c1' })).toBeDefined()
  expect(await band.find({ key: 'title' })).toBeDefined()

  // inside the cooldown nothing new starts
  await $.tool.call({ tool: 'Bash', command: 'false' })
  await clock.settle()
  expect(await band.find({ key: 'fight2' })).toBeUndefined()

  await clock.advance(4 * 60_000)
  await $.tool.call({ tool: 'Bash', command: 'false' })
  await clock.settle()
  expect(await band.find({ key: 'fight2' })).toBeDefined()

  const log = await $.command.run({ command: 'chao', args: 'fight' })
  console.log(String((log as any).text))
  expect(String((log as any).text)).toContain('omochao appears')
  const card = await $.command.run({ command: 'chao', args: '' })
  console.log(String((card as any).text))
  expect(String((card as any).text)).toMatch(/Fights: [0-9]+ won, [0-9]+ lost/)
})

test('/chao fight now plays a practice fight; /chao fight off stops the automatic ones', async ($, on) => {
  on('tool.call', () => FAIL)
  const { clock, band } = await start($, on, DAY)
  const r = await $.command.run({ command: 'chao', args: 'fight now' })
  console.log(String((r as any).text))
  await clock.settle()
  expect(await band.find({ key: 'fight1' })).toBeDefined()
  const again = await $.command.run({ command: 'chao', args: 'fight now' })
  expect(String((again as any).text)).toContain('already')
  await clock.advance(40_000)
  await $.command.run({ command: 'chao', args: 'fight off' })
  await $.tool.call({ tool: 'Bash', command: 'false' })
  await clock.settle()
  expect(await band.find({ key: 'fight2' })).toBeUndefined()
  await $.command.run({ command: 'chao', args: 'fight on' })
  await $.tool.call({ tool: 'Bash', command: 'false' })
  await clock.settle()
  expect(await band.find({ key: 'fight2' })).toBeDefined()
  const team = await $.command.run({ command: 'chao', args: 'team Kiki' })
  console.log(String((team as any).text))
  const t2 = await $.command.run({ command: 'chao', args: 'team' })
  console.log(String((t2 as any).text))
  expect(String((t2 as any).text)).toContain('Always in front: Kiki')
})

test('late at night the challenger waits by the tree, then charges in', async ($, on) => {
  on('tool.call', () => ({ result: 'ok', text: 'ok' }))
  const { clock, band } = await start($, on, NIGHT)
  expect(await band.find({ key: 'challenger' })).toBeDefined()
  for (let i = 0; i < 4; i++) await $.prompt.submit({ text: 'hello ' + i })
  await clock.settle()
  expect(await band.find({ key: 'fight1' })).toBeUndefined()
  await $.prompt.submit({ text: 'hello 5' })
  await clock.settle()
  expect(await band.find({ key: 'fight1' })).toBeDefined()
  expect(await band.find({ key: 'challenger' })).toBeUndefined()
  const log = await $.command.run({ command: 'chao', args: 'fight' })
  console.log(String((log as any).text))
  expect(String((log as any).text)).toContain('Challenge of the day')
  await clock.advance(40_000)
  expect(await band.find({ key: 'challenger' })).toBeUndefined()
})

test('a wild omochao wanders in every so many messages', async ($, on) => {
  on('tool.call', () => ({ result: 'ok', text: 'ok' }))
  const { clock, band } = await start($, on, DAY, { ...SEED, battle: { every: 3, due: 3, since: 0 } })
  await $.prompt.submit({ text: 'one' })
  await $.prompt.submit({ text: 'two' })
  await clock.settle()
  expect(await band.find({ key: 'fight1' })).toBeUndefined()
  const card = await $.command.run({ command: 'chao', args: '' })
  console.log(String((card as any).text).split('\n').filter(l => l.includes('omochao:')).join('\n'))
  expect(String((card as any).text)).toContain('Next omochao: in 1 message,')
  await $.prompt.submit({ text: 'three' })
  await clock.settle()
  expect(await band.find({ key: 'fight1' })).toBeDefined()
  // the count starts again after it; /chao fight every changes how far apart they come
  const every = await $.command.run({ command: 'chao', args: 'fight every 20' })
  console.log(String((every as any).text))
  expect(String((every as any).text)).toContain('about every 20 messages')
  const bad = await $.command.run({ command: 'chao', args: 'fight every lots' })
  expect(String((bad as any).text)).toContain('/chao fight every <3-100>')
  await clock.advance(40_000)
  for (let i = 0; i < 4; i++) await $.prompt.submit({ text: 'more ' + i })
  await clock.settle()
  expect(await band.find({ key: 'fight2' })).toBeUndefined()
  // off means no counting and no wild ones
  await $.command.run({ command: 'chao', args: 'fight off' })
  for (let i = 0; i < 30; i++) await $.prompt.submit({ text: 'quiet ' + i })
  await clock.advance(5 * 60_000)
  expect(await band.find({ key: 'fight2' })).toBeUndefined()
})

test('a garden of eggs has nobody to fight', async ($, on) => {
  on('tool.call', () => FAIL)
  const eggs = { garden: { ...SEED.garden, ids: ['c9'] }, 'chao:c9': { id: 'c9', stage: 'egg', born: DAY - 1000, warmth: 0 } }
  const { clock, band } = await start($, on, DAY, eggs)
  await $.tool.call({ tool: 'Bash', command: 'false' })
  await clock.settle()
  expect(await band.find({ key: 'fight1' })).toBeUndefined()
})
