import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

export const metadata = {
  title: "Politica de Privacidad - InmoAI",
  description: "Politica de privacidad y proteccion de datos de InmoAI",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-3xl font-bold mb-8">Politica de Privacidad</h1>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
          <p className="text-muted-foreground">
            Ultima actualizacion: Enero 2026
          </p>

          <section>
            <h2 className="text-xl font-semibold mb-4">1. Introduccion</h2>
            <p className="text-muted-foreground mb-4">
              En InmoAI, nos tomamos muy en serio la proteccion de tus datos
              personales. Esta politica de privacidad explica como recopilamos,
              usamos, almacenamos y protegemos tu informacion de acuerdo con el
              Reglamento General de Proteccion de Datos (RGPD) y la legislacion
              espanola aplicable.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">
              2. Datos que Recopilamos
            </h2>
            <p className="text-muted-foreground mb-4">
              Podemos recopilar los siguientes tipos de informacion:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>
                <strong>Datos de registro:</strong> nombre, email, telefono
                (opcional)
              </li>
              <li>
                <strong>Datos de uso:</strong> busquedas realizadas, propiedades
                visitadas, preferencias
              </li>
              <li>
                <strong>Datos tecnicos:</strong> direccion IP, tipo de
                navegador, dispositivo
              </li>
              <li>
                <strong>Datos de localizacion:</strong> ubicacion aproximada
                basada en IP (con consentimiento)
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">
              3. Como Usamos tus Datos
            </h2>
            <p className="text-muted-foreground mb-4">
              Utilizamos tus datos personales para:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>Proporcionar y mejorar nuestros servicios de busqueda</li>
              <li>Personalizar tu experiencia y recomendaciones</li>
              <li>Enviarte alertas de propiedades (si lo solicitas)</li>
              <li>Comunicarnos contigo sobre tu cuenta o el servicio</li>
              <li>Prevenir fraudes y garantizar la seguridad</li>
              <li>Cumplir con obligaciones legales</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">
              4. Base Legal del Tratamiento
            </h2>
            <p className="text-muted-foreground mb-4">
              Tratamos tus datos basandonos en:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>Tu consentimiento explicito</li>
              <li>La ejecucion de un contrato o servicio solicitado</li>
              <li>Nuestros intereses legitimos (mejora del servicio)</li>
              <li>Cumplimiento de obligaciones legales</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">
              5. Comparticion de Datos
            </h2>
            <p className="text-muted-foreground mb-4">
              No vendemos tus datos personales. Podemos compartirlos con:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>
                Proveedores de servicios que nos ayudan a operar la plataforma
              </li>
              <li>Autoridades cuando sea requerido por ley</li>
              <li>
                Anunciantes de propiedades cuando solicitas contacto (con tu
                consentimiento)
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">
              6. Seguridad de los Datos
            </h2>
            <p className="text-muted-foreground mb-4">
              Implementamos medidas de seguridad tecnicas y organizativas para
              proteger tus datos, incluyendo:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>Encriptacion SSL/TLS en todas las comunicaciones</li>
              <li>Almacenamiento seguro con encriptacion en reposo</li>
              <li>Controles de acceso estrictos</li>
              <li>Auditorias de seguridad periodicas</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">
              7. Tus Derechos (RGPD)
            </h2>
            <p className="text-muted-foreground mb-4">
              Tienes derecho a:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>
                <strong>Acceso:</strong> solicitar una copia de tus datos
              </li>
              <li>
                <strong>Rectificacion:</strong> corregir datos inexactos
              </li>
              <li>
                <strong>Supresion:</strong> solicitar el borrado de tus datos
              </li>
              <li>
                <strong>Portabilidad:</strong> recibir tus datos en formato
                estructurado
              </li>
              <li>
                <strong>Oposicion:</strong> oponerte al tratamiento para ciertos
                fines
              </li>
              <li>
                <strong>Limitacion:</strong> restringir el tratamiento en
                ciertos casos
              </li>
            </ul>
            <p className="text-muted-foreground mt-4">
              Para ejercer estos derechos, contacta con nuestro DPO en
              dpo@inmoai.com
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">
              8. Retencion de Datos
            </h2>
            <p className="text-muted-foreground mb-4">
              Conservamos tus datos solo durante el tiempo necesario para los
              fines descritos. Las cuentas inactivas se eliminan tras 2 anos.
              Los datos anonimizados para analisis pueden conservarse
              indefinidamente.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">
              9. Transferencias Internacionales
            </h2>
            <p className="text-muted-foreground mb-4">
              Tus datos se almacenan principalmente en servidores dentro de la
              Union Europea. Si es necesario transferirlos fuera del EEE,
              garantizamos protecciones adecuadas mediante clausulas
              contractuales tipo de la Comision Europea.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">10. Contacto DPO</h2>
            <p className="text-muted-foreground mb-4">
              Para cualquier cuestion relacionada con la privacidad:
            </p>
            <p className="text-muted-foreground">
              Delegado de Proteccion de Datos
              <br />
              Email: dpo@inmoai.com
              <br />
              Direccion: Calle Gran Via 28, 28013 Madrid, Espana
            </p>
            <p className="text-muted-foreground mt-4">
              Tambien puedes presentar una reclamacion ante la Agencia Espanola
              de Proteccion de Datos (AEPD) en www.aepd.es
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
