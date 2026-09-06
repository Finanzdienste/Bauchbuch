/*
 * Sichern, löschen, wiederherstellen – der ganze Weg.
 *
 * Diese App hat keinen Server, der etwas aufhebt. Die Sicherungsdatei ist die
 * einzige Kopie, die es je geben wird, und sie wird genau einmal gebraucht:
 * wenn das Gerät weg ist. Ein Export, den man nicht wieder einlesen kann, ist
 * schlimmer als keiner, weil man sich darauf verlassen hat.
 *
 * Deshalb wird hier nicht die Funktion geprüft, sondern der Weg: über den
 * Knopf, durch eine echte Datei, zurück über den Dateiauswähler.
 */
import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { URL, KEY, HANDY, ABLAGE, SHOT, vorTagen, pruefer } from './umgebung.mjs';

const { check, ende } = pruefer();
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: HANDY, acceptDownloads: true });
const page = await ctx.newPage();
const fehler = [];
page.on('pageerror', (e) => fehler.push(`PAGEERROR: ${e.message}`));
// Der Löschknopf fragt nach – im Test wird zugestimmt.
page.on('dialog', (d) => d.accept());

const eintraege = [
  { id: 'a', am: vorTagen(1), um: '12:00', art: 'essen', was: 'Linsensuppe', tags: ['huelsen'], portion: 'normal' },
  { id: 'b', am: vorTagen(1), um: '15:00', art: 'beschwerde', staerke: 5, arten: ['blaehung'], notiz: 'nach dem Mittag' },
  { id: 'c', am: vorTagen(0), um: '08:00', art: 'medikament', mittel: 'Pantoprazol', dosis: '20 mg' },
];

await page.goto(URL, { waitUntil: 'networkidle' });
await page.evaluate(([k, s]) => localStorage.setItem(k, JSON.stringify(s)),
  [KEY, { eintraege, tage: { [vorTagen(1)]: { stress: 3, schlaf: 2, notiz: '' } }, begruesst: true, tab: 'mehr', theme: 'flieder' }]);
await page.reload({ waitUntil: 'networkidle' });

check(
  (await page.locator('#view').textContent()).includes('Gesichert: noch nie'),
  'die App sagt, dass noch nie gesichert wurde',
);

/* ---------- Sichern ---------- */

const [download] = await Promise.all([
  page.waitForEvent('download'),
  page.locator('[data-act="export"]').click(),
]);
const datei = path.join(ABLAGE, 'sicherung.json');
await download.saveAs(datei);
check(/^bauchbuch-\d{4}-\d{2}-\d{2}\.json$/.test(download.suggestedFilename()),
  `der Dateiname trägt das Datum (${download.suggestedFilename()})`);

const roh = readFileSync(datei, 'utf8');
const gesichert = JSON.parse(roh);
check(gesichert.eintraege.length === 3, 'drei Einträge in der Datei');
check(gesichert.eintraege[0].was === 'Linsensuppe', 'lesbar im Klartext, ohne diese App');
check(gesichert.tage[vorTagen(1)].stress === 3, 'die Tagesangaben sind mit dabei');
check(gesichert.theme === 'flieder', 'die Einstellungen ebenfalls');

await page.waitForTimeout(250);
check(
  (await page.locator('#view').textContent()).includes('zuletzt am'),
  'danach merkt sich die App, dass gesichert wurde',
);

/* ---------- Derselbe Stand auch als Text ---------- */
// Herunterladen geht nicht überall: eingebettete Ansichten, der Browser in
// einer Messenger-App. Dort wäre die einzige Kopie sonst nicht erreichbar.
await page.locator('[data-act="sicherung-text"]').click();
await page.waitForTimeout(250);
const alsText = await page.locator('.bericht').inputValue();
check(JSON.parse(alsText).eintraege.length === 3, 'die Sicherung steht auch als Text da');
// Nicht Zeichen für Zeichen dieselbe wie die Datei: Der Export hat inzwischen
// vermerkt, dass gesichert wurde. Gleich sein muss, worauf es ankommt.
const a = JSON.parse(alsText);
check(
  JSON.stringify(a.eintraege) === JSON.stringify(gesichert.eintraege)
    && JSON.stringify(a.tage) === JSON.stringify(gesichert.tage)
    && a.theme === gesichert.theme,
  'mit demselben Inhalt wie die Datei',
);
await page.locator('[data-act="sicherung-zu"]').click();
await page.waitForTimeout(200);
check(await page.locator('.bericht').count() === 0, 'und lässt sich wieder schließen');

/* ---------- Alles löschen ---------- */

await page.locator('[data-act="alles-weg"]').click();
await page.waitForTimeout(300);
check(
  await page.evaluate((k) => {
    const s = JSON.parse(localStorage.getItem(k) || '{"eintraege":[]}');
    return s.eintraege.length;
  }, KEY) === 0,
  'nach dem Löschen ist nichts mehr da',
);
await page.locator('[data-act="tab"][data-tab="heute"]').click();
await page.waitForTimeout(200);
check(await page.locator('.strang-zeile').count() === 0, 'auch in der Tagesansicht nicht');

/* ---------- Wieder einlesen ---------- */

await page.locator('[data-act="tab"][data-tab="mehr"]').click();
await page.waitForTimeout(200);
const [waehler] = await Promise.all([
  page.waitForEvent('filechooser'),
  page.locator('[data-act="import"]').click(),
]);
await waehler.setFiles(datei);
await page.waitForTimeout(400);

await page.locator('[data-act="tab"][data-tab="heute"]').click();
await page.waitForTimeout(250);
check(await page.locator('.strang-zeile').count() === 1, 'der heutige Eintrag ist zurück');
await page.locator('[data-act="tag-blaettern"][data-d="-1"]').click();
await page.waitForTimeout(200);
check(await page.locator('.strang-zeile').count() === 2, 'die beiden von gestern auch');
check(
  (await page.locator('.strang-zeile').first().textContent()).includes('Linsensuppe'),
  'mit ihrem Text',
);
check(
  await page.locator('[data-act="tagfrage"][data-id="stress"][data-n="3"]').getAttribute('aria-pressed') === 'true',
  'und die Tagesangaben stehen wieder',
);

/* ---------- Eine kaputte Datei richtet keinen Schaden an ---------- */

const kaputt = path.join(ABLAGE, 'kaputt.json');
writeFileSync(kaputt, '{"irgendwas": 1}');
await page.locator('[data-act="tab"][data-tab="mehr"]').click();
await page.waitForTimeout(200);
const [waehler2] = await Promise.all([
  page.waitForEvent('filechooser'),
  page.locator('[data-act="import"]').click(),
]);
await waehler2.setFiles(kaputt);
await page.waitForTimeout(400);
check(
  (await page.locator('#toast').textContent()).includes('Ging nicht'),
  'eine unpassende Datei wird abgelehnt',
);
await page.locator('[data-act="tab"][data-tab="heute"]').click();
await page.waitForTimeout(250);
check(
  await page.evaluate((k) => JSON.parse(localStorage.getItem(k)).eintraege.length, KEY) === 3,
  'und die vorhandenen Eintragungen bleiben unangetastet',
);

/* ---------- Die App fragt von selbst nach einer Sicherung ---------- */
// Ein Hinweis unter „Mehr" liest niemand – wer macht schon Einstellungen auf,
// um sich Sorgen zu holen. Die Frage gehört auf den Reiter, den man täglich
// sieht. Und sie darf nicht zu früh kommen: Nach dem dritten Eintrag zu
// betteln, treibt Leute aus der App.

const vieleEintraege = [];
for (let i = 0; i < 10; i++) {
  vieleEintraege.push({
    id: `v${i}`, am: vorTagen(i), um: '12:00', art: 'essen',
    was: 'Essen', portion: 'normal', zutaten: [],
  });
}
await page.evaluate(([k, e]) => localStorage.setItem(k, JSON.stringify({
  begruesst: true, tab: 'heute', eintraege: e, tage: {},
})), [KEY, vieleEintraege]);
await page.reload({ waitUntil: 'networkidle' });
check(
  await page.locator('.karte-merk').count() === 0,
  'bei zehn Einträgen und ohne Sicherung wird noch nicht gefragt',
);

for (let i = 10; i < 20; i++) {
  vieleEintraege.push({
    id: `v${i}`, am: vorTagen(i), um: '13:00', art: 'essen',
    was: 'Essen', portion: 'normal', zutaten: [],
  });
}
await page.evaluate(([k, e]) => localStorage.setItem(k, JSON.stringify({
  begruesst: true, tab: 'heute', eintraege: e, tage: {},
})), [KEY, vieleEintraege]);
await page.reload({ waitUntil: 'networkidle' });
const merk = page.locator('.karte-merk');
check(await merk.count() === 1, 'bei zwanzig steht die Frage da');
const merkText = await merk.textContent();
check(merkText.includes('Zeit für eine Sicherung'), 'mit klarer Ansage');
check(merkText.includes('noch nie gesichert'), 'und dem Grund');
check(merkText.includes('einzige Kopie') || merkText.includes('nur in diesem Browser'),
  'und warum es darauf ankommt');

// „Später" heißt sieben Tage, nicht „nie".
await page.locator('[data-act="sicherung-spaeter"]').click();
await page.waitForTimeout(300);
check(await page.locator('.karte-merk').count() === 0, '„Später" nimmt die Frage weg');
const verschoben = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)).sicherungSpaeter, KEY);
check(!!verschoben, 'und merkt sich, bis wann');
const tageHin = Math.round(
  (new Date(verschoben) - new Date(new Date().toISOString().slice(0, 10))) / 86400000,
);
check(tageHin === 7, `nämlich sieben Tage (${tageHin})`);
await page.reload({ waitUntil: 'networkidle' });
check(await page.locator('.karte-merk').count() === 0, 'auch nach dem Neuladen bleibt sie weg');

// Nach einer echten Sicherung ist die Frage endgültig erledigt.
await page.evaluate(([k, e]) => localStorage.setItem(k, JSON.stringify({
  begruesst: true, tab: 'mehr', eintraege: e, tage: {},
})), [KEY, vieleEintraege]);
await page.reload({ waitUntil: 'networkidle' });
await page.locator('[data-act="sicherung-text"]').click();
await page.waitForTimeout(300);
await page.locator('[data-act="tab"][data-tab="heute"]').click();
await page.waitForTimeout(300);
check(
  await page.locator('.karte-merk').count() === 0,
  'nach dem Sichern ist die Frage weg – und zwar ohne Aufschub',
);

/* ---------- Der Umzug: eine Sicherung, die als Text ankommt ---------- */

/*
 * Der Speicher eines Browsers gehört der Adresse, nicht dem Menschen. Wer die
 * App unter einer Adresse benutzt hat und an eine andere wechselt, findet dort
 * ein leeres Tagebuch – und der Weg hinüber führt über die Sicherung.
 *
 * Nur ist eine *Datei* nicht immer zu haben: In einer eingebetteten Fassung
 * unterbindet der Rahmen jeden Download, den die Seite selbst auslöst. Dort
 * bleibt die Zwischenablage der einzige Ausgang, und dann braucht es auf der
 * anderen Seite ein Feld zum Einfügen. Genau das fehlte, bis ein echter Umzug
 * anstand.
 *
 * Geprüft wird mit einer Sicherung im **alten** Format – Zutaten als bloße
 * Kennungen unter `tags` statt als Liste mit Rollen. Wer umzieht, kommt fast
 * immer aus einer älteren Fassung; eine Einleseprüfung mit heutigen Daten
 * ginge an dem vorbei, wofür sie da ist.
 */
const alteSicherung = JSON.stringify({
  begruesst: true,
  eintraege: [
    {
      id: 'a1', am: vorTagen(3), um: '12:00', art: 'essen', was: 'Zwiebelsuppe',
      portion: 'gross', tags: ['zwiebel', 'fett'],
    },
    { id: 'a2', am: vorTagen(3), um: '14:00', art: 'beschwerde', staerke: 6, arten: ['brennen'] },
    { id: 'a3', am: vorTagen(2), um: '20:00', art: 'notiz', text: 'Aus der alten Fassung' },
  ],
  tage: { [vorTagen(3)]: { notiert: true, stress: 2 } },
  ideen: [{ id: 'i1', text: 'Knopf zu klein', erledigt: false }],
});

// Auf ein leeres Tagebuch, so wie es nach einem Umzug dasteht.
await page.evaluate(([k]) => localStorage.setItem(k, JSON.stringify({
  begruesst: true, tab: 'mehr', eintraege: [], tage: {},
})), [KEY]);
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(300);

check(
  await page.locator('[data-act="einfuegen-auf"]').count() === 1,
  'unter Mehr steht ein Weg, eine Sicherung als Text einzulesen',
);
await page.locator('[data-act="einfuegen-auf"]').click();
await page.waitForTimeout(200);

// Erst der Fehlversuch: Was da nicht hineingehört, darf nichts anrichten.
await page.locator('[data-act="einfuegen-text"]').fill('das ist keine Sicherung');
await page.locator('[data-act="einfuegen-los"]').click();
await page.waitForTimeout(300);
check(
  (await page.locator('#toast').textContent()).includes('Ging nicht'),
  'Müll wird abgewiesen, mit Grund',
);
check(
  await page.evaluate((k) => JSON.parse(localStorage.getItem(k)).eintraege.length, KEY) === 0,
  'und das Tagebuch bleibt, wie es war',
);

// Und jetzt der echte Umzug.
await page.locator('[data-act="einfuegen-text"]').fill(alteSicherung);
await page.locator('[data-act="einfuegen-los"]').click();
await page.waitForTimeout(400);

const angekommen = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)), KEY);
check(angekommen.eintraege.length === 3, `alle drei Einträge sind da (${angekommen.eintraege.length})`);
check(!!angekommen.tage[Object.keys(angekommen.tage)[0]], 'die Tagesangaben auch');
check(angekommen.ideen.length === 1, 'und die Ideen');

/*
 * Und das Alte wird dabei umgerechnet: `tags` wird zu Zutaten mit Rolle. Ohne
 * das käme das Tagebuch zwar an, aber die Auswertung fände darin keine
 * einzige Zutat – der Umzug hätte die Vorgeschichte stumm gemacht.
 */
const mahlzeit = angekommen.eintraege.find((e) => e.art === 'essen');
check(
  Array.isArray(mahlzeit.zutaten) && mahlzeit.zutaten.length === 2,
  `die alten Merkmale sind zu Zutaten geworden (${(mahlzeit.zutaten || []).length})`,
);
check(
  mahlzeit.zutaten.every((z) => z.rolle === 'haupt'),
  'jede mit einer Rolle – „haupt", weil damals niemand etwas anderes gesagt hat',
);
check(mahlzeit.tags === undefined, 'und die alte Angabe steht nicht doppelt da');

await page.locator('[data-act="tab"][data-tab="heute"]').click();
await page.waitForTimeout(300);
await page.locator('[data-act="tag-blaettern"][data-n="-3"]').count();
check(
  (await page.locator('#view').textContent()).length > 0,
  'und die App zeichnet danach ohne Fehler weiter',
);

check(fehler.length === 0, `keine Fehler${fehler.length ? `: ${fehler.join(' | ')}` : ''}`);
await page.screenshot({ path: `${SHOT}/umzug.png`, fullPage: true });
await browser.close();
ende();
