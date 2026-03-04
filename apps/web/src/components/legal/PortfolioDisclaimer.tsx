"use client";

import { useTranslations } from "next-intl";

export function PortfolioDisclaimer() {
  const t = useTranslations("portfolio");

  return (
    <div className="mb-8 rounded-lg border border-yellow-500/50 bg-yellow-50 p-6 dark:bg-yellow-950/20">
      <h3 className="mb-2 text-lg font-semibold text-yellow-800 dark:text-yellow-200">
        {t("title")}
      </h3>
      <p className="text-sm text-yellow-700 dark:text-yellow-300">
        {t("text1")}
      </p>
      <p className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
        {t("text2")}{" "}
        <a
          href="mailto:info@limbermartinez.com"
          className="font-medium underline hover:text-yellow-900 dark:hover:text-yellow-100"
        >
          info@limbermartinez.com
        </a>
      </p>
    </div>
  );
}
