interface ButtonProps {
    children: React.ReactNode;
    variant?: 'primary' | 'outline' | 'success' | 'ghost';
    className?: string;
    disabled?: boolean;
    onClick?: () => void;
}

const Button = ({
    children,
    variant = 'primary',
    className = '',
    disabled,
    onClick,
}: ButtonProps) => {
    const variants = {
        primary: 'bg-[#001f3f] text-white hover:bg-[#001429]',
        outline: 'border-2 border-[#001f3f] text-[#001f3f] hover:bg-slate-50',
        success: 'bg-emerald-700 text-white hover:bg-emerald-800',
        ghost: 'text-slate-400 hover:text-red-600 hover:bg-red-50',
    };
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`inline-flex items-center justify-center rounded-md px-4 py-2 font-bold transition-all disabled:opacity-30 ${variants[variant as keyof typeof variants]} ${className}`}
        >
            {children}
        </button>
    );
};

export { Button };
