/**
 * OCC - Object Control Center
 * Utilitários compartilhados de listagem de arquivos (filtro, ordenação, formatação).
 */

// Converte bytes para MB com vírgula no padrão pt-BR (ex: "0,00 MB")
export const formatFileSizeMB = (bytes) =>
  ((Number(bytes) || 0) / 1048576).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Soma os tamanhos (bytes) de uma lista de arquivos
export const sumFileSizes = (files = []) =>
  (files || []).reduce((acc, f) => acc + (Number(f.size) || 0), 0);

// Retorna a próxima configuração de ordenação (alterna asc/desc)
export const getNextSortConfig = (sortConfig, key) => {
  let direction = 'asc';
  if (sortConfig.key === key && sortConfig.direction === 'asc') {
    direction = 'desc';
  }
  return { key, direction };
};

// Aplica filtro por nome (case-insensitive) e ordenação sobre a lista de arquivos
export const processFiles = (files = [], searchTerm = '', sortConfig = { key: 'name', direction: 'asc' }) => {
  let result = (files || []).filter(f =>
    f.name.toLowerCase().includes((searchTerm || '').toLowerCase())
  );

  result.sort((a, b) => {
    let aVal = a[sortConfig.key];
    let bVal = b[sortConfig.key];

    // Tratamento para Tamanho (numérico)
    if (sortConfig.key === 'size') {
      return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
    }

    // Tratamento para strings (Nome, Status, Data)
    if (typeof aVal === 'string') aVal = aVal.toLowerCase();
    if (typeof bVal === 'string') bVal = bVal.toLowerCase();

    if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  return result;
};
