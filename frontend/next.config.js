/** @type {import('next').NextConfig} */
const nextConfig = {
  // Proxy all /api/* calls to the backend — eliminates CORS entirely
  async rewrites() {
    const backendUrl =
      process.env.NEXT_PUBLIC_API_URL ||
      'https://email-scheduler-backend-39rx.onrender.com';
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
