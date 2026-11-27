# Mortal

**One Life. Infinite Possibilities.**

Mortal is an offline-first mobile life simulation for Android and iOS. Start with a random or custom character in the fictional country of Veyra, advance a year at a time, and see how your decisions shape your life journal.

## Run on a phone

Use Node.js 24 LTS, or Node.js 22.18 or later in the 22.x line, and npm.

```sh
npm ci
npm start
```

Open the project's QR code in an [Expo Go build compatible with SDK 58](https://expo.dev/go). Metro serves the development bundle. A packaged app runs its gameplay and saves locally without a server. Expo Go availability varies by platform. Follow the official [SDK 58 instructions](https://expo.dev/changelog/sdk-58) if your installed Expo Go version differs.

Use `npm run android` with a connected Android device or emulator. Use `npm run ios` for a simulator on macOS with Xcode. To check the two production JavaScript bundles from any supported development host, use `npx expo export --platform android --platform ios`.

## Play

1. Select **New Life** and choose **Random Life** or **Custom Life**.
2. Tap **Age Up**. At a decision, select a response in the journal before advancing again.
3. Try reading, resting, taking a walk, studying while in school, or talking to your family when those activities become available.
4. Return to the welcome screen from the Life Menu. **Continue Life** opens the most recently saved slot. **Saved Lives** opens other slots and completed lives.

Mortal saves successful turns and decisions before showing them. **Save Life** in the Life Menu also writes the current state manually.

## Verify

```sh
npm run typecheck
npm run lint
npm test
npm run simulate -- 2000
npx expo install --check
```

For a native smoke test, begin a random life, age to six, and exit with the first-day-of-school decision open. Force close and reopen the app, choose **Continue Life**, and verify the character, year, journal, and pending choice. Resolve the decision and confirm that Age Up becomes available. Repeat with a packaged build in airplane mode to verify offline use independently of Metro.

- [Game design](docs/GAME_DESIGN.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Simulation rules](docs/SIMULATION_RULES.md)
- [Roadmap](docs/ROADMAP.md)
