// src/shared/services/recipeService.ts
import { supabase } from '@/shared/lib/supabase';
import type { NutrientRecipe, RecipePhase } from '@/shared/types/global.types';

export const recipeService = {
  /** Get all recipes, optionally filtered by farm */
  async getRecipes(farmId?: string): Promise<{ data: NutrientRecipe[] | null; error: string | null }> {
    try {
      let query = supabase
        .from('nutrient_recipes')
        .select(`
          *,
          phases:recipe_phases(*)
        `)
        .order('created_at', { ascending: false });

      if (farmId) {
        query = query.eq('farm_id', farmId);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Sort phases by phase_order
      const recipes = (data as any[]).map(recipe => ({
        ...recipe,
        phases: recipe.phases?.sort((a: any, b: any) => a.phase_order - b.phase_order) || []
      }));

      return { data: recipes as NutrientRecipe[], error: null };
    } catch (err: any) {
      console.error('[recipeService] getRecipes failed:', err);
      return { data: null, error: err.message || String(err) };
    }
  },

  /** Create a new recipe and its phases */
  async createRecipe(
    recipePayload: Omit<NutrientRecipe, 'id' | 'created_at' | 'updated_at' | 'phases'>,
    phasesPayload: Omit<RecipePhase, 'id' | 'recipe_id'>[]
  ): Promise<{ data: NutrientRecipe | null; error: string | null }> {
    try {
      // 1. Create the recipe
      const { data: recipeData, error: recipeError } = await supabase
        .from('nutrient_recipes')
        .insert([recipePayload])
        .select()
        .single();

      if (recipeError) throw recipeError;
      const newRecipe = recipeData as NutrientRecipe;

      // 2. Create the phases
      if (phasesPayload.length > 0) {
        const phasesToInsert = phasesPayload.map(phase => ({
          ...phase,
          recipe_id: newRecipe.id
        }));

        const { error: phasesError } = await supabase
          .from('recipe_phases')
          .insert(phasesToInsert);

        if (phasesError) {
          // Rollback recipe if phases fail
          await supabase.from('nutrient_recipes').delete().eq('id', newRecipe.id);
          throw phasesError;
        }
      }

      // Fetch the full recipe with phases to return
      const { data: fullRecipe } = await supabase
        .from('nutrient_recipes')
        .select(`*, phases:recipe_phases(*)`)
        .eq('id', newRecipe.id)
        .single();

      return { data: fullRecipe as NutrientRecipe, error: null };
    } catch (err: any) {
      console.error('[recipeService] createRecipe failed:', err);
      return { data: null, error: err.message || String(err) };
    }
  },

  /** Delete a recipe (cascade will handle phases) */
  async deleteRecipe(id: string): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase
        .from('nutrient_recipes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { error: null };
    } catch (err: any) {
      console.error('[recipeService] deleteRecipe failed:', err);
      return { error: err.message || String(err) };
    }
  }
};
