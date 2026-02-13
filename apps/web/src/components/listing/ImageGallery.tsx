"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, X, Maximize2, Grid3X3, ShieldCheck, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * ImageAuthenticityBadge - Badge de autenticidad por imagen
 */
function ImageAuthenticityBadge({ score }: { score: number | null }) {
  if (score === null) return null;

  const getConfig = (score: number) => {
    if (score >= 90) return {
      color: "bg-green-500/90",
      textColor: "text-white",
      icon: ShieldCheck,
      label: `${score}%`
    };
    if (score >= 70) return {
      color: "bg-amber-500/90",
      textColor: "text-white",
      icon: ShieldCheck,
      label: `${score}%`
    };
    return {
      color: "bg-red-500/90",
      textColor: "text-white",
      icon: ShieldAlert,
      label: `${score}%`
    };
  };

  const config = getConfig(score);
  const Icon = config.icon;

  return (
    <div className={cn(
      "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium backdrop-blur-sm",
      config.color,
      config.textColor
    )}>
      <Icon className="h-3 w-3" />
      <span>{config.label}</span>
    </div>
  );
}

interface ListingImage {
  id: string;
  url: string;
  thumbnailUrl: string | null;
  position: number;
  roomType: string | null;
  authenticityScore: number | null;
  isAiGenerated: boolean | null;
  isEdited: boolean | null;
  qualityScore: number | null;
}

interface ImageGalleryProps {
  images: ListingImage[];
  title: string;
}

const roomTypeLabels: Record<string, string> = {
  living_room: "Salón",
  bedroom: "Dormitorio",
  bathroom: "Baño",
  kitchen: "Cocina",
  dining_room: "Comedor",
  terrace: "Terraza",
  balcony: "Balcón",
  garden: "Jardín",
  garage: "Garaje",
  storage: "Trastero",
  hallway: "Pasillo",
  office: "Despacho",
  other: "Otro",
};

export function ImageGallery({ images, title }: ImageGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [showGrid, setShowGrid] = useState(false);

  const hasImages = images.length > 0;
  const currentImage = hasImages ? images[currentIndex] : null;

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") goToPrevious();
    if (e.key === "ArrowRight") goToNext();
    if (e.key === "Escape") setLightboxOpen(false);
  };

  if (!hasImages) {
    return (
      <div className="aspect-[16/9] w-full rounded-xl bg-muted flex items-center justify-center">
        <p className="text-muted-foreground">Sin imágenes disponibles</p>
      </div>
    );
  }

  return (
    <>
      {/* Main Gallery */}
      <div className="relative group">
        {/* Main Image */}
        <div
          className="relative aspect-[16/9] w-full rounded-xl overflow-hidden bg-muted cursor-pointer"
          onClick={() => setLightboxOpen(true)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && setLightboxOpen(true)}
          aria-label={`Ver imagen ${currentIndex + 1} de ${images.length}`}
        >
          <Image
            src={currentImage?.url ?? ""}
            alt={`${title} - Imagen ${currentIndex + 1}`}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 66vw, 800px"
            priority
          />

          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

          {/* Image Info Badges */}
          <div className="absolute top-4 left-4 flex gap-2">
            {currentImage?.authenticityScore !== null && (
              <ImageAuthenticityBadge score={currentImage?.authenticityScore ?? null} />
            )}
            {currentImage?.roomType && (
              <Badge variant="secondary" className="bg-background/90 backdrop-blur-sm">
                {roomTypeLabels[currentImage.roomType] || currentImage.roomType}
              </Badge>
            )}
            {currentImage?.isAiGenerated && (
              <Badge variant="destructive" className="bg-red-500/90 backdrop-blur-sm">
                Posible IA
              </Badge>
            )}
            {currentImage?.isEdited && (
              <Badge variant="outline" className="bg-background/90 backdrop-blur-sm border-amber-500 text-amber-600">
                Editada
              </Badge>
            )}
          </div>

          {/* Counter */}
          <div className="absolute top-4 right-4">
            <Badge variant="secondary" className="bg-background/90 backdrop-blur-sm">
              {currentIndex + 1} / {images.length}
            </Badge>
          </div>

          {/* Expand Button */}
          <Button
            size="icon"
            variant="secondary"
            className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity bg-background/90 backdrop-blur-sm"
            onClick={(e) => {
              e.stopPropagation();
              setLightboxOpen(true);
            }}
          >
            <Maximize2 className="h-4 w-4" />
          </Button>

          {/* Grid View Button */}
          {images.length > 1 && (
            <Button
              size="icon"
              variant="secondary"
              className="absolute bottom-4 right-16 opacity-0 group-hover:opacity-100 transition-opacity bg-background/90 backdrop-blur-sm"
              onClick={(e) => {
                e.stopPropagation();
                setShowGrid(true);
              }}
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Navigation Arrows */}
        {images.length > 1 && (
          <>
            <Button
              size="icon"
              variant="secondary"
              className="absolute left-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-background/90 backdrop-blur-sm"
              onClick={goToPrevious}
              aria-label="Imagen anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="secondary"
              className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-background/90 backdrop-blur-sm"
              onClick={goToNext}
              aria-label="Imagen siguiente"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </>
        )}

        {/* Thumbnail Strip */}
        {images.length > 1 && (
          <div className="mt-4 flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
            {images.slice(0, 8).map((image, index) => (
              <button
                key={image.id}
                onClick={() => setCurrentIndex(index)}
                className={cn(
                  "relative flex-shrink-0 w-20 h-14 rounded-lg overflow-hidden transition-all",
                  index === currentIndex
                    ? "ring-2 ring-primary ring-offset-2"
                    : "opacity-70 hover:opacity-100"
                )}
                aria-label={`Ver imagen ${index + 1}`}
              >
                <Image
                  src={image.thumbnailUrl || image.url}
                  alt={`Miniatura ${index + 1}`}
                  fill
                  className="object-cover"
                  sizes="80px"
                />
              </button>
            ))}
            {images.length > 8 && (
              <button
                onClick={() => setShowGrid(true)}
                className="flex-shrink-0 w-20 h-14 rounded-lg bg-muted flex items-center justify-center text-sm font-medium hover:bg-muted/80 transition-colors"
              >
                +{images.length - 8}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Lightbox */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent
          className="max-w-[95vw] max-h-[95vh] p-0 bg-black/95 border-none"
          onKeyDown={handleKeyDown}
        >
          <DialogTitle className="sr-only">{title} - Galería de imágenes</DialogTitle>
          <div className="relative w-full h-[90vh] flex items-center justify-center">
            {/* Close Button */}
            <Button
              size="icon"
              variant="ghost"
              className="absolute top-4 right-4 z-50 text-white hover:bg-white/20"
              onClick={() => setLightboxOpen(false)}
            >
              <X className="h-6 w-6" />
            </Button>

            {/* Image */}
            <div className="relative w-full h-full">
              <Image
                src={currentImage?.url ?? ""}
                alt={`${title} - Imagen ${currentIndex + 1}`}
                fill
                className="object-contain"
                sizes="95vw"
              />
            </div>

            {/* Navigation */}
            {images.length > 1 && (
              <>
                <Button
                  size="icon"
                  variant="ghost"
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20"
                  onClick={goToPrevious}
                >
                  <ChevronLeft className="h-8 w-8" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20"
                  onClick={goToNext}
                >
                  <ChevronRight className="h-8 w-8" />
                </Button>
              </>
            )}

            {/* Counter */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm">
              {currentIndex + 1} / {images.length}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Grid View Dialog */}
      <Dialog open={showGrid} onOpenChange={setShowGrid}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogTitle className="text-lg font-semibold mb-4">
            Todas las imágenes ({images.length})
          </DialogTitle>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {images.map((image, index) => (
              <button
                key={image.id}
                onClick={() => {
                  setCurrentIndex(index);
                  setShowGrid(false);
                  setLightboxOpen(true);
                }}
                className="relative aspect-[4/3] rounded-lg overflow-hidden hover:ring-2 hover:ring-primary transition-all"
              >
                <Image
                  src={image.thumbnailUrl || image.url}
                  alt={`Imagen ${index + 1}`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 50vw, 33vw"
                />
                <div className="absolute bottom-2 left-2 flex gap-1">
                  {image.authenticityScore !== null && (
                    <ImageAuthenticityBadge score={image.authenticityScore} />
                  )}
                  {image.roomType && (
                    <Badge
                      variant="secondary"
                      className="text-xs bg-background/90 backdrop-blur-sm"
                    >
                      {roomTypeLabels[image.roomType] || image.roomType}
                    </Badge>
                  )}
                </div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
