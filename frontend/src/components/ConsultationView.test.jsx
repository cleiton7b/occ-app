/**
 * OCC - Object Control Center
 * Testes do componente de consulta de arquivos.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ConsultationView from './ConsultationView';
import { ToastProvider } from './Toast';
import { ftsApi } from '../services/api';

vi.mock('../services/api', () => ({
  ftsApi: {
    downloadFile: vi.fn(),
  },
}));

const makeFiles = (count = 3) =>
  Array.from({ length: count }, (_, index) => ({
    name: `arquivo-${String(index + 1).padStart(2, '0')}.txt`,
    size: (index + 1) * 1024,
    scanStatus: 'Passed',
    modified: `2024-01-${String(index + 1).padStart(2, '0')}`,
  }));

const renderView = (props = {}) =>
  render(
    <ToastProvider>
      <ConsultationView prefix="PREFIXO" files={makeFiles()} onRefresh={vi.fn()} {...props} />
    </ToastProvider>
  );

describe('ConsultationView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exibe a contagem de arquivos e o tamanho total formatado', () => {
    renderView({
      files: [
        { name: 'a.txt', size: 1048576, scanStatus: 'Passed', modified: '2024-01-01' },
        { name: 'b.txt', size: 524288, scanStatus: 'Passed', modified: '2024-01-02' },
      ],
    });

    expect(screen.getByText('(2 arquivos)')).toBeInTheDocument();
    expect(screen.getByText('1,50 MB')).toBeInTheDocument();
  });

  it('filtra a lista pelo termo digitado', async () => {
    const user = userEvent.setup();
    renderView();

    await user.type(screen.getByPlaceholderText('Filtrar arquivos...'), 'arquivo-02');

    const rows = within(screen.getByRole('table')).getAllByRole('row');
    expect(rows).toHaveLength(2); // cabeçalho + 1 resultado
    expect(screen.getByText('arquivo-02.txt')).toBeInTheDocument();
    expect(screen.queryByText('arquivo-01.txt')).not.toBeInTheDocument();
  });

  it('exibe o resumo de filtragem quando há busca ativa', async () => {
    const user = userEvent.setup();
    renderView();

    await user.type(screen.getByPlaceholderText('Filtrar arquivos...'), 'arquivo');

    expect(screen.getByText(/Exibindo/)).toBeInTheDocument();
  });

  it('ordena por tamanho ao clicar no cabeçalho', async () => {
    const user = userEvent.setup();
    renderView({
      files: [
        { name: 'grande.txt', size: 3000, scanStatus: 'Passed', modified: '2024-01-01' },
        { name: 'pequeno.txt', size: 10, scanStatus: 'Passed', modified: '2024-01-02' },
      ],
    });

    await user.click(screen.getByText('Tamanho'));

    let rows = within(screen.getByRole('table')).getAllByRole('row');
    expect(within(rows[1]).getByText('pequeno.txt')).toBeInTheDocument();

    await user.click(screen.getByText('Tamanho'));

    rows = within(screen.getByRole('table')).getAllByRole('row');
    expect(within(rows[1]).getByText('grande.txt')).toBeInTheDocument();
  });

  it('pagina a lista em blocos de 10 arquivos', async () => {
    const user = userEvent.setup();
    renderView({ files: makeFiles(12) });

    expect(screen.getByText('Página 1 de 2')).toBeInTheDocument();
    expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(11);

    await user.click(screen.getByRole('button', { name: 'Próxima' }));

    expect(screen.getByText('Página 2 de 2')).toBeInTheDocument();
    expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(3);
  });

  it('exibe estado de erro e permite tentar novamente', async () => {
    const user = userEvent.setup();
    const onRefresh = vi.fn();
    renderView({ error: 'Falha de conexão', onRefresh });

    expect(screen.getByText('Erro ao carregar arquivos')).toBeInTheDocument();
    expect(screen.getByText('Falha de conexão')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));

    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it('aciona o download com prefixo e nome do arquivo', async () => {
    const user = userEvent.setup();
    ftsApi.downloadFile.mockResolvedValueOnce();
    renderView({ files: [makeFiles(1)[0]] });

    await user.click(screen.getByTitle('Baixar Arquivo'));

    expect(ftsApi.downloadFile).toHaveBeenCalledWith('PREFIXO', 'arquivo-01.txt');
  });
});
