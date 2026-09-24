import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { RoleRouter } from './components/RoleRouter';
import { LoginScreen } from './components/LoginScreen';
import { Sparkles } from 'lucide-react';
import { JoinScreen } from './screens/JoinScreen';
import { SharedDocumentPage } from './screens/SharedDocumentPage';
import { syncOfflineQueue } from './services/offlineSync';
import { ProfileSetupScreen } from './components/ProfileSetupScreen';

export default function App() {
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const [session, setSession] = useState<any>(null);
  
  useEffect(() => {
    const handleOnline = () => {
      syncOfflineQueue();
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);
  
  const [inviteGarageId, setInviteGarageId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('invite');
    }
    return null;
  });

  useEffect(() => {
    let isMounted = true;

    const initSession = async () => {
      const { data: { session: currentSession }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error(error);
        if (isMounted) setIsInitializing(false);
        return;
      }
      
      if (currentSession) {
        if (isMounted) {
          setSession(currentSession);
        }
      } else {
        if (isMounted) {
          setSession(null);
        }
      }
      if (isMounted) setIsInitializing(false);
    };

    initSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!isMounted) return;
      setSession(newSession);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleLoginSuccess = () => {
    // Rely completely on Supabase onAuthStateChange
  };

  const handleSignOut = () => {
    supabase.auth.signOut();
    setSession(null);
  };

  // 0. Public Document Route
  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/shared/document/')) {
    return <SharedDocumentPage key="public-route" />;
  }

  if (isInitializing) {
    return (
      <div key="auth-loading-boundary">
        <div className="min-h-screen bg-[#0E2829] flex flex-col items-center justify-center text-emerald-400 gap-4">
          <Sparkles className="w-12 h-12 animate-pulse" />
          <h2 className="text-xl font-black tracking-widest uppercase mb-12">Checking Authorization...</h2>
        </div>
      </div>
    );
  }

  // 1. Worker Onboarding via Invite URL
  if (inviteGarageId) {
    return (
      <div key="join-boundary">
        <JoinScreen
          garageId={inviteGarageId}
          onJoinSuccess={() => setInviteGarageId(null)}
          onCancel={() => {
            const url = new URL(window.location.href);
            url.searchParams.delete('invite');
            window.history.replaceState({}, '', url.toString());
            setInviteGarageId(null);
          }}
        />
      </div>
    );
  }

  // 2. Role Routing for Authenticated Supabase Users
  if (session) {
    const hasName = session.user.user_metadata?.full_name?.trim() || session.user.user_metadata?.name?.trim();
    
    if (!hasName) {
      return (
        <ProfileSetupScreen 
          onComplete={async () => {
            const { data: { session: refreshedSession } } = await supabase.auth.getSession();
            if (refreshedSession) {
              setSession(refreshedSession);
            }
          }} 
        />
      );
    }

    return (
      <div key="router-boundary">
        <RoleRouter
          userId={session.user.id}
          userEmail={session.user.email}
          onSignOut={handleSignOut}
        />
      </div>
    );
  }

  return (
    <div key="auth-boundary">
      <LoginScreen inviteGarageId={inviteGarageId} onLoginSuccess={handleLoginSuccess} />
    </div>
  );
}
