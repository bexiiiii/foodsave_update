import React, { forwardRef } from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  className?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={`w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-normal text-gray-700 shadow-theme-xs outline-none transition-all placeholder:text-gray-400 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white/90 dark:placeholder:text-gray-500 dark:focus:border-brand-500 dark:focus:ring-brand-500 ${className}`}
        {...props}
      />
    );
  }
);

Input.displayName = "Ввод";

export default Input;
