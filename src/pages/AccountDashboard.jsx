import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AccountCard from '../components/AccountCard';
import { supabase } from '../supabaseClient';

function AccountDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStage, setSelectedStage] = useState('all');

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUser(session.user);
        fetchAccounts(session.user.id);
      } else {
        navigate('/login');
      }
    };
    getSession();
  }, [navigate]);

  const fetchAccounts = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('owner_id', userId);

      if (error) throw error;

      setAccounts(data);
    } catch (error) {
      console.error('Failed to fetch accounts:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAccount = async () => {
    const name = window.prompt('Enter new account name:');
    if (name && user) {
      try {
        const { data, error } = await supabase
          .from('accounts')
          .insert([{ 
            name: name, 
            owner_id: user.id,
            contact: 'Not specified',
            value: '$0',
            stage: 'Discovery',
            description: '',
            document_status: 'new'
          }])
          .select();

        if (error) {
          throw error;
        }

        if (data) {
          setAccounts(prevAccounts => [...prevAccounts, ...data]);
        }
      } catch (error) {
        console.error('Error creating account:', error.message);
        alert('Failed to create account.');
      }
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  // Get unique stages for filter
  const stages = ['all', ...new Set(accounts.map((acc) => acc.stage))];

  // Filter accounts based on selected stage
  const filteredAccounts =
    selectedStage === 'all'
      ? accounts
      : accounts.filter((acc) => acc.stage === selectedStage);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-white/20 border-t-cyan-500"></div>
          <p className="mt-4 text-white/70 font-light">Loading accounts...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-20 w-64 h-64 bg-red-900/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="glass-panel mb-8 p-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-light text-white tracking-wide mb-1">
                Account Dashboard
              </h1>
              <p className="text-sm text-white/60 font-light">
                Welcome back, <span className="text-cyan-500">{user?.email}</span>
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={handleCreateAccount}
                className="btn-volcanic-primary"
              >
                New Account
              </button>
              <button
                onClick={handleLogout}
                className="btn-volcanic flex items-center space-x-2 group"
              >
                <svg className="w-5 h-5 group-hover:text-cyan-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>

        {/* Filter Section */}
        <div className="glass-panel mb-8 p-6">
          <label className="block text-sm font-medium text-white/80 mb-3">
            Filter by Stage
          </label>
          <div className="flex flex-wrap gap-2">
            {stages.map(stage => (
              <button
                key={stage}
                onClick={() => setSelectedStage(stage)}
                className={`px-4 py-2 rounded-xl font-light transition-all duration-300 ${
                  selectedStage === stage
                    ? 'bg-gradient-to-r from-cyan-600 to-cyan-500 text-white shadow-lg shadow-red-900/30'
                    : 'glass-panel glass-panel-hover text-white/80'
                }`}
              >
                {stage === 'all' ? 'All Stages' : stage}
              </button>
            ))}
          </div>
        </div>

        {/* Accounts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAccounts.map(account => (
            <AccountCard 
              key={account.id}
              account={account}
              onClick={() => navigate(`/accounts/${account.id}`)}
            />
          ))}
        </div>

        {filteredAccounts.length === 0 && (
          <div className="text-center py-16">
            <div className="glass-panel inline-block p-8">
              <svg className="w-16 h-16 mx-auto text-white/30 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-white/50 font-light">No accounts found for the selected stage.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default AccountDashboard 