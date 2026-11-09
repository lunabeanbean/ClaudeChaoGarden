// The place the chao live in, drawn behind everything else in the band: one 900 x 84 picture, built once and never
// redrawn (see the flicker rule). Only about y 20 to 80 shows; the chao stand with their feet on y 80, so the floor's
// top edge sits a little above that and they walk on it.
//
// Three gardens: the Neutral one, a glowing crystal cave; the Dark one, a moonlit night wood; and the Light one, a
// sunset flower meadow (the last two further down).
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

// ---- The Dark garden: a moonlit night wood ----
// A deep violet night sky full of stars, a big crescent moon at the right end with a soft halo and a thin cloud
// drifting past, a shooting star now and then, rolling hills and crooked bare trees in silhouette, glowing
// mushrooms in the grass, a little carved pumpkin, a lantern swinging from the right-hand tree, will-o'-wisps
// floating about, two small bats flitting across the sky and ground fog. Spooky, but cute. The middle (title and
// fights) is kept low and quiet, like the cave's.

const MOON = { x: 796, y: 38, r: 15 }
// rough boxes the stars stay out of: the moon and the title
const clearOfStars = (x: number, y: number) => !(Math.abs(x - MOON.x) < 30 && Math.abs(y - MOON.y) < 26) && !(x > 340 && x < 560 && y < 40)

type Glowy = { cap: string; light: string; grad: string }
const CYAN: Glowy = { cap: '#5fd8ff', light: '#c9f2ff', grad: 'dk-gcyan' }
const VIOLET: Glowy = { cap: '#b58cff', light: '#e9ddff', grad: 'dk-gviolet' }
const ROSE: Glowy = { cap: '#ff86c8', light: '#ffd6ec', grad: 'dk-grose' }

const darkDefs =
  `<defs>` +
  `<linearGradient id="dk-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0.1" stop-color="#070418"/><stop offset="0.55" stop-color="#160d33"/><stop offset="0.85" stop-color="#2a1748"/></linearGradient>` +
  `<linearGradient id="dk-ground" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2c1a48"/><stop offset="1" stop-color="#120a22"/></linearGradient>` +
  `<linearGradient id="dk-sides" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#000"/><stop offset="0.035" stop-color="#fff"/><stop offset="0.965" stop-color="#fff"/><stop offset="1" stop-color="#000"/></linearGradient>` +
  `<mask id="dk-fade"><rect width="${W}" height="${H}" fill="url(#dk-sides)"/></mask>` +
  `<mask id="dk-crescent"><circle cx="${MOON.x}" cy="${MOON.y}" r="${MOON.r}" fill="#fff"/><circle cx="${MOON.x + 8}" cy="${MOON.y - 5}" r="${MOON.r - 1.5}" fill="#000"/></mask>` +
  `<radialGradient id="dk-halo"><stop offset="0" stop-color="#fff1c9" stop-opacity="0.34"/><stop offset="0.45" stop-color="#d9c8ff" stop-opacity="0.14"/><stop offset="1" stop-color="#d9c8ff" stop-opacity="0"/></radialGradient>` +
  `<radialGradient id="dk-moon" cx="0.35" cy="0.55" r="0.7"><stop offset="0" stop-color="#fffbe9"/><stop offset="1" stop-color="#ffe7a3"/></radialGradient>` +
  `<linearGradient id="dk-trail" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></linearGradient>` +
  `<radialGradient id="dk-wisp"><stop offset="0" stop-color="#e3fbff" stop-opacity="0.9"/><stop offset="0.35" stop-color="#8fe3ff" stop-opacity="0.45"/><stop offset="1" stop-color="#8fe3ff" stop-opacity="0"/></radialGradient>` +
  `<radialGradient id="dk-warm"><stop offset="0" stop-color="#ffd27a" stop-opacity="0.6"/><stop offset="1" stop-color="#ff9f43" stop-opacity="0"/></radialGradient>` +
  [CYAN, VIOLET, ROSE]
    .map(c => `<radialGradient id="${c.grad}"><stop offset="0" stop-color="${c.cap}" stop-opacity="0.5"/><stop offset="1" stop-color="${c.cap}" stop-opacity="0"/></radialGradient>`)
    .join('') +
  `</defs>`

// Stars: a sprinkle of still dots (no animation, so they cost nothing) and a few twinkling ✦.
const skyDots = (() => {
  const out: string[] = []
  for (let i = 0; out.length < 44 && i < 400; i++) {
    const x = n(10 + rand(i + 500) * 880)
    const y = n(19 + rand(i + 600) * 34)
    if (!clearOfStars(x, y)) continue
    out.push(`<circle cx="${x}" cy="${y}" r="${n(0.4 + rand(i + 700) * 0.6)}" fill="${['#ffffff', '#fff3bf', '#d0e4ff', '#eadcff'][i % 4]}" opacity="${n(0.35 + rand(i + 800) * 0.55)}"/>`)
  }
  return out.join('')
})()
const twinkles = (() => {
  const out: string[] = []
  for (let i = 0; out.length < 14 && i < 300; i++) {
    const x = n(20 + ((out.length + rand(i + 900)) / 14) * 860)
    const y = n(21 + rand(i + 950) * 26)
    if (!clearOfStars(x, y)) continue
    out.push(
      `<text x="${x}" y="${y}" font-size="${n(5 + rand(i + 970) * 5)}" fill="${['#fff3bf', '#ffffff', '#cfe8ff', '#ffd6ec'][out.length % 4]}" text-anchor="middle" opacity="0.2">✦` +
        `<animate attributeName="opacity" values="0.15;1;0.15" dur="${n(2.4 + rand(i + 990) * 2.8)}s" begin="${n(-rand(i + 1010) * 5)}s" repeatCount="indefinite"/></text>`,
    )
  }
  return out.join('')
})()

// A shooting star now and then: a short bright streak that slides down and fades, then waits.
const shooting = (x0: number, y0: number, dx: number, dy: number, dur: number, begin: number) => {
  const ang = n((Math.atan2(dy, dx) * 180) / Math.PI + 180)
  return (
    `<g opacity="0"><g transform="translate(${x0},${y0})">` +
    `<g><animateTransform attributeName="transform" type="translate" values="0 0;${dx} ${dy};${dx} ${dy}" keyTimes="0;0.07;1" dur="${dur}s" begin="${begin}s" repeatCount="indefinite"/>` +
    `<line x1="0" y1="0" x2="16" y2="0" stroke="url(#dk-trail)" stroke-width="1.1" stroke-linecap="round" transform="rotate(${ang})"/><circle r="1" fill="#ffffff"/></g></g>` +
    `<animate attributeName="opacity" values="0;1;0;0" keyTimes="0;0.02;0.07;1" dur="${dur}s" begin="${begin}s" repeatCount="indefinite"/></g>`
  )
}

// The moon: a soft breathing halo, then the crescent (a full disc with a second disc cut out of it) with a few faint
// craters, and a thin cloud that drifts slowly back and forth in front of it.
const moon =
  `<circle cx="${MOON.x - 3}" cy="${MOON.y + 1}" r="38" fill="url(#dk-halo)"><animate attributeName="opacity" values="0.75;1;0.75" dur="6s" repeatCount="indefinite"/></circle>` +
  `<g mask="url(#dk-crescent)"><circle cx="${MOON.x}" cy="${MOON.y}" r="${MOON.r}" fill="url(#dk-moon)"/>` +
  `<circle cx="${MOON.x - 9}" cy="${MOON.y + 3}" r="2" fill="#f1d98f" opacity="0.6"/><circle cx="${MOON.x - 5}" cy="${MOON.y - 8}" r="1.3" fill="#f1d98f" opacity="0.55"/>` +
  `<circle cx="${MOON.x - 7}" cy="${MOON.y + 10}" r="1.5" fill="#f1d98f" opacity="0.5"/><circle cx="${MOON.x - 12}" cy="${MOON.y - 2}" r="0.9" fill="#f1d98f" opacity="0.5"/></g>` +
  `<text x="${MOON.x + 12}" y="${MOON.y + 14}" font-size="6" fill="#fff3bf" text-anchor="middle" opacity="0.8">✦</text>` +
  `<g opacity="0.22"><animateTransform attributeName="transform" type="translate" values="0 0;-70 0;0 0" dur="48s" repeatCount="indefinite"/>` +
  `<ellipse cx="${MOON.x + 20}" cy="${MOON.y + 6}" rx="30" ry="2.6" fill="#d9ccff"/><ellipse cx="${MOON.x + 6}" cy="${MOON.y + 3.5}" rx="14" ry="2" fill="#d9ccff"/></g>`

// Rolling hills, higher at both ends and low in the middle.
const ends = (x: number) => Math.max(0, 1 - Math.min(x, W - x) / 280)
const hill = (base: number, rise: number, wob: number, freq: number, phase: number, fill: string) => {
  const pts: string[] = []
  for (let x = 0; x <= W; x += 15) pts.push(`L${x},${n(base - rise * ends(x) - wob * Math.sin(x / freq + phase))}`)
  return `<path d="M0,${H} ${pts.join(' ')} L${W},${H} Z" fill="${fill}"/>`
}
const hills = hill(60, 14, 3, 70, 0.4, '#1d1240') + hill(66, 8, 2, 44, 1.7, '#170e31')

// A crooked bare tree in silhouette, base on (x, y), with curly branch tips. `s` scales it (negative flips it).
const bareTree = (x: number, y: number, s: number, fill: string, opacity = 1) =>
  `<g transform="translate(${x},${y}) scale(${s},${Math.abs(s)})" opacity="${opacity}" fill="none" stroke="${fill}" stroke-linecap="round" stroke-linejoin="round">` +
  `<path d="M-4.5,1 C-3,-10 -3.5,-20 -1.6,-31 L1.6,-31 C3.2,-20 2.6,-10 4.5,1 Z" fill="${fill}" stroke-width="0.8"/>` +
  `<path d="M-4.5,1 Q-8,0 -10,2 M4.5,1 Q8,0 10.5,2" stroke-width="1.6"/>` +
  `<path d="M0,-29 Q-4,-37 -10,-40 Q-15,-42 -14,-37" stroke-width="2"/>` +
  `<path d="M0,-29 Q5,-38 9,-42 Q13,-46 15,-42 Q16,-39 13,-39" stroke-width="1.7"/>` +
  `<path d="M-1,-19 Q-7,-24 -12,-24 Q-16,-23 -15,-20" stroke-width="1.5"/>` +
  `<path d="M1.2,-23 Q8,-26 14,-25 Q17,-24 16,-21" stroke-width="1.4"/>` +
  `<path d="M-6,-37 Q-6,-43 -3,-46" stroke-width="1"/><path d="M6,-36 Q3,-41 4,-45" stroke-width="0.9"/>` +
  `</g>`
const trees =
  bareTree(262, FLOOR - 4, 0.5, '#24164a', 0.85) +
  bareTree(648, FLOOR - 5, -0.55, '#24164a', 0.85) +
  bareTree(44, FLOOR + 1, 1.05, '#0c0718') +
  bareTree(872, FLOOR + 1, -1.1, '#0c0718')

// The lantern swinging from the right-hand tree's lower branch.
const LANTERN = { x: 853, y: 46 }
const lantern =
  `<g><animateTransform attributeName="transform" type="rotate" values="-7 ${LANTERN.x} ${LANTERN.y};7 ${LANTERN.x} ${LANTERN.y};-7 ${LANTERN.x} ${LANTERN.y}" dur="4.4s" repeatCount="indefinite"/>` +
  `<line x1="${LANTERN.x}" y1="${LANTERN.y}" x2="${LANTERN.x}" y2="${LANTERN.y + 6}" stroke="#3a2a5c" stroke-width="0.6"/>` +
  `<circle cx="${LANTERN.x}" cy="${LANTERN.y + 10}" r="11" fill="url(#dk-warm)"><animate attributeName="opacity" values="0.7;1;0.8;1;0.7" dur="2.6s" repeatCount="indefinite"/></circle>` +
  `<rect x="${LANTERN.x - 2.6}" y="${LANTERN.y + 6}" width="5.2" height="1.2" rx="0.5" fill="#3a2a5c"/>` +
  `<rect x="${LANTERN.x - 2.2}" y="${LANTERN.y + 7.2}" width="4.4" height="5.6" rx="1.6" fill="#ffd98a" stroke="#3a2a5c" stroke-width="0.6"/>` +
  `<rect x="${LANTERN.x - 2.6}" y="${LANTERN.y + 12.6}" width="5.2" height="1.1" rx="0.5" fill="#3a2a5c"/></g>`

// The ground, with an uneven top edge, a pale rim of moonlight along it and little grass tufts.
const darkGround = (() => {
  const top: string[] = []
  for (let x = 0; x <= W; x += 25) top.push(`${x},${n(FLOOR + rand(x + 1300) * 3 - 1)}`)
  const tufts = Array.from({ length: 22 }, (_, i) => {
    const x = n(18 + i * 40 + rand(i + 1400) * 18)
    const y = FLOOR + 1
    return `<path d="M${x - 2.4},${y} Q${x - 2.2},${y - 3} ${x - 3.4},${y - 4.6} M${x},${y} Q${x},${y - 3.6} ${x + 0.6},${y - 5.4} M${x + 2.4},${y} Q${x + 2.6},${y - 2.6} ${x + 3.8},${y - 3.8}" stroke="#3d2866" stroke-width="0.9" fill="none" stroke-linecap="round"/>`
  }).join('')
  return (
    `<path d="M0,${H} ${top.map(p => `L${p}`).join(' ')} L${W},${H} Z" fill="url(#dk-ground)"/>` +
    `<polyline points="${top.join(' ')}" fill="none" stroke="#a48be6" stroke-width="0.6" opacity="0.4"/>` +
    tufts
  )
})()

// Glowing mushrooms: a pale stem and a round cap with light spots, `s` sized.
const mushroom = (x: number, y: number, s: number, c: Glowy, lean: number) =>
  `<g transform="translate(${x},${y}) rotate(${lean}) scale(${s})">` +
  `<path d="M-1.2,0 Q-1.5,-3 -0.9,-5.4 L0.9,-5.4 Q1.5,-3 1.2,0 Z" fill="#efe6ff"/>` +
  `<path d="M-4.6,-5 Q-4.4,-9.4 0,-9.6 Q4.4,-9.4 4.6,-5 Q0,-4 -4.6,-5 Z" fill="${c.cap}" stroke="${c.light}" stroke-width="0.35"/>` +
  `<path d="M-3.2,-6.4 Q-2.4,-8.6 0,-8.8" stroke="${c.light}" stroke-width="0.7" fill="none" stroke-linecap="round" opacity="0.85"/>` +
  `<circle cx="-1.6" cy="-7.2" r="0.6" fill="#ffffff" opacity="0.9"/><circle cx="1.8" cy="-6.6" r="0.5" fill="#ffffff" opacity="0.8"/><circle cx="0.4" cy="-8.4" r="0.4" fill="#ffffff" opacity="0.8"/>` +
  `</g>`
type Shroom = [number, number, Glowy, number]
const MUSHROOMS: [number, Shroom[], number][] = [
  [24, [[0, 0.9, CYAN, -8], [6, 0.6, ROSE, 10]], 4.8],
  [196, [[0, 1.1, CYAN, -4], [6.5, 0.7, VIOLET, 12]], 5.4],
  [318, [[0, 0.6, ROSE, 6]], 6.1],
  [470, [[0, 0.5, CYAN, -6], [4, 0.4, VIOLET, 14]], 5.8],
  [600, [[0, 0.8, VIOLET, 4], [-6, 0.55, ROSE, -12]], 5.1],
  [688, [[0, 1, CYAN, -3], [7, 0.65, ROSE, 12], [-6, 0.5, VIOLET, -14]], 4.6],
  [812, [[0, 1.2, ROSE, 3], [8, 0.75, CYAN, 15]], 5.6],
]
const mushrooms = MUSHROOMS.map(([x, shrooms, dur], i) => {
  const big = shrooms[0]!
  return (
    `<ellipse cx="${x + 2}" cy="${FLOOR - 2}" rx="${n(10 + big[1] * 10)}" ry="${n(5 + big[1] * 5)}" fill="url(#${big[2].grad})" opacity="0.6">` +
    `<animate attributeName="opacity" values="0.4;0.95;0.4" dur="${dur}s" begin="${n(-i * 1.3)}s" repeatCount="indefinite"/></ellipse>` +
    shrooms.map(([dx, s, c, lean]) => mushroom(x + dx, FLOOR + 1.5, s, c, lean)).join('')
  )
}).join('')

// A small carved pumpkin with a candle flickering inside.
const PUMPKIN = { x: 742, y: FLOOR + 2 }
const pumpkin = (() => {
  const { x, y } = PUMPKIN
  return (
    `<ellipse cx="${x}" cy="${y - 4}" rx="13" ry="8" fill="url(#dk-warm)"><animate attributeName="opacity" values="0.6;1;0.7;0.95;0.6" dur="1.9s" repeatCount="indefinite"/></ellipse>` +
    `<path d="M${x + 0.3},${y - 8.4} Q${x + 0.8},${y - 10.6} ${x + 2.4},${y - 11}" stroke="#5f7d36" stroke-width="1.3" fill="none" stroke-linecap="round"/>` +
    `<ellipse cx="${x - 3}" cy="${y - 4.3}" rx="3.6" ry="4.3" fill="#f0892e"/><ellipse cx="${x + 3}" cy="${y - 4.3}" rx="3.6" ry="4.3" fill="#f0892e"/>` +
    `<ellipse cx="${x}" cy="${y - 4.4}" rx="3.4" ry="4.5" fill="#ff9f43" stroke="#d06f1c" stroke-width="0.4"/>` +
    `<g fill="#ffe08a"><animate attributeName="opacity" values="0.8;1;0.85;1;0.8" dur="1.9s" repeatCount="indefinite"/>` +
    `<path d="M${x - 3.6},${y - 5.4} L${x - 2.2},${y - 7.2} L${x - 0.9},${y - 5.4} Z"/><path d="M${x + 0.9},${y - 5.4} L${x + 2.2},${y - 7.2} L${x + 3.6},${y - 5.4} Z"/>` +
    `<path d="M${x - 3.6},${y - 3.6} Q${x},${y - 0.4} ${x + 3.6},${y - 3.6} Q${x},${y - 2.2} ${x - 3.6},${y - 3.6} Z"/></g>`
  )
})()

// Will-o'-wisps: soft blue-white lights that float in slow loops and fade in and out.
const WISPS: [number, number, number][] = [
  [232, 52, 11],
  [410, 60, 13],
  [548, 56, 12],
  [640, 46, 10],
  [770, 60, 14],
]
const wisps = WISPS.map(([x, y, dur], i) => {
  const a = n(8 + rand(i + 1500) * 10)
  const b = n(4 + rand(i + 1510) * 5)
  return (
    `<g opacity="0"><animate attributeName="opacity" values="0;0.95;0.6;0.95;0" dur="${dur}s" begin="${n(-rand(i + 1520) * dur)}s" repeatCount="indefinite"/>` +
    `<g><animateMotion path="M0,0 C${a},${-b} ${n(a * 2)},${b} ${a},${n(b * 1.5)} C0,${n(b * 2)} ${-a},${b} ${-a},0 C${-a},${-b} ${n(-a / 2)},${-b} 0,0" dur="${dur}s" begin="${n(-rand(i + 1530) * dur)}s" repeatCount="indefinite"/>` +
    `<circle cx="${x}" cy="${y}" r="6" fill="url(#dk-wisp)"/><circle cx="${x}" cy="${y}" r="1.3" fill="#ffffff"/></g></g>`
  )
}).join('')

// Two little bats that flit across the sky now and then (one passes in front of the moon), flapping as they go.
const bat = (path: string, dur: number, begin: number, s: number) =>
  `<g><animateMotion path="${path}" keyPoints="0;1;1" keyTimes="0;0.5;1" calcMode="linear" dur="${dur}s" begin="${begin}s" repeatCount="indefinite"/>` +
  `<g transform="scale(${s})"><g><animateTransform attributeName="transform" type="scale" values="1 1;1 -0.5;1 1" dur="0.32s" repeatCount="indefinite"/>` +
  `<path d="M0,0 Q-3,-4 -7,-3 Q-6,-1 -7.5,0.6 Q-5,0 -4,1.6 Q-2,0.4 0,1 Q2,0.4 4,1.6 Q5,0 7.5,0.6 Q6,-1 7,-3 Q3,-4 0,0 Z" fill="#140b26" stroke="#7a63b8" stroke-width="0.35"/></g>` +
  `<ellipse cx="0" cy="0.4" rx="1.4" ry="1.8" fill="#140b26"/><path d="M-1,-1 L-0.9,-2.4 L-0.3,-1.4 M1,-1 L0.9,-2.4 L0.3,-1.4" fill="#140b26" stroke="#140b26" stroke-width="0.5"/>` +
  `<circle cx="-0.5" cy="0" r="0.25" fill="#ffd6ec"/><circle cx="0.5" cy="0" r="0.25" fill="#ffd6ec"/></g></g>`
const bats =
  bat('M-30,44 C150,30 300,40 470,30 C620,22 720,40 800,34 C850,30 900,26 940,30', 26, 3, 1) +
  bat('M940,26 C780,20 700,32 600,24 C450,14 320,30 200,24 C120,20 40,28 -30,22', 33, 15, 0.8)

// Ground fog drifting slowly along the floor.
const fog =
  `<g opacity="0.1"><animateTransform attributeName="transform" type="translate" values="0 0;60 0;0 0" dur="34s" repeatCount="indefinite"/>` +
  `<ellipse cx="260" cy="72" rx="230" ry="4.5" fill="#cdbfff"/><ellipse cx="720" cy="73" rx="180" ry="4" fill="#cdbfff"/></g>` +
  `<g opacity="0.08"><animateTransform attributeName="transform" type="translate" values="0 0;-70 0;0 0" dur="41s" repeatCount="indefinite"/>` +
  `<ellipse cx="520" cy="74" rx="260" ry="3.6" fill="#cdbfff"/></g>`

// Tiny motes, like fireflies, drifting up from the grass.
const darkMotes = Array.from({ length: 6 }, (_, i) => {
  const x = n(80 + ((i + rand(i + 1600)) / 6) * 760)
  const dur = n(8 + rand(i + 1610) * 5)
  const rise = n(18 + rand(i + 1620) * 16)
  return (
    `<circle cx="${x}" cy="${FLOOR - 1}" r="0.9" fill="${['#e9ddff', '#c9f2ff', '#ffd6ec'][i % 3]}" opacity="0">` +
    `<animateTransform attributeName="transform" type="translate" values="0 0;${n((rand(i + 1630) - 0.5) * 16)} ${n(-rise / 2)};0 ${-rise}" dur="${dur}s" begin="${n(-rand(i + 1640) * dur)}s" repeatCount="indefinite"/>` +
    `<animate attributeName="opacity" values="0;0.9;0" dur="${dur}s" begin="${n(-rand(i + 1650) * dur)}s" repeatCount="indefinite"/></circle>`
  )
}).join('')

// Small dark stones along the front.
const stones = [92, 230, 372, 520, 612, 760, 880].map((x, i) => `<ellipse cx="${x}" cy="82.5" rx="${n(1.8 + (i % 3) * 0.7)}" ry="1.1" fill="#3b2a5e" opacity="0.9"/>`).join('')

const nightWood = (): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">` +
  darkDefs +
  `<g mask="url(#dk-fade)"><rect width="${W}" height="${H}" fill="url(#dk-sky)"/>${skyDots}</g>` +
  twinkles +
  shooting(330, 20, -90, 16, 13, 4) +
  shooting(690, 19, -70, 14, 17, 11) +
  moon +
  bats +
  `<g mask="url(#dk-fade)">${hills}${trees}${darkGround}${stones}</g>` +
  lantern +
  fog +
  mushrooms +
  pumpkin +
  wisps +
  darkMotes +
  `</svg>`

// Built once, like the cave.
export const NIGHT_SVG = nightWood()

// ---- The Light garden: a sunset flower meadow ----
// A warm dusk sky (deep violet at the top so the title and fight text still read, then rose, coral and peach down
// to the hills), a big soft sun sinking behind the hills, pink clouds drifting, the first few stars coming out,
// hills dotted with flowers, and a meadow packed with flowers in front: big sunflowers, tulips and daisies at both
// ends, a little white fence with roses, small flowers in the middle where the fights play. Petals blow past,
// butterflies flutter about and bits of golden pollen float up.

const SUN = { x: 690, y: 63, r: 19 }

const lightDefs =
  `<defs>` +
  `<linearGradient id="lt-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0.12" stop-color="#2e1850"/><stop offset="0.38" stop-color="#6a2f72"/><stop offset="0.58" stop-color="#c24f7c"/><stop offset="0.74" stop-color="#f2826f"/><stop offset="0.88" stop-color="#ffbe7d"/></linearGradient>` +
  `<linearGradient id="lt-ground" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7aa354"/><stop offset="0.5" stop-color="#55813f"/><stop offset="1" stop-color="#365a30"/></linearGradient>` +
  `<linearGradient id="lt-sides" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#000"/><stop offset="0.035" stop-color="#fff"/><stop offset="0.965" stop-color="#fff"/><stop offset="1" stop-color="#000"/></linearGradient>` +
  `<mask id="lt-fade"><rect width="${W}" height="${H}" fill="url(#lt-sides)"/></mask>` +
  `<radialGradient id="lt-sun" cx="0.5" cy="0.45" r="0.55"><stop offset="0" stop-color="#fffbe0"/><stop offset="0.6" stop-color="#ffe29a"/><stop offset="1" stop-color="#ffb46b"/></radialGradient>` +
  `<radialGradient id="lt-halo"><stop offset="0" stop-color="#fff0b8" stop-opacity="0.6"/><stop offset="0.4" stop-color="#ffb07a" stop-opacity="0.28"/><stop offset="1" stop-color="#ff8f8f" stop-opacity="0"/></radialGradient>` +
  `<linearGradient id="lt-ray" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff3c4" stop-opacity="0.35"/><stop offset="1" stop-color="#fff3c4" stop-opacity="0"/></linearGradient>` +
  `</defs>`

// The first few stars of the evening, high up where the sky is darkest (none over the title).
const duskStars = (() => {
  const out: string[] = []
  for (let i = 0; out.length < 9 && i < 200; i++) {
    const x = n(30 + rand(i + 2000) * 840)
    const y = n(20 + rand(i + 2010) * 8)
    if (x > 330 && x < 570) continue
    out.push(
      `<text x="${x}" y="${y}" font-size="${n(4 + rand(i + 2020) * 3)}" fill="#fff3bf" text-anchor="middle" opacity="0.2">✦` +
        `<animate attributeName="opacity" values="0.1;0.85;0.1" dur="${n(3 + rand(i + 2030) * 3)}s" begin="${n(-rand(i + 2040) * 5)}s" repeatCount="indefinite"/></text>`,
    )
  }
  return out.join('')
})()

// The sun, sinking behind the hills: a breathing halo, slow turning rays and the warm disc.
const sun =
  `<circle cx="${SUN.x}" cy="${SUN.y}" r="70" fill="url(#lt-halo)"><animate attributeName="opacity" values="0.8;1;0.8" dur="7s" repeatCount="indefinite"/></circle>` +
  `<g opacity="0.8"><animateTransform attributeName="transform" type="rotate" values="0 ${SUN.x} ${SUN.y};360 ${SUN.x} ${SUN.y}" dur="120s" repeatCount="indefinite"/>` +
  Array.from({ length: 12 }, (_, i) => `<path d="M${SUN.x},${SUN.y - 2} L${SUN.x + 60},${SUN.y - 6} L${SUN.x + 60},${SUN.y + 2} Z" fill="url(#lt-ray)" transform="rotate(${i * 30} ${SUN.x} ${SUN.y})"/>`).join('') +
  `</g>` +
  `<circle cx="${SUN.x}" cy="${SUN.y}" r="${SUN.r}" fill="url(#lt-sun)"/>`

// Soft pink clouds with peach light on their undersides, drifting slowly.
const cloud = (x: number, y: number, w: number, dur: number, drift: number) =>
  `<g opacity="0.75"><animateTransform attributeName="transform" type="translate" values="0 0;${drift} 0;0 0" dur="${dur}s" repeatCount="indefinite"/>` +
  `<ellipse cx="${x}" cy="${y + 1.2}" rx="${w * 0.55}" ry="2.2" fill="#ffc48a"/>` +
  `<ellipse cx="${x}" cy="${y}" rx="${w * 0.5}" ry="2.6" fill="#ffb3c6"/>` +
  `<ellipse cx="${n(x - w * 0.18)}" cy="${y - 1.6}" rx="${n(w * 0.22)}" ry="2.6" fill="#ffc2d3"/>` +
  `<ellipse cx="${n(x + w * 0.14)}" cy="${y - 2.2}" rx="${n(w * 0.18)}" ry="2.8" fill="#ffd0dd"/></g>`
const clouds = cloud(120, 34, 70, 70, 30) + cloud(600, 40, 90, 85, -40) + cloud(830, 30, 56, 64, -24)

// Hills in rosy dusk colours, dotted with far-off flowers.
const sunsetHills = (() => {
  const far = hill(61, 12, 3, 66, 2.2, '#b5577f')
  const near = hill(67, 7, 2.4, 40, 0.6, '#8a3f74')
  const dots: string[] = []
  for (let i = 0; i < 70; i++) {
    const x = n(10 + rand(i + 2100) * 880)
    const top = 67 - 7 * ends(x) - 2.4 * Math.sin(x / 40 + 0.6)
    const y = n(top + 1 + rand(i + 2110) * Math.max(1, FLOOR - top - 1))
    dots.push(`<circle cx="${x}" cy="${y}" r="${n(0.5 + rand(i + 2120) * 0.5)}" fill="${['#ffd6ec', '#fff5c2', '#ffffff', '#e5d0ff'][i % 4]}" opacity="0.7"/>`)
  }
  return far + near + dots.join('')
})()

// A little white fence on the right with roses climbing it.
const fence = (() => {
  const xs = [796, 806, 816, 826, 836, 846]
  return (
    `<g>` +
    `<rect x="792" y="63" width="58" height="1.6" fill="#f3e4ea"/><rect x="792" y="68" width="58" height="1.6" fill="#f3e4ea"/>` +
    xs.map(x => `<path d="M${x - 2},${FLOOR + 1} L${x - 2},60 L${x},57.5 L${x + 2},60 L${x + 2},${FLOOR + 1} Z" fill="#fff8fb" stroke="#d9bccb" stroke-width="0.4"/>`).join('') +
    [798, 811, 822, 834, 844, 803, 829]
      .map((x, i) => `<circle cx="${x}" cy="${i < 5 ? 62.6 : 67.8}" r="1.6" fill="${i % 2 ? '#ff6f9f' : '#ff9ec0'}" stroke="#d94f7f" stroke-width="0.3"/><circle cx="${x + 1.8}" cy="${i < 5 ? 63.8 : 69}" r="0.9" fill="#6aa04a"/>`)
      .join('') +
    `</g>`
  )
})()

// The meadow's ground, a sunlit rim along its top, and grass tufts.
const meadow = (() => {
  const top: string[] = []
  for (let x = 0; x <= W; x += 25) top.push(`${x},${n(FLOOR + rand(x + 2200) * 3 - 1)}`)
  const tufts = Array.from({ length: 26 }, (_, i) => {
    const x = n(12 + i * 34 + rand(i + 2300) * 14)
    const y = FLOOR + 1
    return `<path d="M${x - 2.2},${y} Q${x - 2},${y - 3} ${x - 3.2},${y - 4.4} M${x},${y} Q${x},${y - 3.6} ${x + 0.6},${y - 5.2} M${x + 2.2},${y} Q${x + 2.4},${y - 2.6} ${x + 3.6},${y - 3.6}" stroke="#8fbf5e" stroke-width="0.9" fill="none" stroke-linecap="round"/>`
  }).join('')
  return (
    `<path d="M0,${H} ${top.map(p => `L${p}`).join(' ')} L${W},${H} Z" fill="url(#lt-ground)"/>` +
    `<polyline points="${top.join(' ')}" fill="none" stroke="#ffd59a" stroke-width="0.7" opacity="0.7"/>` +
    tufts
  )
})()

// Flowers. Each stands on (x, y) on a stem `h` tall, `s` sized: a daisy (round petals), a tulip or a puffball.
type Bloom = 'daisy' | 'tulip' | 'puff'
const PETALS = ['#ff8fc0', '#fff5f8', '#ffd43b', '#c7a2ff', '#ff8a70', '#9fd8ff', '#ffb3d9']
const flower = (x: number, y: number, h: number, s: number, kind: Bloom, col: string, leaf: boolean) => {
  const top = n(y - h)
  let head = ''
  if (kind === 'daisy') {
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 - Math.PI / 2
      head += `<circle cx="${n(x + Math.cos(a) * 1.5 * s)}" cy="${n(top + Math.sin(a) * 1.5 * s)}" r="${n(1.15 * s)}" fill="${col}"/>`
    }
    head += `<circle cx="${x}" cy="${top}" r="${n(0.9 * s)}" fill="${col === '#ffd43b' ? '#e8590c' : '#ffd43b'}"/>`
  } else if (kind === 'tulip') {
    const w = 1.7 * s
    head = `<path d="M${n(x - w)},${n(top - 2.6 * s)} L${n(x - w * 0.5)},${n(top - 1.2 * s)} L${x},${n(top - 2.8 * s)} L${n(x + w * 0.5)},${n(top - 1.2 * s)} L${n(x + w)},${n(top - 2.6 * s)} Q${n(x + w)},${top} ${x},${n(top + 0.6 * s)} Q${n(x - w)},${top} ${n(x - w)},${n(top - 2.6 * s)} Z" fill="${col}"/>`
  } else {
    head = `<circle cx="${x}" cy="${n(top - 0.6 * s)}" r="${n(1.9 * s)}" fill="${col}"/><circle cx="${n(x - 0.6 * s)}" cy="${n(top - 1.2 * s)}" r="${n(0.7 * s)}" fill="#ffffff" opacity="0.55"/>`
  }
  return (
    `<path d="M${x},${y} Q${n(x + 0.8)},${n(y - h / 2)} ${x},${top}" stroke="#4f8a3c" stroke-width="${n(0.55 * Math.max(1, s))}" fill="none"/>` +
    (leaf ? `<ellipse cx="${n(x + 1.3 * s)}" cy="${n(y - h * 0.35)}" rx="${n(1.4 * s)}" ry="${n(0.6 * s)}" fill="#5f9a45" transform="rotate(-30 ${n(x + 1.3 * s)} ${n(y - h * 0.35)})"/>` : '') +
    head
  )
}

// A sunflower: tall, with a ring of yellow petals round a brown middle. The big ones sway in the breeze.
const sunflower = (x: number, y: number, h: number, s: number, sway: number) => {
  const top = y - h
  let petals = ''
  for (let i = 0; i < 12; i++) petals += `<ellipse cx="${x}" cy="${n(top - 3 * s)}" rx="${n(0.9 * s)}" ry="${n(1.9 * s)}" fill="${i % 2 ? '#ffd43b' : '#fcc419'}" transform="rotate(${i * 30} ${x} ${top})"/>`
  return (
    `<g><animateTransform attributeName="transform" type="rotate" values="${-sway} ${x} ${y};${sway} ${x} ${y};${-sway} ${x} ${y}" dur="${n(4 + rand(x) * 2)}s" repeatCount="indefinite"/>` +
    `<path d="M${x},${y} Q${x + 1.5},${n(y - h / 2)} ${x},${top}" stroke="#4f8a3c" stroke-width="${n(0.9 * s)}" fill="none"/>` +
    `<ellipse cx="${n(x - 2.2 * s)}" cy="${n(y - h * 0.45)}" rx="${n(2.4 * s)}" ry="${n(1 * s)}" fill="#5f9a45" transform="rotate(25 ${n(x - 2.2 * s)} ${n(y - h * 0.45)})"/>` +
    `<ellipse cx="${n(x + 2.2 * s)}" cy="${n(y - h * 0.3)}" rx="${n(2.2 * s)}" ry="${n(0.9 * s)}" fill="#5f9a45" transform="rotate(-25 ${n(x + 2.2 * s)} ${n(y - h * 0.3)})"/>` +
    petals +
    `<circle cx="${x}" cy="${top}" r="${n(2 * s)}" fill="#7a4a1e"/><circle cx="${n(x - 0.6 * s)}" cy="${n(top - 0.6 * s)}" r="${n(0.7 * s)}" fill="#9c6630"/></g>`
  )
}

// How big flowers grow at x: big at both ends, small by the fruit tree and smallest in the middle where fights play.
const bloomSize = (x: number) => (x < 90 || x > 790 ? 1.25 : x < 165 ? 0.7 : x > 285 && x < 645 ? 0.62 : 0.9)

// The meadow's flowers: a back row along the ground's edge, a front row along the bottom, sunflowers at the ends.
const meadowFlowers = (() => {
  const kinds: Bloom[] = ['daisy', 'tulip', 'puff', 'daisy', 'daisy', 'tulip']
  const out: string[] = []
  let i = 0
  for (let x = 6; x < W - 4; x += 7 + rand(x + 2400) * 6, i++) {
    const s = bloomSize(x) * (0.8 + rand(i + 2410) * 0.4)
    const h = n(s * (4 + rand(i + 2420) * 5))
    out.push(flower(n(x), n(FLOOR + rand(i + 2430) * 1.5), h, n(s), kinds[i % kinds.length]!, PETALS[Math.floor(rand(i + 2440) * PETALS.length)]!, s > 1))
  }
  for (let x = 4; x < W; x += 10 + rand(x + 2500) * 8, i++) {
    const s = 0.55 + rand(i + 2510) * 0.3
    out.push(flower(n(x), 84, n(2.5 + rand(i + 2520) * 2), n(s), rand(i + 2530) > 0.5 ? 'daisy' : 'puff', PETALS[Math.floor(rand(i + 2540) * PETALS.length)]!, false))
  }
  return out.join('')
})()
const sunflowers = sunflower(22, FLOOR + 2, 24, 1.2, 3) + sunflower(62, FLOOR + 2, 18, 1, 4) + sunflower(870, FLOOR + 2, 26, 1.3, 3) + sunflower(888, FLOOR + 2, 16, 0.9, 4.5) + sunflower(774, FLOOR + 2, 15, 0.85, 4)

// Petals blowing past on the breeze, turning as they go.
const blownPetals = Array.from({ length: 10 }, (_, i) => {
  const x = n(120 + rand(i + 2600) * 760)
  const y = n(30 + rand(i + 2610) * 26)
  const dur = n(7 + rand(i + 2620) * 5)
  const begin = n(-rand(i + 2630) * dur)
  return (
    `<g opacity="0"><animate attributeName="opacity" values="0;0.95;0.95;0" keyTimes="0;0.15;0.8;1" dur="${dur}s" begin="${begin}s" repeatCount="indefinite"/>` +
    `<g><animateTransform attributeName="transform" type="translate" values="0 0;-70 10;-140 22" dur="${dur}s" begin="${begin}s" repeatCount="indefinite"/>` +
    `<ellipse cx="${x}" cy="${y}" rx="1.5" ry="0.8" fill="${['#ffb3d9', '#ff8fc0', '#fff0f6'][i % 3]}" transform="rotate(${n(rand(i + 2640) * 180)} ${x} ${y})"/></g></g>`
  )
}).join('')

// Butterflies fluttering in slow loops over the flowers.
const butterfly = (x: number, y: number, col: string, dur: number, a: number) =>
  `<g><animateMotion path="M0,0 C${a},-8 ${a * 2},6 ${a},10 C0,14 ${-a},4 ${-a},-2 C${-a},-8 ${-a / 2},-6 0,0" dur="${dur}s" repeatCount="indefinite"/>` +
  `<g transform="translate(${x},${y})"><g><animateTransform attributeName="transform" type="scale" values="1 1;0.25 1;1 1" dur="0.4s" repeatCount="indefinite"/>` +
  `<ellipse cx="-1.6" cy="-1" rx="1.7" ry="1.3" fill="${col}"/><ellipse cx="1.6" cy="-1" rx="1.7" ry="1.3" fill="${col}"/>` +
  `<ellipse cx="-1.2" cy="1" rx="1.1" ry="0.9" fill="${col}" opacity="0.85"/><ellipse cx="1.2" cy="1" rx="1.1" ry="0.9" fill="${col}" opacity="0.85"/></g>` +
  `<ellipse cx="0" cy="0" rx="0.35" ry="1.6" fill="#4a2f4f"/></g></g>`
const butterflies = butterfly(220, 60, '#ffd43b', 9, 14) + butterfly(560, 56, '#ff9ec0', 11, 16) + butterfly(735, 58, '#d0b3ff', 10, 12)

// Specks of golden pollen floating up from the flowers.
const pollen = Array.from({ length: 6 }, (_, i) => {
  const x = n(60 + ((i + rand(i + 2700)) / 6) * 780)
  const dur = n(7 + rand(i + 2710) * 5)
  const rise = n(16 + rand(i + 2720) * 14)
  return (
    `<circle cx="${x}" cy="${FLOOR - 3}" r="0.8" fill="#fff3bf" opacity="0">` +
    `<animateTransform attributeName="transform" type="translate" values="0 0;${n((rand(i + 2730) - 0.5) * 14)} ${n(-rise / 2)};0 ${-rise}" dur="${dur}s" begin="${n(-rand(i + 2740) * dur)}s" repeatCount="indefinite"/>` +
    `<animate attributeName="opacity" values="0;1;0" dur="${dur}s" begin="${n(-rand(i + 2750) * dur)}s" repeatCount="indefinite"/></circle>`
  )
}).join('')

const sunsetMeadow = (): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">` +
  lightDefs +
  `<g mask="url(#lt-fade)"><rect width="${W}" height="${H}" fill="url(#lt-sky)"/></g>` +
  duskStars +
  sun +
  clouds +
  `<g mask="url(#lt-fade)">${sunsetHills}${fence}${meadow}${meadowFlowers}</g>` +
  sunflowers +
  butterflies +
  blownPetals +
  pollen +
  `</svg>`

// Built once, like the others.
export const SUNSET_SVG = sunsetMeadow()
