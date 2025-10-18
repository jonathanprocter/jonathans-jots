import { JotsLogo } from './JotsLogo';

interface GeneratingLoaderProps {
  stage?: string;
}

export function GeneratingLoader({ stage = 'Generating your summary...' }: GeneratingLoaderProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      {/* Animated logo */}
      <div className="relative mb-8">
        <div className="absolute inset-0 animate-pulse">
          <div className="w-32 h-32 rounded-full bg-gradient-to-br from-[#2E4057]/20 to-[#D4772E]/20"></div>
        </div>
        <div className="relative z-10 flex items-center justify-center w-32 h-32">
          <JotsLogo variant="icon" size="xl" />
        </div>
      </div>

      {/* Status text */}
      <h3 className="text-2xl font-bold text-[#2E4057] mb-3">
        {stage}
      </h3>
      
      {/* Progress indicators */}
      <div className="space-y-2 text-center max-w-md">
        <p className="text-sm text-gray-600">
          Researching 5-10 related books and sources
        </p>
        <p className="text-sm text-gray-600">
          Adding comparative analysis and expert insights
        </p>
        <p className="text-sm text-gray-600">
          Formatting with professional styling
        </p>
      </div>

      {/* Animated progress bar */}
      <div className="w-64 h-1 bg-gray-200 rounded-full mt-8 overflow-hidden">
        <div className="h-full bg-gradient-to-r from-[#2E4057] to-[#D4772E] animate-[shimmer_2s_ease-in-out_infinite]"></div>
      </div>

      <p className="text-xs text-gray-500 mt-4">
        This typically takes 2-5 minutes
      </p>
    </div>
  );
}

