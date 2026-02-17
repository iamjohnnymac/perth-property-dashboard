# Perth Property Dashboard

A modern property search dashboard for Perth, Western Australia. Built with React, TypeScript, shadcn/ui, and Supabase.

## Features

- 🏠 **Property Search** - Browse 169+ listings across 27 Perth suburbs
- 🗺️ **Interactive Map** - View properties on an OpenStreetMap-powered map
- 🏊 **Smart Filters** - Filter by suburb, property type, bedrooms, price, pool, and more
- 💰 **Investor Dashboard** - Suburb analytics, median prices, and best investment picks
- 📊 **Negotiation Intel** - See how listings compare to suburb averages
- 🎯 **Motivated Sellers** - Identify vendors likely to negotiate
- 📉 **Price Drops** - Track properties with recent price reductions
- 🏖️ **Beach Distance** - See how far each property is from the beach

## Tech Stack

- **Framework**: React 18 + TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **Database**: Supabase (PostgreSQL)
- **Maps**: Leaflet + OpenStreetMap
- **Icons**: Lucide React
- **Build**: Vite

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

Property data is scraped from Domain.com.au twice daily (6am and 6pm Perth time).