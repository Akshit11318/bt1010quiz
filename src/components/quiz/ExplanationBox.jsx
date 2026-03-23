import { Alert, AlertDescription } from "@/components/ui/alert"

export function ExplanationBox({ explanation }) {
  return (
    <Alert className="mt-6 animate-in fade-in slide-in-from-bottom-4 duration-500 border-blue-200 dark:border-blue-700 bg-blue-50/80 dark:bg-blue-900/30">
      <div>
        <h4 className="text-xs font-bold uppercase tracking-wider text-blue-800 dark:text-blue-300 mb-3">
          Explanation
        </h4>
        <AlertDescription>
          <p
            className="text-[15px] font-serif text-blue-900/80 dark:text-blue-200 leading-7 break-words"
            dangerouslySetInnerHTML={{ __html: explanation }}
          />
        </AlertDescription>
      </div>
    </Alert>
  )
}
