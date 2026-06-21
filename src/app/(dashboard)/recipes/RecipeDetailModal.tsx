'use client';

import { useState } from 'react';
import { X, Edit, Trash2, FlaskConical, Droplet, Sprout, Save, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import type { NutrientRecipe, RecipePhase } from '@/shared/types/global.types';
import { recipeService } from '@/shared/services/recipeService';
import { cn } from '@/shared/lib/utils';
import { useRBAC } from '@/shared/hooks/useRBAC';

interface RecipeDetailModalProps {
  recipe: NutrientRecipe;
  isOpen: boolean;
  onClose: () => void;
  onDelete: (id: string) => void;
  onUpdate: (updated: NutrientRecipe) => void;
}

export default function RecipeDetailModal({ recipe, isOpen, onClose, onDelete, onUpdate }: RecipeDetailModalProps) {
  const { role } = useRBAC();
  const isViewer = role === 'viewer';
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [expandedPhase, setExpandedPhase] = useState<number | null>(0);

  // Editable state
  const [editName, setEditName] = useState(recipe.name);
  const [editDesc, setEditDesc] = useState(recipe.description || '');
  const [editPhases, setEditPhases] = useState<RecipePhase[]>(recipe.phases || []);

  if (!isOpen) return null;

  const totalDays = Math.max(...(recipe.phases?.map(p => p.day_end) || [0]));
  const maxEC = Math.max(...(recipe.phases?.map(p => p.ec_target_max) || [0]));

  const updatePhase = (idx: number, field: string, val: number) => {
    setEditPhases(prev => prev.map((p, i) => i === idx ? { ...p, [field]: val } : p));
  };

  const handleSave = async () => {
    if (isViewer) return;
    setIsSaving(true);
    try {
      // Update name/description
      const { error } = await recipeService.updateRecipe(recipe.id, {
        name: editName,
        description: editDesc,
      }, editPhases);
      if (error) throw new Error(error);
      onUpdate({ ...recipe, name: editName, description: editDesc, phases: editPhases });
      setIsEditing(false);
    } catch (e: any) {
      alert('Gagal menyimpan: ' + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (isViewer) return;
    setIsDeleting(true);
    try {
      const { error } = await recipeService.deleteRecipe(recipe.id);
      if (error) throw new Error(error);
      onDelete(recipe.id);
      onClose();
    } catch (e: any) {
      alert('Gagal menghapus: ' + e.message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-in fade-in">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-3xl flex flex-col max-h-[92vh] rounded-2xl shadow-2xl overflow-hidden"
        style={{ background: 'var(--surface-card)', border: '1px solid var(--glass-border)' }}>

        {/* Header */}
        <div className="p-5 flex items-start justify-between gap-4 border-b shrink-0" style={{ borderColor: 'var(--surface-border)' }}>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-primary-500/15 flex items-center justify-center text-2xl shrink-0">
              {recipe.phases?.[0]?.emoji || '🌱'}
            </div>
            <div>
              {isEditing ? (
                <input
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="font-bold text-lg bg-transparent border-b-2 border-primary-500 outline-none w-full"
                  style={{ color: 'var(--surface-text)' }}
                />
              ) : (
                <h2 className="font-bold text-lg leading-tight" style={{ color: 'var(--surface-text)' }}>{recipe.name}</h2>
              )}
              <p className="text-xs mt-0.5" style={{ color: 'var(--surface-text-muted)' }}>
                {totalDays} hari total · {recipe.phases?.length || 0} fase pertumbuhan
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {!isEditing && !isViewer && (
              <>
                <button onClick={() => setIsEditing(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary-500/10 text-primary-600 hover:bg-primary-500/20 transition-colors">
                  <Edit className="w-3.5 h-3.5" /> Edit
                </button>
                <button onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" /> Hapus
                </button>
              </>
            )}
            {isEditing && (
              <>
                <button onClick={() => setIsEditing(false)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors"
                  style={{ borderColor: 'var(--surface-border)', color: 'var(--surface-text-muted)' }}>
                  Batal
                </button>
                <button onClick={handleSave} disabled={isSaving}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary-500 text-white hover:bg-primary-600 transition-colors disabled:opacity-50">
                  <Save className="w-3.5 h-3.5" />
                  {isSaving ? 'Menyimpan...' : 'Simpan'}
                </button>
              </>
            )}
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors" style={{ color: 'var(--surface-text-muted)' }}>
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-3 p-5 border-b shrink-0" style={{ borderColor: 'var(--surface-border)' }}>
          <div className="glass-sm rounded-xl p-3 text-center">
            <Sprout className="w-4 h-4 text-primary-500 mx-auto mb-1" />
            <p className="text-xl font-bold" style={{ color: 'var(--surface-text)' }}>{recipe.phases?.length || 0}</p>
            <p className="text-[11px]" style={{ color: 'var(--surface-text-muted)' }}>Total Fase</p>
          </div>
          <div className="glass-sm rounded-xl p-3 text-center">
            <FlaskConical className="w-4 h-4 text-blue-400 mx-auto mb-1" />
            <p className="text-xl font-bold" style={{ color: 'var(--surface-text)' }}>{maxEC.toFixed(1)}</p>
            <p className="text-[11px]" style={{ color: 'var(--surface-text-muted)' }}>EC Max (mS/cm)</p>
          </div>
          <div className="glass-sm rounded-xl p-3 text-center">
            <Droplet className="w-4 h-4 text-cyan-400 mx-auto mb-1" />
            <p className="text-xl font-bold" style={{ color: 'var(--surface-text)' }}>{totalDays}</p>
            <p className="text-[11px]" style={{ color: 'var(--surface-text-muted)' }}>Hari Total</p>
          </div>
        </div>

        {/* EC Curve Visualization */}
        <div className="px-5 pt-4 shrink-0">
          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--surface-text-muted)' }}>Kurva Target EC</p>
          <div className="flex items-end gap-1 h-14 w-full">
            {(isEditing ? editPhases : recipe.phases || []).map((phase, i) => {
              const height = maxEC > 0 ? (phase.ec_target_max / maxEC) * 100 : 50;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-0.5" title={`${phase.name}: ${phase.ec_target_min}–${phase.ec_target_max} mS/cm`}>
                  <div
                    className="w-full rounded-t-sm transition-all duration-500"
                    style={{
                      height: `${height}%`,
                      background: `linear-gradient(to top, var(--primary-600), var(--accent-500))`,
                      opacity: 0.7 + (i / (recipe.phases?.length || 1)) * 0.3,
                    }}
                  />
                  <span className="text-[8px] truncate w-full text-center" style={{ color: 'var(--surface-text-muted)' }}>
                    {phase.emoji}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Deskripsi */}
        <div className="px-5 pt-3 shrink-0">
          {isEditing ? (
            <textarea
              value={editDesc}
              onChange={e => setEditDesc(e.target.value)}
              rows={2}
              placeholder="Deskripsi resep..."
              className="w-full px-3 py-2 rounded-xl text-sm resize-none outline-none focus:ring-2 focus:ring-primary-500 glass-sm"
              style={{ color: 'var(--surface-text)' }}
            />
          ) : recipe.description ? (
            <p className="text-sm italic" style={{ color: 'var(--surface-text-muted)' }}>"{recipe.description}"</p>
          ) : null}
        </div>

        {/* Phase List */}
        <div className="flex-1 overflow-y-auto px-5 pb-5 pt-3 space-y-2 custom-scrollbar">
          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--surface-text-muted)' }}>Detail Fase</p>
          {(isEditing ? editPhases : recipe.phases || []).map((phase, i) => (
            <div key={i} className="rounded-xl border overflow-hidden transition-all" style={{ borderColor: 'var(--surface-border)' }}>
              <button
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/5 transition-colors"
                onClick={() => setExpandedPhase(expandedPhase === i ? null : i)}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{phase.emoji}</span>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--surface-text)' }}>{phase.name}</p>
                    <p className="text-[11px]" style={{ color: 'var(--surface-text-muted)' }}>
                      Hari {phase.day_start}–{phase.day_end} · EC {phase.ec_target_min}–{phase.ec_target_max} mS/cm
                    </p>
                  </div>
                </div>
                {expandedPhase === i ? <ChevronUp className="w-4 h-4" style={{ color: 'var(--surface-text-muted)' }} /> : <ChevronDown className="w-4 h-4" style={{ color: 'var(--surface-text-muted)' }} />}
              </button>

              {expandedPhase === i && (
                <div className="px-4 pb-4 grid grid-cols-2 gap-3 border-t" style={{ borderColor: 'var(--surface-border)' }}>
                  {/* EC */}
                  <div className="mt-3 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                    <p className="text-[11px] font-semibold text-blue-400 mb-2">Target EC (mS/cm)</p>
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <input type="number" step="0.1" value={phase.ec_target_min} onChange={e => updatePhase(i, 'ec_target_min', Number(e.target.value))}
                          className="w-full px-2 py-1 rounded-lg text-sm text-center bg-white/10 outline-none focus:ring-1 focus:ring-blue-400" style={{ color: 'var(--surface-text)' }} />
                        <span className="text-xs" style={{ color: 'var(--surface-text-muted)' }}>–</span>
                        <input type="number" step="0.1" value={phase.ec_target_max} onChange={e => updatePhase(i, 'ec_target_max', Number(e.target.value))}
                          className="w-full px-2 py-1 rounded-lg text-sm text-center bg-white/10 outline-none focus:ring-1 focus:ring-blue-400" style={{ color: 'var(--surface-text)' }} />
                      </div>
                    ) : (
                      <p className="text-lg font-bold" style={{ color: 'var(--surface-text)' }}>{phase.ec_target_min} – {phase.ec_target_max}</p>
                    )}
                  </div>
                  {/* pH */}
                  <div className="mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                    <p className="text-[11px] font-semibold text-amber-400 mb-2">Target pH</p>
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <input type="number" step="0.1" value={phase.ph_target_min} onChange={e => updatePhase(i, 'ph_target_min', Number(e.target.value))}
                          className="w-full px-2 py-1 rounded-lg text-sm text-center bg-white/10 outline-none focus:ring-1 focus:ring-amber-400" style={{ color: 'var(--surface-text)' }} />
                        <span className="text-xs" style={{ color: 'var(--surface-text-muted)' }}>–</span>
                        <input type="number" step="0.1" value={phase.ph_target_max} onChange={e => updatePhase(i, 'ph_target_max', Number(e.target.value))}
                          className="w-full px-2 py-1 rounded-lg text-sm text-center bg-white/10 outline-none focus:ring-1 focus:ring-amber-400" style={{ color: 'var(--surface-text)' }} />
                      </div>
                    ) : (
                      <p className="text-lg font-bold" style={{ color: 'var(--surface-text)' }}>{phase.ph_target_min} – {phase.ph_target_max}</p>
                    )}
                  </div>
                  {/* Volume Air */}
                  <div className="p-3 rounded-xl glass-sm col-span-2">
                    <p className="text-[11px] font-semibold mb-1" style={{ color: 'var(--surface-text-muted)' }}>Volume Air per Siraman</p>
                    {isEditing ? (
                      <input type="number" step="0.1" value={phase.water_volume_liters} onChange={e => updatePhase(i, 'water_volume_liters', Number(e.target.value))}
                        className="w-32 px-2 py-1 rounded-lg text-sm bg-white/10 outline-none focus:ring-1 focus:ring-primary-500" style={{ color: 'var(--surface-text)' }} />
                    ) : (
                      <p className="text-base font-bold" style={{ color: 'var(--surface-text)' }}>{phase.water_volume_liters} L/siraman</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Delete Confirm */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowDeleteConfirm(false)} />
          <div className="relative glass-heavy p-6 max-w-sm w-full rounded-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex justify-center">
              <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center">
                <AlertTriangle className="w-7 h-7 text-red-500" />
              </div>
            </div>
            <div className="text-center">
              <h3 className="font-bold text-base text-red-500">Hapus Resep?</h3>
              <p className="text-sm mt-2" style={{ color: 'var(--surface-text-muted)' }}>
                Resep <strong>"{recipe.name}"</strong> dan semua fasnya akan dihapus permanen. Tindakan ini tidak bisa dibatalkan.
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border text-sm font-medium transition-colors"
                style={{ borderColor: 'var(--surface-border)', color: 'var(--surface-text-muted)' }}>
                Batal
              </button>
              <button onClick={handleDelete} disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 transition-colors disabled:opacity-50">
                {isDeleting ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
