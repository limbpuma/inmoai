'use client';

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Heart, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AuthenticityBadge } from "@/components/ui/AuthenticityBadge";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface Listing {
    id: string;
    title: string;
    price: number;
    location: string;
    image: string;
    specs: {
        beds: number;
        baths: number;
        sqm: number;
    };
    score: number;
    source: string;
    isFavorited?: boolean;
}

interface ListingCardProps {
    listing: Listing;
    showFavorite?: boolean;
}

export function ListingCard({ listing, showFavorite = true }: ListingCardProps) {
    const [isFavorited, setIsFavorited] = useState(listing.isFavorited ?? false);

    const toggleFavoriteMutation = api.listings.toggleFavorite.useMutation({
        onSuccess: (data) => {
            setIsFavorited(data.favorited);
            toast.success(data.favorited ? 'Añadido a favoritos' : 'Eliminado de favoritos');
        },
        onError: (error) => {
            toast.error('Error al guardar', {
                description: error.message.includes('UNAUTHORIZED')
                    ? 'Inicia sesión para guardar favoritos'
                    : 'Inténtalo de nuevo',
            });
        },
    });

    const handleFavoriteClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        toggleFavoriteMutation.mutate({ listingId: listing.id });
    };

    const isToggling = toggleFavoriteMutation.isPending;

    return (
        <Link href={`/listing/${listing.id}`} className="block h-full">
        <Card className="group overflow-hidden hover:shadow-xl transition-all duration-300 border-border/50 bg-background h-full flex flex-col rounded-xl cursor-pointer focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
            <div className="relative aspect-[4/3] overflow-hidden bg-muted/10">
                <Image
                    src={listing.image}
                    alt={`Imagen de ${listing.title} en ${listing.location}`}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-110"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                <div className="absolute top-3 left-3 z-10 flex gap-2">
                    <AuthenticityBadge score={listing.score} />
                    <Badge variant="secondary" className="bg-background/90 backdrop-blur-md text-foreground shadow-sm hover:bg-background/100 font-medium">
                        {listing.source}
                    </Badge>
                </div>

                {showFavorite && (
                    <button
                        aria-label={isFavorited ? `Quitar ${listing.title} de favoritos` : `Guardar ${listing.title} en favoritos`}
                        onClick={handleFavoriteClick}
                        disabled={isToggling}
                        className={cn(
                            "absolute top-3 right-3 p-2.5 rounded-full backdrop-blur-md transition-all shadow-sm border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                            isFavorited
                                ? "bg-red-500 text-white border-red-500 opacity-100"
                                : "bg-background/80 hover:bg-white text-foreground/80 hover:text-red-500 border-transparent hover:border-border opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0",
                            isToggling && "opacity-50 cursor-not-allowed"
                        )}
                    >
                        {isToggling ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Heart className={cn("h-4 w-4", isFavorited && "fill-current")} />
                        )}
                    </button>
                )}
            </div>

            <CardContent className="p-5 flex-1">
                <div className="mb-2">
                    <h3 className="font-bold text-lg leading-tight group-hover:text-primary transition-colors line-clamp-1">{listing.title}</h3>
                    <p className="text-muted-foreground text-sm mt-1 line-clamp-1">{listing.location}</p>
                </div>

                <div className="flex items-center gap-4 text-sm text-muted-foreground border-t border-border/40 pt-4 mt-2">
                    <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-foreground">{listing.specs.beds}</span> <span className="text-xs">habs</span>
                    </div>
                    <div className="w-px h-3 bg-border" />
                    <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-foreground">{listing.specs.baths}</span> <span className="text-xs">baños</span>
                    </div>
                    <div className="w-px h-3 bg-border" />
                    <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-foreground">{listing.specs.sqm}</span> <span className="text-xs">m²</span>
                    </div>
                </div>
            </CardContent>

            <CardFooter className="p-5 pt-0 flex justify-between items-center mt-auto">
                <div className="flex flex-col">
                    <span className="text-2xl font-bold text-primary tracking-tight">
                        {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(listing.price)}
                    </span>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Precio venta</span>
                </div>
                <span className="text-sm text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    Ver detalles →
                </span>
            </CardFooter>
        </Card>
        </Link>
    );
}
