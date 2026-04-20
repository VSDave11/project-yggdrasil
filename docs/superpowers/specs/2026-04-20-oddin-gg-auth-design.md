# Yggdrasil — @oddin.gg Google Auth + Sdílená Data (Design)

**Datum:** 2026-04-20
**Autor:** David Kuchař (& Claude)
**Stav:** Schváleno k implementaci

---

## Cíl

Projekt Yggdrasil má dva jasné požadavky:

1. **Přístup jen pro @oddin.gg** — editace smí jen uživatelé přihlášení svým Google Workspace účtem pod doménou `oddin.gg`. Nepřihlášení návštěvníci vidí stránku read-only.
2. **Sdílená data mezi uživateli** — kdokoliv z týmu přidá/upraví projekt nebo branch a změna je okamžitě viditelná všem ostatním.

Dnes ani jeden z bodů nefunguje:
- Login v [src/auth.jsx](../../../src/auth.jsx) je placeholder, který "přihlásí" jako fake `team@oddin.gg`.
- Data se ukládají do localStorage prohlížeče, takže každý uživatel má svoji vlastní kopii.

---

## Architektura

### Vybraný přístup — **Plně přes Supabase**

```
┌─────────────┐          ┌──────────────┐          ┌─────────────┐
│   Browser   │ ───────► │   Supabase   │          │   Google    │
│             │ ◄──────  │  (Auth + DB) │ ◄──────► │    OAuth    │
└─────────────┘          └──────────────┘          └─────────────┘
      │
      │ static files (HTML, JSX, CSS)
      ▼
┌─────────────┐
│  server.js  │
│   (Render)  │
└─────────────┘
```

- **Frontend** mluví přímo se Supabase přes oficiální klienta `@supabase/supabase-js` (CDN).
- **server.js** je po refactoru **jen statický file server** — serveruje `public/` + `src/`.
- **Autentizace** — Supabase Auth provider Google. Redirect flow (klik → Google → zpět).
- **Data** — tabulka `public.projects` v Supabase. Frontend realtime-subscribe → okamžité promítnutí změn.

### Tři vrstvy ochrany `@oddin.gg`

1. **Google OAuth consent screen = Internal** — Google sám zakazuje cokoliv jiného než `@oddin.gg`.
2. **Supabase RLS** ([migrations/001_auth_rls.sql](../../../migrations/001_auth_rls.sql)) — read = anon OK, write = jen pokud `auth.jwt() ->> 'email' LIKE '%@oddin.gg'`.
3. **Frontend UI** — editační tlačítka skrytá, pokud není session.

I kdyby někdo obešel UI, Supabase na DB úrovni odmítne write.

---

## Změny v souborech

### Úpravy v existujících

| Soubor | Rozsah | Popis |
|---|---|---|
| [public/index.html](../../../public/index.html) | +5 řádků | `<script>` CDN `@supabase/supabase-js@2` + inline `<script>` s konfigem (`SUPABASE_URL`, `SUPABASE_ANON_KEY`) |
| [src/store.jsx](../../../src/store.jsx) | hlavní refactor | localStorage pryč pro `projects` a `audit`; akce volají Supabase; realtime subscription pro sync; session přes `supabase.auth.onAuthStateChange`. Mapovací vrstva `fromDB/toDB` mezi DB formátem a frontend formátem |
| [src/auth.jsx](../../../src/auth.jsx) | ~30 řádků | Smazat `signInAsDemo` placeholder. Tlačítko volá `supabase.auth.signInWithOAuth({ provider: 'google', options: { queryParams: { hd: 'oddin.gg' }}})`. Email-regex kontrolu smazat (řeší RLS + Google) |
| [src/data.jsx](../../../src/data.jsx) | smazáno | Data jsou v DB; seed se provede migrací `003_seed_data.sql` |
| [server.js](../../../server.js) | zjednodušení | Smazat všechny `/api/*` endpointy (nevolá je nikdo) a odstranit Supabase integraci (přesunuta na frontend). Zůstane jen `express.static('public')` + `express.static('src')` |
| [package.json](../../../package.json) | drobnost | `cors` pryč (není potřeba) |

### Nové soubory

| Soubor | Obsah |
|---|---|
| `migrations/002_extend_schema.sql` | `ALTER TABLE projects ADD COLUMN` pro nová pole: `code TEXT`, `suffix TEXT`, `tagline TEXT`, `stack TEXT`, `since TEXT`, `features JSONB`, `metrics JSONB` — vše nullable, výchozí prázdné |
| `migrations/003_seed_data.sql` | `UPDATE projects SET code='YGG-01', tagline='...', features='[...]' WHERE name='Drachir.gg';` — doplní existujících 7 projektů o hodnoty ze starého [src/data.jsx](../../../src/data.jsx) |

### Co se **NEZMĚNÍ**

- Vzhled stránky (CSS, HTML layout)
- Existující sloupce v tabulce `projects` (ani se nebudou přejmenovávat)
- Ostatní `src/*.jsx` (`app.jsx`, `sections.jsx`, `overlay.jsx`, `tree.jsx`, `tweaks.jsx`, `editable.jsx`) — dál používají `useStore()`, jen store mluví se Supabase místo s localStorage

---

## Mapovací vrstva DB ↔ Frontend

Protože DB má část polí pod jinými názvy než frontend (historický důvod), v [src/store.jsx](../../../src/store.jsx) bude čistá obousměrná mapa:

```js
// DB row → shape, kterou očekávají komponenty
function fromDB(row) {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    suffix: row.suffix || '',
    tagline: row.tagline || '',
    status: TAG_TO_STATUS[row.tag] || 'plan',   // "Live"→"live", atd.
    owners: (row.team || []).join(', ') || '—',
    stack: row.stack || '—',
    since: row.since || '',
    description: row.desc || '',
    features: row.features || [],
    metrics: row.metrics || [],
    changelog: row.log || [],
    subprojects: row.subprojects || [],
    icon: row.icon,
    color: row.color,
  };
}

function toDB(p) { /* opačný směr pro insert/update */ }
```

Mapa je lokální v store, zbytek aplikace nic nepozná.

---

## Flow uživatele

### Read-only návštěvník (nepřihlášený)
1. Otevře `https://project-yggdrasil.onrender.com`.
2. Stránka načte projekty ze Supabase (anon key → RLS povoluje read).
3. Vidí projekty, branches, activity log.
4. V navigaci vidí tlačítko **"Sign in to edit"**.
5. Editační tlačítka, add-project tlačítko, delete — skryta.

### Přihlášený @oddin.gg uživatel
1. Klik "Sign in" → redirect na Google.
2. Google consent (Internal) — povolí jen `@oddin.gg`.
3. Redirect zpět do app, Supabase vytvoří session, JWT.
4. Store detekuje session přes `onAuthStateChange` → UI se překreslí, edit tlačítka se objeví.
5. Kliknutím na edit → změna se uloží přes `supabase.from('projects').update(...)` → DB RLS povolí (email v JWT končí na `@oddin.gg`).
6. Ostatní připojení uživatelé dostanou změnu přes realtime subscription (~100-300 ms).
7. Sign out → `supabase.auth.signOut()` → UI zpět do read-only režimu.

### Uživatel s jiným než @oddin.gg mailem
- Google consent ho vůbec nepustí dál (Internal restriction).
- I kdyby nějak získal JWT (např. testovací environment), Supabase RLS write odmítne (403).

---

## Plán provedení — 4 fáze

### Fáze 1 — Admin @oddin.gg (blokuje Fázi 3, ne Fázi 2)
1. David pošle adminovi aktualizovaný [docs/GOOGLE_OAUTH_SETUP.md](../../../docs/GOOGLE_OAUTH_SETUP.md) s opravenou URL `https://project-yggdrasil.onrender.com`.
2. Admin založí OAuth consent (**Internal**) + OAuth Client ID.
3. Admin pošle Davidovi **Client ID + Client Secret** (bezpečně).

### Fáze 2 — Implementace (paralelně s Fází 1)
Pořadí kroků (každý je samostatný commit):
1. Opravit [docs/GOOGLE_OAUTH_SETUP.md](../../../docs/GOOGLE_OAUTH_SETUP.md) — správná URL.
2. Napsat `migrations/002_extend_schema.sql`.
3. Napsat `migrations/003_seed_data.sql`.
4. Refactor [src/store.jsx](../../../src/store.jsx) — Supabase klient, realtime, mapovací vrstva, odstranění localStorage pro data.
5. Přepsat [src/auth.jsx](../../../src/auth.jsx) — Supabase OAuth.
6. Upravit [public/index.html](../../../public/index.html) — přidat Supabase JS + config.
7. Zjednodušit [server.js](../../../server.js) — smazat API.
8. Upravit [package.json](../../../package.json) — odebrat `cors`.
9. Smazat [src/data.jsx](../../../src/data.jsx).
10. Lokální smoke test — `node server.js`, otevřít v prohlížeči, ověřit že neexistují JS errors v konzoli.

### Fáze 3 — Supabase konfigurace (David, ~5 min)
1. **SQL Editor:**
   - Spustit [migrations/001_auth_rls.sql](../../../migrations/001_auth_rls.sql)
   - Spustit `migrations/002_extend_schema.sql`
   - Spustit `migrations/003_seed_data.sql`
2. **Authentication → URL Configuration:**
   - Site URL: `https://project-yggdrasil.onrender.com`
   - Redirect URLs: přidat `https://project-yggdrasil.onrender.com/**` a `http://localhost:3000/**`
3. **Authentication → Providers → Google:**
   - Enable
   - Paste Client ID + Client Secret od admina
   - Save

### Fáze 4 — Deploy na Render
1. Ověřit, že service `project-yggdrasil` na Render existuje (potvrzeno — existuje, bez aktivního deploymentu).
2. Propojit s GitHub repozitářem (pokud ještě není).
3. Nastavit `Build Command`: `npm install`
4. Nastavit `Start Command`: `node server.js`
5. Environment variables: **žádné potřeba** (Supabase URL a anon key jsou veřejné v HTML — což je pro anon key bezpečné).
6. Trigger deploy.
7. Otevřít `https://project-yggdrasil.onrender.com` → ověřit funkčnost.

---

## Testování

**Lokální test (po Fázi 2, před 3):**
- `node server.js` → otevřít `http://localhost:3000`
- Ověřit, že stránka načte projekty ze Supabase (konzola bez errorů)
- Klik na Sign in **zatím nebude fungovat** (OAuth neni nakonfigurované) — v pořádku

**End-to-end test (po Fázi 3):**
- Lokálně: přihlásit se svým `@oddin.gg` účtem, přidat branch, zkontrolovat v DB
- Druhý prohlížeč (incognito) bez přihlášení: vidí novou branch, nemůže editovat
- Zkusit přihlásit jiným než `@oddin.gg` mailem → Google to odmítne

**Po deployi (Fáze 4):**
- Stejné testy na `https://project-yggdrasil.onrender.com`

---

## Rizika a co s nimi

| Riziko | Dopad | Mitigace |
|---|---|---|
| Admin nepošle credentials včas | Fáze 3 blokovaná | Fáze 2 nečeká — můžeme všechno připravit. Credentials jsou poslední krok. |
| Supabase realtime nefunguje přes Render | Sdílení dat živě zpoždené, update až při refresh | Fallback polling každých 30 s (TODO, pokud bude problém) |
| Render cold start pomalý | První otevření ~10 s | Akceptovatelné pro interní tool |
| Migrace 003 selže kvůli změnám v DB (někdo přejmenoval projekt) | Seed data nebudou kompletní | Migrace používá `WHERE name = 'X'` — pokud match selže, jen to pole zůstane null, žádná chyba. Manuálně doplníme přes UI. |
| Existující localStorage data u některého uživatele | Zmatek, uvidí staré + nové | V [src/store.jsx](../../../src/store.jsx) přidat jednorázový `localStorage.removeItem('ygg.projects.v1')` při startu nové verze |

---

## Zdroje a podklady

- Prozkoumání [src/store.jsx](../../../src/store.jsx), [src/auth.jsx](../../../src/auth.jsx), [src/data.jsx](../../../src/data.jsx), [server.js](../../../server.js)
- Existující [docs/GOOGLE_OAUTH_SETUP.md](../../../docs/GOOGLE_OAUTH_SETUP.md)
- Existující [migrations/001_auth_rls.sql](../../../migrations/001_auth_rls.sql)
- Ověření přes `curl http://localhost:3000/api/projects` (DB přístupná, schema má: id, name, icon, color, tag, desc, progress, users, team, log, subprojects)
- Dialog s uživatelem — volby A (Supabase), A+ (rozšíření DB), Render.com URL, admin přístup, Supabase dashboard přístup
