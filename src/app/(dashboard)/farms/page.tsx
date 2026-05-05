'use client';

import { useState, useEffect, useCallback } from 'react';
import { MapPin, Plus, Edit, Trash2, X, Save, Loader2, ChevronDown, ChevronUp, AlertTriangle, Sprout, Layers } from 'lucide-react';
import { useRBAC } from '@/shared/hooks/useRBAC';
import { farmService } from '@/shared/services/farmService';
import { useT } from '@/shared/context/LanguageContext';
import { zoneService } from '@/shared/services/zoneService';
import type { Farm, Zone, ZoneStatus } from '@/shared/types/global.types';
import { FarmCardSkeleton, PageHeaderSkeleton } from '@/shared/components/Skeleton';
import { useToast } from '@/shared/context/ToastContext';

const EMPTY_ZONE = { name:'', area_ha: 0, crop_type:'', status:'idle' as ZoneStatus, latitude: undefined as number|undefined, longitude: undefined as number|undefined };

/* ─ Zone Modal ────────────────────────────────────────────────────── */
function ZoneModal({ farmId, initial, onClose, onSaved }: {
  farmId: string; initial: Zone | null;
  onClose: ()=>void; onSaved: ()=>void;
}) {
  const isEdit = !!initial;
  const t = useT();
  const [form, setForm] = useState(initial ? {
    name: initial.name, area_ha: initial.area_ha, crop_type: initial.crop_type,
  } : { ...EMPTY_ZONE });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const set = (k: string, v: string|number|undefined) => setForm((p:any) => ({...p,[k]:v}));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setErr(t('farms_zone_name_required')); return; }
    if (form.area_ha <= 0)  { setErr(t('farms_area_required')); return; }
    setLoading(true); setErr('');
    const payload = {
      name: form.name,
      area_ha: form.area_ha,
      crop_type: form.crop_type,
    };
    
    const result = isEdit
      ? await zoneService.updateZone(initial!.id, payload)
      : await zoneService.createZone({ farm_id: farmId, ...payload, status: 'idle' });
    setLoading(false);
    if (result.error) { setErr(result.error); return; }
    onSaved();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[90] flex items-center justify-center p-4" onClick={onClose}>
      <div className="glass-heavy w-full max-w-md rounded-2xl p-6 space-y-4" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm flex items-center gap-2" style={{color:'var(--surface-text)'}}>
            <Layers className="w-4 h-4 text-emerald-500"/>
            {isEdit ? `✏️ ${t('farms_edit_zone')}` : `➕ ${t('farms_add_zone')}`}
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/10">
            <X className="w-4 h-4" style={{color:'var(--surface-text-muted)'}}/>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium mb-1" style={{color:'var(--surface-text-muted)'}}>{t('farms_zone_name')} *</label>
              <input value={form.name} onChange={e=>set('name',e.target.value)} placeholder="Zona 1 - Sawah Utara"
                className="w-full px-3 py-2 rounded-xl glass-sm text-sm outline-none focus:ring-2 focus:ring-primary-500" style={{color:'var(--surface-text)'}}/>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{color:'var(--surface-text-muted)'}}>{t('farms_area')} *</label>
              <input type="number" min={0.1} step={0.1} value={form.area_ha||''} onChange={e=>set('area_ha',parseFloat(e.target.value)||0)}
                placeholder="0.0" className="w-full px-3 py-2 rounded-xl glass-sm text-sm outline-none focus:ring-2 focus:ring-primary-500" style={{color:'var(--surface-text)'}}/>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{color:'var(--surface-text-muted)'}}>{t('farms_crop')}</label>
              <input value={form.crop_type} onChange={e=>set('crop_type',e.target.value)} placeholder="Padi, Jagung..."
                className="w-full px-3 py-2 rounded-xl glass-sm text-sm outline-none focus:ring-2 focus:ring-primary-500" style={{color:'var(--surface-text)'}}/>
            </div>
          </div>
          {err && <p className="text-xs text-danger-500 flex items-center gap-1"><AlertTriangle className="w-3 h-3"/>{err}</p>}
          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={loading}
              className="flex-1 py-2.5 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 flex items-center justify-center gap-2 disabled:opacity-60">
              {loading?<Loader2 className="w-4 h-4 animate-spin"/>:<Save className="w-4 h-4"/>}
              {isEdit? t('common_save') : t('farms_add_zone')}
            </button>
            <button type="button" onClick={onClose}
              className="px-4 py-2.5 rounded-xl glass-sm text-sm" style={{color:'var(--surface-text-muted)'}}>{t('common_cancel')}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Form default ───────────────────────────────────────────── */
const EMPTY: Omit<Farm, 'id' | 'created_at'> = {
  name: '', description: '', location_address: '',
  location_lat: undefined, location_lng: undefined,
  total_area_ha: 0, owner_name: '',
};

/* ─── Farm Form Modal ────────────────────────────────────────── */
function FarmModal({
  initial, onClose, onSaved,
}: {
  initial: Farm | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!initial;
  const t = useT();
  const [form, setForm] = useState<Omit<Farm, 'id' | 'created_at'>>(
    initial ? {
      name: initial.name, description: initial.description ?? '',
      location_address: initial.location_address ?? '',
      location_lat: initial.location_lat, location_lng: initial.location_lng,
      total_area_ha: initial.total_area_ha, owner_name: initial.owner_name ?? '',
    } : { ...EMPTY }
  );
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const set = (k: keyof typeof form, v: string | number | undefined) =>
    setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setErr(t('farms_farm_name_required')); return; }
    if (form.total_area_ha <= 0) { setErr(t('farms_area_required')); return; }
    setLoading(true); setErr('');
    const result = isEdit
      ? await farmService.updateFarm(initial!.id, form)
      : await farmService.createFarm(form);
    setLoading(false);
    if (result.error) { setErr(result.error); return; }
    onSaved();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[80] flex items-center justify-center p-4" onClick={onClose}>
      <div className="glass-heavy w-full max-w-lg rounded-2xl p-6 animate-scale-in space-y-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold flex items-center gap-2" style={{ color: 'var(--surface-text)' }}>
            <MapPin className="w-4 h-4 text-primary-500" />
            {isEdit ? `✏️ ${t('farms_edit_farm')}` : `➕ ${t('farms_add_new_farm')}`}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
            <X className="w-4 h-4" style={{ color: 'var(--surface-text-muted)' }} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--surface-text-muted)' }}>{t('farms_farm_name')} *</label>
            <input value={form.name} onChange={e => set('name', e.target.value)} required
              placeholder="Contoh: Lahan Bitanic Cirebon"
              className="w-full px-3 py-2.5 rounded-xl glass-sm text-sm outline-none focus:ring-2 focus:ring-primary-500"
              style={{ color: 'var(--surface-text)' }} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--surface-text-muted)' }}>{t('farms_owner_name')}</label>
              <input value={form.owner_name ?? ''} onChange={e => set('owner_name', e.target.value)}
                placeholder="Nama pemilik lahan"
                className="w-full px-3 py-2.5 rounded-xl glass-sm text-sm outline-none focus:ring-2 focus:ring-primary-500"
                style={{ color: 'var(--surface-text)' }} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--surface-text-muted)' }}>Total {t('farms_area')} *</label>
              <input type="number" min={0.1} step={0.1} value={form.total_area_ha || ''}
                onChange={e => set('total_area_ha', parseFloat(e.target.value) || 0)}
                placeholder="0.0"
                className="w-full px-3 py-2.5 rounded-xl glass-sm text-sm outline-none focus:ring-2 focus:ring-primary-500"
                style={{ color: 'var(--surface-text)' }} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--surface-text-muted)' }}>Alamat / {t('farms_location')}</label>
            <input value={form.location_address ?? ''} onChange={e => set('location_address', e.target.value)}
              placeholder="Desa, Kecamatan, Kota, Provinsi"
              className="w-full px-3 py-2.5 rounded-xl glass-sm text-sm outline-none focus:ring-2 focus:ring-primary-500"
              style={{ color: 'var(--surface-text)' }} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--surface-text-muted)' }}>Latitude</label>
              <input type="number" step="any" value={form.location_lat ?? ''}
                onChange={e => set('location_lat', parseFloat(e.target.value) || undefined)}
                placeholder="-6.8150"
                className="w-full px-3 py-2.5 rounded-xl glass-sm text-sm font-mono outline-none focus:ring-2 focus:ring-primary-500"
                style={{ color: 'var(--surface-text)' }} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--surface-text-muted)' }}>Longitude</label>
              <input type="number" step="any" value={form.location_lng ?? ''}
                onChange={e => set('location_lng', parseFloat(e.target.value) || undefined)}
                placeholder="107.6150"
                className="w-full px-3 py-2.5 rounded-xl glass-sm text-sm font-mono outline-none focus:ring-2 focus:ring-primary-500"
                style={{ color: 'var(--surface-text)' }} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--surface-text-muted)' }}>{t('farms_description')}</label>
            <textarea value={form.description ?? ''} onChange={e => set('description', e.target.value)}
              rows={3} placeholder="Keterangan singkat tentang lahan ini..."
              className="w-full px-3 py-2.5 rounded-xl glass-sm text-sm outline-none focus:ring-2 focus:ring-primary-500 resize-none"
              style={{ color: 'var(--surface-text)' }} />
          </div>

          {err && (
            <p className="text-xs text-danger-500 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" /> {err}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={loading}
              className="flex-1 py-2.5 bg-primary-500 text-white font-bold rounded-xl hover:bg-primary-600 transition-all glow-sm flex items-center justify-center gap-2 disabled:opacity-60">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {isEdit ? t('common_save_changes') : t('farms_create_farm')}
            </button>
            <button type="button" onClick={onClose}
              className="px-5 py-2.5 rounded-xl glass-sm font-medium text-sm hover:scale-105 transition-transform"
              style={{ color: 'var(--surface-text-muted)' }}>
              {t('common_cancel')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Delete Confirm Modal ───────────────────────────────────── */
function DeleteModal({ farm, onClose, onDeleted }: { farm: Farm; onClose: () => void; onDeleted: () => void }) {
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const match = confirm.trim().toLowerCase() === farm.name.trim().toLowerCase();
  const t = useT();

  const handleDelete = async () => {
    if (!match) return;
    setLoading(true);
    await farmService.deleteFarm(farm.id);
    setLoading(false);
    onDeleted();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[80] flex items-center justify-center p-4" onClick={onClose}>
      <div className="glass-heavy w-full max-sm rounded-2xl p-6 animate-scale-in space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-danger-500/15 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-danger-500" />
          </div>
          <div>
            <h3 className="font-bold text-sm" style={{ color: 'var(--surface-text)' }}>{t('farms_delete_farm')}</h3>
            <p className="text-xs" style={{ color: 'var(--surface-text-muted)' }}>{t('common_undone_warn')}</p>
          </div>
        </div>
        <p className="text-sm" style={{ color: 'var(--surface-text-muted)' }}>
          {t('farms_confirm_delete_farm').replace('{name}', farm.name)}
        </p>
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--surface-text-muted)' }}>
            {t('farms_confirm_delete_hint')}
          </label>
          <input value={confirm} onChange={e => setConfirm(e.target.value)}
            placeholder={farm.name}
            className="w-full px-3 py-2.5 rounded-xl glass-sm text-sm outline-none focus:ring-2 focus:ring-danger-500"
            style={{ color: 'var(--surface-text)' }} />
        </div>
        <div className="flex gap-3">
          <button onClick={handleDelete} disabled={!match || loading}
            className="flex-1 py-2.5 rounded-xl bg-danger-500 text-white font-bold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-40 hover:bg-danger-600">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            {t('farms_delete_farm')}
          </button>
          <button onClick={onClose}
            className="px-5 py-2.5 rounded-xl glass-sm font-medium text-sm"
            style={{ color: 'var(--surface-text-muted)' }}>
            {t('common_cancel')}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Farm Card ──────────────────────────────────────────────── */
function FarmCard({
  farm, canManage,
  onEdit, onDelete,
}: {
  farm: Farm; canManage: boolean;
  onEdit: (f: Farm) => void;
  onDelete: (f: Farm) => void;
}) {
  const [zones, setZones] = useState<Zone[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [loadingZones, setLoadingZones] = useState(false);
  const [zoneModal, setZoneModal] = useState<{open:boolean; zone:Zone|null}>({open:false,zone:null});
  const [deleteZone, setDeleteZone] = useState<Zone|null>(null);
  const [deletingZone, setDeletingZone] = useState(false);
  const { success } = useToast();
  const t = useT();

  const reloadZones = useCallback(async () => {
    const z = await farmService.getZonesByFarm(farm.id);
    setZones(z);
  }, [farm.id]);

  const loadZones = useCallback(async () => {
    if (zones.length > 0) { setExpanded(e => !e); return; }
    setLoadingZones(true);
    const z = await farmService.getZonesByFarm(farm.id);
    setZones(z);
    setLoadingZones(false);
    setExpanded(true);
  }, [farm.id, zones.length]);

  const handleDeleteZone = async () => {
    if (!deleteZone) return;
    setDeletingZone(true);
    const { error } = await zoneService.deleteZone(deleteZone.id);
    setDeletingZone(false);
    
    if (error) {
      console.error('[zone] delete error:', error);
      alert(t('common_error') + `: ${error}`);
      setDeleteZone(null);
      return;
    }
    
    setZones(prev => prev.filter(z => z.id !== deleteZone.id));
    const deleted = deleteZone;
    setDeleteZone(null);
    success(t('common_success'), `${deleted.name} ${t('common_delete').toLowerCase()}!`);
  };

  const STATUS_COLOR: Record<string, string> = {
    irrigating: '#3B82F6', fertigating: '#8B5CF6',
    idle: '#9CA3AF', delayed: '#F59E0B', error: '#EF4444',
  };

  return (
    <div className="glass p-5 space-y-4 opacity-0 animate-fade-in-up" style={{ animationFillMode: 'forwards' }}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary-400 to-primary-700 flex items-center justify-center text-white shrink-0 shadow-md">
            <Sprout className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base leading-tight" style={{ color: 'var(--surface-text)' }}>{farm.name}</h3>
            {farm.owner_name && (
              <p className="text-xs mt-0.5" style={{ color: 'var(--surface-text-muted)' }}>👤 {farm.owner_name}</p>
            )}
          </div>
        </div>
        {canManage && (
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={() => onEdit(farm)}
              className="p-1.5 rounded-lg hover:bg-primary-500/10 transition-colors" title={t('common_edit')}>
              <Edit className="w-4 h-4 text-primary-500" />
            </button>
            <button onClick={() => onDelete(farm)}
              className="p-1.5 rounded-lg hover:bg-danger-500/10 transition-colors" title={t('common_delete')}>
              <Trash2 className="w-4 h-4 text-danger-500" />
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="glass-sm p-2.5 rounded-xl">
          <p style={{ color: 'var(--surface-text-muted)' }}>{t('farms_total_area')}</p>
          <p className="font-bold mt-0.5" style={{ color: 'var(--surface-text)' }}>{farm.total_area_ha} ha</p>
        </div>
        <div className="glass-sm p-2.5 rounded-xl">
          <p style={{ color: 'var(--surface-text-muted)' }}>{t('farms_zones')}</p>
          <p className="font-bold mt-0.5" style={{ color: 'var(--surface-text)' }}>
            {zones.length > 0 ? `${zones.length} ${t('farms_zones').toLowerCase()}` : '—'}
          </p>
        </div>
        {farm.location_address && (
          <div className="col-span-2 glass-sm p-2.5 rounded-xl flex items-start gap-1.5">
            <MapPin className="w-3 h-3 text-primary-500 shrink-0 mt-0.5" />
            <p style={{ color: 'var(--surface-text-muted)' }}>{farm.location_address}</p>
          </div>
        )}
        {farm.description && (
          <div className="col-span-2 text-xs" style={{ color: 'var(--surface-text-muted)' }}>
            {farm.description}
          </div>
        )}
      </div>

      <button onClick={loadZones}
        className="w-full flex items-center justify-between px-3 py-2 rounded-xl transition-colors text-xs font-medium"
        style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)', color: 'var(--surface-text-muted)' }}>
        <span className="flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5" />
          {loadingZones ? t('common_loading') : `${expanded ? t('common_hide') : t('common_view')} ${t('farms_zones')}`}
        </span>
        {loadingZones
          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
          : expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>

      {expanded && zones.length > 0 && (
        <div className="space-y-1.5">
          {zones.map(z => (
            <div key={z.id} className="flex items-center justify-between px-3 py-2 rounded-xl glass-sm text-xs group">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ background: STATUS_COLOR[z.status] ?? '#9CA3AF' }} />
                <span style={{ color: 'var(--surface-text)' }}>{z.name.split(' - ')[1] || z.name}</span>
                <span className="text-[10px]" style={{ color: 'var(--surface-text-muted)' }}>{z.crop_type}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono" style={{ color: 'var(--surface-text-muted)' }}>{z.area_ha} ha</span>
                {canManage && (
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={()=>setZoneModal({open:true,zone:z})}
                      className="p-1 rounded hover:bg-primary-500/20" title={t('common_edit')}>
                      <Edit className="w-3 h-3 text-primary-500"/>
                    </button>
                    <button onClick={()=>setDeleteZone(z)}
                      className="p-1 rounded hover:bg-danger-500/20" title={t('common_delete')}>
                      <Trash2 className="w-3 h-3 text-danger-500"/>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {expanded && zones.length === 0 && !loadingZones && (
        <p className="text-xs text-center py-2" style={{ color: 'var(--surface-text-muted)' }}>{t('farms_no_zones')}</p>
      )}

      {expanded && canManage && (
        <button onClick={()=>setZoneModal({open:true,zone:null})}
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium border-dashed border-2 hover:border-emerald-500 hover:text-emerald-600 transition-all"
          style={{borderColor:'var(--surface-border)',color:'var(--surface-text-muted)'}}>
          <Plus className="w-3.5 h-3.5"/> {t('farms_add_zone')}
        </button>
      )}

      {zoneModal.open && (
        <ZoneModal
          farmId={farm.id}
          initial={zoneModal.zone}
          onClose={()=>setZoneModal({open:false,zone:null})}
          onSaved={async ()=>{
            setZoneModal({open:false,zone:null});
            await reloadZones();
            success(t('common_success'), zoneModal.zone ? t('farms_zone_updated') : t('farms_zone_added'));
          }}
        />
      )}

      {deleteZone && (
        <div className="fixed inset-0 bg-black/60 z-[90] flex items-center justify-center p-4" onClick={()=>setDeleteZone(null)}>
          <div className="glass-heavy w-full max-w-xs rounded-2xl p-5 space-y-4" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-danger-500/15 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-danger-500"/>
              </div>
              <div>
                <p className="font-bold text-sm" style={{color:'var(--surface-text)'}}>{t('common_delete')} {t('common_zone')}</p>
                <p className="text-xs" style={{color:'var(--surface-text-muted)'}}>{t('common_undone_warn')}</p>
              </div>
            </div>
            <p className="text-sm" style={{color:'var(--surface-text-muted)'}}>
              {t('farms_confirm_delete_zone').replace('{name}', deleteZone.name)}
            </p>
            <div className="flex gap-3">
              <button onClick={handleDeleteZone} disabled={deletingZone}
                className="flex-1 py-2.5 rounded-xl bg-danger-500 text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-danger-600 disabled:opacity-50">
                {deletingZone?<Loader2 className="w-4 h-4 animate-spin"/>:<Trash2 className="w-4 h-4"/>}
                {t('common_delete')}
              </button>
              <button onClick={()=>setDeleteZone(null)}
                className="px-4 py-2.5 rounded-xl glass-sm text-sm" style={{color:'var(--surface-text-muted)'}}>{t('common_cancel')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────────────── */
export default function FarmsPage() {
  const { canAccess } = useRBAC();
  const canManage = canAccess('farm_management');
  const { success } = useToast();
  const t = useT();

  const [farms, setFarms] = useState<Farm[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Farm | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Farm | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await farmService.getFarms();
    setFarms(data);
    setLoading(false);
  }, []);

  useEffect(() => { 
    load(); 
  }, [load]);

  const openCreate = () => { setEditTarget(null); setShowForm(true); };
  const openEdit   = (f: Farm) => { setEditTarget(f); setShowForm(true); };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">

      {loading ? (
        <PageHeaderSkeleton />
      ) : (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: 'var(--surface-text)' }}>
              <MapPin className="w-5 h-5 text-primary-500" />
              {t('farms_title')}
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--surface-text-muted)' }}>
              {farms.length} {t('common_farm').toLowerCase()} {t('common_lang_code') === 'id' ? 'terdaftar' : 'registered'} {!canManage && `· ${t('farms_read_only')}`}
            </p>
          </div>
          {canManage && (
            <button onClick={openCreate}
              className="flex items-center gap-2 px-4 py-2.5 bg-primary-500 text-white rounded-xl font-medium text-sm hover:bg-primary-600 transition-all shadow-lg glow-sm hover:glow-md active:scale-[0.98]">
              <Plus className="w-4 h-4" /> {t('farms_add')}
            </button>
          )}
        </div>
      )}

      {!canManage && canAccess('farms') && (
        <div className="glass-sm px-4 py-3 rounded-xl flex items-center gap-3 text-sm"
          style={{ borderLeft: '3px solid var(--color-primary-500)' }}>
          <MapPin className="w-4 h-4 text-primary-500 shrink-0" />
          <span style={{ color: 'var(--surface-text-muted)' }}>
            {t('common_lang_code') === 'id' ? 'Kamu bisa melihat data lahan. Untuk menambah/mengubah lahan, hubungi' : 'You can view farm data. To add/edit farms, contact'} <strong style={{ color: 'var(--surface-text)' }}>Super Admin</strong>.
          </span>
        </div>
      )}

      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <FarmCardSkeleton key={i} />)}
        </div>
      )}

      {!loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {farms.map((farm, i) => (
            <div key={farm.id} style={{ animationDelay: `${i * 100}ms` }}>
              <FarmCard
                farm={farm}
                canManage={canManage}
                onEdit={openEdit}
                onDelete={setDeleteTarget}
              />
            </div>
          ))}

          {canManage && (
            <button onClick={openCreate}
              className="glass border-2 border-dashed rounded-2xl p-5 flex flex-col items-center justify-center gap-3 min-h-[200px] transition-all hover:scale-[1.01] group"
              style={{ borderColor: 'var(--surface-border)' }}>
              <div className="w-12 h-12 rounded-full bg-primary-500/10 flex items-center justify-center group-hover:bg-primary-500/20 transition-colors">
                <Plus className="w-6 h-6 text-primary-500" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold" style={{ color: 'var(--surface-text)' }}>{t('farms_add')} {t('common_lang_code') === 'id' ? 'Baru' : 'New'}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--surface-text-muted)' }}>{t('common_lang_code') === 'id' ? 'Klik untuk menambah lahan' : 'Click to add farm'}</p>
              </div>
            </button>
          )}

          {farms.length === 0 && !canManage && (
            <div className="col-span-full glass p-12 text-center rounded-2xl">
              <Sprout className="w-12 h-12 mx-auto text-primary-200 mb-3" />
              <p className="text-sm font-medium" style={{ color: 'var(--surface-text-muted)' }}>
                {t('farms_no_farms')}
              </p>
            </div>
          )}
        </div>
      )}

      {showForm && (
        <FarmModal
          initial={editTarget}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            load();
            success(t('common_success'), editTarget ? t('farms_farm_updated') : t('farms_farm_added'));
          }}
        />
      )}
      {deleteTarget && (
        <DeleteModal
          farm={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleted={() => {
            setDeleteTarget(null);
            load();
            success(t('common_success'), `${deleteTarget.name} ${t('common_delete').toLowerCase()}!`);
          }}
        />
      )}
    </div>
  );
}
