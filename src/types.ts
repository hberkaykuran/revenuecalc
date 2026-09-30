export type Product = {
  id: string;
  name: string;
  cost: number; // VAT included
  price: number; // VAT included sale price
  vatRate: number; // % VAT inside price and cost (only used for the separate VAT figure)
  sizeUnits: number; // box slots one unit takes (1 = standard)
  barcode?: string;
  /** Commission by price band (Trendyol tariffs). Filled per channel; empty = the channel's flat rate. */
  commissionBands?: CommissionBand[];
};

/** Commission rate for a unit price between min and max (inclusive; null = open). */
export type CommissionBand = { min: number | null; max: number | null; rate: number };

export type Box = {
  id: string;
  name: string;
  desi: number;
  capacity: number; // slots
  packagingCost: number; // box, tape, label print… per box, VAT included
};

export type TariffRow = {
  from: number;
  to: number;
  prices: number[]; // one per zone, VAT & EPH excluded
  perDesi: boolean;
};

export type Settings = {
  products: Product[];
  boxes: Box[];
  zones: string[];
  zoneIndex: number;
  tariff: TariffRow[];
  shippingVatRate: number;
  ephRate: number;
  packagingVatRate: number;
  commissionRate: number;
  commissionVatRate: number;
  customerShippingFee: number;
  orderFee: number; // fixed platform fee per order (e.g. Trendyol service fee), VAT included
  freeShippingThreshold: number;
  overflowRemainderBestFit: boolean;
  deductVat: boolean; // off by default: VAT is tracked separately
};

/**
 * A campaign is one mechanic with its own numbers. Product mechanics run on
 * each selected product's line separately; cart mechanics run on the order.
 */
export type Mechanic =
  | { type: 'percentOff'; percent: number; minQty: number }
  | { type: 'amountOff'; amount: number; minQty: number } // TL off each unit
  | { type: 'fixedPrice'; price: number; minQty: number } // new unit price
  | { type: 'buyXPayY'; buy: number; pay: number }
  | { type: 'bundlePrice'; qty: number; price: number } // X pcs for P TL
  | { type: 'nthOff'; n: number; percent: number } // every Nth unit X% off
  | { type: 'qtyTiers'; tiers: { minQty: number; percent: number }[] }
  | { type: 'cartPercent'; percent: number; minAmount: number }
  | { type: 'cartAmount'; amount: number; minAmount: number }
  | { type: 'cartTiers'; mode: 'percent' | 'amount'; tiers: { minAmount: number; value: number }[] }
  | { type: 'freeShipping'; minAmount: number };

export type MechanicType = Mechanic['type'];

export type Campaign = {
  id: string;
  name: string; // empty = generated from the mechanic
  mechanic: Mechanic;
  productIds: string[]; // product mechanics only; empty = every product
  active: boolean;
};

/** Pair rules: key "idA|idB" (sorted) -> stacks or not. Missing = default rule. */
export type StackRules = Record<string, boolean>;

export type Scenario = {
  id: string;
  name: string;
  campaigns: Campaign[]; // active campaigns as they were saved
  stack: StackRules;
};

/** What the screens work with: one channel's settings, prices and campaigns. */
export type AppState = {
  version: 3;
  settings: Settings;
  campaigns: Campaign[];
  stack: StackRules;
  scenarios: Scenario[];
};

export type ChannelSettings = Omit<Settings, 'products'>;

/** A sales channel with its own agreement: fees, shipping, prices, commission tariffs and campaigns. */
export type Channel = {
  id: string;
  name: string;
  settings: ChannelSettings;
  prices: Record<string, number>; // productId -> sale price on this channel
  bands: Record<string, CommissionBand[]>; // productId -> commission bands
  campaigns: Campaign[];
  stack: StackRules;
  scenarios: Scenario[];
};

/** One row of a Trendyol commission tariff file. */
export type TariffOffer = {
  barcode: string;
  name: string;
  category: string;
  brand: string;
  listPrice: number; // Trendyol sale price (TSF)
  customerPrice: number; // price the customer sees, after promotions
  commissionBase: number; // price the commission is based on
  currentRate: number;
  bands: CommissionBand[];
  promo: string;
};

export type TariffSnapshot = { period: string; importedAt: string; offers: TariffOffer[] };

export type ProductBase = Omit<Product, 'price' | 'commissionBands'> & { price?: number };

export type Store = {
  version: 4;
  products: ProductBase[];
  channels: Channel[];
  channelId: string;
  tariffHistory: TariffSnapshot[];
};

export type Cart = Record<string, number>;
