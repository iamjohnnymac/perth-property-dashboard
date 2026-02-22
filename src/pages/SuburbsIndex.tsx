import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, MapPin, Home, Moon, Sun, Menu, ArrowRight, Building2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Footer } from '../components/Footer';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

interface SuburbStats {
  suburb: string;
  listing_count: number;
  median_ask: number | null;
  median_sold: number | null;
  weekly_rent: number | null;
  gross_yield: number | null;
  under_offer_pct: number | null;
}

function slugify(suburb: string): string {
  return suburb.toLowerCase().replace(/\s+/g, '-');
}

function formatPrice(price: number | null): string {
  if (!price) return 'N/A';
  if (price >= 1000000) return '$' + (price / 1000000).toFixed(2) + 'M';
  if (price >= 1000) return '$' + Math.round(price / 1000) + 'K';
  return '$' + price;
}

export function SuburbsIndex() {
  const [stats, setStats] = useState<SuburbStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDark, setIsDark] = useState(() => localStorage.getItem('theme') === 'dark');
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    document.title = 'Perth Suburbs - Property Data & Investment Stats | ScopePerth';
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', 'Browse property data for 27 Perth suburbs. Compare median prices, rental yields, and investment metrics. Updated twice daily by ScopePerth.');
  }, []);

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
      const { data } = await supabase.rpc('get_suburb_page_stats');
      if (data) {
        const parsed = (data as any[]).map(d => ({
          suburb: d.suburb,
          listing_count: Number(d.listing_count) || 0,
          median_ask: d.median_ask ? Number(d.median_ask) : null,
          median_sold: d.median_sold ? Number(d.median_sold) : null,
          weekly_rent: d.weekly_rent ? Number(d.weekly_rent) : null,
          gross_yield: d.gross_yield ? Number(d.gross_yield) : null,
          under_offer_pct: d.under_offer_pct ? Number(d.under_offer_pct) : null,
        }));
        const sorted = parsed.sort((a, b) => b.listing_count - a.listing_count);
        setStats(sorted);
      }
      setLoading(false);
    }
    load();
  }, []);

  const totalListings = stats.reduce((sum, s) => sum + s.listing_count, 0);

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
                  <Button variant="default" className="justify-start gap-2"><Building2 className="h-4 w-4" />Suburbs</Button>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
          <div className="hidden lg:flex items-center gap-2">
            <Link to="/"><Button variant="ghost" className="gap-2"><Home className="h-4 w-4" />Dashboard</Button></Link>
            <Button variant="default" className="gap-2"><Building2 className="h-4 w-4" />Suburbs</Button>
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
        <div className="container mx-auto px-4 text-center">
          <Badge variant="secondary" className="mb-4 bg-white/20 text-white border-0">27 suburbs tracked</Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Perth Suburb Explorer</h1>
          <p className="text-lg text-orange-100 max-w-2xl mx-auto mb-6">
            Compare property data, rental yields, and investment metrics across Perth's northern corridor. Updated twice daily.
          </p>
          <div className="flex justify-center gap-8 text-sm">
            <div><span className="text-2xl font-bold">{totalListings}</span><br/>Active Listings</div>
            <div><span className="text-2xl font-bold">{stats.length}</span><br/>Suburbs</div>
          </div>
        </div>
      </section>

      {/* Suburb Grid */}
      <main className="container mx-auto px-4 py-12">
        {loading ? (
          <div className="text-center py-20 text-muted-foreground">Loading suburb data...</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {stats.map((s) => (
              <Link key={s.suburb} to={'/suburbs/' + slugify(s.suburb)} className="block">
                <Card className="hover:shadow-lg transition-shadow hover:border-orange-300 h-full flex flex-col">
                  <CardContent className="p-6 flex-1 flex flex-col">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h2 className="text-xl font-bold capitalize">{s.suburb.toLowerCase()}</h2>
                        <p className="text-sm text-muted-foreground">{s.listing_count} active listing{s.listing_count !== 1 ? 's' : ''}</p>
                      </div>
                      <MapPin className="h-5 w-5 text-orange-500 shrink-0" />
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Median Ask</p>
                        <p className="font-semibold text-lg">{formatPrice(s.median_ask)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Median Sold</p>
                        <p className="font-semibold text-lg">{formatPrice(s.median_sold)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Rent/Week</p>
                        <p className="font-semibold">{s.weekly_rent ? '$' + s.weekly_rent + 'pw' : 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Gross Yield</p>
                        <p className="font-semibold">
                          {s.gross_yield ? (
                            <Badge variant={s.gross_yield >= 3 ? 'default' : 'secondary'} className={s.gross_yield >= 3 ? 'bg-green-500' : s.gross_yield >= 2.5 ? 'bg-yellow-500' : 'bg-red-500'}>
                              {s.gross_yield.toFixed(1)}%
                            </Badge>
                          ) : 'N/A'}
                        </p>
                      </div>
                    </div>
                    <div className="mt-auto pt-4 border-t text-sm text-muted-foreground flex items-center justify-between">
                        <span>{s.under_offer_pct ? s.under_offer_pct.toFixed(0) + '% under offer' : '\u00A0'}</span>
                        <span className="flex items-center text-orange-500 font-medium">
                          View suburb <ArrowRight className="h-4 w-4 ml-1" />
                        </span>
                      </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>

      {/* JSON-LD */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "ItemList",
        "name": "Perth Suburbs - Property Investment Data",
        "description": "Property market data for 27 Perth suburbs including median prices, rental yields, and investment metrics",
        "numberOfItems": stats.length,
        "itemListElement": stats.map((s, i) => ({
          "@type": "ListItem",
          "position": i + 1,
          "name": s.suburb.charAt(0) + s.suburb.slice(1).toLowerCase(),
          "url": "https://perth-property-dashboard.vercel.app/suburbs/" + slugify(s.suburb)
        }))
      }) }} />

      <Footer />
    </div>
  );
}
