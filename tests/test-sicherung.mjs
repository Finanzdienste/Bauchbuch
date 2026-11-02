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
// „Als Text" gilt erst als gesichert, wenn kopiert wurde – dafür braucht der
// Test die Zwischenablage.
await ctx.grantPermissions(['clipboard-read', 'clipboard-write']);
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
check(/^body-check-\d{4}-\d{2}-\d{2}\.json$/.test(download.suggestedFilename()),
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
await page.locator('[data-act="sicherung-kopieren"]').click();
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

/* ---------- Die Angaben der Fassung 28 ---------- */

/*
 * Neu sind zwei dreiwertige Schalter, die gelesenen Hinweise, die Form und
 * die Essensangabe an einem Medikament, die Form an einem eigenen Mittel und
 * fünf Tagesangaben. Für jede gilt dasselbe wie für alles andere hier: Eine
 * Sicherung nimmt sie mit, ein Wert, den es nicht gibt, fällt weg, und ein
 * älterer Stand lädt weiter.
 */
const zustand = () => page.evaluate(async () => {
  const st = await import('/js/store.js');
  return JSON.parse(JSON.stringify(st.zustandLesen()));
});
const einfuegen = async (text) => {
  await page.locator('[data-act="tab"][data-tab="mehr"]').click();
  await page.waitForTimeout(200);
  await page.locator('[data-act="einfuegen-auf"]').click();
  await page.waitForTimeout(200);
  await page.locator('[data-act="einfuegen-text"]').fill(text);
  await page.locator('[data-act="einfuegen-los"]').click();
  await page.waitForTimeout(400);
};
const stand28 = {
  begruesst: true,
  tab: 'mehr',
  eintraege: [
    {
      id: 'n1', am: vorTagen(1), um: '07:40', art: 'medikament', mittel: 'Ritalin Adult', dosis: '20 mg',
      form: 'sodas', essen: 'ohne', essenGesetzt: 1767600000000,
    },
    { id: 'n2', am: vorTagen(1), um: '08:10', art: 'essen', was: 'Brot', zutaten: [], portion: 'normal' },
  ],
  tage: {
    [vorTagen(1)]: { stress: 1, verspannt: 3, kiefer: 0, gepresst: 1, schiene: 0, adhsPause: 'geplant' },
    [vorTagen(2)]: { schiene: 1, kiefer: 4 },
  },
  standardMittel: [
    { id: 's1', mittel: 'Ritalin Adult', dosis: '20 mg', tageszeit: 'morgens', bezug: null, form: 'sodas' },
    { id: 's2', mittel: 'Omeprazol', dosis: '20 mg', tageszeit: 'morgens', bezug: 'vor', form: null },
  ],
  adhsAn: true,
  spannungAn: false,
  v28Gesagt: true,
  wechselGelesen: ['W1u|ritalin adult|omeprazol'],
};
await page.evaluate(([k, s]) => localStorage.setItem(k, JSON.stringify(s)), [KEY, stand28]);
await page.reload({ waitUntil: 'networkidle' });
await page.locator('[data-act="sicherung-text"]').click();
await page.waitForTimeout(250);
const text28 = await page.locator('.bericht').inputValue();
await page.locator('[data-act="sicherung-zu"]').click();
await page.locator('[data-act="alles-weg"]').click();
await page.waitForTimeout(300);
check((await zustand()).eintraege.length === 0, 'Fassung 28: gesichert und gelöscht');
await einfuegen(text28);
let z28 = await zustand();
const mittel28 = z28.eintraege.find((e) => e.id === 'n1') || {};
check(
  mittel28.form === 'sodas' && mittel28.essen === 'ohne' && mittel28.essenGesetzt === 1767600000000,
  `hin und zurück: Form und Essensangabe samt Zeitpunkt (${mittel28.form}, ${mittel28.essen}, ${mittel28.essenGesetzt})`,
);
check(
  JSON.stringify(z28.tage[vorTagen(1)]) === JSON.stringify(stand28.tage[vorTagen(1)])
    && JSON.stringify(z28.tage[vorTagen(2)]) === JSON.stringify(stand28.tage[vorTagen(2)]),
  'die neuen Tagesangaben, auch eine 0',
);
check(
  (z28.standardMittel.find((x) => x.id === 's1') || {}).form === 'sodas'
    && (z28.standardMittel.find((x) => x.id === 's2') || {}).form === null,
  'die Form der eigenen Mittel',
);
check(
  z28.adhsAn === true && z28.spannungAn === false && z28.v28Gesagt === true
    && JSON.stringify(z28.wechselGelesen) === JSON.stringify(stand28.wechselGelesen),
  `die Schalter, ein ausdrückliches Aus eingeschlossen, und die gelesenen Hinweise (${z28.adhsAn}, ${z28.spannungAn})`,
);

// Was es nicht gibt, fällt weg – statt umgedeutet zu werden.
const unsinn = JSON.stringify({
  eintraege: [
    {
      id: 'u1', am: vorTagen(1), um: '07:00', art: 'medikament', mittel: 'Medikinet', dosis: '10 mg',
      form: 'x', essen: 'irgendwann', essenGesetzt: 5,
    },
    {
      id: 'u2', am: vorTagen(1), um: '07:05', art: 'medikament', mittel: 'Concerta', dosis: '18 mg',
      essenGesetzt: 1767600000000,
    },
    {
      id: 'u3', am: vorTagen(1), um: '07:10', art: 'medikament', mittel: 'Elvanse', dosis: '30 mg',
      form: 'pellet', essen: 'mit', essenGesetzt: 'gestern',
    },
  ],
  tage: {
    [vorTagen(1)]: { schiene: 7, kiefer: 9, adhsPause: 'x', verspannt: 2.5, gepresst: true, stress: 2 },
    [vorTagen(2)]: { schiene: 2, kiefer: -1 },
    [vorTagen(3)]: { verspannt: 4, gepresst: 0, adhsPause: 'beschwerden' },
  },
  standardMittel: [
    { id: 'q1', mittel: 'Equasym Retard', dosis: '10 mg', form: 'x' },
    { id: 'q2', mittel: 'Strattera', dosis: '40 mg' },
  ],
  adhsAn: 'ja',
  spannungAn: 1,
  v28Gesagt: 'ja',
  wechselGelesen: [3, null, 'W1|a|b', 'x'.repeat(121), ...Array.from({ length: 60 }, (_, i) => `W3|m${i}|p`)],
});
await page.locator('[data-act="alles-weg"]').click();
await page.waitForTimeout(300);
await einfuegen(unsinn);
const zu = await zustand();
const u = (id) => zu.eintraege.find((e) => e.id === id) || {};
check(!('form' in u('u1')) && !('essen' in u('u1')) && !('essenGesetzt' in u('u1')),
  'eine unbekannte Form und Essensangabe fallen weg, der Zeitpunkt ohne Angabe mit');
check(!('essenGesetzt' in u('u2')), 'ein Zeitpunkt ohne Essensangabe fällt weg');
check(u('u3').form === 'pellet' && u('u3').essen === 'mit' && !('essenGesetzt' in u('u3')),
  'eine gültige Angabe bleibt, ein Zeitpunkt, der keine Zahl ist, nicht');
check(
  JSON.stringify(zu.tage[vorTagen(1)]) === JSON.stringify({ stress: 2 }),
  `schiene:7, kiefer:9, adhsPause:'x', verspannt:2.5, gepresst:true fallen weg (${JSON.stringify(zu.tage[vorTagen(1)])})`,
);
check(!(vorTagen(2) in zu.tage), 'ein Tag, an dem danach nichts mehr steht, fällt ganz weg');
check(
  JSON.stringify(zu.tage[vorTagen(3)]) === JSON.stringify({ verspannt: 4, gepresst: 0, adhsPause: 'beschwerden' }),
  'gültige Werte bleiben, auch die Ränder 0 und 4',
);
check(
  (zu.standardMittel.find((x) => x.id === 'q1') || {}).form === null
    && !('form' in (zu.standardMittel.find((x) => x.id === 'q2') || {})),
  'eine unbekannte Form am eigenen Mittel wird null, eine fehlende bleibt fehlend',
);
check(zu.adhsAn === null && zu.spannungAn === null && zu.v28Gesagt === false,
  `Schalter mit falschem Wert gelten als nicht entschieden (${zu.adhsAn}, ${zu.spannungAn}, ${zu.v28Gesagt})`);
check(
  zu.wechselGelesen.length === 50 && zu.wechselGelesen.every((x) => typeof x === 'string' && x.length <= 120)
    && zu.wechselGelesen[49] === 'W3|m59|p',
  `gelesene Hinweise: nur Zeichenketten bis 120 Zeichen, die jüngsten fünfzig (${zu.wechselGelesen.length})`,
);

/*
 * Ausschalten gewinnt. Wer ein Angebot abgelehnt oder einen Schalter
 * ausgemacht hat, liest später vielleicht eine ältere Sicherung ein, in der
 * er noch an war – oder den Stand aus Safari. Beim Zusammenführen gewinnt,
 * wer von der Vorgabe abweicht; das ist bei einem dreiwertigen Schalter das
 * ausdrückliche Aus.
 */
await page.evaluate(([k, s]) => localStorage.setItem(k, JSON.stringify(s)), [KEY, {
  begruesst: true,
  tab: 'mehr',
  eintraege: [{ id: 'h1', am: vorTagen(0), um: '08:00', art: 'notiz', text: 'hier' }],
  tage: { [vorTagen(1)]: { schiene: 1 } },
  adhsAn: false,
  spannungAn: null,
  wechselGelesen: ['W1|x|y'],
}]);
await page.reload({ waitUntil: 'networkidle' });
await einfuegen(JSON.stringify({
  eintraege: [{ id: 'd1', am: vorTagen(1), um: '09:00', art: 'notiz', text: 'dort' }],
  tage: { [vorTagen(1)]: { schiene: 0, kiefer: 2 } },
  adhsAn: true,
  spannungAn: true,
  v28Gesagt: true,
  wechselGelesen: ['W1|x|y', 'W5|a|b'],
}));
const zz = await zustand();
check(zz.eintraege.length === 2, 'zusammengeführt, nicht ersetzt');
check(zz.adhsAn === false, `ein ausdrückliches Aus übersteht eine ältere Sicherung mit „an" (${zz.adhsAn})`);
check(zz.spannungAn === true && zz.v28Gesagt === true, 'was hier nie entschieden war, kommt von dort');
check(
  JSON.stringify(zz.tage[vorTagen(1)]) === JSON.stringify({ schiene: 1, kiefer: 2 }),
  `die Tagesangaben je Feld, bei Gleichstand gewinnt, was hier stand (${JSON.stringify(zz.tage[vorTagen(1)])})`,
);
check(
  JSON.stringify(zz.wechselGelesen) === JSON.stringify(['W1|x|y', 'W5|a|b']),
  'gelesene Hinweise werden vereinigt',
);

// Ein Stand der Fassung 27 lädt – ohne einen der neuen Schlüssel.
await page.evaluate(([k, s]) => localStorage.setItem(k, JSON.stringify(s)), [KEY, {
  begruesst: true,
  tab: 'heute',
  alterName: null,
  eintraege: [{ id: 'v1', am: vorTagen(0), um: '08:00', art: 'medikament', mittel: 'Pantoprazol', dosis: '20 mg' }],
  tage: { [vorTagen(0)]: { stress: 1 } },
  standardMittel: [{ id: 'o1', mittel: 'Pantoprazol', dosis: '20 mg', tageszeit: 'morgens', bezug: 'vor' }],
}]);
await page.reload({ waitUntil: 'networkidle' });
const z27 = await zustand();
check(
  z27.adhsAn === null && z27.spannungAn === null && z27.v28Gesagt === false
    && Array.isArray(z27.wechselGelesen) && !z27.wechselGelesen.length,
  'ein Stand der Fassung 27 lädt mit beiden Schaltern auf „nie entschieden"',
);
check(!('form' in z27.standardMittel[0]) && !('form' in z27.eintraege[0]),
  'und nichts daran wird umgeschrieben – ein altes Mittel hat einfach keine Form');
check((await page.locator('.strang-zeile').count()) === 1, 'die App zeigt ihn wie gewohnt');

// Beschädigt: wechselGelesen keine Liste, Schalter vom falschen Typ.
const vorFehlern = fehler.length;
await page.evaluate(([k, s]) => localStorage.setItem(k, JSON.stringify(s)), [KEY, {
  begruesst: true,
  tab: 'heute',
  eintraege: [{ id: 'k1', am: vorTagen(0), um: '08:00', art: 'notiz', text: 'kaputt' }],
  tage: {},
  wechselGelesen: 'kaputt',
  adhsAn: 'ja',
  spannungAn: { an: true },
  v28Gesagt: 1,
  tagesfragen: ['stimmung', 'schiene', 'kiefer'],
}]);
await page.reload({ waitUntil: 'networkidle' });
const zk = await zustand();
check(
  Array.isArray(zk.wechselGelesen) && !zk.wechselGelesen.length
    && zk.adhsAn === null && zk.spannungAn === null && zk.v28Gesagt === false,
  'ein beschädigtes wechselGelesen und Schalter vom falschen Typ werfen nicht, sie gelten als leer',
);
await page.locator('[data-act="tab"][data-tab="muster"]').click();
await page.waitForTimeout(250);
await page.locator('[data-act="tab"][data-tab="heute"]').click();
await page.waitForTimeout(250);
check(fehler.length === vorFehlern && (await page.locator('.strang-zeile').count()) === 1,
  'die App zeichnet damit weiter, auch mit Tagesfragen, die sie nicht kennt');
await page.evaluate(([k, s]) => localStorage.setItem(k, JSON.stringify(s)), [KEY, {
  begruesst: true, tab: 'heute', eintraege: [], tage: {}, wechselGelesen: [1, null, 'W1|a|b', { x: 1 }],
}]);
await page.reload({ waitUntil: 'networkidle' });
check(JSON.stringify((await zustand()).wechselGelesen) === JSON.stringify(['W1|a|b']),
  'aus einer Liste mit Fremdem bleiben nur die Zeichenketten');

check(fehler.length === 0, `keine Fehler${fehler.length ? `: ${fehler.join(' | ')}` : ''}`);
await page.screenshot({ path: `${SHOT}/umzug.png`, fullPage: true });
await browser.close();
ende();
