import type { Metadata } from "next";

const API_URL =
  process.env.API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:3001";

async function getProviderBySlug(slug: string) {
  try {
    const url = `${API_URL}/api/trpc/marketplace.getProviderBySlug?input=${encodeURIComponent(
      JSON.stringify({ slug })
    )}`;
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.result?.data;
  } catch {
    return null;
  }
}

interface LayoutProps {
  params: Promise<{ slug: string }>;
  children: React.ReactNode;
}

export async function generateMetadata({
  params,
}: LayoutProps): Promise<Metadata> {
  const { slug } = await params;
  const provider = await getProviderBySlug(slug);

  if (!provider) {
    return {
      title: "Profesional no encontrado | InmoAI",
    };
  }

  const categories = provider.services
    ?.map((s: { title: string }) => s.title)
    .join(", ");

  const title = `${provider.businessName} - ${categories || "Profesional"} en ${provider.city} | InmoAI`;
  const description =
    provider.description ||
    `${provider.businessName} ofrece servicios de ${categories} en ${provider.city}. ${provider.totalReviews} opiniones, valoracion ${Number(provider.averageRating).toFixed(1)}/5. Solicita presupuesto gratis.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "profile",
      ...(provider.logoUrl && {
        images: [{ url: provider.logoUrl, alt: provider.businessName }],
      }),
    },
    other: {
      "og:type": "business.business",
    },
  };
}

export default function ProviderSlugLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
