-- Idempotency support for marketplace synchronization.
-- Apply this in Supabase/PostgreSQL before deploying the refactored worker.

-- One external order must map to exactly one local order per shop/channel.
create unique index if not exists orders_sync_identity_uidx
    on public.orders (shop_id, channel, external_order_id);

-- Preserve a provider-derived identity for each order item so retries update the
-- same row instead of appending duplicates.
alter table public.order_items
    add column if not exists source_item_key text;

create unique index if not exists order_items_sync_identity_uidx
    on public.order_items (order_id, source_item_key)
    where source_item_key is not null;

-- Existing rows can remain NULL until they are backfilled. The worker always
-- sends source_item_key for newly synchronized rows.
