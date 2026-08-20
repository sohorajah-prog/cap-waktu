import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Coolify runs this as a container, so the build emits a self-contained
   * server with only the modules it actually uses.
   */
  output: "standalone",

  outputFileTracingIncludes: {
    /**
     * better-sqlite3 loads its binding at runtime rather than importing it,
     * so dependency tracing cannot see it. Every Linux prebuild is kept:
     * the image may end up on x64 or arm64, glibc or musl.
     */
    "/**": ["./node_modules/better-sqlite3/prebuilds/**"],
  },

  outputFileTracingExcludes: {
    /**
     * Tracing resolves the data directory from the path expression in the db
     * module and copies whatever it finds there into the build. That is the
     * runtime store — the database and every uploaded photo — and it belongs
     * to the mounted volume, never to the image.
     */
    "/**": ["./data/**"],
  },
};

export default nextConfig;
