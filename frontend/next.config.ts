import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // @ts-expect-error - __dirname is available in Node.js runtime
    root: __dirname,
  },
};

export default nextConfig;
