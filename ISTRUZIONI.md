# ASD Volley '96 — Istruzioni d'uso

Guida per gestire il sito su **GitHub Pages** con dominio Aruba.

---

## 📁 I file del progetto

```
/  (cartella del progetto)
├── Sito ASD Volley 96.html   ← pagina principale (da rinominare in index.html)
├── data.js                    ← TUTTI i dati: squadre, risultati, news, etc.
├── app.js                     ← motore del sito (non modificare)
├── assets/
│   └── logo.svg               ← logo
├── scripts/
│   └── aggiorna-fipav.mjs     ← scraper FIPAV (gira su GitHub Actions)
├── .github/workflows/
│   └── aggiorna-fipav.yml     ← workflow GitHub Actions
├── package.json               ← dipendenze del scraper
└── .gitignore
```

---

## 🚀 Setup iniziale (una volta sola)

### 1. Carica i file su GitHub

1. Apri **GitHub Desktop** o usa il terminale di **VS Code**
2. Crea una nuova repo su github.com (es. `asdvolley96/sito`) — può essere **pubblica o privata**
3. Su VS Code: `File → Apri cartella` → seleziona la cartella del progetto
4. Apri il pannello **Source Control** (icona ramo a sinistra)
5. Scrivi un messaggio di commit (es. "primo caricamento")
6. Clicca **Commit** → poi **Sync** o **Push**

### 2. Rinomina il file principale

GitHub Pages cerca un file chiamato `index.html`. Rinomina:
- `Sito ASD Volley 96.html` → `index.html`

### 3. Attiva GitHub Pages

1. Vai sulla tua repo su github.com
2. **Settings** (in alto a destra) → **Pages** (menu sinistro)
3. Sotto "Build and deployment":
   - **Source**: Deploy from a branch
   - **Branch**: main, cartella `/ (root)`
4. Salva. In ~1 minuto il sito è online su `https://USERNAME.github.io/REPO/`

### 4. Collega il dominio Aruba

1. **Pannello Aruba** → Domini → asdvolley96.it → Gestione DNS
2. Aggiungi questi record **A** (puntano ai server di GitHub):
   ```
   A    @    185.199.108.153
   A    @    185.199.109.153
   A    @    185.199.110.153
   A    @    185.199.111.153
   ```
3. Aggiungi anche un record **CNAME**:
   ```
   CNAME    www    USERNAME.github.io
   ```
4. Su GitHub: **Settings → Pages → Custom domain** → scrivi `asdvolley96.it` → Save
5. Spunta **Enforce HTTPS** quando si attiva (può richiedere alcune ore)

Aruba di solito impiega da 1 a 24 ore per propagare i DNS.

### 5. Configura il sito

In VS Code, apri `data.js` e modifica all'inizio:

```javascript
config: {
  // ...
  githubRepo: "asdvolley96/sito",  // sostituisci con la tua repo!
  adminPassword: "qualcosa-di-sicuro"  // CAMBIA QUESTA!
}
```

Salva, fai commit & push.

---

## 🔐 Modalità admin

### Come entrare

- Footer del sito → clicca **admin** in fondo a destra
- Oppure URL `asdvolley96.it/#admin`
- Inserisci la password

Dopo che sei dentro nella sessione, compare un'icona ⚙ in basso a destra che apre il pannello al volo.

### Cosa puoi modificare

| Scheda | Cosa modifichi |
|---|---|
| **Squadre** | Foto, nome, coach, categoria di ogni squadra |
| **Risultati** | Match giocati (puoi anche aggiungerli a mano) |
| **Calendario** | Prossime partite |
| **Classifiche** | Posizioni e punteggi |
| **News** | Articoli con foto |
| **Sponsor** | Loghi e link |
| **Configurazione** | Indirizzo, telefono, social, password |

---

## 💾 Workflow tipico: modificare il sito

### Per modifiche a squadre / news / sponsor (cose che cambi tu)

1. Apri il sito → entra in **admin**
2. Modifica quello che vuoi (le modifiche si vedono in anteprima subito)
3. Clicca **⬇ Scarica data.js**
4. In VS Code: **sostituisci** il vecchio `data.js` con quello scaricato (dal Finder/Esplora file)
5. Pannello Source Control di VS Code → commit & push
6. Il sito si aggiorna su asdvolley96.it in ~1 minuto

### Per modifiche dirette in VS Code

In alternativa, apri `data.js` direttamente in VS Code, modifica i campi che ti servono, commit & push. È velocissimo.

---

## 🏐 Aggiornare risultati FIPAV (ogni domenica sera)

Questa è la parte automatica.

### Da computer

1. Apri **github.com/TUO-USERNAME/sito**
2. Clicca tab **Actions** (in alto)
3. Nel menu di sinistra clicca **"Aggiorna risultati FIPAV"**
4. Pulsante grigio in alto a destra **"Run workflow"** → si apre un mini-menu
5. Bottone verde **"Run workflow"**
6. Aspetta ~1 minuto. Lo script:
   - Va sul portale FIPAV Sicilia
   - Trova i match della settimana corrente in cui giocate
   - Scarica anche le classifiche
   - Aggiorna `data.js` direttamente nella repo
   - GitHub Pages ridistribuisce il sito automaticamente

### Da telefono (sì funziona!)

Stesso procedimento dall'**app GitHub** (gratuita su iOS/Android) o dal browser mobile:
- App GitHub → repo → tab "Actions" → workflow → "Run workflow"

### Dall'admin del sito

Pannello admin → bottone in alto **↗ Aggiorna FIPAV (GitHub)** → ti porta direttamente alla pagina giusta.

### Aggiornamento automatico settimanale (opzionale)

Puoi farlo girare **automaticamente ogni lunedì mattina** senza nemmeno cliccare. Apri `.github/workflows/aggiorna-fipav.yml` e togli i `#` davanti alle righe:

```yaml
# schedule:
#   - cron: '0 7 * * 1'
```

Diventano:

```yaml
schedule:
  - cron: '0 7 * * 1'
```

Commit & push. Da quel momento, ogni **lunedì alle 8:00 ora italiana**, GitHub farà partire lo scraper da solo.

---

## 🖼️ Aggiungere foto dal Google Drive

1. Carica la foto su Drive
2. **Tasto destro → Condividi → Generale → Chiunque con il link → Visualizzatore**
3. Copia il link
4. Nell'admin del sito (Squadre / News / Sponsor): incolla il link nel campo "Foto"
5. Anteprima immediata

**Dimensioni consigliate:**
- Foto squadre: 1200×900 px
- Foto news: 1200×750 px
- Loghi sponsor: PNG con sfondo trasparente, alto almeno 200 px

---

## ⚙️ Limiti & note

### Cosa fa lo scraper FIPAV

- ✅ Trova **automaticamente** tutti i campionati in cui gioca "VOLLEY 96"
- ✅ Scarica risultati, calendario e classifiche
- ✅ Non sovrascrive i match passati (mantiene lo storico)
- ✅ Aggiorna le classifiche con i dati più recenti

### Limitazioni

- ⚠ Il portale FIPAV mostra **una settimana per volta**, quella corrente. Quindi conviene lanciare lo scraper **ogni domenica sera** dopo le partite.
- ⚠ Se FIPAV cambia layout del sito, lo scraper potrebbe smettere di funzionare — in quel caso bisogna aggiornare `scripts/aggiorna-fipav.mjs`. In alternativa puoi sempre inserire i dati a mano dall'admin.
- ⚠ Lo script cerca match contenenti il testo `VOLLEY 96`. Se cambi il nome della società sul portale FIPAV, aggiorna anche la costante `NOME_SOCIETA` in `scripts/aggiorna-fipav.mjs`.

---

## 🆘 Problemi comuni

| Problema | Cosa fare |
|---|---|
| Il sito mostra una pagina vuota | `data.js` ha un errore di sintassi. Apri la console (F12) e cerca il messaggio rosso. |
| Le foto da Drive non si caricano | La condivisione su Drive non è impostata su "chiunque con il link" |
| Il workflow GitHub Actions fallisce | Vai su Actions, clicca l'esecuzione fallita, leggi i log. Spesso è perché FIPAV ha cambiato qualcosa o il nome società non corrisponde. |
| Modifico data.js in admin ma non si aggiorna online | Hai dimenticato di scaricarlo e di fare commit & push su GitHub |
| Il dominio asdvolley96.it non punta a GitHub | I DNS Aruba possono impiegare fino a 24h. Controlla con https://dnschecker.org |

---

## 📞 In sintesi

**Cose che cambi tu (settimanali):**
1. Domenica sera: github.com → Actions → "Run workflow" → fine
2. Risultati e classifiche FIPAV aggiornati in 1 minuto

**Cose che cambi tu (al bisogno):**
1. Modifichi qualcosa dall'admin del sito
2. Scarichi `data.js`
3. Lo metti nella cartella, commit & push
4. Sito aggiornato in 1 minuto

**Forza Volley '96! 🏐**
