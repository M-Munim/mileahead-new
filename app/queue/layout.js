export const metadata = {
  title: "Queue Screen",
  description: "Magic Track order status board: waiting, washing and ready cars",
};

// Wall-mounted TV: no zooming or scrolling by accident.
export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

// Public, full-screen display — no login, no dashboard sidebar.
export default function QueueLayout({ children }) {
  return children;
}
