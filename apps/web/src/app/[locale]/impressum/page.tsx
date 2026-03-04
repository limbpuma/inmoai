"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { PortfolioDisclaimer } from "@/components/legal/PortfolioDisclaimer";

export default function ImpressumPage() {
  const t = useTranslations("impressum");
  const tLegal = useTranslations("legal");

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-3xl font-bold mb-8">{t("title")}</h1>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
          <PortfolioDisclaimer />

          <p className="text-muted-foreground">
            {tLegal("lastUpdated")}
          </p>

          <section>
            <h2 className="text-xl font-semibold mb-4">
              {t("responsibleTitle")}
            </h2>
            <p className="text-muted-foreground">
              {t("responsibleName")}
              <br />
              {t("location")}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">{t("contactTitle")}</h2>
            <p className="text-muted-foreground">
              {t("emailLabel")}{" "}
              <a
                href="mailto:info@limbermartinez.com"
                className="text-primary hover:underline"
              >
                info@limbermartinez.com
              </a>
              <br />
              {t("webLabel")}{" "}
              <a
                href="https://limbermartinez.com"
                className="text-primary hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                limbermartinez.com
              </a>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">
              {t("contentTitle")}
            </h2>
            <p className="text-muted-foreground mb-4">
              {t("contentText")}
            </p>
            <p className="text-muted-foreground">
              {t("contentText2")}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">
              {t("linksTitle")}
            </h2>
            <p className="text-muted-foreground">
              {t("linksText")}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">
              {t("ipTitle")}
            </h2>
            <p className="text-muted-foreground">
              {t("ipText")}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">
              {t("dataTitle")}
            </h2>
            <p className="text-muted-foreground">
              {t("dataText")}{" "}
              <Link href="/privacy" className="text-primary hover:underline">
                {t("dataLink")}
              </Link>
              .
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">{t("legalTitle")}</h2>
            <p className="text-muted-foreground">
              {t("legalText")}
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 mt-2">
              <li>
                {t("legalTmg")}
              </li>
              <li>
                {t("legalGdpr")}
              </li>
              <li>
                {t("legalBdsg")}
              </li>
            </ul>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
