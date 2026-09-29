"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Award,
  ChevronRight,
  Clock3,
  Gift,
  MapPin,
  Minus,
  Plus,
  Search,
  ShoppingBag,
  Star,
  Store,
  Truck,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { categories, money, products, type Product } from "./menu-data";
type CartItem = Product & {
  quantity: number;
  extras: string[];
  note?: string;
};
const extraPrice = (e: string) =>
  Number(e.match(/R\$\s*([\d,]+)/)?.[1].replace(",", ".") || 0);
const baseExtras = [
  "Molho tarê artesanal · Grátis",
  "Shoyu · Grátis",
  "Wasabi · Grátis",
  "Gengibre · Grátis",
  "Hashi · Grátis",
];
function FoodVisual({
  product,
  large = false,
}: {
  product: Product;
  large?: boolean;
}) {
  const isDrink = product.category === "Bebidas";
  const imageSrc = large
    ? product.image
    : product.image.replace("/products/optimized/", "/products/thumbs/");
  return (
    <div
      className={`relative shrink-0 overflow-hidden ${isDrink ? "bg-white" : "bg-[#eee8e4]"} ${large ? "h-60 w-full rounded-2xl sm:h-72" : "h-28 w-28 rounded-xl sm:h-32 sm:w-36"}`}
    >
      {isDrink ? (
        <img
          src={imageSrc}
          alt={product.name}
          className="h-full w-full object-contain p-2 transition duration-500 group-hover:scale-[1.03] sm:p-3"
        />
      ) : (
        <Image
          src={imageSrc}
          alt={product.name}
          fill
          sizes={large ? "(max-width: 640px) 100vw, 576px" : "144px"}
          className="object-cover transition duration-500 group-hover:scale-[1.03]"
        />
      )}
    </div>
  );
}
export default function Home() {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Product | null>(null);
  const [qty, setQty] = useState(1);
  const [extras, setExtras] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartReady, setCartReady] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkout, setCheckout] = useState(false);
  const [location, setLocation] = useState("Localização não definida");
  const [locating, setLocating] = useState(false);
  useEffect(() => {
    const schema = localStorage.getItem("sushi-house-cart-schema");
    if (schema !== "4") {
      localStorage.removeItem("sushi-house-cart");
      localStorage.removeItem("sushi-house-cart-v2");
      localStorage.removeItem("sushi-house-cart-v3");
      localStorage.setItem("sushi-house-cart-schema", "4");
      setCart([]);
    } else {
      const saved = localStorage.getItem("sushi-house-cart-v3");
      if (saved) {
        try {
          setCart(JSON.parse(saved));
        } catch {
          localStorage.removeItem("sushi-house-cart-v3");
          setCart([]);
        }
      }
    }
    setCartReady(true);
  }, []);
  useEffect(() => {
    if (cartReady)
      localStorage.setItem("sushi-house-cart-v3", JSON.stringify(cart));
  }, [cart, cartReady]);
  useEffect(() => {
    const controller = new AbortController();
    const detectLocation = async () => {
      setLocating(true);
      try {
        const response = await fetch("/api/location", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Localização indisponível");
        const data: { city: string | null; state: string | null } =
          await response.json();
        if (data.city)
          setLocation(`${data.city}${data.state ? `/${data.state}` : ""}`);
      } catch (error) {
        if ((error as Error).name !== "AbortError")
          setLocation("Localização não definida");
      } finally {
        if (!controller.signal.aborted) setLocating(false);
      }
    };
    detectLocation();
    return () => controller.abort();
  }, []);
  const locate = () => {
    if (!navigator.geolocation) return setLocation("Localização indisponível");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const r = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.latitude}&lon=${coords.longitude}&zoom=10&accept-language=pt-BR`,
          );
          const d = await r.json();
          const city =
            d.address.city ||
            d.address.town ||
            d.address.municipality ||
            "Sua região";
          const state =
            d.address["ISO3166-2-lvl4"]?.split("-")[1] ||
            d.address.state_code ||
            d.address.state ||
            "";
          setLocation(
            `${city}${state ? `/${String(state).toUpperCase()}` : ""}`,
          );
        } catch {
          setLocation("Localização autorizada");
        }
        setLocating(false);
      },
      () => {
        setLocation("Toque para permitir localização");
        setLocating(false);
      },
      { timeout: 8000 },
    );
  };
  const filtered = useMemo(
    () =>
      products.filter((p) =>
        `${p.name} ${p.description} ${p.category}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [query],
  );
  const total = cart.reduce(
    (s, i) =>
      s +
      (i.price + i.extras.reduce((x, e) => x + extraPrice(e), 0)) * i.quantity,
    0,
  );
  const count = cart.reduce((s, i) => s + i.quantity, 0);
  const openProduct = (p: Product) => {
    setSelected(p);
    setQty(1);
    setExtras([]);
    setNote("");
  };
  const add = () => {
    if (!selected) return;
    setCart((c) => [
      ...c,
      {
        ...selected,
        quantity: qty,
        extras,
        note: note.trim() || undefined,
      },
    ]);
    setSelected(null);
    setCartOpen(true);
  };
  return (
    <div className="storefront min-h-screen bg-white pb-28 text-[#271b19]">
      <header className="overflow-hidden bg-[#24100e] text-white shadow-sm">
        <div className="mx-auto max-w-5xl px-4 pt-4 sm:px-6">
          <button
            onClick={locate}
            className="flex items-center gap-2 text-left text-xs font-extrabold uppercase tracking-wide text-[#d9bdb7]"
          >
            <MapPin
              className={`size-4 text-[#ff5a43] ${locating ? "animate-pulse" : ""}`}
            />
            <span>
              {locating
                ? "Localizando…"
                : location === "Localização não definida"
                  ? "Sua região"
                  : location}
            </span>
          </button>
          <div className="flex items-start justify-between gap-3 py-4">
            <div className="flex min-w-0 items-start gap-3">
              <div className="relative size-16 shrink-0 overflow-hidden rounded-2xl border-4 border-white bg-white shadow-sm">
                <Image
                  src="/sushi-house-logo.webp"
                  alt="Logo Sushi House Prime"
                  fill
                  sizes="64px"
                  className="object-contain p-0.5"
                  priority
                />
              </div>
              <div className="min-w-0 pt-0.5">
                <div className="flex items-center gap-1.5">
                  <h1 className="truncate text-lg font-black tracking-tight sm:text-xl">
                    Sushi House Prime <span aria-hidden="true">🥢🍣</span>
                  </h1>
                </div>
                <div className="mt-1.5 flex items-center gap-1.5 whitespace-nowrap text-[11px] sm:text-xs">
                  <span className="flex items-center gap-1 font-extrabold text-[#ffc400]">
                    <Star className="size-3.5 fill-current" />
                    4,9
                  </span>
                  <span className="text-[#d8c1bb]">(287 avaliações)</span>
                </div>
                <div className="mt-2 flex items-center gap-1.5 text-[11px] font-bold text-emerald-400">
                  <span className="size-1.5 rounded-full bg-emerald-400" />
                  Aberto agora
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[10px] font-bold text-[#e1ccc6] sm:text-[11px]">
                  <span className="text-emerald-400">Entrega grátis</span>
                  <span className="flex items-center gap-1">
                    <Clock3 className="size-3" />
                    30–45 min
                  </span>
                  <span>Pedido rastreável</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setCartOpen(true)}
              className="relative grid size-11 shrink-0 place-items-center rounded-full border border-white/15 bg-white/8"
              aria-label="Abrir pedido"
            >
              <ShoppingBag className="size-5" />
              {count > 0 && (
                <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-[#ff5a43] text-[11px] font-bold">
                  {count}
                </span>
              )}
            </button>
          </div>
        </div>
        <div className="border-y border-[#f4ae00]/55 bg-[linear-gradient(90deg,#512019,#2a100e)]">
          <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3 sm:px-6">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#ffbd00] text-[#40120e]">
              <Gift className="size-6" />
            </span>
            <div>
              <p className="text-[10px] font-black uppercase tracking-wide text-white">
                Cupom exclusivo
              </p>
              <p className="text-sm font-extrabold text-white">
                R$ 5 OFF em pedidos acima de R$ 20 —{" "}
                <span className="text-[#ffc400]">CUPOM5</span>
              </p>
            </div>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 sm:px-6">
        <section className="relative my-5 flex min-h-[260px] w-full items-center overflow-hidden rounded-[1.4rem] border border-[#a92a21]/25 px-5 py-7 shadow-[0_12px_35px_rgba(70,20,12,.18)] sm:min-h-[330px] sm:px-8 sm:py-9">
          <img
            src="/festival-inauguracao.webp"
            alt=""
            fetchPriority="high"
            loading="eager"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover object-[66%_center] sm:object-center"
            aria-hidden="true"
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(24,5,4,.96)_0%,rgba(40,9,7,.84)_43%,rgba(40,9,7,.18)_72%,rgba(40,9,7,.04)_100%)]" />
          <div className="relative z-10 w-full max-w-[72%] sm:max-w-xl">
            <h1 className="whitespace-nowrap font-serif text-[clamp(1.25rem,5.2vw,2.5rem)] font-bold leading-none tracking-[-.025em] text-white drop-shadow-sm">
              Festival de Inauguração
            </h1>
            <div className="mt-4 inline-flex whitespace-nowrap rounded-lg border border-[#ffd36f]/35 bg-black/25 px-2.5 py-2 text-[10px] font-bold text-[#ffe6a9] sm:px-3 sm:text-xs">
              Combo Festival: de R$ 54,90 por R$ 34,90
            </div>
            <p className="mt-4 max-w-md text-sm font-medium leading-relaxed text-white/90 drop-shadow-sm">
              Combos autorais, salmão fresco e sabores da casa com condições
              especiais de abertura.
            </p>
            <a
              href="#Ofertas"
              className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#f15a46] px-4 py-2.5 text-sm font-bold text-white shadow-lg"
            >
              Ver ofertas <ChevronRight className="size-4" />
            </a>
          </div>
        </section>
        <label className="relative block">
          <Search className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[#8b817e]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-13 w-full rounded-xl border border-[#e9e3df] bg-[#faf8f6] pl-12 pr-4 text-base text-[#271b19] outline-none placeholder:text-[#928985] focus:border-[#f15a46]/70"
            placeholder="O que você quer comer hoje?"
          />
        </label>
        <nav className="sticky top-0 z-30 -mx-4 mt-4 border-y border-[#eee8e4] bg-white/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
          <div className="scrollbar-none flex gap-2 overflow-x-auto">
            {categories.map((c, i) => (
              <a
                key={c}
                href={`#${c}`}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${i === 0 ? "bg-[#f15a46] text-white" : "bg-[#f3efec] text-[#4d403c]"}`}
              >
                {c}
              </a>
            ))}
          </div>
        </nav>
        {categories.map((cat) => {
          const list = filtered.filter((p) => p.category === cat);
          if (!list.length) return null;
          return (
            <section
              key={cat}
              id={cat}
              className="scroll-mt-20 py-7 [contain-intrinsic-size:auto_520px] [content-visibility:auto]"
            >
              <div className="mb-4 flex items-end justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[.16em] text-[#b77a20]">
                    Sushi House
                  </p>
                  <h2 className="mt-1 font-serif text-2xl font-bold text-[#271b19]">
                    {cat}
                  </h2>
                </div>
                <span className="text-xs text-[#8b817e]">
                  {list.length} itens
                </span>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {list.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => openProduct(p)}
                    className="flex min-h-36 w-full items-center gap-4 rounded-2xl border border-[#ece5e1] bg-white p-3 text-left shadow-[0_3px_14px_rgba(70,32,22,.05)] transition hover:-translate-y-0.5 hover:border-[#f15a46]/35"
                  >
                    <div className="min-w-0 flex-1 self-stretch py-1">
                      {p.badge && (
                        <span className="mb-2 inline-flex rounded bg-[#f15a46]/10 px-2 py-1 text-[10px] font-extrabold tracking-wide text-[#d84231]">
                          {p.badge}
                        </span>
                      )}
                      <h3 className="text-base font-bold leading-tight text-[#271b19]">
                        {p.name}
                      </h3>
                      <p className="mt-1 line-clamp-2 text-sm leading-snug text-[#766b67]">
                        {p.description}
                      </p>
                      <div className="mt-3 flex items-baseline gap-2">
                        {p.oldPrice && (
                          <span className="text-xs text-[#a39a96] line-through">
                            {money(p.oldPrice)}
                          </span>
                        )}
                        <span className="text-base font-extrabold text-[#b87516]">
                          {money(p.price)}
                        </span>
                      </div>
                    </div>
                    <FoodVisual product={p} />
                  </button>
                ))}
              </div>
            </section>
          );
        })}
        {filtered.length === 0 && (
          <div className="py-24 text-center">
            <Search className="mx-auto mb-4 size-8 text-[#68747a]" />
            <h2 className="text-xl font-bold">Nenhum prato encontrado</h2>
          </div>
        )}
      </main>
      <footer className="border-t border-[#eee8e4] bg-[#faf8f6] px-4 pb-32 pt-10 text-center text-sm text-[#766b67]">
        <div className="mb-3 font-serif text-lg font-bold text-[#271b19]">
          SUSHI HOUSE
        </div>
        <p>Terça a domingo · 18h às 02h</p>
        <p className="mt-1">Entrega grátis até 00h · Consulte sua região</p>
        <Link
          href="/admin"
          className="mt-5 inline-block text-xs underline underline-offset-4"
        >
          Acessar administração
        </Link>
      </footer>
      {count > 0 && (
        <button
          onClick={() => setCartOpen(true)}
          className="fixed bottom-4 left-1/2 z-40 flex w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 items-center justify-between rounded-2xl bg-[#f15a46] px-5 py-4 shadow-[0_16px_44px_rgba(0,0,0,.55)]"
        >
          <span className="flex items-center gap-3">
            <span className="grid size-7 place-items-center rounded-full bg-white/18 text-xs font-extrabold">
              {count}
            </span>
            <b>Ver pedido</b>
          </span>
          <b>{money(total)}</b>
        </button>
      )}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-h-[94vh] overflow-y-auto border-[#e9e3df] bg-white p-0 text-[#271b19] sm:max-w-xl">
          <div className="sticky top-0 z-20 flex items-center justify-between border-b border-[#eee8e4] bg-white/95 px-4 py-2 backdrop-blur sm:px-5">
            <span className="text-sm font-extrabold">Detalhes do produto</span>
            <button
              type="button"
              onClick={() => setSelected(null)}
              aria-label="Fechar detalhes e voltar ao cardápio"
              className="grid size-11 place-items-center rounded-full border border-[#e5ddda] bg-white text-[#271b19] shadow-sm transition hover:border-[#f15a46] hover:bg-[#fff2eb] hover:text-[#d84231]"
            >
              <X className="size-5" />
            </button>
          </div>
          {selected && (
            <div className="space-y-5 p-4 sm:p-6">
              <FoodVisual product={selected} large />
              <DialogHeader>
                {selected.badge && (
                  <span className="w-fit rounded-full bg-[#f15a46]/10 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wide text-[#d84231]">
                    {selected.badge}
                  </span>
                )}
                <DialogTitle className="font-serif text-2xl text-[#271b19]">
                  {selected.name}
                </DialogTitle>
                <DialogDescription className="text-sm leading-relaxed text-[#766b67]">
                  {selected.description}
                </DialogDescription>
              </DialogHeader>
              <div className="flex items-end justify-between border-y border-[#eee8e4] py-4">
                <div>
                  <div className="flex items-center gap-2">
                    <b className="text-2xl text-[#b87516]">
                      {money(
                        (selected.price +
                          extras.reduce(
                            (sum, extra) => sum + extraPrice(extra),
                            0,
                          )) *
                          qty,
                      )}
                    </b>
                    {selected.oldPrice && (
                      <>
                        <span className="text-sm text-[#9e9591] line-through">
                          {money(selected.oldPrice * qty)}
                        </span>
                        <span className="rounded bg-emerald-50 px-2 py-1 text-xs font-extrabold text-emerald-700">
                          -
                          {Math.round(
                            (1 - selected.price / selected.oldPrice) * 100,
                          )}
                          %
                        </span>
                      </>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-[#766b67]">
                    {qty > 1
                      ? `Total para ${qty} itens no PIX`
                      : "Preço especial no PIX"}
                  </p>
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-[#e9e3df] bg-[#faf8f6] p-1">
                  <button
                    onClick={() => setQty(Math.max(1, qty - 1))}
                    className="grid size-9 place-items-center rounded-lg hover:bg-white"
                    aria-label="Diminuir quantidade"
                  >
                    <Minus className="size-4" />
                  </button>
                  <b>{qty}</b>
                  <button
                    onClick={() => setQty(qty + 1)}
                    className="grid size-9 place-items-center rounded-lg hover:bg-white"
                    aria-label="Aumentar quantidade"
                  >
                    <Plus className="size-4" />
                  </button>
                </div>
              </div>
              {!selected.oldPrice && (
                <div className="flex gap-3 rounded-2xl border border-[#ead9a9] bg-[#fff9e9] p-4">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#ffbd00] text-[#4b2700]">
                    <Award className="size-5" />
                  </span>
                  <div>
                    <b className="text-sm text-[#4b2700]">
                      Resgate a partir de {Math.round(selected.price * 22)}{" "}
                      pontos
                    </b>
                    <p className="mt-1 text-xs leading-relaxed text-[#75613a]">
                      Adicione à sacola e solicite o resgate ao finalizar o
                      pedido.
                    </p>
                  </div>
                </div>
              )}
              <ExtrasSelector
                product={selected}
                selected={extras}
                onChange={setExtras}
              />
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="font-bold">Alguma observação?</h3>
                  <span className="text-xs text-[#8b817e]">
                    {note.length} / 140
                  </span>
                </div>
                <Textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value.slice(0, 140))}
                  maxLength={140}
                  placeholder="Ex.: sem cebolinha, separar molhos…"
                  className="min-h-24 resize-none border-[#e9e3df] bg-[#faf8f6] text-[#271b19]"
                />
              </div>
              <button
                onClick={add}
                className="flex h-14 w-full items-center justify-between rounded-xl bg-[#f15a46] px-5 font-extrabold text-white shadow-lg"
              >
                <span>Adicionar</span>
                <span>
                  {money(
                    (selected.price +
                      extras.reduce((x, e) => x + extraPrice(e), 0)) *
                      qty,
                  )}
                </span>
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <Sheet open={cartOpen} onOpenChange={setCartOpen}>
        <SheetContent
          side="right"
          className="w-full border-white/10 bg-[#0f171d] text-[#f8f1e6] sm:max-w-md"
        >
          <SheetHeader>
            <SheetTitle className="font-serif text-2xl">Seu pedido</SheetTitle>
            <SheetDescription className="text-[#89969c]">
              Revise os itens antes de continuar.
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-4">
            {cart.length === 0 ? (
              <EmptyCart />
            ) : !checkout ? (
              <>
                <div className="space-y-2">
                  {cart.map((i, n) => (
                    <div
                      key={`${i.id}-${n}`}
                      className="rounded-xl border border-white/8 bg-white/4 p-3"
                    >
                      <div className="flex gap-3">
                        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#f15a46]/14 text-sm font-bold text-[#ff7965]">
                          {i.quantity}x
                        </span>
                        <div className="min-w-0 flex-1">
                          <b className="text-sm">{i.name}</b>
                          {i.extras.map((e) => (
                            <p key={e} className="mt-1 text-xs text-[#89969c]">
                              + {e.split("·")[0]}
                            </p>
                          ))}
                          {i.note && (
                            <p className="mt-1 text-xs italic text-[#766b67]">
                              Obs.: {i.note}
                            </p>
                          )}
                          <p className="mt-2 font-bold text-[#f1c977]">
                            {money(i.price * i.quantity)}
                          </p>
                        </div>
                        <button
                          onClick={() =>
                            setCart((c) => c.filter((_, x) => x !== n))
                          }
                        >
                          <X className="size-4 text-[#7d898f]" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="space-y-2 border-t border-white/8 py-4 text-sm">
                  <div className="flex justify-between text-[#9aa5aa]">
                    <span>Subtotal</span>
                    <span>{money(total)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-400">
                    <span>Entrega até 00h</span>
                    <span>Grátis</span>
                  </div>
                  <div className="flex justify-between pt-2 text-lg font-extrabold">
                    <span>Total no PIX</span>
                    <span>{money(total)}</span>
                  </div>
                </div>
                <button
                  onClick={() => setCheckout(true)}
                  className="mb-5 h-13 w-full rounded-xl bg-[#f15a46] font-extrabold"
                >
                  CONTINUAR PARA ENTREGA
                </button>
              </>
            ) : (
              <Checkout
                total={total}
                cart={cart}
                onBack={() => setCheckout(false)}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
function EmptyCart() {
  return (
    <div className="grid h-full place-items-center text-center">
      <div>
        <ShoppingBag className="mx-auto mb-3 size-9 text-[#68747a]" />
        <p className="font-bold">Seu pedido está vazio</p>
        <p className="mt-1 text-sm text-[#829097]">
          Escolha seus favoritos no cardápio.
        </p>
      </div>
    </div>
  );
}
function ExtrasSelector({
  selected,
  onChange,
}: {
  product: Product;
  selected: string[];
  onChange: (value: string[]) => void;
}) {
  const addOne = (item: string) => {
    if (selected.length < 5) onChange([...selected, item]);
  };
  const removeOne = (item: string) => {
    const index = selected.lastIndexOf(item);
    if (index >= 0) onChange(selected.filter((_, i) => i !== index));
  };
  return (
    <div>
      <div className="mb-3 flex items-end justify-between">
        <div>
          <h3 className="font-bold">Adicionais gratuitos</h3>
          <p className="text-xs text-[#766b67]">
            Escolha até 5 itens, iguais ou diferentes
          </p>
        </div>
        <span
          className={`text-xs font-bold ${selected.length === 5 ? "text-[#d84231]" : "text-[#8b817e]"}`}
        >
          {selected.length}/5
        </span>
      </div>
      <div className="space-y-2">
        {baseExtras.map((item) => {
          const amount = selected.filter((x) => x === item).length;
          const [name, price] = item.split(" · ");
          return (
            <div
              key={item}
              className={`flex items-center gap-3 rounded-xl border p-3 transition ${amount > 0 ? "border-[#f15a46] bg-[#fff2eb]" : "border-[#e9e3df] bg-white"}`}
            >
              <span className="min-w-0 flex-1 text-sm font-semibold text-[#271b19]">
                {name}
              </span>
              <span className="shrink-0 text-xs font-bold text-emerald-700">
                {price}
              </span>
              <div className="flex shrink-0 items-center gap-1 rounded-lg border border-[#e1d8d4] bg-white p-0.5">
                <button
                  type="button"
                  onClick={() => removeOne(item)}
                  disabled={amount === 0}
                  aria-label={`Remover ${name}`}
                  className="grid size-8 place-items-center rounded-md text-[#5b4c47] transition hover:bg-[#f5eeea] disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <Minus className="size-4" />
                </button>
                <span className="w-5 text-center text-sm font-extrabold">
                  {amount}
                </span>
                <button
                  type="button"
                  onClick={() => addOne(item)}
                  disabled={selected.length === 5}
                  aria-label={`Adicionar ${name}`}
                  className="grid size-8 place-items-center rounded-md bg-[#f15a46] text-white transition hover:bg-[#d94a38] disabled:cursor-not-allowed disabled:bg-[#d7cfcb]"
                >
                  <Plus className="size-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
type PixCheckout = {
  transactionId: string;
  copyPaste: string;
  qrImage?: string;
  status: string;
};

function Checkout({
  total,
  cart,
  onBack,
}: {
  total: number;
  cart: CartItem[];
  onBack: () => void;
}) {
  const pixTotal = total;
  const [mode, setMode] = useState("delivery");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pix, setPix] = useState<PixCheckout | null>(null);
  const [qrImage, setQrImage] = useState("");
  const [paidAt, setPaidAt] = useState("");
  const [now, setNow] = useState(Date.now());
  const [cep, setCep] = useState("");
  const [street, setStreet] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [city, setCity] = useState("");
  const [uf, setUf] = useState("");
  const [cepStatus, setCepStatus] = useState("");
  useEffect(() => {
    if (!pix?.copyPaste || pix.qrImage) {
      setQrImage(pix?.qrImage || "");
      return;
    }
    import("qrcode")
      .then(({ default: QRCode }) =>
        QRCode.toDataURL(pix.copyPaste, { width: 320, margin: 1 }),
      )
      .then(setQrImage)
      .catch(() => setQrImage(""));
  }, [pix]);
  useEffect(() => {
    if (!pix || paidAt) return;
    const check = async () => {
      try {
        const response = await fetch(
          `/api/pix/status?id=${encodeURIComponent(pix.transactionId)}`,
          { cache: "no-store" },
        );
        const data = await response.json();
        if (response.ok && data.paid)
          setPaidAt(data.paidAt || new Date().toISOString());
      } catch {}
    };
    check();
    const timer = window.setInterval(check, 5000);
    return () => window.clearInterval(timer);
  }, [pix, paidAt]);
  useEffect(() => {
    if (!paidAt) return;
    const timer = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, [paidAt]);
  const lookupCep = async (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 8);
    setCep(
      digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits,
    );
    if (digits.length !== 8) {
      setCepStatus("");
      return;
    }
    setCepStatus("Buscando endereço…");
    try {
      const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      if (!response.ok) throw new Error("Falha na consulta");
      const data = await response.json();
      if (data.erro) {
        setCepStatus("CEP não encontrado. Verifique os números.");
        setStreet("");
        setNeighborhood("");
        setCity("");
        setUf("");
        return;
      }
      setStreet(data.logradouro || "");
      setNeighborhood(data.bairro || "");
      setCity(data.localidade || "");
      setUf(data.uf || "");
      setCepStatus(
        data.logradouro
          ? "Endereço encontrado. Confira e informe o número."
          : "Cidade encontrada. Complete a rua e o número.",
      );
    } catch {
      setCepStatus(
        "Não foi possível consultar agora. Preencha o endereço manualmente.",
      );
    }
  };
  if (paidAt) {
    const elapsed = now - new Date(paidAt).getTime();
    const stage =
      elapsed < 20 * 60_000
        ? "preparing"
        : elapsed < 80 * 60_000
          ? "delivery"
          : "done";
    const stageIndex = stage === "preparing" ? 1 : stage === "delivery" ? 2 : 3;
    const trackingSteps = [
      {
        title: "Pagamento confirmado",
        description: "Recebemos o pagamento do seu pedido.",
      },
      {
        title: "Pedido sendo preparado",
        description: "Nossa cozinha está preparando tudo com cuidado.",
      },
      {
        title: "Pedido enviado",
        description: "O entregador saiu e seu pedido está a caminho.",
      },
      {
        title: "Pedido entregue",
        description: "Entrega concluída. Bom apetite!",
      },
    ];
    return (
      <div className="pb-10 pt-5">
        <div className="mx-auto grid size-16 place-items-center rounded-full bg-emerald-400/15 text-3xl">
          ✓
        </div>
        <h3 className="mt-4 text-center font-serif text-2xl font-bold">
          {stage === "preparing"
            ? "Pedido sendo preparado"
            : stage === "delivery"
              ? "Pedido enviado"
              : "Pedido entregue"}
        </h3>
        <p className="mt-2 text-center text-sm text-[#93a0a6]">
          Acompanhe abaixo cada etapa do seu pedido.
        </p>

        <div className="mt-6 rounded-2xl border border-[#e8dfda] bg-[#faf8f6] p-3">
          <p className="mb-3 text-xs font-bold uppercase tracking-widest text-[#8a6a3a]">
            Itens pagos
          </p>
          <div className="space-y-3">
            {cart.map((item, index) => (
              <div
                key={`${item.id}-${index}`}
                className="flex items-center gap-3 rounded-xl bg-white p-2 shadow-sm"
              >
                <img
                  src={item.image}
                  alt={item.name}
                  className="size-16 shrink-0 rounded-lg bg-white object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm font-extrabold">
                    {item.quantity}x {item.name}
                  </p>
                  <p className="mt-1 text-xs text-[#766b67]">
                    Pagamento confirmado
                  </p>
                </div>
                <b className="shrink-0 text-sm text-[#b87516]">
                  {money(item.price * item.quantity)}
                </b>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-[#e8dfda] px-1 pt-3">
            <span className="text-sm text-[#766b67]">Total pago</span>
            <strong className="text-lg text-[#271b19]">{money(total)}</strong>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-[#e8dfda] bg-[#faf8f6] p-4">
          <p className="mb-5 text-xs font-bold uppercase tracking-widest text-[#8a6a3a]">
            Acompanhe seu pedido
          </p>
          <div>
            {trackingSteps.map((step, index) => {
              const completed = index < stageIndex;
              const active = index === stageIndex;
              return (
                <div
                  key={step.title}
                  className="relative flex gap-3 pb-6 last:pb-0"
                >
                  {index < trackingSteps.length - 1 && (
                    <span
                      className={`absolute left-[15px] top-8 h-[calc(100%-1.25rem)] w-px ${completed ? "bg-emerald-400" : "bg-[#ddd5d0]"}`}
                    />
                  )}
                  <span
                    className={`relative z-10 grid size-8 shrink-0 place-items-center rounded-full border text-sm font-black ${completed ? "border-emerald-400 bg-emerald-400 text-white" : active ? "border-[#f15a46] bg-[#f15a46] text-white shadow-[0_0_0_5px_rgba(241,90,70,0.14)]" : "border-[#ddd5d0] bg-white text-[#9a908c]"}`}
                  >
                    {completed ? "✓" : index + 1}
                  </span>
                  <div className="pt-1">
                    <p
                      className={`text-sm font-extrabold ${active ? "text-[#d84a37]" : completed ? "text-emerald-600" : "text-[#817773]"}`}
                    >
                      {step.title}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-[#766b67]">
                      {step.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }
  if (pix)
    return (
      <div className="pb-8 text-center">
        <button
          type="button"
          onClick={onBack}
          className="mb-4 block text-sm text-[#b87516]"
        >
          Voltar ao pedido
        </button>
        <h3 className="font-serif text-2xl font-bold">Pague com PIX</h3>
        <p className="mt-2 text-sm text-[#93a0a6]">
          Escaneie o QR Code ou copie o código abaixo.
        </p>
        {qrImage ? (
          <img
            src={qrImage}
            alt="QR Code PIX"
            className="mx-auto mt-5 size-64 rounded-xl bg-white p-3"
          />
        ) : (
          <div className="mx-auto mt-5 grid size-64 place-items-center rounded-xl bg-white/5 text-sm text-[#93a0a6]">
            Gerando QR Code…
          </div>
        )}
        <div className="mt-5 rounded-xl border border-white/10 bg-white/5 p-3 text-left">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[#e5bc70]">
            PIX copia e cola
          </p>
          <p className="max-h-24 overflow-auto break-all text-xs text-[#c6d0d4]">
            {pix.copyPaste}
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigator.clipboard.writeText(pix.copyPaste)}
          className="mt-3 h-12 w-full rounded-xl bg-[#f15a46] font-extrabold text-white"
        >
          COPIAR CÓDIGO PIX
        </button>
        <div className="mt-4 rounded-lg bg-[#e5bc70]/8 p-3 text-sm font-bold text-[#e5bc70]">
          Aguardando confirmação do pagamento…
        </div>
      </div>
    );
  const submitPayment = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/pix/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          total: pixTotal,
          items: cart.map(({ id, quantity }) => ({ id, quantity })),
          customer: Object.fromEntries(form.entries()),
          mode,
        }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Não foi possível gerar o PIX.");
      setPix(data);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Não foi possível gerar o PIX.",
      );
    } finally {
      setLoading(false);
    }
  };
  return (
    <form onSubmit={submitPayment} className="pb-8">
      <button
        type="button"
        onClick={onBack}
        className="mb-4 text-sm text-[#b87516]"
      >
        Voltar ao pedido
      </button>
      <h3 className="font-serif text-xl font-bold">1. Seus dados</h3>
      <div className="mt-3 grid gap-3">
        <input
          required
          name="name"
          placeholder="Nome completo"
          className="field"
        />
        <input
          required
          name="email"
          type="email"
          placeholder="E-mail"
          className="field"
        />
        <input
          required
          name="document"
          inputMode="numeric"
          placeholder="CPF"
          className="field"
        />
        <input
          required
          name="phone"
          placeholder="WhatsApp com DDD"
          className="field"
        />
      </div>
      <h3 className="mt-7 font-serif text-xl font-bold">
        2. Como deseja receber?
      </h3>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {[
          ["delivery", "Entrega"],
          ["pickup", "Retirada"],
        ].map(([v, l]) => (
          <button
            key={v}
            type="button"
            onClick={() => setMode(v)}
            className={`rounded-xl border p-3 text-sm font-bold ${mode === v ? "border-[#f15a46] bg-[#f15a46]/10" : "border-[#e9e3df]"}`}
          >
            {l}
          </button>
        ))}
      </div>
      {mode === "delivery" && (
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <input
              required
              name="zipCode"
              placeholder="CEP"
              inputMode="numeric"
              autoComplete="postal-code"
              value={cep}
              onChange={(e) => lookupCep(e.target.value)}
              className="field"
            />
            {cepStatus && (
              <p
                className={`mt-1.5 text-xs ${cepStatus.includes("encontrado") || cepStatus.includes("encontrada") ? "text-emerald-700" : "text-[#766b67]"}`}
              >
                {cepStatus}
              </p>
            )}
          </div>
          <input
            required
            name="street"
            placeholder="Rua"
            autoComplete="address-line1"
            value={street}
            onChange={(e) => setStreet(e.target.value)}
            className="field col-span-2"
          />
          <input
            required
            name="streetNumber"
            placeholder="Número"
            inputMode="numeric"
            className="field"
          />
          <input
            required
            name="neighborhood"
            placeholder="Bairro"
            value={neighborhood}
            onChange={(e) => setNeighborhood(e.target.value)}
            className="field"
          />
          <input
            required
            name="city"
            placeholder="Cidade"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="field"
          />
          <input
            required
            name="state"
            placeholder="UF"
            maxLength={2}
            value={uf}
            onChange={(e) => setUf(e.target.value.toUpperCase())}
            className="field"
          />
          <input
            name="complement"
            placeholder="Complemento"
            autoComplete="address-line2"
            className="field col-span-2"
          />
          <input
            placeholder="Ponto de referência"
            className="field col-span-2"
          />
        </div>
      )}
      <h3 className="mt-7 font-serif text-xl font-bold">3. Pagamento</h3>
      <div className="mt-3 rounded-xl border border-[#e5bc70]/20 bg-[#e5bc70]/7 p-4">
        <b>Pagamento via PIX</b>
        <p className="mt-1 text-xs text-[#9ca7ac]">
          Preço especial de inauguração.
        </p>
        <div className="mt-4 flex justify-between border-t border-white/8 pt-4 text-lg font-extrabold">
          <span>Total</span>
          <span>{money(pixTotal)}</span>
        </div>
      </div>
      {error && (
        <p className="mt-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-300">
          {error}
        </p>
      )}
      <button
        disabled={loading}
        className="mt-4 h-13 w-full rounded-xl bg-[#f15a46] font-extrabold text-white disabled:opacity-60"
      >
        {loading ? "GERANDO PIX…" : `PAGAR ${money(pixTotal)} COM PIX`}
      </button>
    </form>
  );
}
