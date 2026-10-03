import "./globals.css";
import { Inter } from "next/font/google";
import { AuthProvider } from "./contexts/AuthContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: {
    default: "Magic Track Dashboard",
    template: "%s | Magic Track",
  },
  description: "Magic Track Dashboard - Car Wash & Auto Care order management in Qatar",
  keywords: ["car wash", "auto care", "Qatar", "dashboard", "orders"],
  authors: [{ name: "Magic Track" }],
  icons: {
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "Magic Track Dashboard",
    description: "Car Wash & Auto Care order management",
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
