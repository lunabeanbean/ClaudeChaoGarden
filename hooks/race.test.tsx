import { expect, mock, test } from 'claude-code/testing'

// /chao race: the chao race along the band on a course, the first three get medals, the winner wears the gold one.
// A sample garden: Puff the Warrior (adult), Kiki a child, Bubbles a baby.
const SEED = {"garden":{"ids":["c1","c2","c3"],"chosen":"c1","show":true,"days":10,"lastDay":"2026-11-2","lastSeen":1793604352118,"nextId":4,"pace":"normal"},"chao:c1":{"id":"c1","name":"Puff","born":1792961955935,"lives":1,"parents":[],"stage":"adult","hatched":true,"age":7,"warmth":3,"chats":79,"messages":129,"treats":22,"tools":1900,"pets":0,"animals":6,"happiness":100,"hunger":75,"align":-49,"compass":{"swimFly":-0.745,"runPower":0.367},"stats":{"swim":554,"fly":56,"run":343,"power":898,"stamina":319},"parts":{"ears":"raccoon","tail":"raccoon","face":"raccoon"},"kind":"neutral","type":"swim","grownAt":3,"cls":{"main":"warrior","seed":40545}},"chao:c2":{"id":"c2","name":"Kiki","born":1793578234577,"lives":1,"parents":[],"stage":"child","hatched":true,"age":1,"warmth":8,"chats":30,"messages":48,"treats":4,"tools":50,"pets":0,"animals":0,"happiness":100,"hunger":65,"align":-134,"compass":{"swimFly":-0.183,"runPower":0.318},"stats":{"swim":10,"fly":0,"run":6,"power":28,"stamina":54},"parts":{}},"chao:c3":{"id":"c3","name":"Bubbles","born":1793596541057,"lives":1,"parents":[],"stage":"baby","hatched":true,"age":0,"warmth":8,"chats":12,"messages":11,"treats":0,"tools":63,"pets":0,"animals":0,"happiness":82,"hunger":65,"align":-112,"compass":{"swimFly":-0.199,"runPower":0.346},"stats":{"swim":11,"fly":0,"run":10,"power":34,"stamina":19},"parts":{}}}
const DAY = Date.parse('2026-11-05T14:00:00')
const BAND = { hasSurvey: false, isWorking: false, maxRows: 20, bodyColumns: 110, scroll: { offset: 0, bodyRows: 20 }, view: {} }

const start = async ($: any, on: any, store: Record<string, unknown> = SEED) => {
  const clock = mock.clock(on, { now: DAY })
  mock.store(on, store)
  on('command.register', () => ({ value: { command: 'x' } }))
  on('session.start', (_: any, e: any) => ({ cwd: e.cwd }))
  on('prompt.submit', (_: any, e: any) => e)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  const band = await $.ui.mount({ plugin: 'chao-garden', surface: 'desktop', component: 'AbovePrompt', props: BAND })
  return { clock, band }
}
const say = async ($: any, args: string) => String(((await $.command.run({ command: 'chao', args })) as any).text)
const svgOf = async (band: any, alt: string) => {
  const all = await band.findAll({ type: 'Svg' })
  const s = all.find((x: any) => String(x.props.alt) === alt)
  return s ? String(s.props.source) : undefined
}
const MEDAL = 'M-1.6,-9.6 L0.9,-5.6'

test('a race plays in the band, then the medals and the gold medal stay', async ($, on) => {
  const { clock, band } = await start($, on)
  expect(await band.find({ key: 'race1' })).toBeUndefined()
  expect(await band.find({ key: 'title' })).toBeDefined()

  const go = await say($, 'race grand')
  console.log(go)
  expect(go).toContain('Grand Prix')
  expect(go).toContain('line up')
  await clock.settle()
  const race = await band.find({ key: 'race1' })
  expect(race).toBeDefined()
  const src = await svgOf(band, 'Your chao race along the garden')
  console.log('race picture:', src?.length, 'chars')
  expect(src).toBeDefined()
  expect((src ?? '').length).toBeLessThan(131072)
  // the racers' walkers step out, and the title and the challenger make room
  for (const id of ['c1', 'c2', 'c3']) expect(await band.find({ key: id })).toBeUndefined()
  expect(await band.find({ key: 'title' })).toBeUndefined()

  // one race at a time, and no fight while it runs
  expect(await say($, 'race')).toContain('already')
  expect(await say($, 'fight now')).toContain('race')

  await clock.advance(60_000)
  expect(await band.find({ key: 'race1' })).toBeUndefined()
  for (const id of ['c1', 'c2', 'c3']) expect(await band.find({ key: id })).toBeDefined()
  expect(await band.find({ key: 'title' })).toBeDefined()

  const last = await say($, 'race last')
  console.log(last)
  expect(last).toContain('Grand Prix')
  expect(last).toContain('🥇')
  expect(last).toContain('🥈')
  expect(last).toContain('🥉')
  expect(last).toContain('New course record')
  const winner = /🥇 (\w+)/.exec(last)?.[1] ?? ''
  expect(['Puff', 'Kiki', 'Bubbles']).toContain(winner)

  // the winner wears the gold medal in the garden, and only the winner
  for (const name of ['Puff', 'Kiki', 'Bubbles']) {
    const pic = await svgOf(band, `${name} the chao`)
    expect(pic).toBeDefined()
    expect((pic ?? '').includes(MEDAL)).toBe(name === winner)
  }
  const card = await say($, '')
  console.log(card)
  expect(card).toContain('🏁 Races: 1')
  expect(card).toContain(`${winner} wears the gold medal`)
  expect(card).toContain(`${winner} 🥇`)

  // another course; the courses list keeps both records
  expect(await say($, 'race pond')).toContain('Splash Lagoon')
  await clock.settle()
  expect(await band.find({ key: 'race2' })).toBeDefined()
  await clock.advance(60_000)
  const courses = await say($, 'race courses')
  console.log(courses)
  expect(courses).toMatch(/Grand Prix .*record [0-9.]+ s by/)
  expect(courses).toMatch(/Splash Lagoon .*record [0-9.]+ s by/)
  expect(await say($, '')).toContain('🏁 Races: 2')
  expect(await say($, 'race nowhere')).toContain('no course called')
})

test('a lone chao runs a time trial (no medals); eggs cannot race', async ($, on) => {
  const one = { garden: { ...SEED.garden, ids: ['c2'] }, 'chao:c2': SEED['chao:c2'] }
  const { clock, band } = await start($, on, one)
  expect(await say($, 'race sky')).toContain('Kiki lines up for a time trial')
  await clock.settle()
  expect(await band.find({ key: 'race1' })).toBeDefined()
  await clock.advance(60_000)
  const last = await say($, 'race last')
  console.log(last)
  expect(last).toContain('⏱ Kiki')
  expect(last).not.toContain('🥇')
  expect(await say($, '')).not.toContain('wears the gold medal')
})

test('an eggs-only garden has nobody to race', async ($, on) => {
  const eggs = {
    garden: { ...SEED.garden, ids: ['c9'] },
    'chao:c9': { id: 'c9', name: '', born: DAY - 1000, lives: 1, parents: [], stage: 'egg', hatched: false, age: 0, warmth: 0, chats: 0, messages: 0, treats: 0, tools: 0, pets: 0, animals: 0, happiness: 60, hunger: 50, align: 0, compass: { swimFly: 0, runPower: 0 }, stats: { swim: 0, fly: 0, run: 0, power: 0, stamina: 0 }, parts: {} },
  }
  const { band } = await start($, on, eggs)
  expect(await say($, 'race')).toContain('needs at least one hatched chao')
  expect(await band.find({ key: 'race1' })).toBeUndefined()
})

test('a surprise race breaks out every so many messages, waits out a fight, and /chao race off stops them', async ($, on) => {
  on('tool.call', () => ({ result: 'ok', text: 'ok' }))
  const { clock, band } = await start($, on, { ...SEED, battle: { off: true }, race: { every: 3, due: 3, since: 0 } })
  await $.prompt.submit({ text: 'one' })
  await $.prompt.submit({ text: 'two' })
  await clock.settle()
  expect(await band.find({ key: 'race1' })).toBeUndefined()
  const card = await say($, '')
  console.log(card.split('\n').filter(l => l.includes('surprise race')).join('\n'))
  expect(card).toContain('Next surprise race: in 1 message ')
  await $.prompt.submit({ text: 'three' })
  await clock.settle()
  expect(await band.find({ key: 'race1' })).toBeDefined()
  for (const id of ['c1', 'c2', 'c3']) expect(await band.find({ key: id })).toBeUndefined()
  await clock.advance(60_000)
  expect(await band.find({ key: 'race1' })).toBeUndefined()
  const last = await say($, 'race last')
  console.log(last.split('\n')[0])
  expect(last).toContain('Surprise race!')

  // while a fight plays it waits; it comes with the first message after the fight
  expect(await say($, 'race every 3')).toContain('about every 3 messages')
  expect(await say($, 'race every lots')).toContain('/chao race every <3-100>')
  await say($, 'fight now')
  await clock.settle()
  expect(await band.find({ key: 'fight1' })).toBeDefined()
  for (let i = 0; i < 5; i++) await $.prompt.submit({ text: 'during ' + i })
  await clock.settle()
  expect(await band.find({ key: 'race2' })).toBeUndefined()
  await clock.advance(40_000)
  expect(await band.find({ key: 'fight1' })).toBeUndefined()
  await $.prompt.submit({ text: 'after' })
  await clock.settle()
  expect(await band.find({ key: 'race2' })).toBeDefined()
  await clock.advance(60_000)

  // off: no counting and no surprise races, but /chao race still works
  expect(await say($, 'race off')).toContain('Surprise races are off')
  for (let i = 0; i < 20; i++) await $.prompt.submit({ text: 'quiet ' + i })
  await clock.settle()
  expect(await band.find({ key: 'race3' })).toBeUndefined()
  expect(await say($, '')).toContain('Surprise races are off')
  expect(await say($, 'race')).toContain('line up')
  await clock.settle()
  expect(await band.find({ key: 'race3' })).toBeDefined()
  await clock.advance(60_000)
  expect(await say($, 'race on')).toContain('Surprise races are on')
})
