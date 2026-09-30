# Revenue calculator

Profit and margin per order after campaigns, commission, shipping, packaging and VAT, for two separate sales channels. Turkish and English. Everything is editable and saved in the browser; export/import a JSON file to move it.

- **Shopify**: payment/platform commission, DHL eCommerce tariff by total desi, shipping fee and free-shipping threshold for the customer.
- **Trendyol**: its own products, prices, costs, campaigns and settings, saved apart from Shopify (switch at the top of the navigation). Nothing is shared.

```sh
npm install
npm run dev             # local dev server
npm test                # engine, strategy and translation tests
npm run build           # static site in dist/
npm run build:artifact  # single page in dist-artifact/ (React, Ant Design and icons from CDNs)
```

## Campaigns

A campaign is one mechanic with its own numbers, picked from presets or set by hand:

| Product campaigns (per product line) | Cart campaigns (whole order) |
|---|---|
| % off each unit, TL off each unit, new unit price (each optionally from a quantity) | % off the cart over an amount |
| Buy X pay Y, X pieces for a price, every Nth unit off, quantity tiers | TL off the cart over an amount, cart tiers, free shipping over an amount |

Any number of campaigns can be on. **Combination rules** decide which may apply to the same order. By default:
- free shipping stacks with everything
- product and cart campaigns stack
- two campaigns on the same product don't stack
- two cart discounts don't stack

Any pair can be changed. When rules clash, the customer gets the combination that makes their order cheapest, the way marketplaces apply the best offer.

## How an order is calculated

1. Unit price changes, then line mechanics, on each product.
2. Cart campaigns, checked on the total after product campaigns.
3. The shipping fee is charged unless the product total after all discounts reaches the free-shipping threshold (or a free-shipping campaign).
4. Commission is taken on the product total after discounts; shipping is excluded.
5. Boxes: the smallest box that fits; above the largest box, whole large boxes. Shipping cost = tariff for the total desi + EPH + VAT, plus packaging per box.
6. Profit = customer pays − commission − shipping − packaging − cost of goods. Prices and costs include VAT. VAT payable is shown separately and is only deducted if you switch that on.

## Ideas

Pick a goal: bigger baskets, reach free shipping, cross-sell, or win more orders. Enter how your orders split by quantity today. The generator tries preset and goal-sized campaigns, and pairs of product and cart campaigns. It keeps the ones within your margin and customer-saving limits and ranks them by **break-even**: the share of customers who must change their order for the campaign to beat doing nothing. Discounts given to customers who would have bought anyway count as a cost.

## Trendyol

Costs follow Trendyol's public rules (checked 30 September 2026). Every number is editable in Products & costs, and the ones that depend on the seller's contract are marked **confirm** there, with sources.

| Cost | Default | Source |
|---|---|---|
| Shipping | Seller pays; the customer pays none | [Yengeç](https://yengec.co/blog/trendyol-kargo-ucretleri/) |
| Cargo by desi | Trendyol's contracted list of 13 July 2026, per carrier (Aras, DHL eCommerce, Kolay Gelsin, PTT, Sürat, TEX, Yurtiçi), 0–50 desi, then per desi; VAT excluded, postal fee included | [Trendyol price list (PDF)](https://tymp.mncdn.com/prod/documents/engagement/kargo/trendyol_guncel_kargo_fiyatlari.pdf) |
| Cargo price tiers (barem) | Up to 10 desi: orders under 200 TL and under 350 TL ship at a fixed price per carrier (TEX 68.74 / 74.16 TL, or 34.16 / 65.83 TL with 1-day handover, Hızlı Teslimat or Bugün Kargoda) | [EZV, 13 July 2026 update](https://ezv.com.tr/blog/trendyol-kargo-ucretleri-guncellendi-13-temmuz-2026) |
| Platform service fee | 10.99 TL + VAT per package; 4.99 TL + VAT with Bugün Kargoda shipped the same day | [Nitru](https://nitru.com/trendyol-kar-hesaplama), [Pazar Fiyat](https://pazarfiyat.com/blog/51-trendyol-platform-hizmet-bedeli-2026) |
| Commission | Per product from the weekly tariff file (4 price bands, picked on the unit price after campaigns); 19% until imported. Rate × price the customer pays, 20% VAT inside | [Nitru](https://nitru.com/trendyol-kar-hesaplama) |
| VAT | 20% on cargo, service fee and commission; counted as input VAT | same |
| Withholding (stopaj) | 1% of the sale without VAT, kept from payouts; credited against income/corporate tax, so shown separately unless counted | [Paraşüt](https://www.parasut.com/blog/e-ticarette-stopaj-duzenlemesi) |

To confirm with your own contract and invoices: whether the tier uses the total after discounts (assumed), whether you meet the fast-shipping terms, your carrier and any own cargo agreement, whether orders ship as one package, the commission VAT treatment, and whether withholding applies to you.

**Commission tariff** tab: import the weekly "Komisyon Tarifeleri" .xlsx. For each product it shows the margin at today's price, at the top price of each commission band, and just under each cargo tier limit. Pick a price per product, use the prices on the Trendyol side, or export the file with "YENİ TSF (FİYAT GÜNCELLE)" filled. Past files are kept to see how the band limits move.
