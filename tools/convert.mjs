// Budowa słownika „bezpiecznych słów dla dzieci” (1–13 lat):
//   (mowa do dzieci CHILDES Polish CDS ∪ słowa z ≥3 lektur szkoły podstawowej z Wolnych Lektur)
//   ∩ słownik scrabble (Windows-1250) − tools/blocklist.txt
// Wynik: public/words/NN.txt (UTF-8, jedno słowo na linię) + index.json.
// Użycie: node tools/convert.mjs <slownik.txt> <PolishCDS.xlsx>
import { readFileSync, writeFileSync, mkdirSync, readdirSync, unlinkSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inflateRawSync } from 'node:zlib';

const [dictPath, cdsPath] = process.argv.slice(2);
if (!dictPath || !cdsPath) {
  console.error('Użycie: node tools/convert.mjs <slownik.txt> <PolishCDS.xlsx>');
  process.exit(1);
}

const toolsDir = dirname(fileURLToPath(import.meta.url));
const outDir = join(toolsDir, '..', 'public', 'words');
const cacheDir = join(toolsDir, '.cache');
const MIN_LEN = 2, MAX_LEN = 15;
const CDS_MIN_COUNT = 2;   // forma musi paść w mowie do dzieci co najmniej 2 razy
const BOOKS_MIN = 3;       // forma musi wystąpić w co najmniej 3 różnych lekturach

// bez obcych liter v, q, x
const allowed = /^[a-pr-uwyząćęłńóśźż]+$/;
const lower = s => s.trim().toLocaleLowerCase('pl');
const readLines = f => readFileSync(f, 'utf8').split(/\r?\n/).map(l => l.trim()).filter(l => l && !l.startsWith('#'));

// --- 1. słownik scrabble ---
const dict = new Set();
for (const raw of new TextDecoder('windows-1250').decode(readFileSync(dictPath)).split(/\r?\n/)) {
  const w = lower(raw);
  if (allowed.test(w)) dict.add(w);
}
console.log(`Słownik scrabble: ${dict.size} form.`);

// --- 2. CHILDES Polish CDS (xlsx, arkusz „Occurances”: A = forma, B = liczba wystąpień) ---
function unzipEntry(buf, wanted) {
  let eocd = buf.length - 22;
  while (eocd >= 0 && buf.readUInt32LE(eocd) !== 0x06054b50) eocd--;
  if (eocd < 0) throw new Error('To nie jest plik xlsx/zip');
  let p = buf.readUInt32LE(eocd + 16);
  for (let i = buf.readUInt16LE(eocd + 10); i > 0; i--) {
    const nameLen = buf.readUInt16LE(p + 28);
    const name = buf.toString('utf8', p + 46, p + 46 + nameLen);
    if (name === wanted) {
      const method = buf.readUInt16LE(p + 10), size = buf.readUInt32LE(p + 20), off = buf.readUInt32LE(p + 42);
      const start = off + 30 + buf.readUInt16LE(off + 26) + buf.readUInt16LE(off + 28);
      const raw = buf.subarray(start, start + size);
      return (method === 8 ? inflateRawSync(raw) : raw).toString('utf8');
    }
    p += 46 + nameLen + buf.readUInt16LE(p + 30) + buf.readUInt16LE(p + 32);
  }
  throw new Error(`Brak ${wanted} w pliku xlsx`);
}
const xmlText = s => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');

const xlsx = readFileSync(cdsPath);
const shared = [...unzipEntry(xlsx, 'xl/sharedStrings.xml').matchAll(/<si>([\s\S]*?)<\/si>/g)]
  .map(m => xmlText([...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map(t => t[1]).join('')));
const cds = new Set();
let cdsRows = 0;
for (const row of unzipEntry(xlsx, 'xl/worksheets/sheet1.xml').matchAll(/<row [^>]*>([\s\S]*?)<\/row>/g)) {
  const a = row[1].match(/<c r="A\d+"[^>]*t="s"[^>]*><v>(\d+)<\/v>/);
  const b = row[1].match(/<c r="B\d+"[^>]*><v>([\d.E+-]+)<\/v>/);
  if (!a || !b) continue;
  cdsRows++;
  const w = lower(shared[+a[1]]);
  if (+b[1] >= CDS_MIN_COUNT && allowed.test(w)) cds.add(w);
}
console.log(`CHILDES CDS: ${cdsRows} form, z czego ${cds.size} poprawnych z ≥${CDS_MIN_COUNT} wystąpieniami.`);

// --- 3. lektury szkoły podstawowej z Wolnych Lektur (cache w tools/.cache) ---
mkdirSync(cacheDir, { recursive: true });
async function getJson(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`);
  return r.json();
}
async function bookText(slug) {
  const cached = join(cacheDir, slug + '.txt');
  if (existsSync(cached)) return readFileSync(cached, 'utf8');
  const parts = [];
  const walk = async href => {
    const b = await getJson(href);
    if (b.txt) {
      const r = await fetch(b.txt);
      if (!r.ok) throw new Error(`${b.txt}: HTTP ${r.status}`);
      parts.push((await r.text()).split(/\r?\n-----\r?\n/)[0]); // bez stopki licencyjnej
    }
    for (const c of b.children || []) await walk(c.href);
  };
  await walk(`https://wolnelektury.pl/api/books/${slug}/`);
  const text = parts.join('\n');
  writeFileSync(cached, text, 'utf8');
  return text;
}

const slugs = readLines(join(toolsDir, 'lektury.txt'));
const bookCount = new Map();
for (const slug of slugs) {
  const text = await bookText(slug);
  const forms = new Set((lower(text).match(/[a-ząćęłńóśźżvqx]+/g) || []).filter(w => allowed.test(w)));
  for (const w of forms) bookCount.set(w, (bookCount.get(w) || 0) + 1);
}
const books = new Set([...bookCount].filter(([, n]) => n >= BOOKS_MIN).map(([w]) => w));
console.log(`Lektury: ${slugs.length} tytułów, ${bookCount.size} form, z czego ${books.size} w ≥${BOOKS_MIN} tytułach.`);

// --- 4. połączenie, filtr słownikiem i blocklistą ---
const blocklist = readLines(join(toolsDir, 'blocklist.txt')).map(p => new RegExp(p, 'u'));
const candidates = new Set([...cds, ...books]);
let notInDict = 0;
const blocked = [];
const byLen = new Map();
for (let n = MIN_LEN; n <= MAX_LEN; n++) byLen.set(n, []);
for (const w of candidates) {
  if (!dict.has(w)) { notInDict++; continue; }
  if (blocklist.some(re => re.test(w))) { blocked.push(w); continue; }
  const len = [...w].length;
  if (byLen.has(len)) byLen.get(len).push(w);
}
console.log(`Kandydaci: ${candidates.size}; spoza słownika scrabble: ${notInDict}; zablokowane: ${blocked.length}.`);

// --- 5. zapis ---
mkdirSync(outDir, { recursive: true });
for (const f of readdirSync(outDir)) if (/^\d+\.txt$|^index\.json$/.test(f)) unlinkSync(join(outDir, f));
const index = { total: 0, lengths: {} };
for (const [len, words] of byLen) {
  words.sort((a, b) => a.localeCompare(b, 'pl'));
  writeFileSync(join(outDir, String(len).padStart(2, '0') + '.txt'), words.length ? words.join('\n') + '\n' : '', 'utf8');
  index.lengths[len] = words.length;
  index.total += words.length;
}
writeFileSync(join(outDir, 'index.json'), JSON.stringify(index, null, 1) + '\n', 'utf8');
writeFileSync(join(cacheDir, 'blocked.txt'), blocked.sort((a, b) => a.localeCompare(b, 'pl')).join('\n') + '\n', 'utf8');
console.log(`Zapisano ${index.total} słów:`, index.lengths);
