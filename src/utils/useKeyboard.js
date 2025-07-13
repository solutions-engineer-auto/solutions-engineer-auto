import { useCallback, useEffect } from 'react';

/**
 * Custom hook for handling keyboard shortcuts.
 * @param {object} props - The properties for the hook.
 * @param {string} props.key - The key to listen for.
 * @param {function(): void} props.callback - The function to call when the key is pressed.
 * @param {boolean} [props.ctrl=false] - Whether the control key must be pressed.
 * @param {boolean} [props.alt=false] - Whether the alt key must be pressed.
 * @param {boolean} [props.shift=false] - Whether the shift key must be pressed.
 */
export const useKeyboard = ({
  key,
  callback,
  ctrl = false,
  alt = false,
  shift = false
}) => {
  const handleKeyDown = useCallback(
    (event) => {
      const isCtrlPressed = ctrl ? event.ctrlKey || event.metaKey : true; // Also check for metaKey (Cmd on Mac)
      const isAltPressed = alt ? event.altKey : true;
      const isShiftPressed = shift ? event.shiftKey : true;

      if (
        event.key.toLowerCase() === key.toLowerCase() &&
        isCtrlPressed &&
        isAltPressed &&
        isShiftPressed
      ) {
        event.preventDefault();
        callback();
      }
    },
    [key, callback, ctrl, alt, shift]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}; 