# Revenue calculator

Profit per order for the shop, after product campaigns, cart campaigns, platform commission, shipping (DHL eCommerce tariff, total desi) and VAT. Everything is editable in the app and saved in the browser.

```sh
npm install
npm run dev             # local dev server
npm test                # calculation engine tests
npm run build           # static site in dist/
npm run build:artifact  # single page in dist-artifact/revenue-calculator.html
```

## How an order is calculated

1. **Product campaigns**, per product: unit price change (% off, TL off, fixed price, optionally from a minimum qty), then a bundle rule (buy X pay Y, or X for a fixed price).
2. **Cart campaign**: checked on the total after product campaigns; the highest tier reached applies.
3. **Shipping fee** charged to the customer unless the product total after all discounts reaches the free-shipping threshold.
4. **Commission**: % of the product total after discounts (shipping excluded).
5. **Boxes**: smallest box that fits; above the largest box, whole large boxes. Shipping cost = tariff for the total desi + EPH + VAT. Each box also has its own packaging cost (box, tape, label).
6. **Profit** = customer pays − commission − shipping cost − packaging − cost of goods − VAT payable. VAT payable is the VAT collected on products and the shipping fee, minus the VAT paid on goods, shipping, packaging and commission. VAT deduction can be switched off.

## Tabs

- **Results**: box milestones, every order size, saved scenarios side by side, and an A × B mix grid.
- **Campaign lab**: every campaign in the library for each order size, with one-click Activate.
- **Ideas**: generates campaigns for a goal ("customers buy 1, get them to buy 3"), filtered by margin floor and customer saving, plus notes on shipping and box cliffs.
- **Order calculator**: one order in full detail.
- **Campaigns**: edit the campaign library and saved scenarios.
- **Settings**: products, boxes, packaging, fees, VAT and the shipping tariff.

All prices, costs and fees are VAT included except the shipping tariff, which is VAT and EPH excluded, as in the contract.
