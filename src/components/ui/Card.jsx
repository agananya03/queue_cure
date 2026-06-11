import React from 'react';

export const Card = ({
  children,
  padding = 'p-6', // Can be boolean (true/false) or a string specifying padding classes
  hoverable = false,
  className = '',
  onClick,
  ...props
}) => {
  // Resolve padding
  const paddingClass = typeof padding === 'boolean' 
    ? (padding ? 'p-6' : 'p-0')
    : padding;

  return (
    <div 
      onClick={onClick}
      className={`
        bg-white border border-slate-200 rounded-xl shadow-sm
        ${paddingClass}
        ${hoverable ? 'hover:-translate-y-0.5 hover:shadow-lg cursor-pointer' : ''}
        transition-all duration-300
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
};

export default Card;
