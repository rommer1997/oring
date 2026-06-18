import { describe, it, expect } from 'vitest';
import { importClientsCsv } from '../SettingsView';
import type { ClientProfile } from '../../types';

function collect(text: string) {
  const added: ClientProfile[] = [];
  const n = importClientsCsv(text, 'tenant-1', (c) => added.push(c));
  return { n, added };
}

describe('importClientsCsv', () => {
  it('parses semicolon CSV (Excel ES) and maps accented headers', () => {
    const { n, added } = collect('Nombre;Teléfono;Email\nLucía García;600111222;lucia@mail.com\nMarta Ruiz;600333444;');
    expect(n).toBe(2);
    expect(added[0].name).toBe('Lucía García');
    expect(added[0].phoneNumber).toBe('600111222');
    expect(added[0].email).toBe('lucia@mail.com');
    expect(added[0].tenantId).toBe('tenant-1');
  });

  it('parses comma CSV and skips rows without name or phone', () => {
    const { n, added } = collect('name,phone\nAna,600555666\n,600777888\nSinTel,');
    expect(n).toBe(1);
    expect(added[0].name).toBe('Ana');
  });

  it('returns 0 when name/phone columns are absent', () => {
    expect(collect('foo,bar\n1,2').n).toBe(0);
  });

  it('handles quoted fields containing the delimiter', () => {
    const { added } = collect('nombre,telefono\n"García, Lucía",600111222');
    expect(added[0].name).toBe('García, Lucía');
  });
});
