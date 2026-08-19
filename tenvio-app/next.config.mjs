/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Keep the build from failing in the pilot phase over lint style issues;
    // re-enable once the codebase has an actual eslint config tuned for it.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
