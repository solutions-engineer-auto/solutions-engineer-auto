// Mock data generator for Knowledge Graph visualization
// This generates realistic-looking data before RAG/embeddings are implemented

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
    const links = this.createRealisticLinks(nodes);
    
    return { nodes, links };
  }

  createNodes() {
    return this.documents.map((doc) => ({
      id: doc.id,
      name: doc.file_name || 'Untitled',
      type: 'document',
      metadata: {
        fileType: doc.file_type,
        uploadDate: doc.created_at,
        accountId: doc.account_id,
        summary: this.generateSummary(doc.file_name),
        tags: this.generateTags(doc.file_name),
        usageCount: Math.floor(this.seededRandom() * 20),
        relevanceScore: this.seededRandom()
      },
      visual: {
        icon: this.getIconByType(doc.file_type),
        color: this.getColorByType(doc.file_type),
        size: 12 + this.seededRandom() * 8
      }
    }));
  }

  createRealisticLinks(nodes) {
    const links = [];
    const maxLinks = Math.min(nodes.length * 3, 100); // Allow more connections
    
    // Calculate similarity between all pairs of documents
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const similarity = this.calculateDocumentSimilarity(nodes[i], nodes[j]);
        
        // Only create links above certain thresholds with some randomness
        const threshold = 0.3 + this.seededRandom() * 0.2; // Variable threshold 0.3-0.5
        
        if (similarity > threshold && links.length < maxLinks) {
          links.push({
            source: nodes[i].id,
            target: nodes[j].id,
            value: similarity,
            type: this.getLinkType(similarity)
          });
        }
      }
    }
    
    // Ensure no isolated nodes - connect lone nodes to similar ones
    const connectedNodes = new Set();
    links.forEach(link => {
      connectedNodes.add(link.source);
      connectedNodes.add(link.target);
    });
    
    nodes.forEach(node => {
      if (!connectedNodes.has(node.id) && links.length < maxLinks) {
        // Find most similar node that's already connected
        let bestMatch = null;
        let bestSimilarity = 0;
        
        nodes.forEach(otherNode => {
          if (otherNode.id !== node.id && connectedNodes.has(otherNode.id)) {
            const sim = this.calculateDocumentSimilarity(node, otherNode);
            if (sim > bestSimilarity) {
              bestSimilarity = sim;
              bestMatch = otherNode;
            }
          }
        });
        
        if (bestMatch && bestSimilarity > 0.2) {
          links.push({
            source: node.id,
            target: bestMatch.id,
            value: bestSimilarity,
            type: this.getLinkType(bestSimilarity)
          });
        }
      }
    });
    
    return links;
  }

  calculateDocumentSimilarity(doc1, doc2) {
    let similarity = 0;
    
    // 1. File type similarity (strong factor)
    if (doc1.metadata.fileType === doc2.metadata.fileType) {
      similarity += 0.4;
    }
    
    // 2. Name similarity (using simple text analysis)
    const name1 = doc1.name.toLowerCase();
    const name2 = doc2.name.toLowerCase();
    const nameSimilarity = this.calculateTextSimilarity(name1, name2);
    similarity += nameSimilarity * 0.5;
    
    // 3. Tag overlap
    const tags1 = doc1.metadata.tags || [];
    const tags2 = doc2.metadata.tags || [];
    const tagOverlap = this.calculateArrayOverlap(tags1, tags2);
    similarity += tagOverlap * 0.3;
    
    // 4. Template detection (high similarity for templates)
    const isTemplate1 = name1.includes('template') || name1.includes('TEMPLATE');
    const isTemplate2 = name2.includes('template') || name2.includes('TEMPLATE');
    if (isTemplate1 && isTemplate2) {
      similarity += 0.6;
    }
    
    // 5. Account-based similarity (same account = slight boost)
    if (doc1.metadata.accountId === doc2.metadata.accountId) {
      similarity += 0.1;
    }
    
    // 6. Add some controlled randomness but cap it
    const randomFactor = (this.seededRandom() - 0.5) * 0.2; // -0.1 to +0.1
    similarity += randomFactor;
    
    // Ensure similarity is between 0 and 1
    return Math.max(0, Math.min(1, similarity));
  }

  calculateTextSimilarity(text1, text2) {
    // Simple word overlap calculation
    const words1 = text1.split(/[\s_\-.]+/).filter(w => w.length > 2);
    const words2 = text2.split(/[\s_\-.]+/).filter(w => w.length > 2);
    
    if (words1.length === 0 || words2.length === 0) return 0;
    
    const commonWords = words1.filter(word => words2.includes(word));
    const totalWords = new Set([...words1, ...words2]).size;
    
    return commonWords.length / totalWords;
  }

  calculateArrayOverlap(arr1, arr2) {
    if (arr1.length === 0 || arr2.length === 0) return 0;
    
    const common = arr1.filter(item => arr2.includes(item));
    const total = new Set([...arr1, ...arr2]).size;
    
    return common.length / total;
  }

  getLinkType(similarity) {
    if (similarity > 0.8) return 'strong';
    if (similarity > 0.6) return 'medium';
    return 'weak';
  }

  generateSummary(fileName) {
    const summaries = [
      'Strategic planning document',
      'Technical implementation guide', 
      'Project requirements specification',
      'Executive summary report',
      'Financial analysis overview',
      'Customer engagement strategy',
      'Product development roadmap',
      'Sales methodology framework',
      'Engineering documentation',
      'Design specification'
    ];
    
    // Choose summary based on filename keywords
    const name = fileName.toLowerCase();
    if (name.includes('strategy') || name.includes('plan')) return 'Strategic planning document for ' + fileName;
    if (name.includes('tech') || name.includes('implementation')) return 'Technical implementation guide for ' + fileName;
    if (name.includes('requirements') || name.includes('spec')) return 'Project requirements specification for ' + fileName;
    if (name.includes('financial') || name.includes('analysis')) return 'Financial analysis overview for ' + fileName;
    if (name.includes('customer') || name.includes('engagement')) return 'Customer engagement strategy for ' + fileName;
    
    // Default to random with some seeded consistency
    const idx = Math.floor(this.seededRandom() * summaries.length);
    return summaries[idx] + ' for ' + fileName;
  }

  generateTags(fileName) {
    const allTags = ['strategy', 'technical', 'financial', 'customer', 'product', 'sales', 'engineering', 'design'];
    const name = fileName.toLowerCase();
    const tags = [];
    
    // Add relevant tags based on filename
    if (name.includes('strategy') || name.includes('plan')) tags.push('strategy');
    if (name.includes('tech') || name.includes('implementation') || name.includes('dev')) tags.push('technical', 'engineering');
    if (name.includes('financial') || name.includes('cost') || name.includes('budget')) tags.push('financial');
    if (name.includes('customer') || name.includes('client')) tags.push('customer');
    if (name.includes('product') || name.includes('feature')) tags.push('product');
    if (name.includes('sales') || name.includes('proposal')) tags.push('sales');
    if (name.includes('design') || name.includes('ui') || name.includes('ux')) tags.push('design');
    
    // Add 1-2 random tags if we don't have enough
    while (tags.length < 2) {
      const randomTag = allTags[Math.floor(this.seededRandom() * allTags.length)];
      if (!tags.includes(randomTag)) {
        tags.push(randomTag);
      }
    }
    
    return tags.slice(0, 3); // Max 3 tags
  }

  getIconByType(fileType) {
    const iconMap = {
      'application/pdf': '📄',                // PDF files
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '📝', // Word docs
      'application/msword': '📝',             // Older Word docs
      'text/plain': '📃',                     // Text files
      'text/markdown': '📑',                  // Markdown files
      'application/json': '🔧',               // JSON files
      'text/csv': '📊',                       // CSV files
      'application/vnd.ms-excel': '📊',       // Excel files
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '📊', // Excel
      'application/vnd.ms-powerpoint': '📽️',  // PowerPoint
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': '📽️', // PowerPoint
      'image/png': '🖼️',                      // Images
      'image/jpeg': '🖼️',                     // Images
      'image/jpg': '🖼️',                      // Images
      'application/zip': '📦',                // Archives
      'application/x-zip-compressed': '📦',   // Archives
      'text/html': '🌐',                      // HTML files
      'text/css': '🎨',                       // CSS files
      'application/javascript': '⚡',         // JavaScript
      'text/javascript': '⚡'                 // JavaScript
    };
    
    return iconMap[fileType] || '📎'; // Default paperclip
  }

  getColorByType(fileType) {
    const colorMap = {
      'application/pdf': '#ef4444',           // Bright red for PDFs
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '#3b82f6', // Blue for Word docs
      'application/msword': '#3b82f6',        // Blue for older Word docs
      'text/plain': '#10b981',                // Green for text files
      'text/markdown': '#8b5cf6',             // Purple for markdown
      'application/json': '#f59e0b',          // Orange for JSON
      'text/csv': '#059669',                  // Dark green for CSV
      'application/vnd.ms-excel': '#10b981',  // Green for Excel
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '#10b981', // Green for Excel
      'application/vnd.ms-powerpoint': '#f97316', // Orange for PowerPoint
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': '#f97316', // Orange for PowerPoint
      'image/png': '#06b6d4',                 // Cyan for images
      'image/jpeg': '#06b6d4',                // Cyan for images
      'image/jpg': '#06b6d4',                 // Cyan for images
      'application/zip': '#6b7280',           // Gray for archives
      'application/x-zip-compressed': '#6b7280', // Gray for archives
      'text/html': '#ec4899',                 // Pink for HTML
      'text/css': '#84cc16',                  // Lime for CSS
      'application/javascript': '#fbbf24',    // Yellow for JS
      'text/javascript': '#fbbf24'            // Yellow for JS
    };
    
    return colorMap[fileType] || '#6366f1'; // Default to indigo
  }
} 