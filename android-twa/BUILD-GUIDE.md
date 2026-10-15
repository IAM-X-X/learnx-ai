# LearnX AI — Play Store Build Guide

This guide walks you through turning the LearnX AI web app into an Android App Bundle (.aab) ready for the Google Play Store.

## Prerequisites

1. **JDK 17** (not 21) — `brew install openjdk@17` or `apt install openjdk-17-jdk`
2. **Android SDK** — install via Android Studio or `sdkmanager`
3. **Node.js 18+** and **npm**
4. **Bubblewrap CLI** — `npm install -g @bubblewrap/cli`

## Step 1: Deploy the Web App to HTTPS

The app must be live at a real HTTPS URL for the TWA to work. Deploy to any hosting provider:

```bash
# Option A: Vercel (recommended for Next.js)
bun run build
npx vercel --prod

# Option B: Any Node.js host
bun run build
bun run start  # runs on port 3000
```

Your deployed URL (e.g., `https://learnx.ai`) must serve:
- The app at `/`
- The manifest at `/manifest.json` ✅ (already in public/)
- The service worker at `/sw.js` ✅ (already in public/)
- All icons in `/icon-*.png` ✅ (already in public/)
- The asset links at `/.well-known/assetlinks.json` ✅ (already in public/.well-known/)
- The privacy policy at `/privacy-policy.html` ✅ (already in public/)

## Step 2: Update the TWA Manifest

Edit `android-twa/twa-manifest.json`:
- Replace `learnx.ai` with your actual deployed URL (in `host`, `iconUrl`, `maskableIconUrl`, `webManifestUrl`, `fullScopeUrl`)
- Set your signing key path and passwords
- Set your `packageId` (e.g., `com.yourname.learnx`)

## Step 3: Generate the Android Project

```bash
cd android-twa
bubblewrap init --manifest https://your-domain.com/manifest.json
```

This creates the Android project files in the current directory.

## Step 4: Build the AAB

```bash
bubblewrap build
```

This will:
1. Download the Android SDK if needed
2. Generate a signing keystore (if `createSigningKey: true`)
3. Build the `.aab` file

The output file will be at `app/build/outputs/bundle/release/app-release.aab`

## Step 5: Upload to Google Play

1. Go to the [Google Play Console](https://play.google.com/console)
2. Pay the **$25 one-time developer registration fee**
3. Create a new app:
   - **App name**: LearnX AI
   - **Default language**: English
   - **App type**: App
   - **Pricing**: Free
4. **Store listing**: Add description, screenshots, feature graphic
5. **Content rating**: Complete the questionnaire (Education category)
6. **Privacy policy**: Enter your privacy policy URL (`https://your-domain.com/privacy-policy.html`)
7. **App release**: Create a production release, upload the `.aab` file
8. **Review and roll out**: Submit for review (usually approved within 1-3 days)

## Play Store Listing Assets

### App description (copy-paste)

```
LearnX AI is a free AI-powered learning platform that turns any topic, article, or pasted notes into everything you need to master it — study notes, flashcards, quizzes, and audio podcasts.

✨ KEY FEATURES:
• AI Study Notes — structured Markdown notes from any topic or text
• AI Flashcards — auto-generated cards with spaced-repetition scheduling (SM-2)
• AI Quizzes — multiple-choice + true/false questions with explanations
• AI Tutor Chat — a friendly, patient AI tutor that explains anything
• AI Podcasts — listen to your study material as an audio podcast
• Daily Learning Path — AI-generated prioritized to-do list
• Progress Tracking — XP, streaks, achievements, and analytics
• Multi-language — generate notes in 15 languages
• Offline Support — study your flashcards and quizzes without internet

📚 HOW IT WORKS:
1. Give LearnX AI a topic, paste notes, provide a URL, or upload a PDF
2. AI instantly generates notes, flashcards, and a quiz
3. Study with spaced repetition, take quizzes, chat with the AI tutor
4. Track your progress with XP, streaks, and achievements

🔒 PRIVACY:
• No sign-up required
• No personal data collected
• No ads, no tracking
• Your data stays on your device
• Free forever

LearnX AI is the free alternative to Turbo AI / TurboLearn AI. Learn anything, faster.
```

### Short description (80 chars max)

```
Free AI study app: notes, flashcards, quizzes, podcasts. Learn anything faster.
```

### Screenshots needed

Take screenshots of:
1. Dashboard (with daily learning path + heatmap)
2. Flashcards study mode (flip card)
3. Quiz in progress
4. AI Tutor chat
5. Progress analytics (charts + achievements)

## App Signing Key

If you lose your keystore, you lose the ability to update the app. **Back it up safely.**

Google also offers **Play App Signing** (opt-in during upload) where Google holds your signing key. This is recommended — if you lose your upload key, Google can reset it.

## Support

For questions about this build process, refer to:
- [Bubblewrap docs](https://github.com/GoogleChromeLabs/bubblewrap)
- [TWA requirements](https://developers.google.com/codelabs/alloy-adc-twa)
