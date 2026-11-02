export interface CardVariant {
  id: string;
  sku: string;
  size: string;
  color: string;
  price: number;
  mrp: number;
  available: number;
}

export interface CardProduct {
  id: string;
  name: string;
  slug: string;
  categorySlug: string;
  categoryName: string;
  shortDesc: string;
  price: number;
  mrp: number;
  discount: number;
  sizes: string[];
  colors: string[];
  image: string | null;
  image2: string | null;
  imageAlt: string;
  inStock: boolean;
  isNew: boolean;
  isBestSeller: boolean;
  variants: CardVariant[];
}

/** What the browser keeps in the cart (localStorage). Prices are re-checked by the server. */
export interface CartItem {
  variantId: string;
  productId: string;
  name: string;
  slug: string;
  categorySlug: string;
  image: string | null;
  sku: string;
  size: string;
  color: string;
  price: number;
  mrp: number;
  quantity: number;
  available: number;
}
