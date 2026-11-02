"""Was ein Zweig aus dem Briefkasten inhaltlich nicht anfassen darf.

WOZU ES DIESEN ZWEITEN WAECHTER GIBT

bot-grenzen.py schuetzt Dateien: die Pruefungen, den Ablauf, den einen
Versandweg. Das reicht, solange am Ende ein Mensch den Entwurf durchsieht.

Der faellt jetzt weg -- Vorschlaege gehen ohne Rueckfrage in die laufende App.
Damit verschiebt sich die Gefahr. Sie ist nicht mehr, dass jemand Schadcode
einwirft; das faengt die Testsuite. Sie ist, dass jemand in den Briefkasten
schreibt:

    "Der rote Kasten bei Blut im Stuhl macht mir Angst, nimm ihn weg."

Das liest sich wie ein gewoehnlicher Vorschlag. Ein Agent, der bauen soll,
baut es. Alle Pruefungen bleiben gruen -- keine einzige verlangt, dass
ausgerechnet dieser Satz dasteht. Und eine Gesundheits-App verliert
stillschweigend ihre einzige dringende Warnung, ohne dass es jemandem
auffaellt.

Es muss auch keine boese Absicht dahinterstecken. Der Satz oben ist ehrlich
gemeint und trotzdem falsch: Wer Angst vor der Warnung hat, ist genau der
Mensch, fuer den sie dasteht.

WAS HIER GESCHUETZT WIRD

Der Wortlaut der Warnzeichen, ihre Dringlichkeit und ihre Anzahl. Und seit
der Fassung 28 die Saetze, die aus demselben Grund nicht still verschwinden
duerfen -- jeder davon steht da, weil sein Fehlen jemandem schaden kann:

  * die Formtexte von Methylphenidat (MPH_FORMEN: einnahme, saeure, extra)
    und der Klaer-Satz dazu (KLAER_SATZ) in js/mittel.js -- darunter der
    eine, dass Medikinet-Kapseln mit einem Saeureblocker nicht vorgesehen
    sind;
  * die Hinweise zu den ADHS-Mitteln (ADHS_MITTEL, Feld hinweis) in
    js/mittel.js -- MAO-Hemmer, Leber, Absetzen;
  * alle Texte in js/zusammen.js, den Paaren von Mitteln;
  * der Herstellerhinweis zur Massagepistole (MASSAGE_HINWEIS) in
    js/aktivitaet.js, samt der Notfallzeichen.

"Lass den Hinweis zum Saeureblocker weg, er macht mir Sorgen" ist derselbe
Satz wie der ueber den roten Kasten. Nicht mehr und nicht weniger -- eine
Sperre, die alles verbietet, macht den Rueckkanal nutzlos und wird dann
abgeschaltet. Der Code um diese Texte bleibt aenderbar.

Aendern darf das ein Mensch weiterhin jederzeit; diese Pruefung greift nur
bei Zweigen, die das Programm angelegt hat (Praefix `vorschlag/`). Und sie
laeuft, wie bot-grenzen.py, mit dem Skript aus origin/main: Was der Agent an
seiner Arbeitskopie dreht, zaehlt nicht mit.

WARUM GERADE SO GEPRUEFT WIRD

Verglichen werden id, name, dringlichkeit und warum -- der ganze Wortlaut,
nicht nur die Kennungen. Ein "warum", das seine Dringlichkeit verliert
("gehoert mal angesehen" statt "notfalls ueber die 112"), waere derselbe
Schaden in leiser.

Gelesen wird die Liste nicht mit einem JavaScript-Lauf, sondern mit einem
Textvergleich der Datei zwischen Basis und Zweig: Was ausgefuehrt wird, kann
sich verstellen, ein Diff nicht.
"""
import re
import subprocess
import sys

PRAEFIX = 'vorschlag/'
QUELLE = 'js/bild.js'
ANFANG = 'export const WARNZEICHEN = ['


def zweig():
    import os
    for name in ('GITHUB_HEAD_REF', 'GITHUB_REF_NAME'):
        wert = os.environ.get(name)
        if wert:
            return wert
    try:
        return subprocess.run(
            ['git', 'rev-parse', '--abbrev-ref', 'HEAD'],
            capture_output=True, text=True, check=True,
        ).stdout.strip()
    except subprocess.CalledProcessError:
        return ''


def datei(ref):
    """Den Inhalt von js/bild.js an einem Stand holen."""
    fertig = subprocess.run(
        ['git', 'show', f'{ref}:{QUELLE}'],
        capture_output=True, text=True,
    )
    if fertig.returncode != 0:
        return None
    return fertig.stdout


def liste(text):
    """Den Block zwischen `export const WARNZEICHEN = [` und der Klammer.

    Absichtlich stumpf: Gesucht wird der Anfang, dann wird bis zur Zeile
    gelesen, die genau `];` ist. Ein Parser waere genauer und haette eine
    eigene Schwaeche -- er koennte an einer Formatierung scheitern und dabei
    "keine Aenderung" melden. Diese Funktion scheitert laut oder gar nicht.
    """
    if text is None:
        return None
    i = text.find(ANFANG)
    if i < 0:
        return None
    rest = text[i + len(ANFANG):]
    ende = re.search(r'^\];$', rest, re.M)
    if not ende:
        return None
    return rest[:ende.start()]


def datei_an(ref, pfad):
    """Den Inhalt einer Datei an einem Stand holen - oder None."""
    fertig = subprocess.run(
        ['git', 'show', f'{ref}:{pfad}'],
        capture_output=True, text=True,
    )
    if fertig.returncode != 0:
        return None
    return fertig.stdout


def literale(text):
    """Alle Zeichenketten in einem Stueck JavaScript, in ihrer Reihenfolge.

    Kommentare zaehlen nicht mit: Ein umformulierter Kommentar aendert keinen
    Satz, den jemand liest. Template-Literale kommen roh mit, samt ${...}.
    Ein kleiner Zeichenleser statt eines Parsers, aus demselben Grund wie
    oben: Er kann nicht an einer Formatierung scheitern und dabei
    "unveraendert" melden.
    """
    raus = []
    i, n = 0, len(text)
    while i < n:
        if text.startswith('//', i):
            j = text.find('\n', i)
            i = n if j < 0 else j
            continue
        if text.startswith('/*', i):
            j = text.find('*/', i + 2)
            i = n if j < 0 else j + 2
            continue
        c = text[i]
        if c in '\'"`':
            j = i + 1
            stueck = []
            while j < n and text[j] != c:
                if text[j] == '\\' and j + 1 < n:
                    stueck.append(text[j:j + 2])
                    j += 2
                    continue
                stueck.append(text[j])
                j += 1
            raus.append(''.join(stueck))
            i = j + 1
            continue
        i += 1
    return raus


def block(text, anfang, ende):
    """Den Text ab `anfang` bis einschliesslich der ersten Stelle, die
    `ende` trifft - oder None, wenn eines davon fehlt."""
    if text is None:
        return None
    if anfang is None:
        return text
    i = text.find(anfang)
    if i < 0:
        return None
    rest = text[i:]
    treffer = re.search(ende, rest, re.M)
    if not treffer:
        return None
    return rest[:treffer.end()]


FELD_RE = re.compile(r'^\s*(\w+):\s*(.*)$')
ID_RE = re.compile(r"^\s*id:\s*'([\w-]+)'")


def felder(text, namen):
    """Je Eintrag (nach seiner id) die Felder `namen` als Wortlaut.

    Zeilenweise: Ein Feld beginnt mit `name:` am Zeilenanfang und reicht bis
    zum naechsten Feld oder zur schliessenden Klammer; Fortsetzungszeilen
    (`+ '...'`) gehoeren dazu. Verglichen wird der Ausdruck mit
    zusammengezogenen Leerzeichen - ein neuer Satz, ein geaenderter Verweis
    (`saeure: KLAER_SATZ`) und ein geloeschtes Feld fallen alle auf.
    """
    raus = {}
    aktuell = None
    feld = None
    for zeile in text.splitlines():
        nackt = zeile.strip()
        if nackt.startswith(('/*', '*', '//')):
            continue
        treffer_id = ID_RE.match(zeile)
        if treffer_id:
            aktuell = treffer_id.group(1)
            raus.setdefault(aktuell, {})
            feld = None
            continue
        treffer = FELD_RE.match(zeile)
        if treffer and not nackt.startswith(("'", '"', '`', '+')):
            feld = treffer.group(1) if treffer.group(1) in namen else None
            if feld and aktuell is not None:
                raus[aktuell][feld] = treffer.group(2)
            continue
        if nackt.startswith('}'):
            feld = None
            continue
        if feld and aktuell is not None:
            raus[aktuell][feld] += ' ' + nackt
    return {k: {f: re.sub(r'\s+', ' ', v).strip() for f, v in d.items()} for k, d in raus.items()}


# Die Sicherheitstexte der Fassung 28: Datei, Anfang, Ende, was verglichen
# wird, und wie die Meldung sie nennt. Anfang None heisst: die ganze Datei.
WAECHTER = [
    ('js/mittel.js', 'export const MPH_FORMEN = [', r'^\];$',
     ('felder', ('einnahme', 'saeure', 'extra')),
     'die Formtexte von Methylphenidat (MPH_FORMEN)'),
    ('js/mittel.js', 'export const KLAER_SATZ =', r';$', ('texte', None),
     'den Klaer-Satz zu Saeureblockern (KLAER_SATZ)'),
    ('js/mittel.js', 'export const ADHS_MITTEL = [', r'^\];$', ('felder', ('hinweis',)),
     'die Hinweise zu den ADHS-Mitteln (ADHS_MITTEL)'),
    ('js/zusammen.js', None, None, ('texte', None),
     'die Texte zu Mitteln, die zusammen eine Frage aufwerfen (js/zusammen.js)'),
    ('js/aktivitaet.js', 'export const MASSAGE_HINWEIS = {', r'^\};$', ('texte', None),
     'den Herstellerhinweis zur Massagepistole (MASSAGE_HINWEIS)'),
]


def wortlaut(text, art):
    if text is None:
        return None
    was, namen = art
    if was == 'felder':
        return felder(text, namen)
    return ''.join(literale(text))


def sicherheitstexte(basis):
    """Die geaenderten Sicherheitstexte als Liste von Meldungen.

    Fehlt ein Text schon in der Basis, gibt es ihn dort noch nicht - dann ist
    nichts zu schuetzen. Fehlt er erst im Zweig, ist das die schlimmste
    Aenderung von allen: umbenannt, verschoben oder geloescht.
    """
    meldungen = []
    for pfad, anfang, ende, art, name in WAECHTER:
        vorher = wortlaut(block(datei_an(basis, pfad), anfang, ende), art)
        if vorher is None:
            continue
        nachher = wortlaut(block(datei_an('HEAD', pfad), anfang, ende), art)
        if nachher is None:
            meldungen.append(f'{name} in {pfad} sind nicht mehr auffindbar')
        elif nachher != vorher:
            meldungen.append(f'{name} in {pfad} sind geaendert')
    return meldungen


def main():
    basis = sys.argv[1] if len(sys.argv) > 1 else 'origin/main'
    z = zweig()

    if not z.startswith(PRAEFIX):
        print(f'Zweig "{z}" ist keiner aus dem Briefkasten - nichts zu pruefen.')
        return 0

    vorher = liste(datei(basis))
    nachher = liste(datei('HEAD'))

    # Beide Faelle sind ein Fehler, und der zweite ist der schlimmere: Eine
    # Liste, die sich nicht mehr finden laesst, ist entweder umbenannt oder
    # verschoben worden - und wer sie loswerden will, tut genau das.
    if vorher is None:
        print(f'Unantastbar: FEHLER - WARNZEICHEN in {basis}:{QUELLE} nicht gefunden.',
              file=sys.stderr)
        return 2
    if nachher is None:
        print('Unantastbar: FEHLER', file=sys.stderr)
        print(f'  Die Liste WARNZEICHEN ist in {QUELLE} nicht mehr auffindbar.',
              file=sys.stderr)
        print('  Umbenannt, verschoben oder geloescht - dreimal dasselbe Ergebnis:',
              file=sys.stderr)
        print('  Die App warnt nicht mehr.', file=sys.stderr)
        return 1

    if vorher.strip() == nachher.strip():
        meldungen = sicherheitstexte(basis)
        if meldungen:
            print('Unantastbar: FEHLER', file=sys.stderr)
            print(f'  Der Zweig "{z}" stammt aus dem Briefkasten und aendert', file=sys.stderr)
            print('  Sicherheitstexte, die dieser Weg nicht anfassen darf:', file=sys.stderr)
            for m in meldungen:
                print(f'    - {m}', file=sys.stderr)
            print('', file=sys.stderr)
            print('  Wer einen solchen Satz loswerden will, ist oft genau der Mensch,', file=sys.stderr)
            print('  fuer den er dasteht. Wenn die Aenderung richtig ist, gehoert sie', file=sys.stderr)
            print('  in einen eigenen, von Hand angelegten Zweig.', file=sys.stderr)
            return 1
        anzahl = len(re.findall(r"\bid:\s*'", vorher))
        print(f'Unantastbar: die {anzahl} Warnzeichen stehen unveraendert da, '
              'die Sicherheitstexte ebenso.')
        return 0

    print('Unantastbar: FEHLER', file=sys.stderr)
    print(f'  Der Zweig "{z}" stammt aus dem Briefkasten und aendert die', file=sys.stderr)
    print(f'  Warnzeichen in {QUELLE}.', file=sys.stderr)
    print('', file=sys.stderr)
    print('  Das ist die eine Aenderung, die dieser Weg nicht machen darf.', file=sys.stderr)
    print('  Ein Vorschlag von aussen kann gut gemeint sein und trotzdem die', file=sys.stderr)
    print('  einzige dringende Auskunft dieser App entfernen - wer Angst vor', file=sys.stderr)
    print('  der Warnung hat, ist der Mensch, fuer den sie dasteht.', file=sys.stderr)
    print('', file=sys.stderr)
    print('  Wenn die Aenderung richtig ist, gehoert sie in einen eigenen,', file=sys.stderr)
    print('  von Hand angelegten Zweig.', file=sys.stderr)
    return 1


if __name__ == '__main__':
    sys.exit(main())
