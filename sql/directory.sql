-- Run as campus, connected to the directory database:
--   psql -U campus -d directory -f sql/directory.sql

DROP TABLE IF EXISTS contacts;

CREATE TABLE contacts (
  id SERIAL PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL,
  phone TEXT,
  CONSTRAINT contacts_email_unique UNIQUE (email)
);

INSERT INTO contacts (full_name, email, role, phone) VALUES
  ('Aino Korhonen', 'aino.korhonen@example.com', 'Librarian', '+358 40 111 2233'),
  ('Mikael Lind', 'mikael.lind@example.com', 'Technician', '+358 40 222 3344'),
  ('Sara Niemi', 'sara.niemi@example.com', 'Instructor', NULL),
  ('Elias Virtanen', 'elias.virtanen@example.com', 'Front desk', '+358 40 444 5566'),
  ('Noora Makela', 'noora.makela@example.com', 'Coordinator', '+358 40 555 6677'),
  ('Leo Heinonen', 'leo.heinonen@example.com', 'Assistant', '+358 40 666 7788');