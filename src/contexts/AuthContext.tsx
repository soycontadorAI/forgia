'use client';

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import type { Profile } from '@/types/profile';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({
  children,
  initialProfile,
}: {
  children: React.ReactNode;
  /** Perfil leído en el servidor (layout de /app); evita el spinner inicial */
  initialProfile?: Profile | null;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(initialProfile ?? null);
  const [isLoading, setIsLoading] = useState(initialProfile === undefined);
  const userRef = useRef<User | null>(null);
  // El primer fetch del perfil sobra si el servidor ya lo mandó para ese usuario
  const prefetchedProfileId = useRef<string | null>(initialProfile?.id ?? null);

  const fetchProfile = useCallback(async (userId: string) => {
    const supabase = createClient();
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        setProfile(null);
        return;
      }

      if (data) {
        setProfile(data as Profile);
      }
    } catch (err) {
      console.error('Unexpected error fetching profile:', err);
      setProfile(null);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (userRef.current) {
      await fetchProfile(userRef.current.id);
    }
  }, [fetchProfile]);

  // Effect 1: Listen to auth state changes (synchronous callback only).
  // We do NOT fetch profile here — doing so causes a circular deadlock
  // because the Supabase REST client waits for _initialize() to finish,
  // but _initialize() emitted the SIGNED_IN event that called us.
  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (cancelled) return;

        const newUser = session?.user ?? null;
        setUser(newUser);
        userRef.current = newUser;

        if (!newUser) {
          setProfile(null);
          setIsLoading(false);
        }
      }
    );

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  // Effect 2: Fetch profile when user changes (runs outside onAuthStateChange).
  // This avoids the circular deadlock since _initialize() has already resolved
  // by the time React processes the state update and runs this effect.
  useEffect(() => {
    if (!user) return;

    if (prefetchedProfileId.current === user.id) {
      prefetchedProfileId.current = null;
      return;
    }

    let cancelled = false;

    fetchProfile(user.id).finally(() => {
      if (!cancelled) {
        setIsLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [user?.id, fetchProfile]);

  const signOut = async () => {
    const supabase = createClient();
    try {
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
      userRef.current = null;
      window.location.href = '/';
    } catch (error) {
      console.error('Error signing out:', error);
      window.location.href = '/';
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, isLoading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
