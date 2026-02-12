'use client';

import { useEffect, useState } from 'react';

/**
 * HydrationBoundary - Prevents rendering content until client is fully hydrated
 * This prevents hydration mismatches when using localStorage in context providers
 * @param children - Content to render after hydration
 */
export function HydrationBoundary({ children }: { children: React.ReactNode }) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Return empty fragment on server/initial render to prevent hydration mismatch
  // Once client is fully hydrated, render the actual content
  if (!isClient) {
    return null;
  }

  return <>{children}</>;
}
