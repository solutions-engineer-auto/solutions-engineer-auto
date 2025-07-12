import React, { useState, useEffect } from 'react';
import { vectorRAGService } from '../services/knowledgeGraph/vectorRAGService';
import { supabase } from '../supabaseClient';

export function VectorDatabaseTester({ accountId }) {
  const [stats, setStats] = useState(null);
  const [relationships, setRelationships] = useState([]);
  const [testResults, setTestResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Test the existing vector database
  const runTests = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🧪 Testing existing vector database...');
      
      // 1. Get embedding statistics
      const { data: statsData, error: statsError } = await supabase
        .rpc('get_embedding_statistics', { account_id_param: accountId });
      
      if (statsError) {
        throw new Error(`Stats error: ${statsError.message}`);
      }
      
      setStats(statsData?.[0] || {});
      
      // 2. Get some sample relationships
      const { data: relationshipData, error: relError } = await supabase
        .rpc('generate_document_relationships_from_embeddings', {
          account_id_param: accountId,
          similarity_threshold: 0.5,
          max_relationships: 10
        });
      
      if (relError) {
        throw new Error(`Relationships error: ${relError.message}`);
      }
      
      setRelationships(relationshipData || []);
      
      // 3. Test vector search
      const testSearch = await vectorRAGService.testVectorSearch(accountId);
      setTestResults(testSearch);
      
      console.log('✅ Vector database tests completed');
      
    } catch (err) {
      console.error('❌ Vector database test failed:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Run tests on component mount
  useEffect(() => {
    if (accountId) {
      runTests();
    }
  }, [accountId]);

  return (
    <div className="vector-database-tester p-6 bg-gray-100 rounded-lg">
      <h2 className="text-2xl font-bold mb-4">🧬 Vector Database Status</h2>
      
      {loading && (
        <div className="text-blue-600 mb-4">
          🔄 Testing existing vector database...
        </div>
      )}
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <strong>Error:</strong> {error}
        </div>
      )}
      
      {stats && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">📊 Database Statistics</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded shadow">
              <div className="text-2xl font-bold text-blue-600">
                {stats.total_embeddings || 0}
              </div>
              <div className="text-sm text-gray-600">Total Embeddings</div>
            </div>
            <div className="bg-white p-4 rounded shadow">
              <div className="text-2xl font-bold text-green-600">
                {stats.documents_with_embeddings || 0}
              </div>
              <div className="text-sm text-gray-600">Documents with Embeddings</div>
            </div>
            <div className="bg-white p-4 rounded shadow">
              <div className="text-2xl font-bold text-purple-600">
                {stats.average_chunks_per_document ? 
                  parseFloat(stats.average_chunks_per_document).toFixed(1) : 0}
              </div>
              <div className="text-sm text-gray-600">Avg Chunks per Document</div>
            </div>
            <div className="bg-white p-4 rounded shadow">
              <div className="text-sm font-bold text-orange-600">
                {stats.oldest_embedding ? 
                  new Date(stats.oldest_embedding).toLocaleDateString() : 'N/A'}
              </div>
              <div className="text-sm text-gray-600">First Embedding</div>
            </div>
          </div>
        </div>
      )}
      
      {relationships.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">🔗 Sample Relationships</h3>
          <div className="bg-white rounded shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left">Source Document</th>
                  <th className="px-4 py-2 text-left">Target Document</th>
                  <th className="px-4 py-2 text-left">Similarity</th>
                </tr>
              </thead>
              <tbody>
                {relationships.slice(0, 5).map((rel, index) => (
                  <tr key={index} className="border-t">
                    <td className="px-4 py-2 text-sm">
                      {rel.source_file_name || 'Unknown'}
                    </td>
                    <td className="px-4 py-2 text-sm">
                      {rel.target_file_name || 'Unknown'}
                    </td>
                    <td className="px-4 py-2 text-sm">
                      <span className={`px-2 py-1 rounded text-xs ${
                        rel.similarity > 0.8 ? 'bg-green-100 text-green-800' :
                        rel.similarity > 0.6 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {(rel.similarity * 100).toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {testResults && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">🧪 Vector Search Test</h3>
          <div className={`p-4 rounded ${
            testResults.success ? 'bg-green-100 border border-green-400' :
            'bg-red-100 border border-red-400'
          }`}>
            <div className="font-semibold">
              {testResults.success ? '✅ Success' : '❌ Failed'}
            </div>
            <div className="text-sm mt-2">
              {testResults.message}
            </div>
            {testResults.results && testResults.results.length > 0 && (
              <div className="mt-3">
                <div className="font-medium">Sample Results:</div>
                {testResults.results.slice(0, 3).map((result, index) => (
                  <div key={index} className="text-sm mt-1 pl-4">
                    • {result.content?.substring(0, 100)}...
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      
      <div className="flex gap-4">
        <button
          onClick={runTests}
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Testing...' : 'Run Tests'}
        </button>
        
        <button
          onClick={() => {
            setStats(null);
            setRelationships([]);
            setTestResults(null);
            setError(null);
          }}
          className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
        >
          Clear Results
        </button>
      </div>
      
      <div className="mt-6 p-4 bg-blue-50 rounded">
        <h4 className="font-semibold text-blue-800 mb-2">💡 What This Means</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• <strong>Total Embeddings:</strong> Number of document chunks with vector embeddings</li>
          <li>• <strong>Documents:</strong> Number of documents that have been processed</li>
          <li>• <strong>Relationships:</strong> Real semantic connections between documents</li>
          <li>• <strong>Vector Search:</strong> Content-based similarity search capability</li>
        </ul>
      </div>
    </div>
  );
} 