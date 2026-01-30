import { FutureLitePayload } from "../../../../data/presentation";

type Props = {
  cards: FutureLitePayload["cards"];
  activeId: "opt" | "dda" | "gen" | null;
  beatIndex: number;
};

export default function FutureCards({ cards, activeId, beatIndex }: Props) {
  return (
    <div className="space-y-3">
      {cards.map((card) => {
        const isActive = activeId === card.id;
        const dimmed = activeId !== null && !isActive;
        const muted = beatIndex === 0;
        return (
          <div
            key={card.id}
            className={`rounded-2xl border px-4 py-3 bg-white/5 backdrop-blur-md transition-all duration-300 ease-out
              ${isActive ? "border-accent shadow-[0_0_30px_rgba(124,231,190,0.25)] translate-y-[-2px]" : "border-white/10"}
              ${dimmed ? "opacity-70" : "opacity-100"}
              ${muted ? "opacity-80" : ""} hover:border-white/30 hover:-translate-y-0.5`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-semibold text-white">{card.title}</div>
              <div
                className={`h-2 w-2 rounded-full ${isActive ? "bg-accent shadow-[0_0_12px_rgba(124,231,190,0.8)]" : "bg-white/30"}`}
              />
            </div>
            <ul className="space-y-1.5 text-[13px] text-slate-200">
              {card.bullets.map((line) => (
                <li key={line} className="flex items-start gap-2">
                  <span className="mt-[6px] h-1.5 w-1.5 rounded-full bg-white/40" />
                  <span className="leading-snug">{line}</span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
