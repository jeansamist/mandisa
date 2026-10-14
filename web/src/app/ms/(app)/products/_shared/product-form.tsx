"use client";

import { useState, useTransition } from "react";
import { textureLabels } from "@/components/ms/format";
import { createProduct, updateProduct, type ProductInput } from "../actions";
import { Feedback } from "./feedback";

type Props =
  | { mode: "create"; initial?: undefined }
  | { mode: "edit"; initial: ProductInput & { code: string } };

/** Product details (name, texture, FR/EN descriptions, visibility). */
export default function ProductForm({ mode, initial }: Props) {
  const [code, setCode] = useState(initial?.code ?? "MDS-");
  const [values, setValues] = useState<ProductInput>({
    name: initial?.name ?? "",
    texture: initial?.texture ?? "afro",
    descriptionFr: initial?.descriptionFr ?? "",
    descriptionEn: initial?.descriptionEn ?? "",
    isActive: initial?.isActive ?? true,
  });
  const [feedback, setFeedback] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setFeedback(null);
    startTransition(async () => {
      const result =
        mode === "create"
          ? await createProduct({ ...values, code })
          : await updateProduct(initial.code, values);
      // A successful creation redirects; only errors and edits land here.
      setFeedback(
        result.ok
          ? { ok: true, message: "Produit enregistré." }
          : { ok: false, message: result.message },
      );
    });
  };

  return (
    <form onSubmit={submit} className="ms-card grid gap-4">
      <div className="grid gap-4 sm:grid-cols-3">
        {mode === "create" ? (
          <label className="ms-label">
            Code produit
            <input
              className="ms-input uppercase"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="MDS-W10"
              pattern="MDS-[A-Za-z0-9]{2,10}"
              required
            />
            <span className="text-xs font-normal text-ms-ink/50">
              Format MDS-W10, non modifiable ensuite.
            </span>
          </label>
        ) : (
          <div className="ms-label">
            Code produit
            <p className="py-2 font-mono text-sm">{initial.code}</p>
          </div>
        )}
        <label className="ms-label">
          Nom
          <input
            className="ms-input"
            value={values.name}
            onChange={(e) => setValues({ ...values, name: e.target.value })}
            maxLength={80}
            required
          />
        </label>
        <label className="ms-label">
          Texture
          <select
            className="ms-input"
            value={values.texture}
            onChange={(e) =>
              setValues({
                ...values,
                texture: e.target.value as ProductInput["texture"],
              })
            }
          >
            {Object.entries(textureLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="ms-label">
          Description (français)
          <textarea
            className="ms-input min-h-28"
            value={values.descriptionFr}
            onChange={(e) =>
              setValues({ ...values, descriptionFr: e.target.value })
            }
            maxLength={4000}
            required
          />
        </label>
        <label className="ms-label">
          Description (anglais)
          <textarea
            className="ms-input min-h-28"
            value={values.descriptionEn}
            onChange={(e) =>
              setValues({ ...values, descriptionEn: e.target.value })
            }
            maxLength={4000}
            required
          />
        </label>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={values.isActive}
          onChange={(e) => setValues({ ...values, isActive: e.target.checked })}
        />
        Visible sur le site
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <button className="ms-btn" disabled={pending}>
          {pending
            ? "Enregistrement…"
            : mode === "create"
              ? "Créer le produit"
              : "Enregistrer"}
        </button>
        <Feedback state={feedback} />
      </div>
    </form>
  );
}
