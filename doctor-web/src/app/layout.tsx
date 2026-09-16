import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";

import { AuthProvider } from "@/lib/auth";

import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "PatientCare Doctor Portal",
  description: "Doctor web portal for PatientCare OPD",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${dmSans.variable} font-sans antialiased`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
