import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    authInterrupts: true, // notFound(), unauthorized(), forbidden() 지원 필수
  },
};

export default nextConfig;
