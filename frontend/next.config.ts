import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,

  /**
   * Los videos de los heroes pesan 9,3 MB y 8,6 MB y se servían con
   * `Cache-Control: max-age=0`, así que cada visita los volvía a descargar
   * enteros. Son assets versionados por nombre de archivo: si cambia el video,
   * cambia el nombre, con lo cual pueden cachearse de forma inmutable.
   */
  async headers() {
    return [
      {
        source: '/uploads/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
