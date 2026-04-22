import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

type Props = {
  seasons: number[];
  value: number;
  onChange: (year: number) => void;
  closedYears: Set<number>;
};

/**
 * Tabs de temporada com indicador discreto de status:
 * - Em andamento: leve sombreado/anel verde
 * - Encerrada: leve sombreado/anel vermelho
 */
export default function SeasonTabs({ seasons, value, onChange, closedYears }: Props) {
  return (
    <Tabs value={String(value)} onValueChange={(v) => onChange(Number(v))}>
      <TabsList className="bg-secondary">
        {seasons.map((s) => {
          const closed = closedYears.has(s);
          return (
            <TabsTrigger
              key={s}
              value={String(s)}
              className={cn(
                "relative transition-shadow",
                closed
                  ? "data-[state=active]:shadow-[inset_0_0_0_1px_hsl(0_70%_50%/0.55)] data-[state=inactive]:shadow-[inset_0_0_0_1px_hsl(0_70%_50%/0.3)] bg-destructive/5"
                  : "data-[state=active]:shadow-[inset_0_0_0_1px_hsl(142_70%_45%/0.55)] data-[state=inactive]:shadow-[inset_0_0_0_1px_hsl(142_70%_45%/0.3)] bg-success/5",
              )}
            >
              <span
                className={cn(
                  "mr-1.5 inline-block h-1.5 w-1.5 rounded-full",
                  closed ? "bg-destructive" : "bg-success",
                )}
                aria-hidden
              />
              Temporada {s}
            </TabsTrigger>
          );
        })}
      </TabsList>
    </Tabs>
  );
}
