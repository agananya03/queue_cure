import React from 'react';

export const Badge = ({ 
  children, 
  variant = 'neutral', // success, warning, danger, info, neutral
  size = 'md',        // sm, md
  pulse = false,
  className = ''
}) => {
  
  // Variant styling
  const variantStyles = {
    success: 'bg-[#00A86B]/10 text-[#00A86B] border-[#00A86B]/20',
    warning: 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/20',
    danger: 'bg-[#DC2626]/10 text-[#DC2626] border-[#DC2626]/20',
    info: 'bg-[#0066CC]/10 text-[#0066CC] border-[#0066CC]/20',
    neutral: 'bg-slate-100 text-slate-600 border-slate-200'
  };

  // Dot color styling
  const dotStyles = {
    success: 'bg-[#00A86B]',
    warning: 'bg-[#F59E0B]',
    danger: 'bg-[#DC2626]',
    info: 'bg-[#0066CC]',
    neutral: 'bg-slate-400'
  };

  // Size styling
  const sizeStyles = {
    sm: 'px-2 py-0.5 text-[10px]',
    md: 'px-2.5 py-1 text-xs'
  };

  return (
    <span className={`inline-flex items-center gap-1.5 font-bold uppercase tracking-wider rounded-full border ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}>
      <span className={`relative flex h-1.5 w-1.5 shrink-0 rounded-full ${dotStyles[variant]}`}>
        {pulse && (
          <span className={`absolute inline-flex h-full w-full rounded-full animate-ping opacity-75 ${dotStyles[variant]}`}></span>
        )}
      </span>
      {children}
    </span>
  );
};

export default Badge;
