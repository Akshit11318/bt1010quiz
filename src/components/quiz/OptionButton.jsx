import { Button } from "@/components/ui/button"
import { CheckCircle2, XCircle } from 'lucide-react'
import { cn } from "@/lib/utils"

export function OptionButton({
  option,
  index,
  isCorrect,
  isSelected,
  isAnswered,
  onSelect
}) {
  let btnClass = !isAnswered
    ? "hover:border-primary hover:shadow-lg hover:scale-[1.01]"
    : "";

  let icon = null;
  let badgeClass = "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300";

  if (isAnswered) {
    if (isCorrect) {
      btnClass = "bg-green-50 border-green-500 text-green-900 ring-1 ring-green-500 dark:bg-green-900/40 dark:border-green-500 dark:text-green-100";
      badgeClass = "bg-green-200 text-green-800 dark:bg-green-800 dark:text-green-200";
      icon = <CheckCircle2 className="w-5 h-5 text-green-600 ml-auto flex-shrink-0" aria-label="Correct answer" />;
    } else if (isSelected) {
      btnClass = "bg-red-50 border-red-500 text-red-900 ring-1 ring-red-500 dark:bg-red-900/40 dark:border-red-500 dark:text-red-100";
      badgeClass = "bg-red-200 text-red-800 dark:bg-red-800 dark:text-red-200";
      icon = <XCircle className="w-5 h-5 text-red-600 ml-auto flex-shrink-0" aria-label="Incorrect answer" />;
    } else {
      btnClass = "opacity-60";
    }
  }

  return (
    <Button
      variant="outline"
      disabled={isAnswered}
      onClick={() => onSelect(index)}
      aria-label={`Option ${String.fromCharCode(65 + index)}: ${option}`}
      aria-pressed={isSelected}
      data-option-index={index}
      className={cn(
        "w-full h-auto text-left p-4 sm:p-5 rounded-2xl border-2 transition-all duration-300 flex items-center gap-3 sm:gap-4 shadow-sm min-h-[64px]",
        btnClass
      )}
    >
      <div className={cn(
        "flex items-center justify-center flex-shrink-0 w-11 h-11 rounded-full text-sm font-bold",
        badgeClass
      )}>
        {String.fromCharCode(65 + index)}
      </div>
      <span
        className="font-medium text-[16px] leading-7 flex-1 text-left break-words overflow-wrap-anywhere py-1"
        dangerouslySetInnerHTML={{ __html: option }}
      />
      {icon}
    </Button>
  )
}
