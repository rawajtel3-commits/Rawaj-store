import { AppLanguage, Category, MerchantRatingEntry, MerchantRatingSummary, Product } from '../types';

export interface BrandStorefrontSummary {
  slug: string;
  name: string;
  shortName: string;
  products: Product[];
  productsCount: number;
  inStockCount: number;
  averageRating: number;
  totalReviews: number;
  minPrice: number;
  maxPrice: number;
  categories: Category[];
  featuredImage: string;
  verifiedPartner: boolean;
}

export function slugifyBrandName(rawBrand: string): string {
  const cleaned = rawBrand.trim().toLowerCase();
  const asciiMatch = cleaned.match(/\(([^)]+)\)/);
  if (asciiMatch?.[1]) {
    return asciiMatch[1]
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
  return encodeURIComponent(cleaned.replace(/\s+/g, '-'));
}

export function getDisplayBrandName(rawBrand: string, lang: AppLanguage): string {
  const asciiMatch = rawBrand.match(/\(([^)]+)\)/);
  if (lang === 'en' && asciiMatch?.[1]) {
    return asciiMatch[1].trim();
  }
  return rawBrand.trim();
}

export function buildBrandStorefronts(products: Product[]): BrandStorefrontSummary[] {
  const grouped = new Map<string, Product[]>();

  for (const product of products) {
    const brandName = (product.brand || 'رواج (Rawaj)').trim();
    const list = grouped.get(brandName) || [];
    list.push(product);
    grouped.set(brandName, list);
  }

  const summaries: BrandStorefrontSummary[] = [];

  for (const [brandName, brandProducts] of grouped.entries()) {
    const productsCount = brandProducts.length;
    const inStockCount = brandProducts.filter((p) => p.stock > 0).length;
    const averageRating = Number(
      (
        brandProducts.reduce((sum, p) => sum + (p.rating || 0), 0) /
        Math.max(1, productsCount)
      ).toFixed(1)
    );
    const totalReviews = brandProducts.reduce((sum, p) => sum + (p.reviewCount || 0), 0);
    const prices = brandProducts.map((p) => p.price);
    const categories = Array.from(new Set(brandProducts.map((p) => p.category)));
    const asciiMatch = brandName.match(/\(([^)]+)\)/);

    summaries.push({
      slug: slugifyBrandName(brandName),
      name: brandName,
      shortName: asciiMatch?.[1]?.trim() || brandName.split(' ')[0],
      products: brandProducts,
      productsCount,
      inStockCount,
      averageRating,
      totalReviews,
      minPrice: Math.min(...prices),
      maxPrice: Math.max(...prices),
      categories,
      featuredImage: brandProducts[0]?.images?.[0] || '',
      verifiedPartner: true,
    });
  }

  return summaries.sort((a, b) => b.productsCount - a.productsCount || b.averageRating - a.averageRating);
}

export function computeMerchantRatingSummary(
  brandSlug: string,
  entries: MerchantRatingEntry[]
): MerchantRatingSummary {
  const matching = entries
    .filter((entry) => entry.brandSlug === brandSlug)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  if (matching.length === 0) {
    return {
      brandSlug,
      ratingsCount: 0,
      avgPrepSpeed: 0,
      avgPackagingQuality: 0,
      avgOverall: 0,
      reviews: [],
    };
  }

  const totalPrep = matching.reduce((sum, r) => sum + r.prepSpeedRating, 0);
  const totalPack = matching.reduce((sum, r) => sum + r.packagingQualityRating, 0);
  const avgPrepSpeed = Number((totalPrep / matching.length).toFixed(1));
  const avgPackagingQuality = Number((totalPack / matching.length).toFixed(1));
  const avgOverall = Number(((avgPrepSpeed + avgPackagingQuality) / 2).toFixed(1));

  return {
    brandSlug,
    ratingsCount: matching.length,
    avgPrepSpeed,
    avgPackagingQuality,
    avgOverall,
    reviews: matching,
  };
}

