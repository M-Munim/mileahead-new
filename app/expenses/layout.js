import ProtectedRoute from '../components/ProtectedRoute';
import RoleGuard from '../components/RoleGuard';

export const metadata = {
  title: "Expenses",
  description: "Utility bills, wash center rent, workers' room rent and salaries, with the bills saved",
};

const SUPER_ADMIN_ONLY = ['super_admin'];

// Salaries are private: only the Super Admin gets in (the server checks too).
export default function ExpensesLayout({ children }) {
  return (
    <ProtectedRoute>
      <RoleGuard allowedRoles={SUPER_ADMIN_ONLY}>{children}</RoleGuard>
    </ProtectedRoute>
  );
}
