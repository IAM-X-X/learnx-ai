import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";

// Force dynamic rendering — prevents Next.js from trying to prerender pages
// during build (which would trigger database connections)
export const dynamic = 'force-dynamic';
import { ThemeProvider } from "@/components/providers/theme-provider";
import { ErrorBoundary } from "@/components/error-boundary";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://learnx.ai"),
  title: "LearnX AI — Learn anything, faster",
  shortName: "LearnX AI",
  description:
    "LearnX AI is a free AI-powered study platform. Turn any topic, notes, or text into bite-sized study notes, flashcards, quizzes, and audio podcasts. Learn faster, for free.",
  applicationName: "LearnX AI",
  keywords: [
    "LearnX AI",
    "AI study",
    "flashcards",
    "quiz",
    "study notes",
    "AI tutor",
    "learning",
    "free study app",
    "spaced repetition",
    "education",
  ],
  authors: [{ name: "LearnX AI" }],
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  appleWebApp: {
    capable: true,
    title: "LearnX AI",
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    title: "LearnX AI — Learn anything, faster",
    description:
      "Turn any topic or text into notes, flashcards, quizzes, and podcasts with AI. Free to start, no sign-up.",
    url: "https://learnx.ai",
    siteName: "LearnX AI",
    type: "website",
    images: [{ url: "/icon-512.png", width: 512, height: 512, alt: "LearnX AI" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "LearnX AI — Learn anything, faster",
    description: "Free AI study app: notes, flashcards, quizzes, podcasts. Learn anything faster.",
    images: ["/icon-512.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#7c3aed" },
    { media: "(prefers-color-scheme: dark)", color: "#0f0a1a" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Service worker registration */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(
                    function(reg) { console.log('[SW] Registered:', reg.scope); },
                    function(err) { console.log('[SW] Registration failed:', err); }
                  );
                });
              }
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
          <Toaster />
          <Sonner />
        </ThemeProvider>
      </body>
    </html>
  );
}
