import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import OsceModeSelectionView from './OsceModeSelectionView';

describe('OsceModeSelectionView', () => {
  it('o RPG guiado tem cartão próprio, separado do RPG com IA', () => {
    const onSelectMode = vi.fn();
    render(<OsceModeSelectionView onSelectMode={onSelectMode} onBack={() => {}} />);

    fireEvent.click(screen.getByRole('button', { name: /RPG Guiado/ }));
    expect(onSelectMode).toHaveBeenLastCalledWith('guided');

    fireEvent.click(screen.getByRole('button', { name: /Simulado RPG/ }));
    expect(onSelectMode).toHaveBeenLastCalledWith('rpg');
  });
});
