# Teacher Daily Diary — Ready for GitHub Pages

This folder contains a lightweight, client-side Teacher Daily Diary web app. It runs entirely in the browser and uses `localStorage` for persistence.

## Included files
- `index.html` — main page
- `styles.css` — extracted styles
- `app.js` — JavaScript logic (refactored and fixed)
- `manifest.json` — PWA manifest
- `sw.js` — simple service worker for basic offline shell caching
- `.nojekyll` — included to allow files/paths starting with underscore (if needed)

## Features added / fixes
- Split CSS/JS from single file for better maintainability.
- Fixed initialization bugs (class/period seeding, auto date).
- Proper session handling and profile loading.
- Export entries as JSON and CSV.
- Import entries from JSON.
- Simple search/filter for entries in Recent Entries.
- Admin panel fix so admins cannot change their own status.
- PWA manifest and service worker for basic installability.
- Ready for deployment to GitHub Pages: push the folder to a repository and enable GitHub Pages on `main` branch (or `gh-pages`).

## How to upload
1. Create a new GitHub repository.
2. Upload all files from this folder to the repository root (or push via `git`).
3. Enable GitHub Pages in repository settings (use `main` branch / root).
4. Your site will be available at `https://<username>.github.io/<repo>/`.

## Notes & privacy
- All data is stored locally in the user's browser (`localStorage`). There is no server component.
- For backups use the Export JSON/CSV feature.



## Google Drive Backup (Client-side)

This app includes a client-side Google Drive backup feature that uploads a JSON backup to *your* Google Drive. **Important:** It cannot upload to another person's Drive (e.g., accessiblew@gmail.com) without that person's explicit Google sign-in/consent.

To enable Drive backups:
1. Go to Google Cloud Console: https://console.cloud.google.com/
2. Create a new project (or use an existing one).
3. Under "APIs & Services" → "OAuth consent screen", configure an External consent screen (you can keep it in testing for personal use).
4. Under "Credentials" create an OAuth 2.0 Client ID of type "Web application".
   - Add the authorized JavaScript origin (e.g., `https://<your-username>.github.io`)
   - Add the authorized redirect URI (e.g., `https://<your-username>.github.io/`)
5. Copy the Client ID and paste it into `app.js` at `DRIVE_CLIENT_ID`.
6. Deploy the site (GitHub Pages) and use the "Backup to Drive" button. A Google sign-in popup will appear; follow on-screen prompts.

**Security & privacy:** The backup flow uses OAuth; the app only receives an access token for the user's Drive and uploads a *single JSON file* to that user's Drive. No credentials are stored by the app outside the user's browser.

_NOTE:_ If you want automated backups to a specific account (like `accessiblew@gmail.com`), that account must perform the OAuth sign-in on the device (granting permission) or you must implement a server-side service account + Drive API with proper consent — which cannot be safely embedded in a public static site.

## Admin 'Superpowers'
- Admins (users with `isAdmin: true`) can:
  - Enable/Disable other users
  - Reset passwords to default (`user123`)
  - Delete users and their entries
  - Download a user's entries
  - Export all users data as a single JSON (download)

## Accessibility improvements
- Skip link, visible focus outlines, ARIA labels, table summaries.
- Keyboard focusable controls and improved contrast.
- Printable view for selected date ranges.



## Server sync
Set `API_BASE` in `client/app.js` to your deployed server URL (e.g., https://teacher-diary.example.com). The app will attempt to sync local entries to server when it detects `online`.
