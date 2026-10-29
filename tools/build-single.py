#!/usr/bin/env python3
"""Baut dist/bauchbuch.html - die komplette App in einer einzigen Datei.

    python3 tools/build-single.py

CSS und alle Module werden eingebettet, sodass die Datei ohne Server und ohne
Netz laeuft: per Doppelklick, aus einer Cloud, als Anhang einer Nachricht. Die
modulare Fassung unter index.html bleibt die Arbeitsgrundlage; diese Datei ist
nur das Ergebnis zum Weitergeben.

Fuer diese App ist das nicht bloss Bequemlichkeit. Wer das Tagebuch nicht ins
Netz stellen will, braucht gar keine Adresse: eine Datei, einmal geschickt,
auf den Startbildschirm gelegt, fertig. Alles Eingetragene liegt danach im
Browser des Geraets und war nie irgendwo sonst.

Die ES-Module werden in Abhaengigkeitsreihenfolge aneinandergehaengt und ihre
import/export-Zeilen entfernt. Fuer den Namensraum 'store', den app.js benutzt,
wird ein Objekt aus den exportierten Namen von store.js gebaut.
"""

import pathlib
import base64
import hashlib
import re
import sys
from urllib.parse import quote

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / 'dist' / 'bauchbuch.html'

SHELL_RE = re.compile(r'const SHELL = \[(.*?)\];', re.DOTALL)
STAND_RE = re.compile(r"^const STAND = '[0-9a-f]*';$", re.MULTILINE)


def stand_berechnen(wurzel):
    """Ein Fingerabdruck ueber alle Dateien, die der Service Worker vorhaelt.

    Der Browser holt eine neue Fassung nur, wenn sich sw.js selbst um
    mindestens ein Byte unterscheidet. Bisher hing das allein an VERSION, und
    die musste jemand von Hand hochzaehlen. Wer es vergass, hatte eine
    Aenderung veroeffentlicht, die auf keinem Startbildschirm je ankam --
    ohne Fehlermeldung, die App lief ja weiter, nur eben alt.

    Jetzt steht der Fingerabdruck in sw.js. Aendert sich irgendeine der
    gelisteten Dateien, aendert sich sw.js mit, und die CI merkt, wenn dieser
    Bau vergessen wurde (siehe .github/workflows/pruefung.yml).

    sw.js selbst zaehlt mit, nur ohne die Zeile, in die der Fingerabdruck
    kommt. Sonst hiesse eine Fassung, die nur sw.js aendert, genauso wie die
    laufende -- und beide teilten sich einen Vorrat.
    """
    sw = (wurzel / 'sw.js').read_text(encoding='utf-8')
    treffer = SHELL_RE.search(sw)
    if not treffer:
        sys.exit('sw.js: die Liste SHELL ist nicht zu finden')
    # Jeder Eintrag muss die Form './…' in einfachen Anfuehrungszeichen haben.
    # Ein Eintrag in doppelten Anfuehrungszeichen hielte der Service Worker
    # trotzdem vor, das Muster unten saehe ihn aber nicht -- und eine
    # Aenderung an genau dieser Datei kaeme nirgends an.
    liste = re.sub(r'/\*.*?\*/|//[^\n]*', '', treffer.group(1), flags=re.DOTALL)
    for eintrag in (e.strip() for e in liste.split(',')):
        if eintrag and not re.fullmatch(r"'\./[^']*'", eintrag):
            sys.exit(f"sw.js: SHELL-Eintrag {eintrag} hat nicht die Form './...' "
                     'in einfachen Anfuehrungszeichen')
    pfade = sorted({p for p in re.findall(r"'\./([^']*)'", treffer.group(1)) if p})
    if len(pfade) < 10:
        sys.exit(f'sw.js: SHELL sieht unvollstaendig aus ({len(pfade)} Dateien)')
    h = hashlib.sha256()
    h.update(b'sw.js\0' + STAND_RE.sub("const STAND = '';", sw).encode('utf-8') + b'\0')
    for rel in pfade:
        datei = wurzel / rel
        if not datei.is_file():
            sys.exit(f'sw.js listet {rel}, die Datei gibt es nicht')
        h.update(rel.encode('utf-8') + b'\0' + datei.read_bytes() + b'\0')
    return h.hexdigest()[:12]


def stand_schreiben(wurzel):
    """Den Fingerabdruck in sw.js eintragen. Gibt ihn zurueck."""
    stand = stand_berechnen(wurzel)
    pfad = wurzel / 'sw.js'
    sw = pfad.read_text(encoding='utf-8')
    if not STAND_RE.search(sw):
        sys.exit("sw.js: die Zeile const STAND = '...'; fehlt")
    neu = STAND_RE.sub(f"const STAND = '{stand}';", sw, count=1)
    if neu != sw:
        pfad.write_text(neu, encoding='utf-8')
    return stand

# Reihenfolge = Abhaengigkeitsreihenfolge. Wer das aendert, merkt es hier
# zuerst: Im Buendel gibt es keine Importe, die eine Reihenfolge erzwingen.
MODULES = ['js/datum.js', 'js/text.js', 'js/daten.js', 'js/mittel.js',
           'js/kueche.js', 'js/befunde.js',
           'js/klang.js', 'js/atem.js', 'js/zyklus.js', 'js/kopf.js', 'js/chart.js',
           'js/store.js', 'js/zufall.js', 'js/auswertung.js', 'js/stuhl.js', 'js/kriterien.js',
           'js/versuch.js', 'js/ansprechen.js', 'js/luecken.js', 'js/schichten.js',
           'js/zeitprofil.js', 'js/wechselwirkung.js', 'js/dosis.js',
           'js/gewicht.js', 'js/provokation.js', 'js/stufenplan.js',
           'js/anfang.js', 'js/kalender.js', 'js/wach.js',
           'js/lage.js',
           'js/unterleib.js', 'js/bild.js',
           'js/rat.js', 'js/tresor.js', 'js/briefkasten.js',
           'js/bericht.js', 'js/app.js']

IMPORT_RE = re.compile(r'^\s*import\s.+?;\s*$', re.MULTILINE | re.DOTALL)
IMPORT_BLOCK_RE = re.compile(r'^\s*import\s+\{[^}]*\}\s+from\s+\'[^\']+\';\s*$',
                             re.MULTILINE | re.DOTALL)
EXPORT_RE = re.compile(r'^(\s*)export\s+(?=(?:const|let|var|function|class)\b)', re.MULTILINE)
TOPLEVEL_RE = re.compile(
    r'^(?:export\s+)?(?:const|let|var|function|class)\s+([A-Za-z_$][\w$]*)', re.MULTILINE)
EXPORTED_NAME_RE = re.compile(
    r'^\s*export\s+(?:const|let|var|function|class)\s+([A-Za-z_$][\w$]*)', re.MULTILINE)


def ohne_modulsyntax(src, pfad):
    if 'export {' in src or 'export default' in src or 'export *' in src:
        sys.exit(f'{pfad}: nur benannte Inline-Exporte werden unterstuetzt')
    # Mehrzeilige Importe zuerst, danach die einzeiligen Reste.
    src = IMPORT_BLOCK_RE.sub('', src)
    src = re.sub(r'^\s*import\s+[^;]+;\s*$', '', src, flags=re.MULTILINE)
    return EXPORT_RE.sub(r'\1', src).strip()


def main():
    html = (ROOT / 'index.html').read_text(encoding='utf-8')
    css = (ROOT / 'css' / 'styles.css').read_text(encoding='utf-8')

    stuecke = []
    for rel in MODULES:
        src = (ROOT / rel).read_text(encoding='utf-8')
        stuecke.append(f'/* ===== {rel} ===== */\n{ohne_modulsyntax(src, rel)}')
        if rel == 'js/store.js':
            namen = EXPORTED_NAME_RE.findall(src)
            if not namen:
                sys.exit('js/store.js: keine Exporte gefunden')
            # app.js spricht den Speicher als Namensraum an
            stuecke.append('const store = { ' + ', '.join(sorted(namen)) + ' };')

    # Alle Module landen in EINEM Gueltigkeitsbereich - gleiche Namen auf
    # oberster Ebene wuerden das ganze Skript zum Absturz bringen, waehrend die
    # modulare Fassung weiterlaeuft. Deshalb hier hart pruefen.
    gesehen = {}
    for rel in MODULES:
        for name in TOPLEVEL_RE.findall((ROOT / rel).read_text(encoding='utf-8')):
            if name in gesehen:
                sys.exit(f'Namenskollision {name!r}: {gesehen[name]} und {rel} '
                         '- im Buendel teilen sich alle Module einen Gueltigkeitsbereich')
            gesehen[name] = rel
    if 'store' in gesehen:
        sys.exit(f'{gesehen["store"]}: der Name "store" ist im Buendel fuer den '
                 'Namensraum von store.js reserviert')

    skript = '\n\n'.join(stuecke)
    if '</script' in skript:
        sys.exit('Skriptinhalt enthaelt "</script" und wuerde das Dokument zerreissen')

    html = html.replace(
        '<link rel="stylesheet" href="css/styles.css">',
        f'<style>\n{css}\n</style>')
    html = html.replace(
        '<script type="module" src="js/app.js"></script>',
        f'<script type="module">\n{skript}\n</script>')
    html = re.sub(r'^\s*<link rel="manifest".*\n', '', html, flags=re.MULTILINE)

    # Symbole als data:-URI einbetten, sonst zeigte die Einzeldatei ins Leere.
    # Das SVG bleibt lesbar eingebettet, das PNG fuer den Startbildschirm muss
    # als base64 mit - Android-Launcher nehmen kein SVG.
    icon = (ROOT / 'icon.svg').read_text(encoding='utf-8')
    html = html.replace('href="icon.svg"',
                        'href="data:image/svg+xml,' + quote(icon, safe='') + '"')
    png = base64.b64encode((ROOT / 'icon-192.png').read_bytes()).decode()
    html = html.replace('href="icon-192.png"', f'href="data:image/png;base64,{png}"')
    apfel = base64.b64encode((ROOT / 'apple-touch-icon.png').read_bytes()).decode()
    html = html.replace('href="apple-touch-icon.png"', f'href="data:image/png;base64,{apfel}"')

    for rest in ('href="css/', 'src="js/', 'href="manifest', 'href="icon', 'href="apple'):
        if rest in html:
            sys.exit(f'Externer Verweis nicht ersetzt: {rest}')

    OUT.parent.mkdir(exist_ok=True)
    OUT.write_text(html, encoding='utf-8')
    print(f'{OUT.relative_to(ROOT)}: {len(html) / 1024:.0f} KB, alles eingebettet')

    stand = stand_schreiben(ROOT)
    print(f'sw.js: Stand {stand}')


if __name__ == '__main__':
    # Nur den Fingerabdruck in einem anderen Ordner eintragen -- dafuer braucht
    # ihn tests/test-nachschub.mjs, der eine Kopie der App veraendert.
    # Alles andere bricht ab: Ein vertippter Aufruf baute sonst still das
    # Repository, in dem dieses Skript liegt, statt der gemeinten Kopie.
    argumente = sys.argv[1:]
    if not argumente:
        main()
    elif len(argumente) == 2 and argumente[0] == '--nur-stand':
        ziel = pathlib.Path(argumente[1]).resolve()
        if not (ziel / 'sw.js').is_file():
            sys.exit(f'--nur-stand: in {ziel} liegt keine sw.js')
        print(stand_schreiben(ziel))
    else:
        sys.exit('Aufruf: build-single.py [--nur-stand <ordner>]')
