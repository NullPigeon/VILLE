import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  agentRules: false,
  outputFileTracingIncludes: {
    '/api/modules/*': ['./city-modules/*.json'],
    '/api/admin/build-jobs/*/release': ['./city-modules/*.json'],
  },
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
