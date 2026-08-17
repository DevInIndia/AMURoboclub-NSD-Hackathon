import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        /**
         * Split the vendor code by how often it changes.
         *
         * Route-level lazy loading already moved page code out of the entry
         * chunk, but most of the remaining weight is dependencies, which a
         * single bundle forces every visitor to re-download whenever any
         * application file changes. These groups have very different release
         * cadences, so separating them means an app deploy invalidates only
         * the small application chunk and returning visitors keep the rest
         * from cache.
         */
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;

          // The auth SDK is only needed once a session is being established.
          if (id.includes("@auth0")) return "vendor-auth";

          // Markdown rendering and sanitising: used by the answer, classifier
          // and archive views, but not by the sign-in pages.
          if (id.includes("marked") || id.includes("dompurify")) return "vendor-markdown";

          // Icons are numerous and individually tiny; grouping them keeps them
          // out of the framework chunk.
          if (id.includes("@mui") || id.includes("@emotion")) return "vendor-icons";

          if (
            id.includes("react-router") ||
            id.includes("/react-dom/") ||
            id.includes("/react/")
          ) {
            return "vendor-react";
          }

          return "vendor";
        },
      },
    },
  },
});
