import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Keep the existing Node/Vinext deployment available during migration.
  ...(process.env.CALC_STATIC_EXPORT === '1' ? { output: 'export' as const } : {}),
};

export default nextConfig;
