import type { Metadata } from "next";
import { Sarabun } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const sarabun = Sarabun({
  weight: ['300', '400', '500', '600', '700'],
  subsets: ["thai", "latin"],
  variable: '--font-sans'
});

export const metadata: Metadata = {
  title: "BookAndBox Hub",
  description: "ERP Dashboard for BookAndBox",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" className={cn("font-sans", sarabun.variable)}>
      <body className={sarabun.className}>{children}</body>
    </html>
  );
}
