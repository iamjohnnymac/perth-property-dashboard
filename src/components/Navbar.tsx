import { useState } from 'react';
import { Menu, Bird, Building2, MapPin, TrendingUp, Moon, Sun, CalendarDays, BarChart2, Globe, Calculator } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

type ViewType = 'grid' | 'map' | 'investor' | 'inspections' | 'trends';

interface NavbarProps {
  activeView?: ViewType;
  onViewChange?: (view: ViewType) => void;
  isDark: boolean;
  onToggleDark: () => void;
  activePage?: 'suburbs' | 'calculators';
}

const navItems = [
  { id: 'grid' as const, label: 'Properties', icon: Building2 },
  { id: 'map' as const, label: 'Map', icon: MapPin },
  { id: 'inspections' as const, label: 'Inspections', icon: CalendarDays },
  { id: 'trends' as const, label: 'Trends', icon: BarChart2 },
  { id: 'investor' as const, label: 'Investor', icon: TrendingUp },
];

export function Navbar({ activeView, onViewChange, isDark, onToggleDark, activePage }: NavbarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const isEmbedded = !!onViewChange;

  return (
    <header className="sticky border-b top-0 z-40 w-full bg-white dark:border-b-slate-700 dark:bg-background">
      <nav className="container mx-auto h-14 px-4 flex items-center justify-between">
        {/* Logo */}
        <a href="/" className="flex items-center gap-2 whitespace-nowrap shrink-0">
          <Bird className="h-6 w-6 text-primary" />
          <div>
            <span className="font-bold text-xl">Perch</span>
            <span className="hidden xl:inline text-xs text-muted-foreground ml-2">Your vantage point on Perth property</span>
          </div>
        </a>

        {/* Mobile menu */}
        <div className="flex lg:hidden items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onToggleDark}>
            {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left">
              <SheetHeader>
                <SheetTitle className="font-bold text-xl flex items-center gap-2">
                  <Bird className="h-5 w-5 text-primary" />
                  Perch
                </SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-2 mt-6">
                {navItems.map(({ id, label, icon: Icon }) => (
                  isEmbedded ? (
                    <Button
                      key={id}
                      variant={activeView === id ? 'default' : 'ghost'}
                      className="justify-start gap-2"
                      onClick={() => {
                        onViewChange(id);
                        setIsOpen(false);
                      }}
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                    </Button>
                  ) : (
                    <a key={id} href="/" className="block">
                      <Button variant="ghost" className="justify-start gap-2 w-full" onClick={() => setIsOpen(false)}>
                        <Icon className="h-4 w-4" />
                        {label}
                      </Button>
                    </a>
                  )
                ))}
                <a href="/suburbs" className="block">
                  <Button variant={activePage === 'suburbs' ? 'default' : 'ghost'} className="justify-start gap-2 w-full" onClick={() => setIsOpen(false)}>
                    <Globe className="h-4 w-4" />
                    Suburbs
                  </Button>
                </a>
                <a href="/calculators" className="block">
                  <Button variant={activePage === 'calculators' ? 'default' : 'ghost'} className="justify-start gap-2 w-full" onClick={() => setIsOpen(false)}>
                    <Calculator className="h-4 w-4" />
                    Calculators
                  </Button>
                </a>
              </nav>
            </SheetContent>
          </Sheet>
        </div>

        {/* Desktop nav */}
        <div className="hidden lg:flex items-center gap-1">
          {navItems.map(({ id, label, icon: Icon }) => (
            isEmbedded ? (
              <Button
                key={id}
                variant={activeView === id ? 'default' : 'ghost'}
                onClick={() => onViewChange(id)}
                size="sm"
                className="gap-1.5"
              >
                <Icon className="h-4 w-4" />
                {label}
              </Button>
            ) : (
              <a key={id} href="/">
                <Button variant="ghost" size="sm" className="gap-1.5">
                  <Icon className="h-4 w-4" />
                  {label}
                </Button>
              </a>
            )
          ))}
          <a href="/suburbs">
            <Button variant={activePage === 'suburbs' ? 'default' : 'ghost'} size="sm" className="gap-1.5">
              <Globe className="h-4 w-4" />
              Suburbs
            </Button>
          </a>
          <a href="/calculators">
            <Button variant={activePage === 'calculators' ? 'default' : 'ghost'} size="sm" className="gap-1.5">
              <Calculator className="h-4 w-4" />
              Calculators
            </Button>
          </a>
          <div className="ml-1 border-l pl-1">
            <Button variant="ghost" size="icon" onClick={onToggleDark}>
              {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </nav>
      {/* Mobile tab bar */}
      <div className="flex lg:hidden border-t overflow-x-auto bg-white dark:bg-background">
        <div className="flex w-full">
          {navItems.map(({ id, label, icon: Icon }) => (
            isEmbedded ? (
              <button
                key={id}
                onClick={() => onViewChange(id)}
                className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors ${
                  activeView === id
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-muted-foreground'
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ) : (
              <a
                key={id}
                href="/"
                className="flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium text-muted-foreground transition-colors hover:text-primary"
              >
                <Icon className="h-4 w-4" />
                {label}
              </a>
            )
          ))}
        </div>
      </div>
    </header>
  );
}
