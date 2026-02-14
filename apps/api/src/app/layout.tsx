import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'InmoAI API',
  description: 'API backend for InmoAI',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
