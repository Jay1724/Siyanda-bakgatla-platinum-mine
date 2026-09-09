# SBPM Website Rebuild — Handoff to Claude Code

## Context
Static HTML/CSS rebuild of the Siyanda Bakgatla Platinum Mine website
(previously Wix, live at https://www.siyandaplatinum.com/), commissioned
by Junior Sebilimetsa / Yugen Studio for Siyanda Resources (recurring
client — see prior work: Group annual/impact report, 24-slide PDF/PPTX
deck, hosted at jay1724.github.io/Siyanda-report).

This rebuild is a **separate visual system from the Group report**. The
Group report uses a dark charcoal/gold/cream palette with Playfair
Display + DM Sans. This mine site deliberately uses a **lighter,
industrial "site-drawing" aesthetic** instead — do not merge the two
systems or pull the Group report's tokens into this project.

No build tooling — plain HTML + one shared stylesheet. No JS framework,
no bundler, no package.json. Open `index.html` directly or serve the
folder as static files.

## What's done

13 pages, all with real copy scraped from the live Wix site (not
lorem ipsum):

| File | Section |
|---|---|
| `index.html` | Home |
| `about-us.html` | About Us |
| `leadership.html` | About Us → Leadership |
| `what-we-do.html` | About Us → What We Do |
| `sustainability.html` | Sustainability (hub) |
| `our-community.html` | Sustainability → Our Community |
| `projects.html` | Sustainability → Projects |
| `safety.html` | Sustainability → Safety |
| `social-labour-plan.html` | Sustainability → Social Labour Plan |
| `covid-19.html` | Sustainability → Covid 19 |
| `news.html` | News & Insights |
| `careers.html` | Careers |
| `tenders.html` | Tenders |
| `contact.html` | Contact |

Shared stylesheet: `assets/css/main.css` (~320 lines). Every page links
it the same way — no per-page `<style>` blocks, no inline CSS beyond a
handful of one-off `style=""` tweaks (mostly aspect-ratio overrides on
placeholder image blocks — safe to leave).

There is no shared header/footer include mechanism at runtime (no SSI,
no JS partials) — each HTML file has the nav and footer written out in
full. **If you edit nav links, footer links, or the whistleblower band,
you must edit all 13 files.** (They were originally generated from a
Python script with header/footer fragments, but that scaffolding was
deleted after generation — the HTML files are now the source of truth,
not the script.)

## Design system (do not casually change)

Tokens live at the top of `assets/css/main.css` as CSS custom
properties on `:root`:

```css
--ground:      #EDEAE2   /* page background — warm concrete */
--panel:       #FAF9F6   /* card/panel background */
--ink:         #1C1B19   /* primary text, near-black */
--ink-soft:    #514E47   /* secondary text */
--line:        #C7C0B2   /* hairline borders/rules */
--bronze:      #8A6D3B   /* accent — ore/bronze */
--bronze-deep: #6B5127   /* accent hover/deep */
--green:       #3F5A4D   /* safety-green, used on CTA bands */
--green-deep:  #2C4038   /* CTA band background */
```

Fonts (Google Fonts, imported at the top of main.css):
- **Fraunces** — serif, all headings (`h1`–`h4`, `.kicker`)
- **IBM Plex Sans** — body/UI
- **IBM Plex Mono** — small labels (`.section-mark`, `.hero-eyebrow`,
  person role labels, stat labels)

Concept: think site-drawing / survey-sheet, not corporate brochure.
Thin hairline rules everywhere (`.rule`, `var(--edge)`), section
markers use real mine terminology as labels (reef names, commodity
symbols) rather than generic "01/02/03" eyebrows wherever possible.
One deliberate bold moment: the periodic-table-style commodity grid
(`.elements` / `.element`) on `what-we-do.html` — Pt, Rh, Ir, Pd, Ru,
Cr, Au, Co, Ni, Cu. Keep the rest of the site quiet and structural
around that.

Avoid reintroducing generic AI-design defaults if extending this: no
ALL-CAPS eyebrow labels with letter-spacing as a default move, no
rounded-card-with-soft-shadow kit, no terracotta (`#D97757`-ish)
accent, no em-dash-joined meta strings.

Full design rationale (palette reasoning, typography choice, layout
concept) is in the chat history if you need the "why" — not
duplicated here to keep this doc short.

## Key CSS building blocks (reuse these, don't reinvent)

- `.wrap` — max-width 1180px content container, use inside every
  `section`
- `section` — vertical rhythm + bottom hairline border; last section
  on a page should get `style="border-bottom:none;"`
- `.section-mark` — small mono label with a leading dash, e.g. `<div
  class="section-mark">WHAT WE DO</div>`
- `.kicker` — serif sub-headline (h2-ish, used freely, not a real h2
  everywhere — check semantic heading levels before assuming)
- `.lead-text` — body copy paragraph, ~62ch max-width
- `.grid-2` / `.grid-3` / `.grid-4` — CSS grid with 1px gap on a
  `var(--line)` background, creating hairline dividers between cells;
  children should be `.cell`
- `.ph` — placeholder image block (diagonal hairline pattern +
  centered mono caption describing what photo belongs there). **Every
  image on the site is currently one of these.** Search for `class="ph"`
  to find all of them.
- `.elements` / `.element` — the periodic-table commodity grid
- `.person` / `.person-photo` / `.person-body` — exec bio cards on
  leadership.html
- `.hod` / `.hod-photo` — smaller headshot grid, also on
  leadership.html
- `.stat-strip` / `.stat` — the four-stat band under the homepage hero
  and on social-labour-plan.html
- `.band` — dark green CTA section (careers band on homepage, careers
  page vacancies band)
- `.tipoff` — the bronze whistleblower strip above the footer, present
  on every page except safety.html (which has the same message worked
  into its body copy instead)
- `.doc-list` — bordered pill links for PDF downloads (annual reports,
  SLP documents)
- `table.contact-table` — label/value rows, used on contact.html

Nav: `.site-header` is `position:sticky`. Desktop nav is
`nav.primary` with `.nav-item` entries; `.dropdown` children show on
`:hover` above 960px. Below 960px, `.nav-toggle` (button, id
`navToggle`) is shown and a small inline `<script>` block (present in
every file's `<head>`/header area) toggles `.open` on `nav.primary`.
**This script is duplicated per file** — if you touch the toggle
behavior, grep for `navToggle` across all 13 files.

## Known gaps / explicitly deferred

1. **All images are placeholders.** Every `.ph` block has a caption
   describing what should go there (e.g. "Hero photo — shaft headgear
   / open pit, wide crop"). Junior is sourcing real photography
   separately. When real images land: put them in `assets/img/`,
   swap the `.ph` div for an `<img>`, and drop the `.ph` class (it
   applies the diagonal placeholder pattern via `background`, which
   you don't want under a real photo — the border/aspect-ratio can
   stay if useful).

2. **`news.html` and `tenders.html` are stubs.** The live Wix site's
   News/Insights is a blog listing (dynamic) and Tenders was empty at
   scrape time. Both pages currently have one real content block
   (news.html has the one CFO Imraan Osman story that's also on the
   homepage) plus an italic placeholder line. These need real content
   or a CMS/listing pattern once Junior has it — don't invent
   articles or tenders.

3. **`covid-19.html` is thin.** The original Wix page for this was
   never fetched in detail (deprioritized as low-value/dated content
   during the build). Current copy is a reasonable placeholder
   paraphrase, not scraped verbatim — flag to Junior if he wants the
   original page content pulled in.

4. **Forms don't submit anywhere.** The newsletter signup (home page)
   and contact form (contact.html) are markup only — no `action`,
   no JS handler, no backend. Needs a form endpoint (Formspree,
   Netlify Forms, custom backend, etc.) before launch.

5. **PDF links point at the old Wix-hosted files**
   (`siyandaplatinum.com/_files/ugd/...`). These still work today
   since the old site is live, but if/when Wix hosting lapses these
   links break. Annual reports, SLP documents — search `_files/ugd`
   across the HTML files to find all of them. Will need re-hosting
   alongside this site eventually.

6. **No sitemap.xml, robots.txt, or favicon yet.**

7. **Accessibility pass not done.** Basic semantic HTML and visible
   focus states are in via normal browser defaults, but no explicit
   ARIA beyond `aria-expanded`/`aria-controls` on the mobile nav
   toggle. Worth a proper pass (alt text once real images land, form
   label associations — labels are already correctly paired via
   `for`/`id`, heading order check, color contrast check on
   `--ink-soft` on `--ground`).

8. **No `.htaccess` / redirects file** from old Wix slugs (e.g.
   `/s-projects-side-by-side`, `/contact-5`) to new clean ones. This
   rebuild renamed those to `projects.html` and `contact.html`. If
   this replaces the live site at the same domain, old inbound links
   / search rankings will need redirects.

## Content source of truth

All copy was fetched live from siyandaplatinum.com page-by-page during
the build (About Us, Leadership, What We Do, Sustainability, Our
Community, Safety, Social Labour Plan, Projects, Careers, Contact were
fetched in full; News/Tenders/Covid-19 were not deeply scraped — see
gaps above). Nothing was invented except section transitions and a
handful of connective sentences on the stub pages. If content looks
wrong or outdated, the live Wix site is still the reference, not this
document.

## Suggested next steps for Claude Code

1. Get real photography from Junior, replace `.ph` blocks page by
   page (leadership headshots first — highest count, most visible gap).
2. Wire up the contact form and newsletter signup to a real endpoint.
3. Build out `news.html` as a proper listing once Junior has more
   articles, or connect it to whatever CMS/data source he chooses.
4. Fill in `tenders.html` with real/current tenders or a "no open
   tenders" empty state that matches the design system (a basic one
   exists already — refine once real workflow is known).
5. Re-fetch `covid-19.html`'s original content if Junior wants it
   verbatim rather than the current paraphrase.
6. Add favicon, sitemap.xml, robots.txt, meta OG tags per page
   (currently only `index.html`-level meta description exists; other
   pages just have `<title>`).
7. Rehost the PDFs referenced from Wix before old hosting lapses.
