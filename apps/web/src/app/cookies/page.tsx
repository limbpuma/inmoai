import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { PortfolioDisclaimer } from "@/components/legal/PortfolioDisclaimer";

export const metadata = {
  title: "Politica de Cookies - InmoAI",
  description: "Informacion sobre el uso de cookies en InmoAI",
};

export default function CookiesPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-3xl font-bold mb-8">Politica de Cookies</h1>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
          <PortfolioDisclaimer />

          <p className="text-muted-foreground">
            Ultima actualizacion: Marzo 2026
          </p>

          <section>
            <h2 className="text-xl font-semibold mb-4">
              1. Que son las Cookies
            </h2>
            <p className="text-muted-foreground mb-4">
              Las cookies son pequenos archivos de texto que se almacenan en tu
              dispositivo cuando visitas un sitio web. Nos ayudan a recordar tus
              preferencias y garantizar el correcto funcionamiento de la
              plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">
              2. Tipos de Cookies que Usamos
            </h2>

            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-2">
                  Cookies Estrictamente Necesarias
                </h3>
                <p className="text-muted-foreground mb-2">
                  Esenciales para el funcionamiento del sitio. No requieren
                  consentimiento.
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-1 text-sm">
                  <li>Sesion de usuario (session_id)</li>
                  <li>Preferencias de cookies (cookie_consent)</li>
                  <li>Token de seguridad CSRF</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-2">
                  Cookies de Funcionalidad
                </h3>
                <p className="text-muted-foreground mb-2">
                  Permiten recordar tus preferencias y personalizar la
                  experiencia.
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-1 text-sm">
                  <li>Preferencias de busqueda guardadas</li>
                  <li>Modo oscuro/claro</li>
                  <li>Ultima ciudad buscada</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-2">
                  Cookies Analiticas y de Marketing
                </h3>
                <p className="text-muted-foreground mb-2">
                  Actualmente <strong>no utilizamos</strong> cookies analiticas
                  ni de marketing. No se emplean servicios de seguimiento como
                  Google Analytics, Google Ads ni Facebook Pixel en esta version
                  del proyecto.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">
              3. Duracion de las Cookies
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-muted-foreground">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 font-medium">Cookie</th>
                    <th className="text-left py-2 font-medium">Tipo</th>
                    <th className="text-left py-2 font-medium">Duracion</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="py-2">session_id</td>
                    <td className="py-2">Necesaria</td>
                    <td className="py-2">Sesion</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2">cookie_consent</td>
                    <td className="py-2">Necesaria</td>
                    <td className="py-2">1 ano</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2">user_preferences</td>
                    <td className="py-2">Funcionalidad</td>
                    <td className="py-2">6 meses</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">
              4. Como Gestionar las Cookies
            </h2>
            <p className="text-muted-foreground mb-4">
              Puedes controlar las cookies de varias formas:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>
                <strong>Banner de cookies:</strong> Al visitar el sitio por
                primera vez, puedes aceptar las cookies necesarias
              </li>
              <li>
                <strong>Configuracion del navegador:</strong> Puedes bloquear o
                eliminar cookies desde la configuracion de tu navegador
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">
              5. Configuracion por Navegador
            </h2>
            <p className="text-muted-foreground mb-4">
              Instrucciones para gestionar cookies en navegadores populares:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>
                <strong>Chrome:</strong> Configuracion &gt; Privacidad y
                seguridad &gt; Cookies
              </li>
              <li>
                <strong>Firefox:</strong> Opciones &gt; Privacidad y seguridad
                &gt; Cookies
              </li>
              <li>
                <strong>Safari:</strong> Preferencias &gt; Privacidad &gt;
                Cookies
              </li>
              <li>
                <strong>Edge:</strong> Configuracion &gt; Cookies y permisos del
                sitio
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">
              6. Cambios en esta Politica
            </h2>
            <p className="text-muted-foreground mb-4">
              Podemos actualizar esta politica periodicamente. Te notificaremos
              de cambios significativos a traves del banner de cookies o por
              email si tienes cuenta.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">7. Contacto</h2>
            <p className="text-muted-foreground">
              Para preguntas sobre cookies:
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
