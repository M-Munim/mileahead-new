import ProtectedRoute from '../components/ProtectedRoute';
import RoleGuard from '../components/RoleGuard';

export const metadata = {
  title: "WhatsApp Broadcast",
  description: "WhatsApp messages to many customers, with drafts, audience and Meta settings",
};

const SUPER_ADMIN_ONLY = ['super_admin'];

// Logged-out visitors go to the login page; only the Super Admin gets in.
export default function BroadcastLayout({ children }) {
  return (
    <ProtectedRoute>
      <RoleGuard allowedRoles={SUPER_ADMIN_ONLY}>{children}</RoleGuard>
    </ProtectedRoute>
  );
}
