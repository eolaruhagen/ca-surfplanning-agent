import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { Feature, FeatureCollection, Polygon, MultiPolygon } from 'geojson';

import { buildCaliforniaMask } from '../app/components/map/buildMask';

const WORLD_RING: number[][] = [
  [-180, -85],
  [180, -85],
  [180, 85],
  [-180, 85],
  [-180, -85],
];

function squareRing(
  cx: number,
  cy: number,
  d = 1,
): number[][] {
  return [
    [cx - d, cy - d],
    [cx + d, cy - d],
    [cx + d, cy + d],
    [cx - d, cy + d],
    [cx - d, cy - d],
  ];
}

function polygonFeature(ring: number[][]): Feature<Polygon> {
  return {
    type: 'Feature',
    properties: {},
    geometry: { type: 'Polygon', coordinates: [ring] },
  };
}

function multiPolygonFeature(rings: number[][][]): Feature<MultiPolygon> {
  return {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'MultiPolygon',
      coordinates: rings.map((r) => [r]),
    },
  };
}

describe('buildCaliforniaMask', () => {
  it('returns a Polygon Feature with the world rect as the outer ring', () => {
    const ca = polygonFeature(squareRing(-119, 37, 5));
    const mask = buildCaliforniaMask(ca);

    assert.equal(mask.type, 'Feature');
    assert.equal(mask.geometry.type, 'Polygon');
    assert.deepEqual(mask.geometry.coordinates[0], WORLD_RING);
  });

  it('adds a single hole when given a single Polygon Feature', () => {
    const caRing = squareRing(-119, 37, 5);
    const ca = polygonFeature(caRing);
    const mask = buildCaliforniaMask(ca);

    // outer ring + 1 hole
    assert.equal(mask.geometry.coordinates.length, 2);
    assert.deepEqual(mask.geometry.coordinates[1], caRing);
  });

  it('explodes MultiPolygon Features into one hole per polygon', () => {
    const r1 = squareRing(-119, 37, 1);
    const r2 = squareRing(-118, 36, 0.5);
    const r3 = squareRing(-117, 35, 0.5);
    const ca = multiPolygonFeature([r1, r2, r3]);
    const mask = buildCaliforniaMask(ca);

    assert.equal(mask.geometry.coordinates.length, 4); // outer + 3 holes
    assert.deepEqual(mask.geometry.coordinates[1], r1);
    assert.deepEqual(mask.geometry.coordinates[2], r2);
    assert.deepEqual(mask.geometry.coordinates[3], r3);
  });

  it('accepts a FeatureCollection and concatenates holes from all members', () => {
    const r1 = squareRing(-119, 37, 1);
    const r2 = squareRing(-118, 36, 0.5);
    const fc: FeatureCollection = {
      type: 'FeatureCollection',
      features: [polygonFeature(r1), polygonFeature(r2)],
    };
    const mask = buildCaliforniaMask(fc);
    assert.equal(mask.geometry.coordinates.length, 3);
    assert.deepEqual(mask.geometry.coordinates[1], r1);
    assert.deepEqual(mask.geometry.coordinates[2], r2);
  });

  it('skips features without geometry', () => {
    const r = squareRing(-119, 37, 1);
    const fc: FeatureCollection = {
      type: 'FeatureCollection',
      features: [
        { type: 'Feature', properties: {}, geometry: null as unknown as Polygon },
        polygonFeature(r),
      ],
    };
    const mask = buildCaliforniaMask(fc);
    assert.equal(mask.geometry.coordinates.length, 2);
    assert.deepEqual(mask.geometry.coordinates[1], r);
  });

  it('produces empty-properties Feature (mask is renderable but unstyled)', () => {
    const mask = buildCaliforniaMask(polygonFeature(squareRing(-119, 37)));
    assert.deepEqual(mask.properties, {});
  });
});
