-- Persist an order batch and its items in one PostgreSQL transaction.
-- Apply after 001_order_sync_idempotency.sql.

create or replace function public.persist_synced_orders(
    p_orders jsonb,
    p_items jsonb
)
returns void
language plpgsql
set search_path = public
as $$
begin
    insert into public.orders (
        id,
        user_id,
        shop_id,
        channel,
        external_order_id,
        status,
        customer_name,
        customer_address,
        customer_phone,
        total_price,
        currency
    )
    select
        row_data.id,
        row_data.user_id,
        row_data.shop_id,
        row_data.channel,
        row_data.external_order_id,
        row_data.status,
        row_data.customer_name,
        row_data.customer_address,
        row_data.customer_phone,
        row_data.total_price,
        row_data.currency
    from jsonb_to_recordset(coalesce(p_orders, '[]'::jsonb)) as row_data(
        id uuid,
        user_id uuid,
        shop_id uuid,
        channel text,
        external_order_id text,
        status text,
        customer_name text,
        customer_address text,
        customer_phone text,
        total_price numeric,
        currency text
    )
    on conflict (shop_id, channel, external_order_id)
    do update set
        status = excluded.status,
        customer_name = excluded.customer_name,
        customer_address = excluded.customer_address,
        customer_phone = excluded.customer_phone,
        total_price = excluded.total_price,
        currency = excluded.currency;

    insert into public.order_items (
        order_id,
        source_item_key,
        sku,
        name,
        quantity,
        price
    )
    select
        row_data.order_id,
        row_data.source_item_key,
        row_data.sku,
        row_data.name,
        row_data.quantity,
        row_data.price
    from jsonb_to_recordset(coalesce(p_items, '[]'::jsonb)) as row_data(
        order_id uuid,
        source_item_key text,
        sku text,
        name text,
        quantity integer,
        price numeric
    )
    on conflict (order_id, source_item_key) where source_item_key is not null
    do update set
        sku = excluded.sku,
        name = excluded.name,
        quantity = excluded.quantity,
        price = excluded.price;
end;
$$;

-- The worker is a trusted server-side process. Do not expose this mutation RPC
-- to browser roles.
revoke all on function public.persist_synced_orders(jsonb, jsonb) from public;
grant execute on function public.persist_synced_orders(jsonb, jsonb) to service_role;
