import React from 'react';

const AIActivityIndicator = ({ activity }) => {
  if (!activity) return null;

  const getActivityIcon = (type) => {
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
      case 'error':
        return '⚠️';
      default:
        return '⚡';
    }
  };

  return (
    <div className={`ai-activity-indicator ${activity.type}`}>
      <div className="activity-content">
        <span className="activity-icon">{getActivityIcon(activity.type)}</span>
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