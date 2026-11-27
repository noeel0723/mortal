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

The browser stores its own lives in IndexedDB. Keep using the same address and browser profile to access them. Saves from Expo Go or a native install are kept in that app’s SQLite database. To make a backup or move a life between devices, open **Saved Lives**, choose **Export** next to the life, then select that JSON file with **Import Save** on the destination. The game validates files up to 4 MiB and puts each import in a new slot. Transfers work offline.

Use `npm run build:web` to generate the static site in `dist/web`. Run `npm run preview:web` to test that build locally on the same port after stopping the development server. The built site can be served by any static host. On HTTPS or loopback, it caches the game after the first successful visit so it can reopen offline once the service worker takes control.

## Run the native app on a phone

Use Node.js 24 LTS, or Node.js 22.18 or later in the 22.x line, and npm.

```sh
npm ci
npm start
```

Open the project's QR code in an [Expo Go build compatible with SDK 58](https://expo.dev/go). Metro serves the development bundle. A packaged app runs its gameplay and saves locally without a server. Expo Go availability varies by platform. Follow the official [SDK 58 instructions](https://expo.dev/changelog/sdk-58) if your installed Expo Go version differs.

Use `npm run android` with a connected Android device or emulator. Use `npm run ios` for a simulator on macOS with Xcode. To export both native production bundles, use `npx expo export --platform android --platform ios --output-dir dist/native`.

The native file picker and share sheet require the Expo Document Picker, File System, and Sharing modules. If you already have a custom development build from before this update, rebuild it with `npx expo run:android` or, on macOS, `npx expo run:ios` before testing save transfers. On a phone, **Export** opens the system share sheet so you can store or send the JSON.

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

Version 1 and 2 saves get stable portraits when they open. Versions 1–9 load as version 10 and persist in the new format on the next successful save. Existing contacts, assets, bank balances, skills, and decisions retain their records. Versions 1–8 start recording Veyra’s economy at their current year with a consumer price index of 100. Known acquisition prices stay on record and unknown prices continue to show as unknown. Active job offers keep their original pay until they expire.

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

- Open **Activities → Social Activities** to meet a neighbor, join a hobby group, or go to the library. Library visits are free, repeatable, and can present an interactive encounter. Choose **Become Friends** at a shared-hobby encounter to add the character to **Relationships**. Eligible healthcare visits can be repeated. The first plasma donation of the year is compensated.
- From age 18, use **Assets → Housing** to rent, ask a parent for a starter home, or move into a house you own. A parent must be able to afford the home and agree to buy it.
- **Assets → Shopping** offers ten houses, ten cars, and ten motorcycles with original pixel illustrations. Purchases use the in-game balance and appear in **Owned Assets** and **Finances**.

## Phase 2.3 · Relationships and family

- At age 18, open **Activities → Love** to find a match and decide whether to date. Use **Family → Open Love Life** to view current partners, ask someone you know out, or review past relationships. Dating several people can trigger a discovery event during Age Up. The partner who finds out ends their relationship with you.
- **Make Love** appears on adult partners’ and friends’ profiles. **Activities → Love** also offers **Hook Up** for a one-night match and **Threesome** for inviting two eligible adults. NPCs decide whether to join, and accepted encounters leave an account in the journal.
- Dates and shared activities build a bond. An engagement opens three wedding options. Spouses can discuss family planning or adoption. Parenting actions appear on each child’s profile.
- **Family Tree** shows relatives, spouses, former spouses, and children. **Relationship History** preserves the relationship timeline. Profiles show known education, interests, and personality alongside the existing portraits.
- Parents use their own savings for allowance and house gifts. Weddings, adoption, and other paid activities appear in the ledger. Unpaid childcare is added to personal-expense arrears.

## Phase 2.4 · Personal growth, skills, and lifestyle

- Open **Activities → Skill Training** to practice any of 26 skills. Use **Life Statistics → My Skills** to review proficiency, experience, hobbies, and achievements. Practicing can reveal each skill’s natural aptitude.
- Choose free practice, group classes, courses, or private coaching. You can take up to five sessions per skill and 16 across all skills per year. **Age Up** renews the budget. Training, competitions, and leisure show their results in the journal, with fees appearing in **Assets → Finances**.
- Enter a school or community competition, perform at an open recital, or present a creative project after developing the relevant skill. School and work can provide practical experience. Job listings show preferred skills alongside required qualifications.
- Add a practiced skill as a hobby. You can practice shared hobbies with friends and partners, and support a child’s chosen interests through encouragement or paid lessons. Exercise, a balanced meal, meditation, entertainment, and a day trip are available from **Activities**.

## Phase 3.0 · The Living World

- Open **Life Journal → World** to see Veyra’s economy, all ten industries, the three cities, fictional news, and a consumer-price chart. **Age Up** advances the world and saves the new year’s conditions.
- **Career → Find a Job** shows current local hiring conditions and quoted salaries. Rents, essentials, childcare, and asset prices respond to local conditions and inflation. Accepted salaries, outstanding debt, and past transactions retain their recorded amounts.
- Adults can open **World → Compare Cities**, review a destination, and confirm the move after finishing or leaving their current program and job. The household starts out renting in the new city. Owned homes stay in their original city and can be occupied again after returning.
- Advanced skills progress more gradually. Varied training and recent public events help for skills that offer them. Existing proficiency, aptitude, and achievements carry over.

## Phase 3.1 · Wealth, banking, and asset management

- Open **Assets → Finances** for current net worth, liabilities, and annual valuations. **Transaction History** shows the cash ledger and labels transfers separately from income and expenses.
- From age 18, use **Savings Account** to deposit or withdraw cash and earn annual interest. **Loans & Debts** shows creditworthiness, fixed-rate personal-loan offers, and repayment history.
- Open a house or vehicle from **Properties**, **Vehicles**, or **Owned Assets** for its condition, market price, and available actions. Maintain or renovate houses, rent out an unoccupied house, or service and repair a vehicle. To sell your current home, first move into another home or rent a place.
- Open **Retirement** for pension eligibility and payment history. **Investments** offers four fictional funds with current prices and realized and unrealized results. Home and vehicle purchases are paid in cash.

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

For browser smoke tests, keep `npm run preview:web` running after building and install Playwright Core in the ignored tool directory with `npm install --prefix .expo/web-qa playwright-core`. Run the `test:web:education`, `test:web:career`, `test:web:health`, `test:web:library-property`, `test:web:social`, `test:web:skills`, `test:web:world`, and `test:web:wealth` scripts. They use fresh browser contexts and Edge on Windows by default. Set `MORTAL_BROWSER_PATH` for a different Chromium executable.

- [Game design](docs/GAME_DESIGN.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Simulation rules](docs/SIMULATION_RULES.md)
- [Roadmap](docs/ROADMAP.md)
