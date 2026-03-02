export function PortfolioDisclaimer() {
  return (
    <div className="mb-8 rounded-lg border border-yellow-500/50 bg-yellow-50 p-6 dark:bg-yellow-950/20">
      <h3 className="mb-2 text-lg font-semibold text-yellow-800 dark:text-yellow-200">
        AVISO IMPORTANTE: Proyecto de Portfolio
      </h3>
      <p className="text-sm text-yellow-700 dark:text-yellow-300">
        Este sitio web es un proyecto de demostracion/portfolio desarrollado por{" "}
        <strong>Limber Martinez</strong>. NO representa una oferta comercial real
        ni servicios activos. El contenido mostrado es con fines ilustrativos y
        de demostracion de capacidades tecnicas.
      </p>
      <p className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
        Si esta interesado en discutir una posible implementacion real de este
        proyecto o servicios similares, por favor contacte al desarrollador en{" "}
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
