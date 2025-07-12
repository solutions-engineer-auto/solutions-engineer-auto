// Hybrid Graph Generator - Combines mock baseline with RAG enhancements
// This ensures the graph always has connections, with RAG making them stronger

export class HybridGraphGenerator {
  constructor(documents, ragRelationships = []) {
    this.documents = documents;
    this.ragRelationships = ragRelationships;
    this.ragMap = this.createRagMap();
  }
  
  // Create a map for quick RAG lookup
  createRagMap() {
    const map = new Map();
    this.ragRelationships.forEach(rel => {
      const key = `${rel.source_id}-${rel.target_id}`;
      const reverseKey = `${rel.target_id}-${rel.source_id}`;
      map.set(key, rel.similarity);
      map.set(reverseKey, rel.similarity);
    });
    return map;
  }
  
  generateHybridGraph() {
    const nodes = this.createNodes();
    const links = this.createHybridLinks(nodes);
    
    return { nodes, links };
  }
  
  createNodes() {
    return this.documents.map(doc => ({
      id: doc.id,
      name: doc.file_name || 'Unknown',
      type: 'document',
      metadata: {
        fileType: doc.file_type,
        uploadDate: doc.created_at,
        accountId: doc.account_id,
        ...doc.metadata
      },
      isGlobal: doc.is_global || false,
      // Visual properties
      visual: {
        icon: this.getIconByType(doc.file_type),
        color: this.getColorByType(doc.file_type),
        size: 12 + Math.random() * 8
      }
    }));
  }
  
  createHybridLinks(nodes) {
    const links = [];
    const processedPairs = new Set();
    
    // Create links between all nodes
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const source = nodes[i];
        const target = nodes[j];
        const pairKey = `${source.id}-${target.id}`;
        
        if (processedPairs.has(pairKey)) continue;
        processedPairs.add(pairKey);
        
        // Check if we have a RAG relationship
        const ragSimilarity = this.ragMap.get(pairKey);
        
        if (ragSimilarity) {
          // Strong RAG-based connection
          links.push({
            source: source.id,
            target: target.id,
            value: ragSimilarity,
            strength: this.getStrength(ragSimilarity),
            type: 'rag',
            label: `${Math.round(ragSimilarity * 100)}% similar`
          });
        } else {
          // Weak baseline connection based on file types and metadata
          const baseSimilarity = this.calculateBaseSimilarity(source, target);
          
          // Only add weak connections for some pairs to avoid clutter
          if (baseSimilarity > 0.1 && Math.random() < 0.3) {
            links.push({
              source: source.id,
              target: target.id,
              value: baseSimilarity,
              strength: 'weak',
              type: 'baseline',
              label: 'Potential connection'
            });
          }
        }
      }
    }
    
    // Ensure every node has at least one connection
    this.ensureMinimumConnectivity(nodes, links);
    
    return links;
  }
  
  calculateBaseSimilarity(node1, node2) {
    let similarity = 0;
    
    // Same file type
    if (node1.metadata.fileType === node2.metadata.fileType) {
      similarity += 0.3;
    }
    
    // Same account
    if (node1.metadata.accountId === node2.metadata.accountId) {
      similarity += 0.2;
    }
    
    // Similar creation time (within 7 days)
    const timeDiff = Math.abs(
      new Date(node1.metadata.uploadDate) - new Date(node2.metadata.uploadDate)
    );
    if (timeDiff < 7 * 24 * 60 * 60 * 1000) {
      similarity += 0.1;
    }
    
    // Both are global documents
    if (node1.isGlobal && node2.isGlobal) {
      similarity += 0.2;
    }
    
    return Math.min(similarity, 0.4); // Cap baseline similarity
  }
  
  ensureMinimumConnectivity(nodes, links) {
    // Find nodes with no connections
    const connectedNodes = new Set();
    links.forEach(link => {
      connectedNodes.add(link.source);
      connectedNodes.add(link.target);
    });
    
    nodes.forEach(node => {
      if (!connectedNodes.has(node.id)) {
        // Connect to a random node
        const targetNode = nodes[Math.floor(Math.random() * nodes.length)];
        if (targetNode.id !== node.id) {
          links.push({
            source: node.id,
            target: targetNode.id,
            value: 0.05,
            strength: 'very-weak',
            type: 'minimum',
            label: 'Minimum connectivity'
          });
        }
      }
    });
  }
  
  getStrength(similarity) {
    if (similarity > 0.8) return 'strong';
    if (similarity > 0.6) return 'medium';
    if (similarity > 0.4) return 'weak';
    return 'very-weak';
  }
  
  // Visual helpers
  getIconByType(fileType) {
    const icons = {
      'pdf': '📄',
      'docx': '📝',
      'xlsx': '📊',
      'pptx': '📊',
      'txt': '📃',
      'md': '📑',
      'html': '🌐',
      'template': '📋',
      'email': '📧',
      'image': '🖼️'
    };
    return icons[fileType] || '📎';
  }
  
  getColorByType(fileType) {
    const colors = {
      'pdf': '#ef4444',      // red
      'docx': '#3b82f6',     // blue
      'xlsx': '#10b981',     // green
      'pptx': '#f59e0b',     // amber
      'txt': '#6b7280',      // gray
      'md': '#8b5cf6',       // purple
      'html': '#06b6d4',     // cyan
      'template': '#ec4899', // pink
      'email': '#f97316',    // orange
      'image': '#84cc16'     // lime
    };
    return colors[fileType] || '#94a3b8';
  }
}

// Export a singleton for easy use
export const hybridGraphGenerator = {
  generate: (documents, ragRelationships = []) => {
    const generator = new HybridGraphGenerator(documents, ragRelationships);
    return generator.generateHybridGraph();
  }
}; 