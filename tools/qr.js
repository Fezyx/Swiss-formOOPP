/* Generátor QR kódu — bez jakýchkoli závislostí (čisté Node.js).
 *
 * Proč vlastní: aplikace musí fungovat offline a nesmí tahat knihovny z internetu.
 * Kód umí jen to, co potřebujeme: bajtový režim, korekce chyb M, verze 1–10.
 * Výsledná matice se vkládá do index.html (konstanta QR_SHARE_BITS).
 *
 * Použití:
 *   node tools/qr.js "https://example.com/soubor.apk"        → vypíše matici
 *   node tools/qr.js "https://example.com/soubor.apk" --js   → řádky pro index.html
 *   node tools/qr.js "https://example.com/soubor.apk" --svg APK-QR.svg
 */

'use strict';

/* ---------- tabulky pro korekci chyb M, verze 1–10 ---------- */
// total = všechna kodová slova, ec = opravných na blok, blocks = [počet bloků, datových slov na blok]
const ECC_M = {
  1:  { total: 26,  ec: 10, blocks: [[1, 16]] },
  2:  { total: 44,  ec: 16, blocks: [[1, 28]] },
  3:  { total: 70,  ec: 26, blocks: [[1, 44]] },
  4:  { total: 100, ec: 18, blocks: [[2, 32]] },
  5:  { total: 134, ec: 24, blocks: [[2, 43]] },
  6:  { total: 172, ec: 16, blocks: [[4, 27]] },
  7:  { total: 196, ec: 18, blocks: [[4, 31]] },
  8:  { total: 242, ec: 22, blocks: [[2, 38], [2, 39]] },
  9:  { total: 292, ec: 22, blocks: [[3, 36], [2, 37]] },
  10: { total: 346, ec: 26, blocks: [[4, 43], [1, 44]] }
};

// středy zarovnávacích obrazců (index = verze - 1)
const ALIGN = [
  [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34],
  [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50]
];

/* ---------- GF(256) ---------- */
const EXP = new Array(512);
const LOG = new Array(256);
(function initGf() {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP[i] = x;
    LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
})();

function gmul(a, b) {
  if (a === 0 || b === 0) return 0;
  return EXP[LOG[a] + LOG[b]];
}

// polynom jako pole koeficientů od nejvyššího stupně
function polyMul(a, b) {
  const out = new Array(a.length + b.length - 1).fill(0);
  for (let i = 0; i < a.length; i++) {
    for (let j = 0; j < b.length; j++) out[i + j] ^= gmul(a[i], b[j]);
  }
  return out;
}

function ecPoly(ecLen) {
  let p = [1];
  for (let i = 0; i < ecLen; i++) p = polyMul(p, [1, EXP[i]]);
  return p;
}

function ecBytes(data, ecLen) {
  const gen = ecPoly(ecLen);
  const buf = data.concat(new Array(ecLen).fill(0));
  for (let i = 0; i < data.length; i++) {
    const coef = buf[i];
    if (coef === 0) continue;
    for (let j = 0; j < gen.length; j++) buf[i + j] ^= gmul(gen[j], coef);
  }
  return buf.slice(data.length);
}

/* ---------- BCH pro formát a verzi ---------- */
function bchDigit(v) {
  let n = 0;
  while (v !== 0) { n++; v >>>= 1; }
  return n;
}

function formatBits(mask) {
  const data = (0 << 3) | mask;            // 00 = korekce M
  let d = data << 10;
  while (bchDigit(d) - bchDigit(0x537) >= 0) d ^= 0x537 << (bchDigit(d) - bchDigit(0x537));
  return ((data << 10) | d) ^ 0x5412;
}

function versionBits(v) {
  let d = v << 12;
  while (bchDigit(d) - bchDigit(0x1f25) >= 0) d ^= 0x1f25 << (bchDigit(d) - bchDigit(0x1f25));
  return (v << 12) | d;
}

/* ---------- masky ---------- */
function maskBit(mask, i, j) {
  switch (mask) {
    case 0: return (i + j) % 2 === 0;
    case 1: return i % 2 === 0;
    case 2: return j % 3 === 0;
    case 3: return (i + j) % 3 === 0;
    case 4: return (Math.floor(i / 2) + Math.floor(j / 3)) % 2 === 0;
    case 5: return ((i * j) % 2) + ((i * j) % 3) === 0;
    case 6: return (((i * j) % 2) + ((i * j) % 3)) % 2 === 0;
    default: return (((i * j) % 3) + ((i + j) % 2)) % 2 === 0;
  }
}

/* ---------- data ---------- */
function pickVersion(bytes) {
  for (let v = 1; v <= 10; v++) {
    const info = ECC_M[v];
    let dataWords = 0;
    for (const [cnt, per] of info.blocks) dataWords += cnt * per;
    const countBits = v < 10 ? 8 : 16;
    const need = Math.ceil((4 + countBits) / 8) + bytes.length;
    if (need <= dataWords) return v;
  }
  throw new Error('Text je pro QR kód moc dlouhý (max ~200 znaků).');
}

function buildCodewords(bytes, version) {
  const info = ECC_M[version];
  const countBits = version < 10 ? 8 : 16;
  const bits = [];
  const push = (value, len) => {
    for (let i = len - 1; i >= 0; i--) bits.push((value >>> i) & 1);
  };
  push(4, 4);                      // bajtový režim
  push(bytes.length, countBits);
  for (const b of bytes) push(b, 8);

  let dataWords = 0;
  for (const [cnt, per] of info.blocks) dataWords += cnt * per;

  const capacity = dataWords * 8;
  push(0, Math.min(4, capacity - bits.length));   // zakončovací bity
  while (bits.length % 8 !== 0) bits.push(0);

  const data = [];
  for (let i = 0; i < bits.length; i += 8) {
    let byte = 0;
    for (let k = 0; k < 8; k++) byte = (byte << 1) | bits[i + k];
    data.push(byte);
  }
  let pad = true;
  while (data.length < dataWords) {
    data.push(pad ? 0xec : 0x11);
    pad = !pad;
  }

  // rozdělení do bloků + opravné kódy
  const blocks = [];
  let offset = 0;
  for (const [cnt, per] of info.blocks) {
    for (let b = 0; b < cnt; b++) {
      const chunk = data.slice(offset, offset + per);
      offset += per;
      blocks.push({ data: chunk, ec: ecBytes(chunk, info.ec) });
    }
  }

  // prokládání datových a opravných slov
  const out = [];
  const maxData = Math.max.apply(null, blocks.map((b) => b.data.length));
  for (let i = 0; i < maxData; i++) {
    for (const b of blocks) if (i < b.data.length) out.push(b.data[i]);
  }
  for (let i = 0; i < info.ec; i++) {
    for (const b of blocks) out.push(b.ec[i]);
  }
  return out;
}

/* ---------- matice ---------- */
function newMatrix(size) {
  const m = [];
  for (let i = 0; i < size; i++) m.push(new Array(size).fill(null));
  return m;
}

function placeFinder(m, row, col) {
  const size = m.length;
  for (let r = -1; r <= 7; r++) {
    for (let c = -1; c <= 7; c++) {
      const rr = row + r, cc = col + c;
      if (rr < 0 || rr >= size || cc < 0 || cc >= size) continue;
      const dark =
        (r >= 0 && r <= 6 && (c === 0 || c === 6)) ||
        (c >= 0 && c <= 6 && (r === 0 || r === 6)) ||
        (r >= 2 && r <= 4 && c >= 2 && c <= 4);
      m[rr][cc] = dark;
    }
  }
}

function placeFixedPatterns(m, version) {
  const size = m.length;
  placeFinder(m, 0, 0);
  placeFinder(m, size - 7, 0);
  placeFinder(m, 0, size - 7);

  // zarovnávací obrazce
  const pos = ALIGN[version - 1];
  for (let i = 0; i < pos.length; i++) {
    for (let j = 0; j < pos.length; j++) {
      const row = pos[i], col = pos[j];
      if (m[row][col] !== null) continue;
      for (let r = -2; r <= 2; r++) {
        for (let c = -2; c <= 2; c++) {
          m[row + r][col + c] = Math.abs(r) === 2 || Math.abs(c) === 2 || (r === 0 && c === 0);
        }
      }
    }
  }

  // časovací obrazce
  for (let i = 8; i < size - 8; i++) {
    if (m[i][6] === null) m[i][6] = i % 2 === 0;
    if (m[6][i] === null) m[6][i] = i % 2 === 0;
  }
}

function placeFormat(m, mask) {
  const size = m.length;
  const bits = formatBits(mask);
  for (let i = 0; i < 15; i++) {
    const dark = ((bits >> i) & 1) === 1;
    if (i < 6) m[i][8] = dark;
    else if (i < 8) m[i + 1][8] = dark;
    else m[size - 15 + i][8] = dark;

    if (i < 8) m[8][size - i - 1] = dark;
    else if (i < 9) m[8][15 - i - 1 + 1] = dark;
    else m[8][15 - i - 1] = dark;
  }
  m[size - 8][8] = true;      // tmavý modul
}

function placeVersion(m, version) {
  if (version < 7) return;
  const size = m.length;
  const bits = versionBits(version);
  for (let i = 0; i < 18; i++) {
    const dark = ((bits >> i) & 1) === 1;
    m[Math.floor(i / 3)][(i % 3) + size - 11] = dark;
    m[(i % 3) + size - 11][Math.floor(i / 3)] = dark;
  }
}

function placeData(m, codewords, mask) {
  const size = m.length;
  let byteIndex = 0;
  let bitIndex = 7;
  let inc = -1;
  let row = size - 1;
  for (let col = size - 1; col > 0; col -= 2) {
    if (col === 6) col--;
    for (;;) {
      for (let c = 0; c < 2; c++) {
        const cc = col - c;
        if (m[row][cc] !== null) continue;
        let dark = false;
        if (byteIndex < codewords.length) dark = ((codewords[byteIndex] >>> bitIndex) & 1) === 1;
        if (maskBit(mask, row, cc)) dark = !dark;
        m[row][cc] = dark;
        bitIndex--;
        if (bitIndex === -1) { byteIndex++; bitIndex = 7; }
      }
      row += inc;
      if (row < 0 || row >= size) { row -= inc; inc = -inc; break; }
    }
  }
}

function render(version, codewords, mask) {
  const size = version * 4 + 17;
  const m = newMatrix(size);
  placeFixedPatterns(m, version);
  placeVersion(m, version);
  placeFormat(m, mask);
  placeData(m, codewords, mask);
  return m;
}

/* ---------- výběr masky (penalizace dle normy) ---------- */
function penalty(m) {
  const size = m.length;
  let score = 0;

  // pravidlo 1: pět a více stejných modulů v řadě
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < size; i++) {
      let run = 1;
      for (let j = 1; j < size; j++) {
        const a = pass === 0 ? m[i][j] : m[j][i];
        const b = pass === 0 ? m[i][j - 1] : m[j - 1][i];
        if (a === b) run++;
        else { if (run >= 5) score += 3 + (run - 5); run = 1; }
      }
      if (run >= 5) score += 3 + (run - 5);
    }
  }

  // pravidlo 2: bloky 2×2 stejné barvy
  for (let i = 0; i < size - 1; i++) {
    for (let j = 0; j < size - 1; j++) {
      const v = m[i][j];
      if (v === m[i][j + 1] && v === m[i + 1][j] && v === m[i + 1][j + 1]) score += 3;
    }
  }

  // pravidlo 3: vzor 1:1:3:1:1 s mezerou (podobá se hledacímu obrazci)
  const pat1 = [true, false, true, true, true, false, true, false, false, false, false];
  const pat2 = [false, false, false, false, true, false, true, true, true, false, true];
  const check = (get) => {
    for (let i = 0; i < size; i++) {
      for (let j = 0; j + 11 <= size; j++) {
        let ok1 = true, ok2 = true;
        for (let k = 0; k < 11; k++) {
          const v = get(i, j + k);
          if (v !== pat1[k]) ok1 = false;
          if (v !== pat2[k]) ok2 = false;
        }
        if (ok1) score += 40;
        if (ok2) score += 40;
      }
    }
  };
  check((i, j) => m[i][j]);
  check((i, j) => m[j][i]);

  // pravidlo 4: poměr tmavých modulů
  let dark = 0;
  for (let i = 0; i < size; i++) for (let j = 0; j < size; j++) if (m[i][j]) dark++;
  score += Math.floor(Math.abs((dark * 100) / (size * size) - 50) / 5) * 10;

  return score;
}

/* ---------- veřejné API ---------- */
function encode(text, opts) {
  const bytes = Array.from(Buffer.from(String(text), 'utf8'));
  const version = pickVersion(bytes);
  const codewords = buildCodewords(bytes, version);
  const base = {
    text: String(text),
    version,
    size: version * 4 + 17,
    codewords
  };
  if (opts && opts.forceMask != null) {
    const m = render(version, codewords, opts.forceMask);
    return Object.assign(base, { mask: opts.forceMask, score: penalty(m), matrix: m });
  }
  let best = null;
  for (let mask = 0; mask < 8; mask++) {
    const m = render(version, codewords, mask);
    const score = penalty(m);
    if (!best || score < best.score) best = { mask, score, matrix: m };
  }
  return Object.assign(base, { mask: best.mask, score: best.score, matrix: best.matrix });
}

function toBits(matrix) {
  let s = '';
  for (const row of matrix) for (const v of row) s += v ? '1' : '0';
  return s;
}

function toBase64(bits) {
  const bytes = [];
  for (let i = 0; i < bits.length; i += 8) {
    let b = 0;
    for (let k = 0; k < 8; k++) b = (b << 1) | (bits[i + k] === '1' ? 1 : 0);
    bytes.push(b);
  }
  return Buffer.from(bytes).toString('base64');
}

function toSvg(matrix, opts) {
  const quiet = (opts && opts.quiet != null) ? opts.quiet : 4;
  const px = (opts && opts.size) || 512;
  const n = matrix.length;
  const total = n + quiet * 2;
  const out = [];
  out.push('<?xml version="1.0" encoding="UTF-8"?>');
  out.push('<svg xmlns="http://www.w3.org/2000/svg" width="' + px + '" height="' + px +
    '" viewBox="0 0 ' + total + ' ' + total + '" shape-rendering="crispEdges">');
  out.push('<rect width="' + total + '" height="' + total + '" fill="#ffffff"/>');
  let d = '';
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (matrix[i][j]) d += 'M' + (j + quiet) + ',' + (i + quiet) + 'h1v1h-1z';
    }
  }
  out.push('<path d="' + d + '" fill="#000000"/>');
  out.push('</svg>');
  return out.join('\n');
}

function functionMap(version) {
  const size = version * 4 + 17;
  const m = newMatrix(size);
  placeFixedPatterns(m, version);
  placeVersion(m, version);
  placeFormat(m, 0);
  return m.map((row) => row.map((v) => v !== null));
}

module.exports = { encode, toBits, toBase64, toSvg, functionMap, maskBit, formatBits };

/* ---------- CLI ---------- */
if (require.main === module) {
  const args = process.argv.slice(2);
  const text = args.find((a) => !a.startsWith('--') && args[args.indexOf(a) - 1] !== '--svg');
  if (!text) {
    console.error('Použití: node tools/qr.js "TEXT" [--js | --dots | --svg soubor.svg]');
    process.exit(1);
  }
  const res = encode(text);

  const svgIdx = args.indexOf('--svg');
  if (svgIdx >= 0) {
    const fs = require('fs');
    const file = args[svgIdx + 1] || 'qr.svg';
    fs.writeFileSync(file, toSvg(res.matrix), 'utf8');
    console.log('Uloženo: ' + file + ' (verze ' + res.version + ', maska ' + res.mask + ')');
    process.exit(0);
  }

  if (args.includes('--js')) {
    console.log('Verze ' + res.version + ', maska ' + res.mask + ', ' + res.size + 'x' + res.size);
    console.log('const QR_SHARE_SIZE = ' + res.size + ';');
    console.log('const QR_SHARE_BITS = \'' + toBase64(toBits(res.matrix)) + '\';');
    process.exit(0);
  }

  if (args.includes('--dots')) {
    for (const row of res.matrix) console.log(row.map((v) => (v ? '##' : '  ')).join(''));
    process.exit(0);
  }

  console.log('verze: ' + res.version + ', maska: ' + res.mask + ', rozměr: ' + res.size + 'x' + res.size +
    ', kódová slova: ' + res.codewords.length);
  for (const row of res.matrix) console.log(row.map((v) => (v ? '#' : '.')).join(''));
}
