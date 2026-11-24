/**
 * Minimal pass-through Service Worker for QuizMaster PWA installability.
 *
 * Intentionally does NOT cache HTML, hashed JS/CSS assets, or Supabase API
 * traffic so deploys, live quiz sessions, and auth tokens are never stale.
 */
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});
