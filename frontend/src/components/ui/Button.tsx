import React from 'react';
import { motion } from 'framer-motion';
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  children: React.ReactNode;
}
export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles =
  'inline-flex items-center justify-center gap-1.5 font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap';
  const variants = {
    primary: 'bg-primary text-white hover:bg-primary/90 shadow-glass',
    secondary: 'bg-secondary text-white hover:bg-secondary/90 shadow-glass',
    outline:
    'bg-white/70 backdrop-blur-xl border border-white/60 text-secondary hover:bg-white/90',
    ghost: 'bg-transparent text-secondary hover:bg-white/50'
  };
  const sizes = {
    sm: 'px-3 py-1.5 text-xs rounded-lg',
    md: 'px-4 py-2 text-xs rounded-xl',
    lg: 'px-6 py-3 text-sm rounded-2xl'
  };
  return (
    <motion.button
      whileHover={loading ? {} : {
        scale: 1.02
      }}
      whileTap={loading ? {} : {
        scale: 0.98
      }}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      {...props}>
      
      {loading ? (
        <div className="flex items-center justify-center">
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        children
      )}
    </motion.button>);

}