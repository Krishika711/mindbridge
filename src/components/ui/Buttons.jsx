export function PrimaryButton({ children, className = '', ...props }) {
  return (
    <button
      className={`w-full font-medium text-[15px] px-[18px] py-[14px] rounded-full border border-transparent cursor-pointer transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] ${className}`}
      style={{ background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)', boxShadow: '0 8px 24px -8px rgba(0,0,0,0.35)', fontFamily: 'var(--font-body)' }}
      {...props}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({ children, className = '', ...props }) {
  return (
    <button
      className={`w-full font-medium text-[15px] px-[18px] py-[14px] rounded-full cursor-pointer backdrop-blur-md transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] ${className}`}
      style={{ background: 'var(--card-bg)', color: 'var(--text)', border: '1px solid var(--card-border)', fontFamily: 'var(--font-body)' }}
      {...props}
    >
      {children}
    </button>
  );
}

export function LinkButton({ children, className = '', ...props }) {
  return (
    <button
      className={`bg-transparent border-none cursor-pointer text-[13.5px] underline underline-offset-4 p-1 ${className}`}
      style={{ color: 'var(--text-soft)', fontFamily: 'var(--font-body)' }}
      {...props}
    >
      {children}
    </button>
  );
}

export function OAuthButton({ children, icon, ...props }) {
  return (
    <button
      className="flex-1 flex items-center justify-center gap-2 rounded-full px-4 py-[13px] text-[13.5px] cursor-pointer backdrop-blur-md transition-transform duration-200 hover:-translate-y-0.5"
      style={{ background: 'var(--card-bg)', color: 'var(--text)', border: '1px solid var(--card-border)', fontFamily: 'var(--font-body)' }}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}

export function IconCircleButton({ children, className = '', ...props }) {
  return (
    <button
      className={`w-9 h-9 rounded-full flex items-center justify-center cursor-pointer backdrop-blur-md transition-transform duration-200 hover:-translate-y-0.5 ${className}`}
      style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', color: 'var(--text)' }}
      {...props}
    >
      {children}
    </button>
  );
}
