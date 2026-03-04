"use client";

import { useTranslations } from "next-intl";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { PortfolioDisclaimer } from "@/components/legal/PortfolioDisclaimer";

export default function CookiesPage() {
  const t = useTranslations("cookiesPage");
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
              {t("s1Title")}
            </h2>
            <p className="text-muted-foreground mb-4">
              {t("s1Text")}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">
              {t("s2Title")}
            </h2>

            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-2">
                  {t("s2NecessaryTitle")}
                </h3>
                <p className="text-muted-foreground mb-2">
                  {t("s2NecessaryDesc")}
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-1 text-sm">
                  <li>{t("s2NecessaryItem1")}</li>
                  <li>{t("s2NecessaryItem2")}</li>
                  <li>{t("s2NecessaryItem3")}</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-2">
                  {t("s2FuncTitle")}
                </h3>
                <p className="text-muted-foreground mb-2">
                  {t("s2FuncDesc")}
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-1 text-sm">
                  <li>{t("s2FuncItem1")}</li>
                  <li>{t("s2FuncItem2")}</li>
                  <li>{t("s2FuncItem3")}</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-2">
                  {t("s2AnalyticsTitle")}
                </h3>
                <p className="text-muted-foreground mb-2">
                  {t("s2AnalyticsText")}
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">
              {t("s3Title")}
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-muted-foreground">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 font-medium">{t("s3ColCookie")}</th>
                    <th className="text-left py-2 font-medium">{t("s3ColType")}</th>
                    <th className="text-left py-2 font-medium">{t("s3ColDuration")}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="py-2">session_id</td>
                    <td className="py-2">{t("s3Necessary")}</td>
                    <td className="py-2">{t("s3Session")}</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2">cookie_consent</td>
                    <td className="py-2">{t("s3Necessary")}</td>
                    <td className="py-2">{t("s3OneYear")}</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2">user_preferences</td>
                    <td className="py-2">{t("s3Functionality")}</td>
                    <td className="py-2">{t("s3SixMonths")}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">
              {t("s4Title")}
            </h2>
            <p className="text-muted-foreground mb-4">
              {t("s4Intro")}
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>{t("s4Item1")}</li>
              <li>{t("s4Item2")}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">
              {t("s5Title")}
            </h2>
            <p className="text-muted-foreground mb-4">
              {t("s5Intro")}
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>{t("s5Chrome")}</li>
              <li>{t("s5Firefox")}</li>
              <li>{t("s5Safari")}</li>
              <li>{t("s5Edge")}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">
              {t("s6Title")}
            </h2>
            <p className="text-muted-foreground mb-4">
              {t("s6Text")}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">{t("s7Title")}</h2>
            <p className="text-muted-foreground">
              {t("s7Intro")}
              <br />
              Email:{" "}
              <a
                href="mailto:info@limbermartinez.com"
                className="text-primary hover:underline"
              >
                info@limbermartinez.com
              </a>
              <br />
              Dortmund, Germany
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
