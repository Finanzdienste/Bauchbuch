/*
 * Bescheid geben, dass im Briefkasten etwas liegt – ohne zu sagen, was.
 *
 * Läuft in der GitHub-Action, solange der Agent abgeschaltet ist. Dieses
 * Werkzeug bekommt aus dem Schritt davor genau zwei Angaben: wie viele Zettel
 * im Kasten liegen und wann der neueste kam. Den Leseschlüssel
 * hat es nicht, den Kasten fragt es nicht, und eine Datei mit Wortlaut liest
 * es nicht. Was es nicht hat, kann es nicht in ein öffentliches Repository
 * schreiben – das ist die ganze Absicherung, und sie hängt nicht an Sorgfalt.
 *
 * Aufruf (in der Action):
 *   GH_TOKEN=… REPO=besitzer/name BESITZER=besitzer ANZAHL=3 ZEITMARKE=… \
 *     node tools/vorschlaege-melden.mjs
 *
 * Was es tut:
 *   * Es gibt ein offenes Issue als Sammelstelle (erkannt an einer Marke im
 *     Text). Fehlt es, wird es angelegt, dem Besitzer zugewiesen – das ist
 *     schon die Benachrichtigung – und gesperrt.
 *   * Ist der neueste Zettel nicht später als das zuletzt Gemeldete: nichts.
 *   * Sonst ein Kommentar mit @-Nennung (daran hängt GitHub die Nachricht
 *     aufs Handy und ins Postfach), danach die Marke im Issue-Text erneuern.
 *     In dieser Reihenfolge: Scheitert das Erneuern, kommt beim nächsten Lauf
 *     eine Meldung doppelt. Andersherum ginge eine verloren.
 */
import { KASTEN } from '../js/briefkasten.js';
import {
  SAMMELSTELLE, gemeldetBis, meldungText, mitMarke, sammelstelleText,
} from './vorschlaege.mjs';

const { GH_TOKEN, REPO, BESITZER } = process.env;
// GitHub Actions setzt GITHUB_API_URL selbst; der Test stellt hier einen
// eigenen kleinen Server hin.
const API = (process.env.GITHUB_API_URL || 'https://api.github.com').replace(/\/+$/, '');
const anzahl = Number(process.env.ANZAHL || 0);
const zeitmarke = String(process.env.ZEITMARKE || '');
const lesen = new URL('/lesen', KASTEN).href;

if (!anzahl || !zeitmarke) {
  console.log('Der Kasten ist leer – nichts zu melden.');
  process.exit(0);
}
if (!GH_TOKEN || !REPO || !BESITZER) {
  console.error('GH_TOKEN, REPO und BESITZER müssen gesetzt sein.');
  process.exit(1);
}

const api = async (weg, { method = 'GET', body } = {}) => {
  const a = await fetch(`${API}/repos/${REPO}${weg}`, {
    method,
    headers: {
      authorization: `Bearer ${GH_TOKEN}`,
      accept: 'application/vnd.github+json',
      'x-github-api-version': '2022-11-28',
      'user-agent': 'bauchbuch-vorschlaege',
      ...(body ? { 'content-type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!a.ok) {
    // Nur Status und Weg – die Antwort könnte Text enthalten, der hier nicht
    // ins öffentliche Protokoll gehört.
    throw new Error(`GitHub antwortet auf ${method} ${weg} mit ${a.status}`);
  }
  return a.status === 204 ? null : a.json();
};

/** Eine neue Sammelstelle anlegen – das Zuweisen ist schon die Meldung. */
async function anlegen() {
  const neu = await api('/issues', {
    method: 'POST',
    body: {
      title: 'Neue Ideen im Briefkasten',
      body: mitMarke(sammelstelleText({ anzahl, lesen, besitzer: BESITZER }), zeitmarke),
      assignees: [BESITZER],
    },
  });
  /*
   * Sperren, damit dort nur noch Mitwirkende schreiben. Das Issue steht in
   * einem öffentlichen Repository, und ein Fremder könnte sonst einen
   * nachgebauten „Lesen"-Link danebensetzen, der nach dem Schlüssel fragt.
   * Gelingt das Sperren nicht, ist die Meldung trotzdem draußen.
   */
  try {
    await api(`/issues/${neu.number}/lock`, { method: 'PUT', body: { lock_reason: 'resolved' } });
  } catch (e) {
    console.log(`Sperren ging nicht (${e.message}) – die Meldung ist trotzdem draußen.`);
  }
  console.log(`Sammelstelle angelegt: #${neu.number}`);
}

try {
  /*
   * Bis wann schon gemeldet wurde, steht in den Sammelstellen selbst – auch
   * in geschlossenen. Sonst legte ein Lauf von Hand nach dem Schließen eine
   * neue an und meldete „neue Idee", obwohl nichts Neues gekommen ist.
   */
  const alle = (await api('/issues?state=all&per_page=50&sort=created&direction=desc&creator=github-actions%5Bbot%5D') || [])
    .filter((i) => !i.pull_request && String(i.body || '').includes(SAMMELSTELLE));
  const bis = alle.map((i) => gemeldetBis(i.body)).sort().pop() || '';
  const stelle = alle.find((i) => i.state === 'open');

  if (bis && zeitmarke <= bis) {
    console.log('Dieser Stand ist schon gemeldet.');
  } else if (!stelle) {
    await anlegen();
  } else {
    try {
      await api(`/issues/${stelle.number}/comments`, {
        method: 'POST',
        body: { body: meldungText({ anzahl, lesen, besitzer: BESITZER, zeitmarke }) },
      });
    } catch (e) {
      // Ein gesperrtes Issue, das auch der Ablauf nicht mehr kommentieren
      // darf: dann eben eine neue Sammelstelle. Die Meldung muss raus.
      console.log(`Kommentieren ging nicht (${e.message}) – lege eine neue Sammelstelle an.`);
      await anlegen();
      process.exit(0);
    }
    await api(`/issues/${stelle.number}`, {
      method: 'PATCH',
      body: { body: mitMarke(stelle.body, zeitmarke) },
    });
    console.log(`An #${stelle.number} gemeldet: ${anzahl} im Kasten.`);
  }
} catch (e) {
  console.error(`Melden ging nicht: ${e.message}`);
  process.exit(1);
}
