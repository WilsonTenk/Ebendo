-- Ebendo 0003: several photos per product (front, side, inside, back…).
--
-- `images` is the ordered list (first = main photo, max 4). `image_url` stays as
-- a copy of the main photo so cards, plans and older code keep working; the
-- admin actions keep the two in step.

alter table products
  add column images text[] not null default '{}'
  check (cardinality(images) <= 4);

-- Existing products: their one photo becomes photo 1.
update products set images = array[image_url] where image_url is not null and cardinality(images) = 0;
