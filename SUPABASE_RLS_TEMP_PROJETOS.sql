-- ============================================
-- FIX RLS POLICIES FOR dim_projetos
-- ============================================
-- Execute this SQL in Supabase SQL Editor
-- to allow authenticated users to manage projects

-- Option 1: Create specific RLS policies (RECOMMENDED)
-- =====================================================

-- Allow authenticated users to INSERT projects
CREATE POLICY "Allow authenticated users to insert projects"
ON public.dim_projetos 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Allow authenticated users to SELECT projects
CREATE POLICY "Allow authenticated users to select projects"
ON public.dim_projetos 
FOR SELECT 
TO authenticated 
USING (true);

-- Allow authenticated users to UPDATE projects
CREATE POLICY "Allow authenticated users to update projects"
ON public.dim_projetos 
FOR UPDATE 
TO authenticated 
USING (true)
WITH CHECK (true);

-- Allow authenticated users to DELETE projects
CREATE POLICY "Allow authenticated users to delete projects"
ON public.dim_projetos 
FOR DELETE 
TO authenticated 
USING (true);


-- Option 2: Disable RLS temporarily (ONLY FOR DEVELOPMENT)
-- =========================================================
-- WARNING: This removes all security. Only use for testing!
-- 
-- ALTER TABLE public.dim_projetos DISABLE ROW LEVEL SECURITY;


-- ============================================
-- VERIFY POLICIES WERE CREATED
-- ============================================
-- Run this to check if policies exist:
-- 
-- SELECT * FROM pg_policies WHERE tablename = 'dim_projetos';
