import ProtectedRoute from '../components/ProtectedRoute';

export const metadata = {
  title: "Day Close",
  description: "Daily closing report: cash, card and online collected, unpaid orders, services and discounts",
};

// Logged-out visitors go to the login page.
export default function DayCloseLayout({ children }) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}
