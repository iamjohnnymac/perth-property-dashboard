import { ExternalLink, Bed, Bath, Car, Maximize, Waves, TrendingDown, MapPin, Clock, Star, Building2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { Property } from '@/lib/supabase';

interface PropertyCardProps {
  property: Property;
}

export function PropertyCard({ property }: PropertyCardProps) {
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
        {property.main_photo_url ? (
          <img
            src={property.main_photo_url}
            alt={property.address || 'Property'}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <Building2 className="h-12 w-12" />
          </div>
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
          {property.has_pool && (
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
          {property.is_best_value && (
            <Badge className="bg-amber-500 text-white text-xs">
              <Star className="h-3 w-3 mr-1" />
              Best Value
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
              {property.price || 'Price on request'}
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
        <p className="font-medium text-sm mb-1 line-clamp-1" title={property.address || undefined}>
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

        {/* CTA */}
        <Button asChild className="w-full" variant="default">
          <a href={property.domain_url} target="_blank" rel="noopener noreferrer">
            View on Domain
            <ExternalLink className="ml-2 h-4 w-4" />
          </a>
        </Button>
      </CardContent>
    </Card>
  );
}
