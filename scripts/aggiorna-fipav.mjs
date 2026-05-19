// =========================================================
// ASD Volley '96 — Scraper FIPAV Sicilia
// =========================================================
// Questo script gira su GitHub Actions (vedi .github/workflows/aggiorna-fipav.yml)
// e si occupa di:
//   1. Leggere il data.js attuale del sito
//   2. Andare sul portale FIPAV Sicilia
//   3. Trovare i match in cui compare "VOLLEY 96"
//   4. Scaricare anche le classifiche dei campionati trovati
//   5. Fondere i nuovi dati con quelli esistenti (mantiene lo storico)
//   6. Riscrivere data.js
//
// Configurazione: vedi le costanti qui sotto.
// =========================================================

import { readFileSync, writeFileSync } from 'node:fs';
import * as cheerio from 'cheerio';

// ============ CONFIGURAZIONE ============

const FIPAV_URL    = 'https://sicilia.portalefipav.net/risultati-classifiche.aspx?PId=7306';
const NOME_SOCIETA = 'VOLLEY 96';   // case-insensitive
const DATA_FILE    = 'data.js';

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
  // data.js è JSON-like ma con eventuali commenti — proviamo a fare un eval sicuro
  // Usiamo Function per parsare un object literal JS, non JSON puro
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
  const classificheCId = {};   // titoloCampionato -> CId

  $('table').each((_, table) => {
    const $t = $(table);
    // header riconoscibile?
    const headerText = $t.find('tr').first().text().toLowerCase();
    if (!/squadra casa/.test(headerText) || !/ospit/.test(headerText)) return;

    // Trova il titolo del campionato (testo nei nodi precedenti)
    let titolo = '';
    let prev = $t[0].previousSibling;
    while (prev && !titolo) {
      const txt = $(prev).text ? clean($(prev).text()) : '';
      if (txt && txt.length > 5 && txt.length < 200) titolo = txt;
      prev = prev.previousSibling;
    }

    // Cerca link "classifica" associato a questa tabella
    let scan = $t.prevAll().slice(0, 5);
    scan.find('a[href*="classifica.aspx"]').each((__, a) => {
      const href = $(a).attr('href') || '';
      const m = href.match(/CId=(\d+)/);
      if (m && titolo) classificheCId[titolo] = m[1];
    });

    // Itera righe (skip header)
    $t.find('tr').each((idx, tr) => {
      if (idx === 0) return;
      const tds = $(tr).find('td').map((__, td) => clean($(td).text())).get();
      if (tds.length < 6) return;

      const dataOra = tds[2] || '';
      const casa    = tds[3] || '';
      const ospite  = tds[4] || '';
      const risult  = tds[5] || '';

      const iso = parseDataIso(dataOra);
      const ora = estraiOra(dataOra);

      const isCasa = casa.toUpperCase().includes(NOME_SOCIETA);
      const isOsp  = ospite.toUpperCase().includes(NOME_SOCIETA);
      if (!isCasa && !isOsp) return;

      const categoria = titolo || 'Campionato';
      const sm = risult.match(/(\d)\s*[-/]\s*(\d)/);
      if (sm) {
        const home = parseInt(sm[1]), away = parseInt(sm[2]);
        risultati.push({
          data: iso,
          ora,
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
          data: iso,
          ora,
          squadraCasa:      isCasa ? "Volley '96" : casa,
          squadraTrasferta: isOsp  ? "Volley '96" : ospite,
          categoria,
          casa: isCasa
        });
      }
    });
  });

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
        noi: nome.toUpperCase().includes(NOME_SOCIETA)
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
    if (!esistentiR.has(keyR(r))) { D.risultati.push(r); nuoviRis++; }
  }
  D.risultati.sort((a, b) => (b.data || '').localeCompare(a.data || ''));

  // Calendario: rimuovi partite passate, aggiungi nuove future
  const oggi = new Date().toISOString().slice(0, 10);
  D.calendario = D.calendario.filter(c => (c.data || '') >= oggi);
  const keyC = c => `${c.data}|${c.squadraCasa}|${c.squadraTrasferta}`;
  const esistentiC = new Set(D.calendario.map(keyC));
  for (const c of nuovi.calendario) {
    if ((c.data || '') < oggi) continue;
    if (!esistentiC.has(keyC(c))) { D.calendario.push(c); nuoviCal++; }
  }
  D.calendario.sort((a, b) => (a.data || '').localeCompare(b.data || ''));

  // Classifiche: aggiorna in-place per titolo, aggiungi nuove
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
  D.fipavMeta.fonte = FIPAV_URL;

  return { nuoviRis, nuoviCal, classifiche: nuovi.classifiche.length };
}

// ============ MAIN ============

async function main() {
  console.log(`🏐 Aggiornamento FIPAV per "${NOME_SOCIETA}"`);
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
