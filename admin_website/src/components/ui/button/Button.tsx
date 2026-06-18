import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg";
  variant?: "primary" | "secondary" | "outline" | "success" | "error" | "warning" | "info";
}

const Button: React.FC<ButtonProps> = ({
  children,
  className = "",
  size = "md",
  variant = "primary",
  ...props
}) => {
  const sizeClasses = {
    sm: "px-4 py-2 text-sm",
    md: "px-6 py-3 text-base",
    lg: "px-8 py-4 text-lg",
  };

  const variantClasses = {
    primary: "bg-brand-500 text-white hover:bg-brand-600",
    secondary: "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-white/5 dark:text-white/90 dark:hover:bg-white/10",
    outline: "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03]",
    success: "bg-success-600 text-white hover:bg-success-700 dark:bg-success-500 dark:hover:bg-success-600",
    error: "bg-error-600 text-white hover:bg-error-700 dark:bg-error-500 dark:hover:bg-error-600",
    warning: "bg-warning-600 text-white hover:bg-warning-700 dark:bg-warning-500 dark:hover:bg-warning-600",
    info: "bg-blue-500 text-white hover:bg-blue-600",
  };

  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors shadow-theme-xs ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
