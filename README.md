# Perch

Your vantage point on Perth property. Built with React, TypeScript, shadcn/ui, and Supabase.

## Features

- 🏠 **Property Search** - Browse 680+ listings across 27 Perth suburbs
- 🗺️ **Interactive Map** - View properties on a clustered, color-coded map
- 🏊 **Smart Filters** - Filter by suburb, property type, bedrooms, price, pool, and more
- 💰 **Investor Dashboard** - Suburb analytics, rental yields, and best investment picks
- 📊 **Negotiation Intel** - See how listings compare to suburb sold prices
- 🎯 **Motivated Sellers** - Identify vendors likely to negotiate
- 📉 **Price Drops** - Track properties with recent price reductions
- 🏖️ **Beach Distance** - See how far each property is from the beach
- 🏘️ **Suburb Pages** - SEO-optimized landing pages for every suburb
- 🧮 **12 Calculators** - Mortgage, stamp duty, borrowing power, yields, and more
- 📅 **Inspection Calendar** - Upcoming open homes with one-click Add to Calendar
- 📈 **Price Trends** - Quarterly median price charts by suburb

## Tech Stack

- **Framework**: React 18 + TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **Fonts**: Inter + JetBrains Mono
- **Database**: Supabase (PostgreSQL)
- **Maps**: Leaflet + OpenStreetMap + CartoDB Positron
- **Charts**: Recharts
- **Icons**: Lucide React
- **Build**: Vite
- **Hosting**: Vercel

## Getting Started

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build
```

## Deployment

The app is deployed to Vercel and automatically updates on push to main.

## Data Source

Property data is scraped from Domain.com.au daily at 6am Perth time.
