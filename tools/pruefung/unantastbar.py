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

Der Wortlaut der Warnzeichen, ihre Dringlichkeit und ihre Anzahl. Nicht mehr
und nicht weniger -- eine Sperre, die alles verbietet, macht den Rueckkanal
nutzlos und wird dann abgeschaltet.

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
        anzahl = len(re.findall(r"\bid:\s*'", vorher))
        print(f'Unantastbar: die {anzahl} Warnzeichen stehen unveraendert da.')
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
