# Mode: scan — Portal Scanner (Job Discovery)

Scans configured job portals, filters by title relevance, and adds new offers to the pipeline for later evaluation.

## Recommended Execution

Run as a subagent to avoid consuming main context:

```
Agent(
    subagent_type="general-purpose",
    prompt="[contents of this file + specific data]",
    run_in_background=True
)
```

## Configuration

Read `portals.yml` which contains:
- `search_queries`: List of WebSearch queries with `site:` filters by portal (broad discovery)
- `tracked_companies`: Specific companies with `careers_url` for direct navigation
- `title_filter`: Positive/negative/seniority_boost keywords for title filtering

## Discovery Strategy (3 levels)

### Level 1 — Direct Playwright (PRIMARY)

**For each company in `tracked_companies`:** Navigate to their `careers_url` with Playwright (`browser_navigate` + `browser_snapshot`), read ALL visible job listings, and extract title + URL from each one. This is the most reliable method because:
- Sees the page in real time (not cached Google results)
- Works with SPAs (Ashby, Lever, Workday)
- Detects new offers instantly
- Doesn't depend on Google indexing

**Each company MUST have `careers_url` in portals.yml.** If missing, search for it once, save it, and use in future scans.

### Nivel 2 — ATS APIs / Feeds (COMPLEMENTARIO)

Para empresas con API pública o feed estructurado, usar la respuesta JSON/XML como complemento rápido de Nivel 1. Es más rápido que Playwright y reduce errores de scraping visual.

**Soporte actual (variables entre `{}`):**
- **Greenhouse**: `https://boards-api.greenhouse.io/v1/boards/{company}/jobs`
- **Ashby**: `https://jobs.ashbyhq.com/api/non-user-graphql?op=ApiJobBoardWithTeams`
- **BambooHR**: lista `https://{company}.bamboohr.com/careers/list`; detalle de una oferta `https://{company}.bamboohr.com/careers/{id}/detail`
- **Lever**: `https://api.lever.co/v0/postings/{company}?mode=json`
- **Teamtailor**: `https://{company}.teamtailor.com/jobs.rss`
- **Workday**: `https://{company}.{shard}.myworkdayjobs.com/wday/cxs/{company}/{site}/jobs`

**Convención de parsing por provider:**
- `greenhouse`: `jobs[]` → `title`, `absolute_url`
- `ashby`: GraphQL `ApiJobBoardWithTeams` con `organizationHostedJobsPageName={company}` → `jobBoard.jobPostings[]` (`title`, `id`; construir URL pública si no viene en payload)
- `bamboohr`: lista `result[]` → `jobOpeningName`, `id`; construir URL de detalle `https://{company}.bamboohr.com/careers/{id}/detail`; para leer el JD completo, hacer GET del detalle y usar `result.jobOpening` (`jobOpeningName`, `description`, `datePosted`, `minimumExperience`, `compensation`, `jobOpeningShareUrl`)
- `lever`: array raíz `[]` → `text`, `hostedUrl` (fallback: `applyUrl`)
- `teamtailor`: RSS items → `title`, `link`
- `workday`: `jobPostings[]`/`jobPostings` (según tenant) → `title`, `externalPath` o URL construida desde el host

**Supported providers** (auto-detected from URL domain):

| Provider | URL pattern | Jobs array | Title | URL | Location |
|----------|------------|------------|-------|-----|----------|
| Greenhouse | `boards-api.greenhouse.io` | `jobs[]` | `.title` | `.absolute_url` | `.location.name` |
| Ashby | `api.ashbyhq.com` | `jobs[]` | `.title` | `.jobUrl` | `.location` |
| Lever | `api.lever.co` | top-level `[]` | `.text` | `.hostedUrl` | `.categories.location` |

**Truncation detection:** If the API response has a suspiciously round job count (100/250/500/1000), pagination tokens (`has_more`, `next`, `nextPageToken`), or the company's `notes` warn about truncation — the company is flagged for Playwright/websearch fallback.

### Level 3 — WebSearch queries (BROAD DISCOVERY)

The `search_queries` with `site:` filters cover portals broadly (all Ashby, all Greenhouse, etc.). Useful for discovering NEW companies not yet in `tracked_companies`, but results may be stale.

**Execution priority:**
1. Level 2: API → `node scan-api.mjs` (fast, structured, cheap)
2. Level 1: Playwright → companies WITHOUT `api`, plus API failures/truncations
3. Level 3: WebSearch → all `search_queries` with `enabled: true`

API is attempted first for companies that have it. Playwright/websearch is the fallback.

## Workflow

1. **Leer configuración**: `portals.yml`
2. **Leer historial**: `data/scan-history.tsv` → URLs ya vistas
3. **Leer dedup sources**: `data/applications.md` + `data/pipeline.md`

4. **Nivel 1 — Playwright scan** (paralelo en batches de 3-5):
   Para cada empresa en `tracked_companies` con `enabled: true` y `careers_url` definida:
   a. `browser_navigate` a la `careers_url`
   b. `browser_snapshot` para leer todos los job listings
   c. Si la página tiene filtros/departamentos, navegar las secciones relevantes
   d. Para cada job listing extraer: `{title, url, company}`
   e. Si la página pagina resultados, navegar páginas adicionales
   f. Acumular en lista de candidatos
   g. Si `careers_url` falla (404, redirect), intentar `scan_query` como fallback y anotar para actualizar la URL

5. **Nivel 2 — ATS APIs / feeds** (paralelo):
   Para cada empresa en `tracked_companies` con `api:` definida y `enabled: true`:
   a. WebFetch de la URL de API/feed
   b. Si `api_provider` está definido, usar su parser; si no está definido, inferir por dominio (`boards-api.greenhouse.io`, `jobs.ashbyhq.com`, `api.lever.co`, `*.bamboohr.com`, `*.teamtailor.com`, `*.myworkdayjobs.com`)
   c. Para **Ashby**, enviar POST con:
      - `operationName: ApiJobBoardWithTeams`
      - `variables.organizationHostedJobsPageName: {company}`
      - query GraphQL de `jobBoardWithTeams` + `jobPostings { id title locationName employmentType compensationTierSummary }`
   d. Para **BambooHR**, la lista solo trae metadatos básicos. Para cada item relevante, leer `id`, hacer GET a `https://{company}.bamboohr.com/careers/{id}/detail`, y extraer el JD completo desde `result.jobOpening`. Usar `jobOpeningShareUrl` como URL pública si viene; si no, usar la URL de detalle.
   e. Para **Workday**, enviar POST JSON con al menos `{"appliedFacets":{},"limit":20,"offset":0,"searchText":""}` y paginar por `offset` hasta agotar resultados
   f. Para cada job extraer y normalizar: `{title, url, company}`
   g. Acumular en lista de candidatos (dedup con Nivel 1)

6. **Nivel 3 — WebSearch queries** (paralelo si posible):
   Para cada query en `search_queries` con `enabled: true`:
   a. Ejecutar WebSearch con el `query` definido
   b. De cada resultado extraer: `{title, url, company}`
      - **title**: del título del resultado (antes del " @ " o " | ")
      - **url**: URL del resultado
      - **company**: después del " @ " en el título, o extraer del dominio/path
   c. Acumular en lista de candidatos (dedup con Nivel 1+2)

6. **Filtrar por título** usando `title_filter` de `portals.yml`:
   - Al menos 1 keyword de `positive` debe aparecer en el título (case-insensitive)
   - 0 keywords de `negative` deben aparecer
   - `seniority_boost` keywords dan prioridad pero no son obligatorios

7. **Deduplicar** contra 3 fuentes:
   - `scan-history.tsv` → URL exacta ya vista
   - `applications.md` → empresa + rol normalizado ya evaluado
   - `pipeline.md` → URL exacta ya en pendientes o procesadas

7.5. **Verificar liveness de resultados de WebSearch (Nivel 3)** — ANTES de añadir a pipeline:

   Los resultados de WebSearch pueden estar desactualizados (Google cachea resultados durante semanas o meses). Para evitar evaluar ofertas expiradas, verificar con Playwright cada URL nueva que provenga del Nivel 3. Los Niveles 1 y 2 son inherentemente en tiempo real y no requieren esta verificación.

   Para cada URL nueva de Nivel 3 (secuencial — NUNCA Playwright en paralelo):
   a. `browser_navigate` a la URL
   b. `browser_snapshot` para leer el contenido
   c. Clasificar:
      - **Activa**: título del puesto visible + descripción del rol + control visible de Apply/Submit/Solicitar dentro del contenido principal. No contar texto genérico de header/navbar/footer.
      - **Expirada** (cualquiera de estas señales):
        - URL final contiene `?error=true` (Greenhouse redirige así cuando la oferta está cerrada)
        - Página contiene: "job no longer available" / "no longer open" / "position has been filled" / "this job has expired" / "page not found"
        - Solo navbar y footer visibles, sin contenido JD (contenido < ~300 chars)
   d. Si expirada: registrar en `scan-history.tsv` con status `skipped_expired` y descartar
   e. Si activa: continuar al paso 8

   **No interrumpir el scan entero si una URL falla.** Si `browser_navigate` da error (timeout, 403, etc.), marcar como `skipped_expired` y continuar con la siguiente.

8. **Para cada oferta nueva verificada que pase filtros**:
   a. Añadir a `pipeline.md` sección "Pendientes": `- [ ] {url} | {company} | {title}`
   b. Registrar en `scan-history.tsv`: `{url}\t{date}\t{query_name}\t{title}\t{company}\tadded`

9. **Ofertas filtradas por título**: registrar en `scan-history.tsv` con status `skipped_title`
10. **Ofertas duplicadas**: registrar con status `skipped_dup`
11. **Ofertas expiradas (Nivel 3)**: registrar con status `skipped_expired`

## Extracción de título y empresa de WebSearch results

Los resultados de WebSearch vienen en formato: `"Job Title @ Company"` o `"Job Title | Company"` o `"Job Title — Company"`.

Patrones de extracción por portal:
- **Ashby**: `"Senior AI PM (Remote) @ EverAI"` → title: `Senior AI PM`, company: `EverAI`
- **Greenhouse**: `"AI Engineer at Anthropic"` → title: `AI Engineer`, company: `Anthropic`
- **Lever**: `"Product Manager - AI @ Temporal"` → title: `Product Manager - AI`, company: `Temporal`

Generic regex: `(.+?)(?:\s*[@|—–-]\s*|\s+at\s+)(.+?)$`

## Private URLs

If a publicly inaccessible URL is found:
1. Save the JD in `jds/{company}-{role-slug}.md`
2. Add to pipeline.md as: `- [ ] local:jds/{company}-{role-slug}.md | {company} | {title}`

## Scan History

`data/scan-history.tsv` tracks ALL URLs seen:

```
url	first_seen	portal	title	company	status
https://...	2026-02-10	Ashby — AI PM	PM AI	Acme	added
https://...	2026-02-10	Greenhouse — SA	Junior Dev	BigCo	skipped_title
https://...	2026-02-10	Ashby — AI PM	SA AI	OldCo	skipped_dup
https://...	2026-02-10	WebSearch — AI PM	PM AI	ClosedCo	skipped_expired
```

## Output Summary

```
Portal Scan — {YYYY-MM-DD}
━━━━━━━━━━━━━━━━━━━━━━━━━━
Queries executed: N
Offers found: N total
Filtered by title: N relevant
Duplicates: N (already evaluated or in pipeline)
Expired discarded: N (dead links, Level 3)
New added to pipeline.md: N

  + {company} | {title} | {query_name}
  ...

→ Run /career-ops pipeline to evaluate the new offers.
```

## Managing careers_url

Each company in `tracked_companies` should have `careers_url` — the direct URL to their jobs page. This avoids searching for it every time.

**Known patterns by platform:**
- **Ashby:** `https://jobs.ashbyhq.com/{slug}`
- **Greenhouse:** `https://job-boards.greenhouse.io/{slug}` or `https://job-boards.eu.greenhouse.io/{slug}`
- **Lever:** `https://jobs.lever.co/{slug}`
- **BambooHR:** lista `https://{company}.bamboohr.com/careers/list`; detalle `https://{company}.bamboohr.com/careers/{id}/detail`
- **Teamtailor:** `https://{company}.teamtailor.com/jobs`
- **Workday:** `https://{company}.{shard}.myworkdayjobs.com/{site}`
- **Custom:** La URL propia de la empresa (ej: `https://openai.com/careers`)

**Patrones de API/feed por plataforma:**
- **Ashby API:** `https://jobs.ashbyhq.com/api/non-user-graphql?op=ApiJobBoardWithTeams`
- **BambooHR API:** lista `https://{company}.bamboohr.com/careers/list`; detalle `https://{company}.bamboohr.com/careers/{id}/detail` (`result.jobOpening`)
- **Lever API:** `https://api.lever.co/v0/postings/{company}?mode=json`
- **Teamtailor RSS:** `https://{company}.teamtailor.com/jobs.rss`
- **Workday API:** `https://{company}.{shard}.myworkdayjobs.com/wday/cxs/{company}/{site}/jobs`

**Si `careers_url` no existe** para una empresa:
1. Intentar el patrón de su plataforma conocida
2. Si falla, hacer un WebSearch rápido: `"{company}" careers jobs`
3. Navegar con Playwright para confirmar que funciona
4. **Guardar la URL encontrada en portals.yml** para futuros scans

**Si `careers_url` devuelve 404 o redirect:**
1. Anotar en el resumen de salida
2. Intentar scan_query como fallback
3. Marcar para actualización manual

## Mantenimiento del portals.yml

- **SIEMPRE guardar `careers_url`** cuando se añade una empresa nueva
- Añadir nuevos queries según se descubran portales o roles interesantes
- Desactivar queries con `enabled: false` si generan demasiado ruido
- Ajustar keywords de filtrado según evolucionen los roles target
- Añadir empresas a `tracked_companies` cuando interese seguirlas de cerca
- Verificar `careers_url` periódicamente — las empresas cambian de plataforma ATS
