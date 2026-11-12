import ProtectedRoute from '../components/ProtectedRoute';

export const metadata = {
  title: "Job Cards",
  description: "Work orders for each visit: customer and vehicle, checks, services, technician and status",
};

// Logged-out visitors go to the login page. Every dashboard role may use it.
export default function JobCardsLayout({ children }) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}
