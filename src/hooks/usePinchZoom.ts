import { useEffect, useRef, useState } from 'react';

interface UsePinchZoomOptions {
  minScale?: number;
  maxScale?: number;
  onlyMobile?: boolean;
}

export const usePinchZoom = ({
  minScale = 1,
  maxScale = 4,
  onlyMobile = true,
}: UsePinchZoomOptions = {}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isPinching, setIsPinching] = useState(false);
  
  const lastTouchDistance = useRef<number>(0);
  const lastTouchCenter = useRef({ x: 0, y: 0 });
  const startPinchScale = useRef(1);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Check if device has touch support
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (onlyMobile && !isTouchDevice) return;

    const getTouchDistance = (touches: TouchList) => {
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const getTouchCenter = (touches: TouchList) => {
      return {
        x: (touches[0].clientX + touches[1].clientX) / 2,
        y: (touches[0].clientY + touches[1].clientY) / 2,
      };
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        setIsPinching(true);
        lastTouchDistance.current = getTouchDistance(e.touches);
        lastTouchCenter.current = getTouchCenter(e.touches);
        startPinchScale.current = scale;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && isPinching) {
        e.preventDefault();
        
        const currentDistance = getTouchDistance(e.touches);
        const currentCenter = getTouchCenter(e.touches);
        
        // Calculate new scale
        const scaleChange = currentDistance / lastTouchDistance.current;
        let newScale = startPinchScale.current * scaleChange;
        newScale = Math.max(minScale, Math.min(maxScale, newScale));
        
        // Calculate pan offset
        const containerRect = container.getBoundingClientRect();
        const centerX = currentCenter.x - containerRect.left;
        const centerY = currentCenter.y - containerRect.top;
        
        setScale(newScale);
        
        // Update position to zoom towards pinch center
        const deltaX = (currentCenter.x - lastTouchCenter.current.x);
        const deltaY = (currentCenter.y - lastTouchCenter.current.y);
        
        setPosition(prev => ({
          x: prev.x + deltaX,
          y: prev.y + deltaY,
        }));
      } else if (e.touches.length === 1 && scale > 1) {
        // Allow panning when zoomed in
        e.preventDefault();
        const touch = e.touches[0];
        const deltaX = touch.clientX - lastTouchCenter.current.x;
        const deltaY = touch.clientY - lastTouchCenter.current.y;
        
        setPosition(prev => ({
          x: prev.x + deltaX,
          y: prev.y + deltaY,
        }));
        
        lastTouchCenter.current = { x: touch.clientX, y: touch.clientY };
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        setIsPinching(false);
      }
      if (e.touches.length === 1) {
        lastTouchCenter.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [scale, isPinching, minScale, maxScale, onlyMobile]);

  const reset = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  return {
    containerRef,
    scale,
    position,
    reset,
    style: {
      transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
      transformOrigin: '0 0',
      transition: isPinching ? 'none' : 'transform 0.1s ease-out',
    },
  };
};
