# Student data collection (static · GitHub Pages)

Standalone folder for collecting student names before bulk import into **Project ULA** admin.

| Page | File | Who uses it |
|------|------|-------------|
| Student intake | `index.html` | Share with students |
| Staff records | `records.html` | You only (admin key) |

## What students fill

- Matric (`U22/FNS/CSC/1105`)
- First name, last name
- Program (fixed constant in `assets/config.js`)
- Email (optional)

## What you export

CSV rows match ULA admin **Bulk import**:

```text
"U22/FNS/CSC/1107", Ada, Lovelace, B.Sc Computer Science, ada@student.ula.edu
```

Each download increments a **batch counter** and names files like:

`ula-students-bulk-batch-001-2026-05-24.csv`

Paste the CSV into **Admin → Bulk import** in the main app.

---

## Quick test (no Google setup)

1. Open `index.html` in a browser (or `npx serve .` in this folder).
2. `assets/config.js` → `storageMode: "local"` (default).
3. Submit a few test students.
4. Open `records.html` → admin key from config → **Download all (CSV)**.

> Local mode only stores data in **that browser**. For real collection across phones/laptops, use Google Sheets mode below.

---

## Deploy to GitHub Pages

1. Copy this entire `student-data-collection` folder to a repo (or subfolder).
2. Repo **Settings → Pages →** deploy from branch, folder `/` or `/docs` if nested.
3. Add `.nojekyll` (already included) if using a subfolder on user/org pages.

Student link: `https://YOUR_USER.github.io/YOUR_REPO/`  
Records link: `https://YOUR_USER.github.io/YOUR_REPO/records.html` (do not share publicly)

---

## Production: Google Sheets backend (recommended)

1. Create a Google Sheet.
2. **Extensions → Apps Script** → paste `google-apps-script/Code.gs`.
3. Set `SECRET_ADMIN_KEY` in `Code.gs` (same string as `adminKey` in `assets/config.js`).
4. **Deploy → New deployment → Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
5. Copy the web app URL into `assets/config.js`:

```js
storageMode: "gas",
gasUrl: "https://script.google.com/macros/s/XXXX/exec",
adminKey: "ula-admin-change-me", // change this
```

6. Redeploy / push to GitHub Pages.

All submissions append to the **Students** sheet. Staff page fetches live data with the admin key.

---

## Customize

Edit `assets/config.js`:

- `program` — fixed program label for every student
- `institutionName`, `projectName`, `tagline`
- `adminKey` — protect `records.html`

---

## Security notes

- Change `adminKey` before going live.
- Do not post `records.html` in student group chats.
- Google Script URL is public; only the **key** gates writes/reads.
- For stricter security, use a proper backend (Supabase, Firebase) later.
