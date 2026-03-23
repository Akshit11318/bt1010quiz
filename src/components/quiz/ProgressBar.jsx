import { Progress } from "@/components/ui/progress"

export function ProgressBar({ current, total }) {
  const percent = ((current + 1) / total) * 100;

  return (
    <div className="w-full">
      <Progress
        value={percent}
        className="h-2.5"
        aria-label={`Question ${current + 1} of ${total}`}
        aria-valuenow={current + 1}
        aria-valuemin={1}
        aria-valuemax={total}
      />
    </div>
  )
}
