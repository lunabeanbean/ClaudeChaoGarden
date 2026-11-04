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
const ONE = { garden: garden(['c1']), 'chao:c1': baby('c1', 'Mochi'), battle: { off: true } }

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

test('the tree kind settles once, when the tree is full grown, from the work in this chat', async ($, on) => {
  const { band } = await start($, on, ONE)
  expect(await card($)).toContain("This chat's tree: still growing")
  // as much red work as blue: a twin tree
  for (let i = 0; i < 16; i++) await bash($)
  for (let i = 0; i < 10; i++) await readFile($)
  for (let i = 0; i < 6; i++) await $.prompt.submit({ text: `hello ${i}` })
  expect(await card($)).toContain("This chat's tree: still growing")
  await $.prompt.submit({ text: 'seven' })
  let t = await card($)
  console.log(t.split('\n').slice(0, 3).join('\n'))
  expect(t).toContain("This chat's tree: twin (🔴 Power + 🔵 Swim)")
  expect(await pic(band, 'tree')).toContain('twpowerswim')
  // more work and messages later don't change it
  for (let i = 0; i < 30; i++) await edit($)
  for (let i = 0; i < 3; i++) await $.prompt.submit({ text: `more ${i}` })
  t = await card($)
  expect(t).toContain("This chat's tree: twin (🔴 Power + 🔵 Swim)")
})

test('a new chat starts its tree afresh, and the first chat of the day brings a morning basket', async ($, on) => {
  const { clock } = await start($, on, { ...ONE, garden: garden(['c1'], { lastDay: '2026-11-1' }) })
  let t = await card($)
  expect(t).toContain("This chat's tree: still growing")
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
