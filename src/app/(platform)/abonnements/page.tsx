'use client';

import { useState } from 'react';

const B = '#e6ebf1';

type Tab = 'plans' | 'limites';

const PLANS = ['TRIAL', 'BASIC', 'PRO', 'ENTERPRISE'] as const;

const PLAN_COLORS: Record<string, string> = {
  TRIAL: '#64748b',
  BASIC: '#2563eb',
  PRO: '#0f172a',
  ENTERPRISE: '#16a34a',
};

type FeatureRow = { key: string; label: string; plans: boolean[] };
type Category = { name: string; features: FeatureRow[] };

const FEATURE_MATRIX: Category[] = [
  {
    name: 'WhatsApp',
    features: [
      { key: 'WHATSAPP_OTP', label: 'OTP creation compte', plans: [true, true, true, true] },
      { key: 'WHATSAPP_COMMUNICATION', label: 'Messages parents/eleves', plans: [false, false, true, true] },
      { key: 'WHATSAPP_BULLETIN', label: 'Envoi bulletins', plans: [false, false, true, true] },
      { key: 'WHATSAPP_PAIEMENT', label: 'Notification paiement', plans: [false, false, true, true] },
      { key: 'WHATSAPP_ABSENCE', label: 'Alerte absence', plans: [false, false, false, true] },
      { key: 'WHATSAPP_BROADCAST', label: 'Diffusion masse', plans: [false, false, false, true] },
    ],
  },
  {
    name: 'Documents',
    features: [
      { key: 'CARTES_SCOLAIRES', label: 'Cartes identite', plans: [false, true, true, true] },
      { key: 'RECUS_PAIEMENT', label: 'Recus paiement PDF', plans: [false, true, true, true] },
      { key: 'BULLETINS_PDF', label: 'Export bulletins PDF', plans: [false, true, true, true] },
      { key: 'EXPORT_EXCEL', label: 'Export Excel', plans: [false, true, true, true] },
      { key: 'RAPPORTS_AVANCES', label: 'Rapports analytiques', plans: [false, false, true, true] },
    ],
  },
  {
    name: 'Administration',
    features: [
      { key: 'MULTI_ADMIN', label: 'Plusieurs admins', plans: [false, false, true, true] },
      { key: 'POINTAGE', label: 'Pointage personnel', plans: [false, true, true, true] },
      { key: 'PAIE_PERSONNEL', label: 'Gestion paie', plans: [false, false, true, true] },
      { key: 'TEMPLATES_CUSTOM', label: 'Templates personnalises', plans: [false, false, false, true] },
      { key: 'SECURITE_QR', label: 'Controle acces QR', plans: [false, false, true, true] },
    ],
  },
];

type LimitRow = { key: string; label: string; values: string[] };

const LIMITS: LimitRow[] = [
  { key: 'MAX_ELEVES', label: 'Nombre max eleves', values: ['50', '500', '2 000', 'Illimite'] },
  { key: 'MAX_ADMINS', label: 'Nombre max admins', values: ['1', '1', '3', 'Illimite'] },
  { key: 'STOCKAGE_GO', label: 'Stockage (Go)', values: ['1', '5', '20', '100'] },
  { key: 'DUREE_ESSAI', label: 'Duree essai', values: ['30j', '\u2014', '\u2014', '\u2014'] },
];

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 8 7 12 13 4" />
    </svg>
  );
}

function Toggle({ on }: { on: boolean }) {
  return (
    <div
      style={{
        width: 22,
        height: 22,
        background: on ? '#16a34a' : B,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      {on && <CheckIcon />}
    </div>
  );
}

export default function AbonnementsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('plans');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      {/* Header */}
      <div
        style={{
          background: '#fff',
          borderBottom: `1px solid ${B}`,
          height: 62,
          flexShrink: 0,
          position: 'sticky' as const,
          top: 0,
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          padding: '0 28px',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <div style={{ fontSize: 17, fontWeight: 700, color: '#0f172a' }}>Abonnements</div>
          <div style={{ fontSize: 13, color: '#64748b' }}>Plans, fonctionnalites et limites</div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0 }}>
          {(['plans', 'limites'] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                height: 34,
                border: `1px solid #d9e0e8`,
                borderRight: tab === 'plans' ? 'none' : `1px solid #d9e0e8`,
                background: activeTab === tab ? '#0f172a' : '#fff',
                color: activeTab === tab ? '#fff' : '#334155',
                fontSize: 12,
                fontWeight: 600,
                padding: '0 16px',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {tab === 'plans' ? 'Plans' : 'Limites'}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '14px 28px 28px' }}>
        {/* Info banner */}
        <div
          style={{
            background: '#eff6ff',
            border: '1px solid #bfdbfe',
            padding: '10px 14px',
            marginBottom: 18,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 13,
            color: '#1e40af',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#2563eb" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="8" cy="8" r="7" />
            <line x1="8" y1="5" x2="8" y2="5.01" />
            <line x1="8" y1="7" x2="8" y2="11" />
          </svg>
          Configuration statique &mdash; les endpoints backend seront implementes prochainement
        </div>

        {activeTab === 'plans' && <PlansTab />}
        {activeTab === 'limites' && <LimitesTab />}
      </div>
    </div>
  );
}

/* ─── Plans Tab ─── */

function PlansTab() {
  return (
    <div style={{ background: '#fff', border: `1px solid ${B}`, overflow: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${B}` }}>
            <th
              style={{
                textAlign: 'left',
                padding: '12px 16px',
                fontWeight: 600,
                color: '#64748b',
                fontSize: 11,
                textTransform: 'uppercase' as const,
                letterSpacing: 0.5,
                width: '40%',
              }}
            >
              Fonctionnalite
            </th>
            {PLANS.map((plan) => (
              <th
                key={plan}
                style={{
                  textAlign: 'center',
                  padding: '12px 16px',
                  fontWeight: 700,
                  color: PLAN_COLORS[plan],
                  fontSize: 12,
                  width: '15%',
                }}
              >
                {plan}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {FEATURE_MATRIX.map((category) => (
            <>
              {/* Category header */}
              <tr key={`cat-${category.name}`} style={{ background: '#f5f7fa' }}>
                <td
                  colSpan={5}
                  style={{
                    padding: '8px 16px',
                    fontWeight: 700,
                    fontSize: 12,
                    color: '#0f172a',
                    borderBottom: `1px solid ${B}`,
                    borderTop: `1px solid ${B}`,
                  }}
                >
                  {category.name}
                </td>
              </tr>
              {/* Feature rows */}
              {category.features.map((feature) => (
                <tr key={feature.key} style={{ borderBottom: `1px solid ${B}` }}>
                  <td style={{ padding: '10px 16px', color: '#334155' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: 500 }}>{feature.label}</span>
                      <span style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'monospace' }}>{feature.key}</span>
                    </div>
                  </td>
                  {feature.plans.map((on, i) => (
                    <td key={i} style={{ textAlign: 'center', padding: '10px 16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <Toggle on={on} />
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ─── Limites Tab ─── */

function LimitesTab() {
  return (
    <div style={{ background: '#fff', border: `1px solid ${B}`, overflow: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${B}` }}>
            <th
              style={{
                textAlign: 'left',
                padding: '12px 16px',
                fontWeight: 600,
                color: '#64748b',
                fontSize: 11,
                textTransform: 'uppercase' as const,
                letterSpacing: 0.5,
                width: '40%',
              }}
            >
              Limite
            </th>
            {PLANS.map((plan) => (
              <th
                key={plan}
                style={{
                  textAlign: 'center',
                  padding: '12px 16px',
                  fontWeight: 700,
                  color: PLAN_COLORS[plan],
                  fontSize: 12,
                  width: '15%',
                }}
              >
                {plan}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {LIMITS.map((limit) => (
            <tr key={limit.key} style={{ borderBottom: `1px solid ${B}` }}>
              <td style={{ padding: '10px 16px', color: '#334155' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontWeight: 500 }}>{limit.label}</span>
                  <span style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'monospace' }}>{limit.key}</span>
                </div>
              </td>
              {limit.values.map((val, i) => (
                <td
                  key={i}
                  style={{
                    textAlign: 'center',
                    padding: '10px 16px',
                    fontWeight: 600,
                    color: val === 'Illimite' ? '#16a34a' : val === '\u2014' ? '#94a3b8' : '#0f172a',
                    fontSize: 13,
                  }}
                >
                  {val}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
