/* Kontrola QR kódu pro odkaz ke stažení APK.
 *
 * Ověří tři věci:
 *  1) generátor tools/qr.js dává stejnou matici jako uložený vzorek
 *     (vzorek byl ověřen modul po modulu proti quickchart.io),
 *  2) matice v index.html (QR_SHARE_SIZE + QR_SHARE_BITS) je stejná,
 *  3) APK-QR.svg obsahuje stejný počet tmavých modulů (= stejný kód).
 *
 * Spuštění:  node tools/qr-check.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const qr = require('./qr.js');

const ROOT = path.join(__dirname, '..');
const URL_TEXT = 'https://github.com/Fezyx/Swiss-formOOPP/releases/latest/download/OOPP.apk';
// Ověřený vzorek (37×37, verze 5, korekce M, maska 3) — viz APK.md
const EXPECTED_SIZE = 37;
const EXPECTED_MASK = 3;
const EXPECTED_DARK = 690;
const EXPECTED_BITS = '/uuqK/wV5P9QboiifLt1or/F26KVI67BJA0VB/qqqq/gHf4jALdjiTpYi04yaqbiWXBwaqpjzsYqwDdryh7Je+ztE8qy0DpPkHMjWOxAZYsG1JHEjHSODnDY5TKm+aJZ2I6JXKYhjpscJACMZ2icHrwz9rKIpWOe3eb+iz0Z+Sx3M3iX+P+ARvDMV/qlMarwWANzELp2NC/V1Kn4tm62s3O5BGUgo0/qmK5PgA==';

let failed = 0;
function check(name, ok, detail) {
  console.log((ok ? '  OK   ' : '  CHYBA') + '  ' + name + (detail ? ' — ' + detail : ''));
  if (!ok) failed++;
}

const res = qr.encode(URL_TEXT);
const bits = qr.toBase64(qr.toBits(res.matrix));
let dark = 0;
for (const row of res.matrix) for (const v of row) if (v) dark++;

console.log('Generátor tools/qr.js:');
check('rozměr ' + EXPECTED_SIZE + 'x' + EXPECTED_SIZE, res.size === EXPECTED_SIZE, res.size + 'x' + res.size);
check('maska ' + EXPECTED_MASK, res.mask === EXPECTED_MASK, 'maska ' + res.mask);
check('tmavých modulů ' + EXPECTED_DARK, dark === EXPECTED_DARK, String(dark));
check('matice shodná s ověřeným vzorkem', bits === EXPECTED_BITS);

console.log('index.html:');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const sizeM = html.match(/const QR_SHARE_SIZE = (\d+);/);
const bitsM = html.match(/const QR_SHARE_BITS = '([^']+)';/);
const urlM = html.match(/const SHARE_APK_URL = '([^']+)';/);
check('odkaz SHARE_APK_URL', !!urlM && urlM[1] === URL_TEXT, urlM ? urlM[1] : 'chybí');
check('QR_SHARE_SIZE', !!sizeM && Number(sizeM[1]) === EXPECTED_SIZE, sizeM ? sizeM[1] : 'chybí');
check('QR_SHARE_BITS', !!bitsM && bitsM[1] === EXPECTED_BITS, bitsM ? 'přítomno' : 'chybí');

console.log('APK-QR.svg:');
const svgFile = path.join(ROOT, 'APK-QR.svg');
if (!fs.existsSync(svgFile)) {
  check('soubor existuje', false, 'chybí');
} else {
  const svg = fs.readFileSync(svgFile, 'utf8');
  const paths = (svg.match(/M\d+,\d+h1v1h-1z/g) || []).length;
  check('tmavých modulů ' + EXPECTED_DARK, paths === EXPECTED_DARK, String(paths));
  check('viewBox 0 0 45 45 (okraj 4 moduly)',
    svg.indexOf('viewBox="0 0 45 45"') >= 0);
}

console.log(failed ? 'VÝSLEDEK: ' + failed + ' chyb' : 'VÝSLEDEK: vše v pořádku');
process.exit(failed ? 1 : 0);
