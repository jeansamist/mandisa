"use client";

import { useState, useTransition } from "react";
import type { DeliveryMethodRow, PaymentMethodRow } from "@/lib/ms-types";
import {
  deliveryMethodLabels,
  paymentMethodLabels,
} from "@/components/ms/format";
import { Badge } from "@/components/ms/ui";
import { Feedback } from "../products/_shared/feedback";
import {
  createDeliveryMethod,
  updateDeliveryMethod,
  updatePaymentMethod,
  type DeliveryMethodInput,
} from "./actions";

type FeedbackState = { ok: boolean; message: string } | null;

/** Fee input with an "on quote" switch (null fee = quoted on WhatsApp before payment). */
function FeeField({
  label,
  fee,
  onQuote,
  onFee,
  onQuoteChange,
}: {
  label: string;
  fee: string;
  onQuote: boolean;
  onFee: (v: string) => void;
  onQuoteChange: (v: boolean) => void;
}) {
  return (
    <div className="grid gap-1">
      <input
        aria-label={`Frais (FCFA) ${label}`}
        className="ms-input w-28"
        type="number"
        min={0}
        step={500}
        value={onQuote ? "" : fee}
        disabled={onQuote}
        onChange={(e) => onFee(e.target.value)}
        placeholder={onQuote ? "Sur devis" : "0"}
      />
      <label className="flex items-center gap-1 text-xs">
        <input
          type="checkbox"
          checked={onQuote}
          onChange={(e) => onQuoteChange(e.target.checked)}
        />
        Sur devis
      </label>
    </div>
  );
}

function toInput(state: {
  fee: string;
  onQuote: boolean;
  cod: boolean;
  address: boolean;
  active: boolean;
  position: string;
}): DeliveryMethodInput {
  return {
    feeXaf: state.onQuote ? null : Number(state.fee || 0),
    allowsCashOnDelivery: state.cod,
    requiresAddress: state.address,
    isActive: state.active,
    position: Number(state.position || 0),
  };
}

export function DeliveryMethodRowForm({
  method,
}: {
  method: DeliveryMethodRow;
}) {
  const label = deliveryMethodLabels[method.code] ?? method.code;
  const [state, setState] = useState({
    fee: String(method.feeXaf ?? 0),
    onQuote: method.feeXaf === null,
    cod: method.allowsCashOnDelivery,
    address: method.requiresAddress,
    active: method.isActive,
    position: String(method.position),
  });
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [pending, startTransition] = useTransition();

  const save = () => {
    setFeedback(null);
    startTransition(async () => {
      const result = await updateDeliveryMethod(method.code, toInput(state));
      setFeedback(
        result.ok
          ? { ok: true, message: "Enregistré." }
          : { ok: false, message: result.message },
      );
    });
  };

  return (
    <tr>
      <td>
        <p className="font-medium">{label}</p>
        <p className="font-mono text-xs text-ms-ink/50">{method.code}</p>
      </td>
      <td>
        <FeeField
          label={label}
          fee={state.fee}
          onQuote={state.onQuote}
          onFee={(fee) => setState({ ...state, fee })}
          onQuoteChange={(onQuote) => setState({ ...state, onQuote })}
        />
      </td>
      <td>
        <input
          aria-label={`Paiement à la livraison autorisé ${label}`}
          type="checkbox"
          checked={state.cod}
          onChange={(e) => setState({ ...state, cod: e.target.checked })}
        />
      </td>
      <td>
        <input
          aria-label={`Adresse requise ${label}`}
          type="checkbox"
          checked={state.address}
          onChange={(e) => setState({ ...state, address: e.target.checked })}
        />
      </td>
      <td>
        <input
          aria-label={`Actif ${label}`}
          type="checkbox"
          checked={state.active}
          onChange={(e) => setState({ ...state, active: e.target.checked })}
        />
      </td>
      <td>
        <input
          aria-label={`Position ${label}`}
          className="ms-input w-16"
          type="number"
          min={0}
          max={100}
          value={state.position}
          onChange={(e) => setState({ ...state, position: e.target.value })}
        />
      </td>
      <td>
        <div className="grid gap-1">
          <button
            type="button"
            className="ms-btn px-3 py-1.5 text-xs"
            onClick={save}
            disabled={pending}
          >
            {pending ? "…" : "Enregistrer"}
          </button>
          <Feedback state={feedback} />
        </div>
      </td>
    </tr>
  );
}

export function AddDeliveryMethodForm() {
  const [code, setCode] = useState("");
  const [state, setState] = useState({
    fee: "0",
    onQuote: false,
    cod: false,
    address: true,
    active: true,
    position: "10",
  });
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [pending, startTransition] = useTransition();

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setFeedback(null);
    startTransition(async () => {
      const result = await createDeliveryMethod({
        code: code.trim(),
        ...toInput(state),
      });
      setFeedback(
        result.ok
          ? { ok: true, message: "Mode de livraison ajouté." }
          : { ok: false, message: result.message },
      );
      if (result.ok) setCode("");
    });
  };

  return (
    <form
      onSubmit={submit}
      className="grid gap-3 border-t border-ms-ink/10 pt-4"
    >
      <h3 className="text-sm font-semibold">Ajouter un mode de livraison</h3>
      <div className="flex flex-wrap items-end gap-4">
        <label className="ms-label">
          Code
          <input
            className="ms-input w-44"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="yaounde_home"
            pattern="[a-z][a-z0-9_]{2,39}"
            required
          />
          <span className="text-xs font-normal text-ms-ink/50">
            minuscules et _ (ex. yaounde_home)
          </span>
        </label>
        <div className="ms-label">
          Frais (FCFA)
          <FeeField
            label="nouveau mode"
            fee={state.fee}
            onQuote={state.onQuote}
            onFee={(fee) => setState({ ...state, fee })}
            onQuoteChange={(onQuote) => setState({ ...state, onQuote })}
          />
        </div>
        <label className="flex items-center gap-2 pb-2 text-sm">
          <input
            type="checkbox"
            checked={state.cod}
            onChange={(e) => setState({ ...state, cod: e.target.checked })}
          />
          Paiement à la livraison
        </label>
        <label className="flex items-center gap-2 pb-2 text-sm">
          <input
            type="checkbox"
            checked={state.address}
            onChange={(e) => setState({ ...state, address: e.target.checked })}
          />
          Adresse requise
        </label>
        <label className="flex items-center gap-2 pb-2 text-sm">
          <input
            type="checkbox"
            checked={state.active}
            onChange={(e) => setState({ ...state, active: e.target.checked })}
          />
          Actif
        </label>
        <label className="ms-label">
          Position
          <input
            className="ms-input w-20"
            type="number"
            min={0}
            max={100}
            value={state.position}
            onChange={(e) => setState({ ...state, position: e.target.value })}
          />
        </label>
        <button className="ms-btn" disabled={pending}>
          {pending ? "Ajout…" : "Ajouter"}
        </button>
      </div>
      <Feedback state={feedback} />
      <p className="text-xs text-ms-ink/50">
        Le libellé affiché aux clientes est traduit sur le site : un nouveau
        code apparaît avec son code tant que sa traduction n&apos;est pas
        ajoutée.
      </p>
    </form>
  );
}

export function PaymentMethodRowForm({
  method,
  elgiopayConfigured,
}: {
  method: PaymentMethodRow;
  elgiopayConfigured: boolean;
}) {
  const label = paymentMethodLabels[method.code] ?? method.code;
  const [active, setActive] = useState(method.isActive);
  const [position, setPosition] = useState(String(method.position));
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [pending, startTransition] = useTransition();
  const hiddenByConfig = method.provider === "elgiopay" && !elgiopayConfigured;
  const phase3 = method.code === "card";

  const save = () => {
    setFeedback(null);
    startTransition(async () => {
      const result = await updatePaymentMethod(method.code, {
        isActive: active,
        position: Number(position || 0),
      });
      setFeedback(
        result.ok
          ? { ok: true, message: "Enregistré." }
          : { ok: false, message: result.message },
      );
    });
  };

  return (
    <tr>
      <td>
        <p className="font-medium">{label}</p>
        <p className="text-xs text-ms-ink/50">
          {method.provider === "elgiopay" ? "ElgioPay" : "Manuel"}
        </p>
      </td>
      <td>
        <input
          aria-label={`Actif ${label}`}
          type="checkbox"
          checked={active}
          onChange={(e) => setActive(e.target.checked)}
        />
      </td>
      <td>
        <input
          aria-label={`Position ${label}`}
          className="ms-input w-16"
          type="number"
          min={0}
          max={100}
          value={position}
          onChange={(e) => setPosition(e.target.value)}
        />
      </td>
      <td>
        {phase3 ? (
          <Badge>Prévu en phase 3</Badge>
        ) : hiddenByConfig ? (
          <Badge tone="warn">Masqué : clé ElgioPay absente</Badge>
        ) : method.isActive ? (
          <Badge tone="good">Proposé au paiement</Badge>
        ) : (
          <Badge>Désactivé</Badge>
        )}
      </td>
      <td>
        <div className="grid gap-1">
          <button
            type="button"
            className="ms-btn px-3 py-1.5 text-xs"
            onClick={save}
            disabled={pending}
          >
            {pending ? "…" : "Enregistrer"}
          </button>
          <Feedback state={feedback} />
        </div>
      </td>
    </tr>
  );
}
