-- Add drone series column to diplomas table
ALTER TABLE public.diplomas ADD COLUMN IF NOT EXISTS drone_series text;
