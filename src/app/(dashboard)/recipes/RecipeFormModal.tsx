'use client';

import { useState, useEffect } from 'react';
import { X, Save, Plus, Trash2, Sprout } from 'lucide-react';
import type { NutrientRecipe, RecipePhase } from '@/shared/types/global.types';
import { PLANT_PROFILES } from '@/shared/services/growthStageService';
import { farmService } from '@/shared/services/farmService';
import type { Farm } from '@/shared/types/global.types';

interface RecipeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (recipe: Omit<NutrientRecipe, 'id' | 'created_at' | 'updated_at' | 'phases'>, phases: Omit<RecipePhase, 'id' | 'recipe_id'>[]) => Promise<void>;
  farmId: string;
}

export default function RecipeFormModal({ isOpen, onClose, onSave, farmId }: RecipeFormModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [plantType, setPlantType] = useState('tomato');
  const [selectedFarmId, setSelectedFarmId] = useState(farmId);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [phases, setPhases] = useState<Omit<RecipePhase, 'id' | 'recipe_id'>[]>([]);

  // If no farmId is provided (e.g., super admin), fetch all farms so they can choose
  useEffect(() => {
    if (isOpen && !farmId) {
      farmService.getFarms().then(res => {
        setFarms(res);
      });
    }
  }, [isOpen, farmId]);

  // Pre-fill phases when plantType changes
  useEffect(() => {
    if (!isOpen) return;
    const profile = PLANT_PROFILES[plantType as keyof typeof PLANT_PROFILES];
    if (profile && phases.length === 0) {
      const initialPhases = profile.phases.map((p, index) => ({
        phase_order: index + 1,
        name: p.name,
        emoji: p.emoji,
        day_start: p.dayStart,
        day_end: p.dayEnd,
        frequency_per_day: p.frequencyPerDay,
        irrigation_times: p.irrigationTimes,
        water_volume_liters: p.waterVolumeLiters,
        ec_target_min: p.ecTargetMin,
        ec_target_max: p.ecTargetMax,
        ph_target_min: 5.5,
        ph_target_max: 7.0,
      }));
      setPhases(initialPhases);
    }
  }, [plantType, isOpen]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setName('');
      setDescription('');
      setPlantType('tomato');
      setPhases([]);
      setSelectedFarmId(farmId);
    }
  }, [isOpen, farmId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return alert('Nama resep wajib diisi!');
    if (phases.length === 0) return alert('Minimal harus ada 1 fase!');

    if (!selectedFarmId) return alert('Silakan pilih Lahan (Farm) terlebih dahulu!');

    setIsSubmitting(true);
    try {
      await onSave({
        farm_id: selectedFarmId,
        name,
        plant_type: plantType,
        description,
        is_default: false,
      }, phases);
      onClose();
    } catch (error) {
      console.error(error);
      alert('Gagal menyimpan resep. Coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const updatePhase = (index: number, field: string, value: string | number) => {
    const newPhases = [...phases];
    newPhases[index] = { ...newPhases[index], [field]: value };
    setPhases(newPhases);
  };

  const removePhase = (index: number) => {
    const newPhases = phases.filter((_, i) => i !== index);
    // Re-order
    newPhases.forEach((p, i) => p.phase_order = i + 1);
    setPhases(newPhases);
  };

  const addPhase = () => {
    const lastPhase = phases[phases.length - 1];
    setPhases([...phases, {
      phase_order: phases.length + 1,
      name: 'Fase Baru',
      emoji: '🌱',
      day_start: lastPhase ? lastPhase.day_end + 1 : 0,
      day_end: lastPhase ? lastPhase.day_end + 10 : 10,
      frequency_per_day: 2,
      irrigation_times: ['07:00', '17:00'],
      water_volume_liters: 0.5,
      ec_target_min: 1.0,
      ec_target_max: 1.5,
      ph_target_min: 5.5,
      ph_target_max: 6.5,
    }]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-fade-in">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-4xl bg-white dark:bg-[#1a1f2e] rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden" style={{ border: '1px solid var(--glass-border)' }}>
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-white/10 flex justify-between items-center bg-gray-50/50 dark:bg-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-500/20 flex items-center justify-center">
              <Sprout className="w-5 h-5 text-primary-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Buat Resep Kustom</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Rancang profil nutrisi untuk tanaman Anda</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-white/10 rounded-xl transition-colors">
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
          {/* Info Utama */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              {!farmId && (
                <div>
                  <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">Pilih Lahan (Farm) *</label>
                  <select 
                    value={selectedFarmId} onChange={e => setSelectedFarmId(e.target.value)} required
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-white/10 bg-white dark:bg-black/20 focus:ring-2 focus:ring-primary-500 outline-none text-gray-900 dark:text-white transition-all"
                  >
                    <option value="">-- Pilih Lahan --</option>
                    {farms.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">Nama Resep</label>
                <input 
                  type="text" required
                  value={name} onChange={e => setName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-white/10 bg-white dark:bg-black/20 focus:ring-2 focus:ring-primary-500 outline-none text-gray-900 dark:text-white transition-all"
                  placeholder="Contoh: Tomat Ceri Premium F1"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">Jenis Tanaman (Basis Template)</label>
                <select 
                  value={plantType} onChange={e => {
                    setPlantType(e.target.value);
                    setPhases([]); // Force reset phases
                  }}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-white/10 bg-white dark:bg-black/20 focus:ring-2 focus:ring-primary-500 outline-none text-gray-900 dark:text-white transition-all"
                >
                  <option value="tomato">Tomat</option>
                  <option value="cabai">Cabai</option>
                  <option value="lettuce">Selada</option>
                  <option value="custom">Lainnya (Kosong)</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">Deskripsi (Opsional)</label>
              <textarea 
                value={description} onChange={e => setDescription(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-white/10 bg-white dark:bg-black/20 focus:ring-2 focus:ring-primary-500 outline-none text-gray-900 dark:text-white transition-all h-[116px] resize-none"
                placeholder="Catatan mengenai resep ini..."
              />
            </div>
          </div>

          {/* Profil Fase */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Pengaturan Fase Pertumbuhan</h3>
              <button 
                type="button" onClick={addPhase}
                className="text-sm font-semibold px-3 py-1.5 rounded-lg bg-primary-500/10 text-primary-600 dark:text-primary-400 hover:bg-primary-500/20 transition-colors flex items-center gap-1"
              >
                <Plus className="w-4 h-4" /> Tambah Fase
              </button>
            </div>

            <div className="space-y-4">
              {phases.map((phase, index) => (
                <div key={index} className="relative p-5 rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 group transition-all hover:border-primary-500/50">
                  <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button type="button" onClick={() => removePhase(index)} className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                    {/* Basic Info */}
                    <div className="md:col-span-3 space-y-3">
                      <div>
                        <label className="block text-xs font-semibold mb-1 text-gray-500 dark:text-gray-400">Nama Fase</label>
                        <input type="text" value={phase.name} onChange={e => updatePhase(index, 'name', e.target.value)} className="w-full px-3 py-1.5 rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-black/20 text-sm outline-none focus:ring-1 focus:ring-primary-500" />
                      </div>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <label className="block text-xs font-semibold mb-1 text-gray-500 dark:text-gray-400">Hari Mulai</label>
                          <input type="number" min="0" value={phase.day_start} onChange={e => updatePhase(index, 'day_start', Number(e.target.value))} className="w-full px-3 py-1.5 rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-black/20 text-sm outline-none focus:ring-1 focus:ring-primary-500" />
                        </div>
                        <div className="flex-1">
                          <label className="block text-xs font-semibold mb-1 text-gray-500 dark:text-gray-400">Selesai</label>
                          <input type="number" min="0" value={phase.day_end} onChange={e => updatePhase(index, 'day_end', Number(e.target.value))} className="w-full px-3 py-1.5 rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-black/20 text-sm outline-none focus:ring-1 focus:ring-primary-500" />
                        </div>
                      </div>
                    </div>

                    {/* EC/pH Target */}
                    <div className="md:col-span-6 grid grid-cols-2 gap-4">
                      <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30">
                        <label className="block text-xs font-semibold mb-2 text-blue-700 dark:text-blue-300">Target Nutrisi (EC)</label>
                        <div className="flex items-center gap-2">
                          <input type="number" step="0.1" value={phase.ec_target_min} onChange={e => updatePhase(index, 'ec_target_min', Number(e.target.value))} className="w-full px-2 py-1 rounded bg-white dark:bg-black/30 border border-blue-200 dark:border-blue-800/50 text-sm outline-none text-center" placeholder="Min" />
                          <span className="text-gray-400">-</span>
                          <input type="number" step="0.1" value={phase.ec_target_max} onChange={e => updatePhase(index, 'ec_target_max', Number(e.target.value))} className="w-full px-2 py-1 rounded bg-white dark:bg-black/30 border border-blue-200 dark:border-blue-800/50 text-sm outline-none text-center" placeholder="Max" />
                        </div>
                      </div>
                      <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/30">
                        <label className="block text-xs font-semibold mb-2 text-amber-700 dark:text-amber-300">Target Asam (pH)</label>
                        <div className="flex items-center gap-2">
                          <input type="number" step="0.1" value={phase.ph_target_min} onChange={e => updatePhase(index, 'ph_target_min', Number(e.target.value))} className="w-full px-2 py-1 rounded bg-white dark:bg-black/30 border border-amber-200 dark:border-amber-800/50 text-sm outline-none text-center" placeholder="Min" />
                          <span className="text-gray-400">-</span>
                          <input type="number" step="0.1" value={phase.ph_target_max} onChange={e => updatePhase(index, 'ph_target_max', Number(e.target.value))} className="w-full px-2 py-1 rounded bg-white dark:bg-black/30 border border-amber-200 dark:border-amber-800/50 text-sm outline-none text-center" placeholder="Max" />
                        </div>
                      </div>
                    </div>

                    {/* Irrigation Data */}
                    <div className="md:col-span-3 space-y-3">
                      <div>
                        <label className="block text-xs font-semibold mb-1 text-gray-500 dark:text-gray-400">Volume Air (L/Siraman)</label>
                        <input type="number" step="0.1" value={phase.water_volume_liters} onChange={e => updatePhase(index, 'water_volume_liters', Number(e.target.value))} className="w-full px-3 py-1.5 rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-black/20 text-sm outline-none focus:ring-1 focus:ring-primary-500" />
                      </div>
                    </div>

                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/5 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors">
            Batal
          </button>
          <button 
            type="button" 
            onClick={handleSubmit} 
            disabled={isSubmitting}
            className="btn-premium px-6 py-2.5 rounded-xl text-white font-semibold flex items-center gap-2 shadow-lg shadow-primary-500/20 bg-primary-600 hover:bg-primary-500 disabled:opacity-50"
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Save className="w-5 h-5" />
            )}
            {isSubmitting ? 'Menyimpan...' : 'Simpan Resep'}
          </button>
        </div>
      </div>
    </div>
  );
}
