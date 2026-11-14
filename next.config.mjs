/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'api.milesahead.services',
      },
      {
        protocol: 'https',
        hostname: '**.cloudinary.com',
      },
    ],
  },
  // Client scope (initial stage): Car Wash Orders is the only module. The other
  // modules' code is kept; their URLs point to /orders until they are re-enabled.
  // To bring a module back, remove its entry here and add it to Sidebar.js.
  redirects: async () =>
    ['/dashboard', '/customers', '/booking', '/pricing', '/finance', '/technical-support'].flatMap((path) => [
      { source: path, destination: '/orders', permanent: false },
      { source: `${path}/:rest*`, destination: '/orders', permanent: false },
    ]).concat(
      // Demo login only — no account sign-up at this stage.
      { source: '/auth/signup', destination: '/auth/login', permanent: false },
      // "Chat with us" button on WhatsApp templates. Meta refuses wa.me links
      // in buttons, so the button opens this address and it forwards to WhatsApp.
      { source: '/chat', destination: 'https://wa.me/97451701605', permanent: false },
    ),
  headers: async () => [
    {
      source: '/(.*)',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-XSS-Protection', value: '1; mode=block' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      ],
    },
  ],
};

export default nextConfig;
