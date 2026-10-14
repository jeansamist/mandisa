// Inline success / error line under a form or a table row.
export function Feedback({
  state,
}: {
  state: { ok: boolean; message: string } | null;
}) {
  if (!state) return null;
  return (
    <p
      role={state.ok ? "status" : "alert"}
      className={`text-xs ${state.ok ? "text-ms-green" : "text-ms-error"}`}
    >
      {state.message}
    </p>
  );
}
