import React from 'react';

export const TokenBadge = ({ 
  token, 
  variant = 'waiting', // waiting, current, called, done
  size = 'md',         // sm, md, lg, xl
  className = '' 
}) => {
  
  // Variant base styles
  const variantStyles = {
    waiting: 'bg-slate-50 text-slate-500 border-slate-200',
    current: 'bg-[#00A86B]/10 text-[#00A86B] border-[#00A86B]/30 animate-pulse-slow',
    called: 'bg-[#0066CC]/10 text-[#0066CC] border-[#0066CC]/30',
    done: 'bg-slate-100/55 text-slate-400 border-slate-200/40 line-through'
  };

  // Size base styles
  const sizeStyles = {
    sm: 'text-xs px-2 py-0.5 rounded-md font-bold font-mono',
    md: 'text-sm px-3 py-1 rounded-lg font-bold font-mono',
    lg: 'text-lg px-4.5 py-2 rounded-xl font-extrabold font-mono border-2',
    xl: 'text-3xl px-6 py-3 rounded-2xl font-black font-mono border-2'
  };

  // Glow shadow configurations on lg/xl sizes
  const glowStyles = () => {
    if (size !== 'lg' && size !== 'xl') return '';
    
    switch (variant) {
      case 'current':
        return 'shadow-lg shadow-[#00A86B]/15';
      case 'called':
        return 'shadow-lg shadow-[#0066CC]/15';
      case 'waiting':
        return 'shadow-md shadow-slate-200/50';
      case 'done':
      default:
        return '';
    }
  };

  return (
    <span className={`inline-flex items-center justify-center border font-mono tracking-wide ${variantStyles[variant]} ${sizeStyles[size]} ${glowStyles()} ${className}`}>
      {token}
    </span>
  );
};

export default TokenBadge;
