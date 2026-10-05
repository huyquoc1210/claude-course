import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Public shared notes (SPEC §11.3):
        // - no-referrer: the share token in the URL never leaks to sites linked from a note
        // - noindex: shared links stay out of search engines
        // - no-store: a revoked link stops working immediately, never served from a cache
        source: '/s/:token*',
        headers: [
          { key: 'Referrer-Policy', value: 'no-referrer' },
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
          { key: 'Cache-Control', value: 'no-store' },
        ],
      },
    ];
  },
};

export default nextConfig;
