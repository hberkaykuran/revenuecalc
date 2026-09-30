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
6. Profit = customer pays − commission − shipping − packaging − cost of goods. Prices and costs include VAT. VAT payable is shown separately and is only deducted if you switch that on.

## Ideas

Pick a goal: bigger baskets, reach free shipping, cross-sell, or win more orders. Enter how your orders split by quantity today. The generator tries preset and goal-sized campaigns, and pairs of product and cart campaigns. It keeps the ones within your margin and customer-saving limits and ranks them by **break-even**: the share of customers who must change their order for the campaign to beat doing nothing. Discounts given to customers who would have bought anyway count as a cost.
