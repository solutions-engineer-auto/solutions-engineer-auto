import React from 'react';

const AIActivityIndicator = ({ activity }) => {
  if (!activity) return null;

  const getActivityIcon = (activity) => {
    // Use display metadata if available
    if (activity.eventData?.display?.icon) {
      const iconMap = {
        retrieval: '📖',
        analysis: '📊',
        planning: '🗺️',
        generation: '✨',
        validation: '✅',
        assembly: '🔧',
        workflow: '⚡',
        error: '⚠️',
        default: '⚡'
      };
      return iconMap[activity.eventData.display.icon] || '⚡';
    }
    
    // Fall back to legacy type-based selection
    const type = activity.type;
    switch (type) {
      case 'thinking':
        return '🤔';
      case 'reading':
        return '📖';
      case 'searching':
        return '🔍';
      case 'analyzing':
        return '📊';
      case 'generating':
        return '✨';
      case 'success':
        return '✅';
      case 'error':
        return '⚠️';
      default:
        return '⚡';
    }
  };

  return (
    <div className={`ai-activity-indicator ${activity.type}`}>
      <div className="activity-content">
        <span className="activity-icon">{getActivityIcon(activity)}</span>
        <span className="activity-message">{activity.message}</span>
        {activity.type !== 'error' && (
          <div className="activity-dots">
            <span className="dot"></span>
            <span className="dot"></span>
            <span className="dot"></span>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIActivityIndicator; 