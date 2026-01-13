import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'InmoAI Portal - Búsqueda Inmobiliaria Inteligente',
  description:
    'Portal inmobiliario con inteligencia artificial. Análisis de imágenes, detección de fraudes y búsqueda semántica.',
  keywords: [
    'inmobiliaria',
    'pisos',
    'casas',
    'alquiler',
    'compra',
    'IA',
    'inteligencia artificial',
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
