import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ZoomIn, ZoomOut, Maximize, X } from 'lucide-react';
import { Button } from './ui/button';

interface ZoomableImageViewerProps {
  src: string;
  alt: string;
  startInFullscreen?: boolean;
  onFullscreenClose?: () => void;
}

export const ZoomableImageViewer = ({ src, alt, startInFullscreen = false, onFullscreenClose }: ZoomableImageViewerProps) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [autoRotate, setAutoRotate] = useState(false);
  const [isInteracting, setIsInteracting] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const lastTapRef = useRef<number>(0);
  const dragStartTimeoutRef = useRef<number | null>(null);

  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 0.25, 5));
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(prev - 0.25, 0.5));
  };

  const handleReset = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setIsInteracting(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsInteracting(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setIsInteracting(true);
    const delta = e.deltaY * -0.001;
    setScale(prev => Math.max(0.5, Math.min(5, prev + delta)));
    // Reset interacting state after a short delay
    setTimeout(() => setIsInteracting(false), 100);
  };

  // Touch events for mobile
  const [touchStart, setTouchStart] = useState<{ dist: number; center: { x: number; y: number } } | null>(null);

  const getTouchDistance = (touches: React.TouchList) => {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const getTouchCenter = (touches: React.TouchList) => {
    return {
      x: (touches[0].clientX + touches[1].clientX) / 2,
      y: (touches[0].clientY + touches[1].clientY) / 2,
    };
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // Clear any pending drag start
      if (dragStartTimeoutRef.current) {
        clearTimeout(dragStartTimeoutRef.current);
        dragStartTimeoutRef.current = null;
      }
      setIsInteracting(true);
      const dist = getTouchDistance(e.touches);
      const center = getTouchCenter(e.touches);
      setTouchStart({ dist, center });
    } else if (e.touches.length === 1) {
      // Double tap detection for fullscreen only
      if (isFullscreen) {
        const now = Date.now();
        const timeSinceLastTap = now - lastTapRef.current;
        if (timeSinceLastTap < 300 && timeSinceLastTap > 0) {
          // Double tap detected - reset zoom
          e.preventDefault();
          handleReset();
          lastTapRef.current = 0;
          // Clear any pending drag start
          if (dragStartTimeoutRef.current) {
            clearTimeout(dragStartTimeoutRef.current);
            dragStartTimeoutRef.current = null;
          }
          return;
        }
        lastTapRef.current = now;
      }
      
      // Delay setting isDragging to allow double-tap detection
      const touchX = e.touches[0].clientX;
      const touchY = e.touches[0].clientY;
      dragStartTimeoutRef.current = window.setTimeout(() => {
        setIsDragging(true);
        setIsInteracting(true);
        setDragStart({
          x: touchX - position.x,
          y: touchY - position.y,
        });
      }, 150);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && touchStart) {
      // Pinch zoom
      setIsInteracting(true);
      const dist = getTouchDistance(e.touches);
      const scaleDelta = dist / touchStart.dist;
      setScale(prev => Math.max(0.5, Math.min(5, prev * scaleDelta)));
      setTouchStart({ dist, center: getTouchCenter(e.touches) });
    } else if (e.touches.length === 1) {
      // If user starts moving before timeout, start dragging immediately
      if (dragStartTimeoutRef.current) {
        clearTimeout(dragStartTimeoutRef.current);
        dragStartTimeoutRef.current = null;
        setIsDragging(true);
        setIsInteracting(true);
        setDragStart({
          x: e.touches[0].clientX - position.x,
          y: e.touches[0].clientY - position.y,
        });
      }
      
      if (isDragging) {
        setPosition({
          x: e.touches[0].clientX - dragStart.x,
          y: e.touches[0].clientY - dragStart.y,
        });
      }
    }
  };

  const handleTouchEnd = () => {
    if (dragStartTimeoutRef.current) {
      clearTimeout(dragStartTimeoutRef.current);
      dragStartTimeoutRef.current = null;
    }
    setIsDragging(false);
    setIsInteracting(false);
    setTouchStart(null);
  };

  // Auto-start in fullscreen if requested
  useEffect(() => {
    if (startInFullscreen) {
      handleFullscreen();
    }
  }, [startInFullscreen]);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    const container = containerRef.current;
    if (container && !isMobile) {
      container.addEventListener('wheel', handleWheel as any, { passive: false });
    }
    
    return () => {
      window.removeEventListener('resize', checkMobile);
      if (container) {
        container.removeEventListener('wheel', handleWheel as any);
      }
    };
  }, [isMobile]);

  // Window-level listeners to end dragging even if mouse leaves container
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      setPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    };
    const onMouseUp = () => {
      setIsDragging(false);
      setIsInteracting(false);
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!isDragging || e.touches.length !== 1) return;
      const t = e.touches[0];
      setPosition({ x: t.clientX - dragStart.x, y: t.clientY - dragStart.y });
    };
    const onTouchEnd = () => {
      if (dragStartTimeoutRef.current) {
        clearTimeout(dragStartTimeoutRef.current);
        dragStartTimeoutRef.current = null;
      }
      setIsDragging(false);
      setIsInteracting(false);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('touchmove', onTouchMove);
    window.addEventListener('touchend', onTouchEnd);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [isDragging, dragStart]);

  const handleFullscreen = () => {
    setIsFullscreen(true);
    setScale(1);
    setPosition({ x: 0, y: 0 });
    
    // Check if we need to auto-rotate for mobile in portrait mode
    const isMobileDevice = window.innerWidth < 768;
    if (isMobileDevice) {
      const isPortrait = window.innerHeight > window.innerWidth;
      setAutoRotate(isPortrait);
    }
  };

  const handleCloseFullscreen = () => {
    setIsFullscreen(false);
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setAutoRotate(false);
    // Call the callback if provided
    if (onFullscreenClose) {
      onFullscreenClose();
    }
  };

  const fullscreenContent = isFullscreen ? (
    <div className="fixed inset-0 z-[9999] bg-black">
      {/* Close Button */}
      <div className="absolute top-4 right-4 z-[10001] pointer-events-auto">
        <Button
          variant="ghost"
          size="icon"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            handleCloseFullscreen();
          }}
          className="text-white hover:bg-white/20 border border-white/50"
          title="Exit Fullscreen"
        >
          <X className="h-6 w-6" />
        </Button>
      </div>


      {/* Image Container - Full Screen */}
      <div
        className="absolute inset-0 w-screen h-screen overflow-hidden flex items-center justify-center"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      >
        <img
          ref={imageRef}
          src={src}
          alt={alt}
          className="select-none pointer-events-none"
          style={{
            maxWidth: autoRotate ? '100vh' : '100vw',
            maxHeight: autoRotate ? '100vw' : '100vh',
            width: 'auto',
            height: 'auto',
            objectFit: 'contain',
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${autoRotate ? 90 : 0}deg)`,
            transformOrigin: 'center center',
            transition: isInteracting ? 'none' : 'none',
          }}
          draggable={false}
        />
      </div>

      {/* Scale Indicator */}
      {isMobile && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white/20 px-3 py-1 rounded-full text-sm text-white">
          {Math.round(scale * 100)}%
        </div>
      )}
    </div>
  ) : null;

  return (
    <>
      {isFullscreen && typeof document !== 'undefined' && createPortal(fullscreenContent, document.body)}
      
      <div className="relative w-full h-full bg-muted">
      {/* Zoom Controls - Mobile Only */}
      {isMobile && (
        <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
          <Button
            variant="secondary"
            size="icon"
            onClick={handleZoomIn}
            title="Zoom In"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            onClick={handleZoomOut}
            title="Zoom Out"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Fullscreen Button */}
      <div className="absolute top-4 left-4 z-10">
        <Button
          variant="secondary"
          size="icon"
          onClick={handleFullscreen}
          title="Fullscreen"
        >
          <Maximize className="h-4 w-4" />
        </Button>
      </div>

      {/* Image Container */}
      <div
        ref={containerRef}
        className="w-full h-full overflow-hidden flex items-center justify-center"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      >
        <img
          src={src}
          alt={alt}
          className="max-w-full max-h-full object-contain select-none pointer-events-none"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transformOrigin: 'center center',
            transition: isInteracting ? 'none' : 'none',
          }}
          draggable={false}
        />
      </div>

      {/* Scale Indicator - Mobile Only */}
      {isMobile && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-background/80 px-3 py-1 rounded-full text-sm">
          {Math.round(scale * 100)}%
        </div>
      )}
    </div>
    </>
  );
};
