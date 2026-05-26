/* =========================================================
   ASD Volley '96 — RENDERING CONDIVISO
   =========================================================
   Carica i dati da window.SITE_DATA e popola le sezioni
   presenti nella pagina corrente. Ogni funzione di render
   verifica se gli elementi target esistono prima di lavorare,
   quindi lo stesso JS funziona su tutte le 5 pagine.
   ========================================================= */

(() => {
  const D = window.SITE_DATA;
  if (!D) { console.error("data.js non caricato"); return; }

  /* ---------- UTILS ---------- */
  const $  = (s, p=document) => p.querySelector(s);
  const $$ = (s, p=document) => Array.from(p.querySelectorAll(s));
  window.$site = { $, $$ };

  const escapeHtml = s => String(s ?? '').replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  window.escapeHtml = escapeHtml;

  // Risolve un percorso immagine: relativo al sito (FAST), Drive (SLOW) o vuoto.
  const resolveImg = (url) => {
    if (!url) return "";
    if (/^(https?:)?\/\//i.test(url)) {
      // URL assoluto: se è Drive, converti
      const m = url.match(/drive\.google\.com.*\/d\/([a-zA-Z0-9_-]+)/) || url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      if (m) return `https://lh3.googleusercontent.com/d/${m[1]}=w1200`;
      return url;
    }
    // percorso relativo
    return url;
  };
  window.resolveImg = resolveImg;

  // Crea un box-immagine lazy-loaded
  function imgBox({src, alt='', eager=false, ratio='', extra=''}) {
    const resolved = resolveImg(src);
    return `<div class="img-box ${extra}" ${ratio?`style="aspect-ratio:${ratio};"`:''}>${resolved ? `<img src="${resolved}" alt="${escapeHtml(alt)}" loading="${eager?'eager':'lazy'}" decoding="async" onload="this.classList.add('loaded')">` : ''}</div>`;
  }
  window.imgBox = imgBox;

  // Date IT
  const MESI   = ["GEN","FEB","MAR","APR","MAG","GIU","LUG","AGO","SET","OTT","NOV","DIC"];
  const GIORNI = ["DOM","LUN","MAR","MER","GIO","VEN","SAB"];
  const fmtData = iso => {
    if (!iso) return { giorno:"--", mese:"--", giornoSett:"--", anno:"--" };
    const d = new Date(iso);
    if (isNaN(d.getTime())) return { giorno:"--", mese:"--", giornoSett:"--", anno:"--" };
    return {
      giorno: String(d.getDate()).padStart(2,'0'),
      mese: MESI[d.getMonth()],
      giornoSett: GIORNI[d.getDay()],
      anno: d.getFullYear()
    };
  };

  const splitItalic = (nome, italic) => {
    if (italic) return { base: nome, it: italic };
    const parts = nome.trim().split(/\s+/);
    if (parts.length === 1) return { base: parts[0], it: "" };
    return { base: parts.slice(0,-1).join(" "), it: parts.slice(-1)[0] };
  };

  /* ============================================================
     META: brand name, stagione, footer
     ============================================================ */
  function renderMeta() {
    const C = D.config;
    document.title = document.title.replace(/ASD Volley '96/i, C.nomeSocieta);
    $$('[data-bind="brandName"]').forEach(e => e.textContent = C.nomeSocieta);
    $$('[data-bind="brandLine"]').forEach(e => e.textContent = `${C.citta} · dal ${C.annoFondazione}`);
    $$('[data-bind="stagione"]').forEach(e => e.textContent = `Stagione ${C.stagione.replace(/\s/g,'')}`);

    // Footer
    const fa = $('#foot-addr'); if (fa) fa.innerHTML = `
      <strong>${escapeHtml(C.sede.nome)}</strong>
      ${escapeHtml(C.sede.indirizzo)}<br>
      ${escapeHtml(C.sede.cap)} ${escapeHtml(C.sede.citta)}<br>
      ${escapeHtml(C.sede.regione)}
    `;
    const fc = $('#foot-contacts'); if (fc) fc.innerHTML = `
      <li><a href="tel:${C.contatti.telefono.replace(/\s/g,'')}">${escapeHtml(C.contatti.telefono)}</a></li>
      ${C.contatti.emails.map(e => `<li><a href="mailto:${e.value}">${escapeHtml(e.value)}</a></li>`).join('')}
    `;
    const fs = $('#foot-socials'); if (fs) fs.innerHTML = `
      <a href="${C.social.instagram}" target="_blank" rel="noopener">Instagram</a>
      <a href="${C.social.facebook}" target="_blank" rel="noopener">Facebook</a>
      <a href="${C.social.youtube}" target="_blank" rel="noopener">YouTube</a>
      <a href="${C.social.tiktok}" target="_blank" rel="noopener">TikTok</a>
    `;
    const fp = $('#foot-piva'); if (fp) fp.textContent = `© ${C.annoFondazione}—${new Date().getFullYear()} ${C.nomeSocieta} · P.IVA ${C.piva}`;
  }

  /* ============================================================
     HERO (home)
     ============================================================ */
  function renderHero() {
    const meta = $('#hero-meta');
    const title = $('#hero-title');
    const stats = $('#hero-stats');
    const C = D.config;
    if (meta) {
      meta.innerHTML = `
        <div class="row"><span>Lat 38.22°N · Lon 15.24°E</span><span>${escapeHtml(C.citta)}, Sicilia</span></div>
        <div class="row"><span>Stagione corrente</span><span>${escapeHtml(C.stagione)}</span></div>
      `;
    }
    if (title) {
      title.innerHTML = `
        <h1>
          <span class="line1">ASD</span>
          <span class="line2">VOLLEY <span class="it">'96</span></span>
          <span class="line1">${escapeHtml(C.citta).toUpperCase()}</span>
        </h1>
      `;
    }
    if (stats) {
      stats.innerHTML = D.stats.map(st => `
        <div class="stat">
          <span class="n">${escapeHtml(st.numero)}${st.piccolo?`<span class="small">${escapeHtml(st.piccolo)}</span>`:''}</span>
          <span class="l">${escapeHtml(st.label)}</span>
        </div>
      `).join('');
    }
  }

  /* ============================================================
     NEWS
     ============================================================ */
  function renderNews(limit) {
    const c = $('#news-grid'); if (!c) return;
    const items = D.news.slice(0, limit || D.news.length);
    c.innerHTML = items.map((n, idx) => {
      const d = fmtData(n.data);
      const eager = idx < 3; // prime 3 caricate subito
      return `
        <article class="news-card">
          ${imgBox({ src: n.foto, alt: n.titolo, eager, ratio:'16/10', extra:'news-img' })}
          <div class="news-body">
            <div class="news-meta"><span>${escapeHtml(n.categoria)}</span><span>${d.giorno} ${d.mese} ${d.anno}</span></div>
            <h3>${escapeHtml(n.titolo)}</h3>
            <p>${escapeHtml(n.estratto)}</p>
            <a class="news-link" href="#">Leggi <span class="arr">→</span></a>
          </div>
        </article>
      `;
    }).join('');
  }

  /* ============================================================
     SQUADRE
     ============================================================ */
  function renderSquadre() {
    const g = $('#teams-grid'); if (!g) return;
    g.innerHTML = D.squadre.map(sq => {
      const sit = splitItalic(sq.nome + (sq.suffisso ? ` ${sq.suffisso}` : ''), sq.nomeCorsivo);
      const genereLabel = ({ f: 'Femminile', m: 'Maschile', mista: 'Mista', minivolley: 'Minivolley' })[sq.genere] || '';
      const genereClass = sq.genere === 'f' ? 'f' : '';
      const badgeStyle = sq.genere==='minivolley'?'background:var(--warn);color:#0c0b09;':sq.genere==='mista'?'background:#3a3631;color:var(--fg);':'';
      return `
        <article class="team ${sq.dimensione || 'sm'}">
          <span class="num">${escapeHtml(sq.numero || '')}</span>
          <div style="position:relative;">
            ${imgBox({ src: sq.foto, alt: sq.nome, ratio:'4/3', extra:'img' })}
            ${genereLabel ? `<span class="badge-cat ${genereClass}" style="${badgeStyle}">${escapeHtml(genereLabel)}</span>` : ''}
            <span class="cat-label">${escapeHtml(sq.luogo || '')}</span>
          </div>
          <h3>${escapeHtml(sit.base)} ${sit.it ? `<span class="it">${escapeHtml(sit.it)}</span>` : ''}</h3>
          <div class="sub">${escapeHtml(sq.categoria || '')}</div>
          ${(sq.numAtleti || sq.coach) ? `
            <div class="roster">
              <div class="athletes">${Array.from({length: Math.min(5, sq.numAtleti||3)}).map(()=>'<div></div>').join('')}</div>
              <span>${sq.numAtleti ? `${sq.numAtleti} atlet${sq.genere==='f'?'e':'i'}` : ''}${sq.numAtleti && sq.coach ? ' · ' : ''}${sq.coach ? `Coach ${escapeHtml(sq.coach)}` : ''}</span>
            </div>` : ''}
        </article>
      `;
    }).join('');
  }

  /* ============================================================
     ROSTER (ATLETI & STAFF)
     ============================================================ */
  let rosterFilter = 'tutti';
  function renderRoster() {
    const grid    = $('#roster-grid');
    const filters = $('#roster-filters');
    if (!grid) return;

    const all = D.roster || [];
    const counts = {
      tutti:     all.length,
      femminile: all.filter(p => p.categoria === 'femminile').length,
      maschile:  all.filter(p => p.categoria === 'maschile').length,
      staff:     all.filter(p => p.categoria === 'staff').length
    };

    if (filters) {
      filters.innerHTML = ['tutti','femminile','maschile','staff'].map(k => `
        <button class="roster-filter ${rosterFilter===k?'active':''}" data-k="${k}">
          ${k.charAt(0).toUpperCase()+k.slice(1)} <span class="count">${counts[k]}</span>
        </button>
      `).join('');
      filters.querySelectorAll('button').forEach(b => b.onclick = () => {
        rosterFilter = b.dataset.k;
        renderRoster();
      });
    }

    const list = rosterFilter === 'tutti' ? all : all.filter(p => p.categoria === rosterFilter);

    grid.innerHTML = list.length === 0
      ? `<div class="roster-empty">Nessun atleta in questa categoria. Aggiungi dall'admin.</div>`
      : list.map((p, idx) => {
        const resolved = resolveImg(p.foto);
        const initials = ((p.nome || '?')[0] + (p.cognome || '?')[0]).toUpperCase();
        const isStaff = p.categoria === 'staff';
        return `
          <article class="player-card ${p.categoria || ''}">
            <div class="player-img">
              ${resolved ? `<img src="${resolved}" alt="${escapeHtml(p.nome + ' ' + p.cognome)}" loading="${idx<8?'eager':'lazy'}" decoding="async" onload="this.classList.add('loaded')" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;">` : `<span class="player-initials">${escapeHtml(initials)}</span>`}
              ${!isStaff && p.numero ? `<span class="player-num">${p.numero}</span>` : ''}
              <span class="player-cat">${isStaff ? 'Staff' : (p.categoria === 'femminile' ? 'F' : 'M')}</span>
            </div>
            <div class="player-body">
              <h4>${escapeHtml(p.nome || '')} <span class="player-cognome">${escapeHtml(p.cognome || '')}</span></h4>
              <div class="player-meta">
                <span>${escapeHtml(p.ruolo || '')}</span>
                ${p.squadra ? `<span>· ${escapeHtml(p.squadra)}</span>` : ''}
              </div>
            </div>
          </article>
        `;
      }).join('');
  }

  /* ============================================================
     RISULTATI
     ============================================================ */
  function renderRisultati(limit) {
    const c = $('#risultati-list'); if (!c) return;
    const items = D.risultati.slice(0, limit || 6);
    c.innerHTML = items.map(r => {
      const d = fmtData(r.data);
      const vinto = r.setNoi > r.setLoro;
      return `
        <div class="result">
          <div class="date"><span class="d">${d.giornoSett} ${d.giorno}</span>${d.mese} · ${escapeHtml(r.ora || '')}</div>
          <div class="team-a">
            <div class="crest us">96</div>
            <div class="team-name us">Volley '96<span class="league">${escapeHtml(r.squadraNostra || '')}</span></div>
          </div>
          <div class="score ${vinto?'win':'loss'}"><span class="home">${r.setNoi}</span><span class="sep">—</span><span class="away">${r.setLoro}</span></div>
          <div class="team-b">
            <div class="crest">${escapeHtml((r.siglaAvv || '??').slice(0,2))}</div>
            <div class="team-name">${escapeHtml(r.avversario || '')}<span class="league">${escapeHtml(r.luogo || '')}</span></div>
          </div>
          <span class="badge-r ${vinto?'w':'l'}">${vinto ? 'Vittoria' : 'Sconfitta'}</span>
        </div>
      `;
    }).join('');
  }

  /* ============================================================
     CALENDARIO
     ============================================================ */
  function renderCalendario(limit) {
    const c = $('#cal-list'); if (!c) return;
    const items = D.calendario.slice(0, limit || 6);
    c.innerHTML = items.map(m => {
      const d = fmtData(m.data);
      return `
        <div class="cal-item">
          <div class="when">
            <div class="day">${d.giorno}</div>
            <div class="month">${d.mese}</div>
            <span class="time">${escapeHtml(m.ora || '')}</span>
          </div>
          <div class="match">
            <span class="vs">${escapeHtml(m.squadraCasa)} <span class="accent">vs</span> ${escapeHtml(m.squadraTrasferta)}</span>
            <span class="where">${escapeHtml(m.categoria || '')}</span>
          </div>
          <span class="where-chip ${m.casa ? 'home' : ''}">${m.casa ? 'Casa' : 'Trasferta'}</span>
        </div>
      `;
    }).join('');
  }

  /* ============================================================
     CLASSIFICA
     ============================================================ */
  let currentStanding = 0;
  function renderClassifica() {
    const sw = $('#standings-switcher');
    const tt = $('#standings-title');
    const tb = $('#standings-body');
    if (!tb) return;

    if (sw) {
      sw.innerHTML = D.classifiche.map((c,i) => `<button class="${i===currentStanding?'active':''}" data-idx="${i}">${escapeHtml(c.label)}</button>`).join('');
      sw.querySelectorAll('button').forEach(b => b.onclick = () => { currentStanding = +b.dataset.idx; renderClassifica(); });
    }
    const c = D.classifiche[currentStanding];
    if (!c) return;
    if (tt) tt.textContent = c.titolo;
    tb.innerHTML = c.squadre.map(s => `
      <tr class="${s.noi?'us':''}">
        <td>${s.pos}</td><td>${escapeHtml(s.nome)}</td>
        <td>${s.g}</td><td>${s.v}</td><td>${s.p}</td><td>${s.sf}</td><td>${s.ss}</td>
        <td>${renderForma(s.forma)}</td>
        <td class="pts">${s.pt}</td>
      </tr>
    `).join('');
  }
  function renderForma(f) {
    if (!f) return '';
    const map = { V:'w', P:'l', N:'d' };
    return `<span class="form">${[...f].map(c => `<span class="${map[c]||''}">${c}</span>`).join('')}</span>`;
  }

  /* ============================================================
     VALORI
     ============================================================ */
  function renderValori() {
    const c = $('#values'); if (!c) return;
    c.innerHTML = D.valori.map(v => {
      const it = v.corsivo ? `<span style="font-family:var(--serif);font-style:italic;color:var(--accent);text-transform:lowercase;"> ${escapeHtml(v.corsivo)}</span>` : '';
      const titleBase = v.corsivo ? v.titolo.replace(v.corsivo, '').trim() : v.titolo;
      return `
        <div class="value">
          <div class="n">${escapeHtml(v.numero)} / Valore</div>
          <div class="t">${escapeHtml(titleBase)}${it}</div>
          <div class="d">${escapeHtml(v.descrizione)}</div>
        </div>
      `;
    }).join('');
  }

  /* ============================================================
     SPONSOR
     ============================================================ */
  function renderSponsor() {
    const c = $('#sponsor-grid'); if (!c) return;
    c.innerHTML = D.sponsor.map(s => {
      const logo = resolveImg(s.logo);
      const inner = logo
        ? `<img src="${logo}" alt="${escapeHtml(s.nome)}" loading="lazy" decoding="async" style="max-width:65%;max-height:60%;filter:brightness(0) invert(0.92);">`
        : `<span class="name">${escapeHtml(s.nome)}${s.italic?` <span style="font-family:var(--serif);font-style:italic;color:var(--accent);">${escapeHtml(s.italic)}</span>`:''}<span class="small">${escapeHtml(s.sottotitolo || '')}</span></span>`;
      return `
        <a class="sponsor" ${s.link?`href="${escapeHtml(s.link)}" target="_blank" rel="noopener"`:''}>
          <span class="tier">${escapeHtml(s.tier || '')}</span>
          ${inner}
        </a>
      `;
    }).join('');
  }

  /* ============================================================
     CONTATTI
     ============================================================ */
  function renderContatti() {
    const c = $('#contact-info'); if (!c) return;
    const C = D.config;
    c.innerHTML = `
      <div class="row"><span class="l">Sede</span><span class="v">${escapeHtml(C.sede.nome)} · ${escapeHtml(C.sede.indirizzo)}, ${escapeHtml(C.sede.cap)} ${escapeHtml(C.sede.citta)}</span></div>
      <div class="row"><span class="l">Telefono</span><span class="v"><a href="tel:${C.contatti.telefono.replace(/\s/g,'')}">${escapeHtml(C.contatti.telefono)}</a></span></div>
      ${C.contatti.emails.map(e => `<div class="row"><span class="l">${escapeHtml(e.label)}</span><span class="v"><a href="mailto:${e.value}">${escapeHtml(e.value)}</a></span></div>`).join('')}
      <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(C.sede.nome + ', ' + C.sede.indirizzo + ', ' + C.sede.citta)}" target="_blank" rel="noopener" class="btn btn-ghost map-link">Apri su Mappe <span class="arr">→</span></a>
    `;
    const social = $('#contact-social');
    if (social) {
      social.innerHTML = `
        <div class="row"><span class="l">Instagram</span><span class="v"><a href="${C.social.instagram}" target="_blank" rel="noopener">@asdvolley96</a></span></div>
        <div class="row"><span class="l">Facebook</span><span class="v"><a href="${C.social.facebook}" target="_blank" rel="noopener">ASD Volley '96</a></span></div>
      `;
    }
  }

  /* ============================================================
     RENDER ALL
     ============================================================ */
  function renderAll() {
    renderMeta();
    renderHero();
    renderNews();
    renderSquadre();
    renderRoster();
    renderRisultati();
    renderCalendario();
    renderClassifica();
    renderValori();
    renderSponsor();
    renderContatti();
    initReveal();
  }

  window.renderAll = renderAll;

  /* ============================================================
     ANIMATIONS
     ============================================================ */
  function initReveal() {
    const io = new IntersectionObserver((entries)=>{
      entries.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target);} });
    },{threshold:0.10});
    $$('.reveal').forEach(el=>{ el.classList.remove('in'); io.observe(el); });
  }

  /* ============================================================
     NAV
     ============================================================ */
  // Evidenzia link attivo
  const current = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  $$('.nav-links a').forEach(a => {
    const href = (a.getAttribute('href') || '').toLowerCase();
    if (href === current || (current === '' && href === 'index.html')) a.classList.add('active');
  });

  // Burger menu mobile
  const burger = $('#burger');
  const links  = $('.nav-links');
  if (burger && links) {
    burger.onclick = (e) => { e.stopPropagation(); links.classList.toggle('open'); };
    document.addEventListener('click', e => {
      if (!links.contains(e.target) && !burger.contains(e.target)) links.classList.remove('open');
    });
    links.querySelectorAll('a').forEach(a => a.onclick = () => links.classList.remove('open'));
  }

  /* ============================================================
     INIT
     ============================================================ */
  document.addEventListener('DOMContentLoaded', () => {
    renderAll();
    if (sessionStorage.getItem('admin_ok') === '1') document.body.classList.add('admin-ok');
    if (location.hash === '#admin' && window.openAdmin) window.openAdmin();
    window.addEventListener('hashchange', () => {
      if (location.hash === '#admin' && window.openAdmin) window.openAdmin();
    });
  });
})();
