'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api/client';
import { messageFromError } from '@/lib/errors';

const B = '#e6ebf1';
const TYPES = ['BULLETIN', 'CARTE_SCOLAIRE', 'RECU_PAIEMENT'] as const;
const TYPE_LABELS: Record<string, string> = {
  BULLETIN: 'Bulletin scolaire',
  CARTE_SCOLAIRE: 'Carte scolaire',
  RECU_PAIEMENT: 'Recu de paiement',
};
const TYPE_ICONS: Record<string, React.ReactNode> = {
  BULLETIN: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  CARTE_SCOLAIRE: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="5" width="20" height="14"/><line x1="2" y1="10" x2="22" y2="10"/></svg>,
  RECU_PAIEMENT: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
};

interface Template {
  id: string;
  tenantId: string | null;
  typeDocument: string;
  nom: string;
  description: string | null;
  isDefault: boolean;
  styles: Record<string, unknown> | null;
  thumbnailUrl: string | null;
  createdAt: string;
  updatedAt: string;
  tenant?: { id: string; nom: string } | null;
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeType, setActiveType] = useState<string>('BULLETIN');
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [editing, setEditing] = useState(false);
  const [editStyles, setEditStyles] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/platform/templates');
      setTemplates(Array.isArray(res.data) ? res.data : []);
    } catch { /* */ }
    setLoading(false);
  }, []);

  useEffect(() => { void fetchTemplates(); }, [fetchTemplates]);

  const filtered = templates.filter((t) => t.typeDocument === activeType);
  const systemTemplates = filtered.filter((t) => t.tenantId === null);
  const tenantTemplates = filtered.filter((t) => t.tenantId !== null);

  function openDetail(t: Template) {
    setSelectedTemplate(t);
    setEditing(false);
    setPreviewHtml(null);
    setShowPreview(false);
    const s = (t.styles ?? {}) as Record<string, string>;
    setEditStyles({
      primaryColor: s.primaryColor ?? '#2563eb',
      secondaryColor: s.secondaryColor ?? '#64748b',
      fontFamily: s.fontFamily ?? 'Arial, sans-serif',
      deviseText: s.deviseText ?? '',
      headerText: s.headerText ?? '',
      footerText: s.footerText ?? '',
    });
  }

  async function loadPreview(id: string) {
    setLoadingPreview(true);
    try {
      const res = await apiClient.get(`/platform/templates/${id}/preview`);
      setPreviewHtml((res.data as { html: string }).html);
      setShowPreview(true);
    } catch (err) {
      toast.error(messageFromError(err));
    }
    setLoadingPreview(false);
  }

  async function saveStyles() {
    if (!selectedTemplate) return;
    setSaving(true);
    try {
      await apiClient.put(`/platform/templates/${selectedTemplate.id}`, {
        styles: { ...selectedTemplate.styles, ...editStyles },
      });
      toast.success('Styles mis a jour');
      void fetchTemplates();
      setEditing(false);
    } catch (err) {
      toast.error(messageFromError(err));
    }
    setSaving(false);
  }

  async function deleteTemplate(id: string) {
    if (!confirm('Supprimer ce template ?')) return;
    try {
      await apiClient.delete(`/platform/templates/${id}`, { headers: { 'Content-Type': undefined } });
      toast.success('Template supprime');
      setSelectedTemplate(null);
      void fetchTemplates();
    } catch (err) {
      toast.error(messageFromError(err));
    }
  }

  const tabStyle = (active: boolean): React.CSSProperties => ({
    height: 34, border: 'none',
    borderBottom: active ? '2px solid #2563eb' : '2px solid transparent',
    background: 'transparent', color: active ? '#2563eb' : '#64748b',
    fontSize: 12, fontWeight: 600, padding: '0 16px', cursor: 'pointer', fontFamily: 'inherit',
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      {/* Header */}
      <div style={{ background: '#fff', borderBottom: `1px solid ${B}`, height: 62, flexShrink: 0, display: 'flex', alignItems: 'center', padding: '0 28px', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 700, color: '#0f172a' }}>Templates de documents</div>
          <div style={{ fontSize: 13, color: '#64748b' }}>Bulletins, cartes scolaires, recus de paiement</div>
        </div>
        <span style={{ fontSize: 12, color: '#94a3b8' }}>{templates.length} template(s)</span>
      </div>

      <div style={{ padding: '14px 28px 28px' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, borderBottom: `1px solid ${B}`, marginBottom: 16 }}>
          {TYPES.map((t) => (
            <button key={t} style={tabStyle(activeType === t)} onClick={() => { setActiveType(t); setSelectedTemplate(null); }}>
              {TYPE_LABELS[t]}
              <span style={{ marginLeft: 6, fontSize: 10, color: '#94a3b8' }}>
                ({templates.filter((x) => x.typeDocument === t).length})
              </span>
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>Chargement...</div>
        ) : (
          <div style={{ display: 'flex', gap: 20 }}>
            {/* Left: template list */}
            <div style={{ width: 340, flexShrink: 0 }}>
              {/* System templates */}
              <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 8 }}>
                Templates systeme ({systemTemplates.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                {systemTemplates.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => openDetail(t)}
                    style={{
                      background: selectedTemplate?.id === t.id ? '#eff6ff' : '#fff',
                      border: `1px solid ${selectedTemplate?.id === t.id ? '#bfdbfe' : B}`,
                      padding: 14, cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 36, height: 36, background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb', flexShrink: 0 }}>
                        {TYPE_ICONS[t.typeDocument]}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{t.nom}</div>
                        <div style={{ fontSize: 11, color: '#94a3b8' }}>{t.description ?? 'Template systeme'}</div>
                      </div>
                      {t.isDefault && <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', background: '#dcfce7', color: '#16a34a' }}>DEFAUT</span>}
                    </div>
                  </div>
                ))}
                {systemTemplates.length === 0 && (
                  <div style={{ padding: 20, textAlign: 'center', color: '#94a3b8', fontSize: 12, background: '#f8fafc', border: `1px solid ${B}` }}>
                    Aucun template systeme. Executez le seed.
                  </div>
                )}
              </div>

              {/* Tenant templates */}
              {tenantTemplates.length > 0 && (
                <>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 8 }}>
                    Templates personnalises ({tenantTemplates.length})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {tenantTemplates.map((t) => (
                      <div
                        key={t.id}
                        onClick={() => openDetail(t)}
                        style={{
                          background: selectedTemplate?.id === t.id ? '#eff6ff' : '#fff',
                          border: `1px solid ${selectedTemplate?.id === t.id ? '#bfdbfe' : B}`,
                          padding: 14, cursor: 'pointer',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{t.nom}</div>
                            <div style={{ fontSize: 11, color: '#94a3b8' }}>{t.tenant?.nom ?? 'Ecole'}</div>
                          </div>
                          {t.isDefault && <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', background: '#dcfce7', color: '#16a34a' }}>ACTIF</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Right: detail panel */}
            <div style={{ flex: 1 }}>
              {!selectedTemplate ? (
                <div style={{ padding: 60, textAlign: 'center', color: '#94a3b8', background: '#fff', border: `1px solid ${B}` }}>
                  <div style={{ marginBottom: 8 }}>{TYPE_ICONS[activeType]}</div>
                  <div style={{ fontSize: 13 }}>Selectionnez un template pour voir les details</div>
                </div>
              ) : (
                <div style={{ background: '#fff', border: `1px solid ${B}` }}>
                  {/* Detail header */}
                  <div style={{ padding: '16px 20px', borderBottom: `1px solid ${B}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>{selectedTemplate.nom}</div>
                      <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                        {TYPE_LABELS[selectedTemplate.typeDocument]} · {selectedTemplate.tenantId ? `Ecole: ${selectedTemplate.tenant?.nom ?? '?'}` : 'Template systeme'}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        onClick={() => void loadPreview(selectedTemplate.id)}
                        disabled={loadingPreview}
                        style={{ height: 30, padding: '0 12px', border: '1px solid #d9e0e8', background: showPreview ? '#2563eb' : '#fff', color: showPreview ? '#fff' : '#334155', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4 }}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                        {loadingPreview ? 'Chargement...' : 'Apercu'}
                      </button>
                      {!editing ? (
                        <button onClick={() => setEditing(true)} style={{ height: 30, padding: '0 12px', border: '1px solid #d9e0e8', background: '#fff', color: '#334155', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                          Modifier les styles
                        </button>
                      ) : (
                        <>
                          <button onClick={() => setEditing(false)} style={{ height: 30, padding: '0 12px', border: '1px solid #d9e0e8', background: '#fff', color: '#334155', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Annuler</button>
                          <button onClick={() => void saveStyles()} disabled={saving} style={{ height: 30, padding: '0 12px', border: 'none', background: '#2563eb', color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                            {saving ? 'Sauvegarde...' : 'Sauvegarder'}
                          </button>
                        </>
                      )}
                      {selectedTemplate.tenantId && (
                        <button onClick={() => void deleteTemplate(selectedTemplate.id)} style={{ height: 30, padding: '0 12px', border: '1px solid #fecaca', background: '#fff', color: '#dc2626', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                          Supprimer
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Preview */}
                  {showPreview && previewHtml && (
                    <div style={{ padding: '16px 20px', borderBottom: `1px solid ${B}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>Apercu avec donnees fictives</div>
                        <button onClick={() => setShowPreview(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 16 }}>✕</button>
                      </div>
                      <div style={{
                        border: `1px solid ${B}`,
                        background: '#fff',
                        height: selectedTemplate.typeDocument === 'CARTE_SCOLAIRE' ? 400 : 700,
                        overflow: 'hidden',
                      }}>
                        <iframe
                          srcDoc={previewHtml}
                          style={{ width: '100%', height: '100%', border: 'none' }}
                          sandbox="allow-same-origin"
                          title="Apercu du template"
                        />
                      </div>
                      <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 6 }}>
                        Les donnees affichees sont fictives — cet apercu montre le rendu du template avec des valeurs de demonstration.
                      </div>
                    </div>
                  )}

                  {/* Styles editor */}
                  <div style={{ padding: '16px 20px' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', marginBottom: 12 }}>Styles de personnalisation</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                      {[
                        { key: 'primaryColor', label: 'Couleur primaire', type: 'color' },
                        { key: 'secondaryColor', label: 'Couleur secondaire', type: 'color' },
                        { key: 'fontFamily', label: 'Police', type: 'text' },
                        { key: 'deviseText', label: 'Devise nationale', type: 'text' },
                        { key: 'headerText', label: 'Texte en-tete', type: 'text' },
                        { key: 'footerText', label: 'Texte pied de page', type: 'text' },
                      ].map((field) => (
                        <div key={field.key}>
                          <label style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>{field.label}</label>
                          {field.type === 'color' ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <input
                                type="color"
                                value={editStyles[field.key] || '#2563eb'}
                                onChange={(e) => setEditStyles((s) => ({ ...s, [field.key]: e.target.value }))}
                                disabled={!editing}
                                style={{ width: 32, height: 32, border: 'none', padding: 0, cursor: editing ? 'pointer' : 'default' }}
                              />
                              <span style={{ fontSize: 12, fontFamily: 'monospace', color: '#475569' }}>{editStyles[field.key]}</span>
                            </div>
                          ) : (
                            <input
                              type="text"
                              value={editStyles[field.key] || ''}
                              onChange={(e) => setEditStyles((s) => ({ ...s, [field.key]: e.target.value }))}
                              disabled={!editing}
                              style={{ width: '100%', height: 32, border: `1px solid ${editing ? '#2563eb' : '#e2e8f0'}`, padding: '0 8px', fontSize: 12, fontFamily: 'inherit', background: editing ? '#fff' : '#f8fafc', color: '#0f172a' }}
                            />
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Preview color */}
                    <div style={{ marginTop: 16, padding: 12, background: '#f8fafc', border: `1px solid ${B}` }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 8 }}>Apercu des couleurs</div>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        <div style={{ width: 80, height: 36, background: editStyles.primaryColor || '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 10, fontWeight: 700 }}>Primaire</div>
                        <div style={{ width: 80, height: 36, background: editStyles.secondaryColor || '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 10, fontWeight: 700 }}>Secondaire</div>
                        <div style={{ flex: 1, height: 36, background: '#fff', border: `2px solid ${editStyles.primaryColor || '#2563eb'}`, display: 'flex', alignItems: 'center', padding: '0 12px', fontFamily: editStyles.fontFamily || 'Arial', fontSize: 12, color: '#0f172a' }}>
                          Apercu du texte avec la police selectionnee
                        </div>
                      </div>
                    </div>

                    {/* Meta info */}
                    <div style={{ marginTop: 16, display: 'flex', gap: 16, fontSize: 11, color: '#94a3b8' }}>
                      <span>Cree le {new Date(selectedTemplate.createdAt).toLocaleDateString('fr-FR')}</span>
                      <span>Modifie le {new Date(selectedTemplate.updatedAt).toLocaleDateString('fr-FR')}</span>
                      <span style={{ fontFamily: 'monospace', fontSize: 10 }}>ID: {selectedTemplate.id.slice(0, 8)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
