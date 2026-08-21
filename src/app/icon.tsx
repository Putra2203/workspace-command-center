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
        }}
      >
        <div
          style={{
            position: 'relative',
            width: 24,
            height: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              position: 'absolute',
              width: 24,
              height: 24,
              borderRadius: '50%',
              border: '2.5px solid #38BDF8',
            }}
          />
          <div
            style={{
              position: 'absolute',
              width: 13,
              height: 13,
              borderRadius: '50%',
              border: '2.5px solid #8B5CF6',
            }}
          />
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: '#38BDF8',
            }}
          />
        </div>
      </div>
    ),
    { ...size }
  );
}
