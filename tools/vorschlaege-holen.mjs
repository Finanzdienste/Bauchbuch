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
 * Mit NUR_ZAEHLEN=ja wird gar nichts geschrieben. Dann gibt es nur zwei
 * Zahlen aus: wie viele Zettel im Kasten liegen (anzahl) und wann der
 * neueste kam (zeitmarke). So läuft es, solange der Agent
 * abgeschaltet ist – das Repository ist öffentlich, und ohne Agenten gibt es
 * keinen Grund, den Wortlaut auch nur auf die Platte des Runners zu legen.
 *
 * Der Leseschlüssel steht nie in der Ausgabe. Er ist ein Secret, und alles,
 * was ein Programm ausgibt, landet irgendwann in einem Protokoll. Dasselbe
 * gilt für den Wortlaut: Die Protokolle eines öffentlichen Repositorys kann
 * jeder lesen.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, appendFileSync } from 'node:fs';
import { neueZettel, alsMarkdown, erledigtNachher, bestand } from './vorschlaege.mjs';

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

/*
 * Einmal nachfassen, wenn der neueste Zettel schon älter ist.
 *
 * Der Kasten speichert bei Cloudflare, und dort ist ein neuer Eintrag nicht
 * sofort an jedem Standort sichtbar – bis zu einer Minute kann es dauern.
 * Der Kasten stößt diesen Ablauf aber gleich nach dem Einwurf an, und der
 * Runner steht woanders als das Telefon. Liegt der neueste sichtbare Zettel
 * schon länger zurück, ist der gerade eingeworfene womöglich noch nicht
 * angekommen: dann einmal warten und noch einmal fragen. Bei einem Lauf von
 * Hand kostet das eine halbe Minute und sonst nichts.
 */
const NACHFASSEN_S = Number(process.env.NACHFASSEN_SEKUNDEN ?? 30);
const nurZaehlen = process.env.NUR_ZAEHLEN === 'ja';
if (nurZaehlen && NACHFASSEN_S > 0) {
  const { zeitmarke: z } = bestand(antwort);
  const alter = z ? Date.now() - Number(z) : Infinity;
  if (alter > 90 * 1000) {
    await new Promise((weiter) => { setTimeout(weiter, NACHFASSEN_S * 1000); });
    try {
      const nochmal = await fetch(ziel, { headers: { accept: 'application/json' } });
      if (nochmal.ok) antwort = await nochmal.json();
    } catch { /* dann gilt die erste Antwort */ }
  }
}

const erledigt = existsSync(LEDGER) ? JSON.parse(readFileSync(LEDGER, 'utf8')) : [];
const neu = neueZettel(antwort, erledigt);
const { anzahl, zeitmarke } = bestand(antwort);

if (neu.length && !nurZaehlen) {
  mkdirSync(ORDNER, { recursive: true });
  writeFileSync(EINGANG, alsMarkdown(neu));
  writeFileSync(LEDGER, `${JSON.stringify(erledigtNachher(erledigt, neu), null, 2)}\n`);
}

console.log(`${neu.length} neue${neu.length === 1 ? 'r Zettel' : ' Zettel'}, ${anzahl} im Kasten.`);
console.log(`neu=${neu.length}`);
if (process.env.GITHUB_OUTPUT) {
  appendFileSync(process.env.GITHUB_OUTPUT, `neu=${neu.length}\nanzahl=${anzahl}\nzeitmarke=${zeitmarke}\n`);
}
