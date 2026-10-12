import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import OsceModeSelectionView from './OsceModeSelectionView';

describe('OsceModeSelectionView', () => {
  it('RPG Guiado e RPG com IA são cartões separados', () => {
    const onSelectMode = vi.fn();
    render(<OsceModeSelectionView onSelectMode={onSelectMode} onBack={() => {}} />);

    fireEvent.click(screen.getByRole('button', { name: /RPG Guiado/ }));
    expect(onSelectMode).toHaveBeenLastCalledWith('guided');

    fireEvent.click(screen.getByRole('button', { name: /RPG com IA/ }));
    expect(onSelectMode).toHaveBeenLastCalledWith('rpg');
  });
});
