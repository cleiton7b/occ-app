/**
 * OCC - Object Control Center
 * Testes do cliente HTTP usado pelo frontend.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ftsApi } from './api';

const jsonResponse = (body, { ok = true, status = 200 } = {}) => ({
  ok,
  status,
  json: vi.fn().mockResolvedValue(body),
  blob: vi.fn().mockResolvedValue(new Blob(['conteudo'])),
});

describe('ftsApi', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('listFiles', () => {
    it('mapeia resultSet para o formato interno', async () => {
      fetch.mockResolvedValueOnce(
        jsonResponse({
          resultSet: [
            { name: 'a.txt', size: 10, scanStatus: 'Passed', modifiedDate: '2024-01-01' },
          ],
        })
      );

      const files = await ftsApi.listFiles('PREFIXO');

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/files?prefix=PREFIXO'),
        expect.objectContaining({ signal: undefined })
      );
      expect(files).toEqual([
        { name: 'a.txt', size: 10, scanStatus: 'Passed', modified: '2024-01-01' },
      ]);
    });

    it('aceita listOfFiles e aplica valores padrão', async () => {
      fetch.mockResolvedValueOnce(jsonResponse({ listOfFiles: [{ name: 'b.txt' }] }));

      const files = await ftsApi.listFiles('P');

      expect(files).toEqual([
        { name: 'b.txt', size: 0, scanStatus: 'Unknown', modified: 'N/A' },
      ]);
    });

    it('retorna lista vazia quando a resposta não traz arquivos', async () => {
      fetch.mockResolvedValueOnce(jsonResponse({}));
      await expect(ftsApi.listFiles('P')).resolves.toEqual([]);
    });

    it('lança erro quando a resposta não é ok', async () => {
      fetch.mockResolvedValueOnce(jsonResponse({}, { ok: false, status: 500 }));
      await expect(ftsApi.listFiles('P')).rejects.toThrow('Erro ao carregar arquivos');
    });

    it('anexa o requestId do backend à mensagem de erro', async () => {
      fetch.mockResolvedValueOnce(
        jsonResponse(
          { error: 'Falha ao listar os arquivos', requestId: 'req-42' },
          { ok: false, status: 502 }
        )
      );

      await expect(ftsApi.listFiles('P')).rejects.toThrow(
        'Falha ao listar os arquivos (ref: req-42)'
      );
    });
  });

  describe('uploadFile', () => {
    it('solicita a URL assinada e envia o arquivo', async () => {
      const file = new File(['x'], 'x.txt', { type: 'text/plain' });
      fetch
        .mockResolvedValueOnce(jsonResponse({ accessUri: 'https://storage/oracle' }))
        .mockResolvedValueOnce(jsonResponse({}, { status: 200 }));

      await expect(ftsApi.uploadFile('P', file)).resolves.toEqual({ success: true });

      expect(fetch).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('/upload'),
        expect.objectContaining({ method: 'POST' })
      );
      expect(fetch).toHaveBeenNthCalledWith(
        2,
        'https://storage/oracle',
        expect.objectContaining({ method: 'PUT', body: file })
      );
    });

    it('usa a mensagem de erro devolvida pelo backend', async () => {
      const file = new File(['x'], 'x.txt');
      fetch.mockResolvedValueOnce(
        jsonResponse({ error: 'Prefixo inválido' }, { ok: false, status: 400 })
      );

      await expect(ftsApi.uploadFile('P', file)).rejects.toThrow('Prefixo inválido');
    });

    it('usa mensagem padrão quando o corpo do erro não é JSON', async () => {
      const file = new File(['x'], 'x.txt');
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: vi.fn().mockRejectedValue(new Error('not json')),
      });

      await expect(ftsApi.uploadFile('P', file)).rejects.toThrow('Falha no upload');
    });

    it('falha quando o storage Oracle rejeita o PUT', async () => {
      const file = new File(['x'], 'x.txt');
      fetch
        .mockResolvedValueOnce(jsonResponse({ accessUri: 'https://storage/oracle' }))
        .mockResolvedValueOnce(jsonResponse({}, { ok: false, status: 403 }));

      await expect(ftsApi.uploadFile('P', file)).rejects.toThrow(
        'Falha ao enviar arquivo para o storage Oracle'
      );
    });
  });

  describe('deleteFiles', () => {
    it('envia a lista de arquivos e devolve a resposta', async () => {
      fetch.mockResolvedValueOnce(jsonResponse({ deleted: ['a.txt'] }));

      await expect(ftsApi.deleteFiles('P', ['a.txt'])).resolves.toEqual({
        deleted: ['a.txt'],
      });
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/delete'),
        expect.objectContaining({
          method: 'DELETE',
          body: JSON.stringify({ prefix: 'P', filenames: ['a.txt'] }),
        })
      );
    });

    it('lança erro quando a deleção falha', async () => {
      fetch.mockResolvedValueOnce(jsonResponse({}, { ok: false, status: 500 }));
      await expect(ftsApi.deleteFiles('P', ['a.txt'])).rejects.toThrow(
        'Falha na deleção na nuvem'
      );
    });
  });

  describe('downloadFile', () => {
    it('baixa o blob e dispara o download no navegador', async () => {
      vi.useFakeTimers();
      const createObjectURL = vi.fn().mockReturnValue('blob:mock');
      const revokeObjectURL = vi.fn();
      vi.stubGlobal('URL', { ...window.URL, createObjectURL, revokeObjectURL });
      const clickSpy = vi
        .spyOn(HTMLAnchorElement.prototype, 'click')
        .mockImplementation(() => {});

      fetch
        .mockResolvedValueOnce(jsonResponse({ accessUri: 'https://storage/download' }))
        .mockResolvedValueOnce(jsonResponse({}, { status: 200 }));

      await ftsApi.downloadFile('P', 'relatorio.pdf');

      expect(clickSpy).toHaveBeenCalledTimes(1);
      expect(createObjectURL).toHaveBeenCalledTimes(1);
      expect(revokeObjectURL).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1000);
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock');

      vi.unstubAllGlobals();
    });

    it('lança erro quando o storage Oracle nega o download', async () => {
      fetch
        .mockResolvedValueOnce(jsonResponse({ accessUri: 'https://storage/download' }))
        .mockResolvedValueOnce(jsonResponse({}, { ok: false, status: 404 }));

      await expect(ftsApi.downloadFile('P', 'x.txt')).rejects.toThrow(
        'Erro ao baixar arquivo da Oracle'
      );
    });
  });

  describe('checkPing', () => {
    it('retorna true quando o backend responde ok', async () => {
      fetch.mockResolvedValueOnce(jsonResponse({}, { status: 200 }));
      await expect(ftsApi.checkPing()).resolves.toBe(true);
    });

    it('retorna false quando o backend responde com erro', async () => {
      fetch.mockResolvedValueOnce(jsonResponse({}, { ok: false, status: 503 }));
      await expect(ftsApi.checkPing()).resolves.toBe(false);
    });
  });
});
