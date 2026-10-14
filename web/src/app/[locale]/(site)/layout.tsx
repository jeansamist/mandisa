import Header from "@/components/header";
import Footer from "@/components/footer";
import Assistant from "@/components/assistant";

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      {children}
      <Footer />
      <Assistant />
    </>
  );
}
