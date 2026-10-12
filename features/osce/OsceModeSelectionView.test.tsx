import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import OsceModeSelectionView from './OsceModeSelectionView';

describe('OsceModeSelectionView', () => {
  it('oferece só o Simulado Estático e o RPG Guiado', () => {
    const onSelectMode = vi.fn();
    render(<OsceModeSelectionView onSelectMode={onSelectMode} onBack={() => {}} />);

    expect(screen.getAllByRole('button').filter((b) => b.querySelector('h3'))).toHaveLength(2);
    expect(screen.queryByRole('button', { name: /RPG com IA/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Paciente Virtual/ })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Simulado Estático/ }));
    expect(onSelectMode).toHaveBeenLastCalledWith('static');
    fireEvent.click(screen.getByRole('button', { name: /RPG Guiado/ }));
    expect(onSelectMode).toHaveBeenLastCalledWith('guided');
  });
});
