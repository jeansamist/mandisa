import { sql } from "drizzle-orm";
import { db } from "../db/client.js";

// Business metrics for /ms. Financial data never leaves the admin API (CLAUDE.md §3).

const PAID_STATUSES = sql.raw(
  `('paid','in_preparation','in_production','ready','shipped','delivered','return_requested','return_received','exchanged')`,
);

async function rows<T>(query: ReturnType<typeof sql>) {
  const result = await db.execute(query);
  return result.rows as T[];
}

async function one<T>(query: ReturnType<typeof sql>) {
  return (await rows<T>(query))[0]!;
}

const num = (v: unknown) => Number(v ?? 0);

export async function adminDashboard() {
  const [sales, previous, traffic, funnel, todo, daily, topProducts, lowStock] =
    await Promise.all([
      one<{ revenue: string; paid_orders: string; orders: string }>(sql`
      select
        coalesce(sum(total_xaf) filter (where status in ${PAID_STATUSES} and paid_at > now() - interval '30 days'), 0) as revenue,
        count(*) filter (where status in ${PAID_STATUSES} and paid_at > now() - interval '30 days') as paid_orders,
        count(*) filter (where created_at > now() - interval '30 days') as orders
      from orders`),
      one<{ revenue: string; paid_orders: string }>(sql`
      select
        coalesce(sum(total_xaf), 0) as revenue,
        count(*) as paid_orders
      from orders
      where status in ${PAID_STATUSES}
        and paid_at > now() - interval '60 days' and paid_at <= now() - interval '30 days'`),
      one<{
        visitors: string;
        sessions: string;
        previous_visitors: string;
      }>(sql`
      select
        count(distinct visitor_id) filter (where started_at > now() - interval '30 days') as visitors,
        count(*) filter (where started_at > now() - interval '30 days') as sessions,
        count(distinct visitor_id) filter (
          where started_at > now() - interval '60 days' and started_at <= now() - interval '30 days'
        ) as previous_visitors
      from analytics_sessions`),
      one<{ started: string; ordered: string; abandoned: string }>(sql`
      select
        count(*) as started,
        count(*) filter (where status = 'ordered') as ordered,
        count(*) filter (where status = 'open' and updated_at < now() - interval '1 hour') as abandoned
      from checkout_sessions
      where created_at > now() - interval '30 days'`),
      one<{
        payment_review: string;
        quotes: string;
        unpaid: string;
        new_messages: string;
        handoffs: string;
      }>(sql`
      select
        (select count(*) from orders where status = 'payment_review') as payment_review,
        (select count(*) from orders where status = 'draft') as quotes,
        (select count(*) from orders where status = 'pending_payment') as unpaid,
        (select count(*) from contact_messages where status = 'new') as new_messages,
        (select count(*) from ai_conversations
           where status = 'handed_off' and last_message_at > now() - interval '7 days') as handoffs`),
      rows<{
        day: string;
        revenue: string;
        paid_orders: string;
        visitors: string;
      }>(sql`
      with days as (
        select generate_series(current_date - interval '13 days', current_date, interval '1 day')::date as day
      )
      select
        to_char(days.day, 'YYYY-MM-DD') as day,
        coalesce((select sum(total_xaf) from orders
                  where status in ${PAID_STATUSES} and paid_at::date = days.day), 0) as revenue,
        (select count(*) from orders where status in ${PAID_STATUSES} and paid_at::date = days.day) as paid_orders,
        (select count(distinct visitor_id) from analytics_sessions where started_at::date = days.day) as visitors
      from days
      order by days.day`),
      rows<{
        product_code: string;
        product_name: string;
        units: string;
        revenue: string;
      }>(sql`
      select i.product_code, i.product_name,
             sum(i.quantity) as units, sum(i.quantity * i.unit_price_xaf) as revenue
      from order_items i join orders o on o.id = i.order_id
      where o.status in ${PAID_STATUSES} and o.paid_at > now() - interval '30 days'
      group by i.product_code, i.product_name
      order by units desc
      limit 5`),
      rows<{
        sku: string;
        product_name: string;
        product_code: string;
        available: string;
        threshold: string;
        preorder: boolean;
      }>(sql`
      select v.sku, p.name as product_name, p.code as product_code,
             greatest(0, v.stock_on_hand - v.stock_reserved) as available,
             v.low_stock_threshold as threshold, v.preorder_enabled as preorder
      from variants v join products p on p.id = v.product_id
      where p.is_active and v.stock_on_hand - v.stock_reserved <= v.low_stock_threshold
        and v.stock_on_hand > 0
      order by available asc, p.code
      limit 8`),
    ]);

  const [
    recentCheckouts,
    recentOrders,
    recentCustomers,
    recentMessages,
    recentConversations,
  ] = await Promise.all([
    rows(sql`
      select s.id, s.status, s.last_step, s.contact->>'firstName' as first_name,
             jsonb_array_length(s.cart) as items, s.delivery_method, s.payment_method,
             s.updated_at, o.number as order_number, o.status as order_status, o.total_xaf
      from checkout_sessions s left join orders o on o.id = s.order_id
      order by s.updated_at desc limit 8`),
    rows(sql`
      select o.number, o.status, o.total_xaf, o.payment_method, o.delivery_method, o.created_at,
             c.first_name, c.last_name
      from orders o join customers c on c.id = o.customer_id
      order by o.created_at desc limit 8`),
    rows(sql`
      select c.id, c.first_name, c.last_name, c.phone, c.created_at,
             count(o.id) as orders,
             coalesce(sum(o.total_xaf) filter (where o.status in ${PAID_STATUSES}), 0) as spent_xaf
      from customers c left join orders o on o.customer_id = c.id
      group by c.id
      order by c.created_at desc limit 8`),
    rows(sql`
      select id, name, phone, left(message, 160) as message, status, created_at
      from contact_messages order by created_at desc limit 8`),
    rows(sql`
      select id, title, status, message_count, locale, last_message_at
      from ai_conversations order by last_message_at desc limit 8`),
  ]);

  const revenue = num(sales.revenue);
  const paidOrders = num(sales.paid_orders);
  const sessions = num(traffic.sessions);
  return {
    period: "30d",
    kpis: {
      revenueXaf: revenue,
      previousRevenueXaf: num(previous.revenue),
      paidOrders,
      previousPaidOrders: num(previous.paid_orders),
      orders: num(sales.orders),
      averageBasketXaf: paidOrders ? Math.round(revenue / paidOrders) : null,
      visitors: num(traffic.visitors),
      previousVisitors: num(traffic.previous_visitors),
      sessions,
      conversionRate: sessions ? paidOrders / sessions : null,
    },
    funnel: {
      checkoutsStarted: num(funnel.started),
      checkoutsOrdered: num(funnel.ordered),
      checkoutsAbandoned: num(funnel.abandoned),
    },
    todo: {
      paymentsToReview: num(todo.payment_review),
      quotesToSend: num(todo.quotes),
      unpaidOrders: num(todo.unpaid),
      newMessages: num(todo.new_messages),
      aiHandoffs: num(todo.handoffs),
      lowStock: lowStock.length,
    },
    daily: daily.map((d) => ({
      day: d.day,
      revenueXaf: num(d.revenue),
      paidOrders: num(d.paid_orders),
      visitors: num(d.visitors),
    })),
    topProducts: topProducts.map((p) => ({
      code: p.product_code,
      name: p.product_name,
      units: num(p.units),
      revenueXaf: num(p.revenue),
    })),
    lowStock: lowStock.map((v) => ({
      sku: v.sku,
      productCode: v.product_code,
      productName: v.product_name,
      available: num(v.available),
      threshold: num(v.threshold),
      preorder: v.preorder,
    })),
    recent: {
      checkouts: recentCheckouts,
      orders: recentOrders,
      customers: recentCustomers,
      messages: recentMessages,
      conversations: recentConversations,
    },
  };
}
