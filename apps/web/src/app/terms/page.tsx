import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { PortfolioDisclaimer } from "@/components/legal/PortfolioDisclaimer";

export const metadata = {
  title: "Terminos y Condiciones - InmoAI",
  description: "Terminos y condiciones de uso de la plataforma InmoAI",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-3xl font-bold mb-8">Terminos y Condiciones</h1>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
          <PortfolioDisclaimer />

          <p className="text-muted-foreground">
            Ultima actualizacion: Marzo 2026
          </p>

          <section>
            <h2 className="text-xl font-semibold mb-4">
              1. Aceptacion de los Terminos
            </h2>
            <p className="text-muted-foreground mb-4">
              Al acceder y utilizar InmoAI, aceptas estar sujeto a estos
              terminos y condiciones de uso. Si no estas de acuerdo con alguna
              parte de estos terminos, no podras acceder al servicio.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">2. Uso del Servicio</h2>
            <p className="text-muted-foreground mb-4">
              InmoAI es un proyecto de portfolio que demuestra una plataforma de
              busqueda inmobiliaria con inteligencia artificial. El servicio
              esta destinado unicamente para fines demostrativos y de
              evaluacion tecnica.
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>
                No utilizar el servicio para fines ilegales o no autorizados
              </li>
              <li>
                No intentar acceder a areas restringidas de la plataforma
              </li>
              <li>
                No realizar scraping o extraccion automatizada de datos sin
                autorizacion
              </li>
              <li>
                No publicar contenido falso o enganoso
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">
              3. Propiedad Intelectual
            </h2>
            <p className="text-muted-foreground mb-4">
              Todo el contenido de InmoAI, incluyendo pero no limitado a textos,
              graficos, logos, iconos, imagenes, clips de audio, descargas
              digitales y compilaciones de datos, es propiedad de Limber
              Martinez y esta protegido por las leyes de propiedad intelectual
              aplicables.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">4. Cuentas de Usuario</h2>
            <p className="text-muted-foreground mb-4">
              Para acceder a ciertas funcionalidades, podras crear una cuenta.
              Eres responsable de mantener la confidencialidad de tu cuenta y
              contrasena. Aceptas notificarnos inmediatamente cualquier uso no
              autorizado de tu cuenta.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">
              5. Informacion de Propiedades
            </h2>
            <p className="text-muted-foreground mb-4">
              Los listados de propiedades mostrados en InmoAI son de caracter
              demostrativo. No garantizamos la exactitud, integridad o
              actualidad de los datos. Los precios, ubicaciones y
              caracteristicas son ilustrativos y no representan ofertas reales.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">
              6. Limitacion de Responsabilidad
            </h2>
            <p className="text-muted-foreground mb-4">
              Al tratarse de un proyecto de portfolio/demostracion, InmoAI no
              sera responsable por danos directos, indirectos, incidentales,
              especiales, consecuentes o punitivos resultantes del uso o la
              imposibilidad de usar el servicio.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">
              7. Modificaciones del Servicio
            </h2>
            <p className="text-muted-foreground mb-4">
              Nos reservamos el derecho de modificar o discontinuar, temporal o
              permanentemente, el servicio con o sin previo aviso. No seremos
              responsables ante ti ni ante terceros por cualquier modificacion,
              suspension o discontinuacion del servicio.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">8. Ley Aplicable</h2>
            <p className="text-muted-foreground mb-4">
              Estos terminos se regiran e interpretaran de acuerdo con las leyes
              de Alemania y la Union Europea. Cualquier disputa se sometera a
              los tribunales competentes de Dortmund, Alemania.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">9. Contacto</h2>
            <p className="text-muted-foreground mb-4">
              Si tienes preguntas sobre estos terminos, puedes contactarnos en:
            </p>
            <p className="text-muted-foreground">
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
