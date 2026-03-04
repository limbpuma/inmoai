"use client";

import { useTranslations } from "next-intl";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { PortfolioDisclaimer } from "@/components/legal/PortfolioDisclaimer";

export default function PrivacyPage() {
  const t = useTranslations("privacyPage");
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
            <h2 className="text-xl font-semibold mb-4">{t("s1Title")}</h2>
            <p className="text-muted-foreground mb-4">
              {t("s1Text")}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">
              {t("s2Title")}
            </h2>
            <p className="text-muted-foreground mb-4">
              {t("s2Intro")}
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>{t("s2Item1")}</li>
              <li>{t("s2Item2")}</li>
              <li>{t("s2Item3")}</li>
              <li>{t("s2Item4")}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">
              {t("s3Title")}
            </h2>
            <p className="text-muted-foreground mb-4">
              {t("s3Intro")}
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>{t("s3Item1")}</li>
              <li>{t("s3Item2")}</li>
              <li>{t("s3Item3")}</li>
              <li>{t("s3Item4")}</li>
              <li>{t("s3Item5")}</li>
              <li>{t("s3Item6")}</li>
            </ul>
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
              <li>{t("s4Item3")}</li>
              <li>{t("s4Item4")}</li>
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
              <li>{t("s5Item1")}</li>
              <li>{t("s5Item2")}</li>
              <li>{t("s5Item3")}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">
              {t("s6Title")}
            </h2>
            <p className="text-muted-foreground mb-4">
              {t("s6Intro")}
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>{t("s6Item1")}</li>
              <li>{t("s6Item2")}</li>
              <li>{t("s6Item3")}</li>
              <li>{t("s6Item4")}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">
              {t("s7Title")}
            </h2>
            <p className="text-muted-foreground mb-4">
              {t("s7Intro")}
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>{t("s7Item1")}</li>
              <li>{t("s7Item2")}</li>
              <li>{t("s7Item3")}</li>
              <li>{t("s7Item4")}</li>
              <li>{t("s7Item5")}</li>
              <li>{t("s7Item6")}</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              {t("s7Contact")}{" "}
              <a
                href="mailto:info@limbermartinez.com"
                className="text-primary hover:underline"
              >
                info@limbermartinez.com
              </a>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">
              {t("s8Title")}
            </h2>
            <p className="text-muted-foreground mb-4">
              {t("s8Text")}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">
              {t("s9Title")}
            </h2>
            <p className="text-muted-foreground mb-4">
              {t("s9Text")}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">
              {t("s10Title")}
            </h2>
            <p className="text-muted-foreground mb-4">
              {t("s10Intro")}
            </p>
            <p className="text-muted-foreground">
              {t("s10Responsible")}
              <br />
              Limber Martinez
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
            <p className="text-muted-foreground mt-4">
              {t("s10Authority")}{" "}
              <span className="font-medium">
                {t("s10AuthorityName")}
              </span>
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
