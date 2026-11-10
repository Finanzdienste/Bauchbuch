/*
 * Rechnet diese Fassung über ein altes Tagebuch noch genau das, was die
 * Fassung 27 gerechnet hat?
 *
 * Die Fassung 28 bringt viel Neues: ADHS-Mittel, Koffein als eigene Gruppe,
 * mehr Namen für Säureblocker, Kiefer, Nacken und Schiene. Wer nichts davon
 * einträgt, darf davon nichts merken – an keiner Zahl, in keinem Satz. Das
 * ist leicht versprochen und schwer gehalten, denn jede neue Regel sitzt in
 * einer Rechnung, die auch alle anderen Tagebücher durchläuft.
 *
 * Deshalb kein Vergleich Stelle für Stelle, sondern das Gold
 * (tests/gold/v27-rechnungen.json): alle Rechnungen aus tests/rechnungen.mjs,
 * mit dem Code der Fassung 27 über feste Tagebücher gerechnet und
 * eingecheckt, bevor sich am Code etwas geändert hat. Hier läuft dieselbe
 * Liste mit dem heutigen Code über dieselben Tagebücher und muss Zeichen für
 * Zeichen dasselbe ergeben. So fällt auch eine Stelle auf, an die beim
 * Schreiben niemand gedacht hat.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOT, pruefer } from './umgebung.mjs';
import {
  GOLD_SAATEN, GRUNDDATUM, TAGE, alleRechnungen, nichtLeer, tagebuch,
} from './rechnungen.mjs';

const { check, ende } = pruefer();
const HIER = path.dirname(fileURLToPath(import.meta.url));
const gold = JSON.parse(readFileSync(path.join(HIER, 'gold', 'v27-rechnungen.json'), 'utf8'));

check(
  gold.grunddatum === GRUNDDATUM && gold.tage === TAGE
    && JSON.stringify(gold.saaten) === JSON.stringify(GOLD_SAATEN),
  `das Gold gehört zu diesem Generator (${gold.grunddatum}, ${gold.tage} Tage, Saaten ${gold.saaten.join(', ')})`,
);

/*
 * Das Tagebuch des Golds enthält nichts, was erst die Fassung 28 kennt – sonst
 * wäre „dasselbe Ergebnis" kein Versprechen, sondern ein Fehler: Ein
 * ADHS-Mittel soll ja anders zählen als vorher.
 */
// „Omep" nur, wo es nicht zu „Omeprazol" gehört – das kannte schon die Fassung 27.
const NEU = /methylphenidat|ritalin|medikinet|concerta|kinecteen|equasym|\bmph\b|lisdex|elvanse|dexamfetamin|dexamphetamin|attentin|atomoxetin|strattera|guanfacin|intuniv|bupropion|elontril|zyban|koffein|coffein|pantozol|nexium|antra|agopton|maaloxan|rifun|omep(?!razol)|massagepistole|"massage"|"waerme"|adhsPause|verspannt|"kiefer"|gepresst|"schiene"|essenGesetzt/i;
for (const saat of GOLD_SAATEN) {
  const d = tagebuch(saat);
  const text = JSON.stringify(d);
  const mittelNeu = d.eintraege.filter((e) => e.art === 'medikament' && ('form' in e || 'essen' in e));
  check(!NEU.test(text) && !mittelNeu.length,
    `Tagebuch ${saat}: ohne ADHS-, Koffein- und neue Säureblocker-Namen, ohne neue Aktivitäten und Felder`);
  check(d.eintraege.length > 400 && Object.keys(d.tage).length > 60,
    `Tagebuch ${saat}: kein leeres Tagebuch (${d.eintraege.length} Einträge, ${Object.keys(d.tage).length} Tage)`);
  /*
   * Die Sondertage (siehe tagebuch()): Tage mit genau einem Eintrag – einem
   * Säureblocker, Ibuprofen oder Paracetamol ohne Kopfschmerz, oder einer
   * Notiz – und ohne Tagesfrage. Nur an ihnen merkt das Gold, wenn eine Fassung
   * ein gewöhnliches Mittel nicht mehr als Angabe zählt.
   */
  const allein = [...new Set(d.eintraege.map((e) => e.am))].filter((iso) => {
    const dort = d.eintraege.filter((e) => e.am === iso);
    const tag = d.tage[iso] || {};
    return dort.length === 1 && !dort[0].zuKopf && Object.keys(tag).every((k) => k === 'wasser');
  }).map((iso) => d.eintraege.find((e) => e.am === iso)).map((e) => e.mittel || e.art);
  const gebraucht = ['Pantoprazol', 'Omeprazol', 'Esomeprazol', 'Ibuprofen', 'Paracetamol', 'notiz'];
  check(gebraucht.every((x) => allein.includes(x)),
    `Tagebuch ${saat}: Tage, an denen allein ein Mittel oder eine Notiz steht (${allein.join(', ')})`);
}

/* ---------- Jede Rechnung im Gold sagt etwas ---------- */

for (const saat of GOLD_SAATEN) {
  const leer = Object.entries(gold.rechnungen[saat]).filter(([, v]) => !nichtLeer(v)).map(([k]) => k);
  check(
    Object.keys(gold.rechnungen[saat]).length >= 34 && leer.length === 0,
    `Gold ${saat}: ${Object.keys(gold.rechnungen[saat]).length} Rechnungen, keine davon leer${leer.length ? ` (leer: ${leer.join(', ')})` : ''}`,
  );
}

/* ---------- Fassung 30: berichtigter Wortlaut, dieselben Zahlen ---------- */

/*
 * Die Fassung 30 hat die medizinischen Sätze der App gegen
 * Fachinformationen, Gebrauchsinformationen und weitere Quellen im Volltext
 * geprüft und berichtigt. Einige dieser Sätze stecken in Rechnungen, die das
 * Gold festhält: in den Vorschlägen für heute (raete), bei den Zeitabständen
 * nach dem Essen (zeitProfil, zeitBild, spaeteFunde) und im Bericht. Keine
 * Zahl, keine Schwelle und kein Urteil hat sich dabei geändert – genau das
 * prüft dieser Test weiter.
 *
 * Das Gold bleibt, wie es ist: Es ist das, was die Fassung 27 gerechnet hat
 * (siehe mittelPunkt in tests/test-gleich-v27.mjs). Stattdessen bekommt vor
 * dem Vergleich jede berichtigte Stelle ihren Wortlaut der Fassung 27 zurück –
 * jede für sich, mit dem genauen neuen und dem genauen alten Text. Wo in einer
 * Stelle eine Zahl steht, die je Tagebuch anders ist, wird sie übernommen und
 * nicht ersetzt; ändert sich eine, fällt das weiter auf. Jede Regel muss
 * mindestens einmal greifen, sonst ist sie überflüssig, und auch das fällt auf.
 * Die Belege für den neuen Wortlaut stehen jeweils am Code, der ihn schreibt.
 *
 * Eine Ausgabe ist ganz entfallen: das Feld `ort`, ein Ort im
 * Verdauungstrakt, der allein aus dem Zeitabstand abgelesen war (etwa
 * „4–8 Stunden – Dickdarm"). Die Quellen widersprechen einer festen Zuordnung
 * (Kopf von js/zeitprofil.js); die Rechnung dahinter ist unverändert. Das Feld
 * wird deshalb im Gold vor dem Vergleich weggelassen, und eine eigene Prüfung
 * hält fest, dass die Ausgabe von heute es nicht mehr hat.
 */

/** Die Rechnungen, deren Gold das Feld `ort` noch hat. */
const MIT_ORT = ['zeitProfil', 'zeitBild', 'spaeteFunde'];

/** Die Orte der Fassung 27 je Zeitfenster – nur für die Tabelle im Bericht. */
const ORT_ALT = { '0–2': 'Magen und Speiseröhre', '2–4': 'Dünndarm und Galle', '4–8': 'Dickdarm' };

/*
 * Ganze Texte in Rechnungen. Steht an einer Stelle der Rechnung `wo` genau
 * `neu`, bekommt sie `alt` zurück; mit `teil` wird nur dieses Stück des
 * Textes getauscht, und der Rest (etwa eine Anzahl) bleibt, wie er ist.
 */
const TEXTE = [
  // Vorschläge für heute (js/rat.js): ohne Frist für einen Auslöser, ohne
  // Schonkost-Liste, Atemübungen und Bewegung so, wie die Quellen dort sie
  // beschreiben.
  {
    wo: ['raete'],
    neu: 'Nicht für immer streichen – an Tagen wie diesem einmal weglassen und im Tagebuch schauen, ob es einen '
      + 'Unterschied macht. Ob ein Lebensmittel wirklich der Auslöser ist, lässt sich so allein nicht sicher sagen; '
      + 'das kann die Praxis abklären.',
    alt: 'Nicht für immer streichen – nur an Tagen wie diesem einmal weglassen und schauen, ob es einen Unterschied '
      + 'macht. Ein Auslöser, der sich in zwei Wochen ohne ihn nicht bestätigt, war keiner.',
  },
  { wo: ['raete'], neu: 'Schonkost an Tagen mit starken Beschwerden', alt: 'Heute klein und mild' },
  {
    wo: ['raete'],
    neu: 'Bei akuter Magenschleimhautentzündung wird laut gesund.bund.de oft zu kleinen Portionen und Schonkost '
      + 'wie Zwieback oder Haferschleim geraten – ob das hilft, ist nicht ausreichend erforscht. Bei akutem '
      + 'Durchfall gelten dort Reis, Bananen und Zwieback als magenschonend. Halten die Beschwerden an, gehört '
      + 'das in die Praxis.',
    alt: 'Mehrere kleine Portionen statt zwei großen, und dabei bleiben bei: Haferbrei mit Wasser, Kartoffeln, '
      + 'gestampft, gedünstete Karotte oder Zucchini, Reis, Banane, mageres Geflügel oder Fisch.',
  },
  { wo: ['raete'], neu: 'Atemübungen unter „Ruhe“', alt: 'Zwei Minuten Atmen' },
  {
    wo: ['raete'],
    neu: 'Unter „Ruhe“ liegen Atemübungen, etwa 4–7–8 und Gleichmaß, mit Ton, damit die Augen zubleiben können. '
      + 'Tiefes Ein- und Ausatmen kann laut gesund.bund.de die Entspannung fördern.',
    alt: 'Unter „Ruhe": 4–7–8 zum Runterkommen, Gleichmaß fürs Sitzen zwischendurch. Mit Ton, damit die Augen '
      + 'zubleiben können.',
  },
  { wo: ['raete'], neu: 'Atemübung vor dem Schlafen', alt: 'Heute Abend 4–7–8 vor dem Schlafen' },
  {
    wo: ['raete'],
    neu: 'Atemübungen vor dem Schlafengehen zählt gesund.bund.de zu den Entspannungstechniken bei Schlafproblemen; '
      + 'wie gut sie wirken, ist nicht hinreichend untersucht, und für 4–7–8 gibt es bisher wenig Belege. Die '
      + 'Übung liegt unter „Ruhe“.',
    alt: 'Die Übung ist ursprünglich fürs Einschlafen gedacht. Vier Runden im Bett, Licht schon aus.',
  },
  { wo: ['raete'], neu: 'Bewegung bei starken Beschwerden', alt: 'Heute nur spazieren' },
  {
    wo: ['raete'],
    neu: 'Bei Reflux können nach körperlicher Anstrengung und beim Bücken oder Liegen vermehrt Beschwerden '
      + 'auftreten. Welche Bewegung an einem Tag mit starken Beschwerden passt, kann die Praxis einschätzen.',
    alt: 'Bei einem Wert wie heute bringt intensives Training nichts und kann die Beschwerden verstärken. '
      + 'Zwanzig Minuten gehen hilft der Verdauung trotzdem.',
  },
  {
    wo: ['raete'],
    neu: 'Bei dir hängen Anspannung und Beschwerden messbar zusammen. Bei akutem Stress fährt der Körper laut '
      + 'gesund.bund.de unter anderem die Magen- und Darmtätigkeit zurück; tiefes Ein- und Ausatmen kann die '
      + 'Entspannung fördern. Unter „Ruhe“ liegt die Übung 4–7–8, mit vier Runden gut eine Minute.',
    alt: 'Bei dir hängen Anspannung und Beschwerden messbar zusammen. Langes Ausatmen schaltet auf den Teil des '
      + 'Nervensystems um, unter dem der Darm arbeitet – unter „Ruhe" liegt 4–7–8, gut zwei Minuten.',
  },
  { wo: ['raete'], neu: 'Bewegung heute', alt: 'Heute geht auch intensiv' },
  {
    wo: ['raete'],
    neu: 'Die allgemeinen Richtwerte für Erwachsene nennen auch anstrengende Bewegung; bei Reflux können danach '
      + 'vermehrt Beschwerden auftreten.',
    alt: 'Beschwerdefrei und ausgeruht: Wenn du intensiv trainieren willst, ist heute der Tag dafür. Danach '
      + 'mindestens eine Stunde, bevor du dich hinlegst.',
  },
  // Zeitabstand (js/zeitprofil.js): nur noch die Stunden, ohne Ort und ohne
  // Deutung; der Fenstername behält dabei sein großes „Stunden".
  {
    wo: ['zeitProfil', 'spaeteFunde'],
    neu: 'Auffällig wird es vor allem 0–2 Stunden danach.',
    alt: 'Auffällig wird es vor allem 0–2 stunden danach. So früh kommt Beschwerde aus dem Magen oder der '
      + 'Speiseröhre – Säure, Dehnung, verzögerte Entleerung. Für den Dickdarm ist es zu früh.',
  },
  {
    wo: ['zeitProfil', 'spaeteFunde'],
    neu: 'Auffällig wird es vor allem 2–4 Stunden danach.',
    alt: 'Auffällig wird es vor allem 2–4 stunden danach. In dieser Zeit arbeitet der Dünndarm an Fett und Galle. '
      + 'Das passt eher zu fettem Essen als zu vergärbaren Kohlenhydraten.',
  },
  {
    wo: ['zeitProfil', 'spaeteFunde'],
    neu: 'Auffällig wird es vor allem 4–8 Stunden danach.',
    alt: 'Auffällig wird es vor allem 4–8 stunden danach. So spät ist der Rest im Dickdarm angekommen. Was dort '
      + 'vergärt – FODMAP, Laktose, Ballaststoffe – kann sich gar nicht früher melden.',
  },
  {
    wo: ['zeitBild'],
    neu: 'Die Beschwerden verteilen sich über die Stunden nach dem Essen, ohne erkennbaren Schwerpunkt.',
    alt: 'Die Beschwerden verteilen sich über die Stunden nach dem Essen, ohne erkennbaren Schwerpunkt. Das '
      + 'spricht eher gegen einen einzelnen Ort als Ursache.',
  },
  {
    wo: ['zeitBild'],
    teil: true,
    neu: 'isst, erfährt über die späten Stunden wenig.',
    alt: 'isst, kann über den Dickdarm wenig erfahren.',
  },
];

/*
 * Für die Sätze unter HAT ES ETWAS BEWIRKT? (befund in js/ansprechen.js): Der
 * Bericht bricht sie selbst um (umbrochen in js/bericht.js, 68 Zeichen, fünf
 * Leerzeichen davor), und wo der Satz anders lang ist, liegen die Umbrüche
 * anders. Die Regel liest deshalb den Satz über alle Umbrüche hinweg und
 * bricht den alten genauso um, wie die Fassung 27 es tat.
 */
function umbrechen(satz, breite = 68) {
  const zeilen = [];
  let zeile = '';
  satz.split(/\s+/).forEach((wort) => {
    if (zeile && zeile.length + wort.length + 1 > breite) {
      zeilen.push(zeile);
      zeile = wort;
    } else zeile = zeile ? `${zeile} ${wort}` : wort;
  });
  if (zeile) zeilen.push(zeile);
  return zeilen.map((z) => `     ${z}`).join('\n');
}
/** Ein Satz als Muster über Umbrüche hinweg; ZAHL und DATUM werden Gruppen. */
function locker(vorlage) {
  const teile = vorlage.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').split(' ')
    .map((w) => w.replace(/ZAHL/g, '([\\d,]+)').replace(/DATUM/g, '([\\d.]+)'));
  return new RegExp(` {5}${teile.join('\\s+')}`, 'g');
}

/*
 * Der Bericht (js/bericht.js und die Sätze, die er aus kopf.js, gewicht.js,
 * zeitprofil.js und kriterien.js übernimmt). Er ist umbrochener Text; jede
 * Regel nennt deshalb die Zeilen, wie sie dastehen. Wo eine Zahl je Tagebuch
 * anders ist, steht sie als Gruppe im Muster und wird übernommen.
 */
const BERICHT = [
  /*
   * HAT ES ETWAS BEWIRKT? (js/ansprechen.js): Der Säureblocker ohne Besserung
   * ohne Schluss auf die Ursache und ohne Säure-Rebound; Mittel außerhalb der
   * Magengruppen ohne Urteil, nur mit den beiden Zahlen. „Darunter
   * schlechter" ist das, was die Fassung 27 für das Ibuprofen dieser
   * Tagebücher schrieb – ob es noch so gerechnet wird, prüft die Rechnung
   * `mittelBilanz` oben Zeichen für Zeichen.
   */
  {
    neu: locker('Seit ZAHL Wochen im Gebrauch, ohne dass die Bauchwerte darunter besser geworden wären: '
      + 'ZAHL davor gegen ZAHL darunter (ZAHL gegen ZAHL notierte Tage). Bleiben Beschwerden unter der '
      + 'Behandlung bestehen, nennen manche Fachinformationen weitere Untersuchungen; was es hier bedeutet, '
      + 'klärt die Praxis. Frage für den Termin: Was heißt es, dass es darunter nicht besser geworden ist – '
      + 'und wie geht es weiter? Laut Packungsbeilage mancher Präparate, etwa Pantozol, wird die Einnahme '
      + 'nicht beendet, ohne vorher mit Ärztin, Arzt oder Apotheke zu sprechen.'),
    alt: (z, wochen, davor, unter, nDavor, nUnter) => umbrechen(`Seit ${wochen} Wochen im Gebrauch, ohne dass `
      + `sich die Beschwerdestärke geändert hätte: ${davor} davor gegen ${unter} darunter (${nDavor} gegen `
      + `${nUnter} notierte Tage). Das ist selbst ein Befund. Wenn Säure die Ursache wäre, wäre nach vier `
      + 'bis acht Wochen etwas zu sehen. Frage für den Termin: Was heißt es, dass es darunter nicht besser '
      + 'geworden ist – und wie geht es weiter? Nicht von selbst absetzen: Nach längerer Einnahme antwortet '
      + 'der Magen kurzzeitig mit mehr Säure als vorher.'),
  },
  {
    neu: locker('Seit dem ersten Eintrag (DATUM) im Mittel ZAHL, in der Zeit davor ZAHL (ZAHL gegen ZAHL '
      + 'notierte Tage). Verglichen wird der Bauchwert; ob das etwas mit dem Mittel zu tun hat, zeigt dieser '
      + 'Vergleich nicht.'),
    alt: (z, datum, unter, davor, nUnter, nDavor) => umbrechen(`Darunter schlechter als davor: ${davor} davor `
      + `gegen ${unter} darunter (${nDavor} gegen ${nUnter} notierte Tage). Das heißt nicht, dass das Mittel `
      + 'schadet – eher, dass es angefangen wurde, als es schlechter wurde. Wenn es dabei bleibt, gehört es '
      + 'angesprochen.'),
  },
  // Später Fund in „In Kürze": ohne „im Dickdarm, nicht im Magen".
  {
    neu: ' fällt im eingestellten Zeitfenster nach dem\n    Essen nicht auf, wohl aber 4–8 Stunden danach.',
    alt: ' fällt im üblichen Zeitfenster nicht auf, wohl\n    aber 4–8 stunden danach – so spät entsteht '
      + 'Beschwerde im Dickdarm,\n    nicht im Magen.',
  },
  // Gewicht stabil (js/gewicht.js): keine Entwarnung mehr.
  {
    neu: '  Messungen). Das Gewicht ist damit stabil. Über andere Zeichen wie\n'
      + '  Blut im Stuhl, Fieber oder Blässe sagt die Waage nichts.',
    alt: '  Messungen). Das Gewicht ist damit stabil, und das ist bei\n'
      + '  Bauchbeschwerden eine gute Nachricht: Der wichtigste Hinweis darauf,\n'
      + '  dass mehr dahintersteckt, ist ein ungewollter Verlust.',
  },
  // Zeitabstand bei einem Auslöser und bei den späten Funden: ohne Ort.
  {
    neu: '    auffällig vor allem 2–4 Stunden danach\n',
    alt: '    auffällig vor allem 2–4 stunden danach (Dünndarm und Galle)\n',
  },
  { neu: '    Schwerpunkt 4–8 Stunden danach\n', alt: '    4–8 Stunden danach, also Dickdarm\n' },
  // Der Satz, der statt eines Ortes dasteht (KEIN_ORT in js/zeitprofil.js), war neu.
  { neu: '  Woher eine Beschwerde kommt, lässt sich am Zeitpunkt allein nicht\n  ablesen.\n', alt: '' },
  // „Wie lange nach dem Essen": die Tabelle ohne Ortsspalte.
  {
    neu: /^( {2}(0–2|2–4|4–8) Stunden danach +\d+ \(\d+ %\), im Mittel [\d,]+)$/gm,
    alt: (z, zeile, fenster) => `${zeile}  – ${ORT_ALT[fenster]}`,
  },
  {
    neu: '  Die Beschwerden verteilen sich über die Stunden nach dem Essen, ohne\n  erkennbaren Schwerpunkt.\n',
    alt: '  Die Beschwerden verteilen sich über die Stunden nach dem Essen, ohne\n'
      + '  erkennbaren Schwerpunkt. Das spricht eher gegen einen einzelnen Ort\n  als Ursache.\n',
  },
  {
    neu: '  Stunden isst, erfährt über die späten Stunden wenig.',
    alt: '  Stunden isst, kann über den Dickdarm wenig erfahren.',
  },
  // Stuhlformen: „sehr weich/flüssig" statt „weich" (Bristol-Skala, js/bericht.js);
  // der längere Name macht die Spalte zwei Zeichen breiter.
  {
    neu: /^ {2}(Eingetragen|Typ 1-2 \(hart\)|Typ 3-5 \(unauffällig\)|Typ 6-7 \(sehr weich\/flüssig\)|davon dringend) +(?=\S)/gm,
    alt: (z, name) => `  ${(name === 'Typ 6-7 (sehr weich/flüssig)' ? 'Typ 6-7 (weich)' : name).padEnd(27)}`,
  },
  // Kopfschmerz: Kalendertage statt „für die Neurologie"; beim langen Anfall
  // die Packungsbeilagen statt „anrufen und nicht warten"; die Periode mit den
  // Begriffen der ICHD-3; Kopf- und Bauchtage ohne „Nüchternbleiben" und ohne
  // „sagt nichts über das Mittel" (Belege in js/kopf.js und js/bericht.js).
  {
    neu: '  Je 30 Kalendertage (jüngster Zeitraum zuerst):',
    alt: '  Für die Neurologie, je 30-Tage-Fenster (jüngstes zuerst):',
  },
  {
    neu: '  die Praxis zu fragen: Packungsbeilagen mancher Kopfschmerzmittel\n'
      + '  nennen Kopfschmerzen, die länger als drei bis vier Tage anhalten,\n'
      + '  als Anlass für ärztlichen Rat.',
    alt: '  in der Praxis anzurufen und nicht auf den nächsten Termin zu warten.',
  },
  {
    neu: ' Dieses\n  Fenster nutzt die Kopfschmerzklassifikation, bisher nur in ihrem\n'
      + '  Anhang: Liegen Migräneanfälle in mindestens zwei von drei Zyklen\n'
      + '  darin, spricht sie von rein menstrueller Migräne (nur dann) oder\n'
      + '  menstruationsassoziierter Migräne (auch zu anderen Zeiten). Gezählt\n'
      + '  werden dort Migräneanfälle; ob deine Kopfschmerztage welche sind,\n'
      + '  klärt die Sprechstunde.',
    alt: ' Genau\n  danach fragt die Neurologie: In mindestens zwei von drei Zyklen\n'
      + '  heißt das menstruationsgebunden – gezählt werden dort\n'
      + '  Migräneanfälle; ob deine Kopfschmerztage welche sind, klärt die\n'
      + '  Sprechstunde.',
  },
  {
    neu: ' Bei einer Migräne können Übelkeit\n'
      + '  und Erbrechen zum Anfall gehören, und manche müssen sich hinlegen –\n'
      + '  das kann den Bauch an solchen Tagen schlechter aussehen lassen; mit\n'
      + '  Reflux oder Zwerchfellbruch können Beschwerden im Liegen zusätzlich\n'
      + '  zunehmen. Ein Bauchwert an einem Kopfschmerztag sagt deshalb wenig\n'
      + '  über das Essen davor. Ob ein Mittel beteiligt ist, zeigt dieser\n'
      + '  Vergleich nicht – er trennt Anfall und Mittel nicht.',
    alt: ' Übelkeit, Erbrechen,\n'
      + '  Nüchternbleiben und stundenlanges Liegen gehören zu einem Anfall –\n'
      + '  das allein reicht, damit der Bauch an solchen Tagen schlechter\n'
      + '  aussieht; mit Reflux oder Zwerchfellbruch erst recht. Ein Bauchwert\n'
      + '  an einem Kopfschmerztag sagt deshalb wenig über das Essen davor und\n'
      + '  nichts über das Mittel.',
  },
  {
    neu: ' Also niedriger. Body Check zählt\n  nur, was eingetragen ist – was an solchen Tagen gegessen und\n'
      + '  eingetragen wurde, kann vom Üblichen abweichen; die Zahl sagt wenig.',
    alt: ' Also niedriger. An solchen Tagen\n  wird oft wenig gegessen und wenig eingetragen; die Zahl sagt wenig.',
  },
  // Zyklus: Der Eisprung ist geschätzt, nicht gemessen.
  {
    neu: '  Nach Zyklusphase (aus den Blutungstagen geschätzt; Eisprung nicht gemessen):',
    alt: '  Nach Zyklusphase (geschätzt aus den Blutungstagen):',
  },
  {
    neu: '  (Phasen grob geschätzt aus den eingetragenen Blutungstagen;\n  den Eisprung misst Body Check nicht.)',
    alt: '  (Phasen geschätzt aus den eingetragenen Blutungstagen.)',
  },
  // Kriterien: Die Magenbeschwerden werden nur noch gezählt, ohne Rom-IV-Urteil
  // und ohne Kästchen; der GerdQ ohne Schwelle; der Vorbehalt so, wie die
  // Quellen ihn fassen. Das Urteil „nicht erfüllt" und die leeren Kästchen
  // sind das, was die Fassung 27 hier schrieb – ob es noch so gerechnet wird,
  // prüft die Rechnung `kriterien` oben Zeichen für Zeichen.
  {
    neu: '  Magenbeschwerden ab Stärke 4 (gezählt, keine Einordnung):\n    Druck, Völlegefühl oder früh satt:',
    alt: '  Rom IV, funktionelle Dyspepsie nicht erfüllt\n    [ ] Postprandiales Distress-Syndrom (PDS):',
  },
  { neu: '    Brennen oder Schmerz im Oberbauch:', alt: '    [ ] Epigastrisches Schmerzsyndrom (EPS):' },
  {
    neu: '    (aus den Einträgen gezählt, kein ausgefüllter Fragebogen)',
    alt: '    (ab 8 gilt eine Refluxkrankheit als wahrscheinlich)',
  },
  {
    neu: new RegExp('  Erfüllte Kriterien sind KEINE Diagnose\\. Von Reizdarm oder Reizmagen\\n'
      + '  wird erst gesprochen, wenn andere Ursachen der Beschwerden ärztlich\\n'
      + '  abgeklärt sind; auch der GerdQ-Wert ist keine Diagnose\\. Grundlage\\n'
      + '  sind (\\d+) notierte Tage der letzten (\\d+)\\. Die Angaben je Woche\\n'
      + '  beziehen sich nur auf diese notierten Tage; ob die Zahlen dadurch eher\\n'
      + '  zu hoch oder zu niedrig ausfallen, lässt sich nicht sagen\\.', 'g'),
    alt: (z, notiert, von) => '  Erfüllte Kriterien sind KEINE Diagnose. Beide Regelwerke setzen\n'
      + '  voraus, dass nichts Organisches dahintersteckt. Grundlage sind\n'
      + `  ${notiert} notierte Tage der letzten ${von}; ein Tagebuch untererfasst,\n`
      + '  die Zahlen sind daher eher zu niedrig als zu hoch.',
  },
];

/** Wie oft jede Regel gegriffen hat – über beide Tagebücher. */
const gegriffen = new Map([...TEXTE, ...BERICHT].map((r) => [r, 0]));

/** Ein Text einer Rechnung mit dem Wortlaut der Fassung 27. */
function textZurueck(t, wo) {
  return TEXTE.reduce((s, r) => {
    if (!r.wo.includes(wo) || !(r.teil ? s.includes(r.neu) : s === r.neu)) return s;
    gegriffen.set(r, gegriffen.get(r) + 1);
    return r.teil ? s.split(r.neu).join(r.alt) : r.alt;
  }, t);
}

/** Alle Texte in einem Ergebnis, sonst nichts – Zahlen bleiben, wie sie sind. */
function texteZurueck(x, wo) {
  if (typeof x === 'string') return textZurueck(x, wo);
  if (Array.isArray(x)) return x.map((y) => texteZurueck(y, wo));
  if (x && typeof x === 'object') return Object.fromEntries(Object.entries(x).map(([k, v]) => [k, texteZurueck(v, wo)]));
  return x;
}

/** Ein Bericht mit dem Wortlaut der Fassung 27. */
function berichtZurueck(t) {
  return BERICHT.reduce((s, r) => {
    let mal = 0;
    let raus;
    if (typeof r.neu === 'string') {
      const teile = s.split(r.neu);
      mal = teile.length - 1;
      raus = teile.join(r.alt);
    } else {
      raus = s.replace(r.neu, (...m) => {
        mal += 1;
        return r.alt(...m);
      });
    }
    gegriffen.set(r, gegriffen.get(r) + mal);
    return raus;
  }, t);
}

/** Die Rechnungen von heute, mit dem Wortlaut der Fassung 27. */
function zurueck(jetzt) {
  // Über JSON, wie der Vergleich unten: NaN und undefined wie dort.
  const roh = JSON.parse(JSON.stringify(jetzt));
  const raus = { ...roh };
  ['raete', ...MIT_ORT].forEach((k) => { raus[k] = texteZurueck(roh[k], k); });
  raus.arztBericht = roh.arztBericht.map(berichtZurueck);
  return raus;
}

/** Das Gold ohne das entfallene Feld `ort` – und wie oft es dastand. */
function ohneOrt(rechnungen) {
  let weg = 0;
  const ohne = (x) => {
    if (Array.isArray(x)) return x.map(ohne);
    if (!x || typeof x !== 'object') return x;
    return Object.fromEntries(Object.entries(x).filter(([k]) => {
      if (k !== 'ort') return true;
      weg += 1;
      return false;
    }).map(([k, v]) => [k, ohne(v)]));
  };
  const raus = { ...rechnungen };
  MIT_ORT.forEach((k) => { raus[k] = ohne(rechnungen[k]); });
  return { raus, weg };
}

/* ---------- G5: zeichengleich ---------- */

/*
 * Eine Ausnahme gibt es, und nur für den Bericht: Zeilen, die schon in der
 * Fassung 27 80 Zeichen oder mehr hatten, bricht die Fassung 28 um – der
 * Zettel wird ausgedruckt, und dort sind sie abgeschnitten. Jede kürzere Zeile
 * muss Zeichen für Zeichen gleich sein. Eine lange Zeile muss als mehrere
 * Zeilen unter 80 Zeichen wiederkommen, die mit ihrem Anfang beginnen und
 * ohne Leerraum gelesen genau ihre Zeichen in derselben Reihenfolge ergeben.
 * Nichts darf dazukommen, nichts fehlen.
 *
 * @returns {{ gleich: boolean, umbrochen: number, wo: string }}
 */
function berichtGleich(alt, neu) {
  const a = alt.split('\n');
  const b = neu.split('\n');
  const ohneLeer = (t) => t.replace(/\s+/g, '');
  let j = 0;
  let umbrochen = 0;
  for (let i = 0; i < a.length; i++) {
    if (a[i].length < 80) {
      if (b[j] !== a[i]) return { gleich: false, umbrochen, wo: `Zeile ${i + 1}: „${a[i]}“ / „${b[j]}“` };
      j += 1;
    } else {
      const ziel = ohneLeer(a[i]);
      const start = j;
      let gelesen = '';
      while (j < b.length && gelesen.length < ziel.length && b[j].length < 80) {
        gelesen += ohneLeer(b[j]);
        j += 1;
      }
      if (gelesen !== ziel || j - start < 2 || !a[i].startsWith(b[start])) {
        return { gleich: false, umbrochen, wo: `lange Zeile ${i + 1}: „${a[i]}“` };
      }
      umbrochen += 1;
    }
  }
  if (j !== b.length) return { gleich: false, umbrochen, wo: `danach noch „${b[j]}“` };
  return { gleich: true, umbrochen, wo: '' };
}

for (const saat of GOLD_SAATEN) {
  // eslint-disable-next-line no-await-in-loop
  const heute = await alleRechnungen(ROOT, tagebuch(saat));
  // Fassung 30 (siehe oben): kein Ort mehr, und der Wortlaut der Fassung 27 zurück.
  const mitOrt = MIT_ORT.filter((k) => JSON.stringify(heute[k]).includes('"ort":'));
  const { raus: alt, weg } = ohneOrt(gold.rechnungen[saat]);
  check(mitOrt.length === 0 && weg > 0,
    `Tagebuch ${saat}: kein Ort aus dem Zeitabstand mehr (im Gold ${weg}×, heute in ${mitOrt.join(', ') || 'keiner Rechnung'})`);
  const jetzt = zurueck(heute);
  check(
    JSON.stringify(Object.keys(jetzt)) === JSON.stringify(Object.keys(alt)),
    `Tagebuch ${saat}: dieselben Rechnungen wie im Gold`,
  );
  // Der Bericht für sich (siehe oben), alle übrigen Rechnungen zeichengleich.
  const berichte = alt.arztBericht.map((t, i) => berichtGleich(t, jetzt.arztBericht[i] || ''));
  const umbrochen = berichte.reduce((s, x) => s + x.umbrochen, 0);
  check(
    berichte.every((x) => x.gleich) && umbrochen > 0
      && heute.arztBericht.every((t) => !/^.{80,}$/m.test(t)),
    `Tagebuch ${saat}: der Bericht ist zeilengleich mit der Fassung 27 – nur ${umbrochen} Zeilen, die dort `
      + `80 Zeichen oder mehr hatten, sind umbrochen${berichte.filter((x) => !x.gleich).map((x) => ` – ${x.wo}`).join('')}`,
  );
  const anders = Object.keys(alt).filter((k) => k !== 'arztBericht'
    && JSON.stringify(jetzt[k]) !== JSON.stringify(alt[k]));
  check(
    anders.length === 0,
    `Tagebuch ${saat}: alle ${Object.keys(alt).length - 1} übrigen Rechnungen zeichengleich mit der Fassung 27`
      + `${anders.length ? ` – anders: ${anders.join(', ')}` : ''}`,
  );
  // Bei einem Unterschied die Stelle zeigen – sonst sucht man im Dunkeln.
  anders.slice(0, 3).forEach((k) => {
    const a = JSON.stringify(alt[k]);
    const b = JSON.stringify(jetzt[k]);
    let i = 0;
    while (i < a.length && a[i] === b[i]) i += 1;
    console.log(`     ${k}: …${a.slice(Math.max(0, i - 60), i + 60)}\n       jetzt …${b.slice(Math.max(0, i - 60), i + 60)}`);
  });
}

// Jede Regel der Fassung 30 hat etwas zu tun – sonst gehört sie gestrichen.
{
  const nie = [...gegriffen].filter(([, n]) => n === 0).map(([r]) => `„${String(r.neu).slice(0, 40)}…“`);
  check(nie.length === 0,
    `jede der ${gegriffen.size} Regeln für den Wortlaut der Fassung 30 greift${nie.length ? ` – nie: ${nie.join(', ')}` : ''}`);
}

ende();
