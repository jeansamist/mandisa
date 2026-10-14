"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type PointerEvent,
} from "react";
import {
  motion,
  MotionConfig,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "motion/react";

// Shared easing: quick start, soft landing.
export const ease = [0.22, 1, 0.36, 1] as const;

/** Honors the OS "reduce motion" setting for every animation below. */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}

const revealTags = {
  div: motion.div,
  article: motion.article,
  section: motion.section,
  span: motion.span,
  p: motion.p,
  h1: motion.h1,
  h2: motion.h2,
};

type RevealProps = ComponentProps<typeof motion.div> & {
  as?: keyof typeof revealTags;
  delay?: number;
  /** Distance in px the element rises from. */
  y?: number;
};

/** Fades and lifts its content in the first time it scrolls into view. */
export function Reveal({
  as = "div",
  delay = 0,
  y = 28,
  transition,
  ...props
}: RevealProps) {
  const Tag = revealTags[as] as typeof motion.div;
  return (
    <Tag
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -8% 0px" }}
      transition={{ duration: 0.8, ease, delay, ...transition }}
      {...props}
    />
  );
}

/** Stagger delay for the n-th item of a grid row. */
export function stagger(index: number, perRow = 4, step = 0.09) {
  return (index % perRow) * step;
}

// Pointer position inside a MouseParallaxArea, from -0.5 to 0.5 on each axis.
type Pointer = { x: MotionValue<number>; y: MotionValue<number> };
const PointerContext = createContext<Pointer | null>(null);

/** Tracks the mouse inside the area so MouseLayer / ParallaxImg children can follow it. */
export function MouseParallaxArea({
  children,
  ...props
}: ComponentProps<typeof motion.section>) {
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const spring = { stiffness: 80, damping: 20, mass: 0.6 };
  const x = useSpring(rawX, spring);
  const y = useSpring(rawY, spring);

  const onPointerMove = (e: PointerEvent<HTMLElement>) => {
    if (e.pointerType !== "mouse") return;
    const rect = e.currentTarget.getBoundingClientRect();
    rawX.set((e.clientX - rect.left) / rect.width - 0.5);
    rawY.set((e.clientY - rect.top) / rect.height - 0.5);
  };
  const reset = () => {
    rawX.set(0);
    rawY.set(0);
  };

  return (
    <PointerContext.Provider value={{ x, y }}>
      <motion.section
        onPointerMove={onPointerMove}
        onPointerLeave={reset}
        {...props}
      >
        {children}
      </motion.section>
    </PointerContext.Provider>
  );
}

/** Offset (px) following the pointer; negative depth moves against it. */
function usePointerOffset(depth: number) {
  const pointer = useContext(PointerContext);
  const reduce = useReducedMotion();
  const zero = useMotionValue(0);
  const x = useTransform(pointer?.x ?? zero, (v) => (reduce ? 0 : v * depth));
  const y = useTransform(pointer?.y ?? zero, (v) => (reduce ? 0 : v * depth));
  return { x, y };
}

/** A layer that drifts with the mouse inside a MouseParallaxArea. */
export function MouseLayer({
  depth,
  style,
  ...props
}: ComponentProps<typeof motion.div> & { depth: number }) {
  const offset = usePointerOffset(depth);
  return <motion.div style={{ ...offset, ...style }} {...props} />;
}

type ParallaxImgProps = Omit<ComponentProps<typeof motion.img>, "style"> & {
  /** Max scroll travel in px, each direction. */
  distance?: number;
  /** Mouse travel in px when inside a MouseParallaxArea. */
  mouseDepth?: number;
  /** Overscale so the moving image never reveals its frame's edges. */
  scale?: number;
};

/**
 * Image that scrolls slower than the page (and optionally follows the mouse).
 * Meant for images that fill an `overflow: hidden` frame.
 */
export function ParallaxImg({
  distance = 50,
  mouseDepth = 0,
  scale = 1.15,
  ...props
}: ParallaxImgProps) {
  const ref = useRef<HTMLImageElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const scrollY = useTransform(scrollYProgress, [0, 1], [-distance, distance]);
  const pointer = usePointerOffset(mouseDepth);
  const y = useTransform(() => (reduce ? 0 : scrollY.get() + pointer.y.get()));

  return (
    <motion.img
      ref={ref}
      style={{ x: pointer.x, y, scale: reduce ? 1 : scale }}
      {...props}
    />
  );
}

/** Image that zooms in and pans toward the cursor on hover. */
export function ZoomPanImg(props: ComponentProps<typeof motion.img>) {
  const originX = useMotionValue(50);
  const originY = useMotionValue(50);
  const transformOrigin = useMotionTemplate`${originX}% ${originY}%`;

  const onPointerMove = (e: PointerEvent<HTMLImageElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    originX.set(((e.clientX - rect.left) / rect.width) * 100);
    originY.set(((e.clientY - rect.top) / rect.height) * 100);
  };

  return (
    <motion.img
      style={{ transformOrigin }}
      whileHover={{ scale: 1.6 }}
      transition={{ duration: 0.6, ease }}
      onPointerMove={onPointerMove}
      {...props}
    />
  );
}

// First mount (server render + hydration) stays visible; later route changes fade in.
let hasMounted = false;

/** Soft fade between pages, skipped on the initial load. */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const [animate] = useState(() => hasMounted);
  useEffect(() => {
    hasMounted = true;
  }, []);
  return (
    <motion.div
      initial={animate ? { opacity: 0, y: 14 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease }}
    >
      {children}
    </motion.div>
  );
}

/** Height + fade transition for accordion bodies; render inside AnimatePresence. */
export function Collapse({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.35, ease }}
      style={{ overflow: "hidden" }}
    >
      {children}
    </motion.div>
  );
}
