import ProtectedRoute from '../components/ProtectedRoute';

export const metadata = {
  title: "Screen Ads",
  description: "Videos and pictures shown on the queue screen between queue views",
};

// Logged-out visitors go to the login page.
export default function ScreenAdsLayout({ children }) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}
