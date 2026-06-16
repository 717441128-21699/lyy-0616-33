function getColor(progress: number): string {
  if (progress > 66) return '#10b981';
  if (progress > 33) return '#f59e0b';
  return '#ef4444';
}

interface ProgressBarProps {
  progress: number;
  color?: string;
  height?: number;
  showLabel?: boolean;
}

export default function ProgressBar({ progress, color, height = 8, showLabel = true }: ProgressBarProps) {
  const barColor = color || getColor(progress);

  return (
    <div className="flex items-center gap-3 w-full">
      <div className="flex-1 rounded-full bg-gray-200" style={{ height }}>
        <div
          className="rounded-full transition-all duration-500 ease-out"
          style={{ width: `${Math.min(100, Math.max(0, progress))}%`, height, backgroundColor: barColor }}
        />
      </div>
      {showLabel && (
        <span className="text-sm font-medium text-gray-600 w-10 text-right">{Math.round(progress)}%</span>
      )}
    </div>
  );
}
