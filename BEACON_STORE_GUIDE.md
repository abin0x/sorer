# Publishing Beacon to the App Store and Google Play

Beacon's store app opens the live https://clubrudder.com/beacon screen, so
publishing the website updates every phone. A new store release is only needed
when the icon, name, permissions or native plugins change.

## One-time setup (on a Mac with Xcode and Android Studio)
1. Export the project to GitHub and clone it, then `npm install`.
2. `npm run cap:add` — creates the `ios/` and `android/` projects.
3. `npm run cap:assets` — builds all icon and splash sizes from `resources/`.
4. `npm run cap:sync`.

## Accounts and keys
- Apple Developer Program ($99/yr): create App ID `com.clubrudder.beacon` with Push Notifications; make an APNs key (.p8).
- Google Play Console ($25): create the app; add a Firebase project and put `google-services.json` in `android/app/`.
- Info.plist usage text: microphone (voice notes, dictation), camera and photo library (attachments).

## Submit
- iOS: `npm run cap:ios` → set signing team → Product › Archive → TestFlight → App Review.
- Android: `npm run cap:android` → Build › Generate Signed Bundle (.aab) → Internal testing → Production.

## Review checklist
- Reviewer demo login (parent + coach) with seeded club data.
- Privacy policy URL and support URL.
- In-app account deletion: Home › Profile & Account (already built).
- Screenshots: 6.7" iPhone and Android phone.

## Store-readiness pieces (added Nov 2026)
- Cloud builds: `codemagic.yaml` (iOS .ipa → TestFlight, Android .aab → Play internal track) or `.github/workflows/mobile-build.yml` (artifacts only). Secrets each needs are listed at the top of each file.
- Support URL: https://clubrudder.com/beacon/support · Privacy URL: https://clubrudder.com/privacy-policy (COPPA, push notifications, account deletion).
- Reviewer sign-ins: appstore.coach@clubrudder.com (assistant coach, 2010 Girls ECNL, Eclipse Select SC) and appstore.parent@clubrudder.com (guardian of Avery Anderson). Password is kept outside the repo; enter it in App Review / Play "App access".
- Push: the app registers the phone's APNs/FCM token after permission; tokens are stored per user and removed on sign-out/deletion.
- Screenshots: Files → beacon-store-screenshots (6.7" iPhone 1290×2796, Android 1080×1920).
