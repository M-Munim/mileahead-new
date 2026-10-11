import ProtectedRoute from '../components/ProtectedRoute';

export const metadata = {
  title: "Car Wash Orders",
  description: "Enter car wash orders and track who has paid",
};

// Logged-out visitors go to the login page (without a role, actions such as
// New Order are hidden, so the page must not be shown at all).
export default function OrdersLayout({ children }) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}
