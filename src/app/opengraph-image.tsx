import { ImageResponse } from 'next/og';

export const alt = 'Feathers – The 2nd Skin';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OgImage() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f4ede3', color: '#2a2624', fontFamily: 'serif' }}>
        <div style={{ fontSize: 26, letterSpacing: 10, color: '#7a2e3f' }}>LADIES FASHION · CUSTOM STITCHING</div>
        <div style={{ fontSize: 120, letterSpacing: 18, marginTop: 24 }}>FEATHERS</div>
        <div style={{ fontSize: 30, letterSpacing: 14, color: '#6f6660' }}>THE 2ND SKIN</div>
        <div style={{ fontSize: 44, fontStyle: 'italic', marginTop: 48, color: '#7a2e3f' }}>Your Style. Your Fit. Your Second Skin.</div>
      </div>
    ),
    size,
  );
}
