export type Product = {
  id: string;
  name: string;
  cost: number; // VAT included
  price: number; // VAT included list price
  vatRate: number; // % VAT on this product (sale and purchase)
  sizeUnits: number; // how many "slots" one unit takes in a box (1 = standard)
};

export type Box = {
  id: string;
  name: string;
  desi: number;
  capacity: number; // slots
};

export type TariffRow = {
  from: number;
  to: number;
  prices: number[]; // one per zone, VAT & EPH excluded
  perDesi: boolean; // price is per desi (e.g. 31+ row)
};

export type Settings = {
  products: Product[];
  boxes: Box[];
  zones: string[];
  zoneIndex: number;
  tariff: TariffRow[];
  shippingVatRate: number; // % added on top of tariff
  ephRate: number; // % added on top of tariff (Evrensel Hizmet Payı)
  commissionRate: number; // % of product revenue (after discounts)
  commissionVatRate: number; // VAT contained in the commission (for VAT settlement)
  customerShippingFee: number; // VAT included
  freeShippingThreshold: number; // product revenue after all discounts
  overflowRemainderBestFit: boolean; // 13 items: false = 2x large, true = large + small
  deductVat: boolean; // subtract VAT payable (output - input) from profit
};

export type UnitDiscount =
  | { type: 'none' }
  | { type: 'percent'; value: number }
  | { type: 'flat'; value: number }
  | { type: 'fixed'; value: number };

export type Bundle =
  | { type: 'none' }
  | { type: 'buyXpayY'; buy: number; pay: number }
  | { type: 'xForPrice'; qty: number; price: number };

export type ProductCampaign = {
  id: string;
  name: string;
  unit: UnitDiscount;
  minQty: number; // unit discount only applies from this quantity
  bundle: Bundle;
};

export type CartTier = { min: number; type: 'percent' | 'flat'; value: number };

export type CartCampaign = { id: string; name: string; tiers: CartTier[] };

export type Scenario = {
  id: string;
  name: string;
  productCampaigns: Record<string, string | null>; // productId -> campaignId
  cartCampaignId: string | null;
};

export type AppState = {
  settings: Settings;
  productCampaigns: ProductCampaign[];
  cartCampaigns: CartCampaign[];
  scenarios: Scenario[];
};

export type Cart = Record<string, number>; // productId -> qty
