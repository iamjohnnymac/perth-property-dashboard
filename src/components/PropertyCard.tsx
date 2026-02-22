import { ExternalLink, Bed, Bath, Car, Maximize, Waves, TrendingDown, MapPin, Clock, Heart, StickyNote, X } from 'lucide-react';
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { Property } from '@/lib/supabase';

interface PropertyCardProps {
  property: Property;
  isFavourite?: boolean;
  onToggleFavourite?: (id: string | number) => void;
  note?: string;
  onNoteChange?: (id: string | number, note: string) => void;
}

export function PropertyCard({ property, isFavourite = false, onToggleFavourite, note = '', onNoteChange }: PropertyCardProps) {
  const [showNote, setShowNote] = useState(false);
  const [noteText, setNoteText] = useState(note);
  const daysOnMarket = property.first_seen_date
    ? Math.floor((Date.now() - new Date(property.first_seen_date).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const priceDropPercent = property.original_price && property.price_numeric && property.price_numeric < property.original_price
    ? Math.round((1 - property.price_numeric / property.original_price) * 100)
    : null;

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow group">
      {/* Image */}
      <div className="relative aspect-[4/3] bg-muted overflow-hidden">
        {property.photo_url ? (
          <img
            src={property.photo_url}
            alt={property.address}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <Building2 className="h-12 w-12" />
          </div>
        )}

        {/* Favourite Heart Button */}
        {onToggleFavourite && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleFavourite(property.id);
            }}
            className="absolute top-2 right-2 z-10 p-1.5 rounded-full bg-black/30 hover:bg-black/50 transition-colors"
            aria-label={isFavourite ? 'Remove from favourites' : 'Add to favourites'}
          >
            <Heart
              className={`h-5 w-5 transition-colors ${isFavourite ? 'fill-red-500 text-red-500' : 'text-white'}`}
            />
          </button>
        )}

        {/* Note indicator */}
        {onNoteChange && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowNote(!showNote);
            }}
            className={`absolute top-2 right-12 z-10 p-1.5 rounded-full transition-colors ${note ? 'bg-yellow-500/80 hover:bg-yellow-500' : 'bg-black/30 hover:bg-black/50'}`}
            aria-label="Add note"
          >
            <StickyNote className="h-5 w-5 text-white" />
          </button>
        )}

        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-wrap gap-1">
          {property.property_type && (
            <Badge variant="secondary" className="text-xs">
              {property.property_type}
            </Badge>
          )}
          {property.under_offer && (
            <Badge variant="destructive" className="text-xs">
              Under Offer
            </Badge>
          )}
          {property.pool && (
            <Badge className="bg-cyan-500 text-white text-xs">
              <Waves className="h-3 w-3 mr-1" />
              Pool
            </Badge>
          )}
          {priceDropPercent && priceDropPercent > 0 && (
            <Badge className="bg-green-500 text-white text-xs">
              <TrendingDown className="h-3 w-3 mr-1" />
              {priceDropPercent}% off
            </Badge>
          )}
        </div>

        {/* Beach distance */}
        {property.beach_distance_km && (
          <div className="absolute bottom-2 right-2">
            <Badge variant="outline" className="bg-white/90 text-xs">
              <MapPin className="h-3 w-3 mr-1" />
              {property.beach_distance_km.toFixed(1)}km to beach
            </Badge>
          </div>
        )}
      </div>

      {/* Content */}
      <CardContent className="p-4">
        {/* Price */}
        <div className="flex items-start justify-between mb-2">
          <div>
            <p className="font-bold text-lg text-primary">
              {property.price_display || 'Price on request'}
            </p>
            {priceDropPercent && property.original_price && (
              <p className="text-xs text-muted-foreground line-through">
                ${property.original_price.toLocaleString()}
              </p>
            )}
          </div>
          {daysOnMarket !== null && (
            <Badge variant="outline" className="text-xs">
              <Clock className="h-3 w-3 mr-1" />
              {daysOnMarket}d
            </Badge>
          )}
        </div>

        {/* Address */}
        <p className="font-medium text-sm mb-1 line-clamp-1" title={property.address}>
          {property.address}
        </p>
        <p className="text-xs text-muted-foreground mb-3">
          {property.suburb}
        </p>

        {/* Features */}
        <div className="flex items-center gap-3 text-sm text-muted-foreground mb-4">
          {property.bedrooms && (
            <span className="flex items-center gap-1">
              <Bed className="h-4 w-4" />
              {property.bedrooms}
            </span>
          )}
          {property.bathrooms && (
            <span className="flex items-center gap-1">
              <Bath className="h-4 w-4" />
              {property.bathrooms}
            </span>
          )}
          {property.car_spaces && (
            <span className="flex items-center gap-1">
              <Car className="h-4 w-4" />
              {property.car_spaces}
            </span>
          )}
          {property.land_size && (
            <span className="flex items-center gap-1">
              <Maximize className="h-4 w-4" />
              {property.land_size}m²
            </span>
          )}
        </div>

        {/* Note Panel */}
        {showNote && onNoteChange && (
          <div className="mb-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <StickyNote className="h-3 w-3" /> Note
              </span>
              {noteText && (
                <button
                  onClick={() => { setNoteText(''); onNoteChange(property.id, ''); }}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Clear
                </button>
              )}
            </div>
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              onBlur={() => onNoteChange(property.id, noteText)}
              placeholder="Add a private note..."
              className="w-full text-xs p-2 rounded border bg-muted/50 resize-none focus:outline-none focus:ring-1 focus:ring-primary/50"
              rows={2}
            />
          </div>
        )}

        {/* Note preview when collapsed */}
        {!showNote && note && (
          <div
            className="mb-3 text-xs text-muted-foreground bg-yellow-50 dark:bg-yellow-900/20 rounded px-2 py-1 line-clamp-1 cursor-pointer"
            onClick={() => setShowNote(true)}
          >
            <StickyNote className="h-3 w-3 inline mr-1" />{note}
          </div>
        )}

        {/* Agent */}
        {(property.agent_name || property.agency_name) && (
          <p className="text-xs text-muted-foreground mb-3 line-clamp-1">
            {property.agent_name}{property.agent_name && property.agency_name ? ' | ' : ''}{property.agency_name}
          </p>
        )}

        {/* CTA */}
        <Button asChild className="w-full" variant="default">
          <a href={property.url} target="_blank" rel="noopener noreferrer">
            View on Domain
            <ExternalLink className="ml-2 h-4 w-4" />
          </a>
        </Button>
      </CardContent>
    </Card>
  );
}

function Building2(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
      <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
      <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />
      <path d="M10 6h4" />
      <path d="M10 10h4" />
      <path d="M10 14h4" />
      <path d="M10 18h4" />
    </svg>
  );
}
