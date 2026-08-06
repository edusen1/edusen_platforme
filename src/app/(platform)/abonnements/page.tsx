'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api/client';
import { useTenants } from '@/hooks/use-platform';

const B = '#e6ebf1';
const PLANS = ['TRIAL', 'BASIC', 'PRO', 'ENTERPRISE'] as const;

type Tab = 'plans' | 'limites' | 'ecoles';

type FeatureRow = { key: string; label: string; defaults: boolean[] };
type Category = { name: string; features: FeatureRow[] };

const FEATURE_MATRIX: Category[] = [
  {
    name: 'WhatsApp',
    features: [
      { key: 'WHATSAPP_OTP', label: 'OTP creation compte', defaults: [true, true, true, true] },
      { key: 'WHATSAPP_COMMUNICATION', label: 'Messages parents/eleves', defaults: [false, false, true, true] },
      { key: 'WHATSAPP_BULLETIN', label: 'Envoi bulletins', defaults: [false, false, true, true] },
      { key: 'WHATSAPP_PAIEMENT', label: 'Notification paiement', defaults: [false, false, true, true] },
      { key: 'WHATSAPP_ABSENCE', label: 'Alerte absence', defaults: [false, false, false, true] },
      { key: 'WHATSAPP_BROADCAST', label: 'Diffusion masse', defaults: [false, false, false, true] },
    ],
  },
  {
    name: 'Documents & Exports',
    features: [
      { key: 'CARTES_SCOLAIRES', label: 'Cartes identite scolaires', defaults: [false, true, true, true] },
      { key: 'RECUS_PAIEMENT', label: 'Recus paiement PDF', defaults: [false, true, true, true] },
      { key: 'BULLETINS_PDF', label: 'Export bulletins PDF', defaults: [false, true, true, true] },
      { key: 'EXPORT_EXCEL', label: 'Export Excel', defaults: [false, true, true, true] },
      { key: 'RAPPORTS_AVANCES', label: 'Rapports analytiques', defaults: [false, false, true, true] },
    ],
  },
  {
    name: 'Administration',
    features: [
      { key: 'MULTI_ADMIN', label: 'Plusieurs admins', defaults: [false, false, true, true] },
      { key: 'POINTAGE', label: 'Pointage personnel', defaults: [false, true, true, true] },
      { key: 'PAIE_PERSONNEL', label: 'Gestion paie', defaults: [false, false, true, true] },
      { key: 'TEMPLATES_CUSTOM', label: 'Templates personnalises', defaults: [false, false, false, true] },
      { key: 'SECURITE_QR', label: 'Controle acces QR', defaults: [false, false, true, true] },
    ],
  },
];

const LIMIT_ROWS = [
  { key: 'MAX_ELEVES', label: 'Eleves max', defaults: [50, 500, 2000, -1] },
  { key: 'MAX_ADMINS', label: 'Admins max', defaults: [1, 1, 3, -1] },
  { key: 'STOCKAGE_GO', label: 'Stockage (Go)', defaults: [1, 5, 20, 100] },
  { key: 'DUREE_ESSAI', label: 'Duree essai (jours)', defaults: [30, 0, 0, 0] },
];

const ALL_FEATURE_KEYS = FEATURE_MATRIX.flatMap((c) => c.features.map((f) => f.key));

export default function AbonnementsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('plans');
  const [featureState, setFeatureState] = useState<Record<string, boolean>>({});
  const [limitState, setLimitState] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Ecoles tab
  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [tenantOverrides, setTenantOverrides] = useState<Record<string, boolean | null>>({});
  const [tenantPlan, setTenantPlan] = useState('');
  const tenants = useTenants();

  // Load from backend
  const loadFeatures = useCallback(async () => {
    try {
      const res = await apiClient.get('/platform/features');
      const data = res.data as { planFeatures: { plan: string; featureKey: string; actif: boolean }[]; limits: { plan: string; limitKey: string; limitValue: number }[] };
      const state: Record<string, boolean> = {};
      // Init with defaults
      for (const cat of FEATURE_MATRIX) {
        for (const f of cat.features) {
          PLANS.forEach((p, pi) => { state[`${p}:${f.key}`] = f.defaults[pi]; });
        }
      }
      // Override with DB values
      for (const pf of data.planFeatures) {
        state[`${pf.plan}:${pf.featureKey}`] = pf.actif;
      }
      setFeatureState(state);

      const lState: Record<string, number> = {};
      for (const lr of LIMIT_ROWS) {
        PLANS.forEach((p, pi) => { lState[`${p}:${lr.key}`] = lr.defaults[pi]; });
      }
      for (const l of data.limits) {
        lState[`${l.plan}:${l.limitKey}`] = l.limitValue;
      }
      setLimitState(lState);
      setLoaded(true);
    } catch {
      // Use defaults
      const state: Record<string, boolean> = {};
      for (const cat of FEATURE_MATRIX) {
        for (const f of cat.features) {
          PLANS.forEach((p, pi) => { state[`${p}:${f.key}`] = f.defaults[pi]; });
        }
      }
      setFeatureState(state);
      setLoaded(true);
    }
  }, []);

  useEffect(() => { loadFeatures(); }, [loadFeatures]);

  const toggleFeature = async (plan: string, key: string) => {
    const stateKey = `${plan}:${key}`;
    const newVal = !featureState[stateKey];
    setFeatureState((s) => ({ ...s, [stateKey]: newVal }));
    setSaving(stateKey);
    try {
      await apiClient.put(`/platform/features/${plan}/${key}`, { actif: newVal });
    } catch {
      setFeatureState((s) => ({ ...s, [stateKey]: !newVal }));
      toast.error('Erreur lors de la sauvegarde');
    }
    setSaving(null);
  };

  // Load tenant overrides
  const loadTenantOverrides = useCallback(async (tenantId: string) => {
    if (!tenantId) return;
    try {
      const res = await apiClient.get(`/platform/tenants/${tenantId}/features`);
      const data = res.data as { plan: string; overrides: { featureKey: string; actif: boolean }[]; resolved: { featureKey: string; actif: boolean; source: string }[] };
      setTenantPlan(data.plan);
      const ov: Record<string, boolean | null> = {};
      for (const key of ALL_FEATURE_KEYS) ov[key] = null; // null = selon plan
      for (const o of data.overrides) ov[o.featureKey] = o.actif;
      setTenantOverrides(ov);
    } catch {
      toast.error('Erreur chargement des fonctionnalites');
    }
  }, []);

  useEffect(() => { if (selectedTenantId) loadTenantOverrides(selectedTenantId); }, [selectedTenantId, loadTenantOverrides]);

  const toggleTenantOverride = async (key: string) => {
    if (!selectedTenantId) return;
    const current = tenantOverrides[key];
    // Cycle: null → true → false → null
    let next: boolean | null;
    if (current === null) next = true;
    else if (current === true) next = false;
    else next = null;

    setTenantOverrides((s) => ({ ...s, [key]: next }));
    try {
      if (next === null) {
        await apiClient.delete(`/platform/tenants/${selectedTenantId}/features/${key}`);
      } else {
        await apiClient.put(`/platform/tenants/${selectedTenantId}/features/${key}`, { actif: next });
      }
    } catch {
      setTenantOverrides((s) => ({ ...s, [key]: current }));
      toast.error('Erreur');
    }
  };

  const planIndex = useMemo(() => PLANS.indexOf(tenantPlan as typeof PLANS[number]), [tenantPlan]);

  const tabStyle = (active: boolean): React.CSSProperties => ({
    height: 38,
    border: 'none',
    borderBottom: active ? '2px solid #2563eb' : '2px solid transparent',
    background: 'transparent',
    color: active ? '#2563eb' : '#64748b',
    fontSize: 13,
    fontWeight: 700,
    padding: '0 18px',
    cursor: 'pointer',
    fontFamily: 'inherit',
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      {/* Header */}
      <div style={{ background: '#fff', borderBottom: `1px solid ${B}`, height: 62, flexShrink: 0, position: 'sticky' as const, top: 0, zIndex: 10, display: 'flex', alignItems: 'center', padding: '0 28px', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 700, color: '#0f172a' }}>Abonnements & Fonctionnalites</div>
          <div style={{ fontSize: 13, color: '#64748b' }}>Configurez les fonctionnalites par plan ou par ecole</div>
        </div>
      </div>

      <div style={{ padding: '14px 28px 28px' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, borderBottom: `1px solid ${B}`, marginBottom: 16 }}>
          <button style={tabStyle(activeTab === 'plans')} onClick={() => setActiveTab('plans')}>Par plan</button>
          <button style={tabStyle(activeTab === 'limites')} onClick={() => setActiveTab('limites')}>Limites</button>
          <button style={tabStyle(activeTab === 'ecoles')} onClick={() => setActiveTab('ecoles')}>Par ecole</button>
        </div>

        {/* ── Plans tab ── */}
        {activeTab === 'plans' && (
          <div>
            {!loaded && <div style={{ padding: '40px 0', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>Chargement...</div>}
            {loaded && (
              <div style={{ background: '#fff', border: `1px solid ${B}`, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.04em' }}>Fonctionnalite</th>
                      {PLANS.map((p) => (
                        <th key={p} style={{ padding: '10px 16px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#0f172a', width: 120 }}>{p}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {FEATURE_MATRIX.map((cat) => (
                      <>
                        <tr key={cat.name}>
                          <td colSpan={5} style={{ padding: '10px 16px', fontSize: 11, fontWeight: 700, color: '#2563eb', background: '#f8fafc', borderTop: `1px solid ${B}` }}>{cat.name}</td>
                        </tr>
                        {cat.features.map((f) => (
                          <tr key={f.key} style={{ borderTop: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '8px 16px' }}>
                              <div style={{ fontWeight: 500, color: '#0f172a' }}>{f.label}</div>
                              <div style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'monospace' }}>{f.key}</div>
                            </td>
                            {PLANS.map((p, pi) => {
                              const stateKey = `${p}:${f.key}`;
                              const on = featureState[stateKey] ?? f.defaults[pi];
                              const isSaving = saving === stateKey;
                              return (
                                <td key={p} style={{ padding: '8px 16px', textAlign: 'center' }}>
                                  <button
                                    onClick={() => toggleFeature(p, f.key)}
                                    disabled={isSaving}
                                    style={{
                                      width: 28, height: 28,
                                      border: 'none',
                                      background: on ? '#16a34a' : '#e6ebf1',
                                      cursor: 'pointer',
                                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                      opacity: isSaving ? 0.5 : 1,
                                    }}
                                  >
                                    {on && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><path d="M20 6 9 17l-5-5"/></svg>}
                                  </button>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Limites tab ── */}
        {activeTab === 'limites' && (
          <div style={{ background: '#fff', border: `1px solid ${B}`, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.04em' }}>Limite</th>
                  {PLANS.map((p) => (
                    <th key={p} style={{ padding: '10px 16px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#0f172a', width: 120 }}>{p}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {LIMIT_ROWS.map((lr, i) => (
                  <tr key={lr.key} style={{ borderTop: i > 0 ? '1px solid #f1f5f9' : 'none' }}>
                    <td style={{ padding: '10px 16px' }}>
                      <div style={{ fontWeight: 500, color: '#0f172a' }}>{lr.label}</div>
                      <div style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'monospace' }}>{lr.key}</div>
                    </td>
                    {PLANS.map((p) => {
                      const val = limitState[`${p}:${lr.key}`] ?? lr.defaults[PLANS.indexOf(p)];
                      const display = val === -1 ? 'Illimite' : val === 0 ? '—' : String(val);
                      return (
                        <td key={p} style={{ padding: '10px 16px', textAlign: 'center', fontWeight: 700, color: val === -1 ? '#16a34a' : val === 0 ? '#94a3b8' : '#0f172a' }}>
                          {display}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Par ecole tab ── */}
        {activeTab === 'ecoles' && (
          <div>
            {/* Tenant selector */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 4 }}>Selectionner un etablissement</label>
              <select
                value={selectedTenantId}
                onChange={(e) => setSelectedTenantId(e.target.value)}
                style={{ width: '100%', maxWidth: 400, height: 38, border: '1px solid #d9e0e8', background: '#fff', fontSize: 13, color: '#0f172a', padding: '0 12px', fontFamily: 'inherit' }}
              >
                <option value="">— Choisir —</option>
                {(tenants.data ?? []).map((t) => (
                  <option key={t.id} value={t.id}>{t.nom} ({t.plan})</option>
                ))}
              </select>
            </div>

            {selectedTenantId && tenantPlan && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <span style={{ fontSize: 12, color: '#64748b' }}>Plan :</span>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', background: '#e6ebf1', color: '#0f172a' }}>{tenantPlan}</span>
                  <span style={{ fontSize: 11, color: '#94a3b8' }}>— Les overrides s&apos;appliquent en plus du plan</span>
                </div>

                <div style={{ background: '#fff', border: `1px solid ${B}`, overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: '#f8fafc' }}>
                        <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.04em' }}>Fonctionnalite</th>
                        <th style={{ padding: '10px 16px', textAlign: 'center', fontSize: 10, fontWeight: 700, color: '#94a3b8', width: 100 }}>Selon plan</th>
                        <th style={{ padding: '10px 16px', textAlign: 'center', fontSize: 10, fontWeight: 700, color: '#94a3b8', width: 140 }}>Override</th>
                        <th style={{ padding: '10px 16px', textAlign: 'center', fontSize: 10, fontWeight: 700, color: '#94a3b8', width: 100 }}>Resultat</th>
                      </tr>
                    </thead>
                    <tbody>
                      {FEATURE_MATRIX.map((cat) => (
                        <>
                          <tr key={cat.name}>
                            <td colSpan={4} style={{ padding: '8px 16px', fontSize: 11, fontWeight: 700, color: '#2563eb', background: '#f8fafc', borderTop: `1px solid ${B}` }}>{cat.name}</td>
                          </tr>
                          {cat.features.map((f) => {
                            const planVal = planIndex >= 0 ? (featureState[`${tenantPlan}:${f.key}`] ?? f.defaults[planIndex]) : false;
                            const override = tenantOverrides[f.key];
                            const resolved = override !== null && override !== undefined ? override : planVal;
                            return (
                              <tr key={f.key} style={{ borderTop: '1px solid #f1f5f9' }}>
                                <td style={{ padding: '8px 16px' }}>
                                  <div style={{ fontWeight: 500, color: '#0f172a' }}>{f.label}</div>
                                </td>
                                <td style={{ padding: '8px 16px', textAlign: 'center' }}>
                                  <span style={{ width: 20, height: 20, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: planVal ? '#dcfce7' : '#f1f5f9' }}>
                                    {planVal ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="3"><path d="M20 6 9 17l-5-5"/></svg> : <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>}
                                  </span>
                                </td>
                                <td style={{ padding: '8px 16px', textAlign: 'center' }}>
                                  <button
                                    onClick={() => toggleTenantOverride(f.key)}
                                    style={{
                                      height: 28, padding: '0 10px',
                                      border: `1px solid ${override !== null && override !== undefined ? (override ? '#16a34a' : '#dc2626') : '#d9e0e8'}`,
                                      background: override !== null && override !== undefined ? (override ? '#dcfce7' : '#fee2e2') : '#fff',
                                      color: override !== null && override !== undefined ? (override ? '#16a34a' : '#dc2626') : '#64748b',
                                      fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                                    }}
                                  >
                                    {override === null || override === undefined ? 'Selon plan' : override ? 'Force ON' : 'Force OFF'}
                                  </button>
                                </td>
                                <td style={{ padding: '8px 16px', textAlign: 'center' }}>
                                  <span style={{ width: 24, height: 24, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: resolved ? '#16a34a' : '#e6ebf1' }}>
                                    {resolved && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><path d="M20 6 9 17l-5-5"/></svg>}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {!selectedTenantId && (
              <div style={{ padding: '40px 0', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                Selectionnez un etablissement pour voir et modifier ses fonctionnalites
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
