import type { AmazonSaImageKey, AmazonSaProduct, Category, Product } from '../types';

import heroShowcaseImg from '../assets/images/amazon_sa_hero_showcase_1795015895069.jpg';
import laptopProImg from '../assets/images/amazon_sa_laptop_pro_1795015896197.jpg';
import audioHeadphonesImg from '../assets/images/amazon_sa_audio_headphones_1795015896319.jpg';
import homeEspressoImg from '../assets/images/amazon_sa_home_espresso_1795015896772.jpg';
import watchGamingImg from '../assets/images/amazon_sa_watch_gaming_1795015897802.jpg';

export const AMAZON_SA_HERO_IMAGE = heroShowcaseImg;

export const AMAZON_SA_MEDIA_MAP: Record<AmazonSaImageKey, string> = {
  hero: heroShowcaseImg,
  laptop: laptopProImg,
  audio: audioHeadphonesImg,
  home: homeEspressoImg,
  watch_gaming: watchGamingImg,
};

export function resolveAmazonSaImage(item: Pick<AmazonSaProduct, 'imageUrl' | 'imageKey'>): string {
  return item.imageUrl?.trim() || AMAZON_SA_MEDIA_MAP[item.imageKey] || heroShowcaseImg;
}

function mapAmazonCategoryToStoreCategory(
  cat: AmazonSaProduct['category']
): Category {
  switch (cat) {
    case 'electronics':
      return 'electronics';
    case 'mobiles':
      return 'accessories';
    case 'home_kitchen':
      return 'home';
    case 'gaming':
      return 'gaming';
    case 'watches_perfumes':
      return 'accessories';
    default:
      return 'electronics';
  }
}

export function toRawajProductFromAmazonSa(item: AmazonSaProduct): Product {
  const imageSrc = resolveAmazonSaImage(item);
  return {
    id: item.id,
    name: item.title,
    nameEn: item.titleEn,
    brand: item.brand,
    category: mapAmazonCategoryToStoreCategory(item.category),
    categoryNameAr: `أمازون السعودية · ${item.categoryLabelAr}`,
    price: item.priceSar,
    originalPrice: item.listPriceSar,
    rating: item.rating,
    reviewCount: item.reviewCount,
    description: item.highlightsAr.join(' • '),
    images: [imageSrc],
    stock: item.stockCount,
    isFeatured: item.isPrime,
    badge: item.isPrime ? 'Amazon Prime SA' : 'Amazon.sa',
    specifications: [
      ...item.specifications,
      { key: 'المصدر', value: `${item.sellerName} (amazon.sa)` },
      { key: 'مدة التوصيل المتوقعة', value: item.deliveryEstimateAr },
    ],
    reviews: [
      {
        id: `rev-${item.asin}-1`,
        userName: 'عميل موثق · الرياض',
        rating: Math.min(5, Math.max(4, Math.round(item.rating))),
        date: item.lastSyncedAt.slice(0, 10),
        comment: 'منتج أصلي مطابق للمواصفات مع تغليف ممتاز وسرعة في التوصيل.',
        verified: true,
      },
    ],
  };
}
