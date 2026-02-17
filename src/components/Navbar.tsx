import { useState } from 'react';
import { Menu, Home, Building2, MapPin, TrendingUp, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

interface NavbarProps {
  activeView: 'grid' | 'map' | 'investor';
  onViewChange: (view: 'grid' | 'map' | 'investor') => void;
  isDark: boolean;
  onToggleDark: () => void;
}

const navItems = [
  { id: 'grid' as const, label: 'Properties', icon: Building2 },
  { id: 'map' as const, label: 'Map', icon: MapPin },
  { id: 'investor' as const, label: 'Investor', icon: TrendingUp },
];

export function Navbar({ activeView, onViewChange, isDark, onToggleDark }: NavbarProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="sticky border-b top-0 z-40 w-full bg-white dark:border-b-slate-700 dark:bg-background">
      <nav className="container mx-auto h-14 px-4 flex items-center justify-between">
        {/* Logo */}
        <a href="/" className="font-bold text-xl flex items-center gap-2">
          <Home className="h-6 w-6 text-primary" />
          <span>Perth Property</span>
        </a>

        {/* Mobile menu */}
        <div className="flex md:hidden items-center gap-2">
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
                  <Home className="h-5 w-5 text-primary" />
                  Perth Property
                </SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-2 mt-6">
                {navItems.map(({ id, label, icon: Icon }) => (
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
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-2">
          {navItems.map(({ id, label, icon: Icon }) => (
            <Button
              key={id}
              variant={activeView === id ? 'default' : 'ghost'}
              onClick={() => onViewChange(id)}
              className="gap-2"
            >
              <Icon className="h-4 w-4" />
              {label}
            </Button>
          ))}
          <div className="ml-2 border-l pl-2">
            <Button variant="ghost" size="icon" onClick={onToggleDark}>
              {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </nav>
    </header>
  );
}
