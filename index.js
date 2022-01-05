import shapefile from 'shapefile'
import * as fs from 'fs/promises'
import dotenv from 'dotenv'
dotenv.config()
// Default to ma_eastern if no --shape=yyy passed as a command line flag.
const GEO_FOCUS = process.env.npm_config_shape || 'ma_eastern'
const SHAPE_DIR = process.env[`npm_package_config_${GEO_FOCUS}`]
if (!SHAPE_DIR) throw new Error(`No SHAPE_DIR for ${GEO_FOCUS}`)
const shapeFile = `data/${SHAPE_DIR}/Shape/Elev_Contour.shp`
const xmlFile = `data/${SHAPE_DIR}/Shape/${SHAPE_DIR}.xml`
const outDir = 'out'
const outFile = `${outDir}/${GEO_FOCUS}.svg`

// xml2json-light was not working with our xml so this even simpler approach works fine for us.
const getTagValue = (name, xmlStr) => {
  const match = xmlStr.match(new RegExp(`<${name}>([^<]*)</${name}>`))
  const value = match?.[1]
  if (value) {
    // Turn strings into numbers and get rid of floating point drift with rounding.
    return Math.round(Number(value))
  }
  throw new Error(`Missing ${name} tag in xml.`)
}

const xmlStr = (await fs.readFile(xmlFile)).toString()
const north = getTagValue('northbc', xmlStr)
const south = getTagValue('southbc', xmlStr)
const east = getTagValue('eastbc', xmlStr)
const west = getTagValue('westbc', xmlStr)
// We use the mid point of the latitude and longitude bounds.
const LAT_OFF = (north + south) / 2
const LON_OFF = (east + west) / 2

// Points of Interest are optional
const interestsCoordinates = (process.env[`${GEO_FOCUS}_interests`] || '')
  .split(':')
  .map((s) => s.split(',').map((p) => p.trim()))

// @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/for-await...of
async function* shapes(fileName) {
  const reader = await shapefile.open(fileName)
  while (true) {
    const { done, value } = await reader.read()
    if (done) return
    yield value
  }
}

// @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol/asyncIterator#user-defined_async_iterables
// const shapesNoArgs = {
//   async *[Symbol.asyncIterator]() {
//     const reader = await shapefile.open(shapeFile)
//     while (true) {
//       const { done, value } = await reader.read()
//       if (done) return
//       yield value
//     }
//   },
// }

const getCoordinates = (item) =>
  item.geometry.type === 'LineString'
    ? [item.geometry.coordinates]
    : item.geometry.type === 'MultiLineString'
    ? item.geometry.coordinates
    : [] // silently ignore other types of geometry

let itemLines
let linesOn10 = []
let linesOn20 = []
let linesOn40 = []
// let wip = {}
// let key
// let val
for await (const item of shapes(shapeFile)) {
  const elev = item.properties.ContourEle
  // Only sea level or above
  const seaLevel = elev >= 0
  // For higher elevation blocks are only available at 20 or 40 foot intervals,
  // so we show 10 foot intervals for the first 100 feet,
  // then 20 foot intervals up until 1000 feet,
  // and 40 foot intervals for the rest assuming they're available up to 10000 feet.
  const keep10 = seaLevel && elev % 10 === 0 && elev < 100
  const keep20 = seaLevel && elev % 20 === 0 && elev < 1000 && elev >= 100
  const keep40 = seaLevel && elev % 40 === 0 && elev < 10000 && elev >= 1000

  itemLines = getCoordinates(item)
  keep10 && linesOn10.push(...itemLines)
  keep20 && linesOn20.push(...itemLines)
  keep40 && linesOn40.push(...itemLines)

  // key = `e_${item.properties.ContourEle}`
  // val = `${item.properties.ContourEle}_${item.properties.ContourInt}_${item.properties.NEDResolut}`
  // val = `${item.properties.ContourEle}_${item.properties.ContourInt}_${item.properties.NEDResolut}`
  // if (wip.hasOwnProperty(key)) {
  //   if (!wip[key].includes(val)) wip[key].push(val)
  // } else {
  //   wip[key] = [val]
  // }
}
// console.table(
//   Object.entries(wip)
//     .sort((a, b) => {
//       return a[0].replace('e_', '') - b[0].replace('e_', '')
//     })
//     .map(([k, v]) => {
//       v.sort()
//       return v
//     }),
// )

// @see https://github.com/d3/d3-interpolate/blob/main/src/number.js
const interpolateNumber = (a, b) => (t) => a * (1 - t) + b * t

const SCALE = 100000 // having a large amount of pixels lets us round points to whole numbers and drop fractional parts
const MARGIN = SCALE * 0.125 // we have contour lines that go outside the 1 degree box, this lets us show them
const S_2M = SCALE + 2 * MARGIN // common size with margin added on so we can have an outer width / height
const flip = interpolateNumber(1, 0) // we will use the math notion of y not the computer notion
const adjustScaleFlip = (p) => [
  // May only work in NW Quadrant of the globe
  Math.round(SCALE * (p[0] - Math.floor(LON_OFF))),
  Math.round(SCALE * flip(p[1] - Math.floor(LAT_OFF))),
]
const adjust = (points) => points.map(adjustScaleFlip)
const pointsOfInterest = interestsCoordinates.map(adjustScaleFlip)

// @see https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/d
// NOTE coordinate will be [adjustedLongitude, adjustedLatitude] and will get coerced into string form with a comma between them
const lineToPathAttr = (coordinate) => 'M' + coordinate.join('L')

// TODO figure out if on screen styles work well for printers or they're too much ink when printed out.
let out = `<svg
  viewBox="${-MARGIN} ${-MARGIN} ${S_2M} ${S_2M}"
  xmlns="http://www.w3.org/2000/svg">
<style>
  path {
    fill: none;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .c40 {
    stroke: #000;
    stroke-width: 24px;
  }
  .c20 {
    stroke: #000;
    stroke-width: 12px;
  }
  .c10 {
    stroke: #000;
    stroke-width: 6px;
  }
  .background {
    fill: #fff;
  }
  .margin {
    fill: #999;
    fill-opacity: 0.6;
  }
  .interest {
    fill: #f80;
    fill-opacity: 0.3;
  }
</style>
<rect class="background" x="${-MARGIN}" y="${-MARGIN}" width="${S_2M}" height="${S_2M}"/>
`
// Contour Lines at 10 foot intervals
out += linesOn10
  .map(adjust)
  .map(lineToPathAttr)
  .map((d) => `<path class="c10" d="${d}"/>`)
  .join('\n')
// Contour Lines at 20 foot intervals
out += linesOn20
  .map(adjust)
  .map(lineToPathAttr)
  .map((d) => `<path class="c20" d="${d}"/>`)
  .join('\n')
// Contour Lines at 40 foot intervals
out += linesOn40
  .map(adjust)
  .map(lineToPathAttr)
  .map((d) => `<path class="c40" d="${d}"/>`)
  .join('\n')
// Put orange dots at points of interest.
out += pointsOfInterest.map(
  ([x, y]) => `<circle class="interest" cx="${x}" cy="${y}" r="1000"/>`,
)

// vaguely based on https://stackoverflow.com/a/11878784 for the grey margin border
out += `<path class="margin" d="
M${-MARGIN},${-MARGIN}h${S_2M}v${S_2M}h${-S_2M}z
M0,0v${SCALE}h${SCALE}v${-SCALE}z
"/>
</svg>
`

try {
  await fs.mkdir(outDir)
} catch (e) {
  if (e.code === 'EEXIST') {
    // It's fine and expected the directory may already exist so we ignore this error.
  } else {
    throw e
  }
}
await fs.writeFile(outFile, out)
