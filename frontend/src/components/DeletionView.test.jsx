/**
 * OCC - Object Control Center
 * Testes do componente de exclusão de arquivos.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DeletionView from './DeletionView';
import { ToastProvider } from './Toast';
import { ftsApi } from '../services/api';

vi.mock('../services/api', () => ({
  ftsApi: {
    deleteFiles: vi.fn(),
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
      <DeletionView
        prefix="PREFIXO"
        files={makeFiles()}
        onDeleted={vi.fn()}
        onRefresh={vi.fn()}
        {...props}
      />
    </ToastProvider>
  );

describe('DeletionView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ftsApi.deleteFiles.mockResolvedValue({});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('seleciona um arquivo e habilita a exclusão', async () => {
    const user = userEvent.setup();
    renderView();

    const rowCheckboxes = screen.getAllByRole('checkbox').slice(1);
    await user.click(rowCheckboxes[0]);

    expect(screen.getByRole('button', { name: /Deletar Selecionados \(1\)/ })).toBeEnabled();
    expect(screen.getByText(/Selecionados: 1/)).toBeInTheDocument();
  });

  it('mantém a exclusão desabilitada sem seleção', () => {
    renderView();
    expect(screen.getByRole('button', { name: /Deletar Selecionados \(0\)/ })).toBeDisabled();
  });

  it('seleciona todos os arquivos pelo checkbox do cabeçalho', async () => {
    const user = userEvent.setup();
    renderView();

    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[0]);

    expect(screen.getByRole('button', { name: /Deletar Selecionados \(3\)/ })).toBeEnabled();
    expect(checkboxes.slice(1).every((checkbox) => checkbox.checked)).toBe(true);
  });

  it('marca o checkbox do cabeçalho como indeterminado com seleção parcial', async () => {
    const user = userEvent.setup();
    renderView();

    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[1]);

    expect(checkboxes[0].indeterminate).toBe(true);
  });

  it('exclui os arquivos selecionados após confirmação', async () => {
    const user = userEvent.setup();
    const onDeleted = vi.fn();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderView({ onDeleted });

    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[1]);
    await user.click(checkboxes[2]);
    await user.click(screen.getByRole('button', { name: /Deletar Selecionados \(2\)/ }));

    expect(window.confirm).toHaveBeenCalled();
    expect(ftsApi.deleteFiles).toHaveBeenCalledWith('PREFIXO', [
      'arquivo-01.txt',
      'arquivo-02.txt',
    ]);
    expect(onDeleted).toHaveBeenCalledWith(['arquivo-01.txt', 'arquivo-02.txt']);
    expect(screen.getByRole('button', { name: /Deletar Selecionados \(0\)/ })).toBeDisabled();
  });

  it('não exclui quando a confirmação é cancelada', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    renderView();

    await user.click(screen.getAllByRole('checkbox')[1]);
    await user.click(screen.getByRole('button', { name: /Deletar Selecionados \(1\)/ }));

    expect(ftsApi.deleteFiles).not.toHaveBeenCalled();
  });

  it('exibe toast de erro quando a exclusão falha', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    ftsApi.deleteFiles.mockRejectedValueOnce(new Error('Falha na nuvem'));
    renderView();

    await user.click(screen.getAllByRole('checkbox')[1]);
    await user.click(screen.getByRole('button', { name: /Deletar Selecionados \(1\)/ }));

    expect(await screen.findByText('Erro ao deletar: Falha na nuvem')).toBeInTheDocument();
  });

  it('filtra a lista e permite selecionar apenas o resultado', async () => {
    const user = userEvent.setup();
    renderView();

    await user.type(screen.getByPlaceholderText('Filtrar arquivos...'), 'arquivo-02');

    const rows = within(screen.getByRole('table')).getAllByRole('row');
    expect(rows).toHaveLength(2);
    expect(screen.queryByText('arquivo-01.txt')).not.toBeInTheDocument();
  });

  it('exibe estado de erro e permite tentar novamente', async () => {
    const user = userEvent.setup();
    const onRefresh = vi.fn();
    renderView({ error: 'Falha de conexão', onRefresh });

    expect(screen.getByText('Erro ao carregar arquivos')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));

    expect(onRefresh).toHaveBeenCalledTimes(1);
  });
});
