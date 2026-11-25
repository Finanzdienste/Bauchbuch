/*
 * Teilen mit einer Vertrauensperson – die zweite und letzte Stelle, die nach
 * draußen spricht, und die einzige, die ein Tagebuch verschickt.
 *
 * Wer Body Check einfach benutzt, merkt von dieser Datei nichts: Sie hat
 * keine Adresse. Eine Adresse bekommt sie nur über einen Kopplungslink, den
 * die Vertrauensperson schickt (…/Bauchbuch/#teilen=…). Öffnet man ihn, fragt
 * die App auf „Tag“ ausdrücklich, ob das Tagebuch an diese Person gehen soll.
 * Erst nach „Ja, teilen“ geht etwas weg; nach „Nein“ ist die Kopplung
 * vergessen.
 *
 * Eingeschaltet schickt die App den ganzen Tagebuchstand (wie die Sicherung),
 * aber nur, wenn er sich seit dem letzten Mal geändert hat. „Teilen beenden“
 * unter „Mehr“ bittet das Ziel, den Stand zu löschen, und vergisst die
 * Kopplung auf diesem Gerät – auch ohne Netz.
 *
 * Wie bei js/briefkasten.js: Dieses Modul importiert store.js nicht. Es
 * bekommt den fertigen Text übergeben. Die Kopplung liegt im Gerätespeicher,
 * nie im Tagebuch und nie in einer Sicherung – ein eingelesenes Tagebuch auf
 * einem anderen Gerät teilt also nicht von selbst mit.
 *
 * Ziel ist eine Datenbankfunktion bei Supabase (rest/v1/rpc/…), die nur mit
 * einem gültigen Kopplungsschlüssel schreibt; lesen kann dort nur die
 * Vertrauensperson. Andere Ziele nimmt die App nicht an.
 */

const TEILEN_SCHLUESSEL = 'bauchbuch.teilen.v1';
const TEILEN_WARTET = 'bauchbuch.teilen.wartet.v1';
// Nur so ein Ziel wird angenommen: ein Supabase-Projekt, nichts anderes.
const TEILEN_PROJEKT = /^[a-z0-9]{20}$/;
const TEILEN_KOPPLUNG = /^[A-Za-z0-9]{24,64}$/;
const TEILEN_OEFFENTLICH = /^[A-Za-z0-9_.-]{20,300}$/;

const TEILEN_GERAET = 'bauchbuch.teilen.geraet.v1';

/** Eine Zufallskennung dieses Geräts (kein Name) – je Gerät eine Zeile beim Ziel. */
function teilenGeraet() {
  try {
    let id = localStorage.getItem(TEILEN_GERAET);
    if (!/^[a-z0-9]{8,32}$/.test(id || '')) {
      id = Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => (b % 36).toString(36)).join('');
      localStorage.setItem(TEILEN_GERAET, id);
    }
    return id;
  } catch { return 'ohnespeicher'; }
}

const teilenLies = (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } };
const teilenSchreib = (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch { /* egal */ } };

/** Prüft eine Kopplung aus dem Link; Unbrauchbares → null. */
export function teilenKopplungPruefen(roh) {
  if (!roh || typeof roh !== 'object') return null;
  const r = String(roh.r || ''); const k = String(roh.k || ''); const c = String(roh.c || '');
  const n = String(roh.n || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 40);
  if (!TEILEN_PROJEKT.test(r) || !TEILEN_OEFFENTLICH.test(k) || !TEILEN_KOPPLUNG.test(c) || !n) return null;
  return { r, k, c, n };
}

/** Liest „#teilen=…“ aus der Adresse und merkt die Kopplung als „teilenWartet auf Ja“. */
export function teilenAusLink(hash) {
  const m = /(?:^|[#&])teilen=([A-Za-z0-9_-]+)/.exec(String(hash || ''));
  if (!m) return false;
  let roh = null;
  try {
    const b64 = m[1].replace(/-/g, '+').replace(/_/g, '/');
    roh = JSON.parse(decodeURIComponent(escape(atob(b64))));
  } catch { return false; }
  const kp = teilenKopplungPruefen(roh);
  if (!kp) return false;
  teilenSchreib(TEILEN_WARTET, { ...kp, code: m[1] });
  return true;
}

/** Ein eingefügter Code – der ganze Link oder nur der Teil nach „teilen=“. */
export function teilenAusCode(text) {
  const t = String(text || '').trim();
  return teilenAusLink(t.includes('teilen=') ? t : `#teilen=${t}`);
}

/** Der Code der wartenden Kopplung zum Weitergeben in die App, oder ''. */
export function teilenWartetCode() {
  const w = teilenLies(TEILEN_WARTET);
  return w && teilenKopplungPruefen(w) && /^[A-Za-z0-9_-]+$/.test(String(w.code || '')) ? w.code : '';
}

/** Die Kopplung, die auf ein Ja teilenWartet, oder null. */
export const teilenWartet = () => teilenKopplungPruefen(teilenLies(TEILEN_WARTET));
/** Die eingeschaltete Kopplung, oder null. */
export function teilenAktiv() {
  const a = teilenLies(TEILEN_SCHLUESSEL);
  const kp = a && teilenKopplungPruefen(a);
  return kp ? { ...kp, zuletzt: a.zuletzt || null, abdruck: a.abdruck || '' } : null;
}

export function teilenZustimmen() {
  const kp = teilenWartet();
  teilenSchreib(TEILEN_WARTET, null);
  if (kp) teilenSchreib(TEILEN_SCHLUESSEL, { ...kp, zuletzt: null, abdruck: '' });
  return !!kp;
}
export function teilenAblehnen() { teilenSchreib(TEILEN_WARTET, null); }

const teilenZiel = (kp, fn) => `https://${kp.r}.supabase.co/rest/v1/rpc/${fn}`;

/** Ein kurzer Abdruck des Textes – nur, um Unverändertes nicht noch einmal zu schicken. */
export function teilenAbdruck(text) {
  let h1 = 0x811c9dc5; let h2 = 0x01000193;
  for (let i = 0; i < text.length; i += 1) {
    const c = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 16777619) >>> 0;
    h2 = Math.imul(h2 + c, 2246822519) >>> 0;
  }
  return `${text.length}.${h1.toString(36)}.${h2.toString(36)}`;
}

let teilenLaeuft = false;
/**
 * Schickt den Tagebuchstand, wenn geteilt wird und er sich geändert hat.
 * Wirft nie; ohne Netz eben beim nächsten Mal.
 */
export async function teilenMelden(text, { fassung = '', holen = (...a) => fetch(...a) } = {}) {
  const kp = teilenAktiv();
  if (!kp || teilenLaeuft || typeof text !== 'string') return false;
  const ab = teilenAbdruck(text);
  if (kp.abdruck === ab) return false;
  let stand;
  try { stand = JSON.parse(text); } catch { return false; }
  teilenLaeuft = true;
  try {
    const res = await holen(teilenZiel(kp, 'bodycheck_melden'), {
      method: 'POST',
      headers: { 'content-type': 'application/json', apikey: kp.k },
      body: JSON.stringify({ p_kopplung: kp.c, p_stand: stand, p_fassung: String(fassung).slice(0, 20), p_geraet: teilenGeraet() }),
      keepalive: text.length < 60000,
    });
    // Noch eingeschaltet? „Teilen teilenBeenden“ kann dazwischengekommen sein.
    if (res.ok && teilenAktiv()) teilenSchreib(TEILEN_SCHLUESSEL, { ...kp, zuletzt: new Date().toISOString(), abdruck: ab });
    return res.ok;
  } catch {
    return false;
  } finally {
    teilenLaeuft = false;
  }
}

/** Teilen beenden: Ziel um Löschen bitten, Kopplung hier vergessen – auch ohne Netz. */
export async function teilenBeenden({ holen = (...a) => fetch(...a) } = {}) {
  const kp = teilenAktiv();
  teilenSchreib(TEILEN_SCHLUESSEL, null);
  teilenSchreib(TEILEN_WARTET, null);
  if (!kp) return false;
  try {
    const res = await holen(teilenZiel(kp, 'bodycheck_beenden'), {
      method: 'POST',
      headers: { 'content-type': 'application/json', apikey: kp.k },
      body: JSON.stringify({ p_kopplung: kp.c, p_geraet: teilenGeraet() }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
