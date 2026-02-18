import { ExternalLink, Bed, Bath, Car, Maximize, Waves, TrendingDown, MapPin, Clock, Star } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { Property } from '@/lib/supabase';

interface PropertyCardProps {
  property: Property;
}

export function PropertyCard({ property }: PropertyCardProps) {
  // BUG FIX #4: Show "New" for 0 days instead of "0d"
  const daysOnMarket = property.first_seen_date
    ? Math.floor((Date.now() - new Date(property.first_seen_date).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const daysLabel = daysOnMarket === null
    ? null
    : daysOnMarket === 0
      ? 'New'
      : daysOnMarket === 1
        ? '1d'
        : `${daysOnMarket}d`;

  const priceDropPercent = property.original_price && property.price_numeric && property.price_numeric < property.original_price
    ? Math.round((1 - property.price_numeric / property.original_price) * 100)
    : null;

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow group">
      {/* Image - BUG FIX #5: Use photo_url (correct DB column) not main_photo_url */}
      <div className="relative aspect-[4/3] bg-muted overflow-hidden">
        {property.photo_url ? (
          <img
            src={property.photo_url}
            alt={property.address}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <Building2 className="h-12 w-12" />
          </div>
        )}

        {/* Badges - Fixed: pool not has_pool */}
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

        {/* Beach distance - computed from coordinates */}
        {property.latitude && property.longitude && getBeachDistance(property.latitude, property.longitude) <= 2 && (
          <div className="absolute bottom-2 right-2">
            <Badge variant="outline" className="bg-white/90 text-xs">
              <MapPin className="h-3 w-3 mr-1" />
              {getBeachDistance(property.latitude, property.longitude).toFixed(1)}km to beach
            </Badge>
          </div>
        )}
      </div>

      {/* Content */}
      <CardContent className="p-4">
        {/* Price - Fixed: use price_display not price */}
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
          {daysLabel && (
            <Badge variant="outline" className="text-xs">
              <Clock className="h-3 w-3 mr-1" />
              {daysLabel}
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

        {/* CTA - Fixed: use url not domain_url */}
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

// Beach distance calculation using Perth coastline reference
function getBeachDistance(lat: number, lng: number): number {
  // Perth coastline runs roughly along 115.745 longitude
  const coastLng = 115.745;
  const R = 6371; // Earth radius in km
  const dLat = 0;
  const dLng = (coastLng - lng) * Math.PI / 180;
  const a = Math.cos(lat * Math.PI / 180) * Math.cos(lat * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
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
