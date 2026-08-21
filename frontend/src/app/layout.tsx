import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "../context/AuthContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SafeMove — AI-Powered Sports Injury Risk Detection",
  description: "Clinical-grade movement analysis & biomechanical injury risk detection platform.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full bg-slate-50">
      <body className={`${inter.className} min-h-full antialiased text-slate-900 bg-slate-50 selection:bg-brand-primary selection:text-white`}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
