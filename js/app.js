/*
 * Die Anzeige. Alles, was man sieht und antippt, steht hier.
 *
 * Aufbau in einem Satz: Ein Zustand im Speicher, eine Funktion, die daraus
 * HTML macht, und ein einziger Klick-Empfänger für alles. Kein Rahmenwerk,
 * keine Abhängigkeit, kein Bauschritt – index.html im Browser öffnen genügt.
 *
 * Was hier *nicht* steht, ist das Rechnen. Ob ein Auslöser auffällig ist,
 * entscheidet js/auswertung.js, und zwar ohne von dieser Datei zu wissen. Die
 * Richtung hält nur, solange sie geprüft wird – dafür gibt es
 * tools/pruefung/schichten.py.
 */
import * as store from './store.js';
import {
  fmtDatum, fmtMonat, fmtTag, heuteISO, jetztUhr, monatsRaster, monatsStart,
  plusMonate, plusTage, tageDazwischen, WOCHE_KOPF,
} from './datum.js';
import { esc, fmtZahl, kuerze, mehrzahl } from './text.js';
import {
  AUSLOESER, BESCHWERDEN, BRISTOL, MITTEL_VORSCHLAEGE, PORTIONEN, ROLLEN,
  ROLLE_VORGABE, STAERKE_WORT, STUHLBEZUG, TAGESFRAGEN, ausloeserName,
  beschwerdeName, bristolName, eigeneId, klasseName, rolleName, sichtbareFragen,
} from './daten.js';
import {
  artAnteil, ausloeserBilanz, einstufung, EINSTUFUNG_WORT, essensbezug,
  faktorBilanz, gesamtZahlen, haeufigeMahlzeiten, haeufigeZutaten,
  klasseZutaten, klassenBilanz, klassenEinstufung, nachArt, nachTageszeit,
  bewerteteMahlzeiten, rollenBilanz, serieOhne, stundenSeitEssen, tagesWert,
  trend, TREND_WORT,
  verlaufReihe, zutatenVon,
} from './auswertung.js';
import { entschluesseln, istTresor, tresorMoeglich, verschluesseln } from './tresor.js';
import { bezugBilanz, stuhlZahlen } from './stuhl.js';
import { genugFuerKriterien, kriterien } from './kriterien.js';
import {
  DAUER_VORSCHLAEGE, VERSUCH_URTEIL, betrifft, ergebnis, phase, versuchStand,
  vorschlaege,
} from './versuch.js';
import { ANSPRECHEN_URTEIL, befund, mittelBilanz } from './ansprechen.js';
import { luecken } from './luecken.js';
import { vergleichBalken, verlaufTafel } from './chart.js';
import { arztBericht, berichtName } from './bericht.js';
import { MITTEL_WISSEN, REIZSTOFFE, wissenZu } from './mittel.js';
import {
  belastbar, heutigerStand, mittlereLaenge, phasenBilanz, phasenName, schwankung,
} from './zyklus.js';
import { WARNZEICHEN, bildLesen, genugFuerBild } from './bild.js';
import { fragenVorschlagen } from './unterleib.js';
import { haeltStand, SCHICHT_WORT } from './schichten.js';
import {
  fensterWerte, spaeteFunde, zeitBild, zeitProfil,
} from './zeitprofil.js';
import { phasenUrteil, wechselnde } from './wechselwirkung.js';
import { wasSacheIst } from './lage.js';
import { spielraumSatz } from './zufall.js';
import { dosisBild, DOSIS_WORT } from './dosis.js';
import { gewichtsBild, GEWICHT_WORT } from './gewicht.js';
import {
  NICHT_BEI_ALLERGIE, PRUEFBAR, naechsterSchritt, provokationsBild,
} from './provokation.js';
import { BEREICH_ICON, BEREICH_NAME, raete } from './rat.js';
import { UEBUNGEN, ablauf, dauerText, gesamtDauer, uebungVon } from './atem.js';
import { KLAENGE, ruettel, weckKlang } from './klang.js';
import { BEDENKZEIT, schicken } from './briefkasten.js';

const viewEl = document.getElementById('view');
const tabbarEl = document.getElementById('tabbar');
const toastEl = document.getElementById('toast');

const REITER = [
  { id: 'heute', name: 'Tag', icon: '📓' },
  { id: 'verlauf', name: 'Verlauf', icon: '📅' },
  { id: 'muster', name: 'Muster', icon: '🔍' },
  { id: 'ruhe', name: 'Ruhe', icon: '🌬️' },
  { id: 'ideen', name: 'Ideen', icon: '💡' },
  { id: 'mehr', name: 'Mehr', icon: '⚙️' },
];

const THEMEN = [
  { id: 'rosa', name: 'Rosé' },
  { id: 'flieder', name: 'Flieder' },
  { id: 'koralle', name: 'Koralle' },
  { id: 'salbei', name: 'Salbei' },
];

/*
 * Flüchtiger Zustand: der angesehene Tag, der offene Bogen, der erzeugte
 * Bericht. Bewusst nicht im Speicher – wer die App morgen wieder aufmacht,
 * will beim heutigen Tag anfangen und nicht dort, wo er zuletzt geblättert
 * hat.
 */
const ui = {
  tag: heuteISO(),
  monat: monatsStart(heuteISO()),
  zeitraum: 30,
  bogen: null,      // { art, id, entwurf } – der offene Eingabebogen
  bericht: null,    // erzeugter Berichtstext, solange er angezeigt wird
  // Die Sicherung als Text, solange sie offen steht. Sie gibt es zusätzlich
  // zur Datei, weil ein Herunterladen nicht überall geht: eingebettete
  // Ansichten, der Browser in einer Messenger-App, manche Verwaltungsgeräte.
  // Dort wäre die einzige Kopie, die es je geben wird, sonst nicht erreichbar.
  sicherung: null,
  // Steht die Passwortabfrage offen, und was ist eingetippt? Das Passwort
  // steht nur hier und nirgends sonst: im Speicher abgelegt wäre es dasselbe,
  // als läge die Sicherung wieder offen da.
  schloss: false,
  tresorWort: '',
  // Der eingefügte Text einer Sicherung – siehe einfuegeKarte().
  einfuegen: null,
  // Hat der Browser zugesagt, diesen Speicher nicht wegzuräumen? null heißt
  // „weiß man nicht", und das wird auch so angezeigt statt beruhigt.
  speicher: null,
  mittel: false,    // steht die ganze Mittelübersicht offen?
  // Die laufende Atemübung: { schritte, i, bisMs, uhr, wecker }. Nicht im
  // Speicher – eine Übung, die beim nächsten Öffnen weiterliefe, wäre keine.
  atem: null,
};

/*
 * Auf den Startbildschirm – als App, nicht als Lesezeichen.
 *
 * Android meldet über 'beforeinstallprompt', dass die Seite installierbar ist,
 * und lässt den Dialog *einmal* über dieses Ereignis auslösen. Ohne das liegt
 * die Installation im Browsermenü unter einem Punkt, den niemand sucht – und
 * eine App, die man nicht findet, wird nicht benutzt.
 *
 * Safari kennt das Ereignis nicht; dort geht es nur von Hand über „Teilen".
 * Deshalb steht dort ein Satz statt eines Knopfes.
 */
let installEreignis = null;

function laeuftAlsApp() {
  try {
    return window.matchMedia('(display-mode: standalone)').matches
      || window.navigator.standalone === true;
  } catch {
    return false;
  }
}

const istApfel = () => /iphone|ipad|ipod/i.test(navigator.userAgent || '');

function installKarte() {
  if (laeuftAlsApp()) {
    return `<div class="karte">
      <h3>Läuft als App</h3>
      <p class="klein">Du hast Bauchbuch auf dem Startbildschirm. Es öffnet
      sich ohne Browserleiste und läuft ohne Netz.</p>
    </div>`;
  }
  if (installEreignis) {
    return `<div class="karte karte-merk">
      <h3>Auf den Startbildschirm</h3>
      <p class="klein">Dann liegt Bauchbuch als eigenes Symbol zwischen deinen
      Apps, öffnet sich ohne Browserleiste und startet auch ohne Netz.</p>
      ${knopf('installieren', 'Installieren', 'btn-primary btn-block')}
    </div>`;
  }
  return `<div class="karte">
    <h3>Auf den Startbildschirm</h3>
    <p class="klein">${istApfel()
    ? 'Unten auf <b>Teilen</b> tippen, dann <b>Zum Home-Bildschirm</b>. '
      + 'Danach liegt Bauchbuch als eigenes Symbol zwischen deinen Apps.'
    : 'Im Browsermenü (die drei Punkte) auf <b>App installieren</b> oder '
      + '<b>Zum Startbildschirm hinzufügen</b>. Danach liegt Bauchbuch als '
      + 'eigenes Symbol zwischen deinen Apps.'}</p>
  </div>`;
}

let toastUhr = null;
function melden(text) {
  toastEl.textContent = text;
  toastEl.classList.add('an');
  clearTimeout(toastUhr);
  toastUhr = setTimeout(() => toastEl.classList.remove('an'), 2400);
}

/* ==================== Bausteine ==================== */

const knopf = (act, text, klasse = '', extra = '') => `<button type="button" class="btn ${klasse}" data-act="${act}" ${extra}>${text}</button>`;

/** Eine Reihe an- und abwählbarer Marken. */
function marken(liste, gewaehlt, act) {
  return `<div class="marken">${liste.map((m) => `
    <button type="button" class="marke${gewaehlt.includes(m.id) ? ' an' : ''}"
            data-act="${act}" data-id="${esc(m.id)}" aria-pressed="${gewaehlt.includes(m.id)}">
      ${m.icon ? `<span class="marke-i">${m.icon}</span>` : ''}${esc(m.name)}
    </button>`).join('')}</div>`;
}

/** Die Skala von 0 bis 10. Elf Knöpfe statt eines Schiebereglers: Ein Regler
 *  trifft man auf dem Handy nicht genau, und „war es jetzt 6 oder 7" ist
 *  genau die Frage, die eine Eintragung wertlos macht. */
function skala(wert) {
  let raus = '<div class="skala" role="group" aria-label="Stärke von 0 bis 10">';
  for (let i = 0; i <= 10; i++) {
    const stufe = i === 0 ? 'null' : (i >= 7 ? 'hoch' : (i >= 4 ? 'mittel' : 'tief'));
    raus += `<button type="button" class="stufe s-${stufe}${i === wert ? ' an' : ''}"
      data-act="staerke" data-n="${i}" aria-pressed="${i === wert}"
      aria-label="Stärke ${i}: ${STAERKE_WORT[i]}">${i}</button>`;
  }
  return `${raus}</div><p class="skala-wort">${STAERKE_WORT[wert] ?? ''}</p>`;
}

/**
 * Eine Tagesfrage als Reihe von Stufen. `null` heißt: nicht beantwortet.
 *
 * Ein zweites Tippen auf dieselbe Stufe nimmt die Antwort zurück – „ich habe
 * nichts eingetragen" und „ich habe null eingetragen" müssen verschiedene
 * Dinge bleiben, sonst zählt die Auswertung Nichtwissen als Wohlbefinden.
 */
function tagesFrage(frage, wert) {
  return `<p class="feld-name">${esc(frage.name)}</p>
    <div class="vier">${frage.worte.map((w, i) => `
      <button type="button" class="vier-btn${wert === i ? ' an' : ''}"
              data-act="tagfrage" data-id="${frage.id}" data-n="${i}"
              aria-pressed="${wert === i}">${esc(w)}</button>`).join('')}</div>`;
}

/* ==================== Reiter: Tag ==================== */

const ART_NAME = {
  essen: 'Mahlzeit', beschwerde: 'Beschwerden', stuhl: 'Stuhlgang',
  medikament: 'Medikament', notiz: 'Notiz',
};
const ART_ICON = {
  essen: '🍽️', beschwerde: '🔥', stuhl: '🚽', medikament: '💊', notiz: '✏️',
};

function zeileText(e, eigene) {
  if (e.art === 'essen') {
    // Die Rolle steht nur dabei, wenn sie nicht die Vorgabe ist – „Kaffee
    // (Haupt)" bei jedem Kaffee wäre Lärm, „Zwiebel (Würze)" ist die Auskunft.
    const zutaten = zutatenVon(e).map((z) => ausloeserName(z.id, eigene)
      + (z.rolle === ROLLE_VORGABE ? '' : ` (${rolleName(z.rolle, true)})`)).join(', ');
    const portion = e.portion && e.portion !== 'normal' ? ` · ${e.portion === 'gross' ? 'große' : 'kleine'} Portion` : '';
    return `<b>${esc(kuerze(e.was || 'Mahlzeit'))}</b>${portion}`
      + (zutaten ? `<span class="zeile-tags">${esc(zutaten)}</span>` : '');
  }
  if (e.art === 'beschwerde') {
    const arten = (e.arten || []).map(beschwerdeName).join(', ');
    const bezug = STUHLBEZUG.find((b) => b.id === e.stuhlbezug);
    return `<b>Stärke ${e.staerke} – ${STAERKE_WORT[e.staerke] || ''}</b>`
      + (arten ? `<span class="zeile-tags">${esc(arten)}</span>` : '')
      + (bezug && e.stuhlbezug !== 'keiner' ? `<span class="zeile-tags">Stuhlgang: ${esc(bezug.name.toLowerCase())}</span>` : '')
      + (e.notiz ? `<span class="zeile-tags">${esc(kuerze(e.notiz))}</span>` : '');
  }
  if (e.art === 'stuhl') {
    const zusatz = [e.dringend ? 'dringend' : '', e.unvollstaendig ? 'Gefühl, nicht fertig' : '']
      .filter(Boolean).join(', ');
    return `<b>Typ ${e.form} – ${esc(bristolName(e.form, true))}</b>`
      + (zusatz ? `<span class="zeile-tags">${esc(zusatz)}</span>` : '');
  }
  if (e.art === 'medikament') {
    return `<b>${esc(e.mittel || 'Medikament')}</b>`
      + (e.dosis ? `<span class="zeile-tags">${esc(e.dosis)}</span>` : '');
  }
  return `<b>${esc(kuerze(e.text || '', 90))}</b>`;
}

function tagAnsicht(s) {
  const iso = ui.tag;
  const liste = s.eintraege.filter((e) => e.am === iso);
  const t = tagesWert(s.eintraege, iso, s.tage);
  const tagInfo = store.tagLesen(iso);
  const kuenftig = tageDazwischen(heuteISO(), iso) > 0;

  const kopf = `<div class="tagkopf">
    ${knopf('tag-blaettern', '‹', 'btn-rund', 'data-d="-1" aria-label="Tag zurück"')}
    <div class="tagkopf-mitte">
      <h2>${esc(fmtTag(iso))}</h2>
      <input type="date" class="tag-datum" data-act="tag-datum" value="${iso}"
             max="${heuteISO()}" aria-label="Datum wählen">
    </div>
    ${knopf('tag-blaettern', '›', 'btn-rund', `data-d="1" ${kuenftig || iso === heuteISO() ? 'disabled' : ''} aria-label="Tag vor"`)}
  </div>`;

  /*
   * Die häufigsten Mahlzeiten als Direkttaste – ein Tipp statt fünf.
   *
   * Der Bogen ist gut, wenn man etwas Neues einträgt. Für den Haferbrei, den
   * sie jeden Morgen isst, ist er fünf Handgriffe für null neue Auskunft. Hier
   * wird derselbe Eintrag mit einem Tipp angelegt, vollständig samt Zutaten,
   * Rollen und Portion, mit der aktuellen Uhrzeit.
   *
   * Das ist keine Bequemlichkeit, sondern der Punkt, an dem Tagebücher
   * sterben: Nicht ein Fehler in der Auswertung bringt sie um, sondern dass
   * nach drei Wochen niemand mehr etwas einträgt. Erst ab zwei Vorkommen –
   * eine Mahlzeit, die es einmal gab, ist keine Gewohnheit.
   */
  const schnell = iso === heuteISO()
    ? haeufigeMahlzeiten(s.eintraege, 12).filter((v) => v.anzahl >= 2).slice(0, 3) : [];
  const schnellReihe = schnell.length ? `<div class="schnell">
    <p class="feld-name">Noch mal wie immer</p>
    <div class="marken marken-eng">${schnell.map((v, i) => `
      <button type="button" class="marke marke-schnell" data-act="schnell" data-i="${i}">
        ${esc(kuerze(v.text, 22))} <span class="marke-zahl">${v.anzahl}×</span>
      </button>`).join('')}</div>
  </div>` : '';

  const anlegen = `<div class="anlegen">
    ${['essen', 'beschwerde', 'stuhl', 'medikament', 'notiz'].map((a) => `
      <button type="button" class="anlegen-btn a-${a}" data-act="neu" data-art="${a}">
        <span class="anlegen-i">${ART_ICON[a]}</span>${ART_NAME[a]}
      </button>`).join('')}
  </div>`;

  const zeilen = liste.length ? `<ul class="strang">${liste.map((e) => `
    <li class="strang-zeile z-${e.art}">
      <span class="strang-uhr">${esc(e.um)}</span>
      <span class="strang-punkt" aria-hidden="true">${ART_ICON[e.art]}</span>
      <button type="button" class="strang-text" data-act="bearbeiten" data-id="${e.id}">
        ${zeileText(e, s.eigeneAusloeser)}
      </button>
      <button type="button" class="strang-weg" data-act="loeschen" data-id="${e.id}"
              aria-label="Eintrag löschen">×</button>
    </li>`).join('')}</ul>`
    : `<p class="leer">Für ${esc(fmtTag(iso))} ist noch nichts eingetragen.</p>`;

  const bilanz = t.notiert ? `<div class="karte tagbilanz">
    <div class="gross ${t.wert === 0 ? 'gut' : (t.wert >= 7 ? 'schlecht' : 'mittel')}">
      ${t.wert === 0 ? 'beschwerdefrei' : `Stärke ${t.wert}`}
    </div>
    <p class="klein">${mehrzahl(t.mahlzeiten, 'Mahlzeit', 'Mahlzeiten')},
      ${mehrzahl(t.anzahl, 'Beschwerde', 'Beschwerden')}${t.medikamente ? `, ${mehrzahl(t.medikamente, 'Medikament', 'Medikamente')}` : ''}</p>
  </div>` : '';

  const fragen = sichtbareFragen(s.tagesfragen);
  const umstaende = fragen.length ? `<div class="karte">
    <h3>Wie war der Tag sonst?</h3>
    ${fragen.map((f) => tagesFrage(f, tagInfo[f.id] === undefined ? null : tagInfo[f.id])).join('')}
    <p class="klein">Welche Fragen hier stehen, wählst du unter „Mehr".</p>
  </div>` : '';

  const stand = heutigerStand(s.tage, iso);
  const zyklusZeile = stand ? `<p class="klein zyklus-zeile">
    Zyklustag ${stand.tag}${stand.phase ? ` · ${esc(phasenName(stand.phase))}` : ''}
    ${stand.laenge ? ` · deine Zyklen dauern im Mittel ${stand.laenge} Tage` : ''}
  </p>` : '';

  return kopf + sicherungKarte(iso) + versuchZeile(s, iso) + provokationZeile(s, iso) + bilanz + zyklusZeile
    + (iso === heuteISO() ? ratKarte(s) : '') + schnellReihe + anlegen + zeilen + umstaende;
}

/**
 * Der laufende Auslassversuch, auf dem Reiter, den man täglich sieht.
 *
 * Ein Versuch, an den man sich nicht erinnert, ist keiner. Deshalb steht hier
 * jeden Tag, was heute gilt und der wievielte Tag es ist – und wenn die
 * Auslasszeit um ist, der Knopf für die Wiedereinführung. Das ist der Moment,
 * an dem der Versuch sonst versandet: Zwei Wochen durchgehalten, dann nie
 * bewusst wieder gegessen, und damit war alles umsonst.
 */
function versuchZeile(s, iso) {
  const v = s.versuch;
  if (!v || iso !== heuteISO()) return '';
  const st = versuchStand(v, heuteISO());
  if (st.phase === 'abgebrochen' || st.phase === 'fertig') return '';
  const was = v.art === 'klasse' ? klasseName(v.ziel) : ausloeserName(v.ziel, s.eigeneAusloeser);

  if (st.phase === 'reif') {
    return `<div class="karte karte-merk versuch-zeile">
      <h3>Der Versuch ist reif</h3>
      <p class="klein">${st.von} Tage ohne ${esc(was)} sind um. Jetzt kommt der
      Teil, auf den es ankommt: einmal bewusst wieder essen. Kommen die
      Beschwerden zurück, ist das der Beleg – bleibt es ruhig, war es nicht das.</p>
      <div class="reihe">
        ${knopf('versuch-provokation', 'Heute wieder gegessen', 'btn-primary')}
        ${knopf('versuch-beenden', 'Abbrechen', 'btn-ghost')}
      </div>
    </div>`;
  }
  const heutigeVerstoesse = s.eintraege
    .filter((e) => e.am === iso && betrifft(e, v.art, v.ziel)).length;
  return `<div class="karte versuch-zeile">
    <h3>${st.phase === 'provokation' ? 'Wiedereinführung' : 'Auslassversuch'}</h3>
    <p class="klein">${st.phase === 'provokation'
    ? `Noch ${mehrzahl(st.rest, 'Tag', 'Tage')} beobachten. Einfach weiter eintragen wie sonst.`
    : `Tag ${st.tag} von ${st.von} – heute ohne <b>${esc(was)}</b>.`
      + (heutigeVerstoesse ? ` Heute steht es ${heutigeVerstoesse}× im Tagebuch; das ist kein Vorwurf, es geht nur in die Auswertung ein.` : '')}</p>
    ${knopf('versuch-beenden', 'Abbrechen', 'btn-ghost')}
  </div>`;
}

/**
 * Der laufende Provokationstest, auf dem Tagesreiter.
 *
 * Anders als beim Auslassversuch besteht dieser Test nicht aus Durchhalten,
 * sondern aus einzelnen Terminen, die man sich selbst setzt – und genau daran
 * scheitert er ohne diese Zeile. Sie sagt jeden Morgen eines von drei Dingen:
 * heute dran, heute nicht (weil der letzte Durchgang nachhallt), oder: jetzt
 * fehlt noch der Leerdurchgang.
 */
function provokationZeile(s, iso) {
  const p = s.provokation;
  if (!p || p.beendet || iso !== heuteISO()) return '';
  const schritt = naechsterSchritt(p, heuteISO());
  if (!schritt || !schritt.dran) {
    return schritt ? `<div class="karte provokation-zeile">
      <h3>Provokationstest</h3>
      <p class="klein">${esc(schritt.satz)}</p>
    </div>` : '';
  }
  return `<div class="karte karte-merk provokation-zeile">
    <h3>${schritt.leer ? 'Heute der Leerdurchgang' : 'Heute ein Durchgang'}</h3>
    <p class="klein">${esc(schritt.satz)}</p>
    <div class="reihe">
      ${knopf(schritt.leer ? 'prov-leer' : 'prov-lauf',
    schritt.leer ? 'Leerdurchgang gemacht' : 'Jetzt genommen', 'btn-primary')}
    </div>
  </div>`;
}

/**
 * Die Erinnerung an die Sicherung – dort, wo sie jemand sieht.
 *
 * Unter „Mehr" steht seit jeher, wann zuletzt gesichert wurde. Nur macht
 * niemand „Mehr" auf, um sich Sorgen zu holen. Diese Karte steht auf dem
 * Reiter, den man täglich sieht, und sie geht mit einem Tipp wieder weg –
 * für sieben Tage, nicht für immer. Es ist die einzige Kopie, die es von
 * diesem Tagebuch je geben wird.
 */
function sicherungKarte(iso) {
  if (iso !== heuteISO()) return '';
  const f = store.sicherungFaellig();
  if (!f) return '';
  const satz = {
    nie: `Du hast ${mehrzahl(f.neue, 'Eintrag', 'Einträge')} und noch nie gesichert.`,
    anzahl: `Seit der letzten Sicherung sind ${mehrzahl(f.neue, 'Eintrag', 'Einträge')} dazugekommen.`,
    zeit: `Die letzte Sicherung ist ${mehrzahl(f.seit, 'Tag', 'Tage')} her, seitdem `
      + `${mehrzahl(f.neue, 'neuer Eintrag', 'neue Einträge')}.`,
  }[f.grund];
  return `<div class="karte karte-merk">
    <h3>Zeit für eine Sicherung</h3>
    <p class="klein">${satz} Alles liegt nur in diesem Browser – wird sein
    Speicher gelöscht, ist das Tagebuch weg. Dauert zehn Sekunden.</p>
    <div class="reihe">
      ${knopf('export', 'Als Datei', 'btn-primary')}
      ${knopf('sicherung-text', 'Als Text')}
      ${knopf('sicherung-spaeter', 'Später', 'btn-ghost')}
    </div>
  </div>`;
}

/**
 * Die Vorschläge für heute.
 *
 * Jeder trägt sein „warum" sichtbar mit sich, und woher es kommt: aus ihrem
 * eigenen Verlauf oder aus dem, was allgemein empfohlen wird. Ohne diese
 * Unterscheidung wäre beides gleich viel wert, und das ist es nicht.
 */
function ratKarte(s) {
  const letzteMahlzeit = [...s.eintraege].reverse().find((e) => e.art === 'essen');
  const mittel = new Map();
  s.eintraege.filter((e) => e.art === 'medikament').forEach((e) => {
    const name = String(e.mittel || '').trim();
    if (name) mittel.set(name, e.am);
  });

  const liste = raete({
    eintraege: s.eintraege,
    tage: s.tage,
    heute: heuteISO(),
    eigene: s.eigeneAusloeser,
    bilanz: ausloeserBilanz(s.eintraege, {
      fenster: s.fenster, mindestFaelle: s.mindestFaelle, eigene: s.eigeneAusloeser,
    }),
    faktoren: Object.fromEntries(['stress', 'schlaf', 'stimmung']
      .map((id) => [id, faktorBilanz(s.eintraege, s.tage, id, tagesWert)])),
    phasen: phasenBilanz(s.eintraege, s.tage, tagesWert),
    letzteMahlzeitStunden: letzteMahlzeit
      ? stundenSeitEssen(s.eintraege, { am: heuteISO(), um: jetztUhr() }) : null,
    mittel: [...mittel.entries()].slice(-3).map(([name, am]) => ({ name, zuletzt: fmtDatum(am) })),
  });

  if (!liste.length) return '';
  return `<div class="karte rat">
    <h3>Für heute</h3>
    <ul class="raete">${liste.map((r) => `<li class="rat-${r.bereich}">
      <div class="rat-kopf">
        <span class="rat-i" aria-hidden="true">${BEREICH_ICON[r.bereich]}</span>
        <b>${esc(r.titel)}</b>
        <span class="rat-quelle q-${r.quelle}">${r.quelle === 'eigen' ? 'aus deinem Verlauf' : 'allgemein'}</span>
      </div>
      <p>${esc(r.text)}</p>
      <p class="klein">${esc(r.warum)}</p>
    </li>`).join('')}</ul>
    <p class="klein">„Aus deinem Verlauf" heißt: aus deinen eigenen Eintragungen
    gerechnet, mit den Zahlen daneben. „Allgemein" heißt: gilt für einen
    Durchschnitt, den es nicht gibt – dein eigener Verlauf sticht das.</p>
  </div>`;
}

/* ==================== Reiter: Verlauf ==================== */

function verlaufAnsicht(s) {
  const bis = heuteISO();
  const von = plusTage(bis, -(ui.zeitraum - 1));
  const reihe = verlaufReihe(s.eintraege, von, bis, s.tage);
  const z = gesamtZahlen(s.eintraege, s.tage, von, bis);
  const serie = serieOhne(s.eintraege, s.tage, bis);

  const wahl = `<div class="wahl">${[14, 30, 90].map((n) => `
    <button type="button" class="wahl-btn${ui.zeitraum === n ? ' an' : ''}"
            data-act="zeitraum" data-n="${n}">${n} Tage</button>`).join('')}</div>`;

  const zahlen = `<div class="kacheln">
    <div class="kachel"><b>${z.notierteTage}</b><span>Tage notiert</span></div>
    <div class="kachel"><b>${z.notierteTage ? `${Math.round(z.anteil * 100)} %` : '–'}</b><span>davon mit Beschwerden</span></div>
    <div class="kachel"><b>${z.notierteTage ? fmtZahl(z.schnitt) : '–'}</b><span>Stärke im Mittel</span></div>
    <div class="kachel"><b>${serie}</b><span>${serie === 1 ? 'Tag' : 'Tage'} frei in Folge</span></div>
  </div>`;

  const richtung = trendKarte(s, bis);

  const tafel = z.notierteTage
    ? verlaufTafel(reihe, { titel: 'Stärkste Beschwerde je Tag', hinweis: '0 – 10' })
    : '<p class="leer">Noch keine Eintragungen in diesem Zeitraum.</p>';

  // --- Monatsraster ---
  const felder = monatsRaster(ui.monat).map((iso) => {
    const t = tagesWert(s.eintraege, iso, s.tage);
    const fremd = iso.slice(0, 7) !== ui.monat.slice(0, 7);
    const stufe = !t.notiert ? 'leer' : (t.wert === 0 ? 'gut' : (t.wert >= 7 ? 'schlecht' : (t.wert >= 4 ? 'mittel' : 'leicht')));
    return `<button type="button" class="rfeld f-${stufe}${fremd ? ' fremd' : ''}${iso === heuteISO() ? ' heute' : ''}"
      data-act="tag-waehlen" data-iso="${iso}"
      aria-label="${fmtDatum(iso, true)}: ${t.notiert ? (t.wert === 0 ? 'beschwerdefrei' : `Stärke ${t.wert}`) : 'nichts eingetragen'}">
      <span>${Number(iso.slice(8))}</span></button>`;
  }).join('');

  const raster = `<div class="karte">
    <div class="monatkopf">
      ${knopf('monat-blaettern', '‹', 'btn-rund', 'data-d="-1" aria-label="Monat zurück"')}
      <h3>${esc(fmtMonat(ui.monat))}</h3>
      ${knopf('monat-blaettern', '›', 'btn-rund', `data-d="1" ${monatsStart(heuteISO()) === ui.monat ? 'disabled' : ''} aria-label="Monat vor"`)}
    </div>
    <div class="wochekopf">${WOCHE_KOPF.map((w) => `<span>${w}</span>`).join('')}</div>
    <div class="raster">${felder}</div>
    <div class="legende">
      <span><i class="f-gut"></i> frei</span><span><i class="f-leicht"></i> 1–3</span>
      <span><i class="f-mittel"></i> 4–6</span><span><i class="f-schlecht"></i> 7–10</span>
      <span><i class="f-leer"></i> nichts eingetragen</span>
    </div>
  </div>`;

  return `${wahl}${zahlen}${richtung}<div class="karte">${tafel}</div>${raster}`;
}

/**
 * Wird es besser oder schlechter?
 *
 * Die Frage, die jeder stellt, der ein Tagebuch führt – und die diese App bis
 * eben nicht beantwortet hat: Alles war über den ganzen Zeitraum gemittelt.
 *
 * Sie steht auf dem Verlaufsreiter und nicht unter „Muster", weil sie keine
 * Einordnung ist, sondern eine Beobachtung. Und sie hält sich zurück: Eine
 * ganze Stufe Unterschied ist die Schwelle, darunter heißt es „kein
 * deutlicher Unterschied". Beschwerden schwanken von selbst, und aus jeder
 * Schwankung eine Richtung zu machen wäre ein Orakel, das mal grundlos Mut
 * macht und mal grundlos Angst.
 */
function trendKarte(s, bis) {
  const t = trend(s.eintraege, s.tage, bis, 14);
  if (!t.pruefbar) {
    return `<div class="karte">
      <h3>Wird es besser oder schlechter?</h3>
      <p class="klein">Dafür braucht es zweimal ${t.fenster} notierte Tage zum
      Vergleichen – noch ${mehrzahl(t.fehlt, 'Tag', 'Tage')} fehlen. Gezählt
      werden notierte Tage, nicht Kalendertage: Wer in einer schlechten Woche
      seltener einträgt, hätte sonst rechnerisch eine gute Woche.</p>
    </div>`;
  }
  return `<div class="karte trend t-${t.richtung}">
    <div class="fund-kopf">
      <h3>Wird es besser oder schlechter?</h3>
      <span class="fund-urteil">${TREND_WORT[t.richtung]}</span>
    </div>
    ${vergleichBalken(t.jetzt.schnitt, t.davor.schnitt,
    { mit: 'zuletzt', ohne: 'davor' })}
    <p class="klein">Die letzten ${t.jetzt.tage} notierten Tage gegen die
      ${t.davor.tage} davor · ${t.jetzt.frei} beschwerdefreie Tage gegen
      ${t.davor.frei}</p>
    <p class="klein">${t.richtung === 'gleich'
    ? 'Der Unterschied liegt unter einer Stufe. Das heißt nicht „nichts tut sich" – es heißt, dass sich aus diesen Zahlen keine Richtung ablesen lässt.'
    : 'Verglichen werden notierte Tage, nicht Kalendertage – eine Lücke im Tagebuch ist kein guter Tag. Beschwerden schwanken auch von selbst; eine Richtung über vier Wochen ist ein Hinweis, keine Gewissheit.'}</p>
  </div>`;
}

/* ==================== Reiter: Muster ==================== */

/*
 * Der Hinweis auf die Unterleibsfragen – und warum er nicht immer dasteht.
 *
 * Die drei Fragen (Schmerz beim Sex, tief oder außen, Regelschmerz) sind
 * standardmäßig aus. Das ist richtig: Eine App, die sich ungefragt nach dem
 * Sexleben erkundigt, wird zugeklappt, und dann ist auch alles andere weg.
 *
 * Nur hätte das eine Folge, die man kennt – niemand schaltet je etwas ein, das
 * er nicht kennt. Also fragt die App nach, aber erst, wenn ihre eigenen Daten
 * in diese Richtung zeigen: Blutungen eingetragen und der Bauch dabei
 * messbar schlechter. Dann ist der Hinweis eine Hilfe und keine
 * Zudringlichkeit, und er kann sagen, warum er kommt.
 *
 * Der Grund gehört dazu. „Schalt mal diese Fragen ein" ist übergriffig;
 * „dein Bauch ist an Blutungstagen um 1,8 Stufen schlechter, und es gibt
 * einen Zusammenhang, der oft jahrelang übersehen wird" ist eine Auskunft,
 * über die jemand selbst entscheiden kann.
 */
function unterleibVorschlag(s) {
  if (s.unterleibGefragt) return '';
  const v = fragenVorschlagen(s.eintraege, s.tage, tagesWert, s.tagesfragen);
  if (!v) return '';
  return `<div class="karte karte-merk">
    <h3>Zwei Fragen, die hier weiterhelfen könnten</h3>
    <p class="klein">An deinen Blutungstagen ist der Bauch im Mittel um
    <b>${v.differenz.toFixed(1).replace('.', ',')} Stufen</b> schlechter als
    sonst (${mehrzahl(v.blutungsTage, 'Blutungstag', 'Blutungstage')} verglichen).
    Das ist häufig und für sich genommen harmlos.</p>
    <p class="klein">Es gibt aber eine Ursache, bei der genau dieses Muster
    auftritt und die im Mittel <b>sieben bis zehn Jahre</b> lang für einen
    Reizdarm gehalten wird: Endometriose. Was sie von einem Reizdarm
    unterscheidet, sind zwei Dinge, nach denen in der Magensprechstunde
    niemand fragt – <b>Schmerz beim Sex</b> (und ob er tief innen sitzt oder
    außen) und <b>wie stark der Regelschmerz</b> ist.</p>
    <p class="klein">Die Fragen sind ausgeschaltet, und das bleiben sie, wenn
    du willst. Eingeschaltet erscheinen sie als zwei Regler beim Tageseintrag,
    und die App kann sagen, ob sich daraus ein Muster ergibt.</p>
    <div class="reihe">
      ${knopf('unterleib-an', 'Fragen einschalten', 'btn-primary')}
      ${knopf('unterleib-nein', 'Nein danke', 'btn-ghost')}
    </div>
  </div>`;
}

/*
 * Wie viel davon – die Frage, die über eine Streichliste entscheidet.
 *
 * „Zwiebeln sind auffällig" legt genau eine Handlung nahe: streichen. Und das
 * ist fast immer zu viel. Steht daneben, dass es als Würze unauffällig war und
 * erst als Hauptzutat auffällt, wird aus einem Verbot eine Faustregel – und
 * die hält jemand auch nach vier Wochen noch ein.
 *
 * Der Block steht nicht zugeklappt wie die anderen beiden, wenn er eine
 * Schwelle gefunden hat: Das ist die Auskunft, die den Alltag ändert, und sie
 * hinter einem Dreieck zu verstecken hieße, sie nicht ernst zu nehmen.
 */
function dosisBlock(d) {
  const geprueft = d.stufen.filter((st) => st.pruefbar);
  const liste = geprueft.length ? `<ul class="schichten">${geprueft.map((st) => `<li>
    <span>${esc(st.name)}${st.auffaellig ? ' ⚠' : ''}</span>
    <span class="klein">${fmtZahl(st.schnitt)} gegen ${fmtZahl(st.schnittOhne)}
      · ${st.faelle} Mahlzeiten</span>
  </li>`).join('')}</ul>` : '';

  return `<details class="stand d-${d.urteil}" ${d.urteil === 'schwelle' ? 'open' : ''}>
    <summary>Wie viel davon? <b>${DOSIS_WORT[d.urteil]}</b></summary>
    <p class="klein">${esc(d.satz)}</p>
    ${liste}
    <p class="klein">Verglichen wird jede Menge gegen dieselbe Gruppe: die
    ${d.gegenFaelle} Mahlzeiten ohne diese Zutat. „Getränk dazu" zählt hier
    nicht mit – ein Glas Wein ist keine kleinere Menge, sondern etwas anderes.</p>
  </details>`;
}

/*
 * Was von einem Verdacht übrig bleibt, wenn man die Umstände gleich hält.
 *
 * Der wichtigste Teil dieser Anzeige ist nicht das Urteil, sondern die Liste
 * darunter: Wer sehen kann, in welcher Schicht wie viele Fälle steckten,
 * kann selbst einschätzen, wie viel das Urteil wiegt. Ein Urteil ohne seine
 * Grundlage ist ein Orakel.
 */
function schichtBlock(stand) {
  const geprueft = stand.schichten.filter((x) => x.pruefbar);
  const liste = geprueft.length ? `<ul class="schichten">${geprueft.map((x) => `<li>
    <span>${esc(x.name)}</span>
    <span class="klein">${fmtZahl(x.schnittMit)} gegen ${fmtZahl(x.schnittOhne)}
      · ${x.faelle}/${x.gegenFaelle} Mahlzeiten</span>
  </li>`).join('')}</ul>` : '';

  return `<details class="stand s-${stand.urteil}">
    <summary>Liegt es wirklich daran? <b>${SCHICHT_WORT[stand.urteil]}</b></summary>
    <p class="klein">${esc(stand.satz)}</p>
    ${liste}
    <p class="klein">Verglichen wird jeweils <b>innerhalb</b> gleicher
    Umstände: Wer an angespannten Tagen anders isst, findet sonst das Essen
    auffällig, obwohl es an der Anspannung liegt.</p>
  </details>`;
}

/**
 * Alles einmal rechnen, dann herumreichen.
 *
 * Der Reiter „Muster" zeigt inzwischen sechs Abschnitte, und vier davon
 * brauchen dieselben Grundlagen – die Auslöserbilanz, die Kriterien, die
 * Mittel. Jeder für sich gerechnet wäre bei einem Jahr Tagebuch spürbar, und
 * schlimmer: Zwei Abschnitte könnten verschiedene Zahlen zeigen, wenn einer
 * andere Voreinstellungen mitgibt als der andere.
 */
function musterDaten(s) {
  const heute = heuteISO();
  const istNsar = (name) => {
    const g = wissenZu(name);
    return !!g && g.id === 'nsar';
  };
  const bilanz = ausloeserBilanz(s.eintraege, {
    fenster: s.fenster, mindestFaelle: s.mindestFaelle, eigene: s.eigeneAusloeser,
  });
  const klassen = klassenBilanz(s.eintraege, { fenster: s.fenster });
  // Einmal für alle: Die Schichtung unten braucht dieselbe Liste wie die
  // Bilanz, und zweimal gerechnet wäre sie bei einem Jahr Tagebuch spürbar.
  const bewertet = bewerteteMahlzeiten(s.eintraege, s.fenster);
  const k = kriterien({
    eintraege: s.eintraege,
    tage: s.tage,
    heute,
    beschwerdenSeit: s.beschwerdenSeit,
    istSaeuremittel: (name) => {
      const g = wissenZu(name);
      return !!g && ['ppi', 'h2', 'antazida', 'alginat'].includes(g.id);
    },
  });
  const mittel = mittelBilanz(s.eintraege, s.tage, {
    heute,
    gruppeVon: (name) => {
      const g = wissenZu(name);
      return g ? g.id : null;
    },
  });
  // Die Fensterwerte einmal für alle: Sie kosten einen Durchlauf über alle
  // Beschwerden und werden von der Übersichtskarte und von jedem Fund
  // gebraucht.
  const fenster = fensterWerte(s.eintraege);
  // Gesucht wird nur unter denen, die die Bilanz nicht ohnehin schon nennt –
  // sonst stünde dieselbe Zutat zweimal da, einmal je Rechenweg.
  const uebersehen = spaeteFunde(
    fenster,
    bilanz.filter((b) => !['auffaellig', 'moeglich'].includes(einstufung(b))).map((b) => b.id),
    s.fenster || 4,
  );
  /*
   * Wechselt die Wirkung mit dem Zyklus?
   *
   * Gefragt wird für *alle* Auslöser mit genug Fällen, nicht nur für die
   * auffälligen – und das ist der Punkt: Ein Auslöser, der in einer Phase
   * wirkt und in dreien nicht, kommt im Schnitt über alle vier Wochen als
   * „unauffällig" oder „ein bisschen" heraus. Genau dann versteckt der
   * Mittelwert den Befund, statt ihn zu zeigen.
   */
  const wechsel = wechselnde(bewertet, bilanz.filter((b) => b.genug).map((b) => b.id), s.tage);

  /*
   * Das Bild und die Lücken einmal für alle.
   *
   * Beides wurde bis eben zweimal je Anzeige gerechnet – einmal für die
   * Einordnung oben, einmal für „Was noch fehlt" unten. Seit die Zusammen-
   * fassung dazugekommen ist, wären es drei. Und schlimmer als der Aufwand
   * wäre, dass drei Stellen auseinanderlaufen können.
   */
  const bild = bildLesen({
    eintraege: s.eintraege,
    tage: s.tage,
    bilanz,
    name: (id) => ausloeserName(id, s.eigeneAusloeser),
    istNsar,
  });
  const benutzt = {};
  ['oberbauch', 'saettigung'].forEach((id) => {
    benutzt[id] = s.eintraege.some((e) => (e.arten || []).includes(id));
  });
  const luecke = luecken({
    kriterien: k,
    stuhl: stuhlZahlen(s.eintraege, s.tage),
    bezug: bezugBilanz(s.eintraege),
    klassen,
    mittel,
    musterIds: bild.muster.map((m) => m.id),
    essen: essensbezugVon(s),
    nsarTage: [...new Set(s.eintraege
      .filter((e) => e.art === 'medikament' && istNsar(e.mittel)).map((e) => e.am))].length,
    warnIds: bild.warnungen.map((w) => w.id),
    krampfAnteil: artAnteilVon(s, ['krampf']),
    benutzt,
    nachtwachAn: (s.tagesfragen || []).includes('nachtwach'),
    versuchMoeglich: vorschlaege(klassen, bilanz).length > 0,
    versuchLaeuft: !!s.versuch && !s.versuch.beendet,
    mahlzeitenOhneZutaten: s.eintraege
      .filter((e) => e.art === 'essen' && !zutatenVon(e).length).length,
  });

  /*
   * Die auffälligen Funde samt ihrer beiden Nachprüfungen.
   *
   * Nur für die auffälligen: Für Unauffälliges gäbe es nichts zu entkräften,
   * und jede zusätzliche Rechnung ist eine zusätzliche Gelegenheit für einen
   * Zufallstreffer. Einmal hier statt einmal je Anzeigestelle – die
   * Zusammenfassung oben muss dasselbe Urteil zeigen wie der Fund unten.
   */
  const gepruefte = bilanz
    .filter((b) => b.genug && ['auffaellig', 'moeglich'].includes(einstufung(b)))
    .map((b) => ({
      b,
      stand: haeltStand(bewertet, b.id, s.tage),
      profil: zeitProfil(fenster, b.id),
      dosis: dosisBild(s.eintraege, b.id, s.fenster),
    }));

  return {
    heute, istNsar, bewertet, bilanz, klassen, kriterien: k, mittel, fenster,
    uebersehen, wechsel, bild, luecke, gepruefte,
    zeit: zeitBild(s.eintraege),
  };
}

/*
 * Die Schwelle, die man sonst nicht sieht.
 *
 * Dass ein Unterschied größer sein muss als der Zufallsspielraum, ist die
 * strengste Regel dieser App – und die einzige, die man am Ergebnis nicht
 * ablesen kann, weil sie sich darin äußert, dass etwas *nicht* dasteht. Also
 * steht sie als Zahl da, mit ihrem Grund.
 */
function spielraumZeile(d) {
  const zeile = d.bilanz.find((b) => b.genug && Number.isFinite(b.spielraum));
  if (!zeile) return '';
  return `<p class="klein">${esc(spielraumSatz(zeile.spielraum, zeile.vergleiche))}</p>`;
}

/*
 * Was Sache ist – drei bis fünf Sätze, bevor irgendeine Zahl kommt.
 *
 * Zehn Karten sind eine Auswertung, die man erst zusammensetzen muss. Wer
 * Beschwerden hat, liest sie nicht; wer sie in der Sprechstunde vorzeigt, hat
 * dafür keine zehn Minuten. Diese Karte rechnet nichts eigenes – sie wählt aus
 * dem, was unten steht, und bringt es in Sätze. Was hier steht, steht unten
 * mit seinen Zahlen; wer einen Satz nicht wiederfindet, hat einen Fehler
 * gefunden.
 */
/*
 * Wie viele Tage stehen überhaupt drin?
 *
 * Nur für den Satz, der kommt, wenn sonst nichts kommt – und der die Zahl
 * nennen muss, statt „noch zu wenig" zu sagen. Gezählt wird vom ersten
 * Eintrag bis heute; ein Tagebuch fängt an dem Tag an, an dem jemand anfängt.
 */
function tageMitEintrag(s, heute) {
  const alle = [...Object.keys(s.tage || {}), ...s.eintraege.map((e) => e.am)].sort();
  if (!alle.length) return 0;
  return gesamtZahlen(s.eintraege, s.tage, alle[0], heute).notierteTage;
}

function lageTeil(s, d) {
  const t = trend(s.eintraege, s.tage, d.heute);
  const l = wasSacheIst({
    warnungen: d.bild.warnungen,
    trend: t,
    funde: d.gepruefte.map(({ b, stand, dosis }) => ({
      name: ausloeserName(b.id, s.eigeneAusloeser),
      differenz: b.differenz,
      faelle: b.faelle,
      gegenFaelle: b.gegenFaelle,
      urteil: stand.urteil,
      menge: dosis.urteil,
      mengeSatz: dosis.satz,
    })),
    spaet: d.uebersehen.map((x) => ({
      name: ausloeserName(x.id, s.eigeneAusloeser),
      fensterName: x.fensterName,
      ort: x.ort,
    })),
    wechsel: d.wechsel.map((w) => ({
      name: ausloeserName(w.id, s.eigeneAusloeser),
      phase: w.staerkste.name,
    })),
    zeit: d.zeit,
    gewicht: gewichtsBild(s.gewicht, d.heute, s.abnehmenGewollt),
    mittel: d.mittel.filter((m) => m.genug),
    luecke: d.luecke.tagebuch.length
      ? { satz: `Am meisten würde jetzt helfen: ${d.luecke.tagebuch[0].titel}.` }
      : null,
    notierteTage: tageMitEintrag(s, d.heute),
  });

  return `<div class="karte karte-lage">
    <h3>Was Sache ist</h3>
    ${l.saetze.map((x) => `<p class="lage-satz l-${x.art}">${esc(x.text)}</p>`).join('')}
    <p class="klein">Zusammengefasst aus dem, was weiter unten mit seinen
      Fallzahlen steht – ohne eigene Rechnung und ohne Diagnose.</p>
  </div>`;
}

/*
 * Dieselbe Menge, andere Wirkung.
 *
 * Wer drei Wochen lang Zwiebeln verträgt und in der vierten nicht, hat keine
 * Zwiebelunverträglichkeit – und streicht trotzdem Zwiebeln, wenn die Rechnung
 * über alle vier Wochen mittelt. Diese Karte gibt es nur, wenn wirklich etwas
 * wechselt; „ändert sich nicht" ist keine Karte wert.
 */
function wechselTeil(s, d) {
  if (!d.wechsel.length) return '';
  return `<div class="karte karte-wechsel">
    <h3>Kommt auf den Zeitpunkt im Zyklus an</h3>
    <ul class="funde">${d.wechsel.slice(0, 4).map((w) => `<li class="fund f-moeglich">
      <div class="fund-kopf">
        <b>${esc(ausloeserName(w.id, s.eigeneAusloeser))}</b>
        <span class="fund-urteil">${esc(w.staerkste.name)}</span>
      </div>
      <p class="klein">${esc(w.satz)}</p>
      <ul class="schichten">${w.phasen.filter((p) => p.pruefbar).map((p) => `<li>
        <span>${esc(p.name)}</span>
        <span class="klein">${fmtZahl(p.schnittMit)} gegen ${fmtZahl(p.schnittOhne)}
          · ${p.faelle}/${p.gegenFaelle} Mahlzeiten</span>
      </li>`).join('')}</ul>
    </li>`).join('')}</ul>
    <p class="klein">Die Phasen sind aus den eingetragenen Blutungstagen
      geschätzt. Was hier steht, beschreibt vergangene Wochen und sagt nichts
      voraus.</p>
  </div>`;
}

/*
 * Was das eingestellte Fenster nicht sehen kann.
 *
 * Die Bilanz zählt Beschwerden in den vier Stunden nach dem Essen. Was sich
 * erst nach sechs meldet – und im Dickdarm vergärt nichts früher –, kommt dort
 * nicht als „unauffällig" vor, sondern gar nicht. Diese Karte stellt die
 * Frage nach, statt sie am Fenster scheitern zu lassen.
 */
function spaetTeil(s, d) {
  if (!d.uebersehen.length) return '';
  return `<div class="karte karte-spaet">
    <h3>Erst später auffällig</h3>
    <p class="klein">Diese Auslöser fallen im eingestellten Fenster von
      ${s.fenster || 4} Stunden nicht auf – wohl aber später. Das ist kein
      schwächerer Befund, sondern ein anderer: So spät entsteht Beschwerde im
      Dickdarm.</p>
    <ul class="funde">${d.uebersehen.slice(0, 4).map((x) => `<li class="fund f-moeglich">
      <div class="fund-kopf">
        <b>${esc(ausloeserName(x.id, s.eigeneAusloeser))}</b>
        <span class="fund-urteil">${esc(x.fensterName)}</span>
      </div>
      ${vergleichBalken(x.teil.schnittMit, x.teil.schnittOhne)}
      <p class="klein">${x.teil.faelle} Mahlzeiten damit, ${x.teil.gegenFaelle} ohne
        – jeweils nur die, bei denen dieses Fenster überhaupt beobachtbar war
        (${esc(x.ort)})</p>
    </li>`).join('')}</ul>
  </div>`;
}

/*
 * Wann kommt es – nicht nach der Uhr, sondern nach dem Essen.
 *
 * „Wann es auftritt" weiter unten zählt nach Tageszeit; das ist eine andere
 * Frage und beantwortet vor allem, wie jemand lebt. Diese Karte zählt die
 * Stunden seit der letzten Mahlzeit, und das sagt etwas über den Ort: Was nach
 * einer halben Stunde brennt, kommt nicht aus dem Dickdarm, und was nach sechs
 * Stunden bläht, kommt nicht aus dem Magen.
 */
function zeitTeil(d) {
  const z = d.zeit;
  if (!z.zugeordnet) return '';
  const zeilen = z.teile.map((t) => `<li>
    <span>${esc(t.name)}</span>
    <span class="klein">${t.anzahl}× · ${Math.round(t.anteil * 100)} %
      · im Mittel ${fmtZahl(t.schnitt)}</span>
  </li>`).join('');

  return `<div class="karte karte-zeit">
    <h3>Wie lange nach dem Essen</h3>
    <p>${esc(z.satz)}</p>
    <ul class="wartend">${zeilen}</ul>
    <p class="klein">${z.zugeordnet} von ${z.gesamt} Beschwerden ließen sich
      einer Mahlzeit davor zuordnen. ${esc(z.hinweis)}</p>
  </div>`;
}

/*
 * Und dasselbe für einen einzelnen Auslöser.
 *
 * Der Zeitpunkt ist die Auskunft, die dem Mechanismus am nächsten kommt: Ein
 * Auslöser, der sich erst nach Stunden meldet, wird im Dickdarm vergoren; einer
 * mit sofortiger Wirkung nicht. In der Sprechstunde ist das der Unterschied
 * zwischen einem Säureblocker und einer Ernährungsberatung.
 */
function zeitBlock(profil) {
  const geprueft = profil.teile.filter((t) => t.pruefbar);
  const liste = geprueft.length ? `<ul class="schichten">${geprueft.map((t) => `<li>
    <span>${esc(t.name)}</span>
    <span class="klein">${fmtZahl(t.schnittMit)} gegen ${fmtZahl(t.schnittOhne)}
      · ${t.faelle}/${t.gegenFaelle} Mahlzeiten</span>
  </li>`).join('')}</ul>` : '';

  return `<details class="stand s-zeit">
    <summary>Wann meldet es sich? <b>${profil.schwerpunkt
  ? esc(profil.teile.find((t) => t.id === profil.schwerpunkt).name)
  : 'kein Schwerpunkt'}</b></summary>
    <p class="klein">${esc(profil.satz)}</p>
    ${liste}
    <p class="klein">Ein Fenster zählt nur, wenn in diesen Stunden nichts
    dazwischengegessen wurde – sonst gehörte die Beschwerde der späteren
    Mahlzeit. Späte Fenster sind deshalb dünner besetzt.</p>
  </details>`;
}

/**
 * Nach Klassen statt nach Zutaten.
 *
 * Steht *vor* der Zutatenliste, weil es die belastbarere Zahl ist: „Zwiebel"
 * kommt zwölfmal vor, „FODMAP" achtzigmal. Und weil es die brauchbarere
 * Auskunft ist – wer weiß, dass es an den Fruktanen liegt, weiß auch etwas
 * über das Lebensmittel, das noch gar nicht im Tagebuch steht.
 */
function klassenTeil(s, d) {
  const fertig = d.klassen.filter((k) => k.genug);
  if (!fertig.length) {
    const naechste = d.klassen.filter((k) => !k.genug).sort((a, b) => a.fehlt - b.fehlt)[0];
    if (!naechste) return '';
    return `<div class="karte zaehlt">
      <h3>Nach Wirkweise</h3>
      <p class="klein">Noch keine Klasse mit genug Fällen. Am nächsten dran:
      ${esc(naechste.kurz)} – ${naechste.faelle} Mahlzeiten damit,
      ${naechste.gegenFaelle} ohne, gebraucht werden je acht.</p>
    </div>`;
  }
  const zeile = (k) => {
    const art = klassenEinstufung(k);
    const zutaten = klasseZutaten(s.eintraege, k.id).slice(0, 5);
    return `<li class="fund fund-klasse f-${art}">
      <div class="fund-kopf">
        <b>${esc(k.name)}</b>
        <span class="fund-urteil">${EINSTUFUNG_WORT[art]}</span>
      </div>
      ${vergleichBalken(k.schnittMit, k.schnittOhne)}
      <p class="klein">${mehrzahl(k.faelle, 'Mahlzeit', 'Mahlzeiten')} damit,
        ${k.gegenFaelle} ohne · danach ${Math.round(k.quoteMit * 100)} % mit
        Beschwerden, sonst ${Math.round(k.quoteOhne * 100)} %</p>
      <p class="zeile-tags">${esc(k.was)}</p>
      ${zutaten.length ? `<p class="klein">Bei dir steckt das in:
        ${zutaten.map((z) => `${esc(ausloeserName(z.id, s.eigeneAusloeser))} (${z.anzahl}×)`).join(', ')}</p>` : ''}
    </li>`;
  };
  return `<div class="karte">
    <h3>Nach Wirkweise</h3>
    <p class="klein">Zusammengefasst, was im Körper denselben Weg nimmt. Das gibt
    mehr Fälle je Vergleich als eine einzelne Zutat – und die brauchbarere
    Antwort, weil sie auch für das gilt, was noch nicht im Tagebuch steht. Die
    Zuordnung ist grob: Ein Apfel ist FODMAP-reich, eine Banane kaum, und beide
    wären hier Obst.</p>
    <ul class="funde funde-klassen">${fertig.map(zeile).join('')}</ul>
  </div>`;
}

/**
 * Die Kriterien – der Teil, der am nächsten an eine Diagnose herankommt.
 *
 * Und deshalb der Teil mit den meisten Vorbehalten. Sie stehen nicht im
 * Kleingedruckten, sondern im ersten Absatz: Erfüllte Kriterien heißen, dass
 * der Name passt, *wenn* nichts Organisches dahintersteckt – und das
 * entscheidet eine Untersuchung, nicht diese App.
 */
function kriterienTeil(s, d) {
  const k = d.kriterien;
  if (!genugFuerKriterien(k)) {
    return `<div class="karte">
      <h3>Kriterien</h3>
      <p class="klein">Ab etwa zwei Wochen Tagebuch stehen hier die Regelwerke,
      mit denen in der Sprechstunde eingeordnet wird – Rom IV für Reizdarm und
      funktionelle Dyspepsie, GerdQ für Reflux. Bisher sind
      ${mehrzahl(k.zeitraum.notierteTage, 'Tag', 'Tage')} notiert.</p>
    </div>`;
  }

  const r = k.reizdarm;
  const dy = k.dyspepsie;
  const g = k.gerdq;
  const zahl = (x) => x.toFixed(1).replace('.', ',');

  const haken = (erfuellt, pruefbar = true) => (pruefbar
    ? `<span class="haken ${erfuellt ? 'ja' : 'nein'}">${erfuellt ? '✓' : '–'}</span>`
    : '<span class="haken offen">?</span>');

  const reizdarmKasten = `<li class="krit ${r.erfuellt ? 'erfuellt' : ''}">
    <div class="krit-kopf">
      <b>Reizdarmsyndrom (Rom IV)</b>
      <span class="fund-urteil">${r.pruefbar
    ? (r.erfuellt ? 'Kriterien erfüllt' : 'Kriterien nicht erfüllt') : 'noch nicht prüfbar'}</span>
    </div>
    <ul class="kritliste">
      <li>${haken(r.schmerzErfuellt, r.pruefbar)}
        <span><b>Bauchschmerz mindestens 1× je Woche.</b>
        An ${mehrzahl(r.schmerzTage, 'Tag', 'Tagen')} eingetragen, das sind
        ${zahl(r.proWoche)} je Woche der notierten Tage.</span></li>
      ${r.merkmale.map((m) => `<li>${haken(m.erfuellt, m.pruefbar)}
        <span><b>${esc(m.name)}.</b> ${esc(m.text)}</span></li>`).join('')}
    </ul>
    <p class="klein">Verlangt sind der Schmerz und mindestens zwei der drei
    Merkmale; erfüllt sind ${r.erfuellteMerkmale} von 3.
    ${r.typ.typ ? `Stuhlform: <b>${esc(r.typ.name)}</b> –
      ${Math.round(r.typ.bilanz.anteilHart * 100)} % hart,
      ${Math.round(r.typ.bilanz.anteilWeich * 100)} % weich, aus
      ${mehrzahl(r.typ.bilanz.gesamt, 'Stuhlgang', 'Stuhlgängen')}.`
    : `Für den Typ fehlen noch ${mehrzahl(r.typ.fehlt, 'Stuhlgang', 'Stuhlgänge')}.`}</p>
  </li>`;

  const dyspepsieKasten = `<li class="krit ${dy.erfuellt ? 'erfuellt' : ''}">
    <div class="krit-kopf">
      <b>Funktionelle Dyspepsie (Rom IV)</b>
      <span class="fund-urteil">${dy.pruefbar
    ? (dy.erfuellt ? 'Kriterien erfüllt' : 'Kriterien nicht erfüllt') : 'noch nicht prüfbar'}</span>
    </div>
    <ul class="kritliste">
      ${[dy.pds, dy.eps].map((f) => `<li>${haken(f.erfuellt, dy.pruefbar)}
        <span><b>${esc(f.name)}.</b> ${esc(f.satz)}
        An ${mehrzahl(f.tage, 'Tag', 'Tagen')}, ${zahl(f.proWoche)} je Woche der
        notierten Tage.</span></li>`).join('')}
    </ul>
    <p class="klein">Gezählt werden nur Eintragungen ab Stärke 4 („merklich") –
    die Kriterien sagen „belastend", und eine 2 mitzuzählen würde sie bei fast
    jedem erfüllen.</p>
  </li>`;

  const gerdqKasten = `<li class="krit ${g.wahrscheinlich && g.belastbar ? 'erfuellt' : ''}">
    <div class="krit-kopf">
      <b>GerdQ – Reflux</b>
      <span class="fund-urteil">${g.belastbar
    ? `${g.punkte} von 18` : 'zu wenig erfasst'}</span>
    </div>
    <ul class="kritliste kritliste-eng">
      ${g.posten.map((p) => `<li>
        <span class="haken ${p.punkte >= 2 ? 'ja' : 'nein'}">${p.punkte}</span>
        <span>${esc(p.frage)} – an ${mehrzahl(p.tage, 'Tag', 'Tagen')}${p.umgekehrt
    ? ' <i>(zählt umgekehrt)</i>' : ''}</span></li>`).join('')}
    </ul>
    <p class="klein">${g.belastbar
    ? `Ab 8 Punkten gilt eine Refluxkrankheit als wahrscheinlich – du liegst bei
       <b>${g.punkte}</b>. Zwei der sechs Fragen zählen umgekehrt: Oberbauchschmerz
       und Übelkeit sprechen eher gegen Reflux und für etwas anderes im Magen.
       Das ist kein Fehler, das ist der Trick des Fragebogens.`
    : `Von den letzten sieben Tagen sind nur ${g.erfasst} notiert. Was nicht
       eingetragen ist, zählt hier als „nicht gehabt" – die Punktzahl wäre zu
       niedrig statt falsch, und damit nicht zu gebrauchen.`}</p>
  </li>`;

  const dauer = k.dauer.erfuellt === null
    ? `<p class="klein warnend">Seit wann die Beschwerden bestehen, ist nicht
       eingetragen – unter „Mehr". Rom IV verlangt einen Beginn vor mindestens
       einem halben Jahr; ohne diese Angabe fehlt beiden Kästen oben eine
       Bedingung.</p>`
    : `<p class="klein">Beschwerden seit ${esc(k.dauer.seit)}, also seit
       ${mehrzahl(k.dauer.monate, 'Monat', 'Monaten')}. Die Rom-Bedingung „Beginn
       vor mindestens sechs Monaten" ist damit
       ${k.dauer.erfuellt ? 'erfüllt' : '<b>noch nicht</b> erfüllt'}.</p>`;

  return `<div class="karte">
    <h3>Kriterien</h3>
    <p class="klein"><b>Erfüllte Kriterien sind keine Diagnose.</b> Beide
    Regelwerke setzen ausdrücklich voraus, dass nichts Organisches
    dahintersteckt – und das weiß nur eine Untersuchung. „Erfüllt" heißt hier:
    Wenn Spiegelung und Blutbild unauffällig sind, passt dieser Name. Das ist
    weniger als eine Diagnose und mehr als ein Gefühl, und es ist genau der
    Satz, mit dem sich ein Termin anfangen lässt.</p>
    ${dauer}
    <ul class="krit-liste">${reizdarmKasten}${dyspepsieKasten}${gerdqKasten}</ul>
    <p class="klein">Grundlage: ${mehrzahl(k.zeitraum.notierteTage, 'notierter Tag', 'notierte Tage')}
    in den letzten 90. Ein Tagebuch untererfasst – wer einen Tag nicht einträgt,
    hat an diesem Tag laut Tagebuch nichts gehabt. Jede Zahl hier ist eher zu
    niedrig als zu hoch.</p>
  </div>`;
}

/**
 * Der Auslassversuch: laufend, fertig, oder noch nicht angefangen.
 *
 * Das ist der einzige Teil der App, der aus Beobachtung einen Beleg machen
 * kann – und der einzige, der etwas von ihr verlangt. Deshalb steht der
 * Vorschlag nicht als Text da, sondern als Knopf mit dem Namen des
 * Verdächtigen darauf.
 */
function versuchTeil(s, d) {
  const v = s.versuch;
  /*
   * Die Liste der geprüften Versuche hängt an *keinem* der Zweige unten.
   *
   * Das war schon einmal falsch: Sie stand nur neben dem laufenden Versuch und
   * verschwand in dem Moment, in dem man einen abhakte – also genau dann, wenn
   * sie zum ersten Mal etwas enthielt. Dieselbe Falle wie damals bei den
   * Warnzeichen: Ein früher Rücksprung nimmt einen Abschnitt mit, den niemand
   * vermisst, weil er nie da war.
   */
  const alte = versuchHistorie(s, d);
  if (v) {
    const p = phase(v, d.heute);
    const erg = ergebnis(v, s.eintraege, s.tage, d.heute);
    const was = v.art === 'klasse' ? klasseName(v.ziel) : ausloeserName(v.ziel, s.eigeneAusloeser);
    const zahl = (x) => x.toFixed(1).replace('.', ',');
    return `<div class="karte versuch v-${erg.urteil}">
      <div class="fund-kopf">
        <b>Auslassversuch: ${esc(was)}</b>
        <span class="fund-urteil">${erg.wort}</span>
      </div>
      <ul class="versuch-zahlen">
        <li><span>Davor</span><b>${zahl(erg.vorher.schnitt)}</b>
          <span class="klein">${erg.vorher.notierte} Tage</span></li>
        <li><span>Ohne</span><b>${zahl(erg.auslass.schnitt)}</b>
          <span class="klein">${erg.auslass.notierte} Tage</span></li>
        <li><span>Danach</span><b>${erg.nachher ? zahl(erg.nachher.schnitt) : '–'}</b>
          <span class="klein">${erg.nachher ? `${erg.nachher.notierte} Tage` : 'noch nicht'}</span></li>
      </ul>
      <p>${esc(erg.satz)}</p>
      <p class="klein">Ein Versuch an einem einzigen Menschen, ohne Verblindung:
      Wer weiß, dass er heute die Milch weglässt, erwartet auch, dass es besser
      wird. Das Ergebnis ist der stärkste Hinweis, den ein Tagebuch hergibt, und
      kein Nachweis.</p>
      <div class="reihe">
        ${p === 'reif' ? knopf('versuch-provokation', 'Heute wieder gegessen', 'btn-primary') : ''}
        ${p === 'auslass' || p === 'provokation' || p === 'reif'
    ? knopf('versuch-beenden', 'Abbrechen', 'btn-ghost')
    : knopf('versuch-ablegen', 'Abhaken und behalten', 'btn-primary')}
      </div>
    </div>${alte}`;
  }

  const kandidaten = vorschlaege(d.klassen, d.bilanz);
  if (!kandidaten.length) return alte;
  const name = (x) => (x.art === 'klasse' ? klasseName(x.ziel) : ausloeserName(x.ziel, s.eigeneAusloeser));
  return `<div class="karte karte-merk">
    <h3>Einen Auslassversuch machen</h3>
    <p class="klein">Alles andere hier zählt, was ohnehin passiert – daraus wird
    nie ein Beleg: Wer an schlechten Tagen anders isst, findet sein Essen
    auffällig, ohne dass es damit zu tun hat. Ein Versuch dreht das um. Zwei
    Wochen weglassen und dann <b>bewusst wieder essen</b>; erst diese zweite
    Hälfte entscheidet. Genau so wird in der Ernährungsmedizin gearbeitet.</p>
    <ul class="versuch-wahl">${kandidaten.map((x) => `<li>
      <div><b>${esc(name(x))}</b>
        <span class="klein">${x.art === 'klasse' ? 'Klasse' : 'einzelne Zutat'} ·
        ${mehrzahl(x.faelle, 'Mahlzeit', 'Mahlzeiten')} damit ·
        ${x.differenz.toFixed(1).replace('.', ',')} Stufen Unterschied</span></div>
      <div class="wahl">${DAUER_VORSCHLAEGE.map((n) => `
        <button type="button" class="wahl-btn" data-act="versuch-start"
                data-art="${x.art}" data-id="${esc(x.ziel)}" data-n="${n}">${n} Tage</button>`).join('')}</div>
    </li>`).join('')}</ul>
    <p class="klein">Klassen stehen vor einzelnen Zutaten: Hinter „Zwiebel"
    steckt fast immer die ganze Klasse, und wer nur die Zwiebel weglässt, isst
    die übrigen Fruktane weiter und lernt nichts.</p>
  </div>${alte}`;
}

/**
 * Der Provokationstest: laufend, fertig oder noch nicht angefangen.
 *
 * Er steht direkt hinter dem Auslassversuch, weil er dieselbe Bewegung macht –
 * eingreifen statt beobachten –, nur kürzer und wiederholbar. Und er steht nur
 * dort, wo man ohnehin nach Antworten sucht: Wer ihn nie anfängt, sieht eine
 * Karte, wer ihn laufen hat, sieht das Protokoll.
 */
function provokationTeil(s, d) {
  const p = s.provokation;
  const zahl = (x) => x.toFixed(1).replace('.', ',');

  if (p) {
    const b = provokationsBild(p, s.eintraege, d.heute);
    const schritt = naechsterSchritt(p, d.heute);
    const fertig = p.beendet || b.urteil !== 'laeuft';
    return `<div class="karte provokation p-${b.urteil}">
      <div class="fund-kopf">
        <b>Provokationstest: ${esc(p.was || p.ziel)}</b>
        <span class="fund-urteil">${esc(b.wort)}</span>
      </div>
      ${b.laeufe.length ? `<ul class="wartend prov-laeufe">${b.laeufe.map((l) => `<li${l.sauber ? '' : ' class="prov-weg"'}>
        <span>${esc(fmtDatum(l.am, true))} ${esc(l.um)}
          <span class="zeile-tags">${l.leer ? 'Leerdurchgang' : 'mit'}${l.sauber ? '' : ` · zählt nicht: ${esc(l.warum.join(', '))}`}</span></span>
        <span class="klein">${l.sauber ? `${l.wert} von 10` : '–'}
          <button type="button" class="strang-weg" data-act="prov-lauf-weg"
                  data-am="${l.am}" data-um="${esc(l.um)}"
                  aria-label="Durchgang zurücknehmen">×</button></span>
      </li>`).join('')}</ul>` : ''}
      ${Number.isFinite(b.unterschied)
    ? vergleichBalken(b.schnitt, b.vergleich,
      { mit: 'mit', ohne: b.grundlage === 'leerdurchgang' ? 'leer' : 'Alltag' })
    : ''}
      <p>${esc(b.satz)}</p>
      ${schritt && !fertig ? `<p class="klein"><b>Als Nächstes:</b> ${esc(schritt.satz)}</p>` : ''}
      <div class="reihe">
        ${schritt && schritt.dran
    ? knopf(schritt.leer ? 'prov-leer' : 'prov-lauf',
      schritt.leer ? 'Leerdurchgang gemacht' : 'Jetzt genommen', 'btn-primary') : ''}
        ${p.beendet
    ? knopf('prov-ablegen', 'Abhaken und behalten', 'btn-primary')
    : knopf('prov-beenden', 'Abbrechen', 'btn-ghost')}
      </div>
      <p class="klein">${esc(NICHT_BEI_ALLERGIE)}</p>
    </div>${provokationHistorie(s, d)}`;
  }

  /*
   * Angeboten wird der Test nicht von Anfang an. Er verlangt vier Morgen und
   * ist die falsche Antwort auf „ich trage seit drei Tagen ein" – erst wenn
   * genug dasteht, dass es überhaupt etwas zu prüfen gibt, lohnt der Aufwand.
   */
  if (d.bilanz.filter((b) => b.genug).length < 3) return provokationHistorie(s, d);

  return `<div class="karte karte-merk">
    <h3>Eine Sache gezielt prüfen</h3>
    <p class="klein">Der Auslassversuch dauert zwei Wochen, und in zwei Wochen
    ändert sich auch anderes. Ein Provokationstest fragt kürzer und schärfer:
    eine festgelegte Menge, <b>nüchtern</b>, dann vier Stunden nichts essen und
    aufschreiben, wie es geht – und das dreimal. Genau so wird auf Laktose und
    Fruktose geprüft; in der Klinik misst dabei zusätzlich ein Atemtest mit.</p>
    <ul class="versuch-wahl">${PRUEFBAR.map((x) => `<li>
      <div><b>${esc(x.name)}</b>
        <span class="klein">${esc(x.was)} · ${esc(x.warum)}</span></div>
      <div class="wahl">
        <button type="button" class="wahl-btn" data-act="prov-start"
                data-id="${esc(x.id)}">Diesen Test anfangen</button></div>
    </li>`).join('')}</ul>
    <p class="klein">Die Mengen sind kleiner als beim Test in der Klinik, und
    zwar mit Absicht: Dort geht es um die Frage, ob eine Malabsorption vorliegt,
    hier um die, ob dir das Beschwerden macht, was du tatsächlich isst. Nur die
    zweite Antwort ändert etwas – und die Klinikmenge auf eigene Faust zu nehmen
    macht vor allem einen scheußlichen Tag.</p>
    <p class="klein">${esc(NICHT_BEI_ALLERGIE)}</p>
  </div>${provokationHistorie(s, d)}`;
}

/** Was schon durchprovoziert wurde – aus denselben Gründen wie „Schon geprüft". */
function provokationHistorie(s, d) {
  const alte = s.provokationen || [];
  if (!alte.length) return '';
  return `<div class="karte karte-geprueft">
    <h3>Schon getestet</h3>
    <ul class="wartend">${alte.map((p) => {
    const b = provokationsBild(p, s.eintraege, d.heute);
    return `<li class="geprueft g-${b.urteil}">
      <span><b>${esc(p.was || p.ziel)}</b><span class="zeile-tags">${b.echte} Durchgänge,
        ${b.leere} leer</span></span>
      <span class="klein">${esc(b.wort)}
        <button type="button" class="strang-weg" data-act="prov-alt-weg"
                data-id="${esc(p.id)}" aria-label="Aus der Liste nehmen">×</button></span>
    </li>`;
  }).join('')}</ul>
  </div>`;
}

/**
 * Was die Mittel bewirken – gemessen, nicht behauptet.
 *
 * Sie trägt ein, was sie nimmt, und niemand rechnet nach. Ausbleibendes
 * Ansprechen ist selbst ein Befund: Ein Säureblocker, der nach vier bis acht
 * Wochen nichts geändert hat, spricht gegen die Säure als Ursache.
 */
function ansprechenTeil(s, d) {
  const liste = d.mittel.filter((m) => m.genug);
  if (!liste.length) return '';
  return `<div class="karte">
    <h3>Ob es etwas bewirkt</h3>
    <ul class="funde funde-mittel">${liste.map((m) => `<li class="fund fund-mittel f-${m.urteil === 'besser' ? 'unauffaellig' : (m.saeureVersuchAusgereizt ? 'auffaellig' : 'neutral')}">
      <div class="fund-kopf">
        <b>${esc(m.name)}</b>
        <span class="fund-urteil">${ANSPRECHEN_URTEIL[m.urteil]}</span>
      </div>
      ${m.vergleichbar ? vergleichBalken(m.unter.schnitt, m.davor.schnitt,
    { mit: 'darunter', ohne: 'davor' }) : ''}
      <p class="klein">${mehrzahl(m.einnahmeTage, 'Einnahmetag', 'Einnahmetage')},
        seit ${esc(fmtDatum(m.seit, true))}</p>
      <p>${esc(befund(m))}</p>
    </li>`).join('')}</ul>
    <p class="klein">Der Balken vergleicht die Zeit davor mit der Zeit darunter,
    gleich lang. Diese App schlägt weiterhin kein Medikament vor und rät zu
    keinem Absetzen – ein Säureblocker wird nach längerer Einnahme nicht von
    einem Tag auf den anderen weggelassen.</p>
  </div>`;
}

/**
 * Was schon geprüft wurde.
 *
 * Ein fertiger Auslassversuch ist das Aufwändigste, was dieses Tagebuch
 * hervorbringt – zwei Wochen Verzicht und eine bewusste Wiedereinführung. Ihn
 * danach wegzuwerfen hieß, in einem halben Jahr dieselben zwei Wochen noch
 * einmal zu verlangen. Und ein Versuch, der *dagegen* sprach, ist für den
 * Termin genauso ein Beleg wie einer, der dafür sprach: eine Sache weniger,
 * auf die sie verzichten muss.
 *
 * Das Ergebnis wird jedes Mal neu aus den Eintragungen gerechnet, nicht
 * eingefroren. Sonst stünden hier Zahlen, die nicht mehr zum Tagebuch passen,
 * sobald jemand einen Eintrag korrigiert.
 */
function versuchHistorie(s, d) {
  const alte = s.versuche || [];
  if (!alte.length) return '';
  const zahl = (x) => x.toFixed(1).replace('.', ',');
  return `<div class="karte karte-geprueft">
    <h3>Schon geprüft</h3>
    <ul class="wartend">${alte.map((v) => {
    const e = ergebnis(v, s.eintraege, s.tage, d.heute);
    const was = v.art === 'klasse' ? klasseName(v.ziel) : ausloeserName(v.ziel, s.eigeneAusloeser);
    return `<li class="geprueft g-${e.urteil}">
      <span><b>${esc(was)}</b><span class="zeile-tags">${esc(fmtDatum(v.start, true))},
        ${mehrzahl(v.tage, 'Tag', 'Tage')} · ohne ${zahl(e.auslass.schnitt)} statt
        ${zahl(e.vorher.schnitt)}</span></span>
      <span class="klein">${esc(e.wort)}
        <button type="button" class="strang-weg" data-act="versuch-alt-weg"
                data-id="${esc(v.id)}" aria-label="Aus der Liste nehmen">×</button></span>
    </li>`;
  }).join('')}</ul>
    <p class="klein">Damit dasselbe nicht in einem halben Jahr noch einmal
    geprüft wird – und weil ein Versuch, der dagegen sprach, für den Termin
    genauso zählt wie einer, der dafür sprach.</p>
  </div>`;
}

/**
 * Was noch fehlt – und was keine App beantwortet.
 *
 * Der Abschnitt, der aus einem Tagebuch etwas macht, das weiterfragt. Zwei
 * Listen, streng getrennt: Was sie selbst schließen kann, und was eine
 * Untersuchung entscheidet. Die zweite Liste ist die, die man beim Termin
 * vorliest.
 */
function brauchtTeil(s, d) {
  // Gerechnet wird das in musterDaten, einmal für alle – siehe dort.
  const l = d.luecke;

  const offen = `<div class="karte">
    <h3>Was noch fehlt</h3>
    <p class="klein">Fragen, die offen sind, weil etwas nicht eingetragen wurde –
    die kannst du selbst schließen. Das Oberste bringt am meisten.</p>
    ${l.tagebuch.length ? `<ol class="luecken">${l.tagebuch.slice(0, 5).map((x) => `<li>
      <b>${esc(x.titel)}</b><span class="zeile-tags">${esc(x.text)}</span>
    </li>`).join('')}</ol>`
    : '<p class="klein">Nichts Offenes – das Tagebuch gibt gerade alles her, '
      + 'was es hergeben kann. Weiterschreiben ist trotzdem das Beste, was du '
      + 'tun kannst: Jede Woche macht jede Zahl hier belastbarer.</p>'}
  </div>`;

  const zeile = (v) => `<li class="verdacht s-${v.stand}">
    <div class="fund-kopf">
      <b>${esc(v.name)}</b>
      <span class="fund-urteil">${esc(v.wort)}</span>
    </div>
    <p class="zeile-tags">${esc(v.was)}</p>
    ${v.dafuer.length ? `<p class="feld-name">Dafür spricht</p>
      <ul class="belege">${v.dafuer.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
    ${v.dagegen.length ? `<p class="feld-name">Dagegen spricht</p>
      <ul class="belege">${v.dagegen.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
    ${v.offen ? `<p class="klein">${esc(v.offen)}</p>` : ''}
    <p class="feld-name">Was es entscheidet</p>
    <p class="klein">${v.untersuchung.replace(/\*\*(.+?)\*\*/g, (m, t) => `<b>${esc(t)}</b>`)}</p>
    <p class="frage-zeile">„${esc(v.frage)}"</p>
  </li>`;

  /*
   * Zehn Möglichkeiten mit je vier Absätzen sind zugeklappt richtig aufgehoben.
   * Das ist Nachschlagestoff für den Termin, kein Text zum täglichen Lesen –
   * und beim Drucken macht die App alle Klappen ohnehin auf (siehe
   * 'beforeprint' weiter unten), sodass er auf dem Zettel vollständig steht.
   */
  return `${offen}<div class="karte">
    <details class="verdachtbogen">
      <summary><h3>Was keine App beantwortet</h3></summary>
      <p class="klein">Je Möglichkeit: was im Tagebuch dafür spricht, was dagegen,
      und die Untersuchung, die es entscheidet. Die letzte Zeile ist jeweils der
      Satz zum Vorlesen – dafür ist der ganze Aufwand gut.</p>
      <ul class="verdaechte">${l.verdaechte.map(zeile).join('')}</ul>
      <p class="klein">Keine Reihenfolge nach Wahrscheinlichkeit. Oben steht, wozu
      das Tagebuch am meisten zu sagen hat, nicht, was am ehesten zutrifft – das
      ist ein Unterschied, und ihn zu verwischen wäre genau die Art von Rat, die
      Leute in die falsche Sprechstunde schickt.</p>
    </details>
  </div>`;
}

/* Zwei kleine Umwege, damit brauchtTeil() nicht selbst rechnen muss – die
 * Rechnung steht in js/auswertung.js und wird hier nur abgeholt. */
function essensbezugVon(s) {
  return essensbezug(s.eintraege);
}
function artAnteilVon(s, arten) {
  return artAnteil(s.eintraege, arten).anteil;
}

function musterAnsicht(s) {
  const d = musterDaten(s);
  const bilanz = d.bilanz;
  const mahlzeiten = s.eintraege.filter((e) => e.art === 'essen').length;

  const erklaerung = `<div class="karte hinweis">
    <h3>Wie das gelesen wird</h3>
    <p>Verglichen wird die mittlere Beschwerdestärke in den
    <b>${s.fenster} Stunden</b> nach Mahlzeiten <b>mit</b> einem Merkmal gegen
    alle übrigen Mahlzeiten. Eine Zeile erscheint erst ab
    ${s.mindestFaelle} Fällen auf beiden Seiten.</p>
    ${spielraumZeile(d)}
    <p class="klein">Das ist eine Häufigkeit, keine Ursache. Wer an einem
    schlechten Tag ohnehin anders isst, findet sich hier wieder, ohne dass das
    Essen schuld wäre. Der Zettel ist für das Gespräch in der Praxis gedacht,
    nicht als Ersatz dafür.</p>
  </div>`;

  // Warnzeichen und Einordnung stehen *vor* dieser Abkürzung: Wer Beschwerden
  // einträgt, aber keine Mahlzeiten, hat trotzdem ein Tagebuch – und wenn
  // darin ein Warnzeichen steht, ist das Fehlen von Mahlzeiten der falsche
  // Grund, es nicht anzuzeigen. Genau das war es einmal.
  /*
   * Ohne Mahlzeiten fällt nur die Auslöserrechnung weg – sonst nichts.
   *
   * Alles andere auf diesem Reiter hängt an Beschwerden, Stuhlgang und
   * Medikamenten und wäre auch ohne eine einzige Mahlzeit vollständig. Diese
   * Abkürzung hat schon einmal die Warnzeichen verschluckt; sie darf nicht
   * auch noch die Kriterien und den Stuhlgang verschlucken.
   *
   * Und erst recht nichts, was gerade *läuft*. Ein Auslassversuch und ein
   * Provokationstest hängen an keiner einzigen Mahlzeit – der eine misst
   * Tageswerte, der andere ein Fenster nach einem Durchgang. Fehlten sie hier,
   * verschwände mitten im Versuch die einzige Stelle, an der sein Ergebnis
   * steht, und zwar ausgerechnet bei dem, der gerade weniger einträgt, weil er
   * gerade weniger isst. Dieselbe Falle wie damals, eine Tür weiter.
   */
  if (!mahlzeiten) {
    return `${lageTeil(s, d)}${bildTeil(s, d)}${kriterienTeil(s, d)}${versuchTeil(s, d)}${provokationTeil(s, d)}<p class="leer">Noch keine Mahlzeit
      eingetragen. Sobald ein paar Tage beisammen sind, steht hier, was
      auffällt.</p>${ansprechenTeil(s, d)}${stuhlTeil(s)}${brauchtTeil(s, d)}${zyklusTeil(s)}${erklaerung}`;
  }

  const fertig = bilanz.filter((b) => b.genug);
  const offen = bilanz.filter((b) => !b.genug);

  const zeile = (b) => {
    const art = einstufung(b);
    // Störfaktorentest und Zeitprofil kommen aus musterDaten – nur für das,
    // was ohnehin auffällig ist, und nur einmal gerechnet, damit oben in der
    // Zusammenfassung nichts anderes stehen kann als hier.
    const g = d.gepruefte.find((x) => x.b.id === b.id);
    const stand = g ? g.stand : null;
    const profil = g ? g.profil : null;
    // Die Aufschlüsselung nach Rolle nur, wenn es überhaupt etwas zu
    // unterscheiden gibt: Bei einer einzigen Rolle wiederholte sie die
    // Hauptzahl mit anderen Worten.
    const rollen = rollenBilanz(s.eintraege, b.id, s.fenster);
    const nachRolle = rollen.length > 1 ? `<ul class="rollen">${rollen.map((r) => `<li>
      <span>als ${esc(rolleName(r.rolle))}</span>
      <span class="klein">${mehrzahl(r.faelle, 'Mal', 'Mal')}, danach ${fmtZahl(r.schnitt)}</span>
    </li>`).join('')}</ul>` : '';
    // Und die eigentliche Frage dahinter: wie viel, nicht ob – auch das kommt
    // aus musterDaten, damit oben und unten dasselbe steht.
    const dosis = g ? g.dosis : null;
    return `<li class="fund f-${art}">
      <div class="fund-kopf">
        <b>${esc(ausloeserName(b.id, s.eigeneAusloeser))}</b>
        <span class="fund-urteil">${EINSTUFUNG_WORT[art]}</span>
      </div>
      ${vergleichBalken(b.schnittMit, b.schnittOhne)}
      <p class="klein">${mehrzahl(b.faelle, 'Mahlzeit', 'Mahlzeiten')} damit,
        ${b.gegenFaelle} ohne · danach ${Math.round(b.quoteMit * 100)} % mit
        Beschwerden, sonst ${Math.round(b.quoteOhne * 100)} %</p>
      ${nachRolle}
      ${dosis ? dosisBlock(dosis) : ''}
      ${stand ? schichtBlock(stand) : ''}
      ${profil ? zeitBlock(profil) : ''}
    </li>`;
  };

  const gefunden = fertig.length
    ? `<ul class="funde funde-zutaten">${fertig.map(zeile).join('')}</ul>`
    : `<p class="leer">Noch reicht es für keine Aussage. Nach
       ${mehrzahl(mahlzeiten, 'Mahlzeit', 'Mahlzeiten')} braucht es je Merkmal
       ${s.mindestFaelle} Fälle mit und ${s.mindestFaelle} ohne.</p>`;

  const wartet = offen.length ? `<div class="karte zaehlt">
    <h3>Zählt noch</h3>
    <ul class="wartend">${offen.slice(0, 12).map((b) => `<li>
      <span>${esc(ausloeserName(b.id, s.eigeneAusloeser))}</span>
      <span class="klein">${b.faelle} von ${s.mindestFaelle}</span>
    </li>`).join('')}</ul>
  </div>` : '';

  const zeiten = nachTageszeit(s.eintraege);
  const wann = zeiten.length ? `<div class="karte">
    <h3>Wann es auftritt</h3>
    <ul class="wartend">${zeiten.map((t) => `<li>
      <span>${t.name}</span>
      <span class="klein">${mehrzahl(t.anzahl, 'Mal', 'Mal')}, im Mittel ${fmtZahl(t.schnitt)}</span>
    </li>`).join('')}</ul>
  </div>` : '';

  const arten = nachArt(s.eintraege);
  const wie = arten.length ? `<div class="karte">
    <h3>Womit es sich meldet</h3>
    <ul class="wartend">${arten.map((a) => `<li>
      <span>${esc(beschwerdeName(a.id))}</span>
      <span class="klein">${mehrzahl(a.anzahl, 'Mal', 'Mal')}</span>
    </li>`).join('')}</ul>
  </div>` : '';

  /*
   * Die Reihenfolge ist eine Aussage.
   *
   * Warnzeichen und Einordnung zuerst (bildTeil), dann die Kriterien – das
   * Nächste an einer Diagnose. Dann der Auslassversuch, weil er das Einzige
   * ist, was aus all dem einen Beleg macht. Danach erst die Zahlen: Klassen vor
   * einzelnen Zutaten, weil sie belastbarer sind. Und zum Schluss, was noch
   * fehlt – die Liste für den Termin. Wer nur die ersten beiden Karten liest,
   * hat trotzdem das Wichtigste.
   */
  return lageTeil(s, d) + bildTeil(s, d) + unterleibVorschlag(s)
    + kriterienTeil(s, d) + versuchTeil(s, d) + provokationTeil(s, d)
    + klassenTeil(s, d) + gefunden + spaetTeil(s, d) + wechselTeil(s, d)
    + wartet + ansprechenTeil(s, d)
    + zeitTeil(d) + wann + wie + stuhlTeil(s) + brauchtTeil(s, d)
    + zyklusTeil(s) + erklaerung;
}

/** Der Stuhlgang in Zahlen, sobald überhaupt etwas eingetragen ist. */
function stuhlTeil(s) {
  const z = stuhlZahlen(s.eintraege, s.tage);
  if (!z.gesamt) return '';
  const anteil = (n) => (z.gesamt ? `${Math.round((n / z.gesamt) * 100)} %` : '–');
  return `<div class="karte karte-stuhl">
    <h3>Stuhlgang</h3>
    <ul class="wartend">
      <li><span>Eingetragen</span><span class="klein">${mehrzahl(z.gesamt, 'Mal', 'Mal')},
        ${fmtZahl(z.proTag)} je notiertem Tag</span></li>
      <li><span>Hart (Typ 1–2)</span><span class="klein">${z.hart}× · ${anteil(z.hart)}</span></li>
      <li><span>Unauffällig (3–5)</span><span class="klein">${z.normal}× · ${anteil(z.normal)}</span></li>
      <li><span>Weich (6–7)</span><span class="klein">${z.weich}× · ${anteil(z.weich)}</span></li>
      ${z.dringend ? `<li><span>Musste dringend</span><span class="klein">${z.dringend}×</span></li>` : ''}
      ${z.unvollstaendig ? `<li><span>Gefühl, nicht fertig</span><span class="klein">${z.unvollstaendig}×</span></li>` : ''}
    </ul>
  </div>`;
}

/* ==================== Reiter: Ruhe ==================== */

function ruheAnsicht(s) {
  const u = uebungVon(s.atemUebung);
  const runden = s.atemRunden || u.runden;
  const laeuft = !!ui.atem;

  // Während die Übung läuft, steht auf dem Bildschirm nichts als der Kreis und
  // der Abbruchknopf: Wer die Augen zumacht, braucht keine Auswahl, und wer sie
  // aufmacht, soll nicht auf Einstellungen schauen.
  const wahl = `<div class="karte">
    <h3>Übung</h3>
    <div class="wahl">${UEBUNGEN.map((x) => `
      <button type="button" class="wahl-btn${x.id === u.id ? ' an' : ''}"
              data-act="atem-uebung" data-id="${x.id}">${esc(x.name)}</button>`).join('')}</div>
    <p class="feld-name">${esc(u.zweck)}</p>
    <p class="klein">${esc(u.beschreibung)}</p>
    <p class="feld-name">Runden – etwa ${dauerText(gesamtDauer(u, runden))}</p>
    <div class="wahl">${[2, 4, 6, 8, 10, 15].map((n) => `
      <button type="button" class="wahl-btn${runden === n ? ' an' : ''}"
              data-act="atem-runden" data-n="${n}">${n}</button>`).join('')}</div>
  </div>`;

  const kreis = `<div class="atem${laeuft ? ' laeuft' : ''}">
    <div class="atem-kreis" id="atemKreis"><span id="atemZahl">${laeuft ? '' : '·'}</span></div>
    <p class="atem-wort" id="atemWort">${laeuft ? '' : 'Bereit, wenn du bist'}</p>
    <p class="klein" id="atemRunde">${laeuft ? '' : `${runden} Runden, ${esc(u.name)}`}</p>
  </div>`;

  return `
  <h2>Ruhe</h2>
  <p class="klein">Langes Ausatmen schaltet auf den Teil des Nervensystems um,
  unter dem der Darm arbeitet statt stillzustehen. Bei Beschwerden, die an
  Anspannung hängen, ist das eine Behandlung und keine Beschäftigung.</p>

  ${kreis}

  <div class="karte">
    <div class="reihe">
      ${laeuft
    ? knopf('atem-stopp', 'Abbrechen', 'btn-block')
    : knopf('atem-start', 'Anfangen', 'btn-primary btn-block')}
    </div>
    <p class="klein" style="margin-top:10px">Der Ton sagt dir, was dran ist:
    aufwärts einatmen, ein kurzer Ton halten, abwärts ausatmen. Damit kannst du
    die Augen zumachen und das Handy weglegen.
    ${s.ton ? '' : '<b>Der Ton ist gerade aus – unter „Mehr" wieder an.</b>'}</p>
  </div>

  ${laeuft ? '' : wahl}`;
}

/* ---------- Der Ablauf ---------- */

function atemZeigen(schritt, restSek) {
  const zahl = document.getElementById('atemZahl');
  const wort = document.getElementById('atemWort');
  const runde = document.getElementById('atemRunde');
  const kreis = document.getElementById('atemKreis');
  if (!zahl || !kreis) return;
  zahl.textContent = String(Math.max(1, Math.ceil(restSek)));
  wort.textContent = schritt.wort;
  runde.textContent = `Runde ${schritt.runde} von ${schritt.von}`;
  // Der Kreis wächst über die Dauer der Phase mit. Beim Halten bleibt er,
  // wo er ist – deshalb wird die Größe nur bei ein und aus gesetzt.
  kreis.style.transitionDuration = `${schritt.sek}s`;
  if (schritt.art === 'ein') kreis.style.transform = 'scale(1)';
  else if (schritt.art === 'aus') kreis.style.transform = 'scale(0.45)';
  kreis.dataset.art = schritt.art;
}

function atemSchritt() {
  const a = ui.atem;
  if (!a) return;
  if (a.i >= a.schritte.length) { atemFertig(); return; }
  const schritt = a.schritte[a.i];
  a.bisMs = Date.now() + schritt.sek * 1000;
  if (a.ton) {
    if (schritt.art === 'ein') KLAENGE.ein();
    else if (schritt.art === 'aus') KLAENGE.aus();
    else KLAENGE.halten();
  }
  ruettel(schritt.art === 'halten' ? 30 : 60);
  atemZeigen(schritt, schritt.sek);
  a.wecker = setTimeout(() => { a.i += 1; atemSchritt(); }, schritt.sek * 1000);
}

function atemFertig() {
  const a = ui.atem;
  if (a && a.ton) KLAENGE.fertig();
  ruettel([60, 80, 60]);
  atemStopp();
  melden('Geschafft.');
}

function atemStart(s) {
  const u = uebungVon(s.atemUebung);
  const runden = s.atemRunden || u.runden;
  // Der Tonkontext darf erst hier entstehen: Browser lassen Audio nur nach
  // einer Nutzergeste zu, und "Anfangen" ist diese Geste.
  const ton = s.ton !== false && weckKlang();
  ui.atem = { schritte: ablauf(u, runden), i: 0, ton, wecker: null, uhr: null };
  zeichne();
  // Erst zeichnen, dann anfangen – sonst greift der erste Schritt auf Elemente
  // zu, die es noch nicht gibt.
  queueMicrotask(() => {
    if (!ui.atem) return;
    ui.atem.uhr = setInterval(() => {
      const a = ui.atem;
      if (!a || a.i >= a.schritte.length) return;
      atemZeigen(a.schritte[a.i], (a.bisMs - Date.now()) / 1000);
    }, 200);
    atemSchritt();
  });
}

function atemStopp() {
  if (!ui.atem) return;
  clearTimeout(ui.atem.wecker);
  clearInterval(ui.atem.uhr);
  ui.atem = null;
  zeichne();
}

/* ==================== Reiter: Ideen ==================== */

/** Die Ideen als Text – zum Kopieren oder Weitergeben. */
function ideenText(s) {
  const zeile = (i) => `${i.erledigt ? '[erledigt] ' : ''}${i.text}`;
  return ['Bauchbuch – Ideen und Verbesserungsvorschläge', '']
    .concat(s.ideen.map(zeile)).join('\n');
}

/*
 * Vorschläge gehen von selbst hinaus.
 *
 * Nicht sofort: erst eine Minute nach der letzten Änderung. Wer einen Satz
 * ausbessert oder eine Idee gleich wieder löscht, soll sie nicht schon
 * verschickt haben – die Bedenkzeit ist der ganze Unterschied zwischen
 * „schickt automatisch" und „nimmt einem die Möglichkeit, es sich anders zu
 * überlegen".
 *
 * Die Uhr läuft nur, solange die App offen ist. Kein Dienst im Hintergrund,
 * keine Warteschlange, die später doch noch sendet: Wird die App zugemacht,
 * passiert nichts. Und geht es schief, wird nicht in einer Schleife weiter
 * probiert – der nächste Anlass (eine Änderung, ein Blick auf den Reiter)
 * versucht es erneut, und bis dahin steht sichtbar, dass noch etwas offen ist.
 */
let sendeUhr = null;

function sendenAnstossen() {
  clearTimeout(sendeUhr);
  if (!store.ideenOffen()) return;
  sendeUhr = setTimeout(async () => {
    if (!store.ideenOffen()) return;
    try {
      await schicken(ideenText(store.zustandLesen()));
      store.ideenGeschicktMerken();
      zeichne();
    } catch {
      // Kein Netz oder der Kasten mag nicht. Nichts abhaken, nichts melden –
      // in der Anzeige steht ohnehin, dass noch etwas unterwegs ist, und der
      // nächste Anlass nimmt einen neuen Anlauf.
    }
  }, BEDENKZEIT);
}

function ideenAnsicht(s) {
  // Beim Ansehen des Reiters die Uhr (neu) stellen: Das ist der Anlass, an
  // dem ein früher gescheiterter Versuch wieder eine Chance bekommt.
  sendenAnstossen();
  const offen = s.ideen.filter((i) => !i.erledigt);
  const fertig = s.ideen.filter((i) => i.erledigt);

  const zeile = (i) => `<li class="idee${i.erledigt ? ' ab' : ''}">
    <button type="button" class="idee-haken" data-act="idee-haken" data-id="${i.id}"
            aria-pressed="${i.erledigt}"
            aria-label="${i.erledigt ? 'Wieder offen' : 'Als erledigt merken'}">
      ${i.erledigt ? '✓' : ''}</button>
    <span class="idee-text">${esc(i.text)}<span class="zeile-tags">${esc(fmtDatum(i.am))}</span></span>
    <button type="button" class="strang-weg" data-act="idee-weg" data-id="${i.id}"
            aria-label="Idee löschen">×</button>
  </li>`;

  /*
   * Der Hinweis, der oben stehen muss.
   *
   * Ohne ihn ist dieser Reiter eine Falle: Man tippt seine Vorschläge ein, sie
   * stehen ordentlich untereinander, und man nimmt selbstverständlich an, dass
   * sie jemanden erreichen. Sie erreichen niemanden – die App hat keinen
   * Server, das ist ihre wichtigste Eigenschaft und hier ihr Preis. Also steht
   * es dort, wo man es liest, bevor man den ersten Satz schreibt.
   */
  const nichtGeschickt = store.ideenOffen();
  const versand = nichtGeschickt ? `<div class="karte karte-merk">
    <h3>${mehrzahl(nichtGeschickt, 'Idee geht', 'Ideen gehen')} gleich raus</h3>
    <p class="klein">In etwa einer Minute geht ${nichtGeschickt === 1 ? 'sie' : 'die Liste'}
    von selbst an Tobi – du musst nichts antippen. <b>Bis dahin kannst du noch
    ausbessern oder löschen</b>; was du wegnimmst, geht nicht mehr mit.</p>
    <div class="reihe">
      ${knopf('ideen-senden', 'Jetzt gleich', 'btn-primary')}
      ${knopf('ideen-teilen', 'Anders schicken')}
      ${knopf('ideen-kopieren', 'Kopieren')}
    </div>
  </div>` : '';

  return `
  <h2>Ideen fürs Bauchbuch</h2>
  <p class="klein">Was fehlt, was stört, was du anders hättest. <b>Was du hier
  einträgst, geht automatisch an Tobi</b> – etwa eine Minute nachdem du fertig
  getippt hast, damit du es vorher noch ändern oder löschen kannst.</p>
  <p class="klein">Es geht <b>nur diese Liste</b> raus, sonst nichts.
  Beschwerden, Mahlzeiten, Medikamente und alles andere aus deinem Tagebuch
  bleiben auf diesem Gerät.</p>

  ${versand}

  <div class="karte">
    <label class="feld-name" for="ideeText">Neue Idee</label>
    <textarea class="feld feld-breit" id="ideeText" rows="3"
              placeholder="Ich hätte gern …"></textarea>
    <div class="reihe" style="margin-top:8px">
      ${knopf('idee-neu', 'Eintragen', 'btn-primary')}
    </div>
  </div>

  ${s.ideen.length ? `
    <ul class="ideen">${offen.map(zeile).join('')}${fertig.map(zeile).join('')}</ul>
    <div class="karte">
      <p class="klein">${mehrzahl(offen.length, 'offene Idee', 'offene Ideen')}${fertig.length ? `, ${fertig.length} erledigt` : ''}.
      ${nichtGeschickt ? `Davon ${mehrzahl(nichtGeschickt, 'noch unterwegs', 'noch unterwegs')}.`
    : 'Alle bei Tobi angekommen.'}</p>
      <div class="reihe">
        ${nichtGeschickt ? knopf('ideen-senden', 'Jetzt gleich', 'btn-primary') : ''}
        ${knopf('ideen-teilen', 'Anders schicken')}
        ${knopf('ideen-kopieren', 'Alle kopieren')}
      </div>
    </div>`
    : '<p class="leer">Noch keine Idee eingetragen.</p>'}`;
}

/**
 * Warnzeichen und die Einordnung – das, was am nächsten an eine Diagnose
 * herankommt, ohne eine zu sein.
 */
function bildTeil(s, d) {
  // Gerechnet wird das in musterDaten, einmal für alle – siehe dort.
  const b = d.bild;

  // Warnzeichen stehen vor allem anderen und ohne Statistik daneben.
  const warn = b.warnungen.length ? `<div class="karte karte-warn">
    <h3>${b.warnungen.some((w) => w.dringlichkeit === 'sofort')
    ? 'Das gehört heute abgeklärt' : 'Das gehört zeitnah abgeklärt'}</h3>
    <ul class="warnliste">${b.warnungen.map((w) => `<li class="w-${w.dringlichkeit}">
      <b>${esc(w.name)}</b>
      <span class="zeile-tags">${esc(w.warum)}</span>
      <span class="klein">${mehrzahl(w.anzahl, 'Mal', 'Mal')} eingetragen,
        zuletzt ${esc(fmtDatum(w.zuletzt, true))}</span>
    </li>`).join('')}</ul>
    <p class="klein">Bei Blut, schwarzem Stuhl oder Schmerz mit Ausstrahlung in
    Arm oder Kiefer nicht auf einen Termin warten – Notaufnahme oder 112.</p>
  </div>` : '';

  if (!b.muster.length) {
    return warn + (genugFuerBild(b.basis) ? '' : `<div class="karte">
      <h3>Einordnung</h3>
      <p class="klein">Für eine Einordnung fehlt noch Material:
      ${b.basis.notierteTage} notierte Tage und ${b.basis.beschwerden} Eintragungen
      zu Beschwerden. Ab etwa zehn Tagen und fünf Eintragungen steht hier, wonach
      das Bild aussieht.</p>
    </div>`);
  }

  const kasten = (m, i) => `<li class="muster${i === 0 ? ' erst' : ''}">
    <div class="muster-kopf">
      <b>${esc(m.name)}</b>
      ${i === 0 ? '<span class="fund-urteil">passt am ehesten</span>' : ''}
    </div>
    <p>${esc(m.satz)}</p>
    <p class="feld-name">Woran das zu sehen ist</p>
    <ul class="belege">${m.belege.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
    <p class="feld-name">Was dahinterstecken kann – und was es unterscheidet</p>
    <ul class="ursachen">${m.ursachen.map((u) => `<li>
      <b>${esc(u.name)}</b><span class="zeile-tags">${esc(u.klaerung)}</span>
    </li>`).join('')}</ul>
  </li>`;

  return `${warn}<div class="karte">
    <h3>Einordnung</h3>
    <p class="klein">Das hier ist <b>keine Diagnose</b>, und zwar nicht aus
    Vorsicht, sondern weil es keine sein kann: Gastritis, Magengeschwür,
    Reflux, funktionelle Dyspepsie und ein Reizdarm sehen im Tagebuch teils
    gleich aus. Auseinander hält sie eine Untersuchung. Was hier steht, ist die
    Beschreibung deines Musters in den Worten, die in einer Praxis benutzt
    werden – damit das Gespräch dort nicht bei null anfängt.</p>
    <ul class="muster-liste">${b.muster.slice(0, 3).map(kasten).join('')}</ul>
    <p class="klein">Grundlage: ${b.basis.notierteTage} notierte Tage,
      ${b.basis.beschwerden} Eintragungen zu Beschwerden, davon
      ${b.basis.zuordenbar} einer Mahlzeit zuzuordnen.</p>
  </div>
  ${b.fragen.length ? `<div class="karte">
    <h3>Fragen für den nächsten Termin</h3>
    <ul class="fragen">${b.fragen.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>
    <p class="klein">Stehen auch im Bericht unter „Mehr".</p>
  </div>` : ''}`;
}

/** Der Zyklus, wenn genug davon eingetragen wurde. */
function zyklusTeil(s) {
  const phasen = phasenBilanz(s.eintraege, s.tage, tagesWert);
  if (!phasen.length) return '';
  const laenge = mittlereLaenge(s.tage);
  const spanne = schwankung(s.tage);
  // Die Zahlen standen hier immer schon; was fehlte, war der Satz dazu. Er
  // kommt nur, wenn er zulässig ist – zwei abgeschlossene Zyklen und genug
  // Tage in beiden verglichenen Phasen.
  const urteil = phasenUrteil(phasen, s.tage);
  return `<div class="karte">
    <h3>Nach Zyklusphase</h3>
    ${urteil.deutlich ? `<p>${esc(urteil.satz)}</p>` : ''}
    <ul class="wartend">${phasen.map((p) => `<li>
      <span>${esc(p.name)}</span>
      <span class="klein">${mehrzahl(p.tage, 'Tag', 'Tage')}, im Mittel ${fmtZahl(p.schnitt)}</span>
    </li>`).join('')}</ul>
    ${urteil.pruefbar && !urteil.deutlich ? `<p class="klein">${esc(urteil.satz)}</p>` : ''}
    <p class="klein">
      ${laenge ? `Deine Zyklen dauern im Mittel ${laenge} Tage${spanne ? ` (${spanne.von} bis ${spanne.bis}, aus ${spanne.anzahl} Zyklen)` : ''}. ` : ''}
      ${belastbar(s.tage) ? '' : 'Noch keine zwei abgeschlossenen Zyklen – die Zahlen stehen da, aber es folgt noch nichts daraus. '}
      Die Phasen sind geschätzt: Die Periode kommt aus deinen Eintragungen, die
      Mitte aus der halben Zykluslänge. <b>Nicht zur Verhütung geeignet</b> –
      der Eisprung wird hier nicht gemessen.</p>
  </div>`;
}

/*
 * Die Waage – die einzige Zahl hier, die nicht aus dem Gefühl kommt.
 *
 * Alles andere in dieser App ist Selbstauskunft, und das ist bei
 * Bauchbeschwerden nicht anders möglich. Das Gewicht ist die Ausnahme, und
 * ausgerechnet es ist die klinisch wichtigste Zahl, die ein Tagebuch
 * beitragen kann: Ein ungewollter Verlust ist das stärkste einzelne Zeichen
 * dafür, dass mehr dahintersteckt als eine gereizte Verdauung.
 *
 * Die Frage nach der Absicht steht mit auf der Karte und nicht im
 * Kleingedruckten. Ohne sie wäre die ganze Rechnung ein Fehlalarm-Automat:
 * Fünf Prozent weniger sind ein Warnzeichen, wenn sie ungewollt kommen, und
 * ein Erfolg, wenn jemand dafür gearbeitet hat.
 */
function gewichtKarte(s) {
  const g = gewichtsBild(s.gewicht, heuteISO(), s.abnehmenGewollt);
  const letzte = (s.gewicht || []).slice(0, 6);

  return `<div class="karte ${g.warnung ? 'karte-warn' : ''}">
    <h3>Gewicht</h3>
    ${g.urteil !== 'keine' ? `<p><b>${GEWICHT_WORT[g.urteil]}.</b></p>` : ''}
    <p class="klein">${esc(g.satz)}</p>
    <p class="feld-name">Heute gewogen</p>
    <div class="reihe">
      <!--
        Bewusst kein type="number": Auf einem deutschen Handy liefert die
        Zifferntastatur ein Komma, und ein Zahlenfeld wirft ein Komma
        stillschweigend weg – die Eingabe käme leer an. Mit inputmode="decimal"
        erscheint dieselbe Tastatur, das Komma kommt durch, und umgerechnet
        wird unten in „gewicht-los".
      -->
      <input type="text" class="feld" data-act="gewicht-neu" inputmode="decimal"
             placeholder="kg" aria-label="Gewicht in Kilogramm">
      ${knopf('gewicht-los', 'Eintragen', 'btn-primary')}
    </div>
    ${letzte.length ? `<ul class="wartend">${letzte.map((m) => `<li>
      <span>${esc(fmtDatum(m.am, true))}</span>
      <span class="klein">${fmtZahl(m.kg)} kg
        <button type="button" class="strang-weg" data-act="gewicht-weg"
                data-iso="${m.am}" aria-label="Messung löschen">×</button></span>
    </li>`).join('')}</ul>` : ''}
    <p class="feld-name">Nimmst du gerade absichtlich ab?</p>
    <div class="wahl">
      <button type="button" class="wahl-btn${s.abnehmenGewollt ? '' : ' an'}"
              data-act="abnehmen" data-n="nein">Nein</button>
      <button type="button" class="wahl-btn${s.abnehmenGewollt ? ' an' : ''}"
              data-act="abnehmen" data-n="ja">Ja, gewollt</button>
    </div>
    <p class="klein">Das ist keine Nebensache: Ein Verlust von fünf Prozent
    gehört abgeklärt, wenn er ungewollt kommt – und ist ein Erfolg, wenn du
    dafür gearbeitet hast. Den Unterschied sieht keine Rechnung, nur du.</p>
  </div>`;
}

/*
 * Eine Sicherung, die als Text ankommt statt als Datei.
 *
 * Das fehlte, und es fiel erst bei einem Umzug auf: Wer die App an einer
 * Adresse benutzt hat und an eine andere wechselt, findet dort ein leeres
 * Tagebuch – der Speicher eines Browsers gehört der Adresse, nicht dem
 * Menschen. Der Weg hinaus über „Als Text" war da; der Weg hinein gab es nur
 * als Datei.
 *
 * Und eine Datei ist nicht immer zu haben. In einer eingebetteten Fassung
 * unterbindet der Rahmen jeden Download, den die Seite selbst auslöst – dort
 * bleibt der Knopf „Als Datei sichern" ohne Wirkung, und die Zwischenablage
 * ist der einzige Ausgang. Wer so aus einer Sackgasse heraus muss, braucht
 * auf der anderen Seite ein Feld zum Einfügen.
 *
 * Das ist zugleich der datensparsamste Weg: kopieren und einfügen bleibt auf
 * demselben Gerät. Eine Datei wandert über den Download-Ordner, und wer sie
 * sich selbst schickt, hat sein Tagebuch in einem Postfach liegen.
 */
function einfuegeKarte() {
  if (ui.einfuegen === null) return '';
  return `<div class="schloss">
    <p class="feld-name">Sicherungstext hier einfügen</p>
    <textarea class="bericht" rows="6" data-act="einfuegen-text"
      placeholder="Den kopierten Text einfügen (beginnt mit { oder mit BAUCHBUCH)"></textarea>
    <p class="klein">Das ersetzt, was hier gerade gespeichert ist. Bei einem
    Umzug ist genau das gewollt; wenn hier schon etwas drinsteht, das du
    behalten willst, sichere es vorher.</p>
    <div class="reihe">
      ${knopf('einfuegen-los', 'Einlesen', 'btn-primary')}
      ${knopf('einfuegen-zu', 'Abbrechen', 'btn-ghost')}
    </div>
  </div>`;
}

/**
 * Die Sicherung mit Passwort.
 *
 * Der wundeste Punkt der App hatte nie etwas mit Medizin zu tun: Die Sicherung
 * lag als offene JSON-Datei im Download-Ordner. Ein Tagebuch über den Körper
 * eines Menschen, im Klartext, auf einem Gerät, das man verleiht oder verliert.
 *
 * Zwei Sätze müssen hier stehen und stehen deshalb groß da: Ein vergessenes
 * Passwort heißt, dass die Sicherung weg ist – es gibt keine Hintertür, und
 * das ist der Preis dafür, dass es auch für andere keine gibt. Und wo der
 * Browser nicht verschlüsseln kann (die Ein-Datei-Fassung per Doppelklick),
 * steht der Grund statt eines Knopfes, der nichts täte.
 */
function schlossKarte() {
  if (!tresorMoeglich()) {
    return `<p class="klein" style="margin-top:10px">Verschlüsseln geht hier
    nicht: Dein Browser gibt die Verschlüsselung nur über eine gesicherte
    Adresse frei, und diese Fassung läuft aus einer Datei. Über die Adresse
    (https) steht der Knopf da.</p>`;
  }
  if (!ui.schloss) {
    return `<div class="reihe" style="margin-top:10px">
      ${knopf('schloss-auf', 'Mit Passwort sichern')}
    </div>`;
  }
  return `<div class="schloss">
    <p class="feld-name">Passwort für diese Sicherungsdatei</p>
    <input type="password" class="feld feld-breit" id="tresorWort"
           data-act="tresor-wort" autocomplete="new-password"
           placeholder="mindestens acht Zeichen">
    <p class="klein"><b>Vergessen heißt weg.</b> Es gibt keine Hintertür, kein
    Zurücksetzen und niemanden zum Fragen – genau deshalb kommt auch sonst
    niemand hinein. Schreib es dir auf, bevor du hier tippst.</p>
    <div class="reihe">
      ${knopf('tresor-export', 'Verschlüsselt sichern', 'btn-primary')}
      ${knopf('schloss-zu', 'Abbrechen', 'btn-ghost')}
    </div>
  </div>`;
}

/* ==================== Reiter: Mehr ==================== */

function mehrAnsicht(s) {
  const gesichert = s.lastBackup
    ? `zuletzt am ${fmtDatum(s.lastBackup.on, true)} mit ${mehrzahl(s.lastBackup.anzahl, 'Eintrag', 'Einträgen')}`
    : 'noch nie';
  const alt = s.lastBackup ? tageDazwischen(s.lastBackup.on, heuteISO()) : 999;
  const seit = store.letzterTermin(heuteISO());

  const bericht = ui.bericht ? `<div class="karte">
    <h3>Bericht</h3>
    <textarea class="bericht" readonly rows="16">${esc(ui.bericht)}</textarea>
    <div class="reihe">
      ${knopf('bericht-kopieren', 'Kopieren', 'btn-primary')}
      ${knopf('bericht-laden', 'Als Datei')}
      ${knopf('bericht-zu', 'Schließen', 'btn-ghost')}
    </div>
  </div>` : '';

  return `
  ${installKarte()}

  <div class="karte">
    <h3>Sicherung</h3>
    <p class="klein">Alles steht ausschließlich in diesem Browser. Wird der
    Speicher der Website gelöscht, ist das Tagebuch weg – eine andere Kopie
    gibt es nirgends. Die Sicherung ist eine gewöhnliche JSON-Datei.</p>
    <p class="klein">${ui.speicher === true
    ? '<b>Dauerhafter Speicher: zugesagt.</b> Der Browser hat zugesichert, '
      + 'diesen Speicher nicht von selbst aufzuräumen. Sichern solltest du '
      + 'trotzdem – eine Zusage ist kein Gerät, das nicht kaputtgeht.'
    : ui.speicher === false
      ? '<b>Dauerhafter Speicher: nicht zugesagt.</b> Der Browser darf diesen '
        + 'Speicher bei Platzmangel oder längerer Nichtbenutzung räumen. Meist '
        + 'gibt er die Zusage, sobald die App auf dem Startbildschirm liegt und '
        + 'ein paar Mal benutzt wurde. Bis dahin ist die Sicherung das Einzige, '
        + 'worauf Verlass ist.'
      : '<b>Dauerhafter Speicher: unbekannt.</b> Dieser Browser sagt nicht, ob '
        + 'er den Speicher verschont – auf iOS ist das der Normalfall. Dort '
        + 'kann er nach längerer Nichtbenutzung geräumt werden. Sichern.'}</p>
    <p class="klein ${alt > 30 ? 'warnend' : ''}">Gesichert: ${gesichert}</p>
    <div class="reihe">
      ${knopf('export', 'Als Datei sichern', 'btn-primary')}
      ${knopf('sicherung-text', 'Als Text')}
      ${knopf('import', 'Datei einlesen')}
      ${knopf('einfuegen-auf', 'Text einlesen')}
    </div>
    ${schlossKarte()}
    ${einfuegeKarte()}
    ${ui.sicherung ? `
      <p class="klein" style="margin-top:10px">Alles markieren und in eine
      Notiz oder eine Mail an sich selbst kopieren. Zum Zurückholen denselben
      Text als <code>.json</code> speichern und über „Einlesen" wählen.</p>
      <textarea class="bericht" readonly rows="10">${esc(ui.sicherung)}</textarea>
      <div class="reihe">
        ${knopf('sicherung-kopieren', 'Kopieren', 'btn-primary')}
        ${knopf('sicherung-zu', 'Schließen', 'btn-ghost')}
      </div>` : ''}
  </div>

  ${mittelKarte(s)}

  <div class="karte">
    <h3>Für den Arzttermin</h3>
    <p class="klein">Ein Blatt Text mit Zeitraum, Häufigkeit, Tageszeiten und
    dem, was auffällt. Zum Kopieren oder Ausdrucken.</p>
    <div class="reihe">
      ${seit ? knopf('bericht-seit', `Seit dem ${fmtDatum(seit)}`, 'btn-primary') : ''}
      ${knopf('bericht', 'Letzte 30 Tage', seit ? '' : 'btn-primary', 'data-n="30"')}
      ${knopf('bericht', '90 Tage', '', 'data-n="90"')}
      ${knopf('drucken', 'Drucken')}
    </div>
    <p class="klein">${seit
    ? `„Seit dem ${esc(fmtDatum(seit))}" deckt genau die Zeit seit deinem letzten
       Termin ab – das ist das Fenster, über das dort geredet wird, und keines
       der runden Zahlen daneben.`
    : '30 und 90 Tage sind runde Zahlen ohne Bedeutung. Trag unten deinen letzten Termin ein, dann deckt der Bericht genau die Zeit seitdem ab.'}</p>
    <p class="klein">„Drucken" nimmt den Reiter <b>Muster</b> mit aufs Papier –
    also die Einordnung, die Warnzeichen und den Verlauf als Bild. Das sagt in
    der Sprechstunde mehr als eine Textspalte.</p>
  </div>
  ${bericht}

  ${gewichtKarte(s)}

  <div class="karte">
    <h3>Arzttermine</h3>
    <p class="klein">Wann du dort warst. Mehr braucht es nicht – daraus weiß der
    Bericht, über welchen Zeitraum er berichten soll.</p>
    <input type="date" class="feld" data-act="termin-neu" max="${heuteISO()}"
           value="" aria-label="Datum eines Arzttermins">
    ${(s.termine || []).length ? `<ul class="wartend">${s.termine.map((t) => `<li>
      <span>${esc(fmtDatum(t, true))}</span>
      <span class="klein">${t === seit ? 'der letzte' : ''}
        <button type="button" class="strang-weg" data-act="termin-weg"
                data-iso="${t}" aria-label="Termin löschen">×</button></span>
    </li>`).join('')}</ul>` : '<p class="klein">Noch keiner eingetragen.</p>'}
  </div>

  <div class="karte">
    <h3>Auswertung</h3>
    <p class="feld-name">Beschwerden zählen bis <b>${s.fenster} Stunden</b> nach dem Essen</p>
    <div class="wahl">${[2, 3, 4, 6, 8].map((n) => `
      <button type="button" class="wahl-btn${s.fenster === n ? ' an' : ''}"
              data-act="fenster" data-n="${n}">${n} h</button>`).join('')}</div>
    <p class="feld-name">Erst ab <b>${s.mindestFaelle}</b> Fällen etwas sagen</p>
    <div class="wahl">${[3, 5, 8, 12].map((n) => `
      <button type="button" class="wahl-btn${s.mindestFaelle === n ? ' an' : ''}"
              data-act="mindest" data-n="${n}">${n}</button>`).join('')}</div>
  </div>

  <div class="karte">
    <h3>Eigene Auslöser</h3>
    <p class="klein">Was in der Liste fehlt – ein bestimmtes Gericht, ein
    Getränk, ein Medikament, das man nicht als Medikament einträgt.</p>
    ${s.eigeneAusloeser.length ? `<ul class="wartend">${s.eigeneAusloeser.map((a) => `<li>
      <span>${esc(a.name)}</span>
      <button type="button" class="strang-weg" data-act="ausloeser-weg" data-id="${esc(a.id)}"
              aria-label="Auslöser entfernen">×</button>
    </li>`).join('')}</ul>` : '<p class="klein">Noch keine.</p>'}
    <div class="reihe">
      <input type="text" class="feld" id="neuerAusloeser" placeholder="z. B. Rotwein"
             aria-label="Name des eigenen Auslösers">
      ${knopf('ausloeser-neu', 'Hinzufügen')}
    </div>
  </div>

  <div class="karte">
    <h3>Seit wann hast du das?</h3>
    <p class="klein">Die eine Angabe, die aus dem Tagebuch nicht hervorgeht – es
    beginnt an dem Tag, an dem du anfängst zu schreiben, und das ist fast nie
    der Tag, an dem es angefangen hat. Die Rom-Kriterien unter „Muster"
    verlangen einen Beginn vor mindestens einem halben Jahr; ohne diese Zeile
    bleibt dort eine Bedingung offen. Ungefähr genügt.</p>
    <input type="month" class="feld" data-act="seit" max="${heuteISO().slice(0, 7)}"
           value="${esc(s.beschwerdenSeit || '')}" aria-label="Monat, seit dem die Beschwerden bestehen">
    ${s.beschwerdenSeit ? `<p class="klein">Notiert: seit ${esc(s.beschwerdenSeit)}.
      ${knopf('seit-weg', 'Löschen', 'btn-ghost')}</p>` : ''}
  </div>

  <div class="karte">
    <h3>Welche Fragen stellt der Tag?</h3>
    <p class="klein">Nicht jede Frage will jeder beantworten. Was hier aus ist,
    erscheint nicht in der Tagesansicht – schon Eingetragenes bleibt erhalten
    und wird weiter mitgerechnet.</p>
    ${marken(TAGESFRAGEN, s.tagesfragen || [], 'frageAn')}
  </div>

  <div class="karte">
    <h3>Ton</h3>
    <p class="klein">Nur für die Atemübung unter „Ruhe". Sonst gibt diese App
    keinen Laut von sich.</p>
    <div class="wahl">
      <button type="button" class="wahl-btn${s.ton !== false ? ' an' : ''}" data-act="ton">
        ${s.ton !== false ? 'Ton ist an' : 'Ton ist aus'}</button>
    </div>
  </div>

  <div class="karte">
    <h3>Farbe</h3>
    <div class="wahl">${THEMEN.map((t) => `
      <button type="button" class="wahl-btn${s.theme === t.id ? ' an' : ''}"
              data-act="theme" data-id="${t.id}">${t.name}</button>`).join('')}</div>
  </div>

  <div class="karte">
    <h3>Was diese App nicht tut</h3>
    <p class="klein"><b>Deine Gesundheitsdaten gehen nirgendwohin.</b> Kein
    Server, kein Konto, keine Anmeldung, keine Zählung von Aufrufen. Was du
    isst, wie es dir geht, was du nimmst – das bleibt auf diesem Gerät.</p>
    <p class="klein">Das Einzige, was diese App je verschickt, sind die
    Verbesserungsvorschläge unter „Ideen". Die gehen von selbst raus, kurz
    nachdem du sie eingetragen hast – dort steht das auch. Sonst nichts.</p>
    <p class="klein">Sie stellt auch keine Diagnose und ersetzt keine ärztliche
    Beratung – sie zählt nur mit, was eingetragen wird.</p>
  </div>

  <div class="karte">
    <h3>Alles löschen</h3>
    <p class="klein">Entfernt jede Eintragung aus diesem Browser. Nicht
    rückgängig zu machen.</p>
    ${knopf('alles-weg', 'Tagebuch löschen', 'btn-danger')}
  </div>`;
}

/* ---------- Was die Mittel bewirken ---------- */

function mittelKarte(s) {
  // Was tatsächlich eingetragen wurde – das steht oben, alles andere darunter.
  const eigene = new Map();
  s.eintraege.filter((e) => e.art === 'medikament').forEach((e) => {
    const name = String(e.mittel || '').trim();
    if (!name) return;
    const v = eigene.get(name) || { name, anzahl: 0, zuletzt: e.am };
    v.anzahl += 1;
    if (e.am > v.zuletzt) v.zuletzt = e.am;
    eigene.set(name, v);
  });
  const meine = [...eigene.values()].sort((a, b) => b.anzahl - a.anzahl);

  const block = (g) => `<details class="mittel">
    <summary><b>${esc(g.gruppe)}</b>${g.kuerzel ? ` <span class="klein">(${esc(g.kuerzel)})</span>` : ''}
      <span class="zeile-tags">${esc(g.kurz)}</span></summary>
    <p><b>Wie es wirkt.</b> ${esc(g.wirkung)}</p>
    ${g.einnahme && g.einnahme !== '–' ? `<p><b>Wann man es nimmt.</b> ${esc(g.einnahme)}</p>` : ''}
    <p><b>Worauf zu achten ist.</b> ${esc(g.hinweis)}</p>
    <p class="klein">Zum Beispiel: ${esc(g.beispiele.join(', '))}</p>
  </details>`;

  return `<div class="karte">
    <h3>Was die Mittel bewirken</h3>
    <p class="klein">Allgemeine Information, keine Beratung – und ausdrücklich
    keine Dosierungen. Was für dich gilt, steht auf deiner Packung und sagt dir
    deine Ärztin oder deine Apotheke.</p>

    ${meine.length ? `<p class="feld-name">Was du eingetragen hast</p>
      <ul class="wartend">${meine.map((m) => {
        const g = wissenZu(m.name);
        return `<li>
          <span>${esc(m.name)}<span class="zeile-tags">${g ? esc(g.kurz) : 'nicht in der Übersicht – frag in der Apotheke nach'}</span></span>
          <span class="klein">${mehrzahl(m.anzahl, 'Mal', 'Mal')}</span>
        </li>`;
      }).join('')}</ul>`
    : '<p class="klein">Sobald du ein Medikament einträgst, steht es hier mit dem, was es bewirkt.</p>'}

    <div class="reihe" style="margin-top:10px">
      ${knopf('mittel', ui.mittel ? 'Übersicht schließen' : 'Alle Mittel im Überblick')}
    </div>

    ${ui.mittel ? `
      <div class="mittel-liste">
        ${MITTEL_WISSEN.map(block).join('')}
        <p class="feld-name">Was den Magen von der anderen Seite belastet</p>
        ${REIZSTOFFE.map(block).join('')}
      </div>` : ''}
  </div>`;
}

/* ==================== Eingabebogen ==================== */

function bogenHTML(s) {
  const b = ui.bogen;
  if (!b) return '';
  const e = b.entwurf;
  const kopf = `<div class="bogen-kopf">
    <h2>${ART_ICON[b.art]} ${ART_NAME[b.art]}</h2>
    <button type="button" class="bogen-zu" data-act="bogen-zu" aria-label="Schließen">×</button>
  </div>`;

  const zeit = `<div class="reihe reihe-zeit">
    <label class="feld-name" for="bogenUhr">Uhrzeit</label>
    <input type="time" class="feld" id="bogenUhr" data-act="uhr" value="${esc(e.um)}">
    <label class="feld-name" for="bogenTag">am</label>
    <input type="date" class="feld" id="bogenTag" data-act="bogen-datum" value="${e.am}" max="${heuteISO()}">
  </div>`;

  let mitte = '';
  if (b.art === 'essen') {
    const eigene = s.eigeneAusloeser.map((a) => ({ ...a, icon: '•' }));
    /*
     * Die Auswahl steht nach Häufigkeit, das Meistbenutzte oben.
     *
     * Sechzehn Marken plus eigene sind zu viele zum Suchen, und gesucht wird
     * jeden Tag mehrmals. Bei gleicher Häufigkeit bleibt die Reihenfolge des
     * Katalogs – sonst springt die Liste bei jedem Eintrag neu, und man greift
     * ins Leere, weil die Hand sich die Stelle gemerkt hat.
     */
    const zaehler = haeufigeZutaten(s.eintraege);
    const nachHaeufigkeit = [...AUSLOESER, ...eigene]
      .map((m, i) => ({ m, i, n: zaehler.get(m.id) || 0 }))
      .sort((x, y) => (y.n - x.n) || (x.i - y.i))
      .map((x) => x.m);

    const gewaehlt = (e.zutaten || []).map((z) => z.id);
    const vorlagen = haeufigeMahlzeiten(s.eintraege, 6);

    const zutatZeile = (z) => `<div class="zutat">
      <span class="zutat-name">${esc(ausloeserName(z.id, s.eigeneAusloeser))}</span>
      <select class="feld zutat-rolle" data-act="rolle" data-id="${esc(z.id)}"
              aria-label="Rolle von ${esc(ausloeserName(z.id, s.eigeneAusloeser))}">
        ${ROLLEN.map((r) => `<option value="${r.id}"${z.rolle === r.id ? ' selected' : ''}>${esc(r.name)}</option>`).join('')}
      </select>
    </div>`;

    mitte = `
      <label class="feld-name" for="bogenWas">Was?</label>
      <input type="text" class="feld feld-breit" id="bogenWas" data-act="was"
             value="${esc(e.was || '')}" placeholder="Haferbrei mit Banane" autocomplete="off">
      ${vorlagen.length ? `<p class="feld-name">Noch mal wie letztes Mal</p>
      <div class="marken marken-eng">${vorlagen.map((g, i) => `
        <button type="button" class="marke" data-act="vorlage" data-i="${i}">
          ${esc(kuerze(g.text, 24))}${g.anzahl > 1 ? ` <span class="marke-zahl">${g.anzahl}×</span>` : ''}
        </button>`).join('')}</div>` : ''}

      <p class="feld-name">Portion</p>
      <div class="wahl">${PORTIONEN.map((p) => `
        <button type="button" class="wahl-btn${e.portion === p.id ? ' an' : ''}"
                data-act="portion" data-id="${p.id}">${p.name}</button>`).join('')}</div>

      <p class="feld-name">Was war drin?</p>
      ${marken(nachHaeufigkeit, gewaehlt, 'zutat')}

      ${e.zutaten && e.zutaten.length ? `
        <p class="feld-name">Wie viel davon? Keine Gramm – die Rolle genügt.</p>
        <div class="zutaten">${e.zutaten.map(zutatZeile).join('')}</div>` : ''}`;
  } else if (b.art === 'beschwerde') {
    mitte = `
      <p class="feld-name">Wie stark?</p>
      ${skala(e.staerke)}
      <p class="feld-name">Wie fühlt es sich an?</p>
      ${marken(BESCHWERDEN, e.arten || [], 'beschwerdeart')}
      <p class="feld-name">Und nach dem Stuhlgang?</p>
      <div class="wahl wahl-vier">${STUHLBEZUG.map((x) => `
        <button type="button" class="wahl-btn${e.stuhlbezug === x.id ? ' an' : ''}"
                data-act="stuhlbezug" data-id="${x.id}">${esc(x.name)}</button>`).join('')}</div>
      <p class="klein">Eine der drei Fragen, an denen ein Reizdarmsyndrom
      festgemacht wird – und die einzige, die sich nicht ausrechnen lässt.
      Freiwillig; wer sie überspringt, verliert nur diese eine Auswertung.</p>
      <label class="feld-name" for="bogenNotiz">Notiz</label>
      <input type="text" class="feld feld-breit" id="bogenNotiz" data-act="notiz"
             value="${esc(e.notiz || '')}" placeholder="optional" autocomplete="off">
      <details class="warnbogen"${(e.warnzeichen || []).length ? ' open' : ''}>
        <summary>War etwas davon dabei?</summary>
        <p class="klein">Selten, aber wichtig. Was hier angekreuzt wird, taucht
        nicht in der Statistik auf, sondern ganz oben unter „Muster" – mit dem
        Hinweis, wie eilig es ist.</p>
        ${marken(WARNZEICHEN, e.warnzeichen || [], 'warnzeichen')}
      </details>`;
  } else if (b.art === 'stuhl') {
    /*
     * Die Bristol-Skala als sieben Knöpfe mit Zeichnung.
     *
     * Ohne Bild wird das nicht ausgefüllt: „Wurstförmig mit Rissen" ist keine
     * Beschreibung, die jemand auf sein eigenes Klo überträgt, und eine Frage,
     * die peinlich *und* umständlich ist, wird gar nicht beantwortet. Die
     * Striche rechts sind grob, aber sie tun, was ein Bild tun soll: Man
     * erkennt in zwei Sekunden die Zeile, die passt.
     */
    mitte = `
      <p class="feld-name">Wie sah es aus?</p>
      <div class="bristol">${BRISTOL.map((x) => `
        <button type="button" class="bristol-btn g-${x.gruppe}${e.form === x.id ? ' an' : ''}"
                data-act="bristol" data-n="${x.id}" aria-pressed="${e.form === x.id}">
          <span class="bristol-n">${x.id}</span>
          <span class="bristol-bild" aria-hidden="true">${x.bild}</span>
          <span class="bristol-name">${esc(x.name)}</span>
        </button>`).join('')}</div>
      <p class="klein">1 und 2 heißen zu lange gelegen, 6 und 7 zu kurz,
      3 bis 5 sind unauffällig. Die Skala ist seit dreißig Jahren das Maß, mit
      dem in der Sprechstunde darüber geredet wird – die Zahl allein sagt dort
      genug.</p>
      <p class="feld-name">War sonst etwas?</p>
      <div class="wahl">
        <button type="button" class="wahl-btn${e.dringend ? ' an' : ''}"
                data-act="stuhl-dringend">Musste dringend</button>
        <button type="button" class="wahl-btn${e.unvollstaendig ? ' an' : ''}"
                data-act="stuhl-unfertig">Gefühl, nicht fertig</button>
      </div>
      <details class="warnbogen"${(e.warnzeichen || []).length ? ' open' : ''}>
        <summary>War Blut dabei oder war es schwarz?</summary>
        <p class="klein">Die zwei wichtigsten Warnzeichen überhaupt stehen hier
        und nicht im Beschwerdebogen. Was hier angekreuzt wird, taucht in keiner
        Statistik auf, sondern ganz oben unter „Muster".</p>
        ${marken(WARNZEICHEN.filter((w) => ['teerstuhl', 'blutstuhl'].includes(w.id)),
    e.warnzeichen || [], 'warnzeichen')}
      </details>`;
  } else if (b.art === 'medikament') {
    const vorschlaege = [...new Set([...s.zuletztMittel, ...MITTEL_VORSCHLAEGE])].slice(0, 8);
    mitte = `
      <label class="feld-name" for="bogenMittel">Mittel</label>
      <input type="text" class="feld feld-breit" id="bogenMittel" data-act="mittel"
             value="${esc(e.mittel || '')}" placeholder="Name" autocomplete="off">
      <div class="marken">${vorschlaege.map((m) => `
        <button type="button" class="marke${e.mittel === m ? ' an' : ''}"
                data-act="mittel-vorschlag" data-id="${esc(m)}">${esc(m)}</button>`).join('')}</div>
      ${(() => {
        const g = wissenZu(e.mittel);
        return g ? `<p class="klein mittel-hinweis">${esc(g.gruppe)}: ${esc(g.kurz)}
          <br>Ausführlich unter „Mehr".</p>` : '';
      })()}
      <label class="feld-name" for="bogenDosis">Dosis</label>
      <input type="text" class="feld feld-breit" id="bogenDosis" data-act="dosis"
             value="${esc(e.dosis || '')}" placeholder="z. B. 20 mg" autocomplete="off">`;
  } else {
    mitte = `
      <label class="feld-name" for="bogenText">Notiz</label>
      <textarea class="feld feld-breit" id="bogenText" data-act="text" rows="4"
                placeholder="Was sonst noch war">${esc(e.text || '')}</textarea>`;
  }

  return `<div class="bogen-hg" data-act="bogen-zu"></div>
    <div class="bogen" role="dialog" aria-modal="true" aria-label="${ART_NAME[b.art]} eintragen">
      ${kopf}
      <div class="bogen-inhalt">${zeit}${mitte}</div>
      <div class="bogen-fuss">
        ${knopf('bogen-speichern', b.id ? 'Ändern' : 'Eintragen', 'btn-primary btn-block')}
      </div>
    </div>`;
}

/* ==================== Willkommen ==================== */

function willkommen() {
  return `<div class="willkommen">
    <h2>Bauchbuch</h2>
    <p>Ein Tagebuch für den Magen: was gegessen wurde, wann es zwickt, was
    hilft. Nach ein paar Wochen zeigt es, was zusammenfällt – und macht daraus
    einen Zettel für den nächsten Arzttermin.</p>
    <ul class="punkte">
      <li><b>Bleibt hier.</b> Kein Konto, kein Server. Was du über deinen
        Bauch einträgst, liegt im Speicher dieses Browsers und geht nirgendwo
        hin. Einzige Ausnahme: Verbesserungsvorschläge unter „Ideen" – die
        gehen an den, der die App gebaut hat, und dort steht das auch.</li>
      <li><b>Läuft ohne Netz.</b> Einmal geöffnet, funktioniert die App auch
        im Flugzeug und im Keller.</li>
      <li><b>Sichern nicht vergessen.</b> Was nur in einem Browser liegt, ist
        mit dem Browser weg. Unter „Mehr" gibt es eine Sicherungsdatei.</li>
    </ul>
    <p class="klein">Die App zählt mit, sie diagnostiziert nicht. Was sie
    „auffällig" nennt, ist eine Häufigkeit – die Einordnung gehört in die
    Praxis.</p>
    ${knopf('los', 'Anfangen', 'btn-primary btn-block')}
  </div>`;
}

/* ==================== Zeichnen ==================== */

function male() {
  const s = store.zustandLesen();
  document.documentElement.dataset.theme = s.theme || 'rosa';

  if (!s.begruesst) {
    viewEl.innerHTML = willkommen();
    tabbarEl.hidden = true;
    return;
  }
  tabbarEl.hidden = false;

  const warnung = !store.kannSpeichern() ? `<div class="karte warn">
    <h3>${store.speicherGrund() === 'voll' ? 'Der Speicher ist voll' : 'Es kann nicht gespeichert werden'}</h3>
    <p class="klein">${store.speicherGrund() === 'voll'
    ? 'Neue Eintragungen kommen nicht mehr dazu. Jetzt unter „Mehr" sichern, danach ältere Einträge löschen.'
    : 'Dieser Browser lässt keine Website-Daten zu – ein privates Fenster oder eine eingebettete Ansicht. Alles Eingetragene ist nach dem Schließen weg.'}</p>
  </div>` : '';

  const tab = REITER.some((r) => r.id === s.tab) ? s.tab : 'heute';
  const inhalt = {
    heute: tagAnsicht, verlauf: verlaufAnsicht, muster: musterAnsicht,
    ruhe: ruheAnsicht, ideen: ideenAnsicht, mehr: mehrAnsicht,
  }[tab];
  viewEl.innerHTML = warnung + inhalt(s) + bogenHTML(s);

  tabbarEl.innerHTML = REITER.map((r) => `
    <button type="button" class="tab${r.id === tab ? ' an' : ''}" id="tab-${r.id}"
            data-act="tab" data-tab="${r.id}" role="tab" aria-selected="${r.id === tab}"
            aria-controls="view"><span class="ti">${r.icon}</span><span>${r.name}</span></button>`).join('');

  // Der Bogen soll benutzbar sein, ohne dass die Seite dahinter mitscrollt.
  document.body.classList.toggle('bogen-auf', !!ui.bogen);
}

/*
 * Neu zeichnen, aber höchstens einmal je Durchlauf.
 *
 * Eine Aktion ändert oft beides: den Speicher und den flüchtigen Zustand hier.
 * Der Speicher meldet sich von selbst (store.horche), die Aktion zeichnet
 * danach ihre eigene Änderung – das wären zwei Durchgänge und ein sichtbares
 * Flackern. Die Sammelstelle hier macht daraus einen.
 */
let gemeldet = false;
function zeichne() {
  if (gemeldet) return;
  gemeldet = true;
  queueMicrotask(() => { gemeldet = false; male(); });
}

/* ==================== Eingaben ==================== */

function bogenOeffnen(art, id) {
  const vorlage = {
    essen: { was: '', zutaten: [], portion: 'normal' },
    beschwerde: { staerke: 4, arten: [], notiz: '', stuhlbezug: null },
    // Keine Vorgabe für die Form: Eine vorausgewählte 4 wäre die bequemste
    // Antwort und würde als eingetragen zählen. Ein Stuhlgang ohne Form ist
    // für jede Auswertung wertlos, also wird er gar nicht erst gespeichert.
    stuhl: { form: null, dringend: false, unvollstaendig: false, warnzeichen: [] },
    medikament: { mittel: '', dosis: '' },
    notiz: { text: '' },
  }[art];
  const alt = id ? store.eintragVon(id) : null;
  ui.bogen = {
    art,
    id: id || null,
    entwurf: alt
      ? { ...vorlage, ...alt }
      : { ...vorlage, art, am: ui.tag, um: ui.tag === heuteISO() ? jetztUhr() : '12:00' },
  };
  zeichne();
}

function bogenSpeichern() {
  const b = ui.bogen;
  if (!b) return;
  const e = { ...b.entwurf, art: b.art };
  if (b.art === 'essen' && !String(e.was || '').trim() && !(e.zutaten || []).length) {
    melden('Bitte etwas eintragen oder ankreuzen.');
    return;
  }
  if (b.art === 'medikament' && !String(e.mittel || '').trim()) {
    melden('Welches Mittel?');
    return;
  }
  if (b.art === 'stuhl' && !e.form) {
    melden('Bitte eine Form von 1 bis 7 wählen.');
    return;
  }
  if (b.art === 'notiz' && !String(e.text || '').trim()) {
    melden('Die Notiz ist leer.');
    return;
  }
  if (b.art === 'medikament') store.mittelMerken(e.mittel);
  if (b.id) store.eintragAendern(b.id, e);
  else store.eintragen(e);
  ui.tag = e.am;
  ui.bogen = null;
  melden(b.id ? 'Geändert.' : 'Eingetragen.');
  zeichne();
}

/** Ein Wert im Entwurf, ohne dass der Bogen dabei den Fokus verliert. */
function entwurf(patch, neuZeichnen = true) {
  if (!ui.bogen) return;
  Object.assign(ui.bogen.entwurf, patch);
  if (neuZeichnen) zeichne();
}

function umschalten(feld, id) {
  if (!ui.bogen) return;
  const liste = ui.bogen.entwurf[feld] || [];
  entwurf({ [feld]: liste.includes(id) ? liste.filter((x) => x !== id) : [...liste, id] });
}

/* ---------- Sicherung ---------- */

function datenAusgeben(text, name, typ) {
  const blob = new Blob([text], { type: typ });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Nicht sofort freigeben: Manche Browser holen die Datei erst danach ab.
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/**
 * In die Zwischenablage – und wenn der Browser das nicht erlaubt, wenigstens
 * das Feld markieren. Von Hand kopieren kann man immer.
 */
async function kopiere(text, wahl) {
  try {
    await navigator.clipboard.writeText(text || '');
    melden('Kopiert.');
  } catch {
    const feld = viewEl.querySelector(wahl);
    if (feld) { feld.focus(); feld.select(); }
    melden('Bitte von Hand kopieren.');
  }
}

/*
 * Eine Sicherung einlesen – offen oder verschlüsselt.
 *
 * Welche von beiden es ist, steht in der Datei; gefragt wird deshalb erst,
 * wenn es etwas zu fragen gibt. Ein Passwortfeld, das bei jeder offenen
 * Sicherung erscheint, brächte nur die Frage mit, ob man hier eins vergeben
 * *soll*.
 *
 * Die Abfrage läuft über window.prompt. Das ist die eine Stelle, an der ein
 * eigener Dialog schöner wäre und trotzdem falsch: Beim Einlesen ist der
 * Bildschirm gerade beim Dateiauswahldialog des Systems gewesen, und ein
 * Feld, das man erst suchen muss, verliert man dort.
 */
async function sicherungEinlesen(text) {
  if (!istTresor(text)) return store.ausJSON(text);
  if (!tresorMoeglich()) {
    throw new Error('Diese Sicherung ist verschlüsselt. Zum Öffnen brauchst du '
      + 'die App über ihre Adresse (https), nicht als einzelne Datei.');
  }
  const wort = window.prompt('Passwort dieser Sicherung:');
  // Abgebrochen ist nicht dasselbe wie falsch – dann passiert einfach nichts.
  if (wort === null) return null;
  return store.ausJSON(await entschluesseln(text, wort));
}

function sicherungLaden() {
  const feld = document.createElement('input');
  feld.type = 'file';
  feld.accept = 'application/json,.json';
  feld.addEventListener('change', () => {
    const datei = feld.files && feld.files[0];
    if (!datei) return;
    const leser = new FileReader();
    leser.onload = async () => {
      try {
        const anzahl = await sicherungEinlesen(String(leser.result));
        if (anzahl !== null) melden(`${mehrzahl(anzahl, 'Eintrag', 'Einträge')} eingelesen.`);
      } catch (fehler) {
        melden(`Ging nicht: ${fehler.message}`);
      }
      zeichne();
    };
    leser.readAsText(datei);
  });
  feld.click();
}

/* ==================== Ein Empfänger für alles ==================== */

const AKTION = {
  los: () => { store.einstellen('begruesst', true); zeichne(); },
  tab: (el) => {
    // Eine laufende Atemübung endet beim Wechseln. Sie im Hintergrund
    // weiterpiepsen zu lassen, während jemand im Tagebuch blättert, wäre
    // das Gegenteil dessen, wozu sie da ist.
    atemStopp();
    store.einstellen('tab', el.dataset.tab);
    ui.bericht = null;
    ui.sicherung = null;
    ui.mittel = false;
    zeichne();
  },

  neu: (el) => bogenOeffnen(el.dataset.art),
  bearbeiten: (el) => {
    const e = store.eintragVon(el.dataset.id);
    if (e) bogenOeffnen(e.art, e.id);
  },
  loeschen: (el) => {
    store.eintragLoeschen(el.dataset.id);
    melden('Gelöscht.');
    zeichne();
  },
  'bogen-zu': () => { ui.bogen = null; zeichne(); },
  'bogen-speichern': bogenSpeichern,
  staerke: (el) => entwurf({ staerke: Number(el.dataset.n) }),
  portion: (el) => entwurf({ portion: el.dataset.id }),
  zutat: (el) => {
    if (!ui.bogen) return;
    const id = el.dataset.id;
    const liste = ui.bogen.entwurf.zutaten || [];
    entwurf({
      zutaten: liste.some((z) => z.id === id)
        ? liste.filter((z) => z.id !== id)
        : [...liste, { id, rolle: ROLLE_VORGABE }],
    });
  },
  /*
   * Eine frühere Mahlzeit vollständig übernehmen – Text, Zutaten samt Rollen,
   * Portion. Die Liste wird hier neu gerechnet statt beim Zeichnen gemerkt:
   * gleiche Eingabe, gleiche Reihenfolge, und das Zeichnen bleibt frei von
   * Nebenwirkungen.
   */
  vorlage: (el) => {
    const liste = haeufigeMahlzeiten(store.zustandLesen().eintraege, 6);
    const v = liste[Number(el.dataset.i)];
    if (!v) return;
    entwurf({ was: v.text, zutaten: v.zutaten.map((z) => ({ ...z })), portion: v.portion });
  },
  /*
   * Dasselbe, aber ohne Bogen: eintragen und fertig.
   *
   * Die Liste wird hier neu gerechnet statt beim Zeichnen gemerkt – gleiche
   * Eingabe, gleiche Reihenfolge, und das Zeichnen bleibt frei von
   * Nebenwirkungen. Die Meldung nennt, was eingetragen wurde: Ein Tipp, der
   * still etwas anlegt, ist ein Tipp, dem man nicht traut.
   */
  schnell: (el) => {
    const s = store.zustandLesen();
    const liste = haeufigeMahlzeiten(s.eintraege, 12).filter((v) => v.anzahl >= 2);
    const v = liste[Number(el.dataset.i)];
    if (!v) return;
    store.eintragen({
      art: 'essen',
      am: heuteISO(),
      um: jetztUhr(),
      was: v.text,
      zutaten: v.zutaten.map((z) => ({ ...z })),
      portion: v.portion,
    });
    ui.tag = heuteISO();
    melden(`${kuerze(v.text, 24)} eingetragen.`);
    zeichne();
  },
  beschwerdeart: (el) => umschalten('arten', el.dataset.id),
  warnzeichen: (el) => umschalten('warnzeichen', el.dataset.id),
  'mittel-vorschlag': (el) => entwurf({ mittel: el.dataset.id }),

  bristol: (el) => entwurf({ form: Number(el.dataset.n) }),
  'stuhl-dringend': () => entwurf({ dringend: !ui.bogen.entwurf.dringend }),
  'stuhl-unfertig': () => entwurf({ unvollstaendig: !ui.bogen.entwurf.unvollstaendig }),
  // Ein zweites Tippen nimmt die Antwort zurück: „nicht beantwortet" und
  // „unverändert" sind verschiedene Dinge, und nur das zweite zählt in der
  // Rom-Prüfung als Antwort.
  stuhlbezug: (el) => entwurf({
    stuhlbezug: ui.bogen.entwurf.stuhlbezug === el.dataset.id ? null : el.dataset.id,
  }),

  'versuch-start': (el) => {
    const s = store.zustandLesen();
    if (s.versuch && !s.versuch.beendet && phase(s.versuch, heuteISO()) !== 'fertig'
        && !window.confirm('Es läuft schon ein Versuch. Der neue ersetzt ihn – das Ergebnis des alten ist dann weg. Trotzdem?')) return;
    store.versuchStarten(el.dataset.art, el.dataset.id, Number(el.dataset.n) || 14);
    store.einstellen('tab', 'heute');
    melden('Versuch gestartet. Er steht ab jetzt auf dem Tagesreiter.');
    zeichne();
  },
  'versuch-provokation': () => {
    store.versuchProvozieren(heuteISO());
    melden('Notiert. Jetzt drei Tage weiter eintragen wie sonst.');
    zeichne();
  },
  'versuch-beenden': () => {
    if (!window.confirm('Versuch abbrechen? Er bleibt mit dem stehen, was bis jetzt zusammengekommen ist.')) return;
    store.versuchBeenden();
    zeichne();
  },
  'versuch-ablegen': () => {
    store.versuchAblegen();
    melden('Abgehakt – bleibt unter „Schon geprüft" stehen.');
    zeichne();
  },
  'versuch-alt-weg': (el) => { store.versuchLoeschen(el.dataset.id); zeichne(); },

  'prov-start': (el) => {
    const x = PRUEFBAR.find((k) => k.id === el.dataset.id);
    if (!x) return;
    const s = store.zustandLesen();
    if (s.provokation && !s.provokation.beendet
        && !window.confirm('Es läuft schon ein Test. Der neue ersetzt ihn – die bisherigen Durchgänge sind dann weg. Trotzdem?')) return;
    store.provokationStarten('klasse', x.id, x.was);
    store.einstellen('tab', 'heute');
    melden('Angelegt. Der erste Durchgang ist morgen früh, nüchtern.');
    zeichne();
  },
  /*
   * Der Durchgang wird mit der *jetzigen* Uhrzeit festgehalten und nicht
   * nachträglich gesetzt. Daran hängt das ganze Beobachtungsfenster: Ein
   * Durchgang „irgendwann am Dienstag" ließe die Rechnung auf Mittag raten und
   * damit Beschwerden mitzählen, die Stunden davor kamen.
   */
  'prov-lauf': () => {
    store.provokationLauf(false);
    melden(`Notiert. Jetzt nichts essen und eintragen, wie es dir geht.`);
    zeichne();
  },
  'prov-leer': () => {
    store.provokationLauf(true);
    melden('Leerdurchgang notiert – derselbe Ablauf, nur ohne die Sache.');
    zeichne();
  },
  'prov-lauf-weg': (el) => {
    store.provokationLaufWeg(el.dataset.am, el.dataset.um);
    zeichne();
  },
  'prov-beenden': () => {
    if (!window.confirm('Test abbrechen? Er bleibt mit den bisherigen Durchgängen stehen.')) return;
    store.provokationBeenden();
    zeichne();
  },
  'prov-ablegen': () => {
    store.provokationAblegen();
    melden('Abgehakt – bleibt unter „Schon getestet" stehen.');
    zeichne();
  },
  'prov-alt-weg': (el) => { store.provokationLoeschen(el.dataset.id); zeichne(); },

  'tag-blaettern': (el) => {
    ui.tag = plusTage(ui.tag, Number(el.dataset.d));
    zeichne();
  },
  'tag-waehlen': (el) => {
    ui.tag = el.dataset.iso;
    store.einstellen('tab', 'heute');
    zeichne();
  },
  'monat-blaettern': (el) => {
    ui.monat = plusMonate(ui.monat, Number(el.dataset.d));
    zeichne();
  },
  zeitraum: (el) => { ui.zeitraum = Number(el.dataset.n); zeichne(); },

  tagfrage: (el) => {
    const id = el.dataset.id;
    const n = Number(el.dataset.n);
    const jetzt = store.tagLesen(ui.tag)[id];
    store.tagSetzen(ui.tag, { [id]: jetzt === n ? null : n });
    zeichne();
  },
  'seit-weg': () => { store.einstellen('beschwerdenSeit', null); zeichne(); },
  frageAn: (el) => {
    const gewaehlt = store.zustandLesen().tagesfragen || [];
    const id = el.dataset.id;
    store.einstellen('tagesfragen', gewaehlt.includes(id)
      ? gewaehlt.filter((x) => x !== id) : [...gewaehlt, id]);
    zeichne();
  },
  ton: () => {
    store.einstellen('ton', !store.zustandLesen().ton);
    zeichne();
  },

  'atem-uebung': (el) => { store.einstellen('atemUebung', el.dataset.id); zeichne(); },
  'atem-runden': (el) => { store.einstellen('atemRunden', Number(el.dataset.n)); zeichne(); },
  'atem-start': () => atemStart(store.zustandLesen()),
  'atem-stopp': atemStopp,

  fenster: (el) => { store.einstellen('fenster', Number(el.dataset.n)); zeichne(); },
  mindest: (el) => { store.einstellen('mindestFaelle', Number(el.dataset.n)); zeichne(); },
  theme: (el) => { store.einstellen('theme', el.dataset.id); zeichne(); },

  'ausloeser-neu': () => {
    const feld = document.getElementById('neuerAusloeser');
    const name = (feld.value || '').trim();
    if (!name) { melden('Kein Name eingegeben.'); return; }
    store.ausloeserAnlegen(eigeneId(name), name);
    feld.value = '';
    melden(`„${name}" steht jetzt zur Auswahl.`);
    zeichne();
  },
  'ausloeser-weg': (el) => { store.ausloeserLoeschen(el.dataset.id); zeichne(); },

  installieren: async () => {
    if (!installEreignis) return;
    installEreignis.prompt();
    try { await installEreignis.userChoice; } catch { /* abgebrochen */ }
    // Das Ereignis lässt sich nur einmal auslösen; danach ist es verbraucht.
    installEreignis = null;
    zeichne();
  },

  'unterleib-an': () => {
    const gewaehlt = store.zustandLesen().tagesfragen || [];
    store.einstellen('tagesfragen', [...new Set([...gewaehlt,
      'sexschmerz', 'sextief', 'regelschmerz'])]);
    melden('Eingeschaltet. Die Fragen stehen ab jetzt beim Tageseintrag.');
    zeichne();
  },
  // „Nein danke" heißt nein und nicht „später nochmal": Der Hinweis kommt
  // nicht wieder. Etwas, das man dreimal wegtippen muss, ist keine Frage.
  'unterleib-nein': () => {
    store.einstellen('unterleibGefragt', true);
    melden('Gut. Ich frage nicht noch einmal.');
    zeichne();
  },

  mittel: () => { ui.mittel = !ui.mittel; zeichne(); },

  'idee-neu': () => {
    const feld = document.getElementById('ideeText');
    if (!store.ideeAnlegen(feld.value)) { melden('Da steht noch nichts.'); return; }
    feld.value = '';
    // „Notiert" wäre die falsche Auskunft: Notiert ist sie, aber gelesen hat
    // sie niemand, und das ist der Unterschied, um den es hier geht.
    melden('Notiert. Geht in etwa einer Minute raus.');
    zeichne();
  },
  'idee-haken': (el) => { store.ideeUmschalten(el.dataset.id); zeichne(); },
  'idee-weg': (el) => { store.ideeLoeschen(el.dataset.id); zeichne(); },
  /*
   * Der direkte Weg.
   *
   * Die einzige Stelle, an der diese App etwas verschickt – und sie tut es
   * nur hier, nur auf diesen Druck, und nur mit dem Ideentext. Was schiefgeht,
   * wird gesagt und nicht im Hintergrund noch einmal versucht: Ein Programm,
   * das von selbst weitersendet, ist etwas anderes als eines, das auf einen
   * Knopf wartet.
   */
  'ideen-senden': async (el) => {
    const text = ideenText(store.zustandLesen());
    el.disabled = true;
    melden('Wird geschickt …');
    try {
      await schicken(text);
      // Erst nach dem Erfolg abhaken. Wer es nicht rausbekommen hat, soll den
      // Hinweis behalten, statt zu glauben, es sei angekommen.
      store.ideenGeschicktMerken();
      melden('Angekommen. Jetzt hat sie jemand.');
    } catch (fehler) {
      melden(fehler.message);
    }
    el.disabled = false;
    zeichne();
  },

  'ideen-kopieren': async () => {
    await kopiere(ideenText(store.zustandLesen()), '#ideeText');
    store.ideenGeschicktMerken();
    zeichne();
  },
  /*
   * Teilen über das Menü des Geräts. Das ist kein Widerspruch zu „die App
   * schickt nichts": Hier wird nichts gesendet, sondern der Text an das
   * Betriebssystem übergeben, das daraufhin *den Nutzer* fragen lässt, wohin.
   * Ohne diese Schnittstelle bleibt der gewöhnliche Weg über die
   * Zwischenablage.
   */
  'ideen-teilen': async () => {
    const text = ideenText(store.zustandLesen());
    if (!navigator.share) {
      await kopiere(text, '#ideeText');
      store.ideenGeschicktMerken();
      zeichne();
      return;
    }
    try {
      await navigator.share({ title: 'Bauchbuch – Ideen', text });
      /*
       * Erst nach dem Teilen abhaken, nicht davor.
       *
       * navigator.share löst erst auf, wenn wirklich geteilt wurde; ein
       * Abbruch wirft. Deshalb steht das Merken *hier* und nicht oben: Wer das
       * Menü wieder zumacht, soll den Hinweis behalten, statt zu glauben, es
       * sei raus.
       */
      store.ideenGeschicktMerken();
      melden('Raus. Jetzt hat sie jemand.');
      zeichne();
    } catch {
      // Abgebrochen oder nicht erlaubt – dann bleibt der Hinweis stehen.
    }
  },

  export: () => {
    datenAusgeben(store.alsJSON(), `bauchbuch-${heuteISO()}.json`, 'application/json');
    store.sicherungNotiert();
    melden('Sicherung erstellt.');
    zeichne();
  },
  import: sicherungLaden,
  'sicherung-spaeter': () => {
    store.sicherungVerschieben();
    melden('In einer Woche frage ich wieder.');
    zeichne();
  },
  'sicherung-text': () => {
    ui.sicherung = store.alsJSON();
    store.sicherungNotiert();
    zeichne();
  },
  'sicherung-zu': () => { ui.sicherung = null; zeichne(); },
  'gewicht-los': () => {
    const feld = viewEl.querySelector('[data-act="gewicht-neu"]');
    const kg = Number(String(feld && feld.value).replace(',', '.'));
    if (!Number.isFinite(kg) || kg < 20 || kg > 400) {
      melden('Bitte ein Gewicht zwischen 20 und 400 kg.');
      return;
    }
    store.gewichtNotieren(heuteISO(), kg);
    melden('Notiert.');
    zeichne();
  },
  'gewicht-weg': (el) => {
    store.gewichtLoeschen(el.dataset.iso);
    zeichne();
  },
  abnehmen: (el) => {
    store.einstellen('abnehmenGewollt', el.dataset.n === 'ja');
    zeichne();
  },
  'einfuegen-auf': () => { ui.einfuegen = ''; zeichne(); },
  'einfuegen-zu': () => { ui.einfuegen = null; zeichne(); },
  'einfuegen-los': async () => {
    const text = String(ui.einfuegen || '').trim();
    if (!text) { melden('Da ist noch nichts eingefügt.'); return; }
    try {
      const anzahl = await sicherungEinlesen(text);
      if (anzahl !== null) {
        ui.einfuegen = null;
        melden(`${mehrzahl(anzahl, 'Eintrag', 'Einträge')} eingelesen.`);
      }
    } catch (fehler) {
      melden(`Ging nicht: ${fehler.message}`);
    }
    zeichne();
  },
  'sicherung-kopieren': () => kopiere(ui.sicherung, '.bericht'),

  'schloss-auf': () => { ui.schloss = true; ui.tresorWort = ''; zeichne(); },
  'schloss-zu': () => { ui.schloss = false; ui.tresorWort = ''; zeichne(); },
  'tresor-export': async () => {
    // Acht Zeichen sind keine Sicherheit, aber eine Grenze, unter der es
    // ehrlicher wäre, gar nicht erst zu verschlüsseln.
    if (ui.tresorWort.length < 8) { melden('Mindestens acht Zeichen.'); return; }
    melden('Wird verschlüsselt …');
    try {
      const text = await verschluesseln(store.alsJSON(), ui.tresorWort);
      datenAusgeben(text, `bauchbuch-${heuteISO()}.json`, 'application/json');
      store.sicherungNotiert();
      ui.schloss = false;
      ui.tresorWort = '';
      melden('Verschlüsselt gesichert.');
    } catch (fehler) {
      melden(`Ging nicht: ${fehler.message}`);
    }
    zeichne();
  },

  bericht: (el) => {
    const s = store.zustandLesen();
    const bis = heuteISO();
    ui.bericht = arztBericht(s, plusTage(bis, -(Number(el.dataset.n) - 1)), bis);
    zeichne();
  },
  // Der Bericht seit dem letzten Termin. Genau das fragt eine Ärztin beim
  // zweiten Mal: was seitdem war – nicht die letzten dreißig Tage, die
  // zufällig ein Stück davor mit abdecken oder ein Stück davon abschneiden.
  'bericht-seit': () => {
    const bis = heuteISO();
    const seit = store.letzterTermin(bis);
    if (!seit) return;
    ui.bericht = arztBericht(store.zustandLesen(), seit, bis);
    zeichne();
  },
  'bericht-zu': () => { ui.bericht = null; zeichne(); },
  'termin-weg': (el) => { store.terminLoeschen(el.dataset.iso); zeichne(); },
  drucken: () => {
    store.einstellen('tab', 'muster');
    zeichne();
    // Erst zeichnen lassen, dann drucken – window.print() hält das Programm
    // an, und ein noch nicht gezeichneter Reiter käme leer aufs Papier.
    setTimeout(() => window.print(), 120);
  },
  'bericht-kopieren': () => kopiere(ui.bericht, '.bericht'),
  'bericht-laden': () => {
    const bis = heuteISO();
    datenAusgeben(ui.bericht || '', berichtName(plusTage(bis, -29), bis), 'text/plain');
  },

  'alles-weg': () => {
    // Zwei Fragen sind eine zu viel, keine ist eine zu wenig: Der Knopf steht
    // unter „Mehr" und löscht Monate.
    if (!window.confirm('Wirklich alles löschen? Das lässt sich nicht rückgängig machen.')) return;
    store.allesLoeschen();
    ui.bericht = null;
    melden('Alles gelöscht.');
    zeichne();
  },
};

document.addEventListener('click', (ev) => {
  const el = ev.target.closest('[data-act]');
  if (!el || el.disabled) return;
  const fn = AKTION[el.dataset.act];
  if (!fn) return;
  // Textfelder tragen ebenfalls data-act, ihre Werte kommen über 'input'.
  if (el.matches('input, textarea')) return;
  ev.preventDefault();
  fn(el);
});

/*
 * Texteingaben laufen über 'input' und zeichnen *nicht* neu – ein Neuzeichnen
 * bei jedem Tastendruck nähme dem Feld den Fokus und die Schreibmarke.
 */
function eingabe(ev) {
  const el = ev.target.closest('[data-act]');
  if (!el) return;
  const wert = el.value;
  switch (el.dataset.act) {
    case 'rolle': {
      const liste = (ui.bogen && ui.bogen.entwurf.zutaten) || [];
      entwurf({
        zutaten: liste.map((z) => (z.id === el.dataset.id ? { ...z, rolle: wert } : z)),
      }, false);
      break;
    }
    case 'was': entwurf({ was: wert }, false); break;
    case 'notiz': entwurf({ notiz: wert }, false); break;
    case 'mittel': entwurf({ mittel: wert }, false); break;
    case 'dosis': entwurf({ dosis: wert }, false); break;
    case 'text': entwurf({ text: wert }, false); break;
    case 'uhr': entwurf({ um: wert }, false); break;
    case 'bogen-datum': entwurf({ am: wert }, false); break;
    case 'tag-datum':
      if (/^\d{4}-\d{2}-\d{2}$/.test(wert)) { ui.tag = wert; zeichne(); }
      break;
    // Das Passwort zeichnet *nicht* neu – ein Neuzeichnen bei jedem Zeichen
    // nähme dem Feld den Fokus, und ein Passwortfeld, das nach drei Zeichen
    // wegspringt, ist unbenutzbar.
    case 'tresor-wort': ui.tresorWort = wert; break;
    // Wie das Passwort: kein Neuzeichnen, sonst verliert das Feld beim
    // Einfügen eines langen Textes den Fokus.
    case 'einfuegen-text': ui.einfuegen = wert; break;
    case 'termin-neu':
      if (/^\d{4}-\d{2}-\d{2}$/.test(wert)) {
        store.terminAnlegen(wert);
        el.value = '';
        zeichne();
      }
      break;
    // Der Monatsregler meldet sich bei jedem halben Tippen; erst ein
    // vollständiges 'YYYY-MM' wird übernommen, sonst stünde zwischendurch
    // „seit 0002".
    case 'seit':
      if (!wert) store.einstellen('beschwerdenSeit', null);
      else if (/^\d{4}-\d{2}$/.test(wert)) store.einstellen('beschwerdenSeit', wert);
      break;
    default: break;
  }
}

/*
 * Texteingaben melden sich über 'input', Auswahlmenüs je nach Browser über
 * 'input' *oder* nur über 'change'. Beide auf denselben Empfänger, damit die
 * Rolle einer Zutat nirgends verlorengeht – das ist eine Angabe, die man genau
 * einmal macht und dann nie wieder kontrolliert.
 */
document.addEventListener('input', eingabe);
document.addEventListener('change', eingabe);

document.addEventListener('keydown', (ev) => {
  if (ev.key === 'Escape' && ui.bogen) { ui.bogen = null; zeichne(); }
});

/*
 * Vor dem Verschwinden schreiben. Mobile Browser verwerfen die Seite im
 * Hintergrund ohne Vorwarnung, und der letzte Eintrag hängt bis zu 120 ms in
 * der Warteschlange.
 */
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') store.sofortSchreiben();
});
window.addEventListener('pagehide', () => store.sofortSchreiben());

/*
 * Dauerhaften Speicher anfordern.
 *
 * Ohne das darf ein Browser den localStorage jederzeit wegräumen: bei
 * Platzmangel, beim „Browserdaten löschen", und auf iOS schon dann, wenn eine
 * Seite sieben Tage lang nicht besucht wurde. Für ein Lesezeichen ist das
 * verschmerzbar. Für ein Tagebuch, das über Monate entsteht und von dem es nur
 * diese eine Kopie gibt, wäre es das Ende – und zwar eines, das niemand
 * kommen sieht.
 *
 * `persist()` bittet den Browser, diesen Speicher davon auszunehmen. Chrome
 * gewährt das stillschweigend, sobald eine Seite installiert ist oder
 * regelmäßig benutzt wird; Safari kennt es nicht und ignoriert es. Deshalb
 * ist die Bitte kein Ersatz für die Sicherung, sondern eine zweite Sicherung –
 * und was dabei herauskam, steht unter „Mehr", damit niemand sich auf etwas
 * verlässt, das gar nicht zugesagt wurde.
 */
async function speicherFestnageln() {
  try {
    if (!navigator.storage || !navigator.storage.persist) return;
    ui.speicher = await navigator.storage.persisted();
    if (!ui.speicher) ui.speicher = await navigator.storage.persist();
  } catch {
    // Manche Browser werfen hier statt abzulehnen. Dann bleibt es bei null,
    // und die Anzeige sagt „unbekannt" statt etwas zu behaupten.
    ui.speicher = null;
  }
  zeichne();
}

speicherFestnageln();

window.addEventListener('beforeinstallprompt', (ev) => {
  // Ohne preventDefault zeigt der Browser seinen eigenen Streifen und das
  // Ereignis ist verbraucht, bevor der Knopf in der App überhaupt dasteht.
  ev.preventDefault();
  installEreignis = ev;
  zeichne();
});
window.addEventListener('appinstalled', () => { installEreignis = null; zeichne(); });

/*
 * Vor dem Drucken alle aufklappbaren Abschnitte öffnen.
 *
 * Was zugeklappt ist, druckt der Browser nicht mit – und ausgerechnet die
 * Mittelübersicht und die Warnzeichen stehen in solchen Abschnitten. Auf dem
 * Papier wären sie dann weg, ohne dass es jemand merkt.
 */
window.addEventListener('beforeprint', () => {
  document.querySelectorAll('details').forEach((d) => { d.open = true; });
});

/*
 * Startparameter – dahin zeigen die Verknüpfungen des Startbildschirms.
 *
 * Wer das Symbol lange gedrückt hält, bekommt „Mahlzeit eintragen" und
 * „Beschwerden eintragen" (siehe shortcuts in manifest.webmanifest) und landet
 * mit einem Tipp im offenen Bogen statt auf der Startseite.
 */
try {
  const start = new URLSearchParams(location.search);
  const wohin = start.get('tab');
  const neuArt = start.get('neu');
  if (wohin && REITER.some((r) => r.id === wohin)) store.einstellen('tab', wohin);
  if (neuArt && ART_NAME[neuArt]) {
    store.einstellen('tab', 'heute');
    bogenOeffnen(neuArt);
  }
  // Die Adresse wieder sauber machen: Ein Neuladen soll nicht denselben Bogen
  // ein zweites Mal aufreißen.
  if (wohin || neuArt) window.history.replaceState(null, '', location.pathname);
} catch { /* file:// erlaubt kein replaceState – dann eben nicht */ }

// Auch Änderungen, die keine Aktion ausgelöst hat, müssen ankommen – allen
// voran der Wechsel auf „kann nicht mehr speichern", den der Schreibvorgang
// selbst feststellt.
store.horche(zeichne);

male();

/* Ohne Netz benutzbar. Aus einer Datei heraus (file://) gibt es keinen
 * Service Worker – dort ist die App ohnehin schon vollständig da. */
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => { /* dann eben nicht */ });
  });
}
