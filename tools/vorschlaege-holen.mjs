/*
 * Die Vorschläge abholen – das einzige Stück, das ins Netz greift.
 *
 * Läuft in der GitHub-Action, nicht in der App. Die App selbst spricht mit
 * genau einer Adresse, und das prüft tools/pruefung/keine-leitung.py; damit
 * dieses Werkzeug dort nicht als zweiter Versandweg gilt, liegt es außerhalb
 * von js/ und bekommt die Adresse von außen gereicht statt sie einzubauen.
 *
 * Aufruf:
 *   BRIEFKASTEN=https://… LESESCHLUESSEL=… node tools/vorschlaege-holen.mjs
 *
 * Ergebnis:
 *   vorschlaege/eingang.md      der Entwurfstext (nur wenn es Neues gibt)
 *   vorschlaege/erledigt.json   die Kennungen, die schon angesehen wurden
 *   und auf der Standardausgabe die Zahl der neuen Zettel.
 *
 * Der Leseschlüssel steht nie in der Ausgabe. Er ist ein Secret, und alles,
 * was ein Programm ausgibt, landet irgendwann in einem Protokoll.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, appendFileSync } from 'node:fs';
import { neueZettel, alsMarkdown, erledigtNachher } from './vorschlaege.mjs';

const ORDNER = 'vorschlaege';
const LEDGER = `${ORDNER}/erledigt.json`;
const EINGANG = `${ORDNER}/eingang.md`;

const basis = process.env.BRIEFKASTEN;
const schluessel = process.env.LESESCHLUESSEL;

if (!basis || !schluessel) {
  // Kein Fehler mit Stapelspur: Das ist der erwartete Zustand, solange die
  // beiden Secrets nicht gesetzt sind, und ein roter Lauf dafür wäre Lärm.
  console.log('Kein Briefkasten eingerichtet (BRIEFKASTEN/LESESCHLUESSEL fehlen).');
  console.log('neu=0');
  process.exit(0);
}

const ziel = new URL('/alle.json', basis);
ziel.searchParams.set('schluessel', schluessel);

const abbruch = new AbortController();
const uhr = setTimeout(() => abbruch.abort(), 20000);
let antwort;
try {
  const a = await fetch(ziel, { signal: abbruch.signal, headers: { accept: 'application/json' } });
  if (!a.ok) {
    // Die Adresse steht hier absichtlich nicht mit im Text – sie trüge den
    // Schlüssel mit sich.
    console.error(`Der Briefkasten antwortet mit ${a.status}.`);
    process.exit(1);
  }
  antwort = await a.json();
} catch (e) {
  console.error(`Der Briefkasten war nicht zu erreichen: ${e.name}`);
  process.exit(1);
} finally {
  clearTimeout(uhr);
}

const erledigt = existsSync(LEDGER) ? JSON.parse(readFileSync(LEDGER, 'utf8')) : [];
const neu = neueZettel(antwort, erledigt);

mkdirSync(ORDNER, { recursive: true });
if (neu.length) {
  writeFileSync(EINGANG, alsMarkdown(neu));
  writeFileSync(LEDGER, `${JSON.stringify(erledigtNachher(erledigt, neu), null, 2)}\n`);
}

console.log(`${neu.length} neue${neu.length === 1 ? 'r Zettel' : ' Zettel'}.`);
console.log(`neu=${neu.length}`);
if (process.env.GITHUB_OUTPUT) {
  appendFileSync(process.env.GITHUB_OUTPUT, `neu=${neu.length}\n`);
}
