# SBPM Content Manager — setup guide

This connects the content manager (`sbpm-cms.html`) and the live site's
dynamic pages (News, Tenders, Careers, Projects) to a real, free
database so content you publish actually shows up on the website.

Takes about 10 minutes, no coding required beyond pasting two values.

## 1. Create a Supabase project

1. Go to **supabase.com** and sign up (free tier is enough for this).
2. Click **New project**. Pick any name (e.g. "sbpm-site"), set a
   database password (save it somewhere), choose a region close to
   South Africa if offered, and create it. Takes about 2 minutes to
   spin up.

## 2. Create the content tables

1. In your new project, open the **SQL Editor** (left sidebar).
2. Click **New query**.
3. Open `supabase-setup.sql` (included alongside this guide), copy
   everything, and paste it into the SQL editor.
4. Click **Run**. You should see "Success. No rows returned."

This creates four tables — `news`, `tenders`, `careers`, `projects` —
and sets up the permissions so the public website can only ever see
*published* items, while the CMS (via its PIN login) can see and edit
everything including drafts.

## 3. Copy your project's API keys

1. In Supabase, go to **Project Settings** (gear icon) → **API**.
2. You'll see two values you need:
   - **Project URL** — looks like `https://abcdefgh.supabase.co`
   - **anon / public key** (Supabase may label this **publishable
     key** — `sb_publishable_...` — on newer projects; either works
     the same way) — a long string starting with `eyJ...` or
     `sb_publishable_...`

Keep this tab open — you'll paste both values into 5 files next.

## 4. Paste your keys into the site files

Each of these files has two lines near the top (in `cms.html`) or
inside a `<script>` near the bottom (in the four site pages) that
look like:

```js
const SUPABASE_URL = 'YOUR_SUPABASE_URL_HERE';
const SUPABASE_KEY = 'YOUR_SUPABASE_ANON_KEY_HERE';
```

Replace both placeholder strings with your actual Project URL and
anon/public key in **all five** of these files:

- `sbpm-cms.html` (the content manager itself)
- `news.html`
- `tenders.html`
- `careers.html`
- `projects.html`

Use find-and-replace in a text editor to do this quickly and
consistently — the values must be identical across all five files.

**Important:** only ever use the **anon / public key** here, never
the **service_role / secret key**. The anon key is designed to be
public and is safe to paste into these files; the service_role key
bypasses all security rules and must never appear in a file that
goes on a website.

## 5. Re-upload the site

Once the keys are pasted in, re-upload/redeploy the five changed
files to wherever the site is hosted (GitHub Pages, etc.), replacing
the old versions.

## 6. Try it

1. Open `sbpm-cms.html` in a browser.
2. Sign in as **Admin** with PIN `2468` (or as **Client / Editor**
   with PIN `1357` — see "Changing the PINs" below).
3. Add a News article, fill in a title, and click **Publish**.
4. Open `news.html` — the article should appear.

If nothing appears, open the browser console (right-click → Inspect →
Console tab) on either page — any Supabase connection error will show
there, and usually points straight at a mistyped key or a step above
that got skipped.

## Changing the PINs

Open `sbpm-cms.html`, find this line near the top of the `<script>`:

```js
const PINS = { admin: '2468', editor: '1357' };
```

Change the two numbers to whatever you like, save, and re-upload.
There's no way to recover a forgotten PIN other than opening this
file and reading it, so keep a copy of your chosen PINs somewhere
safe.

## How permissions work

- **Admin** (PIN `2468` by default) can create, edit, publish, and
  delete anything in all four content types.
- **Client / Editor** (PIN `1357` by default) can create and edit
  content and save it as a **draft**, but cannot publish or delete.
  A draft only becomes visible on the live site once an Admin opens
  it and clicks **Publish**.

This gives the client a safe way to draft their own content without
being able to accidentally take something live or delete something
permanently.

## Limitations worth knowing

- **No file/image uploads.** The CMS handles text content only —
  titles, summaries, body text, dates. Photos still need to be added
  to the site's `assets/img/` folder and referenced in the HTML
  directly; this CMS doesn't manage images.
- **PINs, not real accounts.** Anyone with a PIN can publish under
  that role; there's no per-person login or audit trail beyond the
  "edited by Admin / Client" label saved on each item. If you need
  named user accounts down the line, that's a Supabase Auth upgrade
  from here, not a rebuild.
- **The anon key is visible in your site's source code.** This is
  normal and expected for Supabase (see step 4 above) — the actual
  security is enforced by the database rules (Row Level Security)
  set up in `supabase-setup.sql`, not by hiding the key.
- **Free tier limits.** Supabase's free tier is generous for a site
  this size (500MB database, plenty of API requests) but does pause
  a project after a week of no activity — it wakes back up
  automatically on the next request, with a few seconds' delay.
