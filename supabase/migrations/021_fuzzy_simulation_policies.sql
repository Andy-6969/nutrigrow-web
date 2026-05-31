-- ═══════════════════════════════════════════════════════════
-- Migration: Add simulation write policies to fuzzy_recommendations
-- ═══════════════════════════════════════════════════════════

-- Allow authenticated users to insert new recommendations for simulation purposes
CREATE POLICY "Authenticated users can insert recommendations" ON fuzzy_recommendations
  FOR INSERT TO authenticated WITH CHECK (true);

-- Allow authenticated users to update recommendation status (for local override testing)
CREATE POLICY "Authenticated users can update recommendations" ON fuzzy_recommendations
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
