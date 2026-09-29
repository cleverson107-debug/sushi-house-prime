import type { Metadata, Viewport } from "next";
import "./globals.css";
export const metadata: Metadata = { title:"Sushi House | Delivery japonês", description:"Cardápio online da Sushi House. Combos, sushis, temakis e pratos quentes com entrega rápida.", icons:{icon:"/sushi-house-logo.png",shortcut:"/sushi-house-logo.png",apple:"/sushi-house-logo.png"} };
export const viewport: Viewport = { themeColor:"#0b1116",width:"device-width",initialScale:1 };
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="pt-BR"><body>{children}</body></html>}
