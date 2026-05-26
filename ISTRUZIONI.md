# ASD Volley '96 — Istruzioni d'uso

Guida per gestire il sito su **GitHub Pages** con dominio Aruba.

---

## 📁 Struttura del progetto

```
/
├── index.html              ← Home
├── squadre.html            ← Squadre + atleti
├── calendario.html         ← Risultati + classifiche
├── societa.html            ← Chi siamo + sponsor
├── contatti.html           ← Contatti
├── data.js                 ← TUTTI i dati del sito
├── css/site.css            ← Stili (caricato 1 volta, in cache)
├── js/
│   ├── render.js           ← Motore (popola le pagine dai dati)
│   └── admin.js            ← Pannello admin
├── img/                    ← Foto (logo, news, atleti, squadre, sponsor)
├── scripts/
│   └── aggiorna-fipav.mjs  ← Scraper FIPAV (gira su GitHub Actions)
├── .github/workflows/
│   └── aggiorna-fipav.yml  ← Workflow GitHub Actions
└── package.json
```

---

## ⚡ Perché è veloce

1. **HTML statico** — GitHub Pages serve i file da CDN globale (millisecondi)
2. **CSS/JS in cache** — il browser li scarica 1 volta sola e li riusa su tutte le pagine
3. **Immagini nel repo** — niente Google Drive lento, le foto sono servite dal CDN GitHub
4. **Lazy loading** — solo le immagini visibili subito vengono caricate. Le altre quando arrivi col scroll
5. **Box colorati** — durante il caricamento foto vedi sempre qualcosa, mai pagina vuota
6. **Dimensioni esplicite** — niente "salto" del layout quando le foto arrivano

---

## 🚀 Setup iniziale

### 1. Carica i file su GitHub

Usa GitHub Desktop o `git` da terminale. Sostituisci tutti i file della tua repo `DaniAlcq/asd-volley-96` con quelli di questo zip.

### 2. Attiva GitHub Pages

Già attivo se hai il dominio asdvolley96.it collegato. Se no:
- Settings → Pages → Source: Deploy from a branch → main → root → Save

### 3. Configura

Apri `data.js` e in alto cambia:

```javascript
config: {
  // ...
  githubRepo: "DaniAlcq/asd-volley-96",
  adminPassword: "QUALCOSA-DI-SICURO"  // CAMBIA!
}
```

Commit & push.

---

## 🔐 Modalità admin

### Entrare

- Footer di qualsiasi pagina → cliccare **admin** in fondo a destra
- Oppure URL del tipo `asdvolley96.it/#admin`
- Inserisci la password

Dopo che sei entrato in una sessione, in basso a destra compare un'icona ⚙ che apre il pannello al volo da qualsiasi pagina.

### Schede disponibili

| Scheda | Cosa modifichi |
|---|---|
| **News** | Articoli (titolo, estratto, foto, data) |
| **Squadre** | Le 8 formazioni (foto, coach, categoria) |
| **Atleti & Staff** | Card dei singoli con foto, filtri per genere |
| **Risultati** | Partite giocate (anche FIPAV li aggiorna) |
| **Calendario** | Prossime partite (anche FIPAV li aggiorna) |
| **Classifiche** | Tabelle per ogni campionato (anche FIPAV) |
| **Sponsor** | Loghi e link sponsor |
| **Configurazione** | Sede, contatti, social, password, GitHub repo |

---

## 💾 Workflow tipico

### Per modificare news / squadre / sponsor / contatti

1. Apri sito → entra in **admin** (footer → admin)
2. Modifica (anteprima in tempo reale)
3. Clicca **⬇ Scarica data.js**
4. In VS Code: sostituisci il vecchio `data.js` con quello scaricato
5. Source Control → commit → push
6. Sito aggiornato in 1 minuto

### Per modificare dati FIPAV (settimanale)

**Modo 1: dall'admin (più comodo)**

1. Admin → bottone **↗ Aggiorna FIPAV (GitHub)**
2. Si apre GitHub Actions
3. Clicca **Run workflow** (grigio) → **Run workflow** (verde)
4. Aspetta ~1 minuto. Il workflow:
   - Va sul portale FIPAV Sicilia
   - Trova i match della settimana corrente in cui giocate
   - Scarica classifiche
   - Aggiorna `data.js` direttamente nella repo
   - GitHub Pages ripubblica il sito

**Modo 2: dal telefono**

App GitHub → repo → Actions → Aggiorna risultati FIPAV → Run workflow.

---

## 🖼️ Aggiungere foto (super-veloce)

Per la massima velocità del sito, carica le foto **direttamente nel repo** (non su Drive).

### Passi

1. **Comprimi** le foto su https://squoosh.app (gratis). Una foto da telefono da 4MB diventa 200KB.
2. **Carica** nella cartella `img/` su GitHub (drag&drop nel tuo editor o tramite GitHub web):
   - `img/news/` per le news
   - `img/squadre/` per foto di squadra
   - `img/atleti/` per ritratti singoli
   - `img/sponsor/` per loghi
3. **Nell'admin**, nel campo "Foto" scrivi il percorso, es. `img/atleti/russo-anna.jpg`

### Caricamento foto via GitHub web

1. Vai su https://github.com/DaniAlcq/asd-volley-96
2. Naviga in `img/news/` (o quella che ti serve)
3. **Add file → Upload files** → trascina le foto → **Commit**

Da questo momento, ogni foto è disponibile su `https://asdvolley96.it/img/news/nome-foto.jpg`.

### Dimensioni consigliate

| Tipo | Dimensione | Note |
|---|---|---|
| Foto news | 1200×750 px | jpg, qualità 80% |
| Foto squadra | 1200×900 px | jpg, qualità 80% |
| Foto atleta | 600×800 px | jpg verticale 3:4 |
| Logo sponsor | PNG trasparente | alto almeno 200 px |

---

## 🔄 Aggiornamento automatico settimanale (opzionale)

Vuoi che FIPAV si aggiorni da solo ogni lunedì?

Apri `.github/workflows/aggiorna-fipav.yml`, trova:

```yaml
on:
  workflow_dispatch:
```

E sostituisci con:

```yaml
on:
  workflow_dispatch:
  schedule:
    - cron: '0 7 * * 1'  # ogni lunedì alle 8:00 ora italiana
```

Commit & push. Fine.

---

## ⚙️ Limiti & note

- **Il portale FIPAV mostra solo la settimana corrente**: per uno storico completo, lancia il workflow ogni domenica sera dopo le partite. Il sistema accumula automaticamente i risultati passati.
- **Se cambiate nome sul portale FIPAV**: aggiorna `NOME_SOCIETA` in `scripts/aggiorna-fipav.mjs`.
- **Se FIPAV cambia layout sito**: lo script potrebbe smettere di funzionare. Quando succede, i dati possono essere comunque inseriti a mano dall'admin.

---

## 🆘 Problemi comuni

| Problema | Soluzione |
|---|---|
| Sito mostra pagine vuote | `data.js` ha un errore di sintassi. Apri console (F12). |
| Foto non si caricano | Percorso sbagliato. Es: `img/news/foto.jpg` deve esistere su GitHub. |
| Workflow GitHub fallisce | Apri Actions → log dell'errore. Spesso il portale FIPAV è offline o ha cambiato qualcosa. |
| Modifico dall'admin ma online non cambia nulla | Hai dimenticato di scaricare `data.js` e pusharlo. |
| Sito lento al primo caricamento | Le foto sono troppo grandi. Comprimile con https://squoosh.app |

---

## 📞 In sintesi

**Settimanale (1 click):**
- Admin → "↗ Aggiorna FIPAV" → Run workflow → fatto

**Al bisogno:**
- Admin → modifica → ⬇ Scarica data.js → push su GitHub → fatto

**Forza Volley '96! 🏐**
