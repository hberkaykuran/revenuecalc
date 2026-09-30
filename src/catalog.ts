/**
 * Mesh Stick's Shopify catalog, from hberkaykuran/meshstick-prod catalog/products.json
 * (active products; price is what the shopper pays, the sale price where there is one).
 * Costs are not in that repo, so they start at 0.
 */
export type CatalogItem = { sku: string; name: string; family: string; price: number; compareAt?: number; barcode?: string };

export const MESH_STICK_CATALOG: CatalogItem[] = [
  { sku: "MESH-KARMABITKICAYI", name: "Karma Bitki Çayı", family: "Bitki Çayı", price: 149.9 },
  { sku: "MESH-ROOIBOSVANILYACAYI", name: "Roybos Vanilya Aromalı Çay", family: "Bitki Çayı", price: 149.9 },
  { sku: "MESH-KLASIKHAZIRKAHVE", name: "Klasik Kahve", family: "Granül Kahve", price: 135.22, compareAt: 199.9 },
  { sku: "MESH-REGLDONEMICAYI", name: "Özel Gün Karışık Bitki Çayı", family: "Fonksiyonel Çay", price: 96.25 },
  { sku: "MESH-DETOXFORMCAYI", name: "Detox Karışık Bitki Çayı", family: "Fonksiyonel Çay", price: 149.9 },
  { sku: "MESH-ORMANMEYVELICAY", name: "Orman Meyveli Karışık Meyve Çayı", family: "Meyve Çayı", price: 136.49 },
  { sku: "MESH-YESILCAY", name: "Yeşil Çay", family: "Yeşil Çay", price: 149.9 },
  { sku: "MESH-NANECAYI", name: "Nane Çayı", family: "Bitki Çayı", price: 149.9 },
  { sku: "MESH-NARCAYI", name: "Nar Kabuklu Karışık Meyve Çayı", family: "Meyve Çayı", price: 148.86 },
  { sku: "MESH-GOLDGRANULKAHVE", name: "Gold Kahve", family: "Granül Kahve", price: 149.9 },
  { sku: "MESH-EARLGREYCAYI", name: "Bergamot Aromalı Siyah Çay", family: "Siyah Çay", price: 149.9 },
  { sku: "MESH-SIYAHCAY", name: "Siyah Çay", family: "Siyah Çay", price: 149.9 },
  { sku: "MESH-ELMACAYI", name: "Elmalı Karışık Bitki Çayı", family: "Meyve Çayı", price: 149.9 },
  { sku: "MESH-CVITAMINLIKARISIKCAY", name: "C Vitaminli Karışık Bitki Çayı", family: "Fonksiyonel Çay", price: 146.65 },
  { sku: "MESH-ZENCEFILLIMONCAYI", name: "Zencefil & Limon Kabuklu Bitki Çayı", family: "Bitki Çayı", price: 145.22 },
  { sku: "MESH-PASSIFLORALIPAPATYACAYI", name: "Anti-Stress Karışık Bitki Çayı", family: "Fonksiyonel Çay", price: 199.9 },
  { sku: "MESH-KAYISIFORMCAYI", name: "Kayısı Aromalı Karışık Bitki Çayı", family: "Fonksiyonel Çay", price: 153.14 },
  { sku: "MESH-CIKOLATALIYERBAMATE", name: "Çikolata Aromalı Mate Çayı", family: "Bitki Çayı", price: 146.74 },
  { sku: "MESH-EMZIRENANNECAYI", name: "Emziren Anne Çayı", family: "Fonksiyonel Çay", price: 95.9, compareAt: 147.41 },
  { sku: "MESH-BAHARATCAYI", name: "Baharat Çayı", family: "Fonksiyonel Çay", price: 182.21 },
  { sku: "MESH-MANGOLUYESILCAY", name: "Mango Aromalı Yeşil Çay", family: "Yeşil Çay", price: 144.91 },
  { sku: "MESH-KUSBURNUCAYI", name: "Kuşburnu Karışık Meyve Çayı", family: "Meyve Çayı", price: 134.4, compareAt: 149.9 },
  { sku: "MESH-YASEMINLIYESILCAY", name: "Yeşil Çay Yasemin", family: "Yeşil Çay", price: 149.54 },
  { sku: "MESH-KIRAZSAPLICAY", name: "Kiraz Saplı Form Çayı", family: "Fonksiyonel Çay", price: 151.17 },
  { sku: "MESH-ADACAYI", name: "Adaçayı", family: "Bitki Çayı", price: 151.01 },
  { sku: "MESH-PAPATYALIYESILCAY", name: "Yeşil Çay Papatya", family: "Yeşil Çay", price: 142.87 },
  { sku: "MESH-MATCHA-SAF", name: "Saf Matcha", family: "Matcha", price: 429.9, barcode: "8683295371103" },
  { sku: "MESH-MATCHA-CILEK", name: "Çilek Vanilya Aromalı Matcha", family: "Matcha", price: 429.9, barcode: "8683295371257" },
  { sku: "MESH-MATCHA-MANGO", name: "Mango Vanilya Aromalı Matcha", family: "Matcha", price: 429.9, barcode: "8683295371264" },
  { sku: "MESH-MATCHA-KAP-SAF", name: "Saf Matcha Kapsül", family: "Matcha", price: 429.9, barcode: "8683295371233" },
  { sku: "MESH-MATCHA-KAP-MANGO", name: "Mango Vanilya Aromalı Matcha Kapsül", family: "Matcha", price: 316.94 },
  { sku: "MESH-MATCHA-KAP-CILEK", name: "Çilek Vanilya Aromalı Matcha Kapsül", family: "Matcha", price: 315.91 },
];
