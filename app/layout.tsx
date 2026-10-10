import type { Metadata, Viewport } from "next";
import "./globals.css";
import { MetaPixel } from "./meta-pixel";
const META_PIXEL_ID = "1442564798019869";
export const metadata: Metadata = { title:"Sushi House | Delivery japonês", description:"Cardápio online da Sushi House. Combos, sushis, temakis e pratos quentes com entrega rápida.", icons:{icon:"/sushi-house-logo.webp",shortcut:"/sushi-house-logo.webp",apple:"/sushi-house-logo.webp"} };
export const viewport: Viewport = { themeColor:"#0b1116",width:"device-width",initialScale:1 };
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="pt-BR"><head><link rel="preload" as="image" href="/festival-inauguracao.webp" type="image/webp" fetchPriority="high" /></head><body><MetaPixel />{children}<noscript><img height="1" width="1" style={{display:"none"}} alt="" src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`} /></noscript></body></html>}
