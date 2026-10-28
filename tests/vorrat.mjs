/*
 * Werkzeug für die Tests rund um neue Fassungen.
 *
 * Kein Test, sondern das, was test-nachschub.mjs und test-auffrischen.mjs
 * gemeinsam brauchen: eine veränderbare Kopie der App, einen Server, der sich
 * wie GitHub Pages verhält, und die Handgriffe, mit denen ein Mensch eine App
 * auf dem Startbildschirm verlässt und wieder öffnet.
 *
 * Die Kopie entsteht aus der Liste SHELL in sw.js, nicht aus einer Handliste.
 * Fehlt eine dort genannte Datei, ist das ein Fehler – genau wie in Betrieb,
 * wo die Installation dann scheitert.
 */
import { createServer } from 'node:http';
import { cpSync, mkdtempSync, readFileSync, writeFileSync, statSync, existsSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { ROOT } from './umgebung.mjs';

/** Die Einträge von SHELL in sw.js, ohne './'. */
export function shellListe(wurzel = ROOT) {
  const sw = readFileSync(path.join(wurzel, 'sw.js'), 'utf8');
  const block = /const SHELL = \[([\s\S]*?)\];/.exec(sw);
  if (!block) throw new Error('SHELL in sw.js nicht gefunden');
  // So wertet auch der Browser die Liste aus – nicht per Muster.
  // eslint-disable-next-line no-new-func
  const liste = new Function(`return [${block[1]}];`)();
  return liste.map((p) => p.replace(/^\.\//, '')).filter(Boolean);
}

/** Eine frische Kopie der App in einem Temp-Ordner. */
export function appKopie(name = 'kopie') {
  const ordner = mkdtempSync(path.join(tmpdir(), `bauchbuch-${name}-`));
  const dateien = [...new Set([...shellListe(), 'sw.js', 'index.html'])];
  for (const rel of dateien) {
    const von = path.join(ROOT, rel);
    if (!existsSync(von)) throw new Error(`SHELL nennt ${rel}, die Datei fehlt`);
    mkdirSync(path.dirname(path.join(ordner, rel)), { recursive: true });
    cpSync(von, path.join(ordner, rel));
  }
  return ordner;
}

/** Den Fingerabdruck in der Kopie neu eintragen – wie es der Bau tut. */
export function standNeu(ordner) {
  return execFileSync('python3', [path.join(ROOT, 'tools/build-single.py'), '--nur-stand', ordner],
    { encoding: 'utf8' }).trim();
}

/** In einer Datei der Kopie etwas ersetzen; wirft, wenn es nicht vorkommt. */
export function aendern(ordner, rel, alt, neu) {
  const datei = path.join(ordner, rel);
  const vorher = readFileSync(datei, 'utf8');
  if (!vorher.includes(alt)) throw new Error(`${rel}: „${alt}" nicht gefunden`);
  writeFileSync(datei, vorher.replace(alt, neu));
}

const TYPEN = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
};

/**
 * Ein Server über der Kopie, mit max-age=600 wie GitHub Pages.
 *
 * `eingriff(rel, inhalt)` darf eine Antwort verändern oder mit
 * `{ status }` ersetzen – für Tests, in denen eine Datei fehlt oder sich
 * bei jedem Abruf ändert. `abrufe` zählt, wie oft welche Datei geholt wurde.
 */
export async function kopieServer(ordner, port, { maxAge = 600, eingriff = null } = {}) {
  const abrufe = new Map();
  const server = createServer((req, res) => {
    let rel = decodeURIComponent(req.url.split(/[?#]/)[0]).replace(/^\/+/, '');
    if (rel === '' || rel.endsWith('/')) rel += 'index.html';
    abrufe.set(rel, (abrufe.get(rel) || 0) + 1);
    const datei = path.join(ordner, path.normalize(rel).replace(/^(\.\.[/\\])+/, ''));
    let inhalt;
    try {
      statSync(datei);
      inhalt = readFileSync(datei);
    } catch {
      res.writeHead(404).end('nicht da');
      return;
    }
    if (eingriff) {
      const anders = eingriff(rel, inhalt);
      if (anders && anders.status) { res.writeHead(anders.status).end('absichtlich'); return; }
      if (anders !== undefined && anders !== null) inhalt = Buffer.from(anders);
    }
    res.writeHead(200, {
      'content-type': TYPEN[path.extname(datei)] || 'application/octet-stream',
      'content-length': inhalt.length,
      'cache-control': `max-age=${maxAge}`,
    });
    res.end(inhalt);
  });
  await new Promise((ok) => server.listen(port, '127.0.0.1', ok));
  return {
    server,
    abrufe,
    adresse: `http://127.0.0.1:${port}/index.html`,
    zu: () => new Promise((ok) => server.close(ok)),
  };
}

/**
 * Die App verlassen oder zurückkommen, wie auf dem iPhone.
 *
 * Headless-Chromium hält eine Seite immer für sichtbar; ein zweiter Tab
 * ändert daran nichts. Also wird der Zustand gesetzt und das Ereignis
 * ausgelöst, so wie es der Browser beim Wechsel täte. Nach einem Neuladen ist
 * die Überschreibung weg und die Seite wieder ehrlich sichtbar.
 */
export async function sichtbarkeit(page, zustand) {
  await page.evaluate((z) => {
    Object.defineProperty(document, 'visibilityState', { value: z, configurable: true });
    Object.defineProperty(document, 'hidden', { value: z === 'hidden', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
  }, zustand);
}

/** Verlassen und wiederkommen. */
export async function zurueckkommen(page) {
  await sichtbarkeit(page, 'hidden');
  await sichtbarkeit(page, 'visible');
}

/**
 * Etwas in der Seite fragen, auch wenn sie gerade neu lädt.
 *
 * Ein evaluate während eines Neuladens wirft „Execution context was
 * destroyed". Das ist hier kein Fehler, sondern oft genau das Ereignis, auf
 * das der Test wartet – also nach einer kurzen Pause noch einmal.
 */
export async function frage(page, fn, arg) {
  for (let n = 0; n < 50; n++) {
    try {
      // eslint-disable-next-line no-await-in-loop
      return await page.evaluate(fn, arg);
    } catch (e) {
      if (!/context|navigat|Target closed/i.test(String(e && e.message))) throw e;
      // eslint-disable-next-line no-await-in-loop
      await page.waitForTimeout(200);
    }
  }
  throw new Error('die Seite kam nicht zur Ruhe');
}

/** Warten, bis eine Bedingung in der Seite stimmt. Gibt true/false zurück. */
export async function warteBis(page, fn, arg, ms = 30000) {
  const ende = Date.now() + ms;
  while (Date.now() < ende) {
    // eslint-disable-next-line no-await-in-loop
    if (await frage(page, fn, arg).catch(() => false)) return true;
    // eslint-disable-next-line no-await-in-loop
    await page.waitForTimeout(250);
  }
  return false;
}
