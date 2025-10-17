interface JotsLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

export function JotsLogo({ size = 'md', showText = true, className = '' }: JotsLogoProps) {
  const sizes = {
    sm: { container: 'w-8 h-8', text: 'text-lg' },
    md: { container: 'w-12 h-12', text: 'text-2xl' },
    lg: { container: 'w-16 h-16', text: 'text-3xl' }
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Tilted J Logo */}
      <div className={`${sizes[size].container} relative flex items-center justify-center`}>
        <svg viewBox="0 0 100 100" className="w-full h-full">
          {/* Circle element */}
          <circle
            cx="70"
            cy="30"
            r="18"
            fill="none"
            stroke="#2E4057"
            strokeWidth="3"
            opacity="0.3"
          />
          
          {/* Tilted J with 56-degree rotation */}
          <g transform="rotate(-56 50 50)">
            <path
              d="M 45 20 L 45 60 Q 45 75 35 75 Q 25 75 25 65"
              fill="none"
              stroke="#2E4057"
              strokeWidth="6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Dot on the J */}
            <circle
              cx="45"
              cy="10"
              r="4"
              fill="#D4772E"
            />
          </g>
        </svg>
      </div>
      
      {showText && (
        <div className="flex flex-col leading-tight">
          <span className={`font-bold text-[#2E4057] tracking-wide ${sizes[size].text}`}>
            Jonathan's Jots
          </span>
        </div>
      )}
    </div>
  );
}

