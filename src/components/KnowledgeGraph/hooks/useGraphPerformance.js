import { useState, useEffect, useRef } from 'react';

export function useGraphPerformance(graphData) {
  const [fps, setFps] = useState(60);
  const frameCount = useRef(0);
  const lastTime = useRef(performance.now());
  const animationId = useRef(null);

  useEffect(() => {
    const measureFPS = () => {
      frameCount.current++;
      const currentTime = performance.now();
      
      if (currentTime >= lastTime.current + 1000) {
        const measuredFps = Math.round(
          frameCount.current * 1000 / (currentTime - lastTime.current)
        );
        setFps(measuredFps);
        frameCount.current = 0;
        lastTime.current = currentTime;
      }
      
      animationId.current = requestAnimationFrame(measureFPS);
    };
    
    // Start measuring
    measureFPS();
    
    // Cleanup
    return () => {
      if (animationId.current) {
        cancelAnimationFrame(animationId.current);
      }
    };
  }, []);

  return {
    fps,
    nodeCount: graphData?.nodes?.length || 0,
    linkCount: graphData?.links?.length || 0
  };
} 