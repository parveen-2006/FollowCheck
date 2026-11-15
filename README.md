# Instagram Follower Tracker

A personal dashboard for comparing the followers and following lists in your Instagram data export. The app runs in your browser and saves the latest comparison in that browser's local storage.

## What it does

- Reads an Instagram export ZIP, selected JSON files, or the extracted `connections/follower-and-following` folder.
- Supports multiple follower files such as `followers_1.json`, plus `following.json`.
- Compares the two lists and shows:
  - **They don’t follow you back:** accounts you follow that don’t follow you.
  - **You haven’t followed back:** accounts that follow you that you don’t follow.
  - **Mutual followers:** accounts in both lists.
- Shows counts, a follower-to-following ratio, and changes between uploaded snapshots.
- Filters and searches usernames, displays the results in a paginated table, and exports the selected category to CSV.
- Supports light and dark themes.

## Privacy

Instagram export files are read and compared locally in the browser. The app has no backend, database, Instagram API connection, or login flow. The latest comparison is saved in browser `localStorage` so it remains available on that device. Use **Erase local data** in the dashboard to remove the saved snapshot. Clearing browser site data also removes it.

## Requirements

- Node.js 20 or newer (Node.js 18.18+ should also work with the pinned Vite toolchain).
- npm.

## Run locally

Open a terminal in the `frontend` folder and run:

```sh
npm install
npm run dev
```

Vite prints a local address (usually `http://localhost:5173`). Open it in a browser. To make a production build, run:

```sh
npm run build
npm run preview
```

## Deploy with GitHub Pages

The GitHub Actions workflow builds and deploys the app whenever changes are pushed to the `Main` branch. To enable it the first time:

1. Push this repository, including `.github/workflows/deploy.yml`, to GitHub.
2. In the repository on GitHub, open **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to **GitHub Actions**.
4. Open the **Actions** tab and wait for the **Deploy to GitHub Pages** workflow to complete.

The app will be available at <https://parveen-2006.github.io/FollowCheck/>. Future pushes to `Main` automatically publish updates, usually within a few minutes. The Instagram export continues to be processed only in each visitor's browser.

## Get your Instagram export

Request a download of your Instagram information using Instagram's account settings. Choose JSON as the export format and include followers and following information. After downloading and extracting the ZIP, find the `connections/follower-and-following` folder.

## Upload your export

1. Open the app and choose **Upload export**, or drag the export files onto the upload area.
2. Select the original ZIP, both the follower and following JSON files together, or choose the extracted folder.
3. Wait for the on-screen confirmation. The dashboard will show the comparison from that export.
4. Use the category tabs and search field to find accounts. Choose 10, 20, 50, or 100 rows per table page.
5. Choose **Export CSV** to download the currently selected category.

Upload a newer export to refresh the saved comparison and compare it with the previous snapshot. Snapshot changes describe the time between exports; they are not real-time Instagram activity.

## Project structure

```text
frontend/
├── src/
│   ├── lib/
│   │   ├── comparison.js
│   │   ├── exportCSV.js
│   │   └── instagramParser.js
│   ├── App.jsx
│   ├── main.jsx
│   └── styles.css
├── index.html
├── package.json
├── vite.config.js
└── README.md
```

`instagramParser.js` reads ZIP/JSON export files and extracts account names. `comparison.js` normalizes names and calculates the three relationship lists and snapshot changes. `exportCSV.js` generates CSV downloads.

## Notes

- Use follower and following files from the same Instagram export for a meaningful comparison.
- The parser supports Instagram's `relationships_following` structure and its username fields, including `title` and profile URLs when `value` is absent.
- No passwords, cookies, or session tokens are needed or accepted.
