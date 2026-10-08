-- Run as campus, connected to the equipment database:
--   psql -U campus -d equipment -f sql/equipment.sql

DROP TABLE IF EXISTS items;

CREATE TABLE items (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  location TEXT NOT NULL,
  CONSTRAINT items_quantity_check CHECK (quantity >= 0)
);

INSERT INTO items (name, category, quantity, location) VALUES
  ('Projector', 'AV', 4, 'Room 201'),
  ('HDMI cable', 'AV', 12, 'Storage A'),
  ('Laptop', 'Computing', 0, 'Repair bench'),
  ('Soldering iron', 'Workshop', 3, 'Bench 2'),
  ('First aid kit', 'Safety', 2, 'Lobby'),
  ('Ethernet tester', 'Networking', 1, 'Storage B');