/* =========================================================
   ASD Volley '96 — RENDERING + ADMIN
   =========================================================
   Carica i dati da window.SITE_DATA (file data.js) e renderizza
   il sito. Inoltre gestisce la modalità admin (#admin in URL).
   ========================================================= */

(() => {
  const D = window.SITE_DATA;
  if (!D) { console.error("data.js non caricato"); return; }

  /* ---------- UTILS ---------- */
  const $  = (s, p=document) => p.querySelector(s);
  const $$ = (s, p=document) => Array.from(p.querySelectorAll(s));
  const h  = (tag, attrs={}, ...kids) => {
    const e = document.createElement(tag);
    for (const k in attrs) {
      if (k === 'class') e.className = attrs[k];
      else if (k === 'html') e.innerHTML = attrs[k];
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] != null) e.setAttribute(k, attrs[k]);
    }
    kids.flat().forEach(k => {
      if (k == null || k === false) return;
      e.appendChild(k.nodeType ? k : document.createTextNode(k));
    });
    return e;
  };
  const escapeHtml = s => String(s).replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

  // Converte link Google Drive in URL immagine diretto
  // https://drive.google.com/file/d/FILE_ID/view  →  https://lh3.googleusercontent.com/d/FILE_ID
  const driveImg = url => {
    if (!url) return "";
    const m = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (m) return `https://lh3.googleusercontent.com/d/${m[1]}=w1200`;
    return url;
  };

  // Data IT
  const MESI = ["GEN","FEB","MAR","APR","MAG","GIU","LUG","AGO","SET","OTT","NOV","DIC"];
  const GIORNI = ["DOM","LUN","MAR","MER","GIO","VEN","SAB"];
  const fmtData = iso => {
    if (!iso) return { giorno:"--", mese:"--", giornoSett:"--", anno:"--" };
    const d = new Date(iso);
    return {
      giorno: String(d.getDate()).padStart(2,'0'),
      mese: MESI[d.getMonth()],
      giornoSett: GIORNI[d.getDay()],
      anno: d.getFullYear()
    };
  };

  // Pittogramma "italic" per i nomi: separa "ultima parola" come italic
  const splitItalic = (nome, italic) => {
    if (italic) return { base: nome, it: italic };
    const parts = nome.trim().split(/\s+/);
    if (parts.length === 1) return { base: parts[0], it: "" };
    return { base: parts.slice(0,-1).join(" "), it: parts.slice(-1)[0] };
  };

  /* ============================================================
     RENDERING
     ============================================================ */

  /* ---------- CONFIG / META NEL DOM ---------- */
  function renderMeta() {
    const C = D.config;
    document.title = `${C.nomeSocieta} — ${C.citta}`;
    $$('[data-bind="nomeSocieta"]').forEach(e => e.textContent = C.nomeSocieta);
    $$('[data-bind="stagione"]').forEach(e => e.textContent = `Stagione ${C.stagione.replace(/\s/g,'').replace('/','/')}`);

    // Hero meta blocks
    const m = $('#hero-meta');
    if (m) {
      const anni = new Date().getFullYear() - C.annoFondazione;
      m.innerHTML = `
        <div class="row"><span>Lat 38.22°N · Lon 15.24°E</span><span>${escapeHtml(C.citta)}, Sicilia</span></div>
        <div class="row"><span>Fondata</span><span>${C.annoFondazione} — ${anni} anni</span></div>
        <div class="row"><span>Stagione corrente</span><span>${escapeHtml(C.stagione)}</span></div>
      `;
    }
    // Stats
    const s = $('#hero-stats');
    if (s) s.innerHTML = D.stats.map(st => `
      <div class="stat">
        <span class="n">${escapeHtml(st.numero)}${st.piccolo?`<span class="small">${escapeHtml(st.piccolo)}</span>`:''}</span>
        <span class="l">${escapeHtml(st.label)}</span>
      </div>
    `).join('');

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
      <a href="${C.social.instagram}">Instagram</a>
      <a href="${C.social.facebook}">Facebook</a>
      <a href="${C.social.youtube}">YouTube</a>
      <a href="${C.social.tiktok}">TikTok</a>
    `;
    const fp = $('#foot-piva'); if (fp) fp.textContent = `© ${C.annoFondazione}—${new Date().getFullYear()} ${C.nomeSocieta} · P.IVA ${C.piva}`;

    // Brand name in nav and footer
    $$('[data-bind="brandName"]').forEach(e => e.textContent = C.nomeSocieta);
    $$('[data-bind="brandLine"]').forEach(e => e.textContent = `${C.citta} · dal ${C.annoFondazione}`);
  }

  /* ---------- HERO TITLE ---------- */
  function renderHeroTitle() {
    const t = $('#hero-title');
    if (!t) return;
    t.innerHTML = `
      <h1 class="h-display">
        <span class="line1">VOLLEY</span>
        <span class="line2"><span class="it">novantasei</span></span>
        <span class="line1">${escapeHtml(D.config.citta).toUpperCase()}</span>
      </h1>
    `;
  }

  /* ---------- SQUADRE ---------- */
  function renderSquadre() {
    const g = $('#teams-grid'); if (!g) return;
    g.innerHTML = '';
    D.squadre.forEach(sq => {
      const sit = splitItalic(sq.nome + (sq.suffisso ? ` ${sq.suffisso}` : ''), sq.nomeCorsivo);
      const genereLabel = ({ f: 'Femminile', m: 'Maschile', mista: 'Mista', minivolley: 'Minivolley' })[sq.genere] || '';
      const genereClass = sq.genere === 'f' ? 'f' : '';
      const fotoUrl = driveImg(sq.foto);
      const card = h('article', { class: `team ${sq.dimensione || 'sm'}` });
      card.innerHTML = `
        <span class="num">${escapeHtml(sq.numero || '')}</span>
        <div class="img" data-cat="${escapeHtml(sq.luogo || '')}" ${fotoUrl ? `style="background-image:url('${fotoUrl}');background-size:cover;background-position:center;"` : ''}>
          ${genereLabel ? `<span class="badge-cat ${genereClass}" ${sq.genere==='minivolley'?'style="background:var(--warn);color:#0c0b09;"':sq.genere==='mista'?'style="background:#3a3631;color:var(--fg);"':''}>${escapeHtml(genereLabel)}</span>` : ''}
        </div>
        <h3>${escapeHtml(sit.base)} ${sit.it ? `<span class="it">${escapeHtml(sit.it)}</span>` : ''}</h3>
        <div class="sub">${escapeHtml(sq.categoria || '')}</div>
        ${(sq.numAtleti || sq.coach) ? `
          <div class="roster">
            <div class="athletes">${Array.from({length: Math.min(5, sq.numAtleti||3)}).map(()=>'<div></div>').join('')}</div>
            <span>${sq.numAtleti ? `${sq.numAtleti} atlet${sq.genere==='f'?'e':'i'}` : ''}${sq.numAtleti && sq.coach ? ' · ' : ''}${sq.coach ? `Coach ${escapeHtml(sq.coach)}` : ''}</span>
          </div>` : ''}
      `;
      g.appendChild(card);
    });
  }

  /* ---------- RISULTATI ---------- */
  function renderRisultati() {
    const c = $('#risultati-list'); if (!c) return;
    c.innerHTML = '';
    D.risultati.slice(0, 6).forEach(r => {
      const d = fmtData(r.data);
      const vinto = r.setNoi > r.setLoro;
      const scoreClass = vinto ? 'win' : 'loss';
      c.innerHTML += `
        <div class="result">
          <div class="date"><span class="d">${d.giornoSett} ${d.giorno}</span>${d.mese} · ${escapeHtml(r.ora || '')}</div>
          <div class="team-a">
            <div class="crest us">96</div>
            <div class="team-name us">Volley '96<span class="league">${escapeHtml(r.squadraNostra || '')}</span></div>
          </div>
          <div class="score ${scoreClass}"><span class="home">${r.setNoi}</span><span class="sep">—</span><span class="away">${r.setLoro}</span></div>
          <div class="team-b">
            <div class="crest">${escapeHtml((r.siglaAvv || '??').slice(0,2))}</div>
            <div class="team-name">${escapeHtml(r.avversario || '')}<span class="league">${escapeHtml(r.luogo || '')}</span></div>
          </div>
          <span class="badge-r ${vinto ? 'w' : 'l'}">${vinto ? 'Vittoria' : 'Sconfitta'}</span>
        </div>
      `;
    });
  }

  /* ---------- CALENDARIO ---------- */
  function renderCalendario() {
    const c = $('#cal-list'); if (!c) return;
    c.innerHTML = '';
    D.calendario.slice(0, 6).forEach(m => {
      const d = fmtData(m.data);
      const isUs = (s) => /volley\s*'?96/i.test(s);
      const casa = m.squadraCasa || '', trasferta = m.squadraTrasferta || '';
      const usMatch = isUs(casa) ? 'casa' : isUs(trasferta) ? 'trasferta' : null;
      const labelCasa = usMatch === 'casa' ? 'Casa' : 'Trasferta';
      c.innerHTML += `
        <div class="cal-item">
          <div class="when">
            <div class="day">${d.giorno}</div>
            <div class="month">${d.mese}</div>
            <span class="time">${escapeHtml(m.ora || '')}</span>
          </div>
          <div class="match">
            <span class="vs">${escapeHtml(casa)} <span class="accent">vs</span> ${escapeHtml(trasferta)}</span>
            <span class="where">${escapeHtml(m.categoria || '')}</span>
          </div>
          <span class="where-chip ${m.casa ? 'home' : ''}">${labelCasa}</span>
        </div>
      `;
    });
  }

  /* ---------- CLASSIFICA ---------- */
  let currentStanding = 0;
  function renderClassifica() {
    const sw = $('#standings-switcher');
    if (sw) {
      sw.innerHTML = D.classifiche.map((c,i) => `
        <button class="${i===currentStanding?'active':''}" data-idx="${i}">${escapeHtml(c.label)}</button>
      `).join('');
      sw.querySelectorAll('button').forEach(b => {
        b.addEventListener('click', () => {
          currentStanding = parseInt(b.dataset.idx);
          renderClassifica();
        });
      });
    }
    const c = D.classifiche[currentStanding];
    if (!c) return;
    const t = $('#standings-title');
    if (t) t.textContent = c.titolo;
    const tb = $('#standings-body');
    if (tb) {
      tb.innerHTML = c.squadre.map(s => `
        <tr class="${s.noi?'us':''}">
          <td>${s.pos}</td>
          <td>${escapeHtml(s.nome)}</td>
          <td>${s.g}</td>
          <td>${s.v}</td>
          <td>${s.p}</td>
          <td>${s.sf}</td>
          <td>${s.ss}</td>
          <td>${renderForma(s.forma)}</td>
          <td class="pts">${s.pt}</td>
        </tr>
      `).join('');
    }
  }
  function renderForma(forma) {
    if (!forma) return '';
    const map = { V:'w', P:'l', N:'d' };
    return `<span class="form">${[...forma].map(c => `<span class="${map[c]||''}">${c}</span>`).join('')}</span>`;
  }

  /* ---------- NEWS ---------- */
  function renderNews() {
    const c = $('#news-grid'); if (!c) return;
    c.innerHTML = '';
    D.news.slice(0, 6).forEach(n => {
      const d = fmtData(n.data);
      const img = driveImg(n.foto);
      c.innerHTML += `
        <article class="news-card">
          <div class="news-img" ${img ? `style="background-image:url('${img}');background-size:cover;background-position:center;"` : ''}></div>
          <div class="news-body">
            <div class="news-meta"><span>${escapeHtml(n.categoria || '')}</span><span>${d.giorno} ${d.mese} ${d.anno}</span></div>
            <h3>${escapeHtml(n.titolo || '')}</h3>
            <p>${escapeHtml(n.estratto || '')}</p>
            <a class="news-link" href="#">Leggi <span class="arr">→</span></a>
          </div>
        </article>
      `;
    });
  }

  /* ---------- VALORI ---------- */
  function renderValori() {
    const c = $('#values'); if (!c) return;
    c.innerHTML = '';
    D.valori.forEach(v => {
      const it = v.corsivo ? `<span style="font-family:var(--serif);font-style:italic;color:var(--accent);text-transform:lowercase;"> ${escapeHtml(v.corsivo)}</span>` : '';
      const titleBase = v.corsivo ? v.titolo.replace(v.corsivo, '').trim() : v.titolo;
      c.innerHTML += `
        <div class="value">
          <div class="n">${escapeHtml(v.numero)} / Valore</div>
          <div class="t">${escapeHtml(titleBase)}${it}</div>
          <div class="d">${escapeHtml(v.descrizione)}</div>
        </div>
      `;
    });
  }

  /* ---------- SPONSOR ---------- */
  function renderSponsor() {
    const c = $('#sponsor-grid'); if (!c) return;
    c.innerHTML = '';
    D.sponsor.forEach(s => {
      const logo = driveImg(s.logo);
      const inner = logo
        ? `<img src="${logo}" alt="${escapeHtml(s.nome)}" style="max-width:65%;max-height:60%;filter:brightness(0) invert(0.92);">`
        : `<span class="name">${escapeHtml(s.nome)}${s.italic?` <span style="font-family:var(--serif);font-style:italic;color:var(--accent);">${escapeHtml(s.italic)}</span>`:''}<span class="small">${escapeHtml(s.sottotitolo || '')}</span></span>`;
      c.innerHTML += `
        <a class="sponsor" ${s.link?`href="${escapeHtml(s.link)}" target="_blank" rel="noopener"`:''}>
          <span class="tier">${escapeHtml(s.tier || '')}</span>
          ${inner}
        </a>
      `;
    });
  }

  /* ---------- RENDER ALL ---------- */
  function renderAll() {
    renderMeta();
    renderHeroTitle();
    renderSquadre();
    renderRisultati();
    renderCalendario();
    renderClassifica();
    renderNews();
    renderValori();
    renderSponsor();
    initReveal();
  }

  /* ---------- REVEAL ANIMATION ---------- */
  function initReveal() {
    const io = new IntersectionObserver((entries)=>{
      entries.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target);} });
    },{threshold:0.12});
    $$('.reveal').forEach(el=>{ el.classList.remove('in'); io.observe(el); });
  }

  /* ---------- SMOOTH SCROLL ---------- */
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href');
    if (id === '#admin' || id.length <= 1) return;
    const el = document.querySelector(id);
    if (el) {
      e.preventDefault();
      const navH = $('.nav')?.offsetHeight || 0;
      const top = el.getBoundingClientRect().top + window.scrollY - navH + 1;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  });

  /* ============================================================
     ADMIN MODE
     ============================================================ */
  window.openAdmin = () => {
    if (sessionStorage.getItem('admin_ok') !== '1') {
      const pwd = prompt('Password admin:');
      if (pwd !== D.config.adminPassword) { alert('Password errata.'); return; }
      sessionStorage.setItem('admin_ok', '1');
    }
    document.body.classList.add('admin-ok');
    showAdminPanel();
  };

  function showAdminPanel() {
    if ($('#admin-panel')) { $('#admin-panel').classList.add('open'); return; }
    const panel = h('div', { id: 'admin-panel' });
    panel.innerHTML = `
      <div class="ap-shell">
        <header class="ap-head">
          <div>
            <h2>Pannello admin</h2>
            <p class="ap-sub">Modifica i dati del sito. Quando hai finito, scarica <code>data.js</code> aggiornato e caricalo sul tuo hosting.</p>
          </div>
          <div class="ap-head-actions">
            <button class="ap-btn ap-btn-ghost" id="ap-fipav">↗ Aggiorna FIPAV (GitHub)</button>
            <button class="ap-btn ap-btn-primary" id="ap-download">⬇ Scarica data.js</button>
            <button class="ap-btn ap-btn-ghost" id="ap-close">✕ Chiudi</button>
          </div>
        </header>

        <nav class="ap-tabs">
          <button class="ap-tab active" data-tab="squadre">Squadre</button>
          <button class="ap-tab" data-tab="risultati">Risultati</button>
          <button class="ap-tab" data-tab="calendario">Calendario</button>
          <button class="ap-tab" data-tab="classifiche">Classifiche</button>
          <button class="ap-tab" data-tab="news">News</button>
          <button class="ap-tab" data-tab="sponsor">Sponsor</button>
          <button class="ap-tab" data-tab="config">Configurazione</button>
        </nav>

        <div class="ap-body" id="ap-body"></div>
      </div>
    `;
    document.body.appendChild(panel);
    requestAnimationFrame(() => panel.classList.add('open'));

    panel.querySelector('#ap-close').onclick = () => { panel.classList.remove('open'); history.replaceState(null,'',location.pathname+location.search); };
    panel.querySelector('#ap-download').onclick = downloadDataJs;
    panel.querySelector('#ap-fipav').onclick = updateFromFipav;
    panel.querySelectorAll('.ap-tab').forEach(t => t.onclick = () => setTab(t.dataset.tab, panel));

    setTab('squadre', panel);
  }

  function setTab(name, panel) {
    panel.querySelectorAll('.ap-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === name));
    const body = panel.querySelector('#ap-body');
    body.innerHTML = '';
    if (name === 'squadre') renderEditList(body, 'squadre', [
      ['nome',         'text', 'Nome'],
      ['nomeCorsivo',  'text', 'Parte in corsivo'],
      ['suffisso',     'text', 'Suffisso (M/F)'],
      ['categoria',    'text', 'Categoria / Sottotitolo'],
      ['luogo',        'text', 'Luogo / etichetta foto'],
      ['genere',       'select', 'Genere', ['f','m','mista','minivolley']],
      ['dimensione',   'select', 'Dimensione card', ['big','med','sm']],
      ['coach',        'text', 'Coach'],
      ['numAtleti',    'number', 'N° atleti'],
      ['numero',       'text', 'Numero (es. 01)'],
      ['foto',         'image', 'Foto (link Drive o URL)'],
      ['id',           'text', 'ID (univoco)']
    ]);
    if (name === 'risultati') renderEditList(body, 'risultati', [
      ['data',         'date', 'Data'],
      ['ora',          'text', 'Ora (HH:MM)'],
      ['squadraNostra','text', 'Nostra squadra (es. Serie C F)'],
      ['avversario',   'text', 'Avversario'],
      ['siglaAvv',     'text', 'Sigla avversario (2 lettere)'],
      ['setNoi',       'number', 'Set NOI'],
      ['setLoro',      'number', 'Set LORO'],
      ['casa',         'bool', 'Partita in casa'],
      ['luogo',        'text', 'Luogo (Palamilone / in trasferta)']
    ]);
    if (name === 'calendario') renderEditList(body, 'calendario', [
      ['data',             'date', 'Data'],
      ['ora',              'text', 'Ora'],
      ['squadraCasa',      'text', 'Squadra casa'],
      ['squadraTrasferta', 'text', 'Squadra trasferta'],
      ['categoria',        'text', 'Categoria / giornata'],
      ['casa',             'bool', 'Partita in casa']
    ]);
    if (name === 'news') renderEditList(body, 'news', [
      ['data',       'date', 'Data'],
      ['categoria',  'text', 'Categoria'],
      ['titolo',     'text', 'Titolo'],
      ['estratto',   'textarea', 'Estratto'],
      ['contenuto',  'textarea', 'Contenuto completo'],
      ['foto',       'image', 'Foto (link Drive)'],
      ['id',         'text', 'ID']
    ]);
    if (name === 'sponsor') renderEditList(body, 'sponsor', [
      ['nome',        'text', 'Nome'],
      ['italic',      'text', 'Parte in corsivo (opzionale)'],
      ['sottotitolo', 'text', 'Sottotitolo'],
      ['tier',        'select', 'Tier', ['Main Sponsor','Gold','Tech','Partner','Media']],
      ['logo',        'image', 'Logo (link Drive)'],
      ['link',        'text', 'Link sito sponsor']
    ]);
    if (name === 'classifiche') renderClassificheEditor(body);
    if (name === 'config') renderConfigEditor(body);
  }

  function renderEditList(body, key, fields) {
    const list = D[key];
    const wrap = h('div', { class: 'ap-list' });
    list.forEach((item, i) => wrap.appendChild(itemCard(key, i, item, fields)));
    const add = h('button', { class: 'ap-btn ap-btn-add', onclick: () => {
      const blank = {}; fields.forEach(f => blank[f[0]] = f[1]==='bool'?false : f[1]==='number'?0 : '');
      list.push(blank);
      renderAll();
      setTab(key, $('#admin-panel'));
    }}, '+ Aggiungi nuovo');
    body.appendChild(wrap);
    body.appendChild(add);
  }

  function itemCard(key, idx, item, fields) {
    const card = h('div', { class: 'ap-item' });
    const head = h('div', { class: 'ap-item-head' });
    head.innerHTML = `<strong>${escapeHtml(item.nome || item.titolo || item.avversario || item.squadraCasa || (`#${idx+1}`))}</strong>`;
    const actions = h('div', { class: 'ap-item-actions' });
    actions.appendChild(h('button', { class:'ap-mini', onclick: () => { if(idx>0){ const a=D[key]; [a[idx-1],a[idx]]=[a[idx],a[idx-1]]; renderAll(); setTab(key,$('#admin-panel')); } } }, '↑'));
    actions.appendChild(h('button', { class:'ap-mini', onclick: () => { const a=D[key]; if(idx<a.length-1){ [a[idx+1],a[idx]]=[a[idx],a[idx+1]]; renderAll(); setTab(key,$('#admin-panel')); } } }, '↓'));
    actions.appendChild(h('button', { class:'ap-mini ap-mini-danger', onclick: () => { if(confirm('Eliminare?')) { D[key].splice(idx,1); renderAll(); setTab(key,$('#admin-panel')); } } }, '✕'));
    head.appendChild(actions);
    card.appendChild(head);

    const grid = h('div', { class: 'ap-fields' });
    fields.forEach(([fkey, type, label, opts]) => {
      const id = `f-${key}-${idx}-${fkey}`;
      const field = h('label', { class:'ap-f', for: id }, h('span', { class:'ap-fl' }, label));
      let input;
      if (type === 'textarea') {
        input = h('textarea', { id, rows: 3, oninput: e => { item[fkey] = e.target.value; renderAll(); } });
        input.value = item[fkey] || '';
      } else if (type === 'select') {
        input = h('select', { id, onchange: e => { item[fkey] = e.target.value; renderAll(); } });
        opts.forEach(o => input.appendChild(h('option', { value: o, selected: item[fkey] === o ? '' : null }, o)));
      } else if (type === 'bool') {
        input = h('input', { id, type:'checkbox', onchange: e => { item[fkey] = e.target.checked; renderAll(); } });
        input.checked = !!item[fkey];
      } else if (type === 'number') {
        input = h('input', { id, type:'number', oninput: e => { item[fkey] = +e.target.value || 0; renderAll(); } });
        input.value = item[fkey] ?? '';
      } else if (type === 'date') {
        input = h('input', { id, type:'date', oninput: e => { item[fkey] = e.target.value; renderAll(); } });
        input.value = item[fkey] || '';
      } else if (type === 'image') {
        input = h('input', { id, type:'text', placeholder:'https://drive.google.com/file/d/...', oninput: e => { item[fkey] = e.target.value; renderAll(); } });
        input.value = item[fkey] || '';
        const preview = h('div', { class:'ap-img-prev' });
        const upd = () => {
          const u = driveImg(item[fkey]);
          preview.style.backgroundImage = u ? `url('${u}')` : '';
          preview.classList.toggle('empty', !u);
        };
        upd();
        input.addEventListener('input', upd);
        field.appendChild(input);
        field.appendChild(preview);
        grid.appendChild(field);
        return;
      } else {
        input = h('input', { id, type:'text', oninput: e => { item[fkey] = e.target.value; renderAll(); } });
        input.value = item[fkey] || '';
      }
      field.appendChild(input);
      grid.appendChild(field);
    });
    card.appendChild(grid);
    return card;
  }

  function renderClassificheEditor(body) {
    const wrap = h('div', { class: 'ap-list' });
    D.classifiche.forEach((cls, i) => {
      const card = h('div', { class: 'ap-item' });
      card.innerHTML = `<div class="ap-item-head"><strong>${escapeHtml(cls.titolo)}</strong></div>`;
      const grid = h('div', { class: 'ap-fields' });
      [['titolo','Titolo'],['label','Label tab']].forEach(([k,l])=>{
        const f = h('label', { class:'ap-f' }, h('span', { class:'ap-fl' }, l));
        const inp = h('input', { type:'text', value: cls[k], oninput: e => { cls[k]=e.target.value; renderAll(); } });
        inp.value = cls[k] || '';
        f.appendChild(inp); grid.appendChild(f);
      });
      card.appendChild(grid);
      const table = h('div', { class: 'ap-classifica-table' });
      table.innerHTML = `
        <div class="ap-row ap-head-row">
          <div>#</div><div>Squadra</div><div>G</div><div>V</div><div>P</div><div>SF</div><div>SS</div><div>PT</div><div>Forma</div><div>Noi?</div><div></div>
        </div>
        ${cls.squadre.map((s,si)=>`
          <div class="ap-row" data-si="${si}">
            <input class="m" type="number" data-k="pos" value="${s.pos}">
            <input type="text" data-k="nome" value="${escapeHtml(s.nome)}">
            <input class="s" type="number" data-k="g" value="${s.g}">
            <input class="s" type="number" data-k="v" value="${s.v}">
            <input class="s" type="number" data-k="p" value="${s.p}">
            <input class="s" type="number" data-k="sf" value="${s.sf}">
            <input class="s" type="number" data-k="ss" value="${s.ss}">
            <input class="m" type="number" data-k="pt" value="${s.pt}">
            <input class="m" type="text" data-k="forma" value="${escapeHtml(s.forma||'')}" placeholder="VVPVV">
            <input type="checkbox" data-k="noi" ${s.noi?'checked':''}>
            <button class="ap-mini ap-mini-danger" data-act="del">✕</button>
          </div>`).join('')}
      `;
      table.querySelectorAll('.ap-row[data-si]').forEach(row => {
        const si = +row.dataset.si;
        row.querySelectorAll('input').forEach(inp => {
          inp.addEventListener(inp.type==='checkbox' ? 'change' : 'input', e => {
            const k = inp.dataset.k;
            cls.squadre[si][k] = inp.type === 'checkbox' ? inp.checked : (inp.type === 'number' ? +inp.value : inp.value);
            renderAll();
          });
        });
        row.querySelector('[data-act="del"]').onclick = () => { cls.squadre.splice(si,1); renderAll(); setTab('classifiche', $('#admin-panel')); };
      });
      card.appendChild(table);
      const addRow = h('button', { class:'ap-btn ap-btn-add', onclick: () => {
        cls.squadre.push({ pos: cls.squadre.length+1, nome:'Nuova squadra', g:0,v:0,p:0,sf:0,ss:0,pt:0, forma:'' });
        renderAll(); setTab('classifiche', $('#admin-panel'));
      } }, '+ Aggiungi squadra');
      card.appendChild(addRow);
      wrap.appendChild(card);
    });
    body.appendChild(wrap);
  }

  function renderConfigEditor(body) {
    const C = D.config;
    const card = h('div', { class:'ap-item' });
    card.innerHTML = '<div class="ap-item-head"><strong>Configurazione generale</strong></div>';
    const grid = h('div', { class:'ap-fields' });
    const flds = [
      ['Nome società', () => C.nomeSocieta, v => C.nomeSocieta = v],
      ['Città',        () => C.citta, v => C.citta = v],
      ['Stagione',     () => C.stagione, v => C.stagione = v],
      ['Anno fondazione (numero)', () => C.annoFondazione, v => C.annoFondazione = +v||0],
      ['Sede - Nome',        () => C.sede.nome, v => C.sede.nome = v],
      ['Sede - Indirizzo',   () => C.sede.indirizzo, v => C.sede.indirizzo = v],
      ['Sede - CAP',         () => C.sede.cap, v => C.sede.cap = v],
      ['Sede - Città',       () => C.sede.citta, v => C.sede.citta = v],
      ['Telefono',           () => C.contatti.telefono, v => C.contatti.telefono = v],
      ['Instagram URL',      () => C.social.instagram, v => C.social.instagram = v],
      ['Facebook URL',       () => C.social.facebook, v => C.social.facebook = v],
      ['Password admin',     () => C.adminPassword, v => C.adminPassword = v],
      ['GitHub repo (es. user/repo)', () => C.githubRepo || '', v => C.githubRepo = v]
    ];
    flds.forEach(([label, get, set]) => {
      const f = h('label', { class:'ap-f' }, h('span', { class:'ap-fl' }, label));
      const inp = h('input', { type:'text', oninput: e => { set(e.target.value); renderAll(); } });
      inp.value = get();
      f.appendChild(inp); grid.appendChild(f);
    });
    card.appendChild(grid);
    body.appendChild(card);

    // Email list editor
    const emCard = h('div', { class:'ap-item' });
    emCard.innerHTML = '<div class="ap-item-head"><strong>Email contatti</strong></div>';
    const emList = h('div', { class:'ap-fields' });
    C.contatti.emails.forEach((em, i) => {
      const f = h('label', { class:'ap-f' }, h('span', { class:'ap-fl' }, `${em.label}`));
      const inp = h('input', { type:'text', value: em.value, oninput: e => { em.value = e.target.value; renderAll(); } });
      f.appendChild(inp); emList.appendChild(f);
    });
    emCard.appendChild(emList);
    body.appendChild(emCard);
  }

  /* ---------- DOWNLOAD data.js ---------- */
  function downloadDataJs() {
    const header = `/* =========================================================
   ASD Volley '96 — DATI DEL SITO
   Generato il ${new Date().toLocaleString('it-IT')}
   ========================================================= */

window.SITE_DATA = `;
    const body = JSON.stringify(D, null, 2);
    const blob = new Blob([header + body + ';\n'], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    const a = h('a', { href: url, download: 'data.js' });
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  }

  /* ---------- AGGIORNA DA FIPAV ----------
     Su GitHub Pages: apre la pagina Actions del repo dove c'è il bottone "Run workflow"
  */
  function updateFromFipav() {
    const repo = D.config.githubRepo;
    if (!repo) {
      alert("Per usare l'aggiornamento automatico FIPAV configura il tuo repo GitHub.\n\nVai su 'Configurazione' → campo 'GitHub repo' e inserisci es: asdvolley96/sito\n\nVedi ISTRUZIONI.md per il setup completo.");
      return;
    }
    const url = `https://github.com/${repo}/actions/workflows/aggiorna-fipav.yml`;
    const ok = confirm(
      "Sto per aprire GitHub Actions in una nuova scheda.\n\n" +
      "Lì clicchi:\n" +
      "  1. Il pulsante grigio 'Run workflow' (in alto a destra)\n" +
      "  2. Poi il bottone verde 'Run workflow'\n\n" +
      "In ~1 minuto il sito si aggiornerà automaticamente.\n\n" +
      "Continuare?"
    );
    if (ok) window.open(url, '_blank');
  }

  /* ---------- INIT ---------- */
  document.addEventListener('DOMContentLoaded', () => {
    renderAll();
    if (sessionStorage.getItem('admin_ok') === '1') document.body.classList.add('admin-ok');
    if (location.hash === '#admin') window.openAdmin();
    window.addEventListener('hashchange', () => {
      if (location.hash === '#admin') window.openAdmin();
    });
  });
})();
