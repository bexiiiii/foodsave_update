import React, { useEffect, useRef } from 'react';

interface DropdownProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
    className?: string;
}

const Dropdown: React.FC<DropdownProps> = ({ isOpen, onClose, children, className = '' }) => {
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div
            ref={dropdownRef}
            className={`absolute z-50 ${className}`}
            role="menu"
            aria-orientation="vertical"
            aria-labelledby="menu-button"
        >
            {children}
        </div>
    );
};

export default Dropdown; 