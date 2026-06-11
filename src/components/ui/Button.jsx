import React from 'react';

export const Button = ({
  children,
  variant = 'primary', // primary, success, danger, ghost, outline
  size = 'md',        // sm, md, lg
  loading = false,
  disabled = false,
  icon: Icon,
  onClick,
  className = '',
  type = 'button',
  ...props
}) => {

  // Variant classes
  const variantClasses = {
    primary: 'bg-[#0066CC] hover:bg-[#004C99] text-white border-transparent shadow-sm hover:shadow-md',
    success: 'bg-[#00A86B] hover:bg-[#008f5a] text-white border-transparent shadow-sm hover:shadow-md',
    danger: 'bg-[#DC2626] hover:bg-[#b91c1c] text-white border-transparent shadow-sm hover:shadow-md',
    outline: 'bg-transparent hover:bg-slate-50 text-slate-700 border-slate-300 hover:border-slate-400',
    ghost: 'bg-transparent hover:bg-slate-100 text-slate-700 border-transparent'
  };

  // Size classes
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs rounded-lg font-semibold gap-1',
    md: 'px-4 py-2 text-sm rounded-xl font-bold gap-2',
    lg: 'px-5 py-2.5 text-base rounded-xl font-bold gap-2'
  };

  // Disabled or loading block
  const isInteractionDisabled = disabled || loading;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isInteractionDisabled}
      className={`
        inline-flex items-center justify-center border select-none transition-all duration-200 ripple-btn
        ${variantClasses[variant]} 
        ${sizeClasses[size]}
        ${isInteractionDisabled ? 'opacity-50 cursor-not-allowed transform-none hover:transform-none hover:shadow-none' : 'hover:-translate-y-[1px] active:translate-y-0'} 
        ${className}
      `}
      {...props}
    >
      {/* Loading Spinner */}
      {loading ? (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current shrink-0" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      ) : Icon ? (
        <Icon className="w-4 h-4 shrink-0" />
      ) : null}

      {children}
    </button>
  );
};

export default Button;
