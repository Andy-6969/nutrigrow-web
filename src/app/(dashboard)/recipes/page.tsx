'use client';

import { useState, useEffect } from 'react';
import { FlaskConical, Plus, Search, MoreVertical, Droplet, Sprout, Download } from 'lucide-react';
import { useAuth } from '@/shared/context/AuthContext';
import { useT } from '@/shared/context/LanguageContext';
import { recipeService } from '@/shared/services/recipeService';
import type { NutrientRecipe, RecipePhase } from '@/shared/types/global.types';
import { cn } from '@/shared/lib/utils';
import { useRouter } from 'next/navigation';
import { PLANT_PROFILES } from '@/shared/services/growthStageService';
import RecipeFormModal from './RecipeFormModal';
import RecipeDetailModal from './RecipeDetailModal';
import { exportRecipesToCSV } from '@/shared/utils/exportUtils';

export default function RecipesPage() {
  const t = useT();
  const router = useRouter();
  const { profile } = useAuth();
  const [recipes, setRecipes] = useState<NutrientRecipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<NutrientRecipe | null>(null);

  useEffect(() => {
    async function loadRecipes() {
      if (!profile) return; // Wait for profile to load
      
      setIsLoading(true);
      // If user has a farm_id, get their recipes. If super_admin, farm_id might be undefined, get all.
      const { data } = await recipeService.getRecipes(profile.farm_id || undefined);
      if (data) setRecipes(data);
      setIsLoading(false);
    }
    loadRecipes();
  }, [profile]);

  const filteredRecipes = recipes.filter(r => 
    r.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    r.plant_type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSaveRecipe = async (
    recipePayload: Omit<NutrientRecipe, 'id' | 'created_at' | 'updated_at' | 'phases'>,
    phasesPayload: Omit<RecipePhase, 'id' | 'recipe_id'>[]
  ) => {
    const { data, error } = await recipeService.createRecipe(recipePayload, phasesPayload);
    if (error) throw new Error(error);
    if (data) setRecipes([data, ...recipes]);
  };

  const handleDeleteRecipe = (id: string) => {
    setRecipes(prev => prev.filter(r => r.id !== id));
  };

  const handleUpdateRecipe = (updated: NutrientRecipe) => {
    setRecipes(prev => prev.map(r => r.id === updated.id ? updated : r));
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--surface-text)' }}>
            <FlaskConical className="w-6 h-6 text-primary-500" />
            Resep Nutrisi Kustom
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--surface-text-muted)' }}>
            Buat profil nutrisi cerdas (EC/pH) berdasarkan fase pertumbuhan tanaman.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsModalOpen(true)}
            className="btn-premium px-4 py-2 rounded-xl text-white font-semibold flex items-center gap-2 shadow-lg shadow-primary-500/20 bg-primary-600 hover:bg-primary-500"
          >
            <Plus className="w-5 h-5" />
            Buat Resep Baru
          </button>
          {recipes.length > 0 && (
            <button
              onClick={() => exportRecipesToCSV(filteredRecipes)}
              className="px-4 py-2 rounded-xl font-semibold flex items-center gap-2 border transition-colors hover:bg-white/10 text-sm"
              style={{ borderColor: 'var(--surface-border)', color: 'var(--surface-text-muted)' }}
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <div className="glass p-4 flex flex-col sm:flex-row gap-4 justify-between items-center">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text"
            placeholder="Cari resep..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-white/10 focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-all text-sm"
            style={{ color: 'var(--surface-text)' }}
          />
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <select className="glass-sm px-3 py-2 rounded-xl text-sm outline-none w-full sm:w-auto" style={{ color: 'var(--surface-text)' }}>
            <option value="all">Semua Tanaman</option>
            <option value="tomato">Tomat</option>
            <option value="cabai">Cabai</option>
            <option value="lettuce">Selada</option>
          </select>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <div className="w-10 h-10 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
        </div>
      ) : filteredRecipes.length === 0 ? (
        <div className="glass p-12 flex flex-col items-center justify-center text-center">
          <div className="w-20 h-20 bg-primary-500/10 rounded-full flex items-center justify-center mb-4">
            <FlaskConical className="w-10 h-10 text-primary-500 opacity-50" />
          </div>
          <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--surface-text)' }}>Belum Ada Resep Kustom</h3>
          <p className="max-w-md text-sm mb-6" style={{ color: 'var(--surface-text-muted)' }}>
            Anda belum memiliki profil resep nutrisi. Klik "Buat Resep Baru" untuk mengatur target EC dan pH secara spesifik per fase pertumbuhan.
          </p>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="px-6 py-2 rounded-xl bg-primary-500/20 text-primary-600 font-semibold hover:bg-primary-500/30 transition-colors"
          >
            Buat Resep Pertama
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredRecipes.map((recipe) => {
            const profile = PLANT_PROFILES[recipe.plant_type as keyof typeof PLANT_PROFILES] || PLANT_PROFILES.custom;
            
            return (
              <div key={recipe.id} className="glass p-5 rounded-2xl group hover:-translate-y-1 transition-all duration-300">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500/20 to-accent-500/20 flex items-center justify-center text-2xl shadow-inner border border-white/10">
                      {profile.phases[0]?.emoji || '🌱'}
                    </div>
                    <div>
                      <h3 className="font-bold text-lg leading-tight" style={{ color: 'var(--surface-text)' }}>
                        {recipe.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-white/10" style={{ color: 'var(--surface-text-muted)' }}>
                          {profile.nameId}
                        </span>
                        {recipe.is_default && (
                          <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-primary-500/20 text-primary-600">
                            Template Asli
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-gray-200 transition-colors">
                    <MoreVertical className="w-5 h-5" />
                  </button>
                </div>
                
                <p className="text-sm mb-4 line-clamp-2 min-h-[40px]" style={{ color: 'var(--surface-text-muted)' }}>
                  {recipe.description || 'Tidak ada deskripsi.'}
                </p>
                
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="glass-sm p-3 flex flex-col gap-1 rounded-xl">
                    <div className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: 'var(--surface-text-muted)' }}>
                      <Sprout className="w-3.5 h-3.5 text-accent-500" /> Total Fase
                    </div>
                    <span className="text-lg font-bold" style={{ color: 'var(--surface-text)' }}>
                      {recipe.phases?.length || 0} <span className="text-xs font-normal opacity-60">fase</span>
                    </span>
                  </div>
                  <div className="glass-sm p-3 flex flex-col gap-1 rounded-xl">
                    <div className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: 'var(--surface-text-muted)' }}>
                      <Droplet className="w-3.5 h-3.5 text-blue-400" /> Target EC Max
                    </div>
                    <span className="text-lg font-bold" style={{ color: 'var(--surface-text)' }}>
                      {Math.max(...(recipe.phases?.map(p => p.ec_target_max) || [0])).toFixed(1)} <span className="text-xs font-normal opacity-60">mS/cm</span>
                    </span>
                  </div>
                </div>
                
                <div className="pt-4 border-t border-white/5 flex gap-2">
                  <button 
                    onClick={() => setSelectedRecipe(recipe)}
                    className="flex-1 py-2 text-sm font-semibold rounded-xl bg-primary-500/10 text-primary-600 hover:bg-primary-500/20 transition-colors"
                  >
                    Lihat Detail
                  </button>
                  <button 
                    onClick={() => router.push('/farms')}
                    className="px-4 py-2 text-sm font-semibold rounded-xl border border-white/10 hover:bg-white/5 transition-colors" style={{ color: 'var(--surface-text)' }}
                  >
                    Gunakan
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {profile && (
        <RecipeFormModal 
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveRecipe}
          farmId={profile.farm_id || ''}
        />
      )}

      {selectedRecipe && (
        <RecipeDetailModal
          recipe={selectedRecipe}
          isOpen={!!selectedRecipe}
          onClose={() => setSelectedRecipe(null)}
          onDelete={handleDeleteRecipe}
          onUpdate={handleUpdateRecipe}
        />
      )}
    </div>
  );
}
