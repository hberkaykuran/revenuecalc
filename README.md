# Revenue calculator

Profit and margin per Shopify order after campaigns, payment/platform commission, shipping (DHL eCommerce tariff, total desi), packaging and VAT. Turkish and English. Everything is editable and saved in the browser; export/import a JSON file to move it.

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
6. Profit = customer pays − commission − shipping − packaging − cost of goods. Prices and costs include VAT; how VAT enters profit is a setting (see VAT).

## Compare

Pick up to five combinations (the campaigns that are on, no campaign, or saved combinations) and see which gives the best margin or profit in each box range, at every order size, and for every mix of two products.

## Monthly plan

Typical orders per month (single or two-product), ad spend per order, returns and fixed costs. Shows monthly profit, margin, break-even orders and the VAT position: VAT owed, or VAT credit (devreden KDV) when products sell at a low rate (e.g. 1%) while shipping, packaging and services carry 20%.

## VAT

Each product has a sale VAT rate and a purchase VAT rate. Profit can leave VAT out (default), treat VAT as settled with credit recovered, or settled with credit lost.

## Products

"Add Mesh Stick products" adds the 32 active products from `hberkaykuran/meshstick-prod` (`catalog/products.json`) with their Shopify prices (`src/catalog.ts`). Costs start at 0.

## Ideas

Pick a goal: bigger baskets, reach free shipping, cross-sell, or win more orders. Enter how your orders split by quantity today. The generator tries preset and goal-sized campaigns, and pairs of product and cart campaigns. Customer saving includes the shipping fee avoided. For free shipping, each idea's target is the smallest order that ships free with it, and only customers 1–2 pieces short are assumed to move up; cross-sell only suggests rewards that need the pair. It keeps the ones within your margin and customer-saving limits and ranks them by **break-even**: the share of customers who must change their order for the campaign to beat doing nothing. Discounts given to customers who would have bought anyway count as a cost.
