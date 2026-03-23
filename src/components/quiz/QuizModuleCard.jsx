import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileText, Loader2, ChevronRight } from 'lucide-react'

export function QuizModuleCard({ module, onLoadQuiz, isLoading }) {
  return (
    <Button
      variant="ghost"
      onClick={() => onLoadQuiz(module)}
      disabled={isLoading}
      aria-label={`Start quiz: ${module.title}`}
      className="w-full h-auto p-0 hover:bg-transparent min-h-[56px]"
    >
      <Card className="w-full cursor-pointer hover:border-primary transition-all active:scale-[0.98]">
        <CardContent className="p-3.5 sm:p-4 flex items-center gap-3 sm:gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-inner ${module.color} flex-shrink-0`}>
            {isLoading ? (
              <Loader2 className="w-6 h-6 text-white animate-spin" aria-hidden="true" />
            ) : (
              <FileText className="w-6 h-6 text-white" aria-hidden="true" />
            )}
          </div>
          <div className="flex-1 text-left min-w-0">
            <h3 className="font-bold text-[15px] truncate">{module.title}</h3>
            <p className="text-xs text-muted-foreground font-medium font-mono mt-0.5 truncate">{module.file}</p>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" aria-hidden="true" />
        </CardContent>
      </Card>
    </Button>
  )
}
