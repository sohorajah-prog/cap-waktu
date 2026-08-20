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
     * so dependency tracing cannot see it. Both locations are kept: the
     * bundled prebuilds, and build/Release, where npm's node-gyp fallback
     * puts the binding it compiles during a container build.
     */
    "/**": [
      "./node_modules/better-sqlite3/prebuilds/**",
      "./node_modules/better-sqlite3/build/Release/**",
    ],
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
