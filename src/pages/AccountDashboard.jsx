import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AccountCard from '../components/AccountCard';
import AccountCreationModal from '../components/AccountCreationModal';
import { supabase } from '../supabaseClient';
import { KnowledgeGraph } from '../components/KnowledgeGraph';
import Header from '../components/Header';

function AccountDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStage, setSelectedStage] = useState('all');
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [globalDocuments, setGlobalDocuments] = useState([]);
  const [loadingGlobal, setLoadingGlobal] = useState(false);
  const [showGlobalGraph, setShowGlobalGraph] = useState(false);

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

  const handleCreateAccount = async (accountData) => {
    if (!user) return;
    
    setCreatingAccount(true);
    try {
      const { data, error } = await supabase
        .from('accounts')
        .insert([{ 
          ...accountData,
          owner_id: user.id
        }])
        .select();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      if (data) {
        setAccounts(prevAccounts => [...prevAccounts, ...data]);
        setShowAccountModal(false);
      }
    } catch (error) {
      console.error('Error creating account:', error);
      // Show more detailed error message
      const errorMessage = error.message || 'Failed to create account.';
      alert(`Failed to create account: ${errorMessage}`);
    } finally {
      setCreatingAccount(false);
    }
  };

  const fetchGlobalDocuments = async () => {
    try {
      setLoadingGlobal(true);
      
      // Fetch from account_data_sources where is_global = true
      const { data: globalFromAccounts, error: error1 } = await supabase
        .from('account_data_sources')
        .select('*')
        .eq('is_global', true)
        .order('created_at', { ascending: false });

      if (error1) throw error1;

      // Also fetch from global_knowledge_base table if it exists
      const { data: globalKnowledge, error: error2 } = await supabase
        .from('global_knowledge_base')
        .select('*')
        .order('created_at', { ascending: false });

      if (error2 && error2.code !== 'PGRST116') { // Ignore table not exists error
        throw error2;
      }

      // Combine both sources
      const allGlobalDocs = [
        ...(globalFromAccounts || []),
        ...(globalKnowledge || [])
      ];

      setGlobalDocuments(allGlobalDocs);
    } catch (error) {
      console.error('Error fetching global documents:', error);
      setGlobalDocuments([]);
    } finally {
      setLoadingGlobal(false);
    }
  };

  // Fetch global knowledge on mount
  useEffect(() => {
    fetchGlobalDocuments();
    
    // Subscribe to real-time updates
    const channel = supabase
      .channel('global-knowledge-updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'account_data_sources',
        filter: 'is_global=eq.true'
      }, () => {
        fetchGlobalDocuments();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'global_knowledge_base'
      }, () => {
        fetchGlobalDocuments();
      })
      .subscribe();
    
    return () => {
      channel.unsubscribe();
    };
  }, []);

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
        <Header
          actions={
            <>
              <button
                onClick={() => setShowAccountModal(true)}
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
            </>
          }
        >
          <div>
            <h1 className="text-3xl font-light text-white tracking-wide">
              Account Dashboard
            </h1>
            <p className="text-sm text-white/60 font-light">
              Welcome back, <span className="text-cyan-500">{user?.email}</span>
            </p>
          </div>
        </Header>

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
      
      {/* Global Knowledge Base Section */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="glass-panel">
          <div className="px-8 py-6 border-b border-white/10">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-light text-white">Company Knowledge Base</h2>
                <p className="text-sm text-white/50 mt-2">
                  {globalDocuments.length} shared document{globalDocuments.length !== 1 ? 's' : ''} across all accounts
                </p>
              </div>
              <button
                onClick={() => setShowGlobalGraph(!showGlobalGraph)}
                className={`px-4 py-2 rounded-lg transition-all ${
                  showGlobalGraph 
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' 
                    : 'bg-white/5 text-white/70 border border-white/10 hover:bg-white/10'
                }`}
              >
                {showGlobalGraph ? 'Hide' : 'Show'} Knowledge Graph
              </button>
            </div>
          </div>
          
          {showGlobalGraph && (
            <div className="px-8 py-8">
              {loadingGlobal ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-white/50">Loading global knowledge...</div>
                </div>
              ) : globalDocuments.length > 0 ? (
                <KnowledgeGraph
                  documents={globalDocuments}
                  accountId="global"
                  viewMode="global"
                  height={600}
                  showControls={true}
                  showUpload={false}
                  className="rounded-lg"
                />
              ) : (
                <div className="text-center py-16">
                  <svg className="w-16 h-16 mx-auto text-white/30 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <p className="text-white/50 font-light">No global knowledge documents yet.</p>
                  <p className="text-sm text-white/30 mt-2">Mark documents as global from individual accounts to share them here.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Account Creation Modal */}
      <AccountCreationModal
        isOpen={showAccountModal}
        onClose={() => setShowAccountModal(false)}
        onConfirm={handleCreateAccount}
        isLoading={creatingAccount}
      />
    </div>
  )
}

export default AccountDashboard 