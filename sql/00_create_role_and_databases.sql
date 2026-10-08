-- Run as postgres, connected to the postgres database:
--   psql -U postgres -d postgres -f sql/00_create_role_and_databases.sql

CREATE USER campus WITH PASSWORD 'zO2dcu8TdQ5x24Rw';

CREATE DATABASE library OWNER campus;
CREATE DATABASE equipment OWNER campus;
CREATE DATABASE directory OWNER campus;