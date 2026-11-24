import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Newsreader } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { AuthProvider } from "@/components/providers/auth-provider";
import { LanguageProvider } from "@/lib/i18n/context";
import { themeInitScript } from "@/lib/theme";
import { Toaster } from "@/components/ui/toaster";
import { getAppUrl } from "@/lib/env";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

// Editorial serif reserved for quoted source evidence; not preloaded because
// it only appears once citations are opened.
const evidenceSerif = Newsreader({
  variable: "--font-evidence-serif",
  subsets: ["latin"],
  style: ["normal", "italic"],
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  metadataBase: new URL(getAppUrl()),
  title: {
    default: "Cortex RAG | Enterprise Knowledge Base & Semantic Search Engine",
    template: "%s",
  },
  description:
    "Enterprise semantic search with pgvector, strict grounding, verifiable citations, recursive chunking and streaming answers.",
  applicationName: "Cortex RAG",
  openGraph: {
    type: "website",
    siteName: "Cortex RAG",
    title: "Cortex RAG | Enterprise Knowledge Base & Semantic Search",
    description: "Grounded answers from your own documents, with citations you can verify.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Cortex RAG | Enterprise Knowledge Base & Semantic Search",
    description: "Grounded answers from your own documents, with citations you can verify.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${evidenceSerif.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-full flex flex-col font-sans bg-background text-foreground antialiased">
        <LanguageProvider>
          <AuthProvider>
            <ThemeProvider>
              {children}
              <Toaster />
            </ThemeProvider>
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
