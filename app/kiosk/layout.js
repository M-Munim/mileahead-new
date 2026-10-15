export const metadata = {
  title: "Book your wash",
  description: "Magic Track self-service screen: choose your service and place your order",
};

// Touch screen: no pinch or double-tap zoom.
export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

// Public, full-screen customer screen — no login, no dashboard sidebar.
export default function KioskLayout({ children }) {
  return children;
}
