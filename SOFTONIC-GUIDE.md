# LearnX AI — Softonic Publishing Guide

This guide covers publishing LearnX AI on [Softonic](https://www.softonic.com) as a desktop app (Windows/Mac/Linux) and/or an Android APK.

## What You're Publishing

LearnX AI is available as:
1. **Windows installer** (`.exe` via NSIS) — built with Electron
2. **Mac disk image** (`.dmg`) — built with Electron
3. **Linux AppImage / .deb** — built with Electron
4. **Android APK** (`.apk` via Bubblewrap TWA) — from the Play Store TWA config

## Step 1: Build the Desktop Installers

You need to build on each target platform (or use CI/CD):

### Windows (.exe)
```bash
bun run build           # build the Next.js app
bun run db:generate     # generate Prisma client
npx electron-builder --config electron-builder.json --win
```
Output: `dist-electron/LearnX-AI-Setup-1.0.0.exe`

### Mac (.dmg)
```bash
bun run build
bun run db:generate
npx electron-builder --config electron-builder.json --mac
```
Output: `dist-electron/LearnX-AI-1.0.0.dmg`

### Linux (.AppImage + .deb)
```bash
bun run build
bun run db:generate
npx electron-builder --config electron-builder.json --linux
```
Output: `dist-electron/LearnX-AI-1.0.0.AppImage` + `.deb`

### Android (.apk)
```bash
cd android-twa
bubblewrap init --manifest https://your-domain.com/manifest.json
bubblewrap build --apk  # generates an APK instead of AAB
```

## Step 2: Submit to Softonic

### Create a Developer Account
1. Go to [Softonic Developer Center](https://en.softonic.com/developers) (or `softonic.com/developers`)
2. Register as a developer/publisher
3. Wait for account approval (usually 1-2 business days)

### Submit Your App
1. Click **"Submit a program"** or **"Add your software"**
2. Fill in the app details (see below)
3. Upload the installer file(s)
4. Upload screenshots
5. Submit for review

### App Details for Softonic

**App name:** LearnX AI

**Category:** Education & Reference > Education

**Short description (160 chars):**
```
Free AI-powered study app. Turn any topic into notes, flashcards, quizzes & podcasts. Learn faster with spaced repetition and an AI tutor.
```

**Full description:**
```
LearnX AI is a free AI-powered learning platform that turns any topic, article, or pasted notes into everything you need to master it — structured study notes, flashcards with spaced repetition, quizzes, and audio podcasts.

✨ KEY FEATURES:
• AI Study Notes — Generate structured Markdown notes from any topic, URL, or PDF
• AI Flashcards — Auto-generated cards with spaced-repetition scheduling (SM-2 algorithm)
• AI Quizzes — Multiple-choice + true/false questions with explanations
• AI Tutor Chat — A friendly AI tutor that explains anything with streaming responses
• AI Podcasts — Listen to your study material as an audio podcast (text-to-speech)
• Daily Learning Path — AI-generated prioritized study to-do list
• Progress Tracking — XP, streaks, achievements, and analytics charts
• Multi-language — Generate notes in 15 languages
• Offline Support — Study flashcards and quizzes without internet
• Voice Input — Speak to the AI tutor using your microphone

📚 HOW IT WORKS:
1. Give LearnX AI a topic, paste notes, provide a URL, or upload a PDF file
2. AI instantly generates study notes, flashcards, and a quiz
3. Study with spaced repetition, take quizzes, chat with the AI tutor
4. Track your progress with XP, streaks, and achievements

🔒 PRIVACY FIRST:
• No sign-up required — start studying instantly
• No personal data collected — zero tracking, zero ads
• Your data stays on your device — everything is stored locally
• Free forever — no subscriptions, no limits

LearnX AI is the free alternative to Turbo AI / TurboLearn AI. Whether you're studying for exams, learning a new language, or just curious about a topic, LearnX AI helps you learn anything, faster.
```

**System requirements (Windows):**
- Windows 10 or later (64-bit)
- 2 GB RAM minimum
- 200 MB disk space
- Internet connection (for AI features)

**System requirements (Mac):**
- macOS 10.15 (Catalina) or later
- 2 GB RAM minimum
- 200 MB disk space
- Internet connection (for AI features)

**System requirements (Linux):**
- 64-bit Linux (Ubuntu 18.04+ or equivalent)
- 2 GB RAM minimum
- 200 MB disk space
- Internet connection (for AI features)

### Screenshots to Upload
Take screenshots of:
1. Dashboard with AI Daily Learning Path + streak heatmap
2. Flashcards study mode (flip card in action)
3. Quiz question with answer options
4. AI Tutor chat with a streaming response
5. Progress analytics (XP chart + achievements)
6. Library with study set cards + progress rings

### Additional Softonic Fields
- **License type:** Freeware
- **Language:** English (+ 15 supported output languages)
- **Developer/Publisher:** Your name or brand
- **Website:** Your deployed URL
- **Support email:** Your email
- **Privacy policy URL:** `https://your-domain.com/privacy-policy.html`
- **Release date:** Your build date
- **Version:** 1.0.0

## Step 3: Softonic Review Process

- Softonic's editorial team reviews all submissions
- Typical review time: 3-7 business days
- They may request changes (usually about description clarity or screenshots)
- Once approved, your app appears on Softonic with a download page
- Softonic may create their own "Softonic App" wrapper installer — you can opt out during submission

## Tips for Softonic Success

1. **High-quality screenshots** — 1280×800 or higher, showing the best features
2. **Clear description** — lead with the value proposition ("Free AI study app...")
3. **Accurate system requirements** — don't overstate or understate
4. **Respond to user reviews** — Softonic users often leave reviews
5. **Keep it updated** — submit new versions when you add features
6. **Softonic Score** — Softonic gives each app an editorial score (1-10). Higher quality apps get featured placement.

## Alternative: Direct APK Distribution

If you also want to distribute the Android APK directly (not through Play Store):
1. Build the APK: `bubblewrap build --apk` in the `android-twa` directory
2. Upload the `.apk` to Softonic's Android section
3. OR distribute via your own website with a direct download link

## Cross-Platform Distribution Summary

| Platform | Format | Build Command | Distribution |
|---|---|---|---|
| Windows | .exe (NSIS) | `electron:build:win` | Softonic, direct download |
| Mac | .dmg | `electron:build:mac` | Softonic, direct download |
| Linux | .AppImage + .deb | `electron:build:linux` | Softonic, direct download |
| Android | .apk | `bubblewrap build --apk` | Softonic, Play Store, direct |
| Web/PWA | URL | Deploy to HTTPS | Browser, installable |
