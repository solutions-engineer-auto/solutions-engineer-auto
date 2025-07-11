import { useCallback, useRef } from 'react';

/**
 * @typedef {Object} GraphControlsAPI
 * @property {() => void} resetView
 * @property {() => void} zoomIn
 * @property {() => void} zoomOut
 * @property {() => void} toggleRotation
 * @property {(nodeId: string) => void} focusNode
 * @property {(speed: number) => void} setGraphSpeed
 * @property {() => void} takeScreenshot
 */

/**
 * @param {React.RefObject<any>} graphRef
 * @returns {GraphControlsAPI}
 */
export function useGraphControls(graphRef) {
  const zoomLevelRef = useRef(1);

  const resetView = useCallback(() => {
    if (graphRef?.current) {
      graphRef.current.centerAt(0, 0, 1000);
      graphRef.current.zoom(1, 1000);
      zoomLevelRef.current = 1;
    }
  }, [graphRef]);

  const zoomIn = useCallback(() => {
    if (graphRef?.current) {
      const newZoom = Math.min(zoomLevelRef.current * 1.2, 5);
      graphRef.current.zoom(newZoom, 300);
      zoomLevelRef.current = newZoom;
    }
  }, [graphRef]);

  const zoomOut = useCallback(() => {
    if (graphRef?.current) {
      const newZoom = Math.max(zoomLevelRef.current * 0.8, 0.1);
      graphRef.current.zoom(newZoom, 300);
      zoomLevelRef.current = newZoom;
    }
  }, [graphRef]);

  const focusNode = useCallback((nodeId) => {
    if (graphRef?.current) {
      const graph = graphRef.current;
      const node = graph.graphData().nodes.find(n => n.id === nodeId);
      if (node) {
        graph.centerAt(node.x, node.y, 1000);
        graph.zoom(3, 1000);
      }
    }
  }, [graphRef]);

  const takeScreenshot = useCallback(() => {
    if (graphRef?.current) {
      const canvas = graphRef.current.ctx?.canvas;
      if (canvas) {
        const dataUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `knowledge-graph-${Date.now()}.png`;
        link.href = dataUrl;
        link.click();
      }
    }
  }, [graphRef]);

  return {
    resetView,
    zoomIn,
    zoomOut,
    focusNode,
    takeScreenshot
  };
} 