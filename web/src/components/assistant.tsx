"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { productHref, type Product } from "@/lib/catalog";
import { useFormatPrice, useStatusLabel } from "@/lib/format";
import {
  getAssistantConfig,
  sendAssistantMessage,
  type AssistantPublicConfig,
} from "@/lib/assistant-actions";
import { trackEvent, visitorId } from "@/lib/tracker";
import { useCatalog } from "@/components/site-data-provider";
import { Icon } from "@/components/ui";
import { useShop } from "@/components/shop-provider";
import { ease, Reveal } from "@/components/motion";

function MiniProduct({
  product,
  children,
}: {
  product: Product;
  children?: React.ReactNode;
}) {
  const tCatalog = useTranslations("Catalog");
  const formatPrice = useFormatPrice();
  const statusLabel = useStatusLabel();
  return (
    <div className="mini-product">
      <img src={product.image ?? ""} alt={product.name} />
      <div>
        <span>
          {tCatalog(`textures.${product.texture}`)} · {statusLabel(product)}
        </span>
        <b>{product.name}</b>
        <small>{formatPrice(product.priceXaf)}</small>
        {children}
      </div>
    </div>
  );
}

export function ChatPreview() {
  const t = useTranslations("Assistant");
  const locale = useLocale();
  // Demo conversation from the design; the real assistant comes in phase 2.
  const featured = useCatalog().find("MDS-W01");
  return (
    <Reveal className="chat-preview" delay={0.15} y={40}>
      <div className="chat-head">
        <span>
          <Icon name="sparkle" />
        </span>
        <div>
          <b>{t("name")}</b>
          <small>{t("availability")}</small>
        </div>
        <i>{locale.toUpperCase()}</i>
      </div>
      <div className="bubble">{t("preview.greeting")}</div>
      <div className="bubble bubble--user">{t("preview.userMessage")}</div>
      {featured && <MiniProduct product={featured} />}
      <div className="fake-input">
        {t("inputPlaceholder")} <Icon name="send" />
      </div>
    </Reveal>
  );
}

const STORAGE_KEY = "mandisa.assistant";
const DEFAULT_WHATSAPP = "+237650911804";

type ChatMessage = {
  role: "user" | "assistant";
  text: string;
  products?: Product[];
  whatsapp?: string | null;
};

type SavedChat = { conversationId: string | null; messages: ChatMessage[] };

const whatsappUrl = (number: string) =>
  `https://wa.me/${number.replace(/\D/g, "")}`;

// The conversation is kept for the tab only (per-visitor convenience).
function loadChat(): SavedChat {
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? "null");
    if (saved && Array.isArray(saved.messages)) return saved as SavedChat;
  } catch {
    // Storage unavailable or corrupted: start fresh.
  }
  return { conversationId: null, messages: [] };
}

function saveChat(chat: SavedChat) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(chat));
  } catch {
    // Private mode: the conversation lives in memory only.
  }
}

const chipKeys = ["texture", "availability", "tracking", "care"] as const;

export default function Assistant() {
  const t = useTranslations("Assistant");
  const locale = useLocale();
  const router = useRouter();
  const { assistantOpen: open, setAssistantOpen: setOpen } = useShop();
  const [config, setConfig] = useState<AssistantPublicConfig | null>(null);
  const [chat, setChat] = useState<SavedChat>({
    conversationId: null,
    messages: [],
  });
  const [loaded, setLoaded] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Restore after hydration so server and client first render the same panel.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setChat(loadChat());
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) saveChat(chat);
  }, [chat, loaded]);

  useEffect(() => {
    if (!open || config) return;
    let cancelled = false;
    void getAssistantConfig().then((c) => {
      if (!cancelled) setConfig(c);
    });
    return () => {
      cancelled = true;
    };
  }, [open, config]);

  useEffect(() => {
    const body = bodyRef.current;
    if (body) body.scrollTop = body.scrollHeight;
  }, [chat.messages.length, sending, open]);

  const navTo = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  const send = async (text: string) => {
    const message = text.trim();
    if (!message || sending) return;
    setError(null);
    setDraft("");
    setSending(true);
    setChat((c) => ({
      ...c,
      messages: [...c.messages, { role: "user", text: message }],
    }));
    trackEvent("assistant_message", {
      newConversation: !chat.conversationId,
    });
    const result = await sendAssistantMessage({
      conversationId: chat.conversationId,
      visitorId: visitorId(),
      locale,
      message,
    });
    setSending(false);
    if (!result.ok) {
      if (result.error === "assistant_unavailable") {
        setConfig((c) => (c ? { ...c, available: false } : c));
      }
      setError(result.error);
      return;
    }
    const { data } = result;
    setChat((c) => ({
      conversationId: data.conversationId,
      messages: [
        ...c.messages,
        {
          role: "assistant",
          text: data.reply,
          products: data.products.slice(0, 3),
          whatsapp: data.handedOff ? (data.whatsapp ?? DEFAULT_WHATSAPP) : null,
        },
      ],
    }));
  };

  const reset = () => {
    setChat({ conversationId: null, messages: [] });
    setError(null);
  };

  const errorText =
    error === "rate_limited" || error === "conversation_limit"
      ? t("rateLimited")
      : error === "assistant_unavailable"
        ? t("unavailable")
        : error
          ? t("error")
          : null;

  const available = config?.available ?? true;
  const greeting =
    (locale === "en" ? config?.greeting.en : config?.greeting.fr) ||
    t("panel.greeting");

  return (
    <>
      <motion.button
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.95 }}
        id="assistant"
        className="assistant-button"
        onClick={() => setOpen(!open)}
      >
        <Icon name={open ? "close" : "message"} />
        <span>{open ? t("close") : t("open")}</span>
      </motion.button>
      <AnimatePresence>
        {open && (
          <motion.aside
            className="assistant-panel"
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.35, ease }}
            style={{ transformOrigin: "bottom right" }}
            aria-label={t("name")}
          >
            <div className="chat-head">
              <span>
                <Icon name="sparkle" />
              </span>
              <div>
                <b>{t("name")}</b>
                <small>
                  <i /> {t("availability")}
                </small>
              </div>
              <button aria-label={t("close")} onClick={() => setOpen(false)}>
                <Icon name="close" />
              </button>
            </div>
            <div className="chat-body" ref={bodyRef} aria-live="polite">
              {!config ? (
                <div className="bubble bubble--typing">{t("typing")}</div>
              ) : !available ? (
                <div className="bubble">{t("unavailable")}</div>
              ) : (
                <>
                  <div className="bubble">{greeting}</div>
                  {chat.messages.length === 0 && (
                    <div className="chat-chips">
                      {chipKeys.map((key) => (
                        <button
                          key={key}
                          onClick={() => void send(t(`panel.chips.${key}`))}
                        >
                          {t(`panel.chips.${key}`)}
                        </button>
                      ))}
                    </div>
                  )}
                  {chat.messages.map((m, i) => (
                    <div key={i}>
                      <div
                        className={
                          m.role === "user" ? "bubble bubble--user" : "bubble"
                        }
                      >
                        {m.text}
                      </div>
                      {m.products?.map((product) => (
                        <MiniProduct key={product.code} product={product}>
                          <button
                            onClick={() => navTo(productHref(product.code))}
                          >
                            {t("panel.viewProduct")}
                          </button>
                        </MiniProduct>
                      ))}
                      {m.whatsapp && (
                        <a
                          className="chat-cta"
                          href={whatsappUrl(m.whatsapp)}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {t("openWhatsapp")}
                        </a>
                      )}
                    </div>
                  ))}
                  {sending && (
                    <div className="bubble bubble--typing">{t("typing")}</div>
                  )}
                  {errorText && (
                    <p className="chat-error" role="alert">
                      {errorText}
                    </p>
                  )}
                </>
              )}
            </div>
            <div className="chat-footer">
              {config && available && (
                <form
                  className="fake-input chat-input"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void send(draft);
                  }}
                >
                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder={t("inputPlaceholder")}
                    aria-label={t("inputPlaceholder")}
                    maxLength={1000}
                    disabled={sending}
                    data-track-ignore
                  />
                  <button
                    type="submit"
                    aria-label={t("send")}
                    disabled={sending || !draft.trim()}
                  >
                    <Icon name="send" />
                  </button>
                </form>
              )}
              {chat.messages.length > 0 && (
                <button onClick={reset}>{t("newConversation")}</button>
              )}
              <button
                onClick={() =>
                  window.open(
                    whatsappUrl(DEFAULT_WHATSAPP),
                    "_blank",
                    "noopener,noreferrer",
                  )
                }
              >
                {t("panel.whatsapp")}
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
