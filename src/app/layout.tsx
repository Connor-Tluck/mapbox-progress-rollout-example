import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "mapbox-gl/dist/mapbox-gl.css";
import "./globals.css";

// Söhne (LaunchDarkly's UI face) is loaded from /public/fonts when present; it is a licensed font and
// is gitignored, so clones fall back to Inter, the design system's sanctioned substitute.
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: "Service Area Rollout · LaunchDarkly",
  description:
    "Progressive rollout of service areas across Canada, driven by LaunchDarkly feature flags.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="h-full">{children}</body>
    </html>
  );
}
