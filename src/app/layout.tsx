import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { LibraryProvider } from "../lib/providers/LibraryProvider";
import { AppShell } from "../components/layout/AppShell";
import { cookies } from "next/headers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Edumynt Library",
  description: "An open-source audiobook and reading platform",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const isAuthenticated = !!cookieStore.get('access_token')?.value;
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-zinc-50 dark:bg-black text-zinc-900 dark:text-zinc-50">
        <LibraryProvider>
          <AppShell isAuthenticated={isAuthenticated}>
            {children}
          </AppShell>
        </LibraryProvider>
      </body>
    </html>
  );
}
