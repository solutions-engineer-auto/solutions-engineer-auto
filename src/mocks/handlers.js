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
  http.post('/api/documents/generate', async ({ request }) => {
    // Simulate AI generation delay
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    const body = await request.json()
    const docId = `doc-${Date.now()}`
    
    return HttpResponse.json({
      documentId: docId,
      status: 'draft',
      message: 'Document generated successfully',
      accountId: body.accountId
    })
  }),

  // GET /documents/:id - Get document details
  http.get('/api/documents/:id', ({ params }) => {
    // Mock document content based on ID
    const mockContent = `
      <h1>Integration Plan for Acme Corporation</h1>
      <p>This document outlines the comprehensive integration strategy for implementing our solution at Acme Corporation.</p>
      
      <h2>Executive Summary</h2>
      <p>Acme Corporation is seeking to modernize their infrastructure with our cutting-edge integration platform. This document provides a detailed roadmap for successful implementation.</p>
      
      <h2>Technical Requirements</h2>
      <ul>
        <li>Cloud-native architecture support</li>
        <li>RESTful API integration capabilities</li>
        <li>Real-time data synchronization</li>
        <li>Enterprise-grade security compliance</li>
      </ul>
      
      <h2>Implementation Timeline</h2>
      <p>The proposed implementation will span 12 weeks with the following phases:</p>
      <ol>
        <li><strong>Phase 1 (Weeks 1-3):</strong> Environment setup and initial configuration</li>
        <li><strong>Phase 2 (Weeks 4-6):</strong> Core integration development</li>
        <li><strong>Phase 3 (Weeks 7-9):</strong> Testing and quality assurance</li>
        <li><strong>Phase 4 (Weeks 10-12):</strong> Deployment and go-live support</li>
      </ol>
      
      <h2>Risk Mitigation</h2>
      <p>Key risks have been identified and mitigation strategies developed:</p>
      <blockquote>
        <p>"Proper planning prevents poor performance. Our risk mitigation strategy ensures smooth implementation."</p>
      </blockquote>
      
      <h2>Success Criteria</h2>
      <p>Success will be measured by:</p>
      <ul>
        <li>System uptime of 99.9% or higher</li>
        <li>Data processing latency under 100ms</li>
        <li>Zero critical security vulnerabilities</li>
        <li>User adoption rate exceeding 80% within 30 days</li>
      </ul>
    `
    
    return HttpResponse.json({
      id: params.id,
      content: mockContent,
      status: 'draft',
      title: 'Integration Plan',
      lastModified: new Date().toISOString(),
      createdAt: new Date(Date.now() - 3600000).toISOString() // 1 hour ago
    })
  }),

  // PUT /documents/:id - Save document
  http.put('/api/documents/:id', async ({ params, request }) => {
    const body = await request.json()
    
    // Simulate save delay
    await new Promise(resolve => setTimeout(resolve, 500))
    
    return HttpResponse.json({
      id: params.id,
      status: body.status || 'draft',
      lastModified: new Date().toISOString(),
      message: 'Document saved successfully'
    })
  }),

  // POST /documents/:id/export - Export document
  http.post('/api/documents/:id/export', async ({ params, request }) => {
    const body = await request.json()
    
    // Simulate export processing
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    return HttpResponse.json({
      documentId: params.id,
      format: body.format,
      downloadUrl: `/downloads/${params.id}.${body.format}`,
      expiresAt: new Date(Date.now() + 3600000).toISOString() // 1 hour from now
    })
  })
] 