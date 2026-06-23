import { describe, expect, it } from 'vitest';
import {
  analyzeChurnRisk,
  buildNewClient,
  calculateDaysBetween,
  estimateAverageFrequency,
} from './riskEngine';
import type { Appointment, ClientProfile } from '../types';

// ─── helpers ────────────────────────────────────────────────────────────────

function client(overrides: Partial<ClientProfile> = {}): ClientProfile {
  return buildNewClient({
    id: 'c1',
    name: 'Test',
    phoneNumber: '+34600000000',
    tenantId: 'tenant-1',
    ...overrides,
  });
}

function appt(date: string, clientId = 'c1'): Appointment {
  return {
    id: `a-${date}`,
    clientId,
    staffId: 's1',
    serviceId: 'svc1',
    tenantId: 'tenant-1',
    date,
    startTime: '10:00',
    endTime: '11:00',
    status: 'Pagado',
    price: 50,
    notes: '',
    createdAt: date,
    updatedAt: date,
  };
}

// ─── calculateDaysBetween ────────────────────────────────────────────────────

describe('calculateDaysBetween', () => {
  it('returns 0 for same date', () => {
    expect(calculateDaysBetween('2026-01-01', '2026-01-01')).toBe(0);
  });

  it('returns correct positive diff', () => {
    expect(calculateDaysBetween('2026-01-01', '2026-01-31')).toBe(30);
  });

  it('returns 0 (not negative) when end is before start', () => {
    expect(calculateDaysBetween('2026-02-01', '2026-01-01')).toBe(0);
  });

  it('returns 0 for invalid dates', () => {
    expect(calculateDaysBetween('not-a-date', '2026-01-01')).toBe(0);
  });
});

// ─── estimateAverageFrequency ────────────────────────────────────────────────

describe('estimateAverageFrequency', () => {
  it('falls back to profile averageFrequencyDays when no appointments', () => {
    const c = client({ averageFrequencyDays: 21 });
    expect(estimateAverageFrequency(c, [])).toBe(21);
  });

  it('falls back to 30 when no profile freq and no appointments', () => {
    const c = client({ averageFrequencyDays: 0 });
    expect(estimateAverageFrequency(c, [])).toBe(30);
  });

  it('derives frequency from paid appointments', () => {
    // 3 visits 30 days apart → avg 30 days
    const appts = [
      appt('2026-01-01'),
      appt('2026-01-31'),
      appt('2026-03-02'),
    ];
    expect(estimateAverageFrequency(client(), appts)).toBe(30);
  });

  it('ignores appointments for other clients', () => {
    const c = client({ averageFrequencyDays: 14 });
    const appts = [appt('2026-01-01', 'other'), appt('2026-02-01', 'other')];
    expect(estimateAverageFrequency(c, appts)).toBe(14);
  });

  it('enforces minimum 15-day frequency floor', () => {
    // 2 visits only 3 days apart → should return 15 (floor)
    const appts = [appt('2026-01-01'), appt('2026-01-04')];
    expect(estimateAverageFrequency(client(), appts)).toBe(15);
  });
});

// ─── analyzeChurnRisk ────────────────────────────────────────────────────────

describe('analyzeChurnRisk', () => {
  const REF = '2026-06-23';

  it('returns Bajo when client visited recently', () => {
    // visited 5 days ago, avg freq 30 → ratio 0.17 → Bajo
    const c = client({ lastVisitDate: '2026-06-18', averageFrequencyDays: 30 });
    const result = analyzeChurnRisk(c, [], REF);
    expect(result.riskLevel).toBe('Bajo');
    expect(result.riskDays).toBe(5);
  });

  it('returns Medio when slightly past average frequency', () => {
    // visited 35 days ago, avg freq 30 → ratio ~1.17 → Medio
    const c = client({ lastVisitDate: '2026-05-19', averageFrequencyDays: 30 });
    const result = analyzeChurnRisk(c, [], REF);
    expect(result.riskLevel).toBe('Medio');
  });

  it('returns Alto when ~2× average frequency', () => {
    // visited 65 days ago, avg freq 30 → ratio ~2.17 → Alto
    const c = client({ lastVisitDate: '2026-04-19', averageFrequencyDays: 30 });
    const result = analyzeChurnRisk(c, [], REF);
    expect(result.riskLevel).toBe('Alto');
  });

  it('returns Crítico when 3× average frequency exceeded', () => {
    // visited 100 days ago, avg freq 30 → ratio ~3.33 → Crítico
    const c = client({ lastVisitDate: '2026-03-15', averageFrequencyDays: 30 });
    const result = analyzeChurnRisk(c, [], REF);
    expect(result.riskLevel).toBe('Crítico');
  });

  it('prefers latest paid appointment over lastVisitDate', () => {
    // lastVisitDate is 100 days ago but there's a paid appt 5 days ago
    const c = client({ lastVisitDate: '2026-03-15', averageFrequencyDays: 30 });
    const appts = [appt('2026-06-18')];
    const result = analyzeChurnRisk(c, appts, REF);
    expect(result.riskLevel).toBe('Bajo');
    expect(result.riskDays).toBe(5);
  });

  it('ignores future appointments in riskDays calc', () => {
    const c = client({ lastVisitDate: '2026-03-15', averageFrequencyDays: 30 });
    const appts = [appt('2026-12-31')]; // future
    const result = analyzeChurnRisk(c, appts, REF);
    // future appt should be ignored, falls back to lastVisitDate (100 days → Crítico)
    expect(result.riskLevel).toBe('Crítico');
  });

  it('ratio is riskDays / averageFrequency', () => {
    const c = client({ lastVisitDate: '2026-05-24', averageFrequencyDays: 30 });
    const result = analyzeChurnRisk(c, [], REF);
    expect(result.ratio).toBeCloseTo(result.riskDays / result.averageFrequency, 1);
  });

  it('respects config thresholds (stricter mid threshold)', () => {
    // without config: 20 days / avg 30 → Bajo
    // with midThreshold=15: 20 days → Medio
    const c = client({ lastVisitDate: '2026-06-03', averageFrequencyDays: 30 });
    const without = analyzeChurnRisk(c, [], REF);
    const with_ = analyzeChurnRisk(c, [], REF, { midRiskThresholdDays: 15, highRiskThresholdDays: 60 });
    expect(without.riskLevel).toBe('Bajo');
    expect(with_.riskLevel).toBe('Medio');
  });
});

// ─── buildNewClient ──────────────────────────────────────────────────────────

describe('buildNewClient', () => {
  it('produces a valid ClientProfile with required fields', () => {
    const c = buildNewClient({ id: 'x', name: 'Ana', phoneNumber: '+34600', tenantId: 't1' });
    expect(c.id).toBe('x');
    expect(c.riskLevel).toBe('Bajo');
    expect(c.contactConsent).toBe(false);
    expect(c.averageFrequencyDays).toBe(30);
  });

  it('overrides defaults correctly', () => {
    const c = buildNewClient({
      id: 'x',
      name: 'Ana',
      phoneNumber: '+34600',
      tenantId: 't1',
      isVip: true,
      averageFrequencyDays: 14,
    } as any);
    // isVip not in required type but spread via overrides
    expect(c.averageFrequencyDays).toBe(14);
  });

  it('generates an avatar URL based on name', () => {
    const c = buildNewClient({ id: 'x', name: 'María', phoneNumber: '+34600', tenantId: 't1' });
    expect(c.avatar).toBeTruthy();
    expect(typeof c.avatar).toBe('string');
  });
});
