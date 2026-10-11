import ProtectedRoute from '../components/ProtectedRoute';

export const metadata = {
  title: "Customer Data",
  description: "Filter customers, export lists and send promotions",
};

// Logged-out visitors go to the login page.
export default function CustomerDataLayout({ children }) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}
