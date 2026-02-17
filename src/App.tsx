import { useEffect, useState } from 'react'
import { supabase, Property, Comparable } from '@/lib/supabase'
import { formatPrice, formatDaysOnMarket, cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { 
  Home, TrendingUp, MapPin, Bed, Bath, Car, Maximize2, 
  DollarSign, Map, Grid3X3, Filter, X,
  ExternalLink, Search
} from 'lucide-react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix Leaflet default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

interface Filters {
  suburb: string
  propertyType: string
  minBeds: number
  maxPrice: number | null
  pool: boolean
  underBudget: boolean
  availableOnly: boolean
  hideLand: boolean
  bestValue: boolean
  motivated: boolean
}

const BUDGET = 1750000 // $1.75M budget

function App() {
  const [properties, setProperties] = useState<Property[]>([])
  const [comparables, setComparables] = useState<Comparable[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'grid' | 'map'>('grid')
  const [dashboardMode, setDashboardMode] = useState<'buyer' | 'investor'>('buyer')
  const [filters, setFilters] = useState<Filters>({
    suburb: 'all',
    propertyType: 'all',
    minBeds: 3,
    maxPrice: null,
    pool: false,
    underBudget: false,
    availableOnly: true,
    hideLand: true,
    bestValue: false,
    motivated: false,
  })
  const [filtersOpen, setFiltersOpen] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)
    try {
      const [propertiesRes, comparablesRes] = await Promise.all([
        supabase.from('property_listings').select('*').eq('status', 'active'),
        supabase.from('comparables').select('*'),
      ])
      
      if (propertiesRes.data) setProperties(propertiesRes.data)
      if (comparablesRes.data) setComparables(comparablesRes.data)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Get unique suburbs
  const suburbs = [...new Set(properties.map(p => p.suburb))].sort()

  // Filter properties
  const filteredProperties = properties.filter(p => {
    if (filters.suburb !== 'all' && p.suburb !== filters.suburb) return false
    if (filters.propertyType !== 'all' && p.property_type !== filters.propertyType) return false
    if (p.bedrooms < filters.minBeds) return false
    if (filters.maxPrice && p.price_numeric && p.price_numeric > filters.maxPrice) return false
    if (filters.pool && !p.pool) return false
    if (filters.underBudget && (!p.price_numeric || p.price_numeric > BUDGET)) return false
    if (filters.availableOnly && p.under_offer) return false
    if (filters.hideLand && isLandListing(p.address)) return false
    if (filters.bestValue && !isBestValue(p)) return false
    if (filters.motivated && (!p.motivation_score || p.motivation_score < 3)) return false
    return true
  })

  function isLandListing(address: string): boolean {
    const lower = address.toLowerCase()
    return lower.includes('lot ') || lower.includes('proposed lot') || lower.includes('vacant land')
  }

  function isBestValue(p: Property): boolean {
    const comparable = comparables.find(c => 
      c.suburb === p.suburb && c.bedrooms === p.bedrooms
    )
    if (!comparable || !p.price_numeric) return false
    return p.price_numeric < comparable.avg_sold_price * 0.85
  }

  function getSuburbAvg(suburb: string, beds: number): number | null {
    const comp = comparables.find(c => c.suburb === suburb && c.bedrooms === beds)
    return comp?.avg_sold_price || null
  }

  // Stats
  const stats = {
    total: filteredProperties.length,
    withPhotos: filteredProperties.filter(p => p.photo_url).length,
    pools: filteredProperties.filter(p => p.pool).length,
    underOffer: properties.filter(p => p.under_offer).length,
    underBudget: properties.filter(p => p.price_numeric && p.price_numeric <= BUDGET).length,
  }

  // Property Card Component
  function PropertyCard({ property }: { property: Property }) {
    const suburbAvg = getSuburbAvg(property.suburb, property.bedrooms)
    const priceDiff = suburbAvg && property.price_numeric 
      ? ((property.price_numeric - suburbAvg) / suburbAvg * 100).toFixed(0)
      : null

    return (
      <Card className="overflow-hidden hover:shadow-lg transition-shadow group">
        {/* Image */}
        <div className="relative aspect-[4/3] bg-muted overflow-hidden">
          {property.photo_url ? (
            <img 
              src={property.photo_url} 
              alt={property.address}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <Home className="w-12 h-12" />
            </div>
          )}
          
          {/* Badges overlay */}
          <div className="absolute top-2 left-2 flex flex-wrap gap-1">
            {property.under_offer && <Badge variant="underOffer">Under Offer</Badge>}
            {property.pool && <Badge variant="pool">🏊 Pool</Badge>}
            {property.price_drop_amount && property.price_drop_amount > 0 && (
              <Badge variant="priceDrop">📉 ${(property.price_drop_amount/1000).toFixed(0)}K drop</Badge>
            )}
            {property.beach_distance_km && property.beach_distance_km <= 2 && (
              <Badge variant="beach">🏖️ {property.beach_distance_km.toFixed(1)}km</Badge>
            )}
            {property.motivation_score && property.motivation_score >= 3 && (
              <Badge variant="motivated">🎯 Motivated</Badge>
            )}
            {isBestValue(property) && <Badge variant="bestValue">💎 Best Value</Badge>}
          </div>

          {/* Property type badge */}
          <div className="absolute top-2 right-2">
            <Badge variant={property.property_type === 'house' ? 'house' : property.property_type === 'townhouse' ? 'townhouse' : 'unit'}>
              {property.property_type || 'Property'}
            </Badge>
          </div>
        </div>

        <CardContent className="p-4">
          {/* Price */}
          <div className="flex items-baseline justify-between mb-2">
            <span className="text-xl font-bold text-primary">
              {property.price_display || formatPrice(property.price_numeric)}
            </span>
            {priceDiff && (
              <span className={cn(
                "text-sm font-medium",
                Number(priceDiff) < 0 ? "text-green-600" : "text-red-500"
              )}>
                {Number(priceDiff) > 0 ? '+' : ''}{priceDiff}% vs avg
              </span>
            )}
          </div>

          {/* Address */}
          <h3 className="font-semibold text-sm mb-2 line-clamp-2">{property.address}</h3>
          
          {/* Suburb */}
          <p className="text-sm text-muted-foreground mb-3 flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {property.suburb}
          </p>

          {/* Features */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
            <span className="flex items-center gap-1">
              <Bed className="w-4 h-4" /> {property.bedrooms}
            </span>
            <span className="flex items-center gap-1">
              <Bath className="w-4 h-4" /> {property.bathrooms}
            </span>
            <span className="flex items-center gap-1">
              <Car className="w-4 h-4" /> {property.car_spaces}
            </span>
            {property.land_size && (
              <span className="flex items-center gap-1">
                <Maximize2 className="w-4 h-4" /> {property.land_size}m²
              </span>
            )}
          </div>

          {/* Days on market */}
          {property.first_seen_date && (
            <p className="text-xs text-muted-foreground mb-3">
              {formatDaysOnMarket(property.first_seen_date)}
            </p>
          )}

          {/* Suburb avg (negotiation intel) */}
          {suburbAvg && (
            <div className="text-xs text-muted-foreground mb-3 p-2 bg-muted rounded">
              <DollarSign className="w-3 h-3 inline mr-1" />
              Suburb avg ({property.bedrooms}bed): {formatPrice(suburbAvg)}
            </div>
          )}

          {/* CTA */}
          <Button variant="domain" className="w-full" asChild>
            <a href={property.url} target="_blank" rel="noopener noreferrer">
              View on Domain <ExternalLink className="w-4 h-4 ml-2" />
            </a>
          </Button>
        </CardContent>
      </Card>
    )
  }

  // Investor Stats Component
  function InvestorStats() {
    // Calculate suburb stats
    const suburbStats = suburbs.map(suburb => {
      const suburbProps = filteredProperties.filter(p => p.suburb === suburb && p.price_numeric)
      const prices = suburbProps.map(p => p.price_numeric!).sort((a, b) => a - b)
      const median = prices.length >= 3 
        ? prices[Math.floor(prices.length / 2)] 
        : null
      const avg = prices.length > 0 
        ? prices.reduce((a, b) => a + b, 0) / prices.length 
        : null
      
      return {
        suburb,
        count: suburbProps.length,
        median,
        avg,
        pools: suburbProps.filter(p => p.pool).length,
      }
    }).filter(s => s.median !== null).sort((a, b) => (a.median || 0) - (b.median || 0))

    // Best investment picks (10%+ below median)
    const bestPicks = filteredProperties.filter(p => {
      const comp = comparables.find(c => c.suburb === p.suburb && c.bedrooms === p.bedrooms)
      if (!comp || !p.price_numeric) return false
      return p.price_numeric < comp.avg_sold_price * 0.9
    }).slice(0, 6)

    return (
      <div className="space-y-6">
        {/* Top Suburbs by Median Price */}
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Top Suburbs by Median Price
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Suburb</th>
                    <th className="text-right py-2">Median</th>
                    <th className="text-right py-2">Avg</th>
                    <th className="text-right py-2">Listings</th>
                    <th className="text-right py-2">Pools</th>
                  </tr>
                </thead>
                <tbody>
                  {suburbStats.slice(0, 10).map(s => (
                    <tr key={s.suburb} className="border-b border-muted">
                      <td className="py-2 font-medium">{s.suburb}</td>
                      <td className="py-2 text-right">{formatPrice(s.median)}</td>
                      <td className="py-2 text-right text-muted-foreground">{formatPrice(s.avg)}</td>
                      <td className="py-2 text-right">{s.count}</td>
                      <td className="py-2 text-right">{s.pools}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Best Investment Picks */}
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Best Investment Picks (10%+ Below Median)
            </h3>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {bestPicks.map(p => (
                <PropertyCard key={p.id} property={p} />
              ))}
            </div>
            {bestPicks.length === 0 && (
              <p className="text-muted-foreground text-center py-8">
                No properties found 10%+ below suburb median
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // Map View Component  
  function MapView() {
    const propertiesWithCoords = filteredProperties.filter(p => p.latitude && p.longitude)
    
    if (propertiesWithCoords.length === 0) {
      return (
        <div className="h-[600px] flex items-center justify-center bg-muted rounded-lg">
          <p className="text-muted-foreground">No properties with coordinates to display</p>
        </div>
      )
    }

    const center: [number, number] = [
      propertiesWithCoords.reduce((sum, p) => sum + p.latitude!, 0) / propertiesWithCoords.length,
      propertiesWithCoords.reduce((sum, p) => sum + p.longitude!, 0) / propertiesWithCoords.length,
    ]

    return (
      <div className="h-[600px] rounded-lg overflow-hidden border">
        <MapContainer center={center} zoom={12} className="h-full w-full">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {propertiesWithCoords.map(p => (
            <Marker key={p.id} position={[p.latitude!, p.longitude!]}>
              <Popup>
                <div className="text-sm">
                  <strong>{p.address}</strong>
                  <br />
                  {p.price_display || formatPrice(p.price_numeric)}
                  <br />
                  {p.bedrooms} bed · {p.bathrooms} bath · {p.car_spaces} car
                  <br />
                  <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-primary">
                    View on Domain →
                  </a>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading properties...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-gradient-to-r from-slate-900 to-cyan-900 text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Home className="w-8 h-8" />
              <h1 className="text-3xl font-bold">Perth Property Dashboard</h1>
            </div>
            <p className="text-cyan-200 mb-6">Your smart property search companion</p>
            
            {/* Stats */}
            <div className="flex flex-wrap justify-center gap-4">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2">
                <span className="text-2xl font-bold">{stats.total}</span>
                <span className="text-cyan-200 ml-2">Properties</span>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2">
                <span className="text-2xl font-bold">{stats.pools}</span>
                <span className="text-cyan-200 ml-2">with Pools</span>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2">
                <span className="text-2xl font-bold">{stats.underBudget}</span>
                <span className="text-cyan-200 ml-2">Under Budget</span>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2">
                <span className="text-2xl font-bold">{stats.underOffer}</span>
                <span className="text-cyan-200 ml-2">Under Offer</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {/* Dashboard Mode Tabs */}
        <Tabs value={dashboardMode} onValueChange={(v) => setDashboardMode(v as 'buyer' | 'investor')} className="mb-6">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2">
            <TabsTrigger value="buyer" className="flex items-center gap-2">
              <Home className="w-4 h-4" /> Home Buyer
            </TabsTrigger>
            <TabsTrigger value="investor" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" /> Investor
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Filters & View Toggle */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2">
            <Button 
              variant={filtersOpen ? "default" : "outline"} 
              size="sm"
              onClick={() => setFiltersOpen(!filtersOpen)}
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
              {Object.values(filters).filter(v => v !== 'all' && v !== false && v !== null && v !== 3).length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {Object.values(filters).filter(v => v !== 'all' && v !== false && v !== null && v !== 3).length}
                </Badge>
              )}
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant={view === 'grid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setView('grid')}
            >
              <Grid3X3 className="w-4 h-4" />
            </Button>
            <Button
              variant={view === 'map' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setView('map')}
            >
              <Map className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Filter Panel */}
        {filtersOpen && (
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Filters</h3>
                <Button variant="ghost" size="sm" onClick={() => setFiltersOpen(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {/* Suburb */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Suburb</label>
                  <Select value={filters.suburb} onValueChange={(v) => setFilters({...filters, suburb: v})}>
                    <SelectTrigger>
                      <SelectValue placeholder="All suburbs" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All suburbs</SelectItem>
                      {suburbs.map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Property Type */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Property Type</label>
                  <Select value={filters.propertyType} onValueChange={(v) => setFilters({...filters, propertyType: v})}>
                    <SelectTrigger>
                      <SelectValue placeholder="All types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All types</SelectItem>
                      <SelectItem value="house">House</SelectItem>
                      <SelectItem value="townhouse">Townhouse</SelectItem>
                      <SelectItem value="unit">Unit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Min Beds */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Min Bedrooms</label>
                  <Select value={filters.minBeds.toString()} onValueChange={(v) => setFilters({...filters, minBeds: parseInt(v)})}>
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
                <div>
                  <label className="text-sm font-medium mb-2 block">Max Price</label>
                  <Select 
                    value={filters.maxPrice?.toString() || 'any'} 
                    onValueChange={(v) => setFilters({...filters, maxPrice: v === 'any' ? null : parseInt(v)})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Any price" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any price</SelectItem>
                      <SelectItem value="1000000">$1M</SelectItem>
                      <SelectItem value="1250000">$1.25M</SelectItem>
                      <SelectItem value="1500000">$1.5M</SelectItem>
                      <SelectItem value="1750000">$1.75M</SelectItem>
                      <SelectItem value="2000000">$2M</SelectItem>
                      <SelectItem value="2500000">$2.5M</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Toggle filters */}
              <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Switch checked={filters.pool} onCheckedChange={(c) => setFilters({...filters, pool: c})} />
                  <span className="text-sm">Pool only</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Switch checked={filters.underBudget} onCheckedChange={(c) => setFilters({...filters, underBudget: c})} />
                  <span className="text-sm">Under $1.75M</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Switch checked={filters.availableOnly} onCheckedChange={(c) => setFilters({...filters, availableOnly: c})} />
                  <span className="text-sm">Available only</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Switch checked={filters.hideLand} onCheckedChange={(c) => setFilters({...filters, hideLand: c})} />
                  <span className="text-sm">Hide land</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Switch checked={filters.bestValue} onCheckedChange={(c) => setFilters({...filters, bestValue: c})} />
                  <span className="text-sm">Best value</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Switch checked={filters.motivated} onCheckedChange={(c) => setFilters({...filters, motivated: c})} />
                  <span className="text-sm">Motivated sellers</span>
                </label>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results count */}
        <p className="text-sm text-muted-foreground mb-4">
          Showing {filteredProperties.length} of {properties.length} properties
        </p>

        {/* Content based on mode */}
        {dashboardMode === 'investor' ? (
          <InvestorStats />
        ) : view === 'map' ? (
          <MapView />
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredProperties.map(property => (
              <PropertyCard key={property.id} property={property} />
            ))}
          </div>
        )}

        {filteredProperties.length === 0 && dashboardMode === 'buyer' && (
          <div className="text-center py-12">
            <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No properties found</h3>
            <p className="text-muted-foreground">Try adjusting your filters</p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t mt-12 py-6">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>Perth Property Dashboard • Data from Domain.com.au • Updated twice daily</p>
        </div>
      </footer>
    </div>
  )
}

export default App