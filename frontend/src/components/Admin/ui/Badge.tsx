import React from 'react';

export const Badge = ({ children, variant = 'default', className = '' }: any) => {
  const variants = {
    default: "bg-gray-100 text-gray-900",
    success: "bg-green-100 text-green-800",
    warning: "bg-amber-100 text-amber-800",
    danger: "bg-red-100 text-red-800",
    outline: "border border-gray-200 text-gray-900"
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${variants[variant as keyof typeof variants]} ${className}`}>
      {children}
    </span>
  );
};