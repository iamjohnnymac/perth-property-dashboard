import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

interface SoldRecord {
  suburb: string;
  sold_date: string;
  sold_price: number;
  property_type: string | null;
}

interface QuarterPoint {
  quarter: string;
  [suburb: string]: string | number | null;
}

const LINE_COLORS = ['#f97316', '#3b82f6', '#10b981', '#8b5cf6', '#ef4444'];
const DEFAULT_SUBURBS = ['SCARBOROUGH', 'HILLARYS', 'KARRINYUP'];

const PERIOD_OPTIONS = [
  { label: '1 Year', months: 12 },
  { label: '2 Years', months: 24 },
  { label: '3 Years', months: 36 },
  { label: '5 Years', months: 60 },
  { label: 'All Time', months: 0 },
];

const PROPERTY_TYPES = ['all', 'house', 'unit', 'townhouse'];

function getQuarterLabel(dateStr: string): string {
  const date = new Date(dateStr);
  const q = Math.ceil((date.getMonth() + 1) / 3);
  return `${date.getFullYear()} Q${q}`;
}

function calcMedian(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

function formatPrice(value: number): string {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
  return `$${(value / 1000).toFixed(0)}K`;
}

function titleCase(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export function PriceTrends() {
  const [soldData, setSoldData] = useState<SoldRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [availableSuburbs, setAvailableSuburbs] = useState<string[]>([]);
  const [selectedSuburbs, setSelectedSuburbs] = useState<string[]>(DEFAULT_SUBURBS);
  const [propertyType, setPropertyType] = useState<string>('house');
  const [period, setPeriod] = useState<number>(36);

  // Fetch available suburbs on mount using DB function to avoid row limit issues
  useEffect(() => {
    async function fetchSuburbs() {
      const { data } = await supabase.rpc('get_distinct_sold_suburbs');
      if (data) {
        setAvailableSuburbs((data as { suburb: string }[]).map((r) => r.suburb));
      }
    }
    fetchSuburbs();
  }, []);

  // Fetch sold data when filters change
  useEffect(() => {
    if (!selectedSuburbs.length) {
      setSoldData([]);
      setLoading(false);
      return;
    }

    async function fetchSoldData() {
      setLoading(true);
      const cutoff =
        period > 0
          ? new Date(Date.now() - period * 30.5 * 24 * 60 * 60 * 1000)
              .toISOString()
              .split('T')[0]
          : '2000-01-01';

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query: any = supabase
        .from('sold_properties')
        .select('suburb, sold_date, sold_price, property_type')
        .in('suburb', selectedSuburbs)
        .gt('sold_price', 0)
        .not('sold_date', 'is', null)
        .gte('sold_date', cutoff)
        .range(0, 4999);

      if (propertyType !== 'all') {
        query = query.eq('property_type', propertyType);
      }

      const { data } = await query;
      setSoldData((data as SoldRecord[]) || []);
      setLoading(false);
    }
    fetchSoldData();
  }, [selectedSuburbs, propertyType, period]);

  const chartData = useMemo((): QuarterPoint[] => {
    if (!soldData.length) return [];

    // Group by suburb + quarter
    const grouped: Record<string, Record<string, number[]>> = {};
    soldData.forEach((record) => {
      if (!record.sold_date || !record.sold_price) return;
      const key = getQuarterLabel(record.sold_date);
      if (!grouped[key]) grouped[key] = {};
      if (!grouped[key][record.suburb]) grouped[key][record.suburb] = [];
      grouped[key][record.suburb].push(record.sold_price);
    });

    // Sort quarters chronologically
    const quarters = Object.keys(grouped).sort((a, b) => {
      const [ay, aq] = a.split(' Q');
      const [by, bq] = b.split(' Q');
      return parseInt(ay) !== parseInt(by)
        ? parseInt(ay) - parseInt(by)
        : parseInt(aq) - parseInt(bq);
    });

    return quarters.map((quarter) => {
      const point: QuarterPoint = { quarter };
      selectedSuburbs.forEach((suburb) => {
        const prices = grouped[quarter]?.[suburb] || [];
        // Require at least 2 sales for a reliable median
        point[suburb] = prices.length >= 2 ? calcMedian(prices) : null;
      });
      return point;
    });
  }, [soldData, selectedSuburbs]);

  const summaryStats = useMemo(() => {
    return selectedSuburbs.map((suburb, i) => {
      const prices = soldData
        .filter((r) => r.suburb === suburb)
        .map((r) => r.sold_price)
        .filter(Boolean);
      return {
        suburb,
        color: LINE_COLORS[i % LINE_COLORS.length],
        count: prices.length,
        median: prices.length ? calcMedian(prices) : null,
        min: prices.length ? Math.min(...prices) : null,
        max: prices.length ? Math.max(...prices) : null,
      };
    });
  }, [soldData, selectedSuburbs]);

  const toggleSuburb = (suburb: string) => {
    setSelectedSuburbs((prev) =>
      prev.includes(suburb)
        ? prev.filter((s) => s !== suburb)
        : prev.length < 5
        ? [...prev, suburb]
        : prev
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            📈 Suburb Price Trends
            <Badge variant="secondary" className="ml-2">
              Sold Data
            </Badge>
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Quarterly median sold prices.{' '}
            {soldData.length > 0 && `Based on ${soldData.length.toLocaleString()} sold records.`}
          </p>
        </CardHeader>
        <CardContent>
          {/* Controls */}
          <div className="flex flex-wrap gap-6 mb-6">
            {/* Property Type */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                Property Type
              </p>
              <div className="flex gap-2 flex-wrap">
                {PROPERTY_TYPES.map((type) => (
                  <button
                    key={type}
                    onClick={() => setPropertyType(type)}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                      propertyType === type
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                    }`}
                  >
                    {titleCase(type)}
                  </button>
                ))}
              </div>
            </div>

            {/* Time Period */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                Time Period
              </p>
              <div className="flex gap-2 flex-wrap">
                {PERIOD_OPTIONS.map((opt) => (
                  <button
                    key={opt.label}
                    onClick={() => setPeriod(opt.months)}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                      period === opt.months
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Suburb Selector */}
          <div className="mb-6">
            <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
              Compare Suburbs (up to 5)
            </p>
            <div className="flex flex-wrap gap-2">
              {availableSuburbs.map((suburb) => {
                const isSelected = selectedSuburbs.includes(suburb);
                const colorIdx = selectedSuburbs.indexOf(suburb);
                return (
                  <button
                    key={suburb}
                    onClick={() => toggleSuburb(suburb)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                      isSelected
                        ? 'text-white border-transparent shadow-sm'
                        : 'bg-background hover:bg-muted border-border text-muted-foreground'
                    }`}
                    style={isSelected ? { backgroundColor: LINE_COLORS[colorIdx] } : {}}
                  >
                    {titleCase(suburb)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Chart */}
          {loading ? (
            <div className="h-80 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : chartData.length === 0 ? (
            <div className="h-80 flex items-center justify-center">
              <p className="text-muted-foreground">
                No sold data found for the selected filters.
              </p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="quarter"
                  tick={{ fontSize: 11 }}
                  interval="preserveStartEnd"
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={formatPrice}
                  tick={{ fontSize: 11 }}
                  width={80}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    formatPrice(value),
                    titleCase(name),
                  ]}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Legend
                  formatter={(value: string) => titleCase(value)}
                  wrapperStyle={{ fontSize: '12px', paddingTop: '16px' }}
                />
                {selectedSuburbs.map((suburb, i) => (
                  <Line
                    key={suburb}
                    type="monotone"
                    dataKey={suburb}
                    stroke={LINE_COLORS[i % LINE_COLORS.length]}
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 5 }}
                    connectNulls={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Summary Stats Table */}
      {!loading && soldData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Period Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-4 font-medium">Suburb</th>
                    <th className="text-right py-2 px-4 font-medium">Sales</th>
                    <th className="text-right py-2 px-4 font-medium text-primary">Median</th>
                    <th className="text-right py-2 px-4 font-medium">Low</th>
                    <th className="text-right py-2 px-4 font-medium">High</th>
                  </tr>
                </thead>
                <tbody>
                  {summaryStats.map((row) => {
                    if (!row.count) return null;
                    return (
                      <tr key={row.suburb} className="border-b hover:bg-muted/50">
                        <td className="py-2 px-4 font-medium">
                          <div className="flex items-center gap-2">
                            <span
                              className="inline-block w-3 h-3 rounded-full flex-shrink-0"
                              style={{ backgroundColor: row.color }}
                            />
                            {titleCase(row.suburb)}
                          </div>
                        </td>
                        <td className="text-right py-2 px-4">{row.count}</td>
                        <td className="text-right py-2 px-4 font-semibold text-primary">
                          {row.median ? formatPrice(row.median) : '-'}
                        </td>
                        <td className="text-right py-2 px-4">
                          {row.min ? formatPrice(row.min) : '-'}
                        </td>
                        <td className="text-right py-2 px-4">
                          {row.max ? formatPrice(row.max) : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
