import { useEffect } from "react";

const SUFFIX = "Celestial Chatbot";

/**
 * Sets the page title per route.
 *
 * Without this every tab and bookmark reads "Celestial Chatbot", so anyone
 * with a few tabs open cannot tell the classifier from the archive. It is a
 * usability fix more than an SEO one -- the useful pages sit behind a login
 * that no crawler will pass.
 */
export function useDocumentTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · ${SUFFIX}` : SUFFIX;
    // Restore on unmount so a route without a title does not inherit the last
    // one during the gap before the next route sets its own.
    return () => {
      document.title = SUFFIX;
    };
  }, [title]);
}
