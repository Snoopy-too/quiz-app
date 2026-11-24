import React from "react";
import ReactDOM from "react-dom/client";
import "@fontsource-variable/inter";
import "@fontsource/noto-sans-jp/400.css";
import "@fontsource/noto-sans-jp/500.css";
import "@fontsource/noto-sans-jp/700.css";
import App from "./App.jsx";
import ErrorBoundary from "./components/common/ErrorBoundary.jsx";
import { initPwaInstallCapture, registerPwaServiceWorker } from "./hooks/usePwaInstall";
import { attemptChunkRecoveryReload } from "./utils/lazyWithRetry";
import "./index.css";
import "./i18n";

if (typeof window !== "undefined") {
  initPwaInstallCapture();
  registerPwaServiceWorker();
  window.addEventListener("vite:preloadError", (event) => {
    if (attemptChunkRecoveryReload(event.payload)) {
      event.preventDefault();
    }
  });
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
