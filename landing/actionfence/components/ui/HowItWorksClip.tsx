"use client";

import { Player } from "@remotion/player";
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

export type ClipKind = "define" | "enforce" | "prove";

type ClipProps = {
  kind: ClipKind;
};

const CLIP_FPS = 30;
const CLIP_DURATION = 150;
const CLIP_WIDTH = 560;
const CLIP_HEIGHT = 224;

function DefineClip() {
  const frame = useCurrentFrame();
  const looped = frame % CLIP_DURATION;

  const reveal = spring({
    fps: CLIP_FPS,
    frame: looped,
    durationInFrames: 28,
    config: { damping: 200 },
  });

  const scanY = interpolate(looped, [20, 120], [40, 128], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const ruleA = interpolate(looped, [28, 46], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const ruleB = interpolate(looped, [40, 58], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const ruleC = interpolate(looped, [52, 70], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: "transparent", opacity: reveal }}>
      <svg viewBox="0 0 280 160" width="100%" height="100%" aria-hidden="true">
        <rect x="26" y="32" width="56" height="96" fill="#09090b" stroke="#4a4a53" />
        <path d="M66 32v16h16" fill="none" stroke="#4a4a53" />
        <path d="M34 58h36M34 72h24M34 86h36M34 100h18" stroke="#3f3f46" strokeWidth="1" />
        <path d="M48 54l-4 4 4 4M62 54l4 4-4 4" fill="none" stroke="#7b7b8f" strokeWidth="1" />

        <path d="M90 80h22" stroke="#3f3f46" />
        <path d="M102 74l10 6-10 6" fill="none" stroke="#7b7b8f" strokeWidth="1" />

        <g opacity={ruleA}>
          <rect x="120" y="44" width="134" height="24" fill="#09090b" stroke="#3f3f46" />
          <rect x="128" y="51" width="18" height="10" fill="#0f0f10" stroke="#7b7b8f" />
          <path d="M154 56h44" stroke="#4a4a53" />
          <path d="M206 56h38" stroke="#4a4a53" />
        </g>

        <g opacity={ruleB}>
          <rect x="120" y="74" width="134" height="24" fill="#09090b" stroke="#3f3f46" />
          <rect x="128" y="81" width="18" height="10" fill="#0f0f10" stroke="#7b7b8f" />
          <path d="M154 86h32" stroke="#4a4a53" />
          <path d="M192 86h52" stroke="#4a4a53" />
        </g>

        <g opacity={ruleC}>
          <rect x="120" y="104" width="134" height="24" fill="#09090b" stroke="#3f3f46" />
          <rect x="128" y="111" width="18" height="10" fill="#0f0f10" stroke="#7b7b8f" />
          <path d="M154 116h48" stroke="#4a4a53" />
          <path d="M210 116h34" stroke="#4a4a53" />
        </g>

        <path d={`M120 ${scanY}h134`} stroke="rgba(210,210,226,0.35)" strokeWidth="1.1" />
      </svg>
    </AbsoluteFill>
  );
}

function EnforceClip() {
  const frame = useCurrentFrame();
  const looped = frame % CLIP_DURATION;
  const { fps } = useVideoConfig();

  const gatePop = spring({
    fps,
    frame: looped,
    durationInFrames: 40,
    config: { damping: 200 },
  });

  const packetX = interpolate(looped, [0, CLIP_DURATION], [18, 266], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const blockedX = interpolate(looped, [16, 58], [72, 132], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const blockedRise = interpolate(looped, [40, 72], [0, -26], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const blockedOpacity = interpolate(looped, [12, 30, 70, 90], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const packetVisible = packetX < 138 || packetX > 176;

  return (
    <AbsoluteFill style={{ backgroundColor: "transparent" }}>
      <svg viewBox="0 0 280 160" width="100%" height="100%" aria-hidden="true">
        <path d="M20 80h118M176 80h86" stroke="#3f3f46" strokeWidth="1.2" />
        <circle cx="18" cy="80" r="4" fill="#7b7b8f" />
        <rect
          x="138"
          y={54 - gatePop * 1.5}
          width="38"
          height={52 + gatePop * 3}
          fill="#09090b"
          stroke="rgba(202,202,214,0.75)"
        />
        <path d="M146 68h22M146 80h16M146 92h11" stroke="#3f3f46" strokeWidth="1" />
        <path d="M157 62l7 4v8c0 5-3 8-7 10-4-2-7-5-7-10v-8z" fill="none" stroke="#8a8a95" />

        <circle cx="272" cy="80" r="4" fill="#6b7280" />
        <path d="M260 74l8 6-8 6" fill="none" stroke="#4a4a53" />
        <path d="M246 76l4 4 8-10" fill="none" stroke="#8a8a95" />

        <path d="M120 50l8 8M128 50l-8 8" stroke="#6b6b75" />

        {packetVisible ? <rect x={packetX} y="74" width="8" height="12" fill="#c4c4d4" /> : null}

        <g opacity={blockedOpacity}>
          <rect x={blockedX} y={70 + blockedRise} width="8" height="12" fill="#8a8a95" />
          <path d={`M${blockedX + 14} ${70 + blockedRise}l8 8M${blockedX + 22} ${70 + blockedRise}l-8 8`} stroke="#8a8a95" />
        </g>
      </svg>
    </AbsoluteFill>
  );
}

function ProveClip() {
  const frame = useCurrentFrame();
  const looped = frame % CLIP_DURATION;

  const travel = interpolate(looped, [0, CLIP_DURATION], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const activeBlock = Math.min(2, Math.floor(travel * 3));
  const stampPulse = interpolate(Math.sin((looped / CLIP_DURATION) * Math.PI * 2), [-1, 1], [0.4, 1]);

  const blocks = [0, 1, 2];

  return (
    <AbsoluteFill style={{ backgroundColor: "transparent" }}>
      <svg viewBox="0 0 280 160" width="100%" height="100%" aria-hidden="true">
        {blocks.map((index) => {
          const x = 38 + index * 78;
          const isActive = index <= activeBlock;
          return (
            <g key={index}>
              <rect
                x={x}
                y="54"
                width="64"
                height="56"
                fill="#09090b"
                stroke={isActive ? "rgba(204,204,218,0.9)" : "#3f3f46"}
              />
              <path d={`M${x + 10} 70h42M${x + 10} 82h28M${x + 10} 94h18`} stroke="#3f3f46" strokeWidth="1" />
              <path d={`M${x + 44} 60h12`} stroke="rgba(184,184,196,0.75)" />
              <circle cx={x + 50} cy="102" r="4" fill={isActive ? `rgba(205,205,220,${stampPulse})` : "#4a4a53"} />
            </g>
          );
        })}
        <path d="M102 82h14M180 82h14" stroke="rgba(184,184,196,0.7)" strokeWidth="1.2" />
        <path d="M108 76l8 6-8 6M186 76l8 6-8 6" fill="none" stroke="rgba(184,184,196,0.7)" />
      </svg>
    </AbsoluteFill>
  );
}

const ExplainerComposition: React.FC<ClipProps> = ({ kind }) => {
  if (kind === "define") return <DefineClip />;
  if (kind === "enforce") return <EnforceClip />;
  return <ProveClip />;
};

export function HowItWorksClip({ kind }: ClipProps) {
  return (
    <Player
      component={ExplainerComposition}
      inputProps={{ kind }}
      acknowledgeRemotionLicense
      durationInFrames={CLIP_DURATION}
      compositionWidth={CLIP_WIDTH}
      compositionHeight={CLIP_HEIGHT}
      fps={CLIP_FPS}
      loop
      autoPlay
      clickToPlay={false}
      controls={false}
      style={{ width: "100%", height: "100%" }}
    />
  );
}
