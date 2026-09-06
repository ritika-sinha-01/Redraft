import { useEffect, useRef } from "react";

export function RichText({ value, onChange }: { value: string; onChange: (html: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value) {
      ref.current.innerHTML = value || "";
    }
  }, [value]);

  function cmd(command: string) {
    document.execCommand(command, false);
    onChange(ref.current?.innerHTML || "");
  }

  return (
    <div>
      <div className="rte-bar">
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => cmd("bold")}>
          B
        </button>
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => cmd("italic")}>
          I
        </button>
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => cmd("insertUnorderedList")}>
          •
        </button>
      </div>
      <div
        ref={ref}
        className="rte"
        contentEditable
        onInput={() => onChange(ref.current?.innerHTML || "")}
      />
    </div>
  );
}
