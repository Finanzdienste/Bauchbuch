/*
 * „Was Sache ist" – und wann eben nicht
 *
 * Die Zusammenfassung ganz oben ist die gefährlichste Karte der App. Sie ist
 * die einzige, die jemand mit Sicherheit liest, sie steht ohne Fallzahlen da,
 * und sie ist die einzige Stelle, an der ein Satz entstehen könnte, den keine
 * Rechnung deckt.
 *
 * Deshalb prüft diese Datei vor allem Verbote:
 *
 *   1. Was oben steht, steht unten. Kein Fund im ersten Absatz, der nicht in
 *      der Auswertung mit seinen Zahlen wiederkommt.
 *   2. Ein Scheinbefund kommt nicht nach oben. Was die Störfaktorenprüfung
 *      nicht übersteht, gehört in die Erklärung darunter, nicht in die
 *      Zusammenfassung.
 *   3. Ohne Grundlage kein beruhigender Satz. „Alles unauffällig" wäre die
 *      bequemste Lüge dieser App.
 *   4. Warnzeichen zuerst, immer.
 *   5. Höchstens fünf Sätze. Der sechste verdrängt einen, der gelesen worden
 *      wäre.
 */
import { chromium } from 'playwright';
import { URL, KEY, HANDY, SHOT, pruefer, vorTagen } from './umgebung.mjs';
import { wasSacheIst } from '../js/lage.js';
import { arztBericht } from '../js/bericht.js';

const { check, ende } = pruefer();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: HANDY });
const fehler = [];
page.on('pageerror', (e) => fehler.push(`PAGEERROR: ${e.message}`));

await page.goto(URL, { waitUntil: 'networkidle' });

const zeigen = async (zustand) => {
  await page.evaluate(([k, z]) => localStorage.setItem(k, JSON.stringify(z)), [KEY, {
    begruesst: true, tab: 'muster', ...zustand,
  }]);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  return {
    lage: (await page.locator('.karte-lage').textContent()).replace(/\s+/g, ' '),
    alles: (await page.locator('#view').textContent()).replace(/\s+/g, ' '),
    saetze: await page.locator('.lage-satz').count(),
  };
};

/* ---------- 1. Ein echter Fund steht oben – und unten ---------- */

/*
 * Kaffee wirkt hier wirklich, unabhängig von Anspannung und Schlaf. Er muss
 * es also in den ersten Absatz schaffen; und derselbe Auslöser muss weiter
 * unten mit seinen Fallzahlen wiederauftauchen.
 */
const echt = { eintraege: [], tage: {} };
for (let i = 1; i <= 90; i++) {
  const am = vorTagen(i);
  const angespannt = i % 2 === 0;
  echt.tage[am] = { notiert: true, stress: angespannt ? 4 : 0, schlaf: angespannt ? 4 : 0 };
  const mitKaffee = i % 3 !== 0;
  echt.eintraege.push({
    id: `m${i}`, am, um: '08:00', art: 'essen', was: 'Frühstück', portion: 'normal',
    zutaten: mitKaffee ? [{ id: 'kaffee', rolle: 'haupt' }] : [{ id: 'obst', rolle: 'haupt' }],
  });
  const staerke = 1 + (angespannt ? 2 : 0) + (mitKaffee ? 4 : 0);
  echt.eintraege.push({
    id: `b${i}`, am, um: '10:00', art: 'beschwerde', staerke, arten: ['brennen'],
  });
}

const a = await zeigen(echt);
check(a.lage.includes('Was Sache ist'), 'die Karte steht ganz oben auf dem Reiter');
check(a.lage.includes('Kaffee'), 'der stärkste haltbare Fund steht im ersten Absatz');
check(
  a.lage.includes('gleicher Anspannung'),
  'mit dem Hinweis, dass er die Störfaktorenprüfung überstanden hat',
);
check(a.saetze >= 2 && a.saetze <= 5, `zwischen zwei und fünf Sätze (${a.saetze})`);
// Zehntel mit Komma wie in der übrigen Anzeige (bis zur Fassung 30 mit Punkt).
check(/im Mittel um \d+,\d Stufen schlechter/.test(a.lage) && /\d+,\d im Mittel über die letzten/.test(a.lage)
  && !/\d\.\d/.test(a.lage),
`Fund und Verlauf mit Komma, nicht mit Punkt (${(a.lage.match(/\d+[.,]\d[^.]{0,30}/g) || []).join(' | ')})`);

/*
 * Und die Regel, an der sich das Ganze messen lässt: Was oben steht, steht
 * unten mit seinen Zahlen. Der Auslöser muss also auch in der Fundliste
 * vorkommen, samt Fallzahlen.
 */
const untenTeil = a.alles.split('Was Sache ist')[1] || '';
check(
  untenTeil.includes('Kaffee') && /\d+ Mahlzeiten damit/.test(untenTeil),
  'und weiter unten steht derselbe Fund mit seinen Fallzahlen',
);

/* ---------- 2. Ein Scheinbefund kommt nicht nach oben ---------- */

/*
 * Jetzt dasselbe Tagebuch, aber der Kaffee wirkt nicht: Er fällt nur mit dem
 * Stress zusammen. Unten muss er vorkommen – mit der Erklärung, dass der
 * Unterschied unter gleichen Umständen verschwindet. Oben darf er nicht
 * stehen, denn dort steht kein Grund dabei.
 */
const schein = { eintraege: [], tage: {} };
for (let i = 1; i <= 90; i++) {
  const am = vorTagen(i);
  const angespannt = i % 2 === 0;
  schein.tage[am] = { notiert: true, stress: angespannt ? 4 : 0, schlaf: angespannt ? 4 : 0 };
  const mitKaffee = angespannt ? i % 8 !== 0 : i % 6 === 1;
  schein.eintraege.push({
    id: `m${i}`, am, um: '08:00', art: 'essen', was: 'Frühstück', portion: 'normal',
    zutaten: mitKaffee ? [{ id: 'kaffee', rolle: 'haupt' }] : [{ id: 'obst', rolle: 'haupt' }],
  });
  schein.eintraege.push({
    id: `b${i}`, am, um: '10:00', art: 'beschwerde',
    staerke: 1 + (angespannt ? 4 : 0), arten: ['brennen'],
  });
}

const b = await zeigen(schein);
check(
  !b.lage.includes('Am deutlichsten fällt Kaffee auf'),
  'ein Scheinbefund steht nicht in der Zusammenfassung',
);
check(
  (b.alles.split('Was Sache ist')[1] || '').includes('verschwindet'),
  'sondern unten, mit dem Urteil der Störfaktorenprüfung',
);

/* ---------- 3. Ohne Grundlage kein beruhigender Satz ---------- */

const duenn = {
  eintraege: [
    {
      id: 'm1', am: vorTagen(2), um: '12:00', art: 'essen', was: 'Suppe',
      zutaten: [{ id: 'kaffee', rolle: 'haupt' }],
    },
    { id: 'b1', am: vorTagen(2), um: '14:00', art: 'beschwerde', staerke: 8, arten: ['brennen'] },
  ],
  tage: { [vorTagen(2)]: { notiert: true } },
};
const c = await zeigen(duenn);
check(
  !/unauffällig|alles in Ordnung|kein Zusammenhang/i.test(c.lage),
  'bei zwei Eintragungen keine Entwarnung',
);
check(
  /noch nichts|noch nicht/i.test(c.lage),
  'sondern der Satz, dass es dafür noch nicht reicht',
);
check(
  c.lage.includes('heißt nicht, dass nichts da ist'),
  'und ausdrücklich: zu wenig heißt nicht unauffällig',
);

/* ---------- 4. Warnzeichen zuerst ---------- */

const warn = {
  eintraege: [
    ...duenn.eintraege,
    {
      id: 'w1', am: vorTagen(1), um: '09:00', art: 'beschwerde', staerke: 7,
      arten: ['krampf'], warnzeichen: ['blutstuhl'],
    },
  ],
  tage: { ...duenn.tage, [vorTagen(1)]: { notiert: true } },
};
const dd = await zeigen(warn);
const ersterSatz = await page.locator('.lage-satz').first().textContent();
check(
  /abgeklärt/.test(ersterSatz),
  `das Warnzeichen steht im ersten Satz (${ersterSatz.slice(0, 60)}…)`,
);
check(
  await page.locator('.lage-satz.l-warnung').count() > 0,
  'und ist als Warnung ausgezeichnet, nicht als Fund unter anderen',
);
check(!/Diagnose/i.test(dd.lage.split('.')[0]), 'ohne im ersten Satz eine Diagnose zu stellen');
check(ersterSatz.includes('zeitnah ärztlich abgeklärt') && !/nächsten Termin|bald/.test(ersterSatz),
  'ein Zeichen der Stufe „zeitnah": zeitnah abklären, nicht erst beim nächsten Termin');

/*
 * Ein Zeichen der Stufe „sofort" (js/bild.js) bekommt oben denselben Satz wie
 * auf der Warnkarte: nicht auf einen Termin warten – Notaufnahme oder 112.
 * Früher stand hier „bald … der Grund, einen Termin zu machen", also genau die
 * Handlung der Stufe „zeitnah" – eine Entwarnung, wo die Quellen Eile
 * verlangen (Belege in js/lage.js).
 */
const warnSatz = (warnungen) => wasSacheIst({ warnungen }).saetze.find((x) => x.art === 'warnung').text;
const SOFORT = { name: 'Schwarzer, klebriger Stuhl', dringlichkeit: 'sofort' };
const ZEITNAH = { name: 'Fieber dazu', dringlichkeit: 'zeitnah' };
const nurSofort = warnSatz([SOFORT]);
check(nurSofort.includes('nicht auf einen Termin warten') && nurSofort.includes('Notaufnahme oder 112'),
  `„sofort": nicht auf einen Termin warten, Notaufnahme oder 112 (${nurSofort.slice(0, 70)}…)`);
check(!/\bbald\b|Termin zu machen|nächsten Termin/.test(nurSofort), '„sofort": kein „bald", kein Termin als Ziel');
check(nurSofort.includes('Schwarzer, klebriger Stuhl'), 'der Name steht, wie er im Bogen steht – nicht klein geschrieben');
const gemischt = warnSatz([SOFORT, ZEITNAH]);
check(gemischt.split('Notaufnahme oder 112')[0].includes('Schwarzer, klebriger Stuhl')
  && !gemischt.split('Notaufnahme oder 112')[0].includes('Fieber dazu')
  && /Zeitnah abzuklären ist außerdem: Fieber dazu\./.test(gemischt),
`„sofort" und „zeitnah" zusammen: jedes Zeichen bei seiner Stufe (${gemischt})`);
const nurZeitnah = warnSatz([ZEITNAH]);
check(nurZeitnah.includes('zeitnah ärztlich abgeklärt') && !nurZeitnah.includes('112'),
  '„zeitnah" allein: zeitnah abklären, ohne 112');

/*
 * Der Zeitabstand nach dem Essen ergibt keinen Ort. Früher stand oben „so spät
 * entsteht Beschwerde im Dickdarm, nicht im Magen" und „das deutet auf Magen
 * und Speiseröhre als Ort" – die Quellen widersprechen einer festen
 * Zuordnung (Kopf von js/zeitprofil.js).
 */
const ORT = /Magen|Speiseröhre|Dünndarm|Dickdarm|Galle|als Ort|deutet auf|entsteht Beschwerde/;
const zeitSaetze = wasSacheIst({
  spaet: [{ name: 'Zwiebeln', fensterName: '4–8 Stunden danach', ort: 'Dickdarm' }],
  zeit: { pruefbar: true, schwerpunkt: 'frueh', teile: [{ id: 'frueh', name: '0–2 Stunden danach', ort: 'Magen und Speiseröhre' }] },
}).saetze.filter((x) => x.art === 'spaet' || x.art === 'zeit').map((x) => x.text);
check(zeitSaetze.length === 2 && zeitSaetze.every((t) => !ORT.test(t)),
  `der späte Auslöser und der zeitliche Schwerpunkt: nur die Stunden, kein Ort – auch wenn ein Aufrufer einen mitgibt (${zeitSaetze.join(' / ')})`);
check(zeitSaetze[0].includes('4–8 Stunden danach') && zeitSaetze[1].includes('0–2 Stunden danach')
  && zeitSaetze[1].includes('Woher eine Beschwerde kommt, lässt sich am Zeitpunkt allein nicht ablesen.'),
'mit den Stunden, groß geschrieben, und dem Satz, dass der Zeitpunkt den Ort nicht hergibt');

/*
 * Methylphenidat mit zweierlei Kügelchen und ein Mittel gegen Magensäure: Die
 * Gegenanzeige steht nur in der Fachinformation von Medikinet retard und
 * Medikinet adult, und sie nennt H2-Blocker, Protonenpumpenhemmer und
 * Antazida. Ritalin LA hat ebenfalls zweierlei Kügelchen und keine solche
 * Gegenanzeige – der Satz nennt deshalb die beiden Namen.
 */
const w1 = wasSacheIst({ paare: [{ id: 'W1' }] }).saetze.find((x) => x.art === 'paar').text;
check(w1.includes('(Medikinet retard, Medikinet adult)') && w1.includes('H2-Blockern, Protonenpumpenhemmern oder Antazida')
  && w1.includes('unter den Gegenanzeigen') && w1.includes('ohne etwas eigenmächtig wegzulassen'),
`W1 oben: welche Kapseln, welche Gruppen, und nichts eigenmächtig weglassen (${w1.slice(0, 60)}…)`);

/* ---------- 5. Und im Bericht, ganz oben ---------- */

const zettel = await page.evaluate(async ([e, t]) => {
  const bb = await import('./js/bericht.js');
  const alle = Object.keys(t).sort();
  return bb.arztBericht({ eintraege: e, tage: t }, alle[0], alle[alle.length - 1]);
}, [echt.eintraege, echt.tage]);

const kopf = zettel.split('\n').slice(0, 14).join(' ');
check(zettel.includes('IN KÜRZE'), 'der Bericht führt die Zusammenfassung');
check(kopf.includes('IN KÜRZE'), 'und zwar oben, nicht am Ende');
check(
  zettel.indexOf('IN KÜRZE') < zettel.indexOf('ÜBERSICHT'),
  'vor den Zahlen, die sie zusammenfasst',
);
check(
  (zettel.split('IN KÜRZE')[1] || '').split('ÜBERSICHT')[0].includes('Kaffee'),
  'mit dem Fund, um den es geht',
);
check(
  zettel.includes('dort stehen die Fallzahlen'),
  'und dem Verweis darauf, wo die Zahlen dazu stehen',
);

/* ---------- 6. Unveränderte Bauchwerte: nur bei Magenmitteln (B4) ---------- */

/*
 * „Die Bauchwerte waren ähnlich wie davor" ist für einen Säureblocker eine
 * Auskunft für die Sprechstunde. Für ein ADHS-Mittel, ein Schmerzmittel oder
 * ein Triptan wäre es ein Urteil über etwas, das niemand wegen des Bauchs
 * nimmt. Geprüft zweimal: an der Zusammenfassung selbst – auch wenn ein
 * Aufrufer ein Urteil mitgäbe – und am ganzen Bericht.
 */
const UNVERAENDERT = 'Bauchwerte ähnlich wie in der Zeit davor';
const nichts = (q) => wasSacheIst(q).saetze.some((x) => x.text.includes(UNVERAENDERT)
  || x.text.includes('nichts geändert'));
check(nichts({ mittel: [{ name: 'Pantoprazol', gruppe: 'ppi', urteil: 'unveraendert' }] }),
  'ein Säureblocker ohne Änderung steht oben');
const ppiSatz = wasSacheIst({ mittel: [{ name: 'Pantoprazol', gruppe: 'ppi', urteil: 'unveraendert' }] })
  .saetze.find((x) => x.art === 'mittel').text;
check(!/nichts geändert|selbst ein Befund|gegen die Säure/.test(ppiSatz) && /kein Grund, selbst etwas abzusetzen/.test(ppiSatz),
  `ohne Urteil über die Ursache und ohne Rat zum Absetzen (${ppiSatz.slice(0, 60)}…)`);
check(!nichts({ mittel: [{ name: 'Concerta', gruppe: 'mph', urteil: 'unveraendert' }] })
  && !nichts({ mittel: [{ name: 'Strattera', gruppe: 'atomox', urteil: 'unveraendert' }] }),
'ein ADHS-Mittel nie – auch nicht mit einem Urteil von außen');
check(!nichts({ mittel: [{ name: 'Ibuprofen', gruppe: 'nsar', urteil: 'unveraendert' }] })
  && !nichts({ mittel: [{ name: 'Sumatriptan', gruppe: 'triptan', urteil: 'unveraendert' }] })
  && !nichts({ mittel: [{ name: 'Unbekannt', gruppe: null, urteil: 'unveraendert' }] }),
'und auch kein Schmerzmittel, Triptan oder unbekanntes Mittel – verglichen wird nur der Bauch');

const adhsTage = {};
const adhsEintraege = [];
for (let t = 70; t >= 1; t--) {
  const am = vorTagen(t);
  adhsTage[am] = { stress: 1 };
  adhsEintraege.push({ id: `b${t}`, am, um: '11:00', art: 'beschwerde', staerke: 4, arten: ['druck'] });
  if (t <= 35) adhsEintraege.push({ id: `m${t}`, am, um: '07:30', art: 'medikament', mittel: 'Equasym Retard', dosis: '' });
}
const adhsZettel = arztBericht({ eintraege: adhsEintraege, tage: adhsTage }, vorTagen(70), vorTagen(1));
const inKuerze = (adhsZettel.split('IN KÜRZE')[1] || '').split('ÜBERSICHT')[0];
check(adhsZettel.includes('HAT ES ETWAS BEWIRKT?') && adhsZettel.includes('Seit dem ersten Eintrag'),
  'der Bericht stellt beim ADHS-Mittel die Zahlen nebeneinander');
check(!inKuerze.includes('nichts geändert') && !inKuerze.replace(/\s+/g, ' ').includes(UNVERAENDERT)
  && !adhsZettel.includes('Kein Unterschied zur Zeit davor'),
'und schreibt weder oben noch unten, es habe nichts geändert');

check(fehler.length === 0, `keine Fehler in der Konsole (${fehler.join(' | ') || 'keine'})`);
await page.screenshot({ path: `${SHOT}/lage.png`, fullPage: true });
await browser.close();
ende();
