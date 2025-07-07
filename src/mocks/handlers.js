import { http, HttpResponse } from 'msw'

// Mock data for accounts
const mockAccounts = [
  {
    id: 'acc-001',
    name: 'Acme Corporation',
    stage: 'Discovery',
    documentStatus: 'draft',
    lastUpdated: '2025-01-05T10:30:00Z',
    contact: 'John Smith',
    value: '$150,000'
  },
  {
    id: 'acc-002',
    name: 'TechStart Inc.',
    stage: 'Pre-Sales',
    documentStatus: 'finalized',
    lastUpdated: '2025-01-04T14:20:00Z',
    contact: 'Sarah Johnson',
    value: '$85,000'
  },
  {
    id: 'acc-003',
    name: 'Global Solutions Ltd.',
    stage: 'Pilot Deployment',
    documentStatus: 'draft',
    lastUpdated: '2025-01-03T09:15:00Z',
    contact: 'Michael Chen',
    value: '$220,000'
  },
  {
    id: 'acc-004',
    name: 'Innovation Labs',
    stage: 'Discovery',
    documentStatus: null,
    lastUpdated: '2025-01-02T16:45:00Z',
    contact: 'Emily Davis',
    value: '$95,000'
  },
  {
    id: 'acc-005',
    name: 'Enterprise Systems Co.',
    stage: 'Post-Sale',
    documentStatus: 'finalized',
    lastUpdated: '2025-01-01T11:00:00Z',
    contact: 'Robert Wilson',
    value: '$320,000'
  }
]

export const handlers = [
  // GET /accounts - List all accounts
  http.get('/api/accounts', () => {
    // Simulate network delay
    return HttpResponse.json({
      accounts: mockAccounts,
      total: mockAccounts.length
    })
  }),

  // GET /accounts/:id - Get single account details
  http.get('/api/accounts/:id', ({ params }) => {
    const account = mockAccounts.find(acc => acc.id === params.id)
    
    if (!account) {
      return new HttpResponse(null, { status: 404 })
    }

    // Add more detailed information for single account view
    return HttpResponse.json({
      ...account,
      description: `${account.name} is a key prospect in the ${account.stage} stage.`,
      documents: account.documentStatus ? [{
        id: `doc-${account.id}`,
        type: 'Integration Plan',
        status: account.documentStatus,
        lastModified: account.lastUpdated
      }] : []
    })
  }),

  // POST /accounts/:id/upload - Mock file upload
  http.post('/api/accounts/:id/upload', async ({ params }) => {
    // Simulate upload processing
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    return HttpResponse.json({
      success: true,
      message: 'File uploaded successfully',
      accountId: params.id,
      fileId: `file-${Date.now()}`
    })
  }),

  // POST /documents/generate - Mock document generation
  http.post('/api/documents/generate', async () => {
    // Simulate AI generation delay
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    return HttpResponse.json({
      documentId: `doc-${Date.now()}`,
      status: 'draft',
      message: 'Document generated successfully'
    })
  })
] 