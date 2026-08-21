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
            width: 140,
            height: 140,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(56,189,248,0.18) 0%, transparent 70%)',
          }}
        />
        <div
          style={{
            position: 'relative',
            width: 116,
            height: 116,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              position: 'absolute',
              width: 116,
              height: 116,
              borderRadius: '50%',
              border: '9px solid #38BDF8',
            }}
          />
          <div
            style={{
              position: 'absolute',
              width: 64,
              height: 64,
              borderRadius: '50%',
              border: '9px solid #8B5CF6',
            }}
          />
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: '50%',
              background: '#38BDF8',
              boxShadow: '0 0 24px rgba(56,189,248,0.9)',
            }}
          />
        </div>
      </div>
    ),
    { ...size }
  );
}
