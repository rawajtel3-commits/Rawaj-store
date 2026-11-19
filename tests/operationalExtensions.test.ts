import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { INITIAL_ORDERS, INITIAL_PRODUCTS, INITIAL_STORE_SETTINGS } from '../src/data/initialData.js';
import { buildShippingWaybillData, generateDeterministicBarcodeBars } from '../src/utils/waybill.js';
import { buildBrandStorefronts, getDisplayBrandName, slugifyBrandName } from '../src/utils/brands.js';
import { getLocalizedProductName, translateCategory } from '../src/utils/i18n.js';

describe('Operational & Expansion Storefront Features (Suggestion #4)', () => {
  it('generates shipping waybill data with scannable QR deep-link and accurate COD/weight calculations', () => {
    const sampleOrder = INITIAL_ORDERS[0];
    assert.ok(sampleOrder, 'Expected at least one initial order');

    const codOrder = {
      ...sampleOrder,
      paymentMethod: 'cod' as const,
      paymentStatus: 'pending' as const,
      total: 4250,
    };

    const waybill = buildShippingWaybillData(codOrder, INITIAL_STORE_SETTINGS, 'https://shop.example.com');
    assert.equal(waybill.waybillNumber, `AWB-${sampleOrder.orderNumber.replace(/[^A-Z0-9-]/gi, '').toUpperCase()}`);
    assert.equal(
      waybill.qrPayload,
      `https://shop.example.com/?view=track-order&order=${encodeURIComponent(sampleOrder.orderNumber)}`
    );
    assert.equal(waybill.isCod, true);
    assert.equal(waybill.codAmountDueSar, 4250);
    assert.ok(waybill.totalItemsCount >= 1);
    assert.ok(waybill.estimatedWeightKg > 0);
    assert.deepEqual(
      waybill.barcodeBars,
      generateDeterministicBarcodeBars(waybill.waybillNumber)
    );

    const paidCardOrder = {
      ...sampleOrder,
      paymentMethod: 'card' as const,
      paymentStatus: 'paid' as const,
    };
    const prepaidWaybill = buildShippingWaybillData(paidCardOrder, INITIAL_STORE_SETTINGS, 'https://shop.example.com');
    assert.equal(prepaidWaybill.isCod, false);
    assert.equal(prepaidWaybill.codAmountDueSar, 0);
  });

  it('builds official brand storefronts grouped accurately with slugs and localized names', () => {
    const brands = buildBrandStorefronts(INITIAL_PRODUCTS);
    assert.ok(brands.length > 0, 'Expected at least one brand storefront');

    const totalGroupedProducts = brands.reduce((sum, b) => sum + b.productsCount, 0);
    assert.equal(totalGroupedProducts, INITIAL_PRODUCTS.length);

    for (const brand of brands) {
      assert.ok(brand.slug.length > 0);
      assert.ok(brand.minPrice <= brand.maxPrice);
      assert.ok(brand.averageRating >= 0 && brand.averageRating <= 5);
    }

    assert.equal(slugifyBrandName('أبل (Apple)'), 'apple');
    assert.equal(getDisplayBrandName('أبل (Apple)', 'en'), 'Apple');
    assert.equal(getDisplayBrandName('أبل (Apple)', 'ar'), 'أبل (Apple)');
  });

  it('translates storefront categories and resolves English/Arabic product names', () => {
    assert.equal(translateCategory('electronics', 'ar'), 'حواسيب وإلكترونيات');
    assert.equal(translateCategory('electronics', 'en'), 'Computers & Electronics');
    assert.equal(translateCategory('gaming', 'en'), 'Gaming World');

    const sampleProduct = INITIAL_PRODUCTS[0];
    assert.equal(getLocalizedProductName(sampleProduct, 'ar'), sampleProduct.name);
    if (sampleProduct.nameEn) {
      assert.equal(getLocalizedProductName(sampleProduct, 'en'), sampleProduct.nameEn.trim());
    }
  });
});
