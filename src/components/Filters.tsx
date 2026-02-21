import { Filter, X, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { FilterState } from '@/App';

interface FiltersProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  suburbs: string[];
  propertyTypes: string[];
  onClose?: () => void;
  isMobile?: boolean;
  favouriteCount?: number;
}

export function Filters({ filters, onFilterChange, suburbs, propertyTypes, onClose, isMobile, favouriteCount = 0 }: FiltersProps) {
  const updateFilter = <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    onFilterChange({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    onFilterChange({
      suburb: '',
      propertyType: '',
      minBeds: 3,
      maxPrice: null,
      poolOnly: false,
      availableOnly: true,
      hideLand: true,
      bestValue: false,
      motivatedSeller: false,
      favouritesOnly: false,
    });
  };

  return (
    <Card className={isMobile ? 'border-0 shadow-none' : ''}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
          {isMobile && onClose && (
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Suburb */}
        <div className="space-y-2">
          <Label>Suburb</Label>
          <Select value={filters.suburb || 'all'} onValueChange={(v) => updateFilter('suburb', v === 'all' ? '' : v)}>
            <SelectTrigger>
              <SelectValue placeholder="All suburbs" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All suburbs</SelectItem>
              {suburbs.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Property Type */}
        <div className="space-y-2">
          <Label>Property Type</Label>
          <Select value={filters.propertyType || 'all'} onValueChange={(v) => updateFilter('propertyType', v === 'all' ? '' : v)}>
            <SelectTrigger>
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {propertyTypes.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Min Bedrooms */}
        <div className="space-y-2">
          <Label>Min Bedrooms</Label>
          <Select value={String(filters.minBeds)} onValueChange={(v) => updateFilter('minBeds', Number(v))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1+</SelectItem>
              <SelectItem value="2">2+</SelectItem>
              <SelectItem value="3">3+</SelectItem>
              <SelectItem value="4">4+</SelectItem>
              <SelectItem value="5">5+</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Max Price */}
        <div className="space-y-2">
          <Label>Max Price</Label>
          <Select value={filters.maxPrice ? String(filters.maxPrice) : 'none'} onValueChange={(v) => updateFilter('maxPrice', v === 'none' ? null : Number(v))}>
            <SelectTrigger>
              <SelectValue placeholder="No limit" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No limit</SelectItem>
              <SelectItem value="1000000">$1M</SelectItem>
              <SelectItem value="1250000">$1.25M</SelectItem>
              <SelectItem value="1500000">$1.5M</SelectItem>
              <SelectItem value="1750000">$1.75M</SelectItem>
              <SelectItem value="2000000">$2M</SelectItem>
              <SelectItem value="2500000">$2.5M</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Toggle Switches */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="favourites" className="cursor-pointer flex items-center gap-1.5">
              <Heart className="h-4 w-4 text-red-500" />
              Favourites only
              {favouriteCount > 0 && (
                <span className="text-xs text-muted-foreground">({favouriteCount})</span>
              )}
            </Label>
            <Switch id="favourites" checked={filters.favouritesOnly} onCheckedChange={(v) => updateFilter('favouritesOnly', v)} />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="pool" className="cursor-pointer">Pool only</Label>
            <Switch id="pool" checked={filters.poolOnly} onCheckedChange={(v) => updateFilter('poolOnly', v)} />
          </div>

          <div className="flex items-center justify-between">

          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="available" className="cursor-pointer">Available only</Label>
            <Switch id="available" checked={filters.availableOnly} onCheckedChange={(v) => updateFilter('availableOnly', v)} />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="land" className="cursor-pointer">Hide land</Label>
            <Switch id="land" checked={filters.hideLand} onCheckedChange={(v) => updateFilter('hideLand', v)} />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="bestValue" className="cursor-pointer">Best value</Label>
            <Switch id="bestValue" checked={filters.bestValue} onCheckedChange={(v) => updateFilter('bestValue', v)} />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="motivated" className="cursor-pointer">Motivated sellers</Label>
            <Switch id="motivated" checked={filters.motivatedSeller} onCheckedChange={(v) => updateFilter('motivatedSeller', v)} />
          </div>
        </div>

        <Button variant="outline" className="w-full" onClick={clearFilters}>
          Clear filters
        </Button>
      </CardContent>
    </Card>
  );
}
