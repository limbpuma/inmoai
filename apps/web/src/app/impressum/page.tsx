import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { PortfolioDisclaimer } from "@/components/legal/PortfolioDisclaimer";

export const metadata = {
  title: "Impressum - InmoAI",
  description: "Aviso legal e informacion del responsable de InmoAI",
};

export default function ImpressumPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-3xl font-bold mb-8">Impressum</h1>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
          <PortfolioDisclaimer />

          <p className="text-muted-foreground">
            Ultima actualizacion: Marzo 2026
          </p>

          <section>
            <h2 className="text-xl font-semibold mb-4">
              Responsable del Proyecto
            </h2>
            <p className="text-muted-foreground">
              Limber Martinez
              <br />
              Dortmund, Germany
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">Contacto</h2>
            <p className="text-muted-foreground">
              Email:{" "}
              <a
                href="mailto:info@limbermartinez.com"
                className="text-primary hover:underline"
              >
                info@limbermartinez.com
              </a>
              <br />
              Web:{" "}
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
              Responsabilidad por Contenidos
            </h2>
            <p className="text-muted-foreground mb-4">
              Los contenidos de este sitio web han sido elaborados con el mayor
              cuidado posible. Sin embargo, al tratarse de un proyecto de
              demostracion y portfolio, todo el contenido es de caracter
              ilustrativo y no constituye asesoramiento profesional inmobiliario,
              legal ni de ningun otro tipo.
            </p>
            <p className="text-muted-foreground">
              Los listados de propiedades, precios y datos mostrados son
              ficticios o con fines demostrativos. No representan ofertas reales
              de compra, venta o alquiler de inmuebles.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">
              Responsabilidad por Enlaces
            </h2>
            <p className="text-muted-foreground">
              Este sitio web puede contener enlaces a sitios externos. No
              tenemos influencia sobre el contenido de dichas paginas y, por
              tanto, no asumimos responsabilidad alguna por el mismo. El
              responsable de los contenidos de las paginas enlazadas es siempre
              el proveedor u operador de dichas paginas.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">
              Propiedad Intelectual
            </h2>
            <p className="text-muted-foreground">
              El codigo fuente, diseno y contenidos de este proyecto de
              portfolio son propiedad de Limber Martinez, salvo que se indique lo
              contrario. Queda prohibida la reproduccion, edicion o distribucion
              sin autorizacion expresa del autor.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">
              Proteccion de Datos
            </h2>
            <p className="text-muted-foreground">
              Para informacion sobre el tratamiento de datos personales, consulte
              nuestra{" "}
              <a href="/privacy" className="text-primary hover:underline">
                Politica de Privacidad
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">Marco Legal</h2>
            <p className="text-muted-foreground">
              Este aviso legal se rige por la legislacion alemana y de la Union
              Europea, en particular:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 mt-2">
              <li>
                Telemediengesetz (TMG) - Ley alemana de medios telematicos
              </li>
              <li>
                Reglamento General de Proteccion de Datos (RGPD/DSGVO)
              </li>
              <li>
                Bundesdatenschutzgesetz (BDSG) - Ley federal alemana de
                proteccion de datos
              </li>
            </ul>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
