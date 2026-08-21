import { ImageResponse } from 'next/og';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
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
          borderRadius: 7,
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            width: 26,
            height: 26,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(139,92,246,0.45) 0%, transparent 70%)',
            top: 3,
            right: -2,
          }}
        />
        <div
          style={{
            width: 13,
            height: 13,
            borderTop: '4px solid #38BDF8',
            borderRight: '4px solid #38BDF8',
            borderRadius: 3,
            transform: 'rotate(45deg)',
            boxShadow: '0 0 7px rgba(56,189,248,0.85)',
          }}
        />
      </div>
    ),
    { ...size }
  );
}
