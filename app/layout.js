import "./globals.css";
import { Inter } from "next/font/google";
import { AuthProvider } from "./contexts/AuthContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: {
    default: "Miles Ahead Dashboard",
    template: "%s | Miles Ahead",
  },
  description: "Miles Ahead Dashboard - Ride Management System for chauffeur services in Qatar",
  keywords: ["ride management", "chauffeur", "Qatar", "dashboard", "fleet management"],
  authors: [{ name: "Miles Ahead" }],
  openGraph: {
    title: "Miles Ahead Dashboard",
    description: "Ride Management System for chauffeur services",
    type: "website",
    locale: "en_US",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
      </head>
      <body className={`${inter.className} bg-gray-50`} suppressHydrationWarning>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
