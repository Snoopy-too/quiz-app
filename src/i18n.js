import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import en from "./locales/en.json";
import ja from "./locales/ja.json";

const syncDocumentLang = (lng) => {
  if (typeof document !== "undefined" && lng) {
    document.documentElement.lang = lng;
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: en,
      },
      ja: {
        translation: ja,
      },
    },
    fallbackLng: "en",
    debug: false,
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
    },
  });

syncDocumentLang(i18n.resolvedLanguage || i18n.language || "en");
i18n.on("languageChanged", syncDocumentLang);

export default i18n;
