import Image from "next/image";
import { Heart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AuthenticityBadge } from "@/components/ui/AuthenticityBadge";
import { Card, CardContent, CardFooter } from "@/components/ui/card";

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
}

export function ListingCard({ listing }: { listing: Listing }) {
    return (
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

                <button
                    aria-label={`Guardar ${listing.title} en favoritos`}
                    className="absolute top-3 right-3 p-2.5 rounded-full bg-background/80 hover:bg-white text-foreground/80 hover:text-red-500 backdrop-blur-md transition-all opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 shadow-sm border border-transparent hover:border-border focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                    <Heart className="h-4 w-4" />
                </button>
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
                <Button variant="outline" size="sm" className="opacity-0 -translate-x-2 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-300 font-medium">
                    Ver detalles
                </Button>
            </CardFooter>
        </Card>
    );
}
