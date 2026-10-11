const VARIANTS = {
  primary: 'bg-blood-700 text-white hover:bg-blood-800 active:bg-blood-900',
  ghost: 'bg-white text-blood-700 border border-blood-700/30 hover:bg-blood-50',
  outlineOnDark: 'bg-transparent text-white border border-white/50 hover:bg-white/10',
  subtle: 'bg-paper text-ink border border-line hover:border-ink-soft',
};

export default function Button({
  as: Component = 'button',
  variant = 'primary',
  className = '',
  children,
  ...props
}) {
  return (
    <Component
      className={`inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTS[variant]} ${className}`}
      {...props}
    >
      {children}
    </Component>
  );
}
