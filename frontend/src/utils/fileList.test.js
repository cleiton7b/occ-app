/**
 * OCC - Object Control Center
 * Testes dos utilitários de listagem de arquivos.
 */
import { describe, it, expect } from 'vitest';
import {
  formatFileSizeMB,
  sumFileSizes,
  getNextSortConfig,
  processFiles,
} from './fileList';

const makeFiles = () => [
  { name: 'beta.txt', size: 2048, scanStatus: 'Passed', modified: '2024-02-01' },
  { name: 'Alpha.txt', size: 1048576, scanStatus: 'Failed', modified: '2024-01-01' },
  { name: 'gamma.log', size: 0, scanStatus: 'Unknown', modified: '2024-03-01' },
];

describe('formatFileSizeMB', () => {
  it('formata bytes em MB com vírgula decimal pt-BR', () => {
    expect(formatFileSizeMB(1048576)).toBe('1,00');
    expect(formatFileSizeMB(1572864)).toBe('1,50');
    expect(formatFileSizeMB(0)).toBe('0,00');
  });

  it('trata valores inválidos como zero', () => {
    expect(formatFileSizeMB(undefined)).toBe('0,00');
    expect(formatFileSizeMB(null)).toBe('0,00');
    expect(formatFileSizeMB('abc')).toBe('0,00');
  });
});

describe('sumFileSizes', () => {
  it('soma os tamanhos da lista', () => {
    expect(sumFileSizes(makeFiles())).toBe(1050624);
  });

  it('ignora tamanhos inválidos e listas vazias', () => {
    expect(sumFileSizes([{ size: 'x' }, { size: 10 }])).toBe(10);
    expect(sumFileSizes([])).toBe(0);
    expect(sumFileSizes()).toBe(0);
  });
});

describe('getNextSortConfig', () => {
  it('começa em ascendente para uma nova coluna', () => {
    expect(getNextSortConfig({ key: 'name', direction: 'asc' }, 'size')).toEqual({
      key: 'size',
      direction: 'asc',
    });
  });

  it('alterna para descendente ao repetir a mesma coluna', () => {
    expect(getNextSortConfig({ key: 'size', direction: 'asc' }, 'size')).toEqual({
      key: 'size',
      direction: 'desc',
    });
  });

  it('volta para ascendente após descendente', () => {
    expect(getNextSortConfig({ key: 'size', direction: 'desc' }, 'size')).toEqual({
      key: 'size',
      direction: 'asc',
    });
  });
});

describe('processFiles', () => {
  it('filtra por nome sem diferenciar maiúsculas de minúsculas', () => {
    const result = processFiles(makeFiles(), 'ALPHA');
    expect(result.map((f) => f.name)).toEqual(['Alpha.txt']);
  });

  it('ordena por nome em ordem ascendente ignorando caixa', () => {
    const result = processFiles(makeFiles(), '', { key: 'name', direction: 'asc' });
    expect(result.map((f) => f.name)).toEqual(['Alpha.txt', 'beta.txt', 'gamma.log']);
  });

  it('ordena por nome em ordem descendente', () => {
    const result = processFiles(makeFiles(), '', { key: 'name', direction: 'desc' });
    expect(result.map((f) => f.name)).toEqual(['gamma.log', 'beta.txt', 'Alpha.txt']);
  });

  it('ordena por tamanho numericamente', () => {
    const asc = processFiles(makeFiles(), '', { key: 'size', direction: 'asc' });
    expect(asc.map((f) => f.size)).toEqual([0, 2048, 1048576]);

    const desc = processFiles(makeFiles(), '', { key: 'size', direction: 'desc' });
    expect(desc.map((f) => f.size)).toEqual([1048576, 2048, 0]);
  });

  it('ordena por data e status como texto', () => {
    const byDate = processFiles(makeFiles(), '', { key: 'modified', direction: 'asc' });
    expect(byDate.map((f) => f.modified)).toEqual(['2024-01-01', '2024-02-01', '2024-03-01']);

    const byStatus = processFiles(makeFiles(), '', { key: 'scanStatus', direction: 'asc' });
    expect(byStatus.map((f) => f.scanStatus)).toEqual(['Failed', 'Passed', 'Unknown']);
  });

  it('não muta a lista original', () => {
    const files = makeFiles();
    const originalOrder = files.map((f) => f.name);
    processFiles(files, '', { key: 'size', direction: 'desc' });
    expect(files.map((f) => f.name)).toEqual(originalOrder);
  });

  it('usa valores padrão quando argumentos são omitidos', () => {
    const result = processFiles(makeFiles());
    expect(result).toHaveLength(3);
    expect(result[0].name).toBe('Alpha.txt');
  });
});
