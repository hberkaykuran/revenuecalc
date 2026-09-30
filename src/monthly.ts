import { profitAfterVat, type OrderResult } from './engine';
import type { Cart, MonthlyPlan, Settings } from './types';

const vatPart = (gross: number, rate: number) => (gross * rate) / (100 + rate);

export function defaultPlan(settings: Settings): MonthlyPlan {
  const p = settings.products[0]?.id;
  const row = (qty: number, perMonth: number) => ({ id: `r${qty}`, lines: p ? [{ productId: p, qty }] : [], perMonth });
  return {
    orders: [row(1, 60), row(2, 25), row(3, 10), row(6, 5)],
    fixed: [{ id: 'f1', name: 'Shopify', amount: 0, vatRate: 0 }],
    adPerOrder: 0, adVatRate: 0,
    returnRate: 0, returnCost: 0, returnVatRate: 20,
  };
}

export type MonthRow = { id: string; cart: Cart; perMonth: number; order: OrderResult };

export type Month = {
  rows: MonthRow[];
  orders: number;
  customerPays: number;
  productRevenue: number;
  commission: number;
  shipping: number; // shipping cost incl. EPH & VAT
  packaging: number;
  goods: number;
  orderFees: number;
  ads: number;
  returns: number;
  fixed: number;
  costs: number;
  cashProfit: number; // before VAT settlement
  vatOutput: number;
  vatInput: number;
  vatPayable: number; // > 0 owed to the state, < 0 credit (devreden KDV)
  profit: number; // under the chosen VAT treatment
  margin: number;
  contributionPerOrder: number; // cash profit per order before fixed costs
  breakEvenOrders: number | null; // orders per month (same mix) where profit reaches 0
};

/** One month under the plan, with the campaigns that are on (via `calc`). */
export function month(settings: Settings, plan: MonthlyPlan, calc: (cart: Cart) => OrderResult): Month {
  const rows: MonthRow[] = plan.orders
    .map((o) => {
      const cart: Cart = {};
      for (const l of o.lines) if (l.productId && l.qty > 0) cart[l.productId] = (cart[l.productId] ?? 0) + l.qty;
      return { id: o.id, cart, perMonth: Math.max(0, o.perMonth), order: calc(cart) };
    })
    .filter((r) => r.order.qty > 0);
  const sum = (f: (o: OrderResult) => number) => rows.reduce((s, r) => s + f(r.order) * r.perMonth, 0);
  const orders = rows.reduce((s, r) => s + r.perMonth, 0);
  const ads = plan.adPerOrder * orders;
  const returnedOrders = orders * plan.returnRate / 100;
  const returns = returnedOrders * plan.returnCost;
  const fixed = plan.fixed.reduce((s, f) => s + f.amount, 0);
  const perOrder = {
    customerPays: sum((o) => o.customerPays), productRevenue: sum((o) => o.productRevenue), commission: sum((o) => o.commission),
    shipping: sum((o) => o.shippingCost), packaging: sum((o) => o.packaging), goods: sum((o) => o.cogs), orderFees: sum((o) => o.orderFee),
  };
  const variable = perOrder.commission + perOrder.shipping + perOrder.packaging + perOrder.goods + perOrder.orderFees + ads + returns;
  const costs = variable + fixed;
  const cashProfit = perOrder.customerPays - costs;
  const vatOutput = sum((o) => o.vatOutput);
  const vatInput = sum((o) => o.vatInput) + vatPart(ads, plan.adVatRate) + vatPart(returns, plan.returnVatRate)
    + plan.fixed.reduce((s, f) => s + vatPart(f.amount, f.vatRate), 0);
  const vatPayable = vatOutput - vatInput;
  const profit = profitAfterVat(cashProfit, vatPayable, settings.vatMode);
  const contributionPerOrder = orders > 0 ? (perOrder.customerPays - variable) / orders : 0;
  return {
    rows, orders, ...perOrder, ads, returns, fixed, costs, cashProfit, vatOutput, vatInput, vatPayable, profit,
    margin: perOrder.customerPays > 0 ? profit / perOrder.customerPays : 0,
    contributionPerOrder,
    breakEvenOrders: contributionPerOrder > 0 ? fixed / contributionPerOrder : null,
  };
}
