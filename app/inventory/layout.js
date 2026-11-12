import ProtectedRoute from '../components/ProtectedRoute';

export const metadata = {
  title: "Inventory",
  description: "Wash supplies and products for sale: stock, low-stock alerts, stock in, use, sales and history",
};

// Logged-out visitors go to the login page. Every dashboard role may use it;
// only the Super Admin can delete an item (checked on the page and the server).
export default function InventoryLayout({ children }) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}
