import { useState, useRef, useEffect } from 'react';
import { ZoomIn, ZoomOut, Maximize, X } from 'lucide-react';
import { Button } from './ui/button';

interface ZoomableImageViewerProps {
  src: string;
  alt: string;
}

export const ZoomableImageViewer = ({ src, alt }: ZoomableImageViewerProps) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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
    if (scale > 1) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && scale > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY * -0.001;
    setScale(prev => Math.max(0.5, Math.min(5, prev + delta)));
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
      const dist = getTouchDistance(e.touches);
      const center = getTouchCenter(e.touches);
      setTouchStart({ dist, center });
    } else if (e.touches.length === 1 && scale > 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y,
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && touchStart) {
      const dist = getTouchDistance(e.touches);
      const scaleDelta = dist / touchStart.dist;
      setScale(prev => Math.max(0.5, Math.min(5, prev * scaleDelta)));
      setTouchStart({ dist, center: getTouchCenter(e.touches) });
    } else if (e.touches.length === 1 && isDragging && scale > 1) {
      setPosition({
        x: e.touches[0].clientX - dragStart.x,
        y: e.touches[0].clientY - dragStart.y,
      });
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    setTouchStart(null);
  };

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

  const handleFullscreen = () => {
    setIsFullscreen(true);
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleCloseFullscreen = () => {
    setIsFullscreen(false);
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-[100] bg-black">
        {/* Close Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleCloseFullscreen}
          className="absolute top-4 right-4 z-10 text-white hover:bg-white/20"
          title="Exit Fullscreen"
        >
          <X className="h-6 w-6" />
        </Button>

        {/* Zoom Controls - Mobile Only */}
        {isMobile && (
          <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
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

        {/* Image Container */}
        <div
          ref={containerRef}
          className="w-full h-full overflow-hidden flex items-center justify-center cursor-move"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <img
            src={src}
            alt={alt}
            className="w-full h-full object-contain select-none"
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              transformOrigin: 'center center',
              transition: isDragging ? 'none' : 'transform 0.1s ease-out',
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
    );
  }

  return (
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
        className="w-full h-full overflow-hidden flex items-center justify-center cursor-move"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <img
          src={src}
          alt={alt}
          className="max-w-full max-h-full object-contain select-none"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transformOrigin: 'center center',
            transition: isDragging ? 'none' : 'transform 0.1s ease-out',
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
  );
};
