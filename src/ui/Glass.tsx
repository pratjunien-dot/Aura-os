import { motion, MotionProps } from 'framer-motion';
import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

type GlassLevel = 'l1' | 'l2' | 'l3' | 'l4';

interface GlassProps extends MotionProps {
  level?: GlassLevel;
  active?: boolean;
  elevated?: boolean;
  shimmer?: boolean;
  activeBorder?: boolean;
  className?: string;
  children?: React.ReactNode;
  as?: keyof typeof motion;
}

export const Glass = forwardRef<HTMLDivElement, GlassProps>(
  ({ level = 'l2', active, elevated, shimmer, activeBorder, className, children, ...props }, ref) => {
    const content = (
      <motion.div
        ref={ref}
        className={cn(
          'glass',
          elevated && 'glass--elevated',
          active && 'glass--active',
          shimmer && 'glass-shimmer',
          className
        )}
        style={{ 
          '--glass-bg': `var(--glass-bg-${level})`,
          '--glass-blur': `var(--glass-blur-${level})`
        } as React.CSSProperties}
        {...props}
      >
        {children}
      </motion.div>
    );

    if (activeBorder) {
      return (
        <div className="glass-active-border">
          {content}
        </div>
      );
    }

    return content;
  }
);
