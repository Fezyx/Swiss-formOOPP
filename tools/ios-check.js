/* Kontrola detekce iOS a chování exportů na iPhonu / iPadu.
 *
 * Prohlížeč není potřeba: funkce se vytáhnou přímo z index.html a spustí se
 * s podvrženým navigator.userAgent. Ověřuje se:
 *  1) isIOSDevice() — iPhone, iPad i iPadOS (ten se hlásí jako Mac),
 *  2) isIOSShell() — podle přítomnosti mostu window.OOPPiOS,
 *  3) exportFolderName() — „Soubory“ na iOS, „Stahování“ jinde,
 *  4) verze aplikace v index.html a název cache v sw.js jsou stejné.
 *
 * Spuštění:  node tools/ios-check.js
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

let failed = 0;
function check(name, ok, detail) {
  console.log((ok ? '  OK   ' : '  CHYBA') + '  ' + name + (detail ? ' — ' + detail : ''));
  if (!ok) failed++;
}

// Vytáhne celou funkci z index.html (počítáním složených závorek).
function extractFn(name) {
  const start = html.indexOf('function ' + name + '(');
  if (start < 0) throw new Error('funkce ' + name + ' není v index.html');
  let depth = 0;
  let i = html.indexOf('{', start);
  for (; i < html.length; i++) {
    if (html[i] === '{') depth++;
    else if (html[i] === '}') { depth--; if (depth === 0) { i++; break; } }
  }
  return html.slice(start, i);
}

const code = ['isIOSShell', 'isIOSDevice', 'exportFolderName'].map(extractFn).join('\n');

function make(ua, touchPoints, bridge) {
  const win = {};
  if (bridge) win.OOPPiOS = { saveFile: function () {} };
  const nav = { userAgent: ua, maxTouchPoints: touchPoints };
  const factory = new Function('window', 'navigator',
    code + '\nreturn {isIOSDevice: isIOSDevice, isIOSShell: isIOSShell, exportFolderName: exportFolderName};');
  return factory(win, nav);
}

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const IPAD = 'Mozilla/5.0 (iPad; CPU OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1';
const IPADOS = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15';
const MAC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36';
const WINDOWS = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

// [popis, user-agent, maxTouchPoints, most OOPPiOS, očekávané isIOSDevice]
const CASES = [
  ['iPhone (Safari)', IPHONE, 5, false, true],
  ['iPad (Safari)', IPAD, 5, false, true],
  ['iPadOS hlásící se jako Mac', IPADOS, 5, false, true],
  ['Mac s Chrome (bez dotyku)', MAC, 0, false, false],
  ['Android (Chrome)', ANDROID, 5, false, false],
  ['Windows (Chrome)', WINDOWS, 0, false, false],
  ['iPhone v nativním obalu', IPHONE, 5, true, true],
  ['Windows v nativním obalu', WINDOWS, 0, true, false]
];

console.log('Detekce iOS (index.html):');
let desktopFolder = null;
CASES.forEach(function (c) {
  const lib = make(c[1], c[2], c[3]);
  const isDev = lib.isIOSDevice();
  const isShell = lib.isIOSShell();
  const folder = lib.exportFolderName();
  const wantIOS = c[3] || c[4];
  if (desktopFolder === null && !wantIOS) desktopFolder = folder;
  const ok = isDev === c[4] && isShell === c[3] &&
    (folder === 'Soubory') === wantIOS && (wantIOS || folder === desktopFolder);
  check(c[0], ok, 'isIOSDevice=' + isDev + ', isIOSShell=' + isShell +
    ', exportFolderName=' + folder);
});

console.log('Synchronizace verze:');
const verM = html.match(/const APP_VERSION = '([^']+)';/);
const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
const cacheM = sw.match(/const CACHE = 'oopp-app-([^']+)';/);
const serverM = html.match(/server === 'oopp-app-' \+ APP_VERSION/);
check('APP_VERSION v index.html', !!verM, verM ? verM[1] : 'chybí');
check('CACHE v sw.js odpovídá APP_VERSION',
  !!verM && !!cacheM && verM[1] === cacheM[1],
  'index ' + (verM ? verM[1] : '?') + ' / sw ' + (cacheM ? cacheM[1] : '?'));
check('index.html porovnává název cache s APP_VERSION', !!serverM);

console.log(failed ? 'VÝSLEDEK: ' + failed + ' chyb' : 'VÝSLEDEK: vše v pořádku');
process.exit(failed ? 1 : 0);
