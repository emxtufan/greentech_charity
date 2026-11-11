// Plugin PostCSS care aliniază site-ul cu paleta crem și verde a scenei 3D.
// Rulează pe tot CSS-ul procesat de Vite, inclusiv pe cel din node_modules,
// ca să nu fie nevoie să modificăm CSS-ul vendor.

// Perechi FROM → TO (hex fără #). Lista acoperă și perechile rgb-only din
// specificație (42,73,61 / 66,93,84 / 16,75,89 / 20,71,52 / 37,214,177 /
// 72,107,95 / 203,225,218): acele triplete rgb sunt exact hex-urile
// echivalente de mai jos, deci ajung în MAP prin tripletul lor.
const HEX_PAIRS = {
  '2a493d': '1f3a27',
  '3e8f75': '1f3a27',
  '425d54': '1f3a27',
  '407d69': '1f3a27',
  'e4f8f2': 'efede0',
  '144734': '1f3a27',
  '104b59': '1f3a27',
  '4a6f63': '456f4c',
  'cbdfd8': 'd3e6c8',
  'd4e0db': 'dce8d4',
  '2e8b57': '1f3a27',
  '0f2f22': '0f3520',
  '6b7c74': '6b7a6c',
  'cdf3e7': 'efede0',
  '3c8970': '1f3a27',
  '20332c': '1c3524',
  '93d2be': 'bcc5b5',
  'cfe3dd': 'd8e9cd',
  '508d79': '4f8c55',
  '87c6b2': '9cc982',
  '1d2b26': '1c2b20',
  'd6e8e2': 'ddebd4',
  'c5d0cc': 'cbd6c6',
  'dae5e1': 'dfe8da',
  'e9f8f3': 'efede0',
  'c6dad3': 'cfe0c6',
  'a3decb': 'b7dca0',
  'dae8e3': 'dfeada',
  'ceeee4': 'dcefcf',
  'e0f1ed': 'e6f2e0',
  'e9f9f4': 'efede0',
  '99bbb0': 'a6c39a',
  '7ead9d': '86ad7c',
  '769186': '7a917a',
  '59776b': '5d7a5f',
  '478470': '447f4b',
  '3e7a66': '3b7745',
  '4e7a6c': '4b7a52',
  '295043': '294532',
  '295a52': '285a3c',
  '364e46': '1f3a27',
  '324a42': '304a38',
  '3f534c': '3d533f',
  '49665d': '47664c',
  '486258': '466249',
  '41685b': '3f684a',
  '304e42': '2f4e38',
  '13362b': '133624',
  '143227': '14321f',
  '152922': '15291a',
  '17241f': '17241a',
  '0c241c': '0c2416',
  '061510': '061509',
  '03150f': '03150a',
  '010f0a': '010f06',
  '131e1a': '131e15',
  '24312c': '242f25',
  '02171c': '021a0e',
  '0c3a44': '0c3a22',
  '366f7c': '2f6f45',
  '9fd8c5': 'bcc5b5',
  'e7f4ef': 'efede0',
  'cfe0d6': 'd6e6cc',
  '173f2f': '173f24',
  '3c4a44': '3c4a40',
  '788983': '7a8a7c',
  '475b54': '475b4a',
  'cbe1da': 'd6e8cc',
  '25d6b1': '1f3a27',
  '486b5f': '3c6b46',
  '0a5d6a': '1f3a27',
  'f3faf6': 'efede0',
  'ebf6f1': 'efede0',
  'f0faf6': 'efede0',
  'ffffff': 'efede0',
  'f8f7f4': 'efede0',
  'f9f4d6': 'efede0',
  'fdfbf1': 'efede0',
  'f4f7f8': 'efede0',
  'f9da22': 'efede0',
  'ffe132': 'efede0',
  'fce351': 'efede0',
  'fbdf33': 'efede0',
  'f2e59b': 'e2e2d2',
  '47504d': '1f3a27',
  '1b6943': '1f3a27',
  '2e7d40': '1f3a27',
  '6fae4a': '1f3a27',
  '2a322f': '1f3a27',
  '000000': '1f3a27',
}

// cheia este tripletul "r,g,b" al culorii sursă, valoarea este hex-ul țintă
const MAP = {}

for (const [from, to] of Object.entries(HEX_PAIRS)) {
  MAP[toTriplet(from)] = to
}

function toTriplet(hex) {
  return [
    parseInt(hex.slice(0, 2), 16),
    parseInt(hex.slice(2, 4), 16),
    parseInt(hex.slice(4, 6), 16),
  ].join(',')
}

function tripletToRgb(triplet) {
  return triplet.split(',').map((part) => Number(part))
}

function recolorHex(match) {
  const hex = match.slice(1)
  const expanded =
    hex.length === 3
      ? hex
          .split('')
          .map((char) => char + char)
          .join('')
      : hex
  const target = MAP[toTriplet(expanded)]

  return target ? `#${target}` : match
}

function recolorRgbFunction(match) {
  const openIndex = match.indexOf('(')
  const name = match.slice(0, openIndex)
  const inner = match.slice(openIndex + 1, match.length - 1)
  const parts = inner.split(/\s*,\s*|\s*\/\s*|\s+/).filter(Boolean)

  if (parts.length < 3) return match

  const [r, g, b] = parts
  if (![r, g, b].every((part) => /^\d+$/.test(part))) return match

  const target = MAP[`${Number(r)},${Number(g)},${Number(b)}`]
  if (!target) return match

  const rgb = tripletToRgb(toTriplet(target))
  const alpha = parts.length > 3 ? parts[3] : ''

  // rgb()/rgba() păstrează forma originală: numele funcției, separatorii și alpha-ul
  if (inner.includes('/')) {
    const rgbPart = rgb.join(' ')
    return alpha ? `${name}(${rgbPart} / ${alpha})` : `${name}(${rgbPart})`
  }

  const separator = inner.includes(', ')
    ? ', '
    : inner.includes(',')
      ? ','
      : ' '
  const values = alpha ? [...rgb, alpha] : rgb

  return `${name}(${values.join(separator)})`
}

const HEX_RE = /#(?:[0-9a-f]{6}|[0-9a-f]{3})\b/gi
const RGB_RE = /rgba?\([^()]*\)/gi

export function recolorValue(value) {
  if (typeof value !== 'string' || !value) return value

  return value.replace(HEX_RE, recolorHex).replace(RGB_RE, recolorRgbFunction)
}

export default function recolor() {
  return {
    postcssPlugin: 'gt-recolor',
    Declaration(decl) {
      decl.value = recolorValue(decl.value)
    },
  }
}

recolor.postcss = true
