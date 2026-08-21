import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#05070A',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            width: 150,
            height: 150,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(139,92,246,0.45) 0%, transparent 70%)',
            top: 10,
            right: -10,
          }}
        />
        <div
          style={{
            width: 74,
            height: 74,
            borderTop: '22px solid #38BDF8',
            borderRight: '22px solid #38BDF8',
            borderBottom: '22px solid rgba(139,92,246,0.35)',
            borderLeft: '22px solid rgba(139,92,246,0.35)',
            transform: 'rotate(45deg)',
            boxShadow: '0 0 36px rgba(56,189,248,0.85)',
          }}
        />
      </div>
    ),
    { ...size }
  );
}
