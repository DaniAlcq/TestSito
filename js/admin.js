/* =========================================================
   ASD Volley '96 — PANNELLO ADMIN
   =========================================================
   Modifica dati, scarica data.js aggiornato, lancia FIPAV.
   ========================================================= */

(() => {
  const D = window.SITE_DATA;
  if (!D) return;
  const { $, $$ } = window.$site || {};
  const escapeHtml = window.escapeHtml;
  const resolveImg = window.resolveImg;

  const h = (tag, attrs={}, ...kids) => {
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

  /* ============ OPEN/CLOSE ============ */
  window.openAdmin = () => {
    if (sessionStorage.getItem('admin_ok') !== '1') {
      const pwd = prompt('Password admin:');
      if (pwd !== D.config.adminPassword) { alert('Password errata.'); return; }
      sessionStorage.setItem('admin_ok', '1');
    }
    document.body.classList.add('admin-ok');
    showPanel();
  };

  function showPanel() {
    if ($('#admin-panel')) { $('#admin-panel').classList.add('open'); return; }
    const panel = h('div', { id: 'admin-panel' });
    panel.innerHTML = `
      <div class="ap-shell">
        <header class="ap-head">
          <div>
            <h2>Pannello admin</h2>
            <p class="ap-sub">Modifica i dati. Quando hai finito, scarica <code>data.js</code> aggiornato e <strong>caricalo su GitHub</strong> sostituendo quello vecchio.</p>
          </div>
          <div class="ap-head-actions">
            <button class="ap-btn ap-btn-ghost" id="ap-fipav">↗ Aggiorna FIPAV (GitHub)</button>
            <button class="ap-btn ap-btn-primary" id="ap-download">⬇ Scarica data.js</button>
            <button class="ap-btn ap-btn-ghost" id="ap-close">✕ Chiudi</button>
          </div>
        </header>

        <nav class="ap-tabs">
          <button class="ap-tab active" data-tab="news">News</button>
          <button class="ap-tab" data-tab="squadre">Squadre</button>
          <button class="ap-tab" data-tab="roster">Atleti & Staff</button>
          <button class="ap-tab" data-tab="risultati">Risultati</button>
          <button class="ap-tab" data-tab="calendario">Calendario</button>
          <button class="ap-tab" data-tab="classifiche">Classifiche</button>
          <button class="ap-tab" data-tab="sponsor">Sponsor</button>
          <button class="ap-tab" data-tab="config">Configurazione</button>
        </nav>

        <div class="ap-body" id="ap-body"></div>
      </div>
    `;
    document.body.appendChild(panel);
    requestAnimationFrame(() => panel.classList.add('open'));

    panel.querySelector('#ap-close').onclick = () => { panel.classList.remove('open'); if (location.hash==='#admin') history.replaceState(null,'',location.pathname+location.search); };
    panel.querySelector('#ap-download').onclick = downloadDataJs;
    panel.querySelector('#ap-fipav').onclick = openFipavGithub;
    panel.querySelectorAll('.ap-tab').forEach(t => t.onclick = () => setTab(t.dataset.tab, panel));
    setTab('news', panel);
  }

  /* ============ TABS ============ */
  function setTab(name, panel) {
    panel.querySelectorAll('.ap-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === name));
    const body = panel.querySelector('#ap-body');
    body.innerHTML = '';

    if (name === 'news') renderEditList(body, 'news', [
      ['data',       'date',     'Data'],
      ['categoria',  'text',     'Categoria'],
      ['titolo',     'text',     'Titolo'],
      ['estratto',   'textarea', 'Estratto'],
      ['contenuto',  'textarea', 'Contenuto completo'],
      ['foto',       'image',    'Foto'],
      ['id',         'text',     'ID']
    ]);

    if (name === 'squadre') renderEditList(body, 'squadre', [
      ['nome',         'text',   'Nome'],
      ['nomeCorsivo',  'text',   'Parte in corsivo'],
      ['suffisso',     'text',   'Suffisso (M/F)'],
      ['categoria',    'text',   'Categoria / Sottotitolo'],
      ['luogo',        'text',   'Luogo'],
      ['genere',       'select', 'Genere', ['f','m','mista','minivolley']],
      ['dimensione',   'select', 'Dimensione card', ['big','med','sm']],
      ['coach',        'text',   'Coach'],
      ['numAtleti',    'number', 'N° atleti'],
      ['numero',       'text',   'Numero (es. 01)'],
      ['foto',         'image',  'Foto'],
      ['id',           'text',   'ID']
    ]);

    if (name === 'roster') renderEditList(body, 'roster', [
      ['nome',       'text',   'Nome'],
      ['cognome',    'text',   'Cognome'],
      ['ruolo',      'text',   'Ruolo (es. Palleggiatore, Allenatore)'],
      ['numero',     'number', 'Numero maglia (vuoto per staff)'],
      ['squadra',    'text',   'Squadra (es. Serie C F)'],
      ['categoria',  'select', 'Categoria', ['femminile','maschile','staff']],
      ['foto',       'image',  'Foto'],
      ['id',         'text',   'ID']
    ]);

    if (name === 'risultati') renderEditList(body, 'risultati', [
      ['data',         'date',   'Data'],
      ['ora',          'text',   'Ora (HH:MM)'],
      ['squadraNostra','text',   'Nostra squadra (es. Serie C F)'],
      ['avversario',   'text',   'Avversario'],
      ['siglaAvv',     'text',   'Sigla avversario (2 lettere)'],
      ['setNoi',       'number', 'Set NOI'],
      ['setLoro',      'number', 'Set LORO'],
      ['casa',         'bool',   'Partita in casa'],
      ['luogo',        'text',   'Luogo (Palamilone / in trasferta)']
    ]);

    if (name === 'calendario') renderEditList(body, 'calendario', [
      ['data',             'date', 'Data'],
      ['ora',              'text', 'Ora'],
      ['squadraCasa',      'text', 'Squadra casa'],
      ['squadraTrasferta', 'text', 'Squadra trasferta'],
      ['categoria',        'text', 'Categoria / giornata'],
      ['casa',             'bool', 'Partita in casa']
    ]);

    if (name === 'sponsor') renderEditList(body, 'sponsor', [
      ['nome',        'text',   'Nome'],
      ['italic',      'text',   'Parte in corsivo (opzionale)'],
      ['sottotitolo', 'text',   'Sottotitolo'],
      ['tier',        'select', 'Tier', ['Main Sponsor','Gold','Tech','Partner','Media']],
      ['logo',        'image',  'Logo'],
      ['link',        'text',   'Link sito sponsor']
    ]);

    if (name === 'classifiche') renderClassificheEditor(body);
    if (name === 'config') renderConfigEditor(body);
  }

  /* ============ EDIT LIST ============ */
  function renderEditList(body, key, fields) {
    const list = D[key];
    const wrap = h('div', { class: 'ap-list' });
    list.forEach((item, i) => wrap.appendChild(itemCard(key, i, item, fields)));
    const add = h('button', { class: 'ap-btn ap-btn-add', onclick: () => {
      const blank = {};
      fields.forEach(f => blank[f[0]] = f[1]==='bool' ? false : f[1]==='number' ? 0 : '');
      list.push(blank);
      window.renderAll();
      setTab(key, $('#admin-panel'));
    }}, '+ Aggiungi nuovo');
    body.appendChild(wrap);
    body.appendChild(add);
  }

  function itemCard(key, idx, item, fields) {
    const card = h('div', { class: 'ap-item' });
    const head = h('div', { class: 'ap-item-head' });
    head.innerHTML = `<strong>${escapeHtml(item.nome || item.titolo || item.avversario || item.squadraCasa || `#${idx+1}`)}</strong>`;
    const actions = h('div', { class: 'ap-item-actions' });
    actions.appendChild(h('button', { class:'ap-mini', title:'Su', onclick: () => { if(idx>0){ const a=D[key]; [a[idx-1],a[idx]]=[a[idx],a[idx-1]]; window.renderAll(); setTab(key,$('#admin-panel')); } } }, '↑'));
    actions.appendChild(h('button', { class:'ap-mini', title:'Giù', onclick: () => { const a=D[key]; if(idx<a.length-1){ [a[idx+1],a[idx]]=[a[idx],a[idx+1]]; window.renderAll(); setTab(key,$('#admin-panel')); } } }, '↓'));
    actions.appendChild(h('button', { class:'ap-mini ap-mini-danger', title:'Elimina', onclick: () => { if(confirm('Eliminare?')) { D[key].splice(idx,1); window.renderAll(); setTab(key,$('#admin-panel')); } } }, '✕'));
    head.appendChild(actions);
    card.appendChild(head);

    const grid = h('div', { class: 'ap-fields' });
    fields.forEach(([fkey, type, label, opts]) => {
      const id = `f-${key}-${idx}-${fkey}`;
      const field = h('label', { class:'ap-f', for: id }, h('span', { class:'ap-fl' }, label));
      let input;
      if (type === 'textarea') {
        input = h('textarea', { id, rows: 3, oninput: e => { item[fkey] = e.target.value; window.renderAll(); } });
        input.value = item[fkey] || '';
      } else if (type === 'select') {
        input = h('select', { id, onchange: e => { item[fkey] = e.target.value; window.renderAll(); } });
        opts.forEach(o => input.appendChild(h('option', { value: o, selected: item[fkey] === o ? '' : null }, o)));
      } else if (type === 'bool') {
        input = h('input', { id, type:'checkbox', onchange: e => { item[fkey] = e.target.checked; window.renderAll(); } });
        input.checked = !!item[fkey];
      } else if (type === 'number') {
        input = h('input', { id, type:'number', oninput: e => { item[fkey] = +e.target.value || 0; window.renderAll(); } });
        input.value = item[fkey] ?? '';
      } else if (type === 'date') {
        input = h('input', { id, type:'date', oninput: e => { item[fkey] = e.target.value; window.renderAll(); } });
        input.value = item[fkey] || '';
      } else if (type === 'image') {
        input = h('input', { id, type:'text', placeholder:'img/news/foto.jpg  oppure  link Drive', oninput: e => { item[fkey] = e.target.value; window.renderAll(); upd(); } });
        input.value = item[fkey] || '';
        const preview = h('div', { class:'ap-img-prev' });
        const hint = h('div', { class:'ap-img-hint' }, "Veloce: carica la foto su GitHub in img/news/, img/atleti/, img/squadre/, img/sponsor/ e scrivi il percorso");
        const upd = () => {
          const u = resolveImg(item[fkey]);
          preview.style.backgroundImage = u ? `url('${u}')` : '';
          preview.classList.toggle('empty', !u);
        };
        upd();
        field.appendChild(input);
        field.appendChild(preview);
        field.appendChild(hint);
        grid.appendChild(field);
        return;
      } else {
        input = h('input', { id, type:'text', oninput: e => { item[fkey] = e.target.value; window.renderAll(); } });
        input.value = item[fkey] || '';
      }
      field.appendChild(input);
      grid.appendChild(field);
    });
    card.appendChild(grid);
    return card;
  }

  /* ============ CLASSIFICHE EDITOR ============ */
  function renderClassificheEditor(body) {
    const wrap = h('div', { class: 'ap-list' });
    D.classifiche.forEach((cls, i) => {
      const card = h('div', { class: 'ap-item' });
      card.innerHTML = `<div class="ap-item-head"><strong>${escapeHtml(cls.titolo)}</strong></div>`;
      const grid = h('div', { class: 'ap-fields' });
      [['titolo','Titolo'],['label','Label tab']].forEach(([k,l])=>{
        const f = h('label', { class:'ap-f' }, h('span', { class:'ap-fl' }, l));
        const inp = h('input', { type:'text', oninput: e => { cls[k]=e.target.value; window.renderAll(); } });
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
          inp.addEventListener(inp.type==='checkbox' ? 'change' : 'input', () => {
            const k = inp.dataset.k;
            cls.squadre[si][k] = inp.type === 'checkbox' ? inp.checked : (inp.type === 'number' ? +inp.value : inp.value);
            window.renderAll();
          });
        });
        row.querySelector('[data-act="del"]').onclick = () => { cls.squadre.splice(si,1); window.renderAll(); setTab('classifiche', $('#admin-panel')); };
      });
      card.appendChild(table);
      const addRow = h('button', { class:'ap-btn ap-btn-add', onclick: () => {
        cls.squadre.push({ pos: cls.squadre.length+1, nome:'Nuova squadra', g:0,v:0,p:0,sf:0,ss:0,pt:0, forma:'' });
        window.renderAll(); setTab('classifiche', $('#admin-panel'));
      } }, '+ Aggiungi squadra');
      card.appendChild(addRow);
      wrap.appendChild(card);
    });
    body.appendChild(wrap);
  }

  /* ============ CONFIG EDITOR ============ */
  function renderConfigEditor(body) {
    const C = D.config;
    const card = h('div', { class:'ap-item' });
    card.innerHTML = '<div class="ap-item-head"><strong>Configurazione generale</strong></div>';
    const grid = h('div', { class:'ap-fields' });
    const flds = [
      ['Nome società',                () => C.nomeSocieta, v => C.nomeSocieta = v],
      ['Città',                       () => C.citta, v => C.citta = v],
      ['Stagione',                    () => C.stagione, v => C.stagione = v],
      ['Anno fondazione',             () => C.annoFondazione, v => C.annoFondazione = +v||0],
      ['Sede - Nome',                 () => C.sede.nome, v => C.sede.nome = v],
      ['Sede - Indirizzo',            () => C.sede.indirizzo, v => C.sede.indirizzo = v],
      ['Sede - CAP',                  () => C.sede.cap, v => C.sede.cap = v],
      ['Sede - Città',                () => C.sede.citta, v => C.sede.citta = v],
      ['Telefono',                    () => C.contatti.telefono, v => C.contatti.telefono = v],
      ['Instagram URL',               () => C.social.instagram, v => C.social.instagram = v],
      ['Facebook URL',                () => C.social.facebook, v => C.social.facebook = v],
      ['Password admin',              () => C.adminPassword, v => C.adminPassword = v],
      ['GitHub repo (user/repo)',     () => C.githubRepo || '', v => C.githubRepo = v]
    ];
    flds.forEach(([label, get, set]) => {
      const f = h('label', { class:'ap-f' }, h('span', { class:'ap-fl' }, label));
      const inp = h('input', { type:'text', oninput: e => { set(e.target.value); window.renderAll(); } });
      inp.value = get();
      f.appendChild(inp); grid.appendChild(f);
    });
    card.appendChild(grid);
    body.appendChild(card);

    const emCard = h('div', { class:'ap-item' });
    emCard.innerHTML = '<div class="ap-item-head"><strong>Email contatti</strong></div>';
    const emList = h('div', { class:'ap-fields' });
    C.contatti.emails.forEach(em => {
      const f = h('label', { class:'ap-f' }, h('span', { class:'ap-fl' }, em.label));
      const inp = h('input', { type:'text', value: em.value, oninput: e => { em.value = e.target.value; window.renderAll(); } });
      f.appendChild(inp); emList.appendChild(f);
    });
    emCard.appendChild(emList);
    body.appendChild(emCard);
  }

  /* ============ DOWNLOAD data.js ============ */
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

  /* ============ FIPAV (apre GitHub Actions) ============ */
  function openFipavGithub() {
    const repo = D.config.githubRepo;
    if (!repo) {
      alert("Configura prima il GitHub repo in Configurazione (es. DaniAlcq/asd-volley-96).");
      return;
    }
    const url = `https://github.com/${repo}/actions/workflows/aggiorna-fipav.yml`;
    if (confirm("Apro GitHub Actions in una nuova scheda.\n\nLì clicca:\n  1. 'Run workflow' (grigio, in alto a destra)\n  2. 'Run workflow' (verde, nel menù)\n\nIn ~1 minuto il sito si aggiorna.\n\nContinuare?")) {
      window.open(url, '_blank');
    }
  }
})();
