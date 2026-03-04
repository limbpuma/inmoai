"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

const COOKIE_CONSENT_KEY = "inmoai_cookie_consent";

export function CookieBanner() {
  const [visible, setVisible] = useState(false);
  const t = useTranslations("cookieBanner");

  useEffect(() => {
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!consent) {
      setVisible(true);
    }
  }, []);

  function handleAccept() {
    localStorage.setItem(COOKIE_CONSENT_KEY, "accepted");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur-sm p-4 shadow-lg">
      <div className="container mx-auto flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {t("message")}{" "}
          <Link
            href="/cookies"
            className="font-medium text-foreground underline hover:text-primary"
          >
            {t("moreInfo")}
          </Link>
        </p>
        <button
          onClick={handleAccept}
          className="shrink-0 rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          {t("accept")}
        </button>
      </div>
    </div>
  );
}
