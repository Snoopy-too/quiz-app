import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";

export default function LanguageSwitcher({ compact = false }) {
  const { i18n } = useTranslation();
  const currentLang = (i18n.resolvedLanguage || i18n.language || "en").startsWith("ja") ? "ja" : "en";

  if (compact) {
    return (
      <div className="rounded-lg bg-white/10 p-1" role="group" aria-label="Language">
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-pressed={currentLang === "en"}
            onClick={() => i18n.changeLanguage("en")}
            className={`flex-1 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
              currentLang === "en"
                ? "bg-surface text-brand-700 shadow-sm"
                : "text-white/80 hover:bg-white/10 hover:text-white"
            }`}
          >
            EN
          </button>
          <button
            type="button"
            aria-pressed={currentLang === "ja"}
            onClick={() => i18n.changeLanguage("ja")}
            className={`flex-1 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
              currentLang === "ja"
                ? "bg-surface text-brand-700 shadow-sm"
                : "text-white/80 hover:bg-white/10 hover:text-white"
            }`}
          >
            日本語
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface p-1 shadow-card"
      role="group"
      aria-label="Language"
    >
      <Globe size={16} className="ml-1.5 text-brand-600" aria-hidden="true" />
      <button
        type="button"
        aria-pressed={currentLang === "en"}
        onClick={() => i18n.changeLanguage("en")}
        className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 ${
          currentLang === "en"
            ? "bg-brand-600 text-white shadow-sm"
            : "text-ink-muted hover:bg-surface-muted hover:text-ink"
        }`}
      >
        English
      </button>
      <button
        type="button"
        aria-pressed={currentLang === "ja"}
        onClick={() => i18n.changeLanguage("ja")}
        className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 ${
          currentLang === "ja"
            ? "bg-brand-600 text-white shadow-sm"
            : "text-ink-muted hover:bg-surface-muted hover:text-ink"
        }`}
      >
        日本語
      </button>
    </div>
  );
}
