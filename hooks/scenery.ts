// The place the chao live in, drawn behind everything else in the band: one 900 x 84 picture, built once and never
// redrawn (see the flicker rule). Only about y 20 to 80 shows; the chao stand with their feet on y 80, so the floor's
// top edge sits a little above that and they walk on it.
//
// The Neutral garden: a glowing crystal cave. Pink, blue, purple and aqua crystals glow softly from the walls and
// floor, a few hang from the ceiling and drip light now and then, a pool glows on the right, a soft beam of light
// falls on the fruit tree through a crack, and tiny motes of light float up. The middle (where fights play and the
// title sits) is kept low and quiet.

const W = 900
const H = 84
// the floor's top edge: the crystals' bases tuck behind it
const FLOOR = 72

type Hue = { light: string; mid: string; dark: string }
const PINK: Hue = { light: '#ffd1e6', mid: '#ff8fc0', dark: '#c95a91' }
const BLUE: Hue = { light: '#cfe8ff', mid: '#74c0fc', dark: '#3f7fc4' }
const PURPLE: Hue = { light: '#e5dbff', mid: '#b197fc', dark: '#7650d0' }
const AQUA: Hue = { light: '#c3fae8', mid: '#63e6be', dark: '#24a07c' }

const n = (v: number) => Math.round(v * 10) / 10

// Deterministic pseudo-random, so the picture is the same every time it is built.
const rand = (i: number) => {
  const x = Math.sin(i * 7919 + 1013) * 104729
  return x - Math.floor(x)
}

// One crystal: a six-sided prism standing on (x, y), `h` tall and `w` wide, tilted by `tilt` degrees, with a lit left
// face, a shaded right face and a bright edge. `down` hangs it from the ceiling instead.
const crystal = (x: number, y: number, h: number, w: number, tilt: number, c: Hue, down = false) => {
  const s = down ? -1 : 1
  const shoulder = h * 0.72
  const half = w / 2
  const body = `M${-half},0 L${-half},${n(-shoulder * s)} L0,${n(-h * s)} L${half},${n(-shoulder * s)} L${half},0 Z`
  const lit = `M${-half},0 L${-half},${n(-shoulder * s)} L0,${n(-h * s)} L0,0 Z`
  const shine = `M${n(-half * 0.45)},${n(-h * 0.12 * s)} L${n(-half * 0.45)},${n(-shoulder * 0.9 * s)}`
  return (
    `<g transform="translate(${x},${y}) rotate(${tilt})">` +
    `<path d="${body}" fill="${c.mid}" stroke="${c.dark}" stroke-width="0.6" stroke-linejoin="round"/>` +
    `<path d="${lit}" fill="${c.light}" opacity="0.75"/>` +
    `<path d="${shine}" stroke="#ffffff" stroke-width="0.7" stroke-linecap="round" opacity="0.8"/>` +
    `</g>`
  )
}

// A cluster of crystals around (x, FLOOR): [offset, height, width, tilt, hue] each.
type Shard = [number, number, number, number, Hue]
const cluster = (x: number, shards: Shard[], y = FLOOR + 1) => shards.map(([dx, h, w, t, c]) => crystal(x + dx, y, h, w, t, c)).join('')

// A soft glow behind a cluster. The pulsing ones breathe slowly, each on its own beat.
const glow = (x: number, y: number, rx: number, ry: number, grad: string, pulse?: { dur: number; begin: number }) =>
  `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="url(#${grad})" opacity="0.7">` +
  (pulse ? `<animate attributeName="opacity" values="0.45;0.95;0.45" dur="${pulse.dur}s" begin="${-pulse.begin}s" repeatCount="indefinite"/>` : '') +
  `</ellipse>`

const defs =
  `<defs>` +
  // the cave wall, darker up by the ceiling
  `<linearGradient id="cv-wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0.15" stop-color="#110c20"/><stop offset="0.6" stop-color="#21183b"/><stop offset="0.86" stop-color="#2b2050"/></linearGradient>` +
  `<linearGradient id="cv-floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3b2f63"/><stop offset="1" stop-color="#1f1736"/></linearGradient>` +
  // the edges fade out, so the cave has no hard side if the band is wider than the picture
  `<linearGradient id="cv-sides" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#000"/><stop offset="0.035" stop-color="#fff"/><stop offset="0.965" stop-color="#fff"/><stop offset="1" stop-color="#000"/></linearGradient>` +
  `<mask id="cv-fade"><rect width="${W}" height="${H}" fill="url(#cv-sides)"/></mask>` +
  `<linearGradient id="cv-beam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff6d6" stop-opacity="0.32"/><stop offset="1" stop-color="#fff6d6" stop-opacity="0"/></linearGradient>` +
  [
    ['pink', PINK.mid],
    ['blue', BLUE.mid],
    ['purple', PURPLE.mid],
    ['aqua', AQUA.mid],
  ]
    .map(([id, col]) => `<radialGradient id="cv-g${id}"><stop offset="0" stop-color="${col}" stop-opacity="0.55"/><stop offset="1" stop-color="${col}" stop-opacity="0"/></radialGradient>`)
    .join('') +
  `<radialGradient id="cv-pool" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#b8fff0"/><stop offset="0.6" stop-color="#63e6be"/><stop offset="1" stop-color="#2fae8a" stop-opacity="0.2"/></radialGradient>` +
  `</defs>`

// The ceiling: dark rock along the top with a few lumps hanging down (short over the title in the middle).
const ceiling = (() => {
  const pts: string[] = [`M0,0`, `L0,20`]
  for (let x = 0; x <= W; x += 30) {
    const mid = x > 330 && x < 570
    const y = (mid ? 17 : 21) + rand(x) * (mid ? 3 : 6)
    pts.push(`L${x},${n(y)}`)
    if (!mid && rand(x + 5) > 0.55) pts.push(`L${x + 8},${n(y + 5 + rand(x + 9) * 6)}`, `L${x + 15},${n(y + 1)}`)
  }
  pts.push(`L${W},0 Z`)
  return `<path d="${pts.join(' ')}" fill="#0b0816"/>`
})()

// The floor, with an uneven top edge and a pale rim where the crystal light catches it.
const floor = (() => {
  const top: string[] = []
  for (let x = 0; x <= W; x += 25) top.push(`${x},${n(FLOOR + rand(x + 300) * 3.2 - 1)}`)
  return (
    `<path d="M0,${H} L${top.map(p => `L${p}`).join(' ').slice(1)} L${W},${H} Z" fill="url(#cv-floor)"/>` +
    `<polyline points="${top.join(' ')}" fill="none" stroke="#8a78c9" stroke-width="0.7" opacity="0.55"/>`
  )
})()

// Dim crystals set into the back wall, far away.
const wallGems = [
  [180, 46, PURPLE],
  [255, 38, BLUE],
  [322, 52, PINK],
  [598, 50, AQUA],
  [655, 40, PURPLE],
  [745, 47, PINK],
  [812, 36, BLUE],
]
  .map(([x, y, c], i) => `<g opacity="0.28">${crystal(x as number, y as number, 7 + (i % 3) * 2, 3.2, i % 2 ? 12 : -10, c as Hue)}</g>`)
  .join('')

// The crystals that grow from the floor: big clusters at both ends, small ones in between, only tiny ones in the
// middle where the fights play.
const floorCrystals =
  cluster(34, [
    [-12, 20, 7, -18, PURPLE],
    [10, 18, 7, 16, BLUE],
    [0, 31, 9, -2, PINK],
    [-4, 12, 5, -30, AQUA],
    [16, 10, 5, 34, PINK],
  ]) +
  cluster(214, [
    [0, 13, 5, -8, BLUE],
    [6, 9, 4, 20, PURPLE],
  ]) +
  cluster(306, [[0, 8, 3.6, 10, PURPLE]]) +
  cluster(468, [
    [0, 7, 3.2, -12, AQUA],
    [4, 5, 2.8, 22, BLUE],
  ]) +
  cluster(604, [
    [0, 11, 4.4, 6, PINK],
    [-5, 7, 3.4, -24, PURPLE],
  ]) +
  cluster(792, [
    [0, 17, 6, -6, PURPLE],
    [7, 11, 4.4, 22, AQUA],
  ]) +
  cluster(862, [
    [-10, 22, 7.5, -14, AQUA],
    [12, 19, 7, 18, PINK],
    [0, 33, 9.5, 3, BLUE],
    [20, 11, 5, 36, PURPLE],
    [-18, 10, 5, -34, BLUE],
  ])

// Crystals hanging from the ceiling (none over the title).
const HANGING: [number, number, number, Hue][] = [
  [66, 18, 15, PINK],
  [236, 18, 12, PURPLE],
  [276, 18, 17, BLUE],
  [624, 18, 16, AQUA],
  [668, 18, 11, PINK],
  [838, 18, 18, PURPLE],
]
const hanging = HANGING.map(([x, y, h, c], i) => crystal(x, y, h, h * 0.36, i % 2 ? 6 : -6, c, true)).join('')

// The glowing pool on the right, sunk into the floor just behind where the chao walk, with rings spreading out now
// and then.
const POOL_X = 712
const pool =
  glow(POOL_X, 66, 70, 16, 'cv-gaqua', { dur: 5, begin: 1.2 }) +
  `<ellipse cx="${POOL_X}" cy="74.5" rx="54" ry="3.6" fill="url(#cv-pool)" opacity="0.9"/>` +
  `<ellipse cx="${POOL_X}" cy="74.5" rx="54" ry="3.6" fill="none" stroke="#c3fae8" stroke-width="0.5" opacity="0.7"/>` +
  [0, 1.5, 3]
    .map(
      (b, i) =>
        `<ellipse cx="${POOL_X - 20 + i * 18}" cy="74.5" rx="2" ry="0.6" fill="none" stroke="#ffffff" stroke-width="0.5" opacity="0">` +
        `<animate attributeName="rx" values="2;18" dur="4.5s" begin="${b}s" repeatCount="indefinite"/>` +
        `<animate attributeName="ry" values="0.6;2.4" dur="4.5s" begin="${b}s" repeatCount="indefinite"/>` +
        `<animate attributeName="opacity" values="0.9;0" dur="4.5s" begin="${b}s" repeatCount="indefinite"/></ellipse>`,
    )
    .join('')

// The soft beam of light that falls on the fruit tree (the tree stands at about x 124).
const beam =
  `<path d="M140,16 L160,16 L170,80 L84,80 Z" fill="url(#cv-beam)">` +
  `<animate attributeName="opacity" values="0.7;1;0.7" dur="7s" repeatCount="indefinite"/></path>` +
  `<ellipse cx="126" cy="78" rx="38" ry="4" fill="#8fd694" opacity="0.35"/>`

// Glows behind the clusters, breathing slowly.
const glows =
  glow(34, 60, 46, 24, 'cv-gpink', { dur: 4.6, begin: 0 }) +
  glow(214, 66, 22, 12, 'cv-gblue', { dur: 5.2, begin: 2.1 }) +
  glow(306, 68, 14, 8, 'cv-gpurple', { dur: 6, begin: 3.3 }) +
  glow(468, 69, 14, 7, 'cv-gaqua', { dur: 5.6, begin: 1.4 }) +
  glow(604, 66, 18, 10, 'cv-gpink', { dur: 4.9, begin: 0.7 }) +
  glow(792, 64, 24, 13, 'cv-gpurple', { dur: 5.4, begin: 2.6 }) +
  glow(862, 58, 48, 26, 'cv-gblue', { dur: 4.4, begin: 1.8 }) +
  glow(276, 28, 18, 10, 'cv-gblue', { dur: 6.2, begin: 0.4 }) +
  glow(624, 28, 18, 10, 'cv-gaqua', { dur: 5.8, begin: 2.9 })

// Little ✦ glints on the tips of the big crystals, twinkling like the old stars.
const GLINTS: [number, number, string][] = [
  [34, 41, '#ffffff'],
  [22, 54, '#ffd1e6'],
  [862, 40, '#ffffff'],
  [851, 52, '#c3fae8'],
  [214, 60, '#cfe8ff'],
  [792, 56, '#e5dbff'],
  [604, 62, '#ffd1e6'],
  [276, 37, '#cfe8ff'],
  [838, 37, '#e5dbff'],
]
const glints = GLINTS.map(
  ([x, y, c], i) =>
    `<text x="${x}" y="${y}" font-size="${7 + (i % 3) * 2}" fill="${c}" text-anchor="middle" opacity="0">✦` +
    `<animate attributeName="opacity" values="0;1;0;0" keyTimes="0;0.15;0.3;1" dur="${n(3 + rand(i + 50) * 3)}s" begin="${n(rand(i + 60) * 4)}s" repeatCount="indefinite"/></text>`,
).join('')

// Drops of light that fall from the hanging crystals now and then and land on the floor with a tiny splash.
const drips = HANGING.filter((_, i) => i % 2 === 0 || i === 3)
  .map(([x, y, h, c], i) => {
    const from = y + h + 1
    const dur = n(6 + rand(i + 80) * 4)
    const begin = n(rand(i + 90) * 6)
    return (
      `<circle cx="${x}" cy="${from}" r="1.1" fill="${c.light}" opacity="0">` +
      `<animate attributeName="cy" values="${from};${from};${FLOOR + 1}" keyTimes="0;0.55;0.75" dur="${dur}s" begin="${begin}s" repeatCount="indefinite"/>` +
      `<animate attributeName="opacity" values="0;1;1;0;0" keyTimes="0;0.3;0.74;0.76;1" dur="${dur}s" begin="${begin}s" repeatCount="indefinite"/></circle>` +
      `<ellipse cx="${x}" cy="${FLOOR + 1}" rx="1" ry="0.4" fill="none" stroke="${c.light}" stroke-width="0.5" opacity="0">` +
      `<animate attributeName="rx" values="1;1;5" keyTimes="0;0.75;0.9" dur="${dur}s" begin="${begin}s" repeatCount="indefinite"/>` +
      `<animate attributeName="opacity" values="0;0;1;0" keyTimes="0;0.75;0.77;0.9" dur="${dur}s" begin="${begin}s" repeatCount="indefinite"/></ellipse>`
    )
  })
  .join('')

// Tiny motes of light drifting up from the floor and fading.
const MOTE_HUES = [PINK.light, BLUE.light, PURPLE.light, AQUA.light, '#fff3bf']
const motes = Array.from({ length: 12 }, (_, i) => {
  const x = n(40 + ((i + rand(i + 120)) / 12) * 820)
  const dur = n(7 + rand(i + 130) * 5)
  const begin = n(-rand(i + 140) * dur)
  const rise = n(28 + rand(i + 150) * 20)
  const sway = n((rand(i + 160) - 0.5) * 14)
  return (
    `<circle cx="${x}" cy="${FLOOR}" r="${n(0.7 + rand(i + 170) * 0.7)}" fill="${MOTE_HUES[i % MOTE_HUES.length]}" opacity="0">` +
    `<animateTransform attributeName="transform" type="translate" values="0 0;${sway} ${-rise / 2};0 ${-rise}" dur="${dur}s" begin="${begin}s" repeatCount="indefinite"/>` +
    `<animate attributeName="opacity" values="0;0.9;0" dur="${dur}s" begin="${begin}s" repeatCount="indefinite"/></circle>`
  )
}).join('')

// Small shards scattered along the front of the floor.
const pebbles = [70, 172, 258, 352, 418, 536, 662, 770, 884]
  .map((x, i) => `<g opacity="0.85">${crystal(x, 83, 3 + (i % 3), 1.8, i % 2 ? 18 : -14, [PINK, BLUE, PURPLE, AQUA][i % 4] as Hue)}</g>`)
  .join('')

const cave = (): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">` +
  defs +
  // the still parts, with their sides faded out
  `<g mask="url(#cv-fade)"><rect width="${W}" height="${H}" fill="url(#cv-wall)"/>${wallGems}${ceiling}</g>` +
  glows +
  beam +
  `<g mask="url(#cv-fade)">${floorCrystals}${floor}${hanging}${pebbles}</g>` +
  pool +
  glints +
  drips +
  motes +
  `</svg>`

// Built once: the scenery never changes while a chat is open.
export const CAVE_SVG = cave()
