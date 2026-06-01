import type { CSSProperties } from "react";

export type ThreeDAssetKey =
  | "json-policy"
  | "spend-caps"
  | "identity-badge"
  | "receipt-chain"
  | "rate-limiting"
  | "simulation-flask"
  | "human-approval"
  | "schema-drift"
  | "tablet-json"
  | "shield-tilted"
  | "chain-links";

export type AssetSizingMap = Record<ThreeDAssetKey, number>;

export const baseClassByLayout = {
  featureWide: "w-[60%] max-w-56 md:w-[44%]",
  featureNarrow: "w-[60%] max-w-50 md:w-[72%]",
  howItWorks: "w-[82%] max-w-84 md:w-[88%]",
} as const;

const assetScaleByKey: AssetSizingMap = {
  "json-policy": 1.067,
  "spend-caps": 1.042,
  "identity-badge": 1.075,
  "receipt-chain": 1.124,
  "rate-limiting": 0.947,
  "simulation-flask": 0.987,
  "human-approval": 0.914,
  "schema-drift": 0.881,
  "tablet-json": 0.999,
  "shield-tilted": 0.891,
  "chain-links": 1.017,
};

type StyleWithScaleVars = CSSProperties & {
  "--asset-scale": string;
  "--asset-hover-scale": string;
};

export function getAssetScaleStyle(assetKey: ThreeDAssetKey, hoverMultiplier: number): StyleWithScaleVars {
  const scale = assetScaleByKey[assetKey];

  return {
    "--asset-scale": scale.toFixed(3),
    "--asset-hover-scale": (scale * hoverMultiplier).toFixed(3),
  };
}
