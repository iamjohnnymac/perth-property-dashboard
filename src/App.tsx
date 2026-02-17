import { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { supabase, type Property } from './lib/supabase';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { HeroStats } from './components/HeroStats';
import { PropertyCard } from './components/PropertyCard';
import { Filters, type FilterState } from './components/Filters';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';
import { Button } from './components/ui/button';
import { Badge } from './components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from './components/ui/sheet';
import { SlidersHorizontal, ExternalLink, TrendingUp, Building2 } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import './App.css';

// Fix Leaflet marker icons
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const BUDGET = 1740000;

function App() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<'grid' | 'map' | 'investor'>('grid');
  const [isDark, setIsDark] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    suburb: '',
    propertyType: '',
    minBeds: 3,
    maxPrice: null,
    poolOnly: false,
    underBudget: false,
    availableOnly: true,
    hideLand: true,
    bestValue: false,
    motivatedSeller: false,
  });

  useEffect(() => {
    async function fetchProperties() {
      const { data, error } = await supabase
        .from('property_listings')
        .select('*')
        .order('first_seen_date', { ascending: false });

      if (error) {
        console.error('Error fetching properties:', error);
      } else {
        setProperties(data || []);
      }
      setLoading(false);
    }
    fetchProperties();
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  const filteredProperties = useMemo(() => {
    return properties.filter((p) => {
      if (filters.suburb && p.suburb !== filters.suburb) return false;
      if (filters.propertyType && p.property_type !== filters.propertyType) return false;
      if (filters.minBeds && (p.bedrooms || 0) < filters.minBeds) return false;
      if (filters.maxPrice && p.price_numeric && p.price_numeric > filters.maxPrice) return false;
      if (filters.poolOnly && !p.pool) return false;
      if (filters.underBudget && (!p.price_numeric || p.price_numeric > BUDGET)) return false;
      if (filters.availableOnly && p.under_offer) return false;
      if (filters.hideLand && (p.property_type === 'Land' || (p.bedrooms || 0) === 0)) return false;
      // bestValue and motivatedSeller filters disabled for now (fields not in DB)
      return true;
    });
  }, [properties, filters]);

  const suburbs = useMemo(() => {
    const s = new Set(properties.map((p) => p.suburb).filter(Boolean));
    return Array.from(s).sort();
  }, [properties]);

  const propertyTypes = useMemo(() => {
    const t = new Set(properties.map((p) => p.property_type).filter((x): x is string => Boolean(x)));
    return Array.from(t).sort();
  }, [properties]);

  const stats = useMemo(() => {
    const available = properties.filter((p) => !p.under_offer && p.property_type !== 'Land' && (p.bedrooms || 0) > 0);
    return {
      total: available.length,
      withPools: available.filter((p) => p.pool).length,
      underBudget: available.filter((p) => p.price_numeric && p.price_numeric <= BUDGET).length,
      underOffer: properties.filter((p) => p.under_offer).length,
    };
  }, [properties]);

  const suburbStats = useMemo(() => {
    const statsMap: Record<string, { count: number; prices: number[]; pools: number }> = {};
    filteredProperties.forEach((p) => {
      if (!p.suburb) return;
      if (!statsMap[p.suburb]) {
        statsMap[p.suburb] = { count: 0, prices: [], pools: 0 };
      }
      statsMap[p.suburb].count++;
      if (p.price_numeric) statsMap[p.suburb].prices.push(p.price_numeric);
      if (p.pool) statsMap[p.suburb].pools++;
    });

    return Object.entries(statsMap)
      .map(([suburb, data]) => ({
        suburb,
        listings: data.count,
        medianPrice: data.prices.length ? data.prices.sort((a, b) => a - b)[Math.floor(data.prices.length / 2)] : null,
        avgPrice: data.prices.length ? Math.round(data.prices.reduce((a, b) => a + b, 0) / data.prices.length) : null,
        pools: data.pools,
      }))
      .sort((a, b) => (a.medianPrice || 0) - (b.medianPrice || 0));
  }, [filteredProperties]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading properties...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar
        activeView={activeView}
        onViewChange={setActiveView}
        isDark={isDark}
        onToggleDark={() => setIsDark(!isDark)}
      />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-b from-muted/50 to-background py-8">
          <div className="hero-glow"></div>
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-2xl mb-6">
              <h1 className="text-3xl md:text-4xl font-bold mb-2">
                Perth Property Tracker
              </h1>
              <p className="text-muted-foreground">
                Monitoring {stats.total} properties across 27 suburbs. Updated twice daily.
              </p>
            </div>
            <HeroStats
              totalProperties={filteredProperties.length}
              withPools={stats.withPools}
              underBudget={stats.underBudget}
              underOffer={stats.underOffer}
              budget={BUDGET}
            />
          </div>
        </section>

        {/* Main Content */}
        <section className="container mx-auto px-4 py-8">
          {activeView === 'grid' && (
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Desktop Filters Sidebar */}
              <aside className="hidden lg:block w-72 flex-shrink-0">
                <div className="sticky top-20">
                  <Filters
                    filters={filters}
                    onFilterChange={setFilters}
                    suburbs={suburbs}
                    propertyTypes={propertyTypes}
                  />
                </div>
              </aside>

              {/* Property Grid */}
              <div className="flex-1">
                {/* Mobile Filter Button */}
                <div className="lg:hidden mb-4">
                  <Sheet>
                    <SheetTrigger asChild>
                      <Button variant="outline" className="w-full gap-2">
                        <SlidersHorizontal className="h-4 w-4" />
                        Filters
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="w-80">
                      <Filters
                        filters={filters}
                        onFilterChange={setFilters}
                        suburbs={suburbs}
                        propertyTypes={propertyTypes}
                        isMobile
                      />
                    </SheetContent>
                  </Sheet>
                </div>

                <div className="mb-4">
                  <p className="text-sm text-muted-foreground">
                    Showing {filteredProperties.length} of {properties.length} properties
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {filteredProperties.map((property) => (
                    <PropertyCard key={property.id} property={property} />
                  ))}
                </div>

                {filteredProperties.length === 0 && (
                  <Card className="text-center py-12">
                    <CardContent>
                      <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-lg font-medium">No properties found</p>
                      <p className="text-muted-foreground">Try adjusting your filters</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}

          {activeView === 'map' && (
            <Card className="h-[600px] overflow-hidden">
              <CardContent className="p-0 h-full">
                <MapContainer
                  center={[-31.89, 115.80]}
                  zoom={12}
                  className="h-full w-full"
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  {filteredProperties
                    .filter((p) => p.latitude && p.longitude)
                    .map((property) => (
                      <Marker
                        key={property.id}
                        position={[property.latitude!, property.longitude!]}
                      >
                        <Popup>
                          <div className="max-w-xs">
                            <p className="font-bold text-sm">{property.address}</p>
                            <p className="text-primary font-medium">{property.price_display}</p>
                            <p className="text-xs text-muted-foreground mb-2">
                              {property.bedrooms} bed · {property.bathrooms} bath · {property.car_spaces} car
                            </p>
                            <a
                              href={property.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-primary hover:underline flex items-center gap-1"
                            >
                              View on Domain
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                        </Popup>
                      </Marker>
                    ))}
                </MapContainer>
              </CardContent>
            </Card>
          )}

          {activeView === 'investor' && (
            <div className="space-y-8">
              {/* Suburb Stats Table */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Suburb Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-4 font-medium">Suburb</th>
                          <th className="text-right py-3 px-4 font-medium">Listings</th>
                          <th className="text-right py-3 px-4 font-medium">Median Price</th>
                          <th className="text-right py-3 px-4 font-medium">Avg Price</th>
                          <th className="text-right py-3 px-4 font-medium">Pools</th>
                        </tr>
                      </thead>
                      <tbody>
                        {suburbStats.map((row) => (
                          <tr key={row.suburb} className="border-b hover:bg-muted/50">
                            <td className="py-3 px-4 font-medium">{row.suburb}</td>
                            <td className="text-right py-3 px-4">{row.listings}</td>
                            <td className="text-right py-3 px-4">
                              {row.medianPrice ? `$${(row.medianPrice / 1000000).toFixed(2)}M` : '-'}
                            </td>
                            <td className="text-right py-3 px-4">
                              {row.avgPrice ? `$${(row.avgPrice / 1000000).toFixed(2)}M` : '-'}
                            </td>
                            <td className="text-right py-3 px-4">
                              {row.pools > 0 && (
                                <Badge variant="secondary" className="bg-cyan-100 text-cyan-700">
                                  {row.pools}
                                </Badge>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Under Budget Properties */}
              <Card>
                <CardHeader>
                  <CardTitle>Under Budget Properties</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredProperties
                      .filter((p) => p.price_numeric && p.price_numeric <= BUDGET)
                      .slice(0, 6)
                      .map((property) => (
                        <PropertyCard key={property.id} property={property} />
                      ))}
                  </div>
                  {filteredProperties.filter((p) => p.price_numeric && p.price_numeric <= BUDGET).length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      No properties under budget with current filters
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}

export default App;
