/*
 * Die Kataloge: was man ankreuzen kann.
 *
 * Zwei Listen tragen die App. Die eine sagt, was in einer Mahlzeit stecken
 * kann und als Magenreiz gilt; die andere, wie sich Beschwerden anfühlen.
 * Beide sind absichtlich kurz. Eine Liste mit hundert Einträgen wird nicht
 * ausgefüllt, und was nicht ausgefüllt wird, taucht in keiner Auswertung auf.
 *
 * Wichtig zur Einordnung: Die Auswahl hier ist kein medizinisches Urteil. Sie
 * sammelt, was in der Ernährungsberatung bei Magenbeschwerden üblicherweise
 * zur Sprache kommt – als *Verdachtsliste*, damit man beim Eintragen nicht
 * jedes Mal überlegen muss. Ob etwas davon bei einem bestimmten Menschen
 * tatsächlich stört, sagt allein sein eigener Verlauf. Genau dafür ist die
 * App da, und genau deshalb steht in der Auswertung immer die Fallzahl daneben.
 *
 * `id` ist der Schlüssel im Speicher und darf sich nie ändern – daran hängen
 * alle bereits gemachten Eintragungen. Namen dürfen sich ändern.
 */

/*
 * Die Klassen: warum etwas stören könnte, nicht bloß dass es stört.
 *
 * „Zwiebel" ist als Antwort schwach – nicht weil sie falsch wäre, sondern weil
 * sie zu selten vorkommt. Zwölf Mahlzeiten mit Zwiebel im ganzen Tagebuch
 * ergeben eine wackelige Zahl, und die nächste Frage („und Knoblauch? und
 * Weizen?") fängt wieder bei null an. Die Klasse fasst zusammen, was im Körper
 * denselben Weg nimmt: Zwiebel, Hülsenfrüchte, Weizen und Rohkost sind alle
 * FODMAP-reich, und über sie zusammen kommen statt zwölf Fällen achtzig
 * zusammen. Das ist der Unterschied zwischen einer Ahnung und einer Zahl.
 *
 * Und es ist die brauchbarere Auskunft: „Fruktane" beantwortet auch die Frage
 * nach dem Lebensmittel, das noch gar nicht im Tagebuch steht.
 *
 * Ehrlich dazu: Die Zuordnung unten ist grob. Ein Apfel ist FODMAP-reich, eine
 * Banane kaum, und beide wären hier „Obst". Sie taugt, um eine Spur zu finden,
 * und nicht, um eine Diagnose darauf zu bauen – deshalb steht neben jedem
 * Ergebnis, aus wie vielen Mahlzeiten es kommt, und deshalb gibt es den
 * Auslassversuch (js/versuch.js), der eine Spur zur Probe stellt.
 */
export const KLASSEN = [
  {
    id: 'fodmap',
    name: 'FODMAP – vergärbare Kohlenhydrate',
    kurz: 'FODMAP',
    was: 'Zuckerarten und Ballaststoffe, die im Dünndarm nicht aufgenommen '
      + 'werden und im Dickdarm von Bakterien vergoren werden. Das macht Gas '
      + 'und zieht Wasser – Blähung und Krampf, meist Stunden nach dem Essen.',
  },
  {
    id: 'laktose',
    name: 'Laktose – Milchzucker',
    kurz: 'Laktose',
    was: 'Ein FODMAP für sich, weil es dafür einen einfachen Test gibt: Fehlt '
      + 'das spaltende Enzym, bleibt der Milchzucker liegen und wird vergoren.',
  },
  {
    id: 'fett',
    name: 'Fett',
    kurz: 'Fett',
    was: 'Verlangsamt die Magenentleerung. Was länger liegt, drückt länger – '
      + 'das ist der typische Weg zu Völlegefühl statt zu Brennen.',
  },
  {
    id: 'saeure',
    name: 'Säure und Säurelocker',
    kurz: 'Säure',
    was: 'Entweder selbst sauer oder anregend für die eigene Säurebildung. '
      + 'Auf einer gereizten Schleimhaut brennt beides.',
  },
  {
    id: 'schliessmuskel',
    name: 'Senkt den Schließmuskel',
    kurz: 'Schließmuskel',
    was: 'Lockert den Muskelring zwischen Speiseröhre und Magen, sodass '
      + 'Mageninhalt leichter hochkommt. Der klassische Weg zu Sodbrennen.',
  },
  {
    id: 'koffein',
    name: 'Koffein',
    kurz: 'Koffein',
    was: 'Regt die Säurebildung an und beschleunigt den Darm – und wirkt '
      + 'obendrein auf den Schlaf, der hier ein eigener Faktor ist.',
  },
  {
    id: 'histamin',
    name: 'Histamin',
    kurz: 'Histamin',
    was: 'Steckt in Gereiftem, Gegorenem und lange Gelagertem. Bei einer '
      + 'Unverträglichkeit kommen Kopfschmerz, Flush oder Herzklopfen dazu – '
      + 'im Bauch allein sieht es aus wie alles andere auch.',
  },
  {
    id: 'gluten',
    name: 'Weizen und Gluten',
    kurz: 'Gluten',
    was: 'Bei Zöliakie ein Auslöser, bei anderen eher die Fruktane im selben '
      + 'Korn. Wichtig: Ein Bluttest auf Zöliakie geht nur, solange noch '
      + 'Gluten gegessen wird.',
  },
  {
    id: 'scharf',
    name: 'Scharfstoffe',
    kurz: 'Schärfe',
    was: 'Capsaicin reizt dieselben Nervenenden, die Schmerz melden. Auf '
      + 'gesunder Schleimhaut harmlos, auf gereizter nicht.',
  },
  {
    id: 'gas',
    name: 'Gas von außen',
    kurz: 'Gas',
    was: 'Kohlensäure bringt Gas mit, das wieder heraus muss – nach oben als '
      + 'Aufstoßen, und dabei kommt Säure mit.',
  },
];

const KLASSEN_MAP = Object.fromEntries(KLASSEN.map((k) => [k.id, k]));

export function klasseVon(id) {
  return KLASSEN_MAP[id] || null;
}

export function klasseName(id, kurz) {
  const k = KLASSEN_MAP[id];
  if (!k) return id;
  return kurz ? k.kurz : k.name;
}

export const AUSLOESER = [
  { id: 'kaffee', name: 'Kaffee', icon: '☕', klassen: ['koffein', 'saeure', 'schliessmuskel'] },
  { id: 'alkohol', name: 'Alkohol', icon: '🍷', klassen: ['saeure', 'schliessmuskel', 'histamin'] },
  { id: 'scharf', name: 'Scharf gewürzt', icon: '🌶️', klassen: ['scharf'] },
  { id: 'fett', name: 'Fettig, frittiert', icon: '🍟', klassen: ['fett', 'schliessmuskel'] },
  { id: 'zitrus', name: 'Zitrus, Saures', icon: '🍋', klassen: ['saeure', 'histamin'] },
  { id: 'tomate', name: 'Tomate', icon: '🍅', klassen: ['saeure', 'histamin'] },
  { id: 'zwiebel', name: 'Zwiebel, Knoblauch', icon: '🧅', klassen: ['fodmap'] },
  { id: 'kohlensaeure', name: 'Kohlensäure', icon: '🥤', klassen: ['gas'] },
  { id: 'suess', name: 'Süßes, Schokolade', icon: '🍫', klassen: ['fodmap', 'fett', 'schliessmuskel'] },
  { id: 'milch', name: 'Milchprodukte', icon: '🥛', klassen: ['laktose', 'fodmap', 'fett'] },
  { id: 'rohkost', name: 'Rohkost, Salat', icon: '🥗', klassen: ['fodmap'] },
  { id: 'huelsen', name: 'Hülsenfrüchte, Kohl', icon: '🫘', klassen: ['fodmap'] },
  { id: 'vollkorn', name: 'Vollkorn', icon: '🌾', klassen: ['fodmap', 'gluten'] },
  { id: 'geraeuchert', name: 'Geräuchert, gepökelt', icon: '🥓', klassen: ['histamin', 'fett'] },
  { id: 'minze', name: 'Pfefferminze', icon: '🌿', klassen: ['schliessmuskel'] },
  { id: 'nikotin', name: 'Nikotin', icon: '🚬', klassen: ['schliessmuskel', 'saeure'] },
];

/**
 * Zwei Merkmale, die keine Zutat sind, sondern die Umstände: die Portion und
 * die späte Stunde. Beide gelten als Magenreiz und werden in der Auswertung
 * genauso behandelt wie eine Zutat – deshalb stehen sie hier mit derselben
 * Struktur, aber getrennt: Beim Eintragen kreuzt man sie nicht an, sie ergeben
 * sich aus der Portionsangabe und der Uhrzeit.
 */
export const UMSTAENDE = [
  { id: 'gross', name: 'Große Portion', icon: '🍽️' },
  { id: 'spaet', name: 'Spät gegessen (nach 20 Uhr)', icon: '🌙' },
];

/** Alles, was die Auswertung als möglichen Auslöser kennt. */
export const ALLE_AUSLOESER = [...AUSLOESER, ...UMSTAENDE];

/*
 * Zwei Einträge stehen hier, weil ohne sie ganze Fragen unbeantwortbar bleiben:
 *
 *   `oberbauch`   Schmerz im Oberbauch – die eine Angabe, die den
 *                 Schmerz-Typ der funktionellen Dyspepsie vom Völlegefühl
 *                 trennt, und im GerdQ das Gegengewicht zum Sodbrennen.
 *   `saettigung`  Früh satt. Klingt wie „kein Appetit" und ist etwas anderes:
 *                 Man fängt an zu essen und kann nicht aufessen. Genau so
 *                 steht es in den Rom-Kriterien, und genau dafür gibt es die
 *                 Zeile.
 *
 * Ohne die beiden könnte js/kriterien.js die Hälfte seiner Prüfungen nur raten.
 * Eine Auswahlliste um zwei Zeilen zu verlängern ist der billigere Preis.
 */
export const BESCHWERDEN = [
  { id: 'brennen', name: 'Brennen', icon: '🔥' },
  { id: 'druck', name: 'Druck, Völlegefühl', icon: '🪨' },
  { id: 'oberbauch', name: 'Schmerz im Oberbauch', icon: '📍' },
  { id: 'uebelkeit', name: 'Übelkeit', icon: '🤢' },
  { id: 'sodbrennen', name: 'Sodbrennen', icon: '🌋' },
  { id: 'aufstossen', name: 'Aufstoßen', icon: '💨' },
  { id: 'blaehung', name: 'Blähungen', icon: '🎈' },
  { id: 'krampf', name: 'Bauchschmerz, Krämpfe', icon: '⚡' },
  { id: 'saettigung', name: 'Früh satt', icon: '🥄' },
  { id: 'appetit', name: 'Kein Appetit', icon: '🍽️' },
];

/*
 * Die Bristol-Stuhlformenskala.
 *
 * Sieben Bilder statt einer Frage, die niemand beantworten mag. Sie ist seit
 * den Neunzigern das Maß, mit dem in der Sprechstunde über Stuhlgang geredet
 * wird – 1 und 2 heißen zu lange gelegen, 6 und 7 zu kurz, dazwischen ist es
 * in Ordnung.
 *
 * Warum das hier steht, obwohl es um den Magen ging: Ohne Stuhlform lassen
 * sich Reizdarm und funktionelle Dyspepsie im Tagebuch überhaupt nicht
 * trennen, und der Reizdarm-Typ – Verstopfung, Durchfall oder gemischt –
 * entscheidet in der Praxis über die Behandlung. Es ist die größte Lücke, die
 * dieses Tagebuch hatte.
 */
export const BRISTOL = [
  { id: 1, name: 'Einzelne harte Klümpchen', kurz: 'harte Klümpchen', gruppe: 'hart', bild: '●●●' },
  { id: 2, name: 'Wurstförmig, klumpig', kurz: 'klumpig', gruppe: 'hart', bild: '▰▰' },
  { id: 3, name: 'Wurstförmig mit Rissen', kurz: 'mit Rissen', gruppe: 'normal', bild: '▬▬' },
  { id: 4, name: 'Wurstförmig, glatt und weich', kurz: 'glatt und weich', gruppe: 'normal', bild: '━━' },
  { id: 5, name: 'Weiche Klümpchen mit klarem Rand', kurz: 'weiche Klümpchen', gruppe: 'normal', bild: '◍◍' },
  { id: 6, name: 'Breiig, mit unregelmäßigem Rand', kurz: 'breiig', gruppe: 'weich', bild: '≈≈' },
  { id: 7, name: 'Flüssig, ohne feste Bestandteile', kurz: 'flüssig', gruppe: 'weich', bild: '～～' },
];

const BRISTOL_MAP = Object.fromEntries(BRISTOL.map((b) => [b.id, b]));

export function bristolVon(form) {
  return BRISTOL_MAP[Number(form)] || null;
}

export function bristolName(form, kurz) {
  const b = BRISTOL_MAP[Number(form)];
  if (!b) return String(form);
  return kurz ? b.kurz : b.name;
}

/**
 * Wie sich eine Beschwerde zum Stuhlgang verhält – die Rom-Frage im Wortlaut.
 *
 * Ob der Schmerz mit dem Stuhlgang zusammenhängt, ist eines der drei Merkmale,
 * an denen ein Reizdarmsyndrom festgemacht wird, und es ist das einzige, das
 * sich nicht aus den Zahlen ableiten lässt: Dass an einem Tag Schmerz und
 * Stuhlgang beide vorkamen, sagt nichts darüber, ob das eine das andere
 * verändert hat. Also wird gefragt – einmal, freiwillig, im Beschwerdebogen.
 */
export const STUHLBEZUG = [
  { id: 'besser', name: 'Danach besser' },
  { id: 'schlechter', name: 'Danach schlechter' },
  { id: 'gleich', name: 'Unverändert' },
  { id: 'keiner', name: 'Kein Stuhlgang dabei' },
];

/*
 * Die Rolle einer Zutat in der Mahlzeit.
 *
 * Statt einer Menge in Gramm. Niemand wiegt sein Abendessen, und für die
 * Frage, um die es hier geht, ist die Waage auch gar nicht das richtige
 * Werkzeug: Ob eine Zwiebel stört, hängt weniger an ihren Gramm als daran, ob
 * sie die Suppe war oder drei Ringe obendrauf. Genau diesen Unterschied
 * beschreibt die Rolle – in Worten, die man beim Eintragen ohne Nachdenken
 * trifft.
 *
 * Die Reihenfolge ist die Reihenfolge im Auswahlmenü und geht von „viel" nach
 * „wenig". `haupt` ist die Vorgabe: Wer nichts umstellt, hat damit die
 * harmlosere Angabe *nicht* gewählt.
 */
export const ROLLEN = [
  { id: 'haupt', name: 'Hauptzutat', kurz: 'Haupt', hilfe: 'Das meiste an dieser Mahlzeit' },
  { id: 'beilage', name: 'Beilage', kurz: 'Beilage', hilfe: 'Ein ordentlicher Teil, aber nicht die Hauptsache' },
  { id: 'topping', name: 'Topping', kurz: 'Topping', hilfe: 'Obendrauf, ein paar Löffel' },
  { id: 'getraenk', name: 'Getränk dazu', kurz: 'Getränk', hilfe: 'Getrunken, nicht gegessen' },
  { id: 'wuerze', name: 'Würze oder Sauce', kurz: 'Würze', hilfe: 'Nur ein Hauch davon' },
];

export const ROLLE_VORGABE = 'haupt';

const ROLLEN_MAP = Object.fromEntries(ROLLEN.map((r) => [r.id, r]));

export function rolleVon(id) {
  return ROLLEN_MAP[id] || ROLLEN_MAP[ROLLE_VORGABE];
}

export function rolleName(id, kurz) {
  const r = rolleVon(id);
  return kurz ? r.kurz : r.name;
}

/*
 * Was für einen ganzen Tag gilt, nicht für einen Zeitpunkt.
 *
 * Aus dem Magentagebuch ist ein Gesundheitstagebuch geworden, und diese Liste
 * ist der Grund, warum das kein Umbau war: Eine weitere Frage ist eine
 * weitere Zeile. Anzeige, Speicher, Auswertung und Bericht lesen alle hier.
 *
 * Zwei Regeln für die Skalen:
 *
 *   * Bei allem, was gut oder schlecht sein kann, ist **0 gut und 4 schlecht**.
 *     Dann bedeutet ein Zusammenhang immer dasselbe, und die Auswertung muss
 *     sich nicht je Frage merken, in welche Richtung sie zu lesen ist.
 *   * `bewegung`, `blutung` und `sex` sind Mengen, keine Bewertungen. Sie
 *     tragen `menge: true` und werden nirgends als „schlecht" gerechnet.
 *
 * Nicht jede Frage will jeder beantworten – ein Feld für Sex im Tagebuch ist
 * für die einen selbstverständlich und für die anderen ein Übergriff. Welche
 * Fragen erscheinen, entscheidet die Einstellung `tagesfragen` unter Mehr.
 */
export const TAGESFRAGEN = [
  { id: 'stimmung', name: 'Stimmung', worte: ['gut', 'ok', 'gedrückt', 'schlecht', 'sehr schlecht'] },
  { id: 'stress', name: 'Anspannung', worte: ['ruhig', 'geht so', 'angespannt', 'viel', 'sehr viel'] },
  { id: 'schlaf', name: 'Schlaf', worte: ['gut', 'ok', 'mäßig', 'schlecht', 'kaum'] },
  { id: 'bewegung', name: 'Bewegung', menge: true, worte: ['keine', 'leicht', 'moderat', 'intensiv', 'sehr intensiv'] },
  { id: 'wasser', name: 'Wasser', menge: true, worte: ['keine', 'wenig', 'mittel', 'viel', 'sehr viel'] },
  { id: 'blutung', name: 'Periode', menge: true, worte: ['keine', 'Schmierblutung', 'leicht', 'mittel', 'stark'] },
  { id: 'sex', name: 'Sex', menge: true, worte: ['nein', 'ja'] },
  /*
   * Die drei Fragen zum Unterleib.
   *
   * Sie stehen NICHT in der Voreinstellung und erscheinen nur, wenn jemand sie
   * unter „Mehr" einschaltet. Eine App, die sich ungefragt nach Schmerzen beim
   * Sex erkundigt, wird zugeklappt und nicht wieder geöffnet – und dann ist
   * auch alles andere weg.
   *
   * Warum es sie trotzdem gibt: Endometriose wird im Mittel sieben bis zehn
   * Jahre lang für einen Reizdarm gehalten. Die Konstellation, an der es
   * auffiele, ist zyklusabhängige Darmbeschwerde + tiefer Schmerz beim Sex +
   * starker Regelschmerz – und danach wird in der Sprechstunde regelmäßig
   * nicht gefragt. Ein Tagebuch kann genau das sehen.
   *
   * Getrennt nach tief und außen, weil die Unterscheidung die eigentliche
   * Auskunft ist: Tiefer Schmerz deutet in den Bauchraum (Endometriose,
   * Verwachsungen, Beckenboden), Schmerz am Eingang auf etwas ganz anderes.
   * Eine Frage, die beides zusammenwirft, hätte man sich sparen können.
   */
  { id: 'sexschmerz', name: 'Schmerz beim Sex', worte: ['nein', 'leicht', 'mittel', 'stark', 'sehr stark'] },
  { id: 'sextief', name: 'davon tief innen', menge: true, worte: ['nein', 'ja'] },
  { id: 'regelschmerz', name: 'Regelschmerz', worte: ['keine', 'leicht', 'mittel', 'stark', 'sehr stark'] },
  // Nachts von Beschwerden geweckt zu werden, ist im GerdQ eine eigene Frage
  // und in der Sprechstunde eine der ersten. `menge: true`, weil „ja" hier
  // keine Note ist – es zählt die Zahl der Nächte, nicht eine Schwere.
  { id: 'nachtwach', name: 'Nachts davon wach', menge: true, worte: ['nein', 'ja'] },
];

const FRAGEN_MAP = Object.fromEntries(TAGESFRAGEN.map((f) => [f.id, f]));

export function frageVon(id) {
  return FRAGEN_MAP[id] || null;
}

/** Die Fragen, die dieser Nutzer sehen will – in der Reihenfolge von oben. */
export function sichtbareFragen(gewaehlt) {
  if (!Array.isArray(gewaehlt)) return TAGESFRAGEN;
  return TAGESFRAGEN.filter((f) => gewaehlt.includes(f.id));
}

export const PORTIONEN = [
  { id: 'klein', name: 'klein' },
  { id: 'normal', name: 'normal' },
  { id: 'gross', name: 'groß' },
];

/**
 * Vorschläge fürs Medikamentenfeld – nur Vorschläge. Das Feld bleibt frei
 * beschreibbar, weil jede Vorgabe hier irgendwann an dem vorbeigeht, was
 * jemand tatsächlich einnimmt.
 */
export const MITTEL_VORSCHLAEGE = [
  'Pantoprazol', 'Omeprazol', 'Esomeprazol', 'Antazidum', 'Sucralfat',
  'Iberogast', 'Kamillentee', 'Heilerde',
];

/** Wie stark, in Worten. Die Zahl allein sagt nach vier Wochen nichts mehr. */
export const STAERKE_WORT = [
  'keine', 'kaum spürbar', 'sehr leicht', 'leicht', 'merklich', 'mittel',
  'deutlich', 'stark', 'sehr stark', 'kaum auszuhalten', 'unerträglich',
];

const NACH_ID = (liste) => Object.fromEntries(liste.map((x) => [x.id, x]));

const AUSLOESER_MAP = NACH_ID(ALLE_AUSLOESER);
const BESCHWERDE_MAP = NACH_ID(BESCHWERDEN);

/**
 * Ein Auslöser zu seiner ID – auch für eigene, die der Nutzer angelegt hat.
 *
 * Eigene Auslöser bekommen die Vorsilbe `x:`; damit kann keine spätere
 * Erweiterung der Liste oben eine bereits vergebene eigene ID überschreiben.
 */
export function ausloeserVon(id, eigene = []) {
  if (AUSLOESER_MAP[id]) return AUSLOESER_MAP[id];
  const selbst = eigene.find((e) => e.id === id);
  return selbst ? { ...selbst, icon: selbst.icon || '•' } : null;
}

export function ausloeserName(id, eigene = []) {
  const a = ausloeserVon(id, eigene);
  return a ? a.name : id;
}

/**
 * Die Klassen eines Auslösers.
 *
 * Eigene Auslöser haben keine. Das ist Absicht und keine Lücke: Welche Klassen
 * in „Fenchelknolle" stecken, weiß diese App nicht, und sie zu raten wäre
 * schlimmer als sie wegzulassen – eine falsche Zuordnung würde in einer
 * Klassenbilanz mit achtzig Fällen nicht auffallen, sondern sie verfälschen.
 */
export function klassenVon(id) {
  const a = AUSLOESER_MAP[id];
  return (a && a.klassen) || [];
}

export function beschwerdeVon(id) {
  return BESCHWERDE_MAP[id] || null;
}

export function beschwerdeName(id) {
  const b = beschwerdeVon(id);
  return b ? b.name : id;
}

/** Aus einem freien Namen eine eigene Auslöser-ID machen. */
export function eigeneId(name) {
  const rumpf = String(name).toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `x:${rumpf || 'eigen'}`;
}
