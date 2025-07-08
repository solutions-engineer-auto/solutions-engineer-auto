import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

function RequireAuth({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setLoading(false);
    };

    getSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
      }
    );

    return () => {
      authListener?.unsubscribe();
    };
  }, []);

  if (loading) {
    // You can add a loading spinner here if you want
    return null;
  }

  if (!session) {
    // Redirect to login page if not authenticated
    return <Navigate to="/login" replace />;
  }

  // Render children if authenticated
  return children;
}

export default RequireAuth; 