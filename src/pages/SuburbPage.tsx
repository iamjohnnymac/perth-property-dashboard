import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Search, MapPin, Home, Moon, Sun, Menu, ArrowLeft, Building2, Bed, Bath, Car, ExternalLink, Heart, TrendingUp, TrendingDown, User } from 'lucide-react';
import { supabase, Property } from '../lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Footer } from '../components/Footer';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

function deslugify(slug: string): string {
  return slug.replace(/-/g, ' ').toUpperCase();
}

function formatPrice(price: number | null): string {
  if (!price) return 'N/A';
  if (price >= 1000000) return '$' + (price / 1000000).toFixed(2) + 'M';
  if (price >= 1000) return '$' + Math.round(price / 1000) + 'K';
  return '$' + price;
}

function titleCase(s: string): string {
  return s.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

export function SuburbPage() {
  const { slug } = useParams<{ slug: string }>();
  const suburbName = slug ? deslugify(slug) : '';
  const displayName = titleCase(suburbName);

  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDark, setIsDark] = useState(() => localStorage.getItem('theme') === 'dark');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [favourites, setFavourites] = useState<Set<string | number>>(() => {
    try {
      const saved = localStorage.getItem('favourites');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch { return new Set(); }
  });
  const [investStats, setInvestStats] = useState<any>(null);

  useEffect(() => {
    document.title = 'Properties in ' + displayName + ' WA | ScopePerth';
  }, [displayName]);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  useEffect(() => {
    async function load() {
      const [listingsRes, statsRes] = await Promise.all([
        supabase
          .from('property_listings')
          .select('*')
          .eq('suburb', suburbName)
          .eq('status', 'active')
          .order('price_numeric', { ascending: true, nullsFirst: false }),
        supabase.rpc('get_suburb_investment_stats')
      ]);

      if (listingsRes.data) setProperties(listingsRes.data);
      if (statsRes.data) {
        const match = (statsRes.data as any[]).find(s => s.suburb === suburbName);
        if (match) setInvestStats(match);
      }
      setLoading(false);
    }
    if (suburbName) load();
  }, [suburbName]);

  const toggleFav = (id: string | number) => {
    setFavourites(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      localStorage.setItem('favourites', JSON.stringify([...next]));
      return next;
    });
  };

  const medianPrice = properties.length > 0
    ? properties.filter(p => p.price_numeric).sort((a, b) => (a.price_numeric || 0) - (b.price_numeric || 0))[Math.floor(properties.filter(p => p.price_numeric).length / 2)]?.price_numeric
    : null;
  const underOfferCount = properties.filter(p => p.under_offer).length;
  const underOfferPct = properties.length > 0 ? Math.round((underOfferCount / properties.length) * 100) : 0;

  const metaDescription = 'Browse ' + properties.length + ' properties for sale in ' + displayName + ' WA.' + (medianPrice ? ' Median price ' + formatPrice(medianPrice) + '.' : '') + ' Updated twice daily by ScopePerth.';

  useEffect(() => {
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', metaDescription);
  }, [metaDescription]);

  const priceDropProps = properties.filter(p => p.price_drop_amount && p.price_drop_amount > 0);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navbar */}
      <header className="sticky border-b top-0 z-40 w-full bg-white dark:border-b-slate-700 dark:bg-background">
        <nav className="container mx-auto h-14 px-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 whitespace-nowrap shrink-0">
            <Search className="h-6 w-6 text-primary" />
            <div>
              <span className="font-bold text-xl">ScopePerth</span>
              <span className="hidden md:inline text-xs text-muted-foreground ml-2">See every angle of Perth property</span>
            </div>
          </Link>
          <div className="flex lg:hidden items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setIsDark(!isDark)}>
              {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild><Button variant="ghost" size="icon"><Menu className="h-5 w-5" /></Button></SheetTrigger>
              <SheetContent side="left">
                <SheetHeader><SheetTitle className="font-bold text-xl flex items-center gap-2"><Search className="h-5 w-5 text-primary" />ScopePerth</SheetTitle></SheetHeader>
                <nav className="flex flex-col gap-2 mt-6">
                  <Link to="/"><Button variant="ghost" className="justify-start gap-2 w-full"><Home className="h-4 w-4" />Dashboard</Button></Link>
                  <Link to="/suburbs"><Button variant="ghost" className="justify-start gap-2 w-full"><Building2 className="h-4 w-4" />All Suburbs</Button></Link>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
          <div className="hidden lg:flex items-center gap-2">
            <Link to="/"><Button variant="ghost" className="gap-2"><Home className="h-4 w-4" />Dashboard</Button></Link>
            <Link to="/suburbs"><Button variant="ghost" className="gap-2"><Building2 className="h-4 w-4" />Suburbs</Button></Link>
            <div className="ml-2 border-l pl-2">
              <Button variant="ghost" size="icon" onClick={() => setIsDark(!isDark)}>
                {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </Button>
            </div>
          </div>
        </nav>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-r from-orange-500 to-orange-600 text-white py-16">
        <div className="container mx-auto px-4">
          <Link to="/suburbs" className="inline-flex items-center gap-1 text-orange-100 hover:text-white mb-4 text-sm">
            <ArrowLeft className="h-4 w-4" /> All suburbs
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <MapPin className="h-8 w-8" />
            <h1 className="text-4xl md:text-5xl font-bold">{displayName}</h1>
            <Badge variant="secondary" className="bg-white/20 text-white border-0">WA 6019</Badge>
          </div>
          <p className="text-orange-100 text-lg mb-8">Perth, Western Australia</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="bg-white/10 rounded-lg p-4">
              <p className="text-orange-200 text-sm">Active Listings</p>
              <p className="text-3xl font-bold">{properties.length}</p>
            </div>
            <div className="bg-white/10 rounded-lg p-4">
              <p className="text-orange-200 text-sm">Median Ask</p>
              <p className="text-3xl font-bold">{formatPrice(medianPrice)}</p>
            </div>
            <div className="bg-white/10 rounded-lg p-4">
              <p className="text-orange-200 text-sm">Gross Yield</p>
              <p className="text-3xl font-bold">{investStats?.gross_yield ? investStats.gross_yield.toFixed(1) + '%' : 'N/A'}</p>
            </div>
            <div className="bg-white/10 rounded-lg p-4">
              <p className="text-orange-200 text-sm">Under Offer</p>
              <p className="text-3xl font-bold">{underOfferPct}%</p>
            </div>
          </div>
        </div>
      </section>

      <main className="container mx-auto px-4 py-12">
        {loading ? (
          <div className="text-center py-20 text-muted-foreground">Loading properties...</div>
        ) : (
          <>
            {/* Investment Summary */}
            {investStats && (
              <Card className="mb-8">
                <CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-orange-500" />Investment Snapshot</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
                    <div>
                      <p className="text-sm text-muted-foreground">Median Sold (3mo)</p>
                      <p className="text-xl font-bold">{formatPrice(investStats.median_sold)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Weekly Rent</p>
                      <p className="text-xl font-bold">{investStats.weekly_rent ? '$' + investStats.weekly_rent + 'pw' : 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Gross Yield</p>
                      <p className="text-xl font-bold">{investStats.gross_yield ? investStats.gross_yield.toFixed(1) + '%' : 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Ask vs Sold</p>
                      <p className="text-xl font-bold">{investStats.median_ask && investStats.median_sold ? (
                        investStats.median_ask > investStats.median_sold ?
                          <span className="text-red-500">{Math.round(((investStats.median_ask - investStats.median_sold) / investStats.median_sold) * 100)}% above</span> :
                          <span className="text-green-500">{Math.round(((investStats.median_sold - investStats.median_ask) / investStats.median_sold) * 100)}% below</span>
                      ) : 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Price Drops</p>
                      <p className="text-xl font-bold text-red-500">{priceDropProps.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Listings */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Properties for Sale</h2>
              <Badge variant="outline">{properties.length} listing{properties.length !== 1 ? 's' : ''}</Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {properties.map((p) => {
                const daysOnMarket = p.first_seen_date ? Math.floor((Date.now() - new Date(p.first_seen_date).getTime()) / (1000 * 60 * 60 * 24)) : null;
                const priceDropPct = p.original_price && p.price_numeric && p.price_numeric < p.original_price
                  ? Math.round((1 - p.price_numeric / p.original_price) * 100)
                  : null;
                const isFav = favourites.has(p.id);

                return (
                  <Card key={p.id} className="overflow-hidden hover:shadow-lg transition-shadow group">
                    <div className="relative aspect-[4/3] bg-muted overflow-hidden">
                      {p.photo_url ? (
                        <img src={p.photo_url} alt={p.address} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground"><Home className="h-12 w-12" /></div>
                      )}
                      <div className="absolute top-2 left-2 flex gap-1">
                        {p.under_offer && <Badge className="bg-orange-500">Under Offer</Badge>}
                        {daysOnMarket !== null && daysOnMarket <= 7 && <Badge className="bg-green-500">New</Badge>}
                        {priceDropPct !== null && <Badge className="bg-red-500">-{priceDropPct}%</Badge>}
                      </div>
                      <button onClick={() => toggleFav(p.id)} className="absolute top-2 right-2 p-1.5 rounded-full bg-white/80 hover:bg-white transition-colors">
                        <Heart className={'h-5 w-5 ' + (isFav ? 'fill-red-500 text-red-500' : 'text-gray-600')} />
                      </button>
                    </div>
                    <CardContent className="p-4">
                      <p className="text-lg font-bold text-orange-500 mb-1">{p.price_display || 'Contact Agent'}</p>
                      <p className="font-medium text-sm mb-2 line-clamp-1">{p.address}</p>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground mb-3">
                        <span className="flex items-center gap-1"><Bed className="h-3.5 w-3.5" />{p.bedrooms}</span>
                        <span className="flex items-center gap-1"><Bath className="h-3.5 w-3.5" />{p.bathrooms}</span>
                        <span className="flex items-center gap-1"><Car className="h-3.5 w-3.5" />{p.car_spaces}</span>
                        {p.land_size && <span>{p.land_size}m2</span>}
                      </div>
                      {p.agent_name && (
                        <p className="text-xs text-muted-foreground mb-3 flex items-center gap-1">
                          <User className="h-3 w-3" />{p.agent_name}{p.agency_name ? ' | ' + p.agency_name : ''}
                        </p>
                      )}
                      <a href={p.url} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm" className="w-full gap-2">
                          View on Domain <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                      </a>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {properties.length === 0 && (
              <div className="text-center py-20 text-muted-foreground">
                <p>No active listings in {displayName} right now.</p>
                <Link to="/suburbs"><Button variant="outline" className="mt-4">Browse other suburbs</Button></Link>
              </div>
            )}
          </>
        )}
      </main>

      {/* JSON-LD */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Place",
        "name": displayName + ", Western Australia",
        "description": metaDescription,
        "address": {
          "@type": "PostalAddress",
          "addressLocality": displayName,
          "addressRegion": "WA",
          "addressCountry": "AU"
        },
        "containedInPlace": {
          "@type": "City",
          "name": "Perth"
        }
      }) }} />

      <Footer />
    </div>
  );
}
