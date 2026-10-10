import type { Metadata, Viewport } from "next";
import "./globals.css";
import { MetaPixel } from "./meta-pixel";
const META_PIXEL_ID = "1442564798019869";
const LOCATION_PROMPT_SCRIPT = `
(() => {
  const prompt = document.getElementById('location-consent');
  const confirm = document.getElementById('location-consent-confirm');
  const dismiss = document.getElementById('location-consent-dismiss');
  const close = () => { if (prompt) prompt.style.display = 'none'; };
  const show = () => {
    if (prompt && !window.__sushiPreciseLocation) prompt.style.display = 'flex';
  };
  window.addEventListener('pageshow', show);
  dismiss?.addEventListener('click', close);
  confirm?.addEventListener('click', () => {
    close();
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      try {
        const params = new URLSearchParams({ lat: String(coords.latitude), lon: String(coords.longitude) });
        const response = await fetch('/api/location?' + params, { cache: 'no-store', credentials: 'omit' });
        const data = response.ok ? await response.json() : null;
        if (!data?.city) return;
        const label = data.city + (data.state ? '/' + data.state : '');
        window.__sushiPreciseLocation = true;
        window.__sushiLocationLabel = label;
        document.querySelectorAll('[data-location-label]').forEach((node) => { node.textContent = label; });
        window.dispatchEvent(new CustomEvent('sushi:location', { detail: label }));
      } catch {}
    }, () => {}, { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 });
  });
})();`;
export const metadata: Metadata = { title:"Sushi House | Delivery japonês", description:"Cardápio online da Sushi House. Combos, sushis, temakis e pratos quentes com entrega rápida.", icons:{icon:"/sushi-house-logo-v2.webp",shortcut:"/sushi-house-logo-v2.webp",apple:"/sushi-house-logo-v2.webp"} };
export const viewport: Viewport = { themeColor:"#0b1116",width:"device-width",initialScale:1 };
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="pt-BR"><head><link rel="preload" as="image" href="/festival-inauguracao-mobile.webp" type="image/webp" fetchPriority="high" media="(max-width: 640px)" /><link rel="preload" as="image" href="/festival-inauguracao-v2.webp" type="image/webp" fetchPriority="high" media="(min-width: 641px)" /></head><body><MetaPixel /><div id="location-consent" role="dialog" aria-modal="true" aria-labelledby="location-consent-title" style={{position:"fixed",inset:0,zIndex:9999,display:"flex",alignItems:"flex-end",justifyContent:"center",padding:16,background:"rgba(0,0,0,.48)"}}><div style={{width:"100%",maxWidth:432,borderRadius:24,background:"#fff",padding:24,boxShadow:"0 24px 70px rgba(0,0,0,.28)",fontFamily:"Arial, sans-serif"}}><div style={{display:"flex",height:48,width:48,alignItems:"center",justifyContent:"center",borderRadius:999,background:"#fff0ed",color:"#f25445",fontSize:24}}>📍</div><h2 id="location-consent-title" style={{margin:"16px 0 0",fontFamily:"Georgia, serif",fontSize:26,lineHeight:1.15,color:"#271b19"}}>Entrega grátis na sua região</h2><p style={{margin:"10px 0 0",fontSize:14,lineHeight:1.65,color:"#746461"}}>Permita o acesso à sua localização para verificarmos se a entrega grátis está disponível no seu endereço. Dependendo da região, poderão existir custos adicionais.</p><button id="location-consent-confirm" type="button" style={{width:"100%",marginTop:20,border:0,borderRadius:16,padding:"14px 18px",background:"#f25445",color:"#fff",fontSize:14,fontWeight:800,cursor:"pointer"}}>Verificar localização</button><button id="location-consent-dismiss" type="button" style={{width:"100%",marginTop:6,border:0,borderRadius:16,padding:"12px 18px",background:"transparent",color:"#746461",fontSize:14,fontWeight:700,cursor:"pointer"}}>Agora não</button></div></div>{children}<script dangerouslySetInnerHTML={{__html:LOCATION_PROMPT_SCRIPT}} /><noscript><img height="1" width="1" style={{display:"none"}} alt="" src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`} /></noscript></body></html>}
