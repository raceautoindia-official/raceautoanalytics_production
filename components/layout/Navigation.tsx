'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChartBar as BarChart3, TrendingUp, Chrome as Home } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Navigation() {
  const pathname = usePathname();
  
  const isFlashReports = pathname.startsWith('/flash-reports');
  const isHome = pathname === '/';

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2 group">
            <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors duration-200">
              <BarChart3 className="h-5 w-5 text-primary" />
            </div>
            <span className="font-semibold text-lg">RaceAutoAnalytics</span>
          </Link>

          {/* Navigation Links */}
          <div className="flex items-center space-x-1">
            <Link
              href="/"
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                'hover:bg-accent hover:text-accent-foreground focus-ring',
                isHome
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground'
              )}
            >
              <Home className="inline-block w-4 h-4 mr-2" />
              Home
            </Link>
            
            <Link
              href="/flash-reports"
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                'hover:bg-accent hover:text-accent-foreground focus-ring',
                isFlashReports
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground'
              )}
            >
              <TrendingUp className="inline-block w-4 h-4 mr-2" />
              Flash Reports
            </Link>
            
            <button className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors duration-200 focus-ring">
              Forecast
            </button>
          </div>

          {/* Integration Notice */}
          <div className="hidden lg:block">
            <div className="text-xs text-muted-foreground bg-muted/50 px-3 py-1 rounded-full">
              Linked Module
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}