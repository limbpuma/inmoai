"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { locales, type Locale } from "@/i18n/config";
import { cn } from "@/lib/utils";

export function LanguageSwitcher() {
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const router = useRouter();

  const switchLocale = (newLocale: Locale) => {
    router.replace(pathname, { locale: newLocale });
  };

  return (
    <div className="flex items-center gap-0.5">
      {locales.map((l) => (
        <button
          key={l}
          onClick={() => switchLocale(l)}
          className={cn(
            "px-2 py-1 text-xs font-medium rounded transition-colors",
            locale === l
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
