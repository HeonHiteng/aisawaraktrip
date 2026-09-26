# Publishing to Google Play

Everything the repo can prepare is prepared. What's left needs **you** (accounts, passwords,
a live domain, real payments). Work top to bottom.

## What's already done in the repo

| Item | Where |
|---|---|
| Launcher icon (adaptive + legacy + round), splash, brand colours | `android/app/src/main/res/`, regenerate with `npm run android:assets` (source: `brand/mark.json`) |
| Play store icon 512×512, feature graphic 1024×500, 5 phone screenshots | `store/play/` — regenerate with `npm run play:screenshots` (start `NEXT_PUBLIC_DEMO_MODE=true npm run dev` first) |
| Store listing text (name, short + full description, category) | `store/play/listing.md` |
| Signed-release build pipeline (`.aab`), version bumping | `npm run android:aab` — verified with a throwaway key |
| **In-app account deletion** (Play requires it) + public page | Profile → *Delete my account*, and `/delete-account` |
| Privacy policy + terms pages | `/privacy`, `/terms` |
| `allowBackup=false`, `targetSdk 36`, WebView floor 111, no debug WebView in release | `AndroidManifest.xml`, `capacitor.config.ts` |

## 1. Create your release keystore (once — guard it)

Play signs the app for users with its own key; **this** is your *upload key*. Losing it is
recoverable (Play can reset it) but painful — back it up somewhere safe (password manager +
an offline copy). **Never commit it** (`*.jks` and `android/keystore.properties` are git-ignored).

```powershell
$env:JAVA_HOME = "C:\Users\kelvi\tools\jdk21-x\jdk-21.0.12.1+1"
& "$env:JAVA_HOME\bin\keytool.exe" -genkeypair -v -keystore android\release.jks `
  -alias sarawak-trips -keyalg RSA -keysize 2048 -validity 10000
```

It asks for a password (twice) and your name/organisation. Then:

```powershell
Copy-Item android\keystore.properties.example android\keystore.properties
# edit android\keystore.properties: put the password in storePassword and keyPassword
```

## 2. Build the bundle

Needs the app live on **https** (`docs/deployment.md`) and the build environment from
`docs/android.md` (JDK 21, Android SDK).

```powershell
$env:CAP_SERVER_URL = "https://<your live domain>"
npm run android:aab -- --bump      # --bump raises versionCode by 1: every Play upload needs a higher one
# -> android/app/build/outputs/bundle/release/app-release.aab
```

`npm run android:aab -- --apk` builds a signed APK instead, to try the release build on a phone first.
Edit `versionName` in `android/app-version.json` when you want the visible version to change.

## 3. Play Console

1. Create a developer account (US$25 once) and verify your identity. **Personal accounts created
   after Nov 2023 must run a closed test with ≥12 testers for 14 days before they can go to
   production** — check the current rule in Play Console; organisation accounts are exempt.
2. *Create app* → name **Sarawak Trip Planner**, App, Free.
3. **Store listing**: paste from `store/play/listing.md`; upload `store/play/icon-512.png`,
   `store/play/feature-graphic.png`, and the screenshots in `store/play/screenshots/`.
4. **App content** (all required):
   - **Privacy policy**: `https://<domain>/privacy`
   - **App access**: *All functionality is available without special access* — a reviewer taps
     **Continue as guest** on the first screen, no account needed.
   - **Ads**: No ads.
   - **Target audience**: 18 and over (a travel-booking app; avoids the Families policy).
   - **Content rating**: IARC questionnaire — no violence, sexual content, gambling, user-generated
     public content or location sharing; it does let people book and pay for real-world activities.
     Expect a rating for everyone.
   - **Data safety** (below) and **Account deletion**: URL `https://<domain>/delete-account`; the
     app also has the in-app option.
   - **Government app / News app / Health / Financial features**: No.
5. **Production** (or closed test) → *Create release* → upload the `.aab`. Accept Play App Signing.
6. Send for review. First reviews commonly take a few days.

### Data safety answers

Collected, all **encrypted in transit**, users can **request deletion** (in-app + URL):

| Data type | Collected | Shared | Why | Optional |
|---|---|---|---|---|
| Email address | Yes | No | Account, booking confirmations | Required (guests: none) |
| Name | Yes | With the vendor you book | Account, booking | Required for booking |
| Phone number | Yes | With the vendor you book | Booking contact | Optional |
| Country | Yes | No | Profile | Optional |
| User IDs (account / guest id) | Yes | No | App functionality | — |
| Purchase history (bookings) | Yes | With the vendor you book | App functionality | — |
| Payment info | **Depends on the final gateway** — card details are entered on the gateway's page and never stored by us; declare as handled by the payment provider once you've chosen it | Payment provider | Payments | — |
| App activity / crash logs | Only if you add analytics | — | — | — |

Trip inputs (dates, budget, interests) go to the AI provider to build the itinerary — declare under
*Other user-generated content / app activity → shared with service providers* once the Claude
planner is switched on.

## 4. Before you press "Publish"

- [ ] **Real payments on.** Switch `PAYMENT_PROVIDER` from `mock` to a real gateway and remove
      `ALLOW_MOCK_PAYMENTS`. A Play release with a fake "Approve payment" screen would be rejected as
      deceptive. (Play Billing is *not* required: you sell real-world tours, not digital goods.)
- [ ] **Real content.** Replace the sample vendors, prices and photos (the admin forms now upload photos)
      and remove the *Sample* labels. Store screenshots are made from sample data: re-run
      `npm run play:screenshots` against the real content.
- [ ] Real business contact in `/privacy`, `/delete-account` and the listing (currently `privacy@example.com`).
- [ ] Supabase Auth → URL Configuration set to the live domain (sign-up emails), leaked-password protection on.
- [ ] Test the release build on a real phone, including sign-in, a booking, and deleting a test account.

## 5. Policy watch-outs

- **Minimum functionality / "repackaged website"**: Play rejects apps that are just a website in a
  frame. This one has sign-in, saved trips, booking, payment and account deletion, and an offline
  screen — describe those features (not "website") in your review notes.
- Keep `webContentsDebuggingEnabled: false` and https-only for release (already enforced by
  `scripts/android-release.mjs`).
- Each update needs a higher `versionCode` (`--bump`). Server-side changes reach users instantly
  without a new upload, because the app loads from your server — only native changes (icon, splash,
  permissions) need a new bundle.
