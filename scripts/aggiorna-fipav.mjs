// =========================================================
// ASD Volley '96 — Scraper FIPAV Sicilia
// =========================================================
// Gira su GitHub Actions e:
//   1. Legge data.js
//   2. Scarica pagina pubblica FIPAV Sicilia
//   3. Trova match con "VOLLEY 96"
//   4. Scarica classifiche dei campionati trovati
//   5. Fonde nuovi dati con esistenti (mantiene storico)
//   6. Riscrive data.js
//
// Configurazione: vedi costanti qui sotto.
// =========================================================

import { readFileSync, writeFileSync } from 'node:fs';
import * as cheerio from 'cheerio';

// ============ CONFIGURAZIONE ============

// URL portale FIPAV Sicilia. PId=7306 è la pagina pubblica.
// Il valore StId (stagione) viene letto automaticamente — non serve aggiornarlo a stagione nuova.
const FIPAV_BASE_URL = 'https://sicilia.portalefipav.net/risultati-classifiche.aspx?PId=7306';

// SId della società sul portale FIPAV. Trovato cercando "VOLLEY 96" nel dropdown Società.
// Se cambia il nome della società, vai sul portale, ispeziona il dropdown, prendi il nuovo SId.
const SOCIETA_SID = '2225';   // A.S. VOLLEY 96

const DATA_FILE = 'data.js';

// Pattern (case-insensitive, ignorano punteggiatura) per riconoscere la nostra società
// sui nomi squadra. Lo script include un match se UNO QUALSIASI di questi pattern compare.
const PATTERNS_SOCIETA = [
  'VOLLEY 96',           // forma generica
  "VOLLEY '96",          // con apostrofo
  'FIMA FORMAZIONE',     // femminile (anche se sul portale è "FI.MA. FORMAZIONE")
  'ADG NDT',             // maschile (sponsor)
  'ADG NDT SOLUTIONS',
  'A.S. VOLLEY 96'       // nome ufficiale società FIPAV
];

// ============ UTILITY ============

const UA = 'Mozilla/5.0 (compatible; ASDVolley96-Bot/1.0)';
const clean = (s) => (s || '').replace(/\s+/g, ' ').trim();

async function fetchHTML(url) {
  const r = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!r.ok) throw new Error(`HTTP ${r.status} per ${url}`);
  return await r.text();
}

function parseDataIso(s) {
  if (!s) return '';
  const m = s.match(/(\d{1,2})[/\-](\d{1,2})[/\-](\d{2,4})/);
  if (!m) return '';
  const g = m[1].padStart(2, '0');
  const mm = m[2].padStart(2, '0');
  const a = m[3].length === 2 ? '20' + m[3] : m[3];
  return `${a}-${mm}-${g}`;
}

function estraiOra(s) {
  const m = (s || '').match(/(\d{1,2})[:.](\d{2})/);
  return m ? `${m[1]}:${m[2]}` : '';
}

function siglaDaNome(nome) {
  if (!nome) return '??';
  const cleaned = nome.replace(/^(A\.?\s*S\.?\s*D?\.?\s*|POL\.?\s*|U\.?\s*S\.?\s*|G\.?\s*S\.?\s*|ASD\s*)/i, '');
  const parts = cleaned.split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return cleaned.slice(0, 2).toUpperCase();
}

// Match case-insensitive con normalizzazione (apostrofi, puntini, spazi)
function normalizza(s) {
  return (s || '')
    .toUpperCase()
    .replace(/['']/g, '')
    .replace(/\./g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
function isNostraSocieta(nome) {
  const n = normalizza(nome);
  return PATTERNS_SOCIETA.some(p => n.includes(normalizza(p)));
}

// Legge dinamicamente lo StId della stagione corrente dal dropdown FIPAV
async function trovaStagioneCorrente() {
  const html = await fetchHTML(FIPAV_BASE_URL);
  const m = html.match(/<select[^>]*name=["']StId["'][^>]*>([\s\S]*?)<\/select>/i);
  if (!m) return null;
  // prima option = stagione più recente
  const opt = m[1].match(/<option[^>]*value=["'](\d+)["'][^>]*>([^<]*)<\/option>/i);
  return opt ? { id: opt[1], nome: opt[2].trim() } : null;
}

function abbreviaCategoria(t) {
  const T = (t || '').toUpperCase();
  if (T.includes('SERIE C FEMMINILE')) return 'Serie C F';
  if (T.includes('SERIE C MASCHILE'))  return 'Serie C M';
  if (T.includes('SERIE D FEMMINILE')) return 'Serie D F';
  if (T.includes('SERIE D MASCHILE'))  return 'Serie D M';
  if (T.includes('UNDER 19'))          return 'U19';
  if (T.includes('UNDER 18'))          return 'U18';
  if (T.includes('UNDER 17'))          return 'U17';
  if (T.includes('UNDER 16'))          return 'U16';
  if (T.includes('UNDER 15'))          return 'U15';
  if (T.includes('UNDER 14'))          return 'U14';
  if (T.includes('UNDER 13'))          return 'U13';
  if (T.includes('PRIMA DIVISIONE'))   return '1ª Div';
  if (T.includes('SECONDA DIVISIONE')) return '2ª Div';
  return T.slice(0, 30);
}

// ============ LETTURA / SCRITTURA data.js ============

function leggiData() {
  const src = readFileSync(DATA_FILE, 'utf8');
  const start = src.indexOf('{');
  const end = src.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('data.js non valido');
  const jsonish = src.slice(start, end + 1);
  // Object literal JS → parse via Function
  const D = (new Function(`return ${jsonish};`))();
  return D;
}

function scriviData(D) {
  const header = `/* =========================================================
   ASD Volley '96 — DATI DEL SITO
   Aggiornato automaticamente il ${new Date().toLocaleString('it-IT', { timeZone: 'Europe/Rome' })}
   ========================================================= */

window.SITE_DATA = `;
  writeFileSync(DATA_FILE, header + JSON.stringify(D, null, 2) + ';\n');
}

// ============ PARSING PAGINA FIPAV ============

function parsePagina(html) {
  const $ = cheerio.load(html);
  const risultati = [];
  const calendario = [];
  const classificheCId = {};

  // ===== STEP 1: Trova tutti i "marker" nell'HTML in ordine =====
  // Un marker è un titolo campionato O una tabella di match.
  // Per ogni tabella applichiamo l'ultimo titolo trovato prima.

  // Regex per i titoli campionato (devono coprire i casi noti del portale FIPAV)
  const titoloRegex = /\b((?:SERIE\s+[A-Z]+\s+(?:FEMMINILE|MASCHILE)(?:\s*-\s*[^<\n]{1,150})?)|(?:PLAY-OFF\s+[A-Z\d]+[^<\n]{1,150})|(?:UNDER\s+\d+\s+[A-Z]+[^<\n]{1,150})|(?:COPPA\s+SICILIA[^<\n]{1,150})|(?:FINAL\s+(?:FOUR|SIX)[^<\n]{1,150})|(?:TROFEO\s+DEI\s+TERRITORI[^<\n]{1,150}))/gi;

  const markers = [];

  // 1a. Trova i titoli campionato (deduplicati per posizione)
  let m;
  const titoliVisti = new Set();
  while ((m = titoloRegex.exec(html))) {
    const titolo = clean(m[1]).replace(/[\s\-]+$/, '');
    if (titolo.length < 8) continue;
    // Evita duplicati ravvicinati (la stessa stringa entro 200 char)
    const key = m.index + '|' + titolo;
    if (titoliVisti.has(key)) continue;
    titoliVisti.add(key);
    markers.push({ pos: m.index, type: 'titolo', value: titolo });
  }

  // 1b. Trova le tabelle match (header "Squadra casa")
  const tableMatches = [];
  const tableRegex = /Squadra\s+casa/gi;
  while ((m = tableRegex.exec(html))) {
    // Risali alla <table> contenitore: prendi la posizione del precedente "<table"
    const before = html.slice(0, m.index);
    const tableStart = before.lastIndexOf('<table');
    if (tableStart === -1) continue;
    // Trova il "</table>" successivo
    const tableEnd = html.indexOf('</table>', m.index);
    if (tableEnd === -1) continue;
    if (tableMatches.some(t => t.start === tableStart)) continue;
    tableMatches.push({ start: tableStart, end: tableEnd + '</table>'.length, headerPos: m.index });
  }

  // 1c. Trova link a classifica.aspx?CId=... con posizione
  const clsRegex = /classifica\.aspx\?CId=(\d+)/gi;
  const clsLinks = [];
  while ((m = clsRegex.exec(html))) {
    clsLinks.push({ pos: m.index, cid: m[1] });
  }

  // ===== STEP 2: Per ogni tabella, trova l'ultimo titolo precedente =====
  for (const t of tableMatches) {
    const titoloPrec = markers
      .filter(mk => mk.type === 'titolo' && mk.pos < t.headerPos)
      .sort((a, b) => b.pos - a.pos)[0];
    const titolo = titoloPrec ? titoloPrec.value : 'Campionato';

    // Link classifica più vicino (entro 300 char prima del titolo, o dopo)
    const refPos = titoloPrec ? titoloPrec.pos : t.start;
    const cls = clsLinks
      .filter(c => Math.abs(c.pos - refPos) < 1500)
      .sort((a, b) => Math.abs(a.pos - refPos) - Math.abs(b.pos - refPos))[0];
    if (cls && titolo) classificheCId[titolo] = cls.cid;

    // Estrai HTML della tabella e parsala con cheerio
    const tableHtml = html.slice(t.start, t.end);
    const $t = cheerio.load(tableHtml);

    $t('tr').each((idx, tr) => {
      if (idx === 0) return; // header
      const tds = $t(tr).find('td').map((__, td) => clean($t(td).text())).get();
      if (tds.length < 6) return;

      const dataOra = tds[2] || '';
      const casa    = tds[3] || '';
      const ospite  = tds[4] || '';
      const risult  = tds[5] || '';

      const iso = parseDataIso(dataOra);
      const ora = estraiOra(dataOra);

      const isCasa = isNostraSocieta(casa);
      const isOsp  = isNostraSocieta(ospite);
      if (!isCasa && !isOsp) return;

      const categoria = titolo;
      const sm = risult.match(/(\d)\s*[-/]\s*(\d)/);
      if (sm) {
        const home = parseInt(sm[1]), away = parseInt(sm[2]);
        risultati.push({
          data: iso, ora,
          squadraNostra: abbreviaCategoria(categoria),
          avversario: isCasa ? ospite : casa,
          siglaAvv: siglaDaNome(isCasa ? ospite : casa),
          setNoi: isCasa ? home : away,
          setLoro: isCasa ? away : home,
          casa: isCasa,
          luogo: isCasa ? 'Palamilone' : 'in trasferta'
        });
      } else {
        calendario.push({
          data: iso, ora,
          squadraCasa:      isCasa ? "Volley '96" : casa,
          squadraTrasferta: isOsp  ? "Volley '96" : ospite,
          categoria,
          casa: isCasa
        });
      }
    });
  }

  return { risultati, calendario, classificheCId };
}

function parseClassifica(html, titolo) {
  const $ = cheerio.load(html);
  let squadre = [];

  $('table').each((_, table) => {
    const $t = $(table);
    const headerText = $t.find('tr').first().text().toLowerCase();
    if (!headerText.includes('squadra')) return;
    if (!headerText.includes('punt') && !/\bpt\b/.test(headerText)) return;

    const found = [];
    $t.find('tr').each((idx, tr) => {
      if (idx === 0) return;
      const cells = $(tr).find('td').map((__, td) => clean($(td).text())).get();
      if (cells.length < 6) return;

      const nome = cells.find(c => /[A-Za-z]{3,}/.test(c)) || '';
      if (!nome) return;
      const nums = cells.map(c => parseInt(c.replace(',', '.'))).filter(n => !isNaN(n));

      found.push({
        pos: nums[0] ?? found.length + 1,
        nome,
        g:  nums[1] ?? 0,
        v:  nums[2] ?? 0,
        p:  nums[3] ?? 0,
        sf: nums[4] ?? 0,
        ss: nums[5] ?? 0,
        pt: nums[nums.length - 1] ?? 0,
        forma: '',
        noi: isNostraSocieta(nome)
      });
    });
    if (found.length > 0) { squadre = found; return false; }
  });

  return {
    id: titolo.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
    label: abbreviaCategoria(titolo),
    titolo,
    squadre
  };
}

// ============ MERGE ============

function mergeData(D, nuovi) {
  let nuoviRis = 0, nuoviCal = 0;

  // Risultati: merge per (data + avversario)
  const keyR = r => `${r.data}|${(r.avversario || '').toLowerCase().trim()}`;
  const esistentiR = new Set(D.risultati.map(keyR));
  for (const r of nuovi.risultati) {
    if (!esistentiR.has(keyR(r))) { D.risultati.unshift(r); nuoviRis++; }
  }
  D.risultati.sort((a, b) => (b.data || '').localeCompare(a.data || ''));

  // Calendario: rimuovi passate, aggiungi future nuove
  const oggi = new Date().toISOString().slice(0, 10);
  D.calendario = D.calendario.filter(c => (c.data || '') >= oggi);
  const keyC = c => `${c.data}|${c.squadraCasa}|${c.squadraTrasferta}`;
  const esistentiC = new Set(D.calendario.map(keyC));
  for (const c of nuovi.calendario) {
    if ((c.data || '') < oggi) continue;
    if (!esistentiC.has(keyC(c))) { D.calendario.push(c); nuoviCal++; }
  }
  D.calendario.sort((a, b) => (a.data || '').localeCompare(b.data || ''));

  // Classifiche: aggiorna in-place per titolo
  const byTitolo = new Map(D.classifiche.map(c => [c.titolo, c]));
  const nuoveClass = [];
  for (const nc of nuovi.classifiche) {
    const old = byTitolo.get(nc.titolo);
    if (old) { Object.assign(old, nc); nuoveClass.push(old); byTitolo.delete(nc.titolo); }
    else nuoveClass.push(nc);
  }
  byTitolo.forEach(c => nuoveClass.push(c));
  D.classifiche = nuoveClass;

  D.fipavMeta = D.fipavMeta || {};
  D.fipavMeta.ultimoAggiornamento = new Date().toISOString();
  D.fipavMeta.fonte = FIPAV_BASE_URL;

  return { nuoviRis, nuoviCal, classifiche: nuovi.classifiche.length };
}

// ============ MAIN ============

async function main() {
  console.log(`🏐 Aggiornamento FIPAV`);
  console.log(`   Pattern cercati: ${PATTERNS_SOCIETA.join(' | ')}`);

  // Trova la stagione corrente
  const stagione = await trovaStagioneCorrente();
  if (!stagione) throw new Error('Impossibile trovare la stagione FIPAV');
  console.log(`   Stagione: ${stagione.nome} (StId=${stagione.id})`);

  // Costruisci URL con filtro società → ottieni TUTTI i match della stagione in una richiesta
  const FIPAV_URL = `${FIPAV_BASE_URL}&StId=${stagione.id}&SId=${SOCIETA_SID}`;
  console.log(`   Fonte: ${FIPAV_URL}`);

  const html = await fetchHTML(FIPAV_URL);
  const parsed = parsePagina(html);

  console.log(`   Trovati ${parsed.risultati.length} risultati, ${parsed.calendario.length} partite in calendario`);
  console.log(`   Classifiche da scaricare: ${Object.keys(parsed.classificheCId).length}`);

  const classifiche = [];
  for (const [titolo, cid] of Object.entries(parsed.classificheCId)) {
    try {
      const url = `https://sicilia.portalefipav.net/classifica.aspx?CId=${cid}`;
      const clHtml = await fetchHTML(url);
      const cl = parseClassifica(clHtml, titolo);
      if (cl.squadre.length > 0) {
        classifiche.push(cl);
        console.log(`   ✓ Classifica "${titolo}" → ${cl.squadre.length} squadre`);
      }
    } catch (e) {
      console.warn(`   ⚠ Errore classifica "${titolo}": ${e.message}`);
    }
  }

  const D = leggiData();
  const stats = mergeData(D, { ...parsed, classifiche });
  scriviData(D);

  console.log('\n📝 Riepilogo:');
  console.log(`   • ${stats.nuoviRis} nuovo/i risultato/i`);
  console.log(`   • ${stats.nuoviCal} nuova/e partita/e in calendario`);
  console.log(`   • ${stats.classifiche} classifica/he aggiornata/e`);
  console.log('\n✅ data.js aggiornato.');
}

main().catch(e => {
  console.error('❌ Errore:', e);
  process.exit(1);
});
