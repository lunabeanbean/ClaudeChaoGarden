import { expect, mock, test } from 'claude-code/testing'

// Fruit growth (0.7.0): Claude's work ripens coloured fruit, the end of Claude's turn feeds them to the chao, one falls in the band.
const DAY = Date.parse('2026-11-02T14:00:00')
const BAND = { hasSurvey: false, isWorking: false, maxRows: 20, bodyColumns: 110, scroll: { offset: 0, bodyRows: 20 }, view: {} }
const OK = { result: 'ok', text: 'ok' } as const

const baby = (id: string, name: string, extra: Record<string, unknown> = {}) => ({
  id, name, born: DAY - 86_400_000, lives: 1, parents: [], stage: 'baby', hatched: true, age: 0, warmth: 8, chats: 1,
  messages: 0, treats: 0, tools: 0, pets: 0, animals: 0, happiness: 60, hunger: 50, align: 0,
  compass: { swimFly: 0, runPower: 0 }, stats: { swim: 0, fly: 0, run: 0, power: 0, stamina: 0 }, parts: {}, ...extra,
})
const garden = (ids: string[], extra: Record<string, unknown> = {}) => ({
  ids, chosen: ids[0], show: true, days: 10, lastDay: '2026-11-2', lastSeen: DAY - 1000, nextId: 9, pace: 'normal', ...extra,
})
// fights off, so no omochao gets in the way of these tests
const ONE = { garden: garden(['c1']), 'chao:c1': baby('c1', 'Mochi'), battle: { off: true }, race: { off: true } }

const start = async ($: any, on: any, store: Record<string, unknown>) => {
  const clock = mock.clock(on, { now: DAY })
  mock.store(on, store)
  mock.session(on)
  on('command.register', () => ({ value: { command: 'x' } }))
  on('session.start', (_: any, e: any) => ({ cwd: e.cwd }))
  on('prompt.submit', (_: any, e: any) => e)
  on('turn.complete', (_: any, e: any) => ({ text: e.answer }))
  on('tool.call', () => OK)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  const band = await $.ui.mount({ plugin: 'chao-garden', surface: 'desktop', component: 'AbovePrompt', props: BAND })
  return { clock, band }
}
const card = async ($: any) => String(((await $.command.run({ command: 'chao', args: '' })) as any).text)
const turnEnd = ($: any, answer = '', extra: Record<string, unknown> = {}) =>
  $.turn.complete({ answer, durationMs: 1000, isAborted: false, turnId: `t${Math.random()}`, reason: 'answer', ...extra })
const say = ($: any, text: string) =>
  $.session.append({ door: 'response', origin: { kind: 'model', model: 'claude' }, uuid: `u${Math.random()}`, message: { type: 'assistant', role: 'assistant', content: [{ type: 'text', text }] } })
const bash = ($: any) => $.tool.call({ tool: 'Bash', command: 'true' })
const readFile = ($: any) => $.tool.call({ tool: 'Read', file_path: '/x.txt' })
const edit = ($: any) => $.tool.call({ tool: 'Edit', file_path: '/x.txt', old_string: 'a', new_string: 'b' })
const pic = async (band: any, key: string) => JSON.stringify(await band.find({ key }))

test("Claude's work fills the right meters; a full meter ripens a fruit; Claude's turn end feeds it; tool runs give no stats", async ($, on) => {
  const { clock, band } = await start($, on, ONE)
  for (let i = 0; i < 15; i++) await bash($)
  let t = await card($)
  console.log(t.split('\n').slice(0, 6).join('\n'))
  expect(t).toContain('🔴 15/16 commands')
  expect(t).toContain('Power Lv 0')
  expect(t).not.toContain('Ripe and waiting')
  await bash($)
  t = await card($)
  expect(t).toContain("Ripe and waiting for the end of Claude's turn: 🔴")
  expect(t).toContain('🔴 0/16 commands')
  // still no stats: those come from eating
  expect(t).toContain('Swim Lv 0 · Fly Lv 0 · Run Lv 0 · Power Lv 0 · Stamina Lv 0')
  for (let i = 0; i < 3; i++) await readFile($)
  for (let i = 0; i < 2; i++) await edit($)
  await $.tool.call({ tool: 'ToolSearch', query: 'x', max_results: 1 })
  await say($, 'x'.repeat(2500))
  t = await card($)
  expect(t).toContain('🔵 3/10 reads')
  expect(t).toContain('🟢 2/7 edits')
  expect(t).toContain('🟡 2,500/6,000 talking')

  await turnEnd($, 'x'.repeat(100))
  await clock.settle()
  t = await card($)
  console.log(t.split('\n').slice(0, 12).join('\n'))
  expect(t).toContain('Ate 🔴 1 🔵 0 🟢 0 🟡 0 fruit')
  expect(t).toContain('Last fruit: 🔴 to Mochi')
  expect(t).toContain('Power Lv 2')
  expect(t).not.toContain('Ripe and waiting')
  // the answer was not counted again: session.append already brought this turn's talking
  expect(t).toContain('🟡 2,500/6,000 talking')
  // a red fruit falls from the tree in the band
  expect(await pic(band, 'tree')).toContain('#ff6b6b')

  // a turn whose talking session.append never brought counts its answer instead
  await clock.advance(30_000)
  await turnEnd($, 'y'.repeat(3600))
  await clock.settle()
  t = await card($)
  expect(t).toContain('Ate 🔴 1 🔵 0 🟢 0 🟡 1 fruit')
  expect(t).toContain('🟡 100/6,000 talking')
  expect(t).toContain('Last fruit: 🟡 to Mochi')
  // an interrupted turn ends a turn too
  for (let i = 0; i < 7; i++) await edit($)
  await turnEnd($, '', { isAborted: true, reason: 'aborted' })
  t = await card($)
  expect(t).toContain('Ate 🔴 1 🔵 0 🟢 1 🟡 1 fruit')
})

test('each chao gets its own fruit: picky eaters keep apart and the babies taste everything', async ($, on) => {
  // Puff likes blue and yellow, Kiki red and green; Sugar is a baby still tasting
  const store = {
    garden: garden(['c1', 'c2', 'c3']),
    'chao:c1': baby('c1', 'Puff', { stage: 'child', ate: { power: 0, swim: 6, run: 0, fly: 5 } }),
    'chao:c2': baby('c2', 'Kiki', { stage: 'child', ate: { power: 6, swim: 0, run: 5, fly: 0 } }),
    'chao:c3': baby('c3', 'Sugar'),
    battle: { off: true },
    race: { off: true },
  }
  const { clock } = await start($, on, store)
  let t = await card($)
  console.log(t.split('\n').slice(0, 8).join('\n'))
  expect(t).toMatch(/Puff · child · .* · likes (🔵🟡|🟡🔵)/)
  expect(t).toMatch(/Kiki · child · .* · likes (🔴🟢|🟢🔴)/)
  expect(t).toContain('Sugar · baby')
  expect(t).toContain('tasting everything')
  for (let round = 0; round < 6; round++) {
    for (let i = 0; i < 10; i++) await readFile($)
    await turnEnd($)
    await clock.advance(20_000)
  }
  t = await card($)
  console.log(t.split('\n').filter(l => l.includes('Last fruit') || l.includes(' · ')).join('\n'))
  // six blue fruit: none to Kiki (blue is not one of its favourites and it is not starving)
  expect(t).not.toContain('🔵 to Kiki')
})

test("the tree kind settles once, when the tree is full grown, from Claude's work while it grew", async ($, on) => {
  const { band } = await start($, on, ONE)
  expect(await card($)).toContain('The tree: still growing')
  // as much red work as blue: a twin tree
  for (let i = 0; i < 16; i++) await bash($)
  for (let i = 0; i < 10; i++) await readFile($)
  for (let i = 0; i < 6; i++) await $.prompt.submit({ text: `hello ${i}` })
  expect(await card($)).toContain('The tree: still growing')
  await $.prompt.submit({ text: 'seven' })
  let t = await card($)
  console.log(t.split('\n').slice(0, 3).join('\n'))
  expect(t).toContain('The tree: twin (🔴 Power + 🔵 Swim)')
  expect(await pic(band, 'tree')).toContain('twpowerswim')
  // more work and messages later don't change it
  for (let i = 0; i < 30; i++) await edit($)
  for (let i = 0; i < 3; i++) await $.prompt.submit({ text: `more ${i}` })
  t = await card($)
  expect(t).toContain('The tree: twin (🔴 Power + 🔵 Swim)')
})

test('the first garden ever starts a seed, and the first chat of the day brings a morning basket', async ($, on) => {
  const { clock } = await start($, on, { ...ONE, garden: garden(['c1'], { lastDay: '2026-11-1' }) })
  let t = await card($)
  expect(t).toContain('The tree: still growing')
  expect(t).toContain('the tree is growing (0 of 7 messages)')
  expect(t).toContain("Ripe and waiting for the end of Claude's turn: 🔴 🔵 🟢 🟡")
  await turnEnd($)
  await clock.settle()
  t = await card($)
  expect(t).toContain('Ate 🔴 1 🔵 1 🟢 1 🟡 1 fruit')
  // four fruit tasted: its two favourites form (a tie goes by its own fixed order, never at random)
  expect(t).toContain('Favourite fruit: 🔵 Swim and 🟢 Run (1 and 1 eaten)')
})

test("the band doesn't redraw while Claude works or talks, and your messages no longer drop fruit", async ($, on) => {
  const { clock, band } = await start($, on, ONE)
  const chao0 = await pic(band, 'c1')
  const tree0 = await pic(band, 'tree')
  expect(chao0).toContain('Svg')
  for (let i = 0; i < 20; i++) {
    await bash($)
    await readFile($)
    await edit($)
  }
  await say($, 'z'.repeat(9000))
  await clock.settle()
  expect(await pic(band, 'c1')).toBe(chao0)
  expect(await pic(band, 'tree')).toBe(tree0)
  // ten messages grow the tree but drop no fruit (fruit fall at the end of Claude's turns now)
  for (let i = 0; i < 10; i++) await $.prompt.submit({ text: `hi ${i}` })
  await clock.settle()
  const tree1 = await pic(band, 'tree')
  expect(tree1).not.toBe(tree0)
  expect(tree1).not.toContain('animateTransform attributeName=\\"transform\\" type=\\"translate\\"')
  expect(await pic(band, 'c1')).not.toContain('drop ')
})

// 1.2.0: one tree for every chat, kept in the store under 'tree'.
const tree = (extra: Record<string, unknown> = {}) => ({ n: 3, grown: 0, snacks: 12, kind: { kind: '' }, work: { power: 0, swim: 0, run: 0, fly: 0 }, ...extra })

test('a new chat carries on the tree the other chats grew', async ($, on) => {
  const { band } = await start($, on, { ...ONE, tree: tree({ grown: 5, snacks: 7, work: { power: 4, swim: 0, run: 0, fly: 0 } }) })
  let t = await card($)
  expect(t).toContain('the tree is growing (5 of 7 messages)')
  // young, not a seed: the band shows the saved tree
  const young = await pic(band, 'tree')
  expect(young).toContain('young')
  await $.prompt.submit({ text: 'six' })
  await $.prompt.submit({ text: 'seven' })
  t = await card($)
  console.log(t.split('\n').slice(0, 2).join('\n'))
  // its kind comes from the work saved with the tree (all red), not from this chat
  expect(t).toContain('The tree: plain (mostly 🔴 commands)')
  expect(t).toContain('5 snacks left on the tree')
})

test("a bare full-grown tree goes at the end of Claude's turn and a new seed is planted", async ($, on) => {
  const { clock, band } = await start($, on, { ...ONE, tree: tree({ grown: 11, snacks: 1, kind: { kind: 'plain', a: 'power' } }) })
  expect(await card($)).toContain('1 snack left on the tree')
  await $.prompt.submit({ text: 'last snack' })
  let t = await card($)
  expect(t).toContain('the tree is bare: a new seed after this turn')
  expect(await pic(band, 'tree')).toContain('bare')
  await turnEnd($)
  await clock.settle()
  t = await card($)
  expect(t).toContain('the tree is growing (0 of 7 messages)')
  expect(t).toContain('The tree: still growing')
  expect(await pic(band, 'tree')).toContain('seed')
  // the next message grows the new tree and finds a snack on it
  await $.prompt.submit({ text: 'hello again' })
  t = await card($)
  expect(t).toContain('the tree is growing (1 of 7 messages)')
})

// The store file the chats share, by hand, so the test can play "another chat" writing to it.
// `afterGet` runs after each read, as another chat could write right then.
const sharedStore = (on: any, db: Record<string, unknown>, afterGet: (key: string) => void = () => {}) => {
  on('store.get', (_: any, e: any) => {
    const value = db[e.key] === undefined ? undefined : JSON.parse(JSON.stringify(db[e.key]))
    afterGet(e.key)
    return { value }
  })
  on('store.set', (_: any, e: any) => {
    db[e.key] = JSON.parse(JSON.stringify(e.value))
    return { value: undefined }
  })
  on('store.delete', (_: any, e: any) => {
    delete db[e.key]
    return { value: undefined }
  })
  on('store.keys', () => ({ value: Object.keys(db) }))
}

test('a chat catches up with what another chat saved, and a change made meanwhile is not lost', async ($, on) => {
  const db: Record<string, unknown> = { ...ONE, tree: tree({ grown: 2 }) }
  // another chat sends a message right while this one is changing the garden (after this chat loaded the tree)
  let otherChat = false
  sharedStore(on, db, key => {
    if (otherChat && key === 'tree') {
      otherChat = false
      const t = db.tree as any
      db.tree = { ...t, grown: t.grown + 1, snacks: t.snacks - 1 }
    }
  })
  const clock = mock.clock(on, { now: DAY })
  mock.session(on)
  on('command.register', () => ({ value: { command: 'x' } }))
  on('session.start', (_: any, e: any) => ({ cwd: e.cwd }))
  on('prompt.submit', (_: any, e: any) => e)
  on('turn.complete', (_: any, e: any) => ({ text: e.answer }))
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  const band = await $.ui.mount({ plugin: 'chao-garden', surface: 'desktop', component: 'AbovePrompt', props: BAND })
  expect(await pic(band, 'tree')).toContain('sprout')
  // another chat grows the tree to young: this chat's band follows within a catch-up, with no message here
  db.tree = tree({ grown: 5, snacks: 9 })
  await clock.advance(16_000)
  await clock.settle()
  expect(await pic(band, 'tree')).toContain('young')
  // a message here while the other chat sends one too: both count
  otherChat = true
  await $.prompt.submit({ text: 'hi' })
  expect((db.tree as any).grown).toBe(7)
  expect((db.tree as any).snacks).toBe(7)
  expect(await card($)).toContain('7 snacks left on the tree')
})
