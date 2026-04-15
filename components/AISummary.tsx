import { Brain, Sparkles } from "lucide-react";

type AISummaryProps = {
  summary: string;
};

export default function AISummary({ summary }: AISummaryProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10">
          <Brain className="size-4 text-primary" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">AI Route Analysis</h3>
        <Sparkles className="size-3.5 text-primary" />
      </div>
      <p className="text-sm leading-relaxed text-muted-foreground">{summary}</p>
    </div>
  );
}
