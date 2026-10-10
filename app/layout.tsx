import type { Metadata, Viewport } from "next";
import "./globals.css";
import { MetaPixel } from "./meta-pixel";
const META_PIXEL_ID = "1442564798019869";
const LOCATION_BOOTSTRAP = `
(() => {
  const readJson = (url) => fetch(url, { cache: 'no-store', credentials: 'omit' })
    .then((response) => response.ok ? response.json() : null)
    .catch(() => null);
  readJson('/api/location?v=' + Date.now())
    .then((primary) => primary && primary.city
      ? primary
      : readJson('https://ipwho.is/?fields=success,city,region_code'))
    .then((primary) => primary && primary.city
      ? primary
      : readJson('https://ipapi.co/json/'))
    .then((data) => {
      if (!data || !data.city || data.success === false) return;
      const state = data.state || data.region_code || '';
      const label = data.city + (state ? '/' + state : '');
      window.__sushiLocationLabel = label;
      document.querySelectorAll('[data-location-label]').forEach((node) => {
        node.textContent = label;
      });
      window.dispatchEvent(new CustomEvent('sushi:location', { detail: label }));
    })
    .catch(() => {});
})();`;
export const metadata: Metadata = { title:"Sushi House | Delivery japonês", description:"Cardápio online da Sushi House. Combos, sushis, temakis e pratos quentes com entrega rápida.", icons:{icon:"/sushi-house-logo-v2.webp",shortcut:"/sushi-house-logo-v2.webp",apple:"/sushi-house-logo-v2.webp"} };
export const viewport: Viewport = { themeColor:"#0b1116",width:"device-width",initialScale:1 };
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="pt-BR"><head><link rel="preload" as="image" href="/festival-inauguracao-mobile.webp" type="image/webp" fetchPriority="high" media="(max-width: 640px)" /><link rel="preload" as="image" href="/festival-inauguracao-v2.webp" type="image/webp" fetchPriority="high" media="(min-width: 641px)" /></head><body><MetaPixel />{children}<script dangerouslySetInnerHTML={{__html:LOCATION_BOOTSTRAP}} /><noscript><img height="1" width="1" style={{display:"none"}} alt="" src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`} /></noscript></body></html>}
