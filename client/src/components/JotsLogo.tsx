interface JotsLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

export function JotsLogo({ size = 'md', showText = true, className = '' }: JotsLogoProps) {
  const sizes = {
    sm: { container: 'h-8', text: 'text-lg' },
    md: { container: 'h-12', text: 'text-2xl' },
    lg: { container: 'h-16', text: 'text-3xl' }
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Your actual logo */}
      <img 
        src="/jots-logo.svg" 
        alt="Jonathan's Jots" 
        className={sizes[size].container}
      />
      
      {showText && (
        <span className={`font-bold text-[#2E4057] tracking-wide ${sizes[size].text}`}>
          Jonathan's Jots
        </span>
      )}
    </div>
  );
}

