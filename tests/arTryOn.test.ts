import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { INITIAL_PRODUCTS } from '../src/data/initialData.js';
import type { Product } from '../src/types.js';
import {
  AR_FINISH_PRESETS,
  AR_REFERENCE_ITEMS,
  clampRoomPlacement,
  computeRoomFitAnalysis,
  getProductDimensions,
  isFloorFurnitureModel,
  resolveArModelType,
} from '../src/utils/arCalibration.js';

describe('AR Product Try-On Calibration & Spatial Sizing', () => {
  it('resolves 3D AR model types accurately for furniture and electronics catalog products', () => {
    const laptop = INITIAL_PRODUCTS.find((p) => p.id === 'prod-1');
    const monitor = INITIAL_PRODUCTS.find((p) => p.id === 'prod-6');
    const espresso = INITIAL_PRODUCTS.find((p) => p.id === 'prod-7');
    const smartDesk = INITIAL_PRODUCTS.find((p) => p.id === 'prod-9');
    const ergoChair = INITIAL_PRODUCTS.find((p) => p.id === 'prod-10');

    assert.ok(laptop && monitor && espresso && smartDesk && ergoChair);
    assert.equal(resolveArModelType(laptop), 'laptop');
    assert.equal(resolveArModelType(monitor), 'monitor');
    assert.equal(resolveArModelType(espresso), 'coffee_maker');
    assert.equal(resolveArModelType(smartDesk), 'desk');
    assert.equal(resolveArModelType(ergoChair), 'chair');

    // Keyword & category fallback for custom furniture / electronics without explicit arModelType
    const customSofa: Product = {
      id: 'custom-sofa',
      name: 'أريكة صالة مودرن ثلاثية',
      description: 'أريكة قماش فاخرة',
      price: 2999,
      category: 'home',
      categoryNameAr: 'المنزل والأثاث الذكي',
      images: ['https://example.com/sofa.jpg'],
      stock: 5,
      rating: 4.8,
      reviewCount: 4,
      specifications: [],
      reviews: [],
    };
    const customElectronics: Product = {
      id: 'custom-hub',
      name: 'موزع طاقة ذكي',
      description: 'موزع USB-C متعدد المنافذ',
      price: 199,
      category: 'electronics',
      categoryNameAr: 'إلكترونيات وحواسيب',
      images: ['https://example.com/hub.jpg'],
      stock: 15,
      rating: 4.6,
      reviewCount: 8,
      specifications: [],
      reviews: [],
    };

    assert.equal(resolveArModelType(customSofa), 'chair');
    assert.equal(resolveArModelType(customElectronics), 'generic_electronics');
    assert.equal(isFloorFurnitureModel('desk'), true);
    assert.equal(isFloorFurnitureModel('chair'), true);
    assert.equal(isFloorFurnitureModel('monitor'), false);
    assert.equal(isFloorFurnitureModel('laptop'), false);
  });

  it('returns exact catalog dimensions when present and sensible defaults when omitted', () => {
    const smartDesk = INITIAL_PRODUCTS.find((p) => p.id === 'prod-9')!;
    const deskDims = getProductDimensions(smartDesk);
    assert.equal(deskDims.widthCm, 140);
    assert.equal(deskDims.heightCm, 75);
    assert.equal(deskDims.depthCm, 70);
    assert.equal(deskDims.arModelType, 'desk');

    const minimalProduct: Product = {
      id: 'minimal-home',
      name: 'رف مكتبي بسيط',
      description: 'رف تخزين',
      price: 120,
      category: 'home',
      categoryNameAr: 'المنزل والأثاث الذكي',
      images: ['https://example.com/shelf.jpg'],
      stock: 9,
      rating: 4.2,
      reviewCount: 1,
      specifications: [],
      reviews: [],
    };
    const fallbackDims = getProductDimensions(minimalProduct);
    assert.equal(fallbackDims.widthCm, 65);
    assert.equal(fallbackDims.heightCm, 75);
    assert.equal(fallbackDims.depthCm, 55);
    assert.equal(fallbackDims.arModelType, 'generic_furniture');
  });

  it('computes room space fit analysis including clearances, overflow alerts, and 90-degree rotation', () => {
    const deskDims = { widthCm: 140, depthCm: 70 };

    // Fits comfortably in a 180 x 100 cm alcove
    const fitsResult = computeRoomFitAnalysis(deskDims, 180, 100, false);
    assert.equal(fitsResult.fits, true);
    assert.equal(fitsResult.fitsWidth, true);
    assert.equal(fitsResult.fitsDepth, true);
    assert.equal(fitsResult.marginWidthCm, 40);
    assert.equal(fitsResult.marginDepthCm, 30);
    assert.equal(fitsResult.utilizationPercent, 54);
    assert.ok(fitsResult.verdictAr.includes('مناسب للمساحة'));

    // Too narrow in 120 x 160 cm orientation, unless rotated 90 degrees
    const unrotatedOverflow = computeRoomFitAnalysis(deskDims, 120, 160, false);
    assert.equal(unrotatedOverflow.fits, false);
    assert.equal(unrotatedOverflow.fitsWidth, false);
    assert.equal(unrotatedOverflow.fitsDepth, true);
    assert.equal(unrotatedOverflow.marginWidthCm, -20);
    assert.ok(unrotatedOverflow.verdictAr.includes('تحذير المقاس'));

    const rotatedFit = computeRoomFitAnalysis(deskDims, 120, 160, true);
    assert.equal(rotatedFit.fits, true);
    assert.equal(rotatedFit.marginWidthCm, 50);
    assert.equal(rotatedFit.marginDepthCm, 20);
  });

  it('clamps 3D room coordinates safely and exposes AR reference items and material presets', () => {
    const clamped = clampRoomPlacement(4.8, -9.1, 2.2);
    assert.equal(clamped.x, 2.2);
    assert.equal(clamped.z, -2.2);

    const nanClamped = clampRoomPlacement(Number.NaN, Number.POSITIVE_INFINITY, 1.5);
    assert.equal(nanClamped.x, 0);
    assert.equal(nanClamped.z, 0);

    assert.ok(AR_REFERENCE_ITEMS.some((item) => item.id === 'dining_chair'));
    assert.ok(AR_REFERENCE_ITEMS.some((item) => item.id === 'smartphone'));
    assert.ok(AR_FINISH_PRESETS.length >= 4);
  });
});
