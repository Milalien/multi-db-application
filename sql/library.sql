-- Run as campus, connected to the library database:
--   psql -U campus -d library -f sql/library.sql

DROP TABLE IF EXISTS books;

CREATE TABLE books (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  published_year INTEGER,
  available BOOLEAN NOT NULL DEFAULT TRUE,
  CONSTRAINT books_published_year_check CHECK (
    published_year IS NULL OR (published_year BETWEEN 1000 AND 2100)
  )
);

INSERT INTO books (title, author, published_year, available) VALUES
  ('The Left Hand of Darkness', 'Ursula K. Le Guin', 1969, TRUE),
  ('Clean Code', 'Robert C. Martin', 2008, TRUE),
  ('Designing Data-Intensive Applications', 'Martin Kleppmann', 2017, FALSE),
  ('The Dispossessed', 'Ursula K. Le Guin', 1974, TRUE),
  ('PostgreSQL: Up and Running', 'Regina O. Obe', 2017, TRUE),
  ('Klara and the Sun', 'Kazuo Ishiguro', 2021, TRUE);