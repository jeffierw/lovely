import { ReactNode } from 'react';

// Disable static generation for this route
export const dynamic = 'force-dynamic';

export default function CreateLayout({ children }: { children: ReactNode }) {
  return children;
}

