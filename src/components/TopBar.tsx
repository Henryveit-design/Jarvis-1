interface TopBarProps {
  speakReplies: boolean;
  handsFree: boolean;
  onToggleSpeak: () => void;
  onToggleHandsFree: () => void;
  onClearHistory: () => void;
  onToggleSidePanel: () => void;
  sidePanelOpen: boolean;
}

function ToggleChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`min-h-11 rounded-full border px-4 text-sm transition-colors motion-reduce:transition-none ${
        active
          ? "border-ocher bg-ocher/20 text-ocher-bright"
          : "border-slate-lighter text-paper/70 hover:border-ocher-dim"
      }`}
    >
      {label}
    </button>
  );
}

export default function TopBar({
  speakReplies,
  handsFree,
  onToggleSpeak,
  onToggleHandsFree,
  onClearHistory,
  onToggleSidePanel,
  sidePanelOpen,
}: TopBarProps) {
  return (
    <header
      className="flex flex-wrap items-center gap-2 border-b border-slate-lighter px-4 py-3"
      style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
    >
      <h1 className="mr-auto text-lg font-medium text-paper">Jarvis</h1>
      <ToggleChip label="Vorlesen" active={speakReplies} onClick={onToggleSpeak} />
      <ToggleChip label="Freihändig" active={handsFree} onClick={onToggleHandsFree} />
      <button
        type="button"
        onClick={onToggleSidePanel}
        aria-pressed={sidePanelOpen}
        className="min-h-11 rounded-full border border-slate-lighter px-4 text-sm text-paper/70 hover:border-ocher-dim md:hidden"
      >
        Aufgaben
      </button>
      <button
        type="button"
        onClick={onClearHistory}
        className="min-h-11 rounded-full border border-slate-lighter px-4 text-sm text-paper/70 hover:border-danger"
      >
        Verlauf löschen
      </button>
    </header>
  );
}
