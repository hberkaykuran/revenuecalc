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
5. **Boxes**: smallest box that fits; above the largest box, whole large boxes. Shipping cost = tariff for the total desi + EPH + VAT.
6. **Profit** = customer pays − commission − shipping cost − cost of goods − VAT payable (VAT collected on products and shipping fee minus VAT paid on goods, shipping and commission). VAT deduction can be switched off.

All prices, costs and fees are VAT included except the shipping tariff, which is VAT and EPH excluded, as in the contract.
