import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { PWARegister } from "@/components/pwa-register";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Digital Booster App",
  description: "SaaS interne pour gestion clients, projets, taches et equipes.",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                try {
                  var theme = localStorage.getItem("theme");
                  var contrast = localStorage.getItem("contrast");
                  if (!theme) {
                    var m = document.cookie.match(/(?:^|; )theme=([^;]*)/);
                    theme = m ? decodeURIComponent(m[1]) : null;
                  }
                  if (!contrast) {
                    var c = document.cookie.match(/(?:^|; )contrast=([^;]*)/);
                    contrast = c ? decodeURIComponent(c[1]) : null;
                  }
                  if (theme === "dark") document.documentElement.classList.add("dark");
                  if (contrast === "high") document.documentElement.classList.add("hc");
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <PWARegister />
        {children}
      </body>
    </html>
  );
}
