'use client';

import { useState } from 'react';
import { TradeProvider } from '@/lib/trade-context';
import { SettingsProvider } from '@/lib/settings-context';
import { IdeasProvider } from '@/lib/ideas-context';
import { HydrationBoundary } from '@/components/hydration-boundary';
import Sidebar from '@/components/sidebar';
import MobileNav from '@/components/mobile-nav';
import Dashboard from '@/components/dashboard';
import TradeForm from '@/components/trade-form';
import TradeLog from '@/components/trade-log';
import Analytics from '@/components/analytics';
import ProfitLoss from '@/components/profit-loss';
import WeeklyReview from '@/components/weekly-review';
import DataUtilities from '@/components/data-utilities';
import IdeasList from '@/components/ideas-list';
import IdeaForm from '@/components/idea-form';

type Page = 'dashboard' | 'add-trade' | 'log' | 'analytics' | 'profit-loss' | 'weekly-review' | 'data-utilities' | 'ideas' | 'add-idea';

function AppContent() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'add-trade':
        return <TradeForm onSuccess={() => setCurrentPage('log')} />;
      case 'log':
        return <TradeLog />;
      case 'analytics':
        return <Analytics />;
      case 'profit-loss':
        return <ProfitLoss />;
      case 'weekly-review':
        return <WeeklyReview />;
      case 'data-utilities':
        return <DataUtilities />;
      case 'ideas':
        return <IdeasList />;
      case 'add-idea':
        return <IdeaForm onSuccess={() => setCurrentPage('ideas')} />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="flex h-dvh flex-col md:flex-row bg-background">
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <Sidebar currentPage={currentPage} onPageChange={setCurrentPage} />
      </div>
      
      <main className="flex-1 overflow-auto pb-20 md:pb-0">
        {renderPage()}
      </main>

      {/* Mobile Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50">
        <MobileNav currentPage={currentPage} onPageChange={setCurrentPage} />
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <HydrationBoundary>
      <SettingsProvider>
        <TradeProvider>
          <IdeasProvider>
            <AppContent />
          </IdeasProvider>
        </TradeProvider>
      </SettingsProvider>
    </HydrationBoundary>
  );
}
