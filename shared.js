const SB_URL = 'https://fqdemhhcpetnrbtlgpxa.supabase.co';
const SB_KEY = 'sb_publishable_sSsPAfmpeMPP6m1JsurhZQ_DP8AHmDZ';

async function rpc(fn, args) {
  try {
    const r = await fetch(SB_URL + '/rest/v1/rpc/' + fn, {
      method: 'POST',
      headers: { apikey: SB_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(args || {})
    });
    const t = await r.text();
    let j = null;
    try { j = JSON.parse(t); } catch (e) { j = null; }
    if (!r.ok || j === null) return { error: 'serverfout' };
    return j;
  } catch (e) {
    return { error: 'netwerk' };
  }
}

const mem = {};
const store = {
  get(k) {
    try { const v = localStorage.getItem(k); if (v !== null) return v; } catch (e) {}
    return mem[k] || null;
  },
  set(k, v) {
    mem[k] = v;
    try { localStorage.setItem(k, v); } catch (e) {}
  },
  del(k) {
    delete mem[k];
    try { localStorage.removeItem(k); } catch (e) {}
  }
};

const ERR = {
  netwerk: 'Geen verbinding. Controleer je internet en probeer het opnieuw.',
  serverfout: 'Er ging iets mis. Probeer het zo opnieuw.',
  onbekende_code: 'Deze code bestaat niet. Controleer de code en probeer het opnieuw.',
  te_veel_pogingen: 'Te veel pogingen. Wacht even en probeer het opnieuw.',
  al_geclaimd: 'Deze code is al in gebruik. Log in met je pincode.',
  nog_niet_geclaimd: 'Deze code is nog niet gestart. Maak eerst een pincode.',
  pincode_ongeldig: 'Een pincode bestaat uit precies 4 cijfers.',
  verkeerde_pincode: 'Verkeerde pincode.',
  vergrendeld: 'Te vaak een verkeerde pincode ingevuld. Wacht even en probeer het opnieuw.',
  competitie_afgelopen: 'De competitie is afgelopen.',
  sessie_verlopen: 'Je sessie is verlopen. Log opnieuw in met je code en pincode.',
  verkeerd_wachtwoord: 'Verkeerd wachtwoord.',
  naam_ongeldig: 'Geef de klas een naam van maximaal 30 tekens.',
  aantal_ongeldig: 'Kies een aantal studenten tussen 1 en 40.',
  einddatum_te_ver: 'De einddatum mag maximaal 45 dagen na het aanmaken van de klas liggen.',
  einddatum_verleden: 'De einddatum mag niet in het verleden liggen.',
  einddatum_ongeldig: 'Kies een geldige einddatum.',
  naam_bestaat: 'Er bestaat al een klas met deze naam.',
  klas_niet_gevonden: 'Deze klas bestaat niet meer.',
  speler_niet_gevonden: 'Dit dier bestaat niet meer.',
  geen_pincode: 'Dit dier heeft geen pincode om te resetten.',
  te_laat: 'Reset niet mogelijk. De laatste speeldatum ligt meer dan zeven dagen terug.',
  wachtwoord_te_kort: 'Een wachtwoord bestaat uit minimaal 8 tekens.'
};
function errText(code) { return ERR[code] || 'Er ging iets mis (' + code + ').'; }

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function fmtDate(iso) {
  if (!iso) return 'nog niet';
  const d = new Date(iso);
  return d.toLocaleString('nl-NL', { timeZone: 'Europe/Amsterdam', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}
function fmtDay(iso) {
  if (!iso) return '';
  const d = new Date(iso.length === 10 ? iso + 'T12:00:00' : iso);
  return d.toLocaleDateString('nl-NL', { timeZone: 'Europe/Amsterdam', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

const ANIMALS = {
  Vos: '🦊', Uil: '🦉', Havik: '🦅', Haas: '🐇', Ree: '🦌', Egel: '🦔', Eekhoorn: '🐿️', Wolf: '🐺', Leeuw: '🦁', Zwaan: '🦢',
  Papegaai: '🦜', Pauw: '🦚', Dolfijn: '🐬', Walvis: '🐋', Octopus: '🐙', Pinguin: '🐧', Panda: '🐼', Koala: '🐨', Kameel: '🐫', Giraf: '🦒',
  Zebra: '🦓', Olifant: '🐘', Neushoorn: '🦏', Nijlpaard: '🦛', Kangoeroe: '🦘', Schildpad: '🐢', Krokodil: '🐊', Kikker: '🐸', Vlinder: '🦋', Bij: '🐝',
  Slak: '🐌', Krab: '🦀', Haai: '🦈', Tijger: '🐯', Aap: '🐵', Muis: '🐭', Kat: '🐱', Hond: '🐶', Eend: '🦆', Koe: '🐮'
};
function emoji(d) { return ANIMALS[d] || '🐾'; }
