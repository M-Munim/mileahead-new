export const metadata = {
  title: 'Your Car Inspection',
  description: 'Photos and videos of your car after the service at Magic Track Car Wash and Auto Care.',
  // A private link: keep it out of search engines
  robots: { index: false, follow: false },
};

// Public page for the customer: no login, no dashboard sidebar.
export default function InspectionLayout({ children }) {
  return children;
}
