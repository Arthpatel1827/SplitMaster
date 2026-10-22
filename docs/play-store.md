# Publishing SplitMaster on Google Play

App id: `com.arthpatel.tab` (permanent once published; change it in `tab-frontend/capacitor.config.json`
and `tab-frontend/android/app/build.gradle` before your first upload if you want a different one).

## 1. Prerequisites
- Backend and frontend deployed (see the hosting steps). The Android app talks to your live API over HTTPS.
- Backend env: add the app's origins to `CORS_ALLOWED_ORIGINS`:
  `https://your-site.pages.dev,https://localhost,capacitor://localhost`
- Public pages once the frontend is live: `https://your-site.pages.dev/privacy` (privacy policy URL) and
  `https://your-site.pages.dev/delete-account` (account deletion URL). Google asks for both.
- Google Play developer account ($25 one-time). New personal accounts must run a closed test with 12+ testers for
  14 consecutive days before production access.

## 2. Create a signing key (once, keep it safe)
```
keytool -genkeypair -v -keystore tab-release.jks -alias tab -keyalg RSA -keysize 2048 -validity 10000
```
Keep `tab-release.jks` and its passwords somewhere safe (not in Git, not only on OneDrive). Losing it is painful.
In Play Console keep "Play App Signing" on (default); this key is your *upload* key.

## 3. Build the .aab without installing Android Studio (GitHub Actions)
1. Encode the keystore: PowerShell `[Convert]::ToBase64String([IO.File]::ReadAllBytes("tab-release.jks")) | Set-Clipboard`
2. GitHub repo -> Settings -> Secrets and variables -> Actions -> New repository secret:
   `ANDROID_KEYSTORE_BASE64` (the clipboard text), `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS` (`tab`),
   `ANDROID_KEY_PASSWORD`, `VITE_API_BASE` (`https://your-api.onrender.com/api`),
   `VITE_CONTACT_EMAIL` (your public support email).
3. Actions tab -> "Android release bundle" -> Run workflow. Download `tab-release-aab` and unzip it.
4. Every new upload needs a higher `version_code` than the last.

Or build locally with Android Studio: `cd tab-frontend && npm run build && npx cap sync android && npx cap open android`.

## 4. Play Console
- Create app -> SplitMaster -> App or game: App; Free.
- Closed testing -> create release -> upload the `.aab` -> add 12+ testers (email list) -> publish; keep them
  opted in for 14 days. Then apply for production.
- Store listing (below), icon `tab-frontend/assets/play-store-icon-512.png`, feature graphic
  `tab-frontend/assets/play-feature-graphic-1024x500.png`, and at least 2 phone screenshots you take from the app.
- App content: privacy policy URL, account deletion URL, Data safety, Content rating, Target audience (18+ is simplest),
  Ads: No.

## 5. Store listing text
**App name** (30 max): `SplitMaster: Split Expenses`

**Short description** (80 max): `Split bills with friends, see who owes whom, and settle up. No expense limits.`

**Full description**
```
SplitMaster makes sharing costs simple. Create a group, add expenses, and it keeps track of who owes whom, with no limit on how many expenses you can add.

SPLIT IT YOUR WAY
- Equal, exact amounts, percentages, or shares
- Choose who paid and who is included
- Add notes and attach a receipt photo

ALWAYS KNOW WHERE YOU STAND
- Live balances for everyone in the group
- Optional simplified settle-up that cuts the number of payments
- Record payments to settle up, and refund an expense in one tap

BUILT FOR GROUPS
- Join with a short invite code
- Full activity history, including edits
- Roommates, trips, dinners, couples, teams

Your data is yours: delete your account any time from the Account screen.
```
Category: Finance (or Lifestyle). Tags: expense sharing, bill splitting.

## 6. Data safety form (recommended answers - double-check against Google's current definitions)
- Collected data: **Personal info -> Name/User IDs** (username) and **Email address** (optional); **Financial info -> Other financial info**
  (expense amounts users enter; SplitMaster does not process payments); **Photos** (receipt photos the user chooses);
  **App activity -> Other user-generated content** (notes, group names).
- Purpose: App functionality, Account management. Not used for advertising or analytics.
- Shared with third parties: No (hosting providers acting as service providers are not "sharing").
- Encrypted in transit: Yes. Users can request data deletion: Yes (in-app + URL above).
- No location, contacts, device IDs, or advertising ID.

## 7. Content rating questionnaire
No violence, sexual content, gambling, drugs or profanity. Users can share text notes with other members of their
groups (answer the user-generated-content question accordingly). Expected rating: Everyone.

## Updating later
Bump `version_code`, run the workflow, upload the new `.aab` to a release track.
