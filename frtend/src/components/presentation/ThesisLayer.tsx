import { ThesisState } from "./useThesisDirector";

type Props = { thesis: ThesisState };

const emphasizeText = (text: string, emphasize?: string[]) => {
  if (!emphasize || emphasize.length === 0) return text;
  return text.split(" ").map((word) => {
    const match = emphasize.find((e) => e.toLowerCase() === word.toLowerCase());
    return match ? `<span class="thesis-em">${word}</span>` : word;
  }).join(" ");
};

export default function ThesisLayer({ thesis }: Props) {
  const headlineHtml = emphasizeText(thesis.headline, thesis.emphasize);
  return (
    <div className={`thesis-layer thesis-${thesis.mode} ${thesis.effect ?? "glow"} ${thesis.punching ? "punching" : ""}`}>
      <div className="thesis-echo">
        <div className="thesis-echo-line">{thesis.chapterTag ?? "Difficulty"}</div>
        <div className="thesis-echo-text">{thesis.subline ?? "Budget ladder"}</div>
      </div>
      {thesis.mode !== "echo" && (
        <div className="thesis-hero">
          <div className="thesis-headline" dangerouslySetInnerHTML={{ __html: headlineHtml }} />
          {thesis.subline && <div className="thesis-subline">{thesis.subline}</div>}
        </div>
      )}
    </div>
  );
}
