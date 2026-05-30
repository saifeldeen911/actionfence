import React, { useRef, useEffect, CSSProperties } from 'react';

interface MagnetLinesProps {
  rows?: number;
  columns?: number;
  containerSize?: string;
  lineColor?: string;
  lineWidth?: string;
  lineHeight?: string;
  baseAngle?: number;
  className?: string;
  style?: CSSProperties;
}

const MagnetLines: React.FC<MagnetLinesProps> = ({
  rows = 9,
  columns = 9,
  containerSize = '100%',
  lineColor = 'rgba(63, 63, 70, 0.4)', // Subtle zinc-700 with opacity
  lineWidth = '2px',
  lineHeight = '28px',
  baseAngle = -10,
  className = '',
  style = {}
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const items = container.querySelectorAll<HTMLSpanElement>('span');

    const onPointerMove = (pointer: { x: number; y: number }) => {
      items.forEach(item => {
        const rect = item.getBoundingClientRect();
        const centerX = rect.x + rect.width / 2;
        const centerY = rect.y + rect.height / 2;

        const b = pointer.x - centerX;
        const a = pointer.y - centerY;
        const c = Math.sqrt(a * a + b * b) || 1;
        const r =
          ((Math.acos(b / c) * 180) / Math.PI) *
          (pointer.y > centerY ? 1 : -1);

        item.style.setProperty('--rotate', `${r}deg`);
      });
    };

    const handlePointerMove = (e: PointerEvent) => {
      onPointerMove({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('pointermove', handlePointerMove);

    // Initial orientation target pointing towards center item
    if (items.length) {
      const middleIndex = Math.floor(items.length / 2);
      const rect = items[middleIndex].getBoundingClientRect();
      onPointerMove({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
    }

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
    };
  }, [rows, columns]);

  const total = rows * columns;
  const spans = Array.from({ length: total }, (_, i) => (
    <span
      key={i}
      className="block origin-center transition-transform duration-300 ease-out"
      style={{
        backgroundColor: lineColor,
        width: lineWidth,
        height: lineHeight,
        // @ts-expect-error - Custom CSS variables are valid in React 18+ but types might complain
        '--rotate': `${baseAngle}deg`,
        transform: 'rotate(var(--rotate))',
        willChange: 'transform'
      }}
    />
  ));

  return (
    <div
      ref={containerRef}
      className={`grid place-items-center ${className}`}
      style={{
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gridTemplateRows: `repeat(${rows}, 1fr)`,
        width: containerSize,
        height: containerSize,
        ...style
      }}
    >
      {spans}
    </div>
  );
};

export default MagnetLines;
