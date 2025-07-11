// Mock data generator for Knowledge Graph visualization
import { v4 as uuidv4 } from 'uuid';

export class MockKnowledgeGraphGenerator {
  constructor(documents, seed = Date.now()) {
    this.documents = documents || [];
    this.rngSeed = seed;
  }

  // Seeded random for reproducible layouts
  seededRandom() {
    this.rngSeed = (this.rngSeed * 9301 + 49297) % 233280;
    return this.rngSeed / 233280;
  }

  generateMockGraph() {
    const nodes = this.createNodes();
    const links = this.createLinks(nodes);
    
    return { nodes, links };
  }

  createNodes() {
    return this.documents.map((doc) => ({
      id: doc.id || uuidv4(),
      name: doc.file_name || 'Untitled',
      type: 'document',
      metadata: {
        fileType: doc.file_type,
        uploadDate: doc.created_at,
        accountId: doc.account_id,
        summary: this.generateSummary(doc.file_name),
        tags: this.generateTags(),
        usageCount: Math.floor(this.seededRandom() * 20),
        relevanceScore: this.seededRandom()
      },
      visual: {
        icon: this.getIconByType(doc.file_type),
        color: this.getColorByType(doc.file_type),
        size: 5 + this.seededRandom() * 10
      }
    }));
  }

  createLinks(nodes) {
    const links = [];
    const maxLinks = Math.min(nodes.length * 2, 50);
    
    // Create some mock relationships
    for (let i = 0; i < nodes.length && links.length < maxLinks; i++) {
      const numConnections = Math.floor(this.seededRandom() * 3) + 1;
      
      for (let j = 0; j < numConnections; j++) {
        const targetIdx = Math.floor(this.seededRandom() * nodes.length);
        if (targetIdx !== i) {
          links.push({
            source: nodes[i].id,
            target: nodes[targetIdx].id,
            value: this.seededRandom()
          });
        }
      }
    }
    
    return links;
  }

  generateSummary(fileName) {
    const summaries = [
      'Strategic planning document',
      'Technical implementation guide',
      'Project requirements specification',
      'Executive summary report',
      'Financial analysis overview',
      'Customer engagement strategy'
    ];
    
    const idx = Math.floor(this.seededRandom() * summaries.length);
    return summaries[idx] + ' for ' + fileName;
  }

  generateTags() {
    const allTags = ['strategy', 'technical', 'financial', 'customer', 'product', 'sales', 'engineering', 'design'];
    const numTags = Math.floor(this.seededRandom() * 3) + 1;
    const tags = [];
    
    for (let i = 0; i < numTags; i++) {
      const tagIdx = Math.floor(this.seededRandom() * allTags.length);
      if (!tags.includes(allTags[tagIdx])) {
        tags.push(allTags[tagIdx]);
      }
    }
    
    return tags;
  }

  getIconByType(fileType) {
    const iconMap = {
      'application/pdf': '📄',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '📝',
      'text/plain': '📃',
      'text/markdown': '📑',
      'application/json': '🔧',
      'text/csv': '📊'
    };
    
    return iconMap[fileType] || '📎';
  }

  getColorByType(fileType) {
    const colorMap = {
      'application/pdf': '#ef4444',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '#3b82f6',
      'text/plain': '#10b981',
      'text/markdown': '#8b5cf6',
      'application/json': '#f59e0b',
      'text/csv': '#059669'
    };
    
    return colorMap[fileType] || '#6b7280';
  }
} 