/*
 * Service Worker – macht die App ohne Netz benutzbar.
 *
 * Muss im Wurzelverzeichnis liegen: Der Geltungsbereich eines Service Workers
 * ist sein eigener Ordner, und von hier aus deckt er die gesamte App ab.
 *
 * Zwei Strategien, je nach Art der Anfrage:
 *
 *   Seitenaufrufe   erst Netz, bei Fehlschlag der Zwischenspeicher. So ist
 *                   eine neue Fassung sofort da, sobald Empfang besteht, und
 *                   ohne Netz startet die App trotzdem.
 *
 *   Alles andere    sofort aus dem Zwischenspeicher ausliefern und parallel im
 *                   Hintergrund erneuern. Der Start bleibt dadurch auch bei
 *                   schlechter Verbindung schnell.
 *
 * Was der Service Worker *nicht* tut: irgendetwas verschicken. Er holt nur die
 * eigenen Dateien und beantwortet Anfragen an dieselbe Adresse. Eintragungen
 * kommen hier nie vorbei – die stehen im localStorage und verlassen die Seite
 * nicht.
 *
 * VERSION bei jeder Änderung an den unten gelisteten Dateien hochzählen –
 * sie ist die Nummer, die unter „Mehr" steht und nach der man fragt.
 *
 * Ankommen hängt aber nicht mehr an ihr. STAND ist ein Fingerabdruck über
 * alle Dateien in SHELL und wird von `python3 tools/build-single.py`
 * eingetragen, nie von Hand. Ändert sich irgendeine dieser Dateien, ändert
 * sich damit sw.js, und nur daran erkennt der Browser eine neue Fassung. Wer
 * den Bau vergisst, bekommt eine rote CI statt einer stillen alten App auf
 * dem Startbildschirm.
 */

const VERSION = 'v26';
const STAND = 'a8d0c81b09c6';
const CACHE = `bauchbuch-${VERSION}-${STAND}`;

const SHELL = [
  './',
  './index.html',
  './css/styles.css',
  './js/app.js',
  './js/datum.js',
  './js/text.js',
  './js/daten.js',
  './js/chart.js',
  './js/store.js',
  './js/auswertung.js',
  './js/bericht.js',
  './js/mittel.js',
  './js/klang.js',
  './js/atem.js',
  './js/zyklus.js',
  './js/kopf.js',
  './js/bild.js',
  './js/rat.js',
  './js/stuhl.js',
  './js/kriterien.js',
  './js/versuch.js',
  './js/ansprechen.js',
  './js/luecken.js',
  './js/tresor.js',
  './js/briefkasten.js',
  './js/kueche.js',
  './js/befunde.js',
  './js/unterleib.js',
  './js/schichten.js',
  './js/zeitprofil.js',
  './js/wechselwirkung.js',
  './js/lage.js',
  './js/zufall.js',
  './js/dosis.js',
  './js/gewicht.js',
  './js/provokation.js',
  './js/stufenplan.js',
  './js/anfang.js',
  './js/kalender.js',
  './js/wach.js',
  './icon.svg',
  './icon-192.png',
  './apple-touch-icon.png',
  './manifest.webmanifest',
];
/*
 * Die beiden großen Symbole (icon-512.png, icon-maskable-512.png) stehen mit
 * Absicht nicht in der Liste. Zusammen sind sie ein Drittel dessen, was bei
 * jeder neuen Fassung frisch geladen werden muss, und gebraucht werden sie
 * nur beim Installieren unter Android – mit Netz. Wer sie anfordert, bekommt
 * sie über den gewöhnlichen Weg unten und danach aus dem Vorrat.
 */

/*
 * Ohne diese Dateien startet die App nicht. Fehlt beim Einrichten einer
 * neuen Fassung auch nur eine davon, wird die ganze Fassung verworfen und
 * die alte bleibt – siehe 'install'. Symbole und Manifest dürfen fehlen.
 */
const VERZICHTBAR = /\.(png|svg|webmanifest)$/;

/*
 * Wie lange eine Seitenanfrage auf das Netz wartet, bevor der Vorrat
 * antwortet. Bei „Empfang da, aber nichts kommt durch" hinge die App sonst
 * beliebig lange auf einer weißen Seite.
 */
const NETZ_GEDULD_MS = 3500;

/**
 * Am Zwischenspeicher des Browsers vorbei laden.
 *
 * Das ist keine Feinheit: GitHub Pages schickt die Dateien mit einer
 * Haltbarkeit von zehn Minuten. Ein gewöhnliches fetch() bekommt dann die
 * *alte* Fassung aus dem Browser-Zwischenspeicher – und der Service Worker
 * legt sie als vermeintlich frisch in seinen eigenen. So kann eine neue
 * Fassung beliebig lange nicht ankommen, obwohl sie längst online steht.
 */
const frisch = (input) => {
  // Nach dem Fetch-Standard wirft das auch für Seitenanfragen nicht. Ein
  // Browser, der es doch tut, bekäme hier sonst gar keine Antwort – und die
  // App liefe ohne Netz nicht mehr an.
  try {
    return fetch(new Request(input, { cache: 'reload' }));
  } catch {
    return fetch(input);
  }
};

/*
 * Alles oder nichts.
 *
 * Hier wurde früher jede Datei einzeln geholt und ein Fehler geschluckt: Eine
 * fehlende Datei sollte nicht die ganze Installation scheitern lassen. Das
 * war richtig, solange eine neue Fassung erst beim nächsten Start kam. Seit
 * die App bei jeder Rückkehr nachsieht – auch im Keller, auch in der Bahn –,
 * wäre es gefährlich: Bricht dabei der Abruf eines Moduls ab, würde die neue
 * Fassung trotzdem aktiv, 'activate' räumt die alte weg, und ohne Netz bleibt
 * die App weiß. Jetzt verwirft eine unvollständige Fassung sich selbst; die
 * alte bleibt, und beim nächsten Nachsehen wird es erneut versucht.
 *
 * Verworfen wird aber nur ein Vorrat, den diese Installation selbst angelegt
 * hat. Trägt er denselben Namen wie der laufende, ist er der laufende – und
 * ihn zu löschen hieße, der App ohne Netz den Boden wegzuziehen.
 */
self.addEventListener('install', (event) => {
  let schonDa = false;
  event.waitUntil(
    caches.has(CACHE)
      .then((da) => { schonDa = da; return caches.open(CACHE); })
      .then((cache) => Promise.all(SHELL.map((url) => frisch(url)
        .then((res) => {
          if (res && res.ok) return cache.put(url, res);
          throw new Error(`${url}: ${res ? res.status : 'keine Antwort'}`);
        })
        .catch((fehler) => {
          if (VERZICHTBAR.test(url)) return null;
          throw fehler;
        }))))
      .then(() => self.skipWaiting())
      .catch((fehler) => (schonDa ? Promise.resolve() : caches.delete(CACHE))
        .then(() => { throw fehler; })),
  );
});

/*
 * Welche Fassung läuft hier? Die Seite fragt das für die Anzeige unter
 * „Mehr" und um zu erkennen, dass eine neue übernommen hat.
 */
self.addEventListener('message', (event) => {
  const frage = event.data;
  if (!frage || frage.frage !== 'fassung') return;
  const antwort = { version: VERSION, stand: STAND };
  if (event.ports && event.ports[0]) event.ports[0].postMessage(antwort);
  else if (event.source) event.source.postMessage(antwort);
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Nur im Zwischenspeicher dieser Fassung nachsehen. caches.match() ohne
  // Angabe durchsucht *alle* – ein übrig gebliebener alter würde dann weiter
  // alte Dateien ausliefern.
  const gespeichert = (req) => caches.open(CACHE).then((c) => c.match(req));

  if (request.mode === 'navigate') {
    const netz = frisch(request).then((res) => {
      if (res && res.ok) {
        const kopie = res.clone();
        caches.open(CACHE).then((c) => c.put(request, kopie));
      }
      return res;
    });
    const ausVorrat = () => gespeichert(request)
      .then((treffer) => treffer || gespeichert('./index.html'));

    /*
     * Erst das Netz – aber nicht beliebig lange. Antwortet es nicht binnen
     * NETZ_GEDULD_MS, antwortet der Vorrat; liegt dort nichts, wird weiter
     * auf das Netz gewartet. Was zuerst brauchbar da ist, gilt.
     */
    event.respondWith(new Promise((fertig) => {
      let beantwortet = false;
      const nimm = (res) => {
        if (beantwortet || !res) return;
        beantwortet = true;
        fertig(res);
      };
      const uhr = setTimeout(() => { ausVorrat().then(nimm); }, NETZ_GEDULD_MS);
      netz
        .then((res) => { clearTimeout(uhr); nimm(res); })
        .catch(() => {
          clearTimeout(uhr);
          ausVorrat().then((treffer) => nimm(treffer || Response.error()));
        });
    }));
    // Hat der Vorrat schneller geantwortet, läuft das Netz trotzdem zu Ende –
    // dann hat die nächste Seite den frischen Stand.
    event.waitUntil(netz.catch(() => null));
    return;
  }

  event.respondWith(
    gespeichert(request).then((treffer) => {
      const erneuern = frisch(request)
        .then((res) => {
          if (res && res.ok) {
            const kopie = res.clone();
            caches.open(CACHE).then((c) => c.put(request, kopie));
          }
          return res;
        })
        .catch(() => treffer);
      return treffer || erneuern;
    }),
  );
});
