# FITTRACK — Personal Fitness Tracker (PWA)

FITTRACK is a mobile-first, offline-capable Progressive Web Application (PWA) built for iPhone users (via Safari's **Add to Home Screen**) and developed on Windows with zero paid APIs, zero backend, and zero App Store fees.

---

## 1. Features Included
- **Dashboard**: Daily calorie intake, hydration progress, today's workout status & plan, latest weight, 7-day workout stats, quick actions, and a 7-day activity chart.
- **Workout Tracker**: Create, edit, and delete workouts with exercises, sets, reps, weights, duration, and notes, plus 7-day and 30-day frequency charts.
- **Weight Tracker**: Log body weight in `kg` or `lbs`, view total weight change, 7-day/30-day trend charts, and measurement history.
- **Nutrition (Calorie Tracker & Meal Planner)**:
  - *Calorie Tracker*: Manually log foods (Breakfast, Lunch, Dinner, Snacks) with daily & 7-day summaries. Values are user-entered—no nutritional values are invented.
  - *Meal Planner*: Plan daily meals, save reusable meal ideas, and track estimated calories.
- **Water Tracker**: Set a daily hydration goal, quick-add `+250 ml`, `+500 ml`, or custom amounts, and view 7-day hydration history.
- **Exercise Library**: Beginner-friendly exercises across 6 categories (*Full body*, *Upper body*, *Lower body*, *Core*, *Cardio*, *Stretching*) with instructions, target muscles, recommended sets/reps, and safety tips.
- **Workout Plans**: 7-day beginner home schedule (Strength, Low-Impact Cardio, Active Recovery/Rest) with per-day customization.
- **Rest Timer**: 30s, 60s, 90s, 120s, and custom countdowns with Start, Pause, Reset, audio chime, and vibration alert.
- **Profile & Goals**: Age, height, current/target weight, optional gender, activity level, experience, goal, location, BMI calculation, and Mifflin-St Jeor calorie estimates (clearly marked as non-medical estimates).
- **Settings & Backup**: Unit switching (`kg`/`lbs`), JSON backup export/import with schema validation, and local data reset.

---

## 2. How to Run Locally on Windows
1. Open **PowerShell** or **Command Prompt** inside the `fittrack` folder.
2. Start a local web server using either Python or Node.js:
   ```powershell
   python -m http.server 8765
   ```
   *(Or with Node.js: `npx serve .`)*
3. Open `http://localhost:8765` in Chrome or Edge.
4. To preview iPhone size, press `F12` → click the **Toggle Device Toolbar** icon (`Ctrl+Shift+M`) → select **iPhone 14 Pro** or **390×844**.

---

## 3. Free HTTPS Deployment (GitHub Pages)
iPhone Safari requires **HTTPS** to install a PWA and run its Service Worker. GitHub Pages provides free HTTPS hosting:

1. Create a free account at [github.com](https://github.com) if you don't have one.
2. Create a new public repository named `fittrack`.
3. Upload all files inside the `fittrack/` folder (make sure `index.html`, `manifest.json`, and `sw.js` are at the root of the repository).
4. In your GitHub repository, go to **Settings → Pages**.
5. Under **Build and deployment → Source**, choose **Deploy from a branch**.
6. Select branch `main` and folder `/ (root)`, then click **Save**.
7. Wait 1–2 minutes. GitHub will display your live HTTPS URL (for example: `https://yourusername.github.io/fittrack/`).

*(Alternative free HTTPS hosts: **Netlify Drop** at `app.netlify.com/drop` or **Cloudflare Pages** — just drag and drop the `fittrack` folder.)*

---

## 4. Install on iPhone (Without App Store)
1. Open **Safari** on your iPhone (do not use Chrome or an in-app browser, as iOS requires Safari for Home Screen installation).
2. Visit your live HTTPS URL (e.g., `https://yourusername.github.io/fittrack/`).
3. Wait a few seconds for the page to finish loading so the offline Service Worker caches the app.
4. Tap the **Share** button at the bottom of Safari (the square with an arrow pointing up).
5. Scroll down the Share menu and tap **Add to Home Screen**.
6. Confirm the name **FITTRACK** and tap **Add** in the top-right corner.
7. Launch **FITTRACK** from your iPhone Home Screen. It opens full-screen without Safari's address bar and works offline.

---

## 5. Backup & Restore Instructions
> **Important:** All FITTRACK data is stored locally in IndexedDB on your device. **Local data does not automatically synchronize between devices** (for example, between your Windows PC and your iPhone).

- **To Back Up:** Open **More → Settings & Backup → Export JSON Backup**. Save the downloaded `fittrack-backup-YYYY-MM-DD.json` file to iCloud Drive, Google Drive, or your PC.
- **To Restore:** Open **More → Settings & Backup → Import JSON Backup** and select your `.json` backup file.

---

## 6. Testing Checklist
- [x] Unit tests pass (`node tests/unit-tests.mjs`): unit conversions, BMI, calorie estimates, date helpers, and backup validation.
- [x] Service Worker precache asset check: all 30 app-shell files exist on disk.
- [ ] **Manual iPhone Check**:
  - Install via Safari → Add to Home Screen.
  - Turn on **Airplane Mode**, open FITTRACK, and verify all 10 sections load offline.
  - Log a workout, weight, food entry, and water entry; force-close and reopen the app to confirm persistence.
  - Export a JSON backup and test importing it.
