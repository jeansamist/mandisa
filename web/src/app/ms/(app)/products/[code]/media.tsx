"use client";

import { useState, useTransition } from "react";
import type { AdminMedia } from "@/lib/ms-types";
import { Badge, EmptyState } from "@/components/ms/ui";
import { addMedia, deleteMedia, updateMedia } from "../actions";
import { Feedback } from "../_shared/feedback";

type Feedback = { ok: boolean; message: string } | null;

function MediaItem({ media }: { media: AdminMedia }) {
  const [approved, setApproved] = useState(media.approved);
  const [position, setPosition] = useState(String(media.position));
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [pending, startTransition] = useTransition();

  const save = () =>
    startTransition(async () => {
      const result = await updateMedia(media.id, {
        approved,
        position: Number(position),
      });
      setFeedback(
        result.ok
          ? { ok: true, message: "Enregistré." }
          : { ok: false, message: result.message },
      );
    });

  const remove = () => {
    if (!window.confirm("Supprimer ce média ? Cette action est définitive."))
      return;
    startTransition(async () => {
      const result = await deleteMedia(media.id);
      if (!result.ok) setFeedback({ ok: false, message: result.message });
    });
  };

  return (
    <li className="grid gap-2 rounded-xl border border-ms-ink/10 p-3">
      {media.kind === "image" ? (
        <img
          src={media.url}
          alt=""
          className="aspect-square w-full rounded-lg object-cover"
        />
      ) : (
        <div className="grid aspect-square place-items-center rounded-lg bg-ms-sand text-sm">
          Vidéo
        </div>
      )}
      <div className="flex items-center justify-between gap-2">
        {media.approved ? (
          <Badge tone="good">Approuvé</Badge>
        ) : (
          <Badge tone="warn">Non approuvé</Badge>
        )}
        <a
          href={media.url}
          target="_blank"
          rel="noreferrer"
          className="text-xs text-ms-green hover:underline"
        >
          Ouvrir ↗
        </a>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={approved}
          onChange={(e) => setApproved(e.target.checked)}
        />
        Approuvé
      </label>
      <label className="ms-label">
        Position
        <input
          className="ms-input"
          type="number"
          min={0}
          max={100}
          value={position}
          onChange={(e) => setPosition(e.target.value)}
        />
      </label>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="ms-btn px-3 py-1.5 text-xs"
          onClick={save}
          disabled={pending}
        >
          Enregistrer
        </button>
        <button
          type="button"
          className="ms-btn ms-btn-outline px-3 py-1.5 text-xs text-ms-error"
          onClick={remove}
          disabled={pending}
        >
          Supprimer
        </button>
      </div>
      <Feedback state={feedback} />
    </li>
  );
}

/** Product photos and videos: approval, order, removal, and adding by URL. */
export default function MediaManager({
  code,
  media,
}: {
  code: string;
  media: AdminMedia[];
}) {
  const [url, setUrl] = useState("");
  const [kind, setKind] = useState<"image" | "video">("image");
  const [approved, setApproved] = useState(true);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [pending, startTransition] = useTransition();

  const add = (event: React.FormEvent) => {
    event.preventDefault();
    setFeedback(null);
    startTransition(async () => {
      const result = await addMedia(code, { url: url.trim(), kind, approved });
      setFeedback(
        result.ok
          ? { ok: true, message: "Média ajouté." }
          : { ok: false, message: result.message },
      );
      if (result.ok) setUrl("");
    });
  };

  return (
    <div className="grid gap-4">
      <p className="text-sm text-ms-ink/60">
        Seuls les médias <b>approuvés</b> sont affichés sur le site et montrés
        par l&apos;assistant IA. La position 0 est la photo principale.
      </p>
      {media.length === 0 ? (
        <EmptyState>Aucun média.</EmptyState>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {media.map((m) => (
            <MediaItem key={m.id} media={m} />
          ))}
        </ul>
      )}
      <form
        onSubmit={add}
        className="grid gap-3 border-t border-ms-ink/10 pt-4 sm:grid-cols-[1fr_auto_auto_auto] sm:items-end"
      >
        <label className="ms-label">
          URL du média
          <input
            className="ms-input"
            type="url"
            placeholder="https://…"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
          />
        </label>
        <label className="ms-label">
          Type
          <select
            className="ms-input"
            value={kind}
            onChange={(e) => setKind(e.target.value as "image" | "video")}
          >
            <option value="image">Photo</option>
            <option value="video">Vidéo</option>
          </select>
        </label>
        <label className="flex items-center gap-2 pb-2 text-sm">
          <input
            type="checkbox"
            checked={approved}
            onChange={(e) => setApproved(e.target.checked)}
          />
          Approuvé
        </label>
        <button className="ms-btn" disabled={pending}>
          {pending ? "Ajout…" : "Ajouter"}
        </button>
        <div className="sm:col-span-4">
          <Feedback state={feedback} />
        </div>
      </form>
    </div>
  );
}
