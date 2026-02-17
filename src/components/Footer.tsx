import { Home, ExternalLink } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t mt-auto">
      <div className="container mx-auto py-12 px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Logo & Description */}
          <div className="col-span-2 md:col-span-1">
            <a href="/" className="font-bold text-xl flex items-center gap-2 mb-4">
              <Home className="h-6 w-6 text-primary" />
              <span>Perth Property</span>
            </a>
            <p className="text-sm text-muted-foreground">
              Track properties across 27 Perth suburbs. Updated twice daily.
            </p>
          </div>

          {/* Suburbs */}
          <div>
            <h3 className="font-semibold mb-4">Popular Suburbs</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>Scarborough</li>
              <li>Trigg</li>
              <li>North Beach</li>
              <li>City Beach</li>
              <li>Floreat</li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="font-semibold mb-4">Resources</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a 
                  href="https://www.domain.com.au" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  Domain.com.au
                  <ExternalLink className="h-3 w-3" />
                </a>
              </li>
              <li>
                <a 
                  href="https://reiwa.com.au" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  REIWA
                  <ExternalLink className="h-3 w-3" />
                </a>
              </li>
            </ul>
          </div>

          {/* About */}
          <div>
            <h3 className="font-semibold mb-4">About</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>27 Suburbs Tracked</li>
              <li>Updated 6am & 6pm</li>
              <li>Houses, Townhouses, Units</li>
            </ul>
          </div>
        </div>

        <div className="border-t mt-8 pt-8 text-center text-sm text-muted-foreground">
          <p>Data from Domain.com.au • Updated twice daily</p>
        </div>
      </div>
    </footer>
  );
}
