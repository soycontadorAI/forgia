import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/contexts/ThemeContext";
import AppToaster from "@/components/ui/AppToaster";
import { GoogleAnalytics } from "@next/third-parties/google";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#101114" },
  ],
};

export const metadata: Metadata = {
  title: "Forgia — Tu entrenador de CrossFit con IA personalizada",
  description:
    "Genera WODs personalizados con inteligencia artificial. Calentamiento, fuerza, metcon y enfriamiento adaptados a tu nivel.",
  metadataBase: new URL("https://forgia.fit"),
  manifest: "/manifest.json",
  openGraph: {
    title: "Forgia — Tu entrenador de CrossFit con IA personalizada",
    description:
      "Genera WODs personalizados con inteligencia artificial. Calentamiento, fuerza, metcon y enfriamiento adaptados a tu nivel.",
    url: "https://forgia.fit",
    siteName: "Forgia",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Forgia — Tu entrenador de CrossFit con IA",
      },
    ],
    locale: "es_MX",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Forgia — Tu entrenador de CrossFit con IA personalizada",
    description:
      "Genera WODs personalizados con inteligencia artificial. Calentamiento, fuerza, metcon y enfriamiento adaptados a tu nivel.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "32x32" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

// Aplica la clase `dark` antes de hidratar para evitar el flash de tema claro.
// Misma lógica que ThemeContext: localStorage 'theme' y, si no hay, preferencia del sistema.
const themeInitScript = `(function(){try{var t=localStorage.getItem('theme')||(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');if(t==='dark')document.documentElement.classList.add('dark')}catch(e){}})()`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${spaceGrotesk.variable} antialiased bg-ground text-fg`}
      >
        <ThemeProvider>
          {children}
          <AppToaster />
        </ThemeProvider>
      </body>
      {process.env.NEXT_PUBLIC_GA_ID && (
        <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID} />
      )}
    </html>
  );
}
