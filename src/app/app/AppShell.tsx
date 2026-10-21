'use client';

import dynamic from 'next/dynamic';
import { AuthProvider } from '@/contexts/AuthContext';
import { ChatProvider } from '@/contexts/ChatContext';
import AppHeader from '@/components/AppHeader';
import AppFooter from '@/components/AppFooter';
import BottomTabBar from '@/components/nav/BottomTabBar';
import OnboardingGuard from '@/components/onboarding/OnboardingGuard';
import OpenBanner from '@/components/open/OpenBanner';
import type { Profile } from '@/types/profile';

const ChatAssistant = dynamic(() => import('@/components/chat/ChatAssistant'), { ssr: false });

export default function AppShell({
  children,
  initialProfile,
}: {
  children: React.ReactNode;
  initialProfile?: Profile | null;
}) {
  return (
    <AuthProvider initialProfile={initialProfile}>
      <ChatProvider>
        <div className="min-h-screen flex flex-col pb-(--tabbar-h)">
          <OpenBanner />
          <AppHeader />
          <main className="container mx-auto px-4 py-6 sm:py-8 max-w-4xl grow overflow-x-hidden">
            <OnboardingGuard>
              {children}
            </OnboardingGuard>
          </main>
          <AppFooter />
          <BottomTabBar />
          <ChatAssistant />
        </div>
      </ChatProvider>
    </AuthProvider>
  );
}
