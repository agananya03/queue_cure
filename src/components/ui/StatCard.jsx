import React, { useState, useEffect } from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

// Shared count-up animation logic
function useCountUp(target, duration = 600) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = count;
    const end = Number(target) || 0;
    if (start === end) return;

    const startTime = performance.now();
    let frameId;

    const update = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = progress * (2 - progress); // Ease-out quad
      const current = Math.floor(start + (end - start) * ease);
      setCount(current);

      if (progress < 1) {
        frameId = requestAnimationFrame(update);
      }
    };

    frameId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frameId);
  }, [target]);

  return count;
}

export const StatCard = ({ 
  icon: Icon, 
  label, 
  value, 
  trend, // { type: 'up' | 'down', value: '12%' }
  color = '#0066CC', // Primary medical blue
  className = ''
}) => {
  const animatedValue = useCountUp(value);

  // Custom inline styles for border accent
  const cardStyle = {
    borderLeftWidth: '4px',
    borderLeftColor: color
  };

  return (
    <div 
      style={cardStyle}
      className={`bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center justify-between hover:shadow-md transition-all duration-300 ${className}`}
    >
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 truncate">{label}</p>
        
        <div className="flex items-baseline gap-2">
          <h3 className="text-3xl font-black text-slate-800 font-mono tracking-tight leading-none">
            {animatedValue}
          </h3>
          
          {trend && (
            <span className={`inline-flex items-center text-xs font-bold gap-0.5 ${
              trend.type === 'up' ? 'text-[#00A86B]' : 'text-[#DC2626]'
            }`}>
              {trend.type === 'up' ? (
                <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />
              ) : (
                <ArrowDownRight className="w-3.5 h-3.5 shrink-0" />
              )}
              {trend.value}
            </span>
          )}
        </div>
      </div>

      {Icon && (
        <div 
          style={{ backgroundColor: `${color}12`, color: color }}
          className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ml-4 transition-colors"
        >
          <Icon className="w-5.5 h-5.5" />
        </div>
      )}
    </div>
  );
};

export default StatCard;
