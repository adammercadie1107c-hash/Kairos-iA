import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { PostHogProvider } from "./posthog-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Kairos iA",
  description: "Agent IA conversationnel pour professionnels",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="h-full">
        <PostHogProvider>{children}</PostHogProvider>
      </body>
    </html>
  );
}
