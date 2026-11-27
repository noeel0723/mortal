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
2. Tap **Age Up**. Answer any decision pop-up before advancing again.
3. Try visiting the library, resting, taking a walk, studying while in school, or talking to your family when those activities become available.
4. Return to the welcome screen from the Life Menu. **Continue Life** opens the most recently saved slot. **Saved Lives** opens other slots and completed lives.

Mortal saves successful turns and decisions before showing them. **Save Life** in the Life Menu also writes the current state manually.

### Advanced education

- Open **School** to see grades, attendance, academic stress, and your class. Study and prepare for exams to improve grades. Talk to your teacher or socialize to manage academic stress.
- Tap the name of your school or university to open your enrollment details, including attendance, academic stress, and any tuition or scholarship.
- At high school graduation, choose university, vocational training, the workforce, or a gap year. Open **Career → View Education → Browse Programs** to compare courses, apply, and enroll after receiving an offer. Adult High School Equivalency is available to adults without a diploma.
- Check tuition and scholarships before you enroll. If your balance falls short for the next year, education pauses until you pay, use a scholarship, or decide to withdraw. Open **Academic Records** to see outcomes, qualifications and money received in scholarships. Former school and university friends stay in **Relationships**.

Earlier academic grades from version 1 saves are unavailable. Qualifications now unlock relevant jobs in the Career menu.

### Character portraits

Use **Custom Life → Appearance** to choose a hairstyle, hair color, eyes, nose, and mouth. Random lives can use **Activities → Customize Appearance** at age zero. After the first **Age Up**, use **Activities → Change Hairstyle** to edit your hair. Tap your portrait in the journal for **My Profile**. When you open a contact from **Relationships** or **Class**, tap their name or portrait to see their profile and bond. Available interactions depend on the contact’s role and your age.

Version 1 and 2 saves get stable portraits when they open. Versions 1–6 upgrade to save version 7 on the next successful save. Existing contacts, assets, bank balances, and decisions retain their references. Adults coming from versions 1–3 start with a neutral career record.

### Work and money

- From age 18, use **Career → Find a Job** to filter vacancies, read qualifications and experience requirements, and apply. Accept an offer to start working. While enrolled, use **School or University → View Career** to find compatible part-time work.
- Tap your current job or employment status to see salary, workplace ratings, and education details in the Career pop-up.
- Improve performance with **Work Harder**, adjust your work week, ask for a raise, or open **Co-workers**. Co-workers appear in **Relationships → Acquaintances** once Affection exceeds 70%. A new workplace friendship starts at 50% Affection and can continue after leaving the employer. NPC pages also offer **Insult** and **Mess With**, with consequences for the relationship and for conduct at your current workplace.
- **Age Up** pays the elapsed work year and applies taxes and living costs before study and the next review. Use **Assets → Finances** to review the ledger, filter by year, and see unpaid living bills. Use **Career History** to see jobs, pay changes, and lifetime earnings. Retirement opens at age 65.

Conversations and time spent together write different journal entries based on the relationship, age, school, or current job.

Veyra uses a fictional currency scale. Retirement living costs are funded from savings. Pensions, borrowing, investments, and the broader economy are future work.

## Health and life events

- Open **Activities → Doctors** to compare local doctors, book emergency or eye care, attend a psychiatry session, or donate blood or plasma. Doctor fees and chances of successful treatment vary with the provider and illness severity.
- Successful treatment improves severe cases to moderate and clears mild and moderate cases. Emergency care guarantees stabilization for severe cases. The community doctor is free for players under 18. You can pay for a family member or friend after earning a salary if your balance covers the fee. NPCs can seek care independently.
- Life events and completed activities show as pop-ups and stay in the journal. Activity results show the resulting relationship or character stat. Choose a response when an event calls for a decision. Use **Continue** to dismiss a result. Open decisions and unread pop-ups persist when you reload.

## Library, housing, and shopping

- Open **Activities → Social Activities** to meet a neighbor, join a hobby group, or go to the library. Library visits are repeatable and can present an interactive encounter. Choose **Become Friends** at a shared-hobby encounter to add the character to **Relationships**. Personal activities and healthcare visits have no energy fee or yearly visit limit. The first plasma donation of the year is compensated.
- From age 18, use **Assets → Housing** to rent, ask a parent for a starter home, or move into a house you own. A parent must be able to afford the home and agree to buy it.
- **Assets → Shopping** offers ten houses, ten cars, and ten motorcycles with original pixel illustrations. Purchases use the in-game balance and appear in **Owned Assets** and **Finances**.

## Phase 2.3 · Relationships and family

- Open **Family → Open Love Life** at age 18 to meet local adults or ask someone you know on a date. NPCs can decline based on compatibility, preferences, circumstances, and your history together.
- Dates and shared activities build a bond. An engagement opens three wedding options. Spouses can discuss family planning or adoption. Parenting actions appear on each child’s profile.
- **Family Tree** shows relatives, spouses, former spouses, and children. **Relationship History** preserves the relationship timeline. Profiles show known education, interests, and personality alongside the existing portraits.
- Parents use their own savings for allowance and house gifts. Weddings, adoption, and other paid activities appear in the ledger. Unpaid childcare is added to personal-expense arrears.

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

For browser smoke tests, keep `npm run preview:web` running after building and install Playwright Core in the ignored tool directory with `npm install --prefix .expo/web-qa playwright-core`. Run the `test:web:education`, `test:web:career`, `test:web:health`, `test:web:library-property`, and `test:web:social` scripts. They use fresh browser contexts and Edge on Windows by default. Set `MORTAL_BROWSER_PATH` for a different Chromium executable.

- [Game design](docs/GAME_DESIGN.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Simulation rules](docs/SIMULATION_RULES.md)
- [Roadmap](docs/ROADMAP.md)
