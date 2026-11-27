# Mortal

**One Life. Infinite Possibilities.**

Mortal is an offline-first life simulation for mobile browsers, Android, and iOS. Start with a random or custom character in the fictional country of Veyra, advance a year at a time, and see how your decisions shape your life journal.

## Play in a browser

Use Node.js 24 LTS, or Node.js 22.18 or later in the 22.x line, and npm. From the project directory, run:

```sh
npm ci
npm run web
```

Open [Mortal in your browser](http://127.0.0.1:5173). The site adapts to phone and desktop widths. For a phone on the same trusted Wi-Fi network, run `npm run web -- --host 0.0.0.0` and open the Network address printed by Vite.

The browser stores its own lives in IndexedDB. Keep using the same address and browser profile to access them. Saves from Expo Go or a native install are kept in that app’s SQLite database.

Use `npm run build:web` to generate the static site in `dist/web`. Run `npm run preview:web` to test that build locally on the same port after stopping the development server. The built site can be served by any static host. On HTTPS or loopback, it caches the game after the first successful visit so it can reopen offline once the service worker takes control.

## Run the native app on a phone

Use Node.js 24 LTS, or Node.js 22.18 or later in the 22.x line, and npm.

```sh
npm ci
npm start
```

Open the project's QR code in an [Expo Go build compatible with SDK 58](https://expo.dev/go). Metro serves the development bundle. A packaged app runs its gameplay and saves locally without a server. Expo Go availability varies by platform. Follow the official [SDK 58 instructions](https://expo.dev/changelog/sdk-58) if your installed Expo Go version differs.

Use `npm run android` with a connected Android device or emulator. Use `npm run ios` for a simulator on macOS with Xcode. To export both native production bundles, use `npx expo export --platform android --platform ios --output-dir dist/native`.

## Play

1. Select **New Life** and choose **Random Life** or **Custom Life**.
2. Tap **Age Up**. At a decision, select a response in the journal before advancing again.
3. Try reading, resting, taking a walk, studying while in school, or talking to your family when those activities become available.
4. Return to the welcome screen from the Life Menu. **Continue Life** opens the most recently saved slot. **Saved Lives** opens other slots and completed lives.

Mortal saves successful turns and decisions before showing them. **Save Life** in the Life Menu also writes the current state manually.

### Advanced education

- Open **School** to see grades, attendance, academic stress, and your class. Study and prepare for exams to improve grades. Talk to your teacher or socialize to manage academic stress.
- At high school graduation, choose university, vocational training, the workforce, or a gap year. Open **Career → View Education → Browse Programs** to compare courses, apply, and enroll after receiving an offer. Adult High School Equivalency is available to adults without a diploma.
- Check tuition and scholarships before you enroll. If your balance falls short for the next year, education pauses until you pay, use a scholarship, or decide to withdraw. Open **Academic Records** to see outcomes, qualifications and money received in scholarships. Former school and university friends stay in **Relationships**.

Earlier academic grades from version 1 saves are unavailable. Workforce intent and qualification tags are available in this milestone. Jobs, wages, and student loans are planned separately.

### Character portraits

Use **Custom Life → Appearance** to choose a hairstyle, hair color, eyes, nose, and mouth. Random lives can use **Activities → Customize Appearance** at age zero. After the first **Age Up**, use **Activities → Change Hairstyle** to edit your hair. Tap your portrait in the journal for **My Profile**, or open a contact from **Relationships** or **Class** to see their portrait and gender identity.

Version 1 and 2 saves get stable portraits when they open. The upgraded version 3 payload is written on the next save.

## Verify

```sh
npm run typecheck
npm run lint
npm test
npm run simulate -- 2000
npm run build:web
npx expo install --check
```

For a native smoke test, begin a random life, age to six, and exit with the first-day-of-school decision open. Force close and reopen the app, choose **Continue Life**, and verify the character, year, journal, and pending choice. Resolve the decision and confirm that Age Up becomes available. Repeat with a packaged build in airplane mode to verify offline use independently of Metro.

For the education smoke test, keep `npm run preview:web` running after building and install Playwright Core in the ignored tool directory with `npm install --prefix .expo/web-qa playwright-core`. Run `npm run test:web:education` in another terminal. It uses Edge on Windows by default. Set `MORTAL_BROWSER_PATH` for a different Chromium executable. The test uses a fresh browser context to verify IndexedDB migration, graduation decisions, university admission, scholarships, tuition, and persistent friends.

- [Game design](docs/GAME_DESIGN.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Simulation rules](docs/SIMULATION_RULES.md)
- [Roadmap](docs/ROADMAP.md)
