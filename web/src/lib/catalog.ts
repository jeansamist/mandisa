// Mock catalog data from the Figma export. To be replaced by the real catalog (Supabase).

export const photos = {
  hero: "https://images.unsplash.com/photo-1632765854612-9b02b6ec2b15?auto=format&fit=crop&w=1600&q=88",
  afro: "https://images.unsplash.com/photo-1519699047748-de8e457a634e?auto=format&fit=crop&w=900&q=86",
  kinky: "https://images.unsplash.com/photo-1606418578110-c40f5d299c24?auto=format&fit=crop&w=900&q=86",
  yaki: "https://images.unsplash.com/photo-1527203561188-dae1bc1a417f?auto=format&fit=crop&w=900&q=86",
  curly: "https://images.unsplash.com/photo-1656473031961-9d5d9ee19f40?auto=format&fit=crop&w=900&q=86",
  detail: "https://images.unsplash.com/photo-1632765866070-3fadf25d3d5b?auto=format&fit=crop&w=900&q=86",
  care: "https://images.unsplash.com/photo-1595387644896-3d2d8e88b36e?auto=format&fit=crop&w=1200&q=86",
};

export type Product = {
  code: string;
  name: string;
  texture: string;
  price: string;
  status: string;
  image: string;
};

export const products: Product[] = [
  { code: "MDS-W01", name: "Nadège", texture: "Afro", price: "98 000", status: "En stock", image: photos.afro },
  { code: "MDS-W02", name: "Mireille", texture: "Kinky yaki", price: "112 000", status: "Plus que 2", image: photos.kinky },
  { code: "MDS-W03", name: "Armelle", texture: "Light yaki", price: "84 000", status: "Précommande", image: photos.yaki },
  { code: "MDS-W04", name: "Syntiche", texture: "Bouclées", price: "128 000", status: "En stock", image: photos.curly },
  { code: "MDS-W05", name: "Estelle", texture: "Afro", price: "76 000", status: "En stock", image: photos.detail },
  { code: "MDS-W06", name: "Laure", texture: "Kinky yaki", price: "142 000", status: "Précommande", image: photos.hero },
  { code: "MDS-W07", name: "Flora", texture: "Light yaki", price: "92 000", status: "En stock", image: photos.yaki },
  { code: "MDS-W08", name: "Sandrine", texture: "Bouclées", price: "135 000", status: "Plus que 2", image: photos.curly },
  { code: "MDS-W09", name: "Ngono", texture: "Afro", price: "69 000", status: "Rupture", image: photos.afro },
];

export function productHref(code: string) {
  return `/products/${code.toLowerCase()}`;
}

export function findProduct(slug: string) {
  return products.find((p) => p.code.toLowerCase() === slug.toLowerCase());
}
