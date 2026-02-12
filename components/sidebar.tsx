'use client';

import { BarChart3, PlusCircle, Table, LineChart, Settings, Calendar, TrendingUp, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/theme-toggle';

interface SidebarProps {
  currentPage: string;
  onPageChange: (page: 'dashboard' | 'add-trade' | 'log' | 'analytics' | 'profit-loss' | 'weekly-review' | 'data-utilities' | 'ideas' | 'add-idea') => void;
}

export default function Sidebar({ currentPage, onPageChange }: SidebarProps) {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'add-trade', label: 'Add Trade', icon: PlusCircle },
    { id: 'log', label: 'Trade Log', icon: Table },
    { id: 'analytics', label: 'Analytics', icon: LineChart },
    { id: 'profit-loss', label: 'P&L Summary', icon: TrendingUp },
    { id: 'weekly-review', label: 'Weekly Review', icon: Calendar },
    { id: 'ideas', label: 'Trade Ideas', icon: Lightbulb },
    { id: 'add-idea', label: 'Add Idea', icon: PlusCircle },
    { id: 'data-utilities', label: 'Data & Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 min-h-screen border-r border-border bg-sidebar flex flex-col overflow-y-auto">
      <div className="p-6 sticky top-0 bg-sidebar border-b border-sidebar-border">
        <h1 className="text-2xl font-bold text-sidebar-foreground">Trading Journal</h1>
        <p className="text-sm text-muted-foreground mt-1">Track & Analyze Trades</p>
      </div>

      <nav className="flex-1 space-y-2 px-4 py-4">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onPageChange(item.id as any)}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors',
                isActive
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              )}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span className="font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-4 mt-auto border-t border-sidebar-border space-y-4">
        <div className="space-y-2">
          <p className="text-xs text-sidebar-foreground font-semibold px-2">Theme</p>
          <div className="px-2">
            <ThemeToggle />
          </div>
        </div>
        
        <div className="p-4 bg-sidebar-accent rounded-lg border border-sidebar-border">
          <p className="text-xs text-sidebar-foreground font-semibold">Tip</p>
          <p className="text-xs text-muted-foreground mt-2">Keep detailed notes on each trade to identify patterns and improve consistency.</p>
        </div>
      </div>
    </aside>
  );
}
