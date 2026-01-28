'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  return (
    <nav className={cn('flex items-center space-x-2 text-sm animate-fade-in', className)} aria-label="Breadcrumb">
      {items.map((item, index) => (
        <div key={index} className="flex items-center space-x-2">
          {index > 0 && (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
          {item.href && index < items.length - 1 ? (
            <Link
              href={item.href}
              className="text-muted-foreground hover:text-foreground transition-colors duration-200"
            >
              {item.label}
            </Link>
          ) : (
            <span className={index === items.length - 1 ? 'text-foreground font-medium' : 'text-muted-foreground'}>
              {item.label}
            </span>
          )}
        </div>
      ))}
    </nav>
  );
}