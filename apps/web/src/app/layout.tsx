import "./globals.css";

// Root layout is a pass-through; <html> and <body> are in [locale]/layout.tsx
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
