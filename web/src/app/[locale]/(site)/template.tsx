import { PageTransition } from "@/components/motion";

// Templates re-mount on navigation, which replays the page transition.
export default function Template({ children }: { children: React.ReactNode }) {
  return <PageTransition>{children}</PageTransition>;
}
