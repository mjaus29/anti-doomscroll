import type { NextConfig } from "next";
import { withSerwist } from "@serwist/turbopack";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
};

export default withSerwist(nextConfig);
