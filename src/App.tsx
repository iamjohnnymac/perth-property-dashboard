import { useEffect, useState, useMemo, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { supabase, type Property } from './lib/supabase';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { HeroStats } from './components/HeroStats';
import { PropertyCard } from './components/PropertyCard';
import { Filters } from './components/Filters';
import { PriceTrends } from './components/PriceTrends';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';
import { Button } from './components/ui/button';
import { Badge } from './components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from './components/ui/sheet';
import { SlidersHorizontal, ExternalLink, TrendingUp, Building2, CalendarDays, Bed, Bath, Car, Clock, ArrowDown, Timer, Target, MapPin, Share2, X, CalendarPlus } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import './App.css';

// Fix Leaflet marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export interface FilterState {
  suburb: string;
  propertyType: string;
  minBeds: number;
  maxPrice: number | null;
  poolOnly: boolean;
  availableOnly: boolean;
  hideLand: boolean;
  bestValue: boolean;
  motivatedSeller: boolean;
  favouritesOnly: boolean;
}

const FAVOURITES_KEY = 'perth-favourites';

function loadFavourites(): Set<string | number> {
  try {
    const stored = localStorage.getItem(FAVOURITES_KEY);
    if (stored) {
      const arr = JSON.parse(stored);
      return new Set(arr);
    }
  } catch {
    // ignore
  }
  return new Set();
}

function saveFavourites(favs: Set<string | number>) {
  localStorage.setItem(FAVOURITES_KEY, JSON.stringify(Array.from(favs)));
}

interface InspectionGroup {
  label: string;
  inspections: {
    property: Property;
    openTime: Date;
    closeTime: Date;
  }[];
}



interface RentalData {
  suburb: string;
  bedrooms: number;
  property_type: string;
  median_weekly_rent: number;
}

interface SuburbSoldStats {
  suburb: string;
  median_sold_price: number | null;
  avg_sold_price: number | null;
  num_sold: number;
  median_sold_price_12m: number | null;
  num_sold_12m: number;
}
function getInspectionGroupLabel(date: Date, now: Date): string {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.floor((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';

  const todayDay = today.getDay(); // 0=Sun
  const targetDay = target.getDay();
  // "This Weekend" = upcoming Sat/Sun in the same week
  if ((targetDay === 0 || targetDay === 6) && diffDays <= (7 - todayDay)) return 'This Weekend';

  // "Next Week" = Mon-Sun of the following week
  const daysUntilNextMonday = ((8 - todayDay) % 7) || 7;
  const nextMonday = new Date(today);
  nextMonday.setDate(today.getDate() + daysUntilNextMonday);
  const nextSunday = new Date(nextMonday);
  nextSunday.setDate(nextMonday.getDate() + 6);

  if (target >= nextMonday && target <= nextSunday) return 'Next Week';

  return 'Later';
}

function formatInspectionTime(open: Date, close: Date): string {
  const dayStr = open.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' });
  const openTime = open.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase().replace(' ', '');
  const closeTime = close.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase().replace(' ', '');
  return `${dayStr}, ${openTime} \u2013 ${closeTime}`;
}

function generateIcsUrl(property: Property, openTime: Date, closeTime: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  const formatIcs = (d: Date) =>
    d.getUTCFullYear().toString() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) + 'T' +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) + 'Z';

  const summary = 'Inspection: ' + property.address;
  const location = property.address + ', ' + property.suburb + ' WA';
  const description = [
    property.price_display || 'Price on request',
    property.bedrooms ? property.bedrooms + ' bed' : '',
    property.bathrooms ? property.bathrooms + ' bath' : '',
    property.url || ''
  ].filter(Boolean).join(' | ');

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ScopePerth//Inspection//EN',
    'BEGIN:VEVENT',
    'DTSTART:' + formatIcs(openTime),
    'DTEND:' + formatIcs(closeTime),
    'SUMMARY:' + summary,
    'LOCATION:' + location,
    'DESCRIPTION:' + description,
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');

  return 'data:text/calendar;charset=utf-8,' + encodeURIComponent(ics);
}


// Geolocation control - flies map to user's current location
function LocateControl() {
  const map = useMap();
  const [locating, setLocating] = useState(false);
  const handleLocate = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        map.flyTo([pos.coords.latitude, pos.coords.longitude], 15, { animate: true, duration: 1.5 });
        // Drop a pulse marker at user's location
        const userIcon = L.divIcon({
          className: '',
          html: `<div style="width:16px;height:16px;border-radius:50%;background:#3b82f6;border:3px solid white;box-shadow:0 0 0 4px rgba(59,130,246,0.3);"></div>`,
          iconSize: [16, 16],
          iconAnchor: [8, 8],
        });
        L.marker([pos.coords.latitude, pos.coords.longitude], { icon: userIcon })
          .addTo(map)
          .bindPopup('<b>You are here</b>')
          .openPopup();
        setLocating(false);
      },
      () => setLocating(false),
      { timeout: 10000 }
    );
  };
  return (
    <div
      style={{
        position: 'absolute',
        bottom: '80px',
        right: '10px',
        zIndex: 1000,
      }}
    >
      <button
        onClick={handleLocate}
        title="Go to my location"
        style={{
          width: '34px',
          height: '34px',
          borderRadius: '6px',
          background: 'white',
          border: '2px solid rgba(0,0,0,0.2)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '18px',
          boxShadow: '0 1px 5px rgba(0,0,0,0.2)',
          opacity: locating ? 0.6 : 1,
        }}
      >
        {locating ? '\u23f3' : '\u2295'}
      </button>
    </div>
  );
}

function App() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [rentalData, setRentalData] = useState<RentalData[]>([]);
  const [soldStats, setSoldStats] = useState<SuburbSoldStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<'grid' | 'map' | 'investor' | 'inspections' | 'trends'>('grid');
  const [heroDismissed, setHeroDismissed] = useState(() => {
    return localStorage.getItem('scopeperth_hero_dismissed') === 'true';
  });

  const dismissHero = useCallback(() => {
    setHeroDismissed(true);
    localStorage.setItem('scopeperth_hero_dismissed', 'true');
  }, []);

  const shareData = useCallback(async (text: string) => {
    const sharePayload = {
      title: 'ScopePerth',
      text: text,
      url: 'https://perth-property-dashboard.vercel.app',
    };
    if (navigator.share) {
      try { await navigator.share(sharePayload); } catch {}
    } else {
      try {
        await navigator.clipboard.writeText(text + ' ' + sharePayload.url);
        alert('Copied to clipboard!');
      } catch {}
    }
  }, []);
  const [isDark, setIsDark] = useState(false);
  const [favourites, setFavourites] = useState<Set<string | number>>(() => loadFavourites());
  const [filters, setFilters] = useState<FilterState>({
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


  // Fetch investment data (rental + sold stats)
  useEffect(() => {
    async function fetchInvestmentData() {
      const [rentalRes, soldRes] = await Promise.all([
        supabase.from('rental_data').select('suburb, bedrooms, property_type, median_weekly_rent'),
        supabase.rpc('get_suburb_investment_stats'),
      ]);
      if (rentalRes.data) setRentalData(rentalRes.data);
      if (soldRes.data) setSoldStats(soldRes.data);
    }
    fetchInvestmentData();
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  // Save favourites to localStorage whenever they change
  useEffect(() => {
    saveFavourites(favourites);
  }, [favourites]);

  const handleToggleFavourite = useCallback((id: string | number) => {
    setFavourites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const filteredProperties = useMemo(() => {
    return properties.filter((p) => {
      if (filters.suburb && p.suburb !== filters.suburb) return false;
      if (filters.propertyType && p.property_type !== filters.propertyType) return false;
      if (filters.minBeds && (p.bedrooms || 0) < filters.minBeds) return false;
      if (filters.maxPrice && p.price_numeric && p.price_numeric > filters.maxPrice) return false;
      if (filters.poolOnly && !p.pool) return false;
      if (filters.availableOnly && p.under_offer) return false;
      if (filters.hideLand && (p.property_type === 'Land' || (p.bedrooms || 0) === 0)) return false;
      if (filters.bestValue && (p.motivation_score || 0) < 3) return false;
      if (filters.motivatedSeller && (p.motivation_score || 0) < 3) return false;
      if (filters.favouritesOnly && !favourites.has(p.id)) return false;
      return true;
    });
  }, [properties, filters, favourites]);

  const suburbs = useMemo(() => {
    const s = new Set(properties.map((p) => p.suburb).filter((x): x is string => Boolean(x)));
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
      medianPrice: (() => { const prices = available.filter(p => p.price_numeric).map(p => p.price_numeric!).sort((a,b) => a - b); return prices.length ? prices[Math.floor(prices.length / 2)] : null; })(),
      underOffer: properties.filter((p) => p.under_offer).length,
    };
  }, [properties]);

  const suburbStats = useMemo(() => {
    const statsMap: Record<string, { count: number; prices: number[]; pools: number }> = {};
    filteredProperties.forEach((p) => {
      if (!p.suburb) return;
      const subKey = p.suburb.toUpperCase();
      if (!statsMap[subKey]) {
        statsMap[subKey] = { count: 0, prices: [], pools: 0 };
      }
      statsMap[subKey].count++;
      if (p.price_numeric) statsMap[subKey].prices.push(p.price_numeric);
      if (p.pool) statsMap[subKey].pools++;
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


  // Investment scorecard combining listings, rental, and sold data
  const investmentScorecard = useMemo(() => {
    const rentalLookup: Record<string, number> = {};
    rentalData.forEach(r => {
      if (r.bedrooms === 3 && r.property_type === 'house') {
        rentalLookup[r.suburb.toUpperCase()] = r.median_weekly_rent;
      }
    });
    const soldLookup: Record<string, SuburbSoldStats> = {};
    soldStats.forEach(s => {
      soldLookup[s.suburb.toUpperCase()] = s;
    });

    return suburbStats.map(row => {
      const key = row.suburb.toUpperCase();
      const rent = rentalLookup[key];
      const sold = soldLookup[key];
      const medianAsk = row.medianPrice;
      const medianSold = sold?.median_sold_price ? Number(sold.median_sold_price) : null;
      const grossYield = (rent && medianAsk) ? ((rent * 52) / medianAsk * 100) : null;
      const askVsSold = (medianAsk && medianSold) ? ((medianAsk - medianSold) / medianSold * 100) : null;
      const suburbListings = filteredProperties.filter(p => p.suburb?.toUpperCase() === key);
      const underOfferCount = suburbListings.filter(p => p.under_offer).length;
      const underOfferRate = suburbListings.length > 0 ? (underOfferCount / suburbListings.length * 100) : 0;

      return {
        suburb: row.suburb,
        listings: row.listings,
        medianAsk,
        weeklyRent: rent || null,
        grossYield,
        medianSold,
        numSold: sold?.num_sold || 0,
        askVsSold,
        underOfferRate,
        underOfferCount,
      };
    }).sort((a, b) => (b.grossYield || 0) - (a.grossYield || 0));
  }, [suburbStats, rentalData, soldStats, filteredProperties]);

  // Best bargains: properties asking below suburb median sold
  const bestBargains = useMemo(() => {
    const soldLookup: Record<string, number> = {};
    soldStats.forEach(s => {
      if (s.median_sold_price) soldLookup[s.suburb.toUpperCase()] = Number(s.median_sold_price);
    });
    return filteredProperties
      .filter(p => {
        if (!p.price_numeric || !p.suburb || p.under_offer) return false;
        const ms = soldLookup[p.suburb.toUpperCase()];
        return ms ? p.price_numeric < ms : false;
      })
      .map(p => {
        const ms = soldLookup[p.suburb!.toUpperCase()];
        return { ...p, discount: ((ms - p.price_numeric!) / ms * 100), medianSold: ms };
      })
      .sort((a, b) => b.discount - a.discount)
      .slice(0, 6);
  }, [filteredProperties, soldStats]);

  // Price drops sorted by biggest reduction
  const priceDropProperties = useMemo(() => {
    return filteredProperties
      .filter(p => p.price_drop_amount && p.price_drop_amount > 0)
      .sort((a, b) => (b.price_drop_amount || 0) - (a.price_drop_amount || 0));
  }, [filteredProperties]);

  // Longest listed (most negotiable vendors)
  const longestListed = useMemo(() => {
    return filteredProperties
      .filter(p => p.first_seen_date && !p.under_offer)
      .map(p => ({
        ...p,
        daysOnMarket: Math.floor((Date.now() - new Date(p.first_seen_date!).getTime()) / (1000 * 60 * 60 * 24)),
      }))
      .sort((a, b) => b.daysOnMarket - a.daysOnMarket)
      .slice(0, 6);
  }, [filteredProperties]);

  // Inspection groups
  const inspectionGroups = useMemo(() => {
    const now = new Date();
    const inspections: { property: Property; openTime: Date; closeTime: Date }[] = [];

    properties.forEach((p) => {
      if (p.inspection_open_time && p.inspection_close_time) {
        const openTime = new Date(p.inspection_open_time);
        const closeTime = new Date(p.inspection_close_time);
        if (openTime > now) {
          inspections.push({ property: p, openTime, closeTime });
        }
      }
    });

    inspections.sort((a, b) => a.openTime.getTime() - b.openTime.getTime());

    const groupOrder = ['Today', 'Tomorrow', 'This Weekend', 'Next Week', 'Later'];
    const groupMap: Record<string, InspectionGroup> = {};

    inspections.forEach((insp) => {
      const label = getInspectionGroupLabel(insp.openTime, now);
      if (!groupMap[label]) {
        groupMap[label] = { label, inspections: [] };
      }
      groupMap[label].inspections.push(insp);
    });

    return groupOrder.filter((l) => groupMap[l]).map((l) => groupMap[l]);
  }, [properties]);

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
        {/* Dismissable Hero Section - first visit only */}
        {!heroDismissed && (
          <section className="relative overflow-hidden bg-gradient-to-br from-orange-500 via-orange-600 to-orange-700 text-white py-16 md:py-20">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.1),transparent_70%)]"></div>
            <button
              onClick={dismissHero}
              className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors z-20"
              aria-label="Dismiss hero"
            >
              <X className="h-6 w-6" />
            </button>
            <div className="container mx-auto px-4 relative z-10">
              <div className="max-w-3xl">
                <Badge className="bg-white/20 text-white border-0 mb-4 text-xs font-medium backdrop-blur-sm">
                  Free &middot; Live data &middot; Updated twice daily
                </Badge>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 leading-tight">
                  Perth property intelligence
                  <span className="block text-white/90">built for buyers.</span>
                </h1>
                <p className="text-lg md:text-xl text-white/80 mb-8 max-w-2xl">
                  Track {stats.total} properties across 27 suburbs. Compare suburb trends.
                  Plan your inspections. Spot the best value &mdash; all in one place.
                </p>
                <div className="flex flex-wrap gap-4">
                  <Button
                    size="lg"
                    onClick={() => { dismissHero(); setActiveView('grid'); }}
                    className="bg-white text-orange-600 hover:bg-white/90 font-semibold px-8"
                  >
                    Start Scoping
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => { dismissHero(); setActiveView('investor'); }}
                    className="border-2 border-white !text-white hover:bg-white/20 font-semibold px-8"
                  >
                    See Investment Data &rarr;
                  </Button>
                </div>
                <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                  <div>
                    <div className="text-3xl font-bold">{stats.total}</div>
                    <div className="text-sm text-white/70">Active Listings</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold">27</div>
                    <div className="text-sm text-white/70">Suburbs Tracked</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold">{stats.underOffer}</div>
                    <div className="text-sm text-white/70">Under Offer</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold">2x</div>
                    <div className="text-sm text-white/70">Daily Updates</div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Compact Header + Stats - always shown */}
        <section className="relative overflow-hidden bg-gradient-to-b from-muted/50 to-background py-8">
          <div className="hero-glow"></div>
          <div className="container mx-auto px-4 relative z-10">
            {heroDismissed && (
              <div className="max-w-2xl mb-6">
                <h1 className="text-3xl md:text-4xl font-bold mb-2">
                  ScopePerth
                </h1>
                <p className="text-muted-foreground">
                  Perth property intelligence - free, live, and built for buyers. Tracking {stats.total} properties across 27 suburbs.
                </p>
              </div>
            )}
            <HeroStats
              totalProperties={filteredProperties.length}
              withPools={stats.withPools}
              medianPrice={stats.medianPrice}
              underOffer={stats.underOffer}
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
                    favouriteCount={favourites.size}
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
                        favouriteCount={favourites.size}
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
                    <PropertyCard
                      key={property.id}
                      property={property}
                      isFavourite={favourites.has(property.id)}
                      onToggleFavourite={handleToggleFavourite}
                    />
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
            <div className="relative">
              <Card className="h-[650px] overflow-hidden">
                <CardContent className="p-0 h-full">
                  <MapContainer
                    center={[-31.89, 115.80]}
                    zoom={12}
                    className="h-full w-full"
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
                      url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                    />
                    <LocateControl />
                    {filteredProperties
                      .filter((p) => p.latitude && p.longitude && Math.abs(p.latitude! % 1) > 0.001)
                      .map((property) => {
                        const typeColors: Record<string, string> = {
                          house: '#f97316',
                          townhouse: '#3b82f6',
                          unit: '#22c55e',
                          villa: '#a855f7',
                          duplex: '#ec4899',
                        };
                        const color = typeColors[property.property_type?.toLowerCase() ?? ''] ?? '#6b7280';
                        const markerIcon = L.divIcon({
                          className: '',
                          html: `<div style="width:18px;height:18px;border-radius:50%;background:${color};border:2.5px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.35);"></div>`,
                          iconSize: [18, 18],
                          iconAnchor: [9, 9],
                        });
                        return (
                          <Marker
                            key={property.id}
                            position={[property.latitude!, property.longitude!]}
                            icon={markerIcon}
                          >
                            <Popup maxWidth={240}>
                              <div style={{width:'220px',fontFamily:'inherit'}}>
                                {property.photo_url && (
                                  <img
                                    src={property.photo_url}
                                    alt={property.address}
                                    style={{width:'100%',height:'110px',objectFit:'cover',borderRadius:'6px',marginBottom:'8px',display:'block'}}
                                  />
                                )}
                                <p style={{fontWeight:'700',fontSize:'13px',margin:'0 0 3px',lineHeight:'1.3',color:'#111'}}>{property.address}</p>
                                <p style={{color:'#f97316',fontWeight:'700',fontSize:'15px',margin:'0 0 4px'}}>{property.price_display}</p>
                                <p style={{fontSize:'11px',color:'#888',margin:'0 0 8px'}}>
                                  {property.bedrooms}bd \u00b7 {property.bathrooms}ba \u00b7 {property.car_spaces ?? 0}car
                                </p>
                                <a
                                  href={property.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{fontSize:'12px',color:'#f97316',fontWeight:'600',textDecoration:'none'}}
                                >
                                  View on Domain \u2192
                                </a>
                              </div>
                            </Popup>
                          </Marker>
                        );
                      })}
                  </MapContainer>
                </CardContent>
              </Card>
              {/* Property count badge */}
              <div className="absolute top-3 right-3 z-[1000] bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm rounded-full px-3 py-1.5 shadow-md border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-1.5">
                <MapPin className="h-4 w-4 inline" />
                <span>{filteredProperties.filter(p => p.latitude && p.longitude && Math.abs(p.latitude! % 1) > 0.001).length} properties</span>
              </div>
              {/* Map Legend */}
              <div className="absolute bottom-4 right-4 z-[1000] bg-white dark:bg-gray-900 rounded-lg shadow-lg border p-3 text-xs space-y-1.5">
                <p className="font-semibold text-gray-700 dark:text-gray-300 mb-1">Property Type</p>
                {[
                  { label: 'House', color: '#f97316' },
                  { label: 'Townhouse', color: '#3b82f6' },
                  { label: 'Unit / Apartment', color: '#22c55e' },
                  { label: 'Villa', color: '#a855f7' },
                  { label: 'Other', color: '#6b7280' },
                ].map(({ label, color }) => (
                  <div key={label} className="flex items-center gap-2">
                    <div style={{ width: 12, height: 12, borderRadius: '50%', background: color, border: '2px solid white', boxShadow: '0 1px 2px rgba(0,0,0,0.3)' }} />
                    <span className="text-gray-600 dark:text-gray-400">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeView === 'inspections' && (
            <div className="space-y-6 max-w-4xl mx-auto">
              <div className="flex items-center gap-2 mb-2">
                <CalendarDays className="h-6 w-6 text-primary" />
                <h2 className="text-2xl font-bold">Upcoming Inspections</h2>
              </div>

              {inspectionGroups.length === 0 ? (
                <Card className="text-center py-12">
                  <CardContent>
                    <CalendarDays className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-lg font-medium">No upcoming inspections</p>
                    <p className="text-muted-foreground">
                      New inspection times are scraped twice daily. Check back soon!
                    </p>
                  </CardContent>
                </Card>
              ) : (
                inspectionGroups.map((group) => (
                  <div key={group.label}>
                    <h3 className="text-lg font-semibold mb-3 text-primary">{group.label}</h3>
                    <div className="space-y-3">
                      {group.inspections.map((insp) => (
                        <Card key={`${insp.property.id}-${insp.openTime.toISOString()}`} className="overflow-hidden hover:shadow-md transition-shadow">
                          <div className="flex flex-col sm:flex-row">
                            {/* Property Photo */}
                            <div className="sm:w-48 sm:h-36 h-40 flex-shrink-0 bg-muted overflow-hidden">
                              {insp.property.photo_url ? (
                                <img
                                  src={insp.property.photo_url}
                                  alt={insp.property.address}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                  <Building2 className="h-8 w-8" />
                                </div>
                              )}
                            </div>

                            {/* Details */}
                            <CardContent className="flex-1 p-4 flex flex-col justify-between">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <Clock className="h-4 w-4 text-primary" />
                                  <span className="font-semibold text-sm text-primary">
                                    {formatInspectionTime(insp.openTime, insp.closeTime)}
                                  </span>
                                </div>
                                <p className="font-medium text-sm line-clamp-1" title={insp.property.address}>
                                  {insp.property.address}
                                </p>
                                <p className="text-xs text-muted-foreground mb-2">
                                  {insp.property.suburb}
                                </p>
                                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                  <span className="font-semibold text-sm text-foreground">
                                    {insp.property.price_display || 'Price on request'}
                                  </span>
                                  {insp.property.bedrooms && (
                                    <span className="flex items-center gap-1">
                                      <Bed className="h-3 w-3" />
                                      {insp.property.bedrooms}
                                    </span>
                                  )}
                                  {insp.property.bathrooms && (
                                    <span className="flex items-center gap-1">
                                      <Bath className="h-3 w-3" />
                                      {insp.property.bathrooms}
                                    </span>
                                  )}
                                  {insp.property.car_spaces && (
                                    <span className="flex items-center gap-1">
                                      <Car className="h-3 w-3" />
                                      {insp.property.car_spaces}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="mt-2 flex gap-2">
                                <Button asChild size="sm" variant="outline">
                                  <a href={insp.property.url} target="_blank" rel="noopener noreferrer">
                                    View on Domain
                                    <ExternalLink className="ml-1 h-3 w-3" />
                                  </a>
                                </Button>
                                <Button asChild size="sm" variant="default" className="bg-orange-500 hover:bg-orange-600">
                                  <a href={generateIcsUrl(insp.property, insp.openTime, insp.closeTime)} download={'inspection-' + insp.property.address.replace(/[^a-zA-Z0-9]/g, '-').substring(0, 30) + '.ics'}>
                                    <CalendarPlus className="mr-1 h-3 w-3" />
                                    Add to Calendar
                                  </a>
                                </Button>
                              </div>
                            </CardContent>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeView === 'trends' && (
            <PriceTrends />
          )}

          {activeView === 'investor' && (
            <div className="space-y-8">
              {/* Suburb Investment Scorecard */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Suburb Investment Scorecard
                    <button
                      onClick={() => shareData('Perth suburb investment scorecard - yield, growth and demand signals across 27 suburbs.')}
                      className="ml-auto text-muted-foreground hover:text-foreground transition-colors"
                      title="Share scorecard"
                    >
                      <Share2 className="h-4 w-4" />
                    </button>
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Yield, growth and demand signals across your target suburbs
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-3 font-medium">Suburb</th>
                          <th className="text-right py-3 px-3 font-medium">Listings</th>
                          <th className="text-right py-3 px-3 font-medium">Median Ask</th>
                          <th className="text-right py-3 px-3 font-medium">Rent/wk</th>
                          <th className="text-right py-3 px-3 font-medium">Yield</th>
                          <th className="text-right py-3 px-3 font-medium">Sold (3m)</th>
                          <th className="text-right py-3 px-3 font-medium">Ask vs Sold</th>
                          <th className="text-right py-3 px-3 font-medium">Under Offer</th>
                        </tr>
                      </thead>
                      <tbody>
                        {investmentScorecard.map((row) => (
                          <tr key={row.suburb} className="border-b hover:bg-muted/50 group">
                            <td className="py-3 px-3 font-medium">
                              <span className="flex items-center gap-2">
                                {row.suburb}
                                <button
                                  onClick={() => shareData(
                                    `${row.suburb}: Median $${row.medianAsk ? (row.medianAsk/1000000).toFixed(2) + 'M' : 'N/A'}` +
                                    `${row.grossYield ? ' | Yield ' + row.grossYield.toFixed(1) + '%' : ''}` +
                                    `${row.weeklyRent ? ' | Rent $' + row.weeklyRent + '/wk' : ''}` +
                                    ' via ScopePerth'
                                  )}
                                  className="text-muted-foreground hover:text-foreground transition-colors opacity-0 group-hover:opacity-100"
                                  title={`Share ${row.suburb} data`}
                                >
                                  <Share2 className="h-3 w-3" />
                                </button>
                              </span>
                            </td>
                            <td className="text-right py-3 px-3">{row.listings}</td>
                            <td className="text-right py-3 px-3">
                              {row.medianAsk ? `$${(row.medianAsk / 1000000).toFixed(2)}M` : '-'}
                            </td>
                            <td className="text-right py-3 px-3">
                              {row.weeklyRent ? `$${row.weeklyRent}` : '-'}
                            </td>
                            <td className="text-right py-3 px-3">
                              {row.grossYield ? (
                                <Badge variant="secondary" className={
                                  row.grossYield >= 4 ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' :
                                  row.grossYield >= 3 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300' :
                                  'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                                }>
                                  {row.grossYield.toFixed(1)}%
                                </Badge>
                              ) : '-'}
                            </td>
                            <td className="text-right py-3 px-3">
                              {row.medianSold ? `$${(row.medianSold / 1000000).toFixed(2)}M` : '-'}
                              {row.numSold > 0 && <span className="text-xs text-muted-foreground ml-1">({row.numSold})</span>}
                            </td>
                            <td className="text-right py-3 px-3">
                              {row.askVsSold !== null ? (
                                <span className={row.askVsSold > 0 ? 'text-red-500 font-medium' : 'text-green-500 font-medium'}>
                                  {row.askVsSold > 0 ? '\u2191' : '\u2193'} {Math.abs(row.askVsSold).toFixed(0)}%
                                </span>
                              ) : '-'}
                            </td>
                            <td className="text-right py-3 px-3">
                              {row.underOfferRate > 0 ? (
                                <span className="text-orange-500">{row.underOfferRate.toFixed(0)}%</span>
                              ) : <span className="text-muted-foreground">0%</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-muted-foreground mt-4">
                    Yield = (Weekly Rent x 52) / Median Ask Price. Rent based on 3-bed houses. Sold data from last 3 months.
                  </p>
                </CardContent>
              </Card>

              {/* Best Bargains */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Best Bargains
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Properties asking below their suburb's recent median sold price
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {bestBargains.map((property) => (
                      <div key={property.id} className="relative">
                        <Badge className="absolute top-2 left-2 z-10 bg-green-600 text-white shadow-md">
                          {property.discount.toFixed(0)}% below median
                        </Badge>
                        <PropertyCard
                          property={property}
                          isFavourite={favourites.has(property.id)}
                          onToggleFavourite={handleToggleFavourite}
                        />
                      </div>
                    ))}
                  </div>
                  {bestBargains.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      No properties currently priced below their suburb's median sold price
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Price Drops */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ArrowDown className="h-5 w-5" />
                    Price Drops
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {priceDropProperties.length} {priceDropProperties.length === 1 ? 'property has' : 'properties have'} reduced asking prices
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {priceDropProperties.slice(0, 6).map((property) => (
                      <div key={property.id} className="relative">
                        <Badge className="absolute top-2 left-2 z-10 bg-red-600 text-white shadow-md">
                          \u2193 ${((property.price_drop_amount || 0) / 1000).toFixed(0)}K
                        </Badge>
                        <PropertyCard
                          property={property}
                          isFavourite={favourites.has(property.id)}
                          onToggleFavourite={handleToggleFavourite}
                        />
                      </div>
                    ))}
                  </div>
                  {priceDropProperties.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      No price drops detected yet - monitoring twice daily
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Longest on Market */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Timer className="h-5 w-5" />
                    Longest on Market
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Properties listed longest - vendors may be more open to negotiation
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {longestListed.map((property) => (
                      <div key={property.id} className="relative">
                        <Badge className="absolute top-2 left-2 z-10 bg-amber-600 text-white shadow-md">
                          {property.daysOnMarket} days listed
                        </Badge>
                        <PropertyCard
                          property={property}
                          isFavourite={favourites.has(property.id)}
                          onToggleFavourite={handleToggleFavourite}
                        />
                      </div>
                    ))}
                  </div>
                  {longestListed.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      No long-listed properties found with current filters
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