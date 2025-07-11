import React, { Component } from 'react';

export class GraphErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Knowledge Graph Error:', error, errorInfo);
    
    // Send error to analytics if available
    if (window.gtag) {
      window.gtag('event', 'exception', {
        description: error.toString(),
        fatal: false,
        error_type: 'knowledge_graph'
      });
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="knowledge-graph-error" style={{ height: 600 }}>
          <div className="error-content">
            <h3>Oops! Something went wrong</h3>
            <p>The knowledge graph encountered an error.</p>
            {import.meta.env.DEV && this.state.error && (
              <details className="error-details">
                <summary>Technical details</summary>
                <pre>{this.state.error.stack}</pre>
              </details>
            )}
            <div className="error-actions">
              <button onClick={this.handleReset} className="btn-primary">
                Try Again
              </button>
              <button onClick={() => window.location.reload()} className="btn-secondary">
                Refresh Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
} 