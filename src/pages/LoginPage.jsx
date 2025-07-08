import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      navigate('/accounts');
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });
      if (error) throw error;
      // You might want to show a message to check email for confirmation
      alert('Sign up successful! Please check your email for a confirmation link.');
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-red-900/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>
      
      {/* Login Card */}
      <div className="relative glass-panel p-10 w-full max-w-md shadow-xl shadow-blue-500/20">
        {/* Logo/Title Section */}
        <div className="text-center mb-10">
          <div className="mb-6">
            <div className="w-20 h-20 mx-auto bg-gradient-to-br from-cyan-600 to-cyan-500 rounded-2xl flex items-center justify-center shadow-lg shadow-red-900/50">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
          </div>
          
          <h1 className="text-3xl font-light text-white mb-2 tracking-wide">
            Solution Engineer Tool
          </h1>
          <p className="text-white/70 font-light">
            Automate your document generation workflow
          </p>
        </div>
        
        {/* Login Form */}
        <form onSubmit={handleLogin}>
          <div className="space-y-4">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full input-field"
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full input-field"
              required
            />
          </div>

          {error && <p className="text-red-400 text-sm mt-4 text-center">{error}</p>}

          <div className="space-y-4 mt-6">
            <button
              type="submit"
              disabled={loading}
              className="w-full btn-volcanic-primary text-lg font-medium flex items-center justify-center"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
            <button
              type="button"
              onClick={handleSignUp}
              disabled={loading}
              className="w-full btn-volcanic-secondary text-lg font-medium flex items-center justify-center"
            >
              {loading ? 'Signing up...' : 'Sign Up'}
            </button>
          </div>
        </form>
        
        {/* Decorative Elements */}
        <div className="absolute -top-px left-10 right-10 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
        <div className="absolute -bottom-px left-10 right-10 h-px bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent"></div>
      </div>
    </div>
  );
}

export default LoginPage; 