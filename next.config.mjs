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
    ]),
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
