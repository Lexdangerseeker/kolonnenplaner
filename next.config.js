/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      { source: "/einsaetzeMA", destination: "/einsaetzeMH", permanent: true },
      { source: "/arbeitszeiten_slim", destination: "/arbeitszeiten", permanent: true },
    ];
  },
};
module.exports = nextConfig;
