import { useEffect, useState } from 'react';

interface SwipeOptions {
  threshold?: number;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
}

export function useSwipeGesture({ 
  threshold = 50, 
  onSwipeLeft, 
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  targetRef
}: SwipeOptions & { targetRef?: React.RefObject<HTMLElement> }) {
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [touchEnd, setTouchEnd] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const element = targetRef?.current || document;

    const handleTouchStart = (e: TouchEvent) => {
      setTouchEnd(null);
      setTouchStart({
        x: e.targetTouches[0].clientX,
        y: e.targetTouches[0].clientY
      });
    };

    const handleTouchMove = (e: TouchEvent) => {
      setTouchEnd({
        x: e.targetTouches[0].clientX,
        y: e.targetTouches[0].clientY
      });
    };

    const handleTouchEnd = () => {
      if (!touchStart || !touchEnd) return;
      
      const distanceX = touchStart.x - touchEnd.x;
      const distanceY = touchStart.y - touchEnd.y;
      
      const isHorizontal = Math.abs(distanceX) > Math.abs(distanceY);
      
      if (isHorizontal) {
        if (Math.abs(distanceX) > threshold) {
          if (distanceX > 0 && onSwipeLeft) onSwipeLeft();
          if (distanceX < 0 && onSwipeRight) onSwipeRight();
        }
      } else {
        // Vertical swipe: higher threshold to avoid conflict with scrolling
        if (Math.abs(distanceY) > threshold * 1.5) {
          if (distanceY > 0 && onSwipeUp) onSwipeUp();
          if (distanceY < 0 && onSwipeDown) onSwipeDown();
        }
      }
    };

    element.addEventListener('touchstart', handleTouchStart as any);
    element.addEventListener('touchmove', handleTouchMove as any);
    element.addEventListener('touchend', handleTouchEnd as any);

    return () => {
      element.removeEventListener('touchstart', handleTouchStart as any);
      element.removeEventListener('touchmove', handleTouchMove as any);
      element.removeEventListener('touchend', handleTouchEnd as any);
    };
  }, [touchStart, touchEnd, threshold, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, targetRef]);
}
