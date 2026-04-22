import type { NextConfig } from "next";
import { withSerwist } from "@serwist/turbopack";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  outputFileTracingIncludes: {
    "/api/copilot/challenge": ["./node_modules/@github/copilot-linux-x64/**/*"],
  },
};

export default withSerwist(nextConfig);
