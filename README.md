# Duty Teacher System (SIGAP)

[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

**Demo:** https://duty-teacher-system.pages.dev

A weekly **duty teacher** reporting system for private and international schools. Duty teachers fill in a report **for each day** (Monday–Friday) in 9 steps, and management reviews and approves it.

> 🇲🇾 *Versi Bahasa Melayu untuk sekolah kerajaan: [sistem-guru-bertugas](https://github.com/dontopa/sistem-guru-bertugas).*

## Daily report flow (9 steps)

1. Teacher attendance
2. Student attendance (by class, percentage calculated automatically)
3. Sick students & clinic visits
4. School grounds & facilities
5. Visitors (if any)
6. Discipline (late arrival, skipping class, etc.)
7. Daily activities
8. Management approval (teacher declaration → approve / return by administrator)
9. Done (summary, ready to print)

## Roles

| Role | Can do |
|---|---|
| **Teacher** (teal theme) | Manages 2–3 classes. Sees duty weeks & status of each day, fills in reports, submits for approval, makes corrections, prints reports |
| **Administrator** (indigo theme) | Analytics dashboard, approve / return reports with comments, manage the duty roster, manage users & each teacher's classes, **add / remove students**, school settings |

### Easy for teachers
- **Pick, don't type:** for health and discipline cases, teachers pick a class and then a student from a dropdown. Only the teacher's own classes are shown.
- **Attendance by name:** every student starts as present; the teacher taps the absent ones, then ticks "Attendance checked".
- **Save progress & resume:** each step has a *Save progress* button and every change is auto-saved. If the app is closed, the teacher is taken straight back to the last step on reopening.

## Demo accounts

| Role | Email | Password |
|---|---|---|
| Administrator (Principal) | `admin@sigap.edu.my` | `admin123` |
| Administrator (Head of Student Affairs) | `kamal@sigap.edu.my` | `admin123` |
| Teacher (on duty this week) | `aminah@sigap.edu.my` | `guru123` |
| Teacher (on duty this week) | `lim@sigap.edu.my` | `guru123` |
| Other teachers | `rajesh@`, `nurul@`, `faizal@`, `mariam@sigap.edu.my` | `guru123` |

Sample data: 6 classes × 10 students, each teacher manages 2–3 classes, a 7-week roster, and reports in every status (approved / pending / needs correction / draft), generated relative to today's date.

## Running locally

No build step — plain HTML, CSS & JavaScript.

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

## Deploying to Cloudflare Pages (free)

The site is static, so Cloudflare Pages can host it straight from GitHub on a free `*.pages.dev` domain.

1. Log in to [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
2. Pick the `duty-teacher-system` repo.
3. Build settings:
   - Framework preset: **None**
   - Build command: *(leave empty)*
   - Build output directory: `/`
4. **Save and Deploy**. The site will be live at `https://<project-name>.pages.dev`, and every `git push` to `main` redeploys automatically.

Or with the CLI:

```bash
npx wrangler pages deploy . --project-name duty-teacher-system
```

## Structure

```
index.html          Landing page (animation & motion)
login.html          Login + demo accounts
app.html            Dashboard (SPA, hash routing)
assets/css/         landing.css, app.css (teacher/admin themes & mobile layout)
assets/js/data.js   Data layer + sample data generator
assets/js/app.js    App logic (dashboard, 9-step wizard, approval, roster, classes & students, users, settings)
assets/img/         logo.svg, favicon.svg
```

> **Note:** This is a demo — data is stored in the browser's `localStorage` and passwords are not encrypted. For real use, `assets/js/data.js` needs to be connected to a backend (e.g. Laravel / Supabase / Firebase) with secure authentication.

## Contributing

Teachers, students and developers are welcome to contribute — report bugs, suggest features or send a pull request. Please read [CONTRIBUTING.md](CONTRIBUTING.md) first.

## License

[MIT](LICENSE) © 2026 dontopa ([designbywan.com](https://designbywan.com))
