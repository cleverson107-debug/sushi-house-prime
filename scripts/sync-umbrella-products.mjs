import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { products } from "../app/menu-data.ts";

const API_URL = "https://api-gateway.umbrellapag.com/api/user/products";
const SITE_URL = "https://delivery-sushi-house.upnexa.com.br";
const root = path.resolve(import.meta.dirname, "..");

async function getApiKey() {
  if (process.env.UMBRELLAPAG_API_KEY) return process.env.UMBRELLAPAG_API_KEY;
  const contents = await fs.readFile(path.join(root, ".dev.vars"), "utf8");
  const line = contents.split(/\r?\n/).find((entry) => entry.startsWith("UMBRELLAPAG_API_KEY="));
  if (!line) throw new Error("UMBRELLAPAG_API_KEY não encontrada");
  return line.slice(line.indexOf("=") + 1).trim();
}

const apiKey = await getApiKey();
const headers = { "x-api-key": apiKey, "User-Agent": "UMBRELLAB2B/1.0" };

async function listExisting() {
  const found = [];
  for (let page = 1; ; page += 1) {
    const response = await fetch(`${API_URL}?limit=100&page=${page}`, { headers });
    const body = await response.json();
    if (!response.ok) throw new Error(body.message || `Falha ao listar produtos (${response.status})`);
    const rows = body?.data?.data || [];
    found.push(...rows);
    if (page >= Number(body?.data?.pages || 1)) return found;
  }
}

function mimeType(filename) {
  const extension = path.extname(filename).toLowerCase();
  if (extension === ".png") return "image/png";
  if (extension === ".webp") return "image/webp";
  return "image/jpeg";
}

async function createProduct(product) {
  const form = new FormData();
  form.set("title", product.name);
  form.set("description", product.description);
  form.set("shippingType", "PHYSICAL");
  form.set("status", "ACTIVE");
  form.set("unitPrice", String(Math.round(product.price * 100)));
  form.set("maxInstallments", "1");
  form.set("accessLink", `${SITE_URL}/#${encodeURIComponent(product.category)}`);
  form.set("additionalInfo", [product.category, product.pieces ? `${product.pieces} peças/unidades` : "", product.badge || ""].filter(Boolean).join(" · "));
  form.set("paymentMethod", JSON.stringify({ PIX: true, BOLETO: false, CREDIT_CARD: false }));

  const imagePath = path.join(root, "public", product.image.replace(/^\//, ""));
  try {
    let bytes = await fs.readFile(imagePath);
    let filename = path.basename(imagePath);
    let type = mimeType(imagePath);
    if (path.extname(imagePath).toLowerCase() === ".webp") {
      bytes = await sharp(bytes).jpeg({ quality: 90 }).toBuffer();
      filename = `${path.basename(imagePath, ".webp")}.jpg`;
      type = "image/jpeg";
    }
    form.append("images", new Blob([bytes], { type }), filename);
  } catch {
    // A ausência de imagem não impede a criação do produto.
  }

  const response = await fetch(API_URL, { method: "POST", headers, body: form });
  const body = await response.json();
  if (!response.ok || body.error) throw new Error(`${product.name}: ${body.message || JSON.stringify(body.error)}`);
  return body.data;
}

const limitArg = process.argv.find((value) => value.startsWith("--limit="));
const limit = limitArg ? Math.max(1, Number(limitArg.split("=")[1]) || 1) : Infinity;
const existing = await listExisting();
const existingTitles = new Set(existing.map((product) => String(product.title).trim().toLocaleLowerCase("pt-BR")));
const pending = products.filter((product) => !existingTitles.has(product.name.trim().toLocaleLowerCase("pt-BR"))).slice(0, limit);

let created = 0;
for (const product of pending) {
  const result = await createProduct(product);
  created += 1;
  console.log(`CRIADO ${created}/${pending.length}: ${product.name} (${result?.id || "sem id"})`);
}
console.log(JSON.stringify({ existing: existing.length, created, skipped: products.length - pending.length }, null, 2));
