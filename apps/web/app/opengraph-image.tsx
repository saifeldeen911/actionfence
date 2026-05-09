import { ImageResponse } from 'next/og';

export const alt = 'ActionFence — AI Action Firewall for MCP servers and APIs';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: '#0a0a0b',
          color: '#e8e8ec',
          padding: '64px',
          position: 'relative',
          overflow: 'hidden',
          fontFamily: 'monospace',
        }}
      >
        {/* Subtle glow */}
        <div
          style={{
            position: 'absolute',
            top: -100,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 600,
            height: 400,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(34, 197, 94, 0.12), transparent 70%)',
          }}
        />

        {/* Top badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontSize: 18,
            color: '#22c55e',
            letterSpacing: '0.08em',
          }}
        >
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: 9999,
              background: '#22c55e',
            }}
          />
          Open-source · MIT licensed
        </div>

        {/* Package name */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div
            style={{
              fontSize: 96,
              fontWeight: 700,
              lineHeight: 1,
              letterSpacing: '-0.06em',
            }}
          >
            actionfence
          </div>
          <div
            style={{
              fontSize: 32,
              color: '#71717a',
              lineHeight: 1.3,
            }}
          >
            AI Action Firewall for MCP Servers & APIs
          </div>
        </div>

        {/* Bottom bar */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            paddingTop: 24,
            fontSize: 20,
            color: '#52525b',
          }}
        >
          <span>$ npm install actionfence</span>
          <div style={{ display: 'flex', gap: 32 }}>
            <span>Policy</span>
            <span>Identity</span>
            <span>Receipts</span>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
