/**
 * OCC - Object Control Center
 * @author Cleiton Otávio de Sousa
 * @version 1.0.0
 */
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

// Monta o erro a partir da resposta do backend, anexando o ID de correlação
// (X-Request-Id) para facilitar o rastreio no log do servidor.
async function buildRequestError(res, fallback) {
  let message = fallback;
  try {
    const data = await res.json();
    if (data && typeof data.error === 'string' && data.error) {
      message = data.error;
    } else if (data && typeof data.message === 'string' && data.message) {
      message = data.message;
    }
    if (data && data.requestId) {
      message = `${message} (ref: ${data.requestId})`;
    }
  } catch {
    /* corpo não JSON: mantém a mensagem padrão */
  }
  return new Error(message);
}

export const ftsApi = {
  async getEnvironments(signal) {
    const res = await fetch(`${API_BASE}/environments`, { signal });
    if (!res.ok) throw await buildRequestError(res, 'Erro ao carregar ambientes');
    return res.json();
  },
  async setEnvironment(env, signal) {
    const res = await fetch(`${API_BASE}/set-env`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ env }),
      signal
    });
    if (!res.ok) throw await buildRequestError(res, 'Erro ao alterar ambiente');
    return res.json();
  },
  async getPrefixes(signal) {
    const res = await fetch(`${API_BASE}/prefixes`, { signal });
    if (!res.ok) throw await buildRequestError(res, 'Erro ao carregar prefixos');
    return res.json();
  },
  async listFiles(prefix, signal) {
    const res = await fetch(`${API_BASE}/files?prefix=${encodeURIComponent(prefix)}`, { signal });
    if (!res.ok) throw await buildRequestError(res, 'Erro ao carregar arquivos');
    const data = await res.json();
    return (data.resultSet || data.listOfFiles || []).map(f => ({
      name: f.name,
      size: f.size || 0,
      scanStatus: f.scanStatus || 'Unknown',
      modified: f.modifiedDate || 'N/A'
    }));
  },
  async uploadFile(prefix, file, signal) {
    const res = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prefix, filename: file.name }),
      signal
    });
    if (!res.ok) throw await buildRequestError(res, 'Falha no upload');
    const { accessUri } = await res.json();
    const fileRes = await fetch(accessUri, { method: 'PUT', body: file, signal });
    if (!fileRes.ok) throw new Error('Falha ao enviar arquivo para o storage Oracle');
    return { success: true };
  },
  async deleteFiles(prefix, filenames, signal) {
    const res = await fetch(`${API_BASE}/delete`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prefix, filenames }),
      signal
    });
    if (!res.ok) throw await buildRequestError(res, 'Falha na deleção na nuvem');
    return res.json();
  },
  async downloadFile(prefix, filename, signal) {
    const res = await fetch(`${API_BASE}/download`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prefix, filename }),
      signal
    });
    if (!res.ok) throw await buildRequestError(res, 'Erro ao solicitar download');
    const { accessUri } = await res.json();
    const fileRes = await fetch(accessUri, { signal });
    if (!fileRes.ok) throw new Error('Erro ao baixar arquivo da Oracle');
    const blob = await fileRes.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    a.remove();
  },
  async checkPing(signal) {
    const res = await fetch(`${API_BASE}/ping`, { signal });
    return res.ok;
  }
};
