import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import type { Session } from '@supabase/supabase-js';

import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import ClientDetail from './pages/ClientDetail';
import Meetings from './pages/Meetings';
import MeetingDetail from './pages/MeetingDetail';
import Minutes from './pages/Minutes';
import VoiceRecorder from './components/VoiceRecorder';
import KnowledgeBase from './pages/KnowledgeBase';
import ClientPortalPage from './pages/ClientPortalPage';
import SettingsPrompts from './pages/SettingsPrompts';

export interface UserRoleInfo {
  role: 'admin' | 'consultant' | 'client';
  organizationId: string | null;
  fullName: string;
}

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [roleInfo, setRoleInfo] = useState<UserRoleInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const resolveUserRole = async (activeSession: Session | null) => {
    if (!activeSession?.user) {
      setRoleInfo(null);
      setLoading(false);
      return;
    }

    const user = activeSession.user;
    const metaRole = user.user_metadata?.gs_role || user.user_metadata?.role;
    const metaOrgId = user.user_metadata?.organization_id || null;

    try {
      const { data: profile } = await (supabase as any)
        .from('profiles')
        .select('role, organization_id, first_name, last_name, full_name')
        .eq('id', user.id)
        .maybeSingle();

      const resolvedRole: 'admin' | 'consultant' | 'client' =
        profile?.role === 'client' || metaRole === 'client' || user.email?.toLowerCase().includes('cliente@')
          ? 'client'
          : profile?.role === 'consultant' || metaRole === 'consultant'
          ? 'consultant'
          : 'admin';

      const resolvedOrgId: string | null =
        profile?.organization_id ||
        metaOrgId ||
        (resolvedRole === 'client' ? '532a0405-02c2-4e45-8f77-c24bf13ea9de' : null);

      const fullName =
        profile?.full_name ||
        [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') ||
        user.email ||
        'Usuario GS';

      if (resolvedRole === 'client' && resolvedOrgId) {
        sessionStorage.setItem(`gs_portal_verified_${resolvedOrgId}`, 'true');
        sessionStorage.setItem('gs_active_client_org', resolvedOrgId);
      }

      setRoleInfo({
        role: resolvedRole,
        organizationId: resolvedOrgId,
        fullName,
      });
    } catch {
      const isClientEmail = user.email?.toLowerCase().includes('cliente@');
      setRoleInfo({
        role: isClientEmail ? 'client' : 'admin',
        organizationId: isClientEmail ? (metaOrgId || '532a0405-02c2-4e45-8f77-c24bf13ea9de') : null,
        fullName: user.email || 'Usuario',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession);
      resolveUserRole(initialSession);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(true);
      resolveUserRole(nextSession);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 text-gray-500 font-medium">
        Cargando Consultora GS...
      </div>
    );
  }

  const isClientUser = session && roleInfo?.role === 'client';
  const clientPortalRedirectPath = `/portal/${roleInfo?.organizationId || '532a0405-02c2-4e45-8f77-c24bf13ea9de'}`;

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={
            !session ? (
              <Login />
            ) : isClientUser ? (
              <Navigate to={clientPortalRedirectPath} replace />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        {/* Client Portal Route (Strictly isolated per organization_id) */}
        <Route path="/portal/:id" element={<ClientPortalPage roleInfo={roleInfo} session={session} />} />

        {/* Protected Consultant Back-Office Routes — Strictly blocked for 'client' role */}
        <Route
          element={
            !session ? (
              <Navigate to="/login" replace />
            ) : isClientUser ? (
              <Navigate to={clientPortalRedirectPath} replace />
            ) : (
              <Layout />
            )
          }
        >
          <Route path="/" element={<Dashboard />} />
          <Route path="/clients" element={<Clients />} />

          {/* Client Dedicated Sub-Pages for GS Consultants */}
          <Route path="/clients/:id" element={<ClientDetail />} />
          <Route path="/clients/:id/:section" element={<ClientDetail />} />
          <Route path="/clients/:id/:section/:subAction" element={<ClientDetail />} />
          <Route path="/clients/:id/meetings/:subAction" element={<ClientDetail />} />

          <Route path="/meetings" element={<Meetings />} />
          <Route path="/meetings/:id" element={<MeetingDetail />} />
          <Route path="/minutes" element={<Minutes />} />
          <Route path="/gobernanza" element={<VoiceRecorder currentUser={session?.user} />} />
          <Route path="/knowledge" element={<KnowledgeBase />} />
          <Route path="/docs" element={<Navigate to="/knowledge" replace />} />
          <Route path="/settings" element={<SettingsPrompts />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
