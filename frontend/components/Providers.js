// components/Providers.js
'use client';

import { AuthProvider } from '../lib/contexts/AuthContext';
import { NotificationProvider } from '../lib/contexts/NotificationContext';

export default function Providers({ children }) {
  return (
    <AuthProvider>
      <NotificationProvider>
        {children}
      </NotificationProvider>
    </AuthProvider>
  );
}