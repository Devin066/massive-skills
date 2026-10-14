import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Market Dashboard",
  description: "Real-time and historical stock market dashboard powered by Massive.com",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
