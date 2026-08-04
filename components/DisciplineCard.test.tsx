import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import DisciplineCard from './DisciplineCard';
import type { SimulationInfo } from '../types';

const baseInfo: SimulationInfo = {
  id: 'cardio-1',
  periodId: 'p1',
  title: 'Cardiologia',
  category: 'UC',
  description: 'Simulado de cardiologia',
  meta: '10 questões',
  icon: '❤️',
  status: 'active',
  themes: [],
};

describe('DisciplineCard', () => {
  it('chama onSelect ao clicar quando disponível', () => {
    const onSelect = vi.fn();
    render(<DisciplineCard info={baseInfo} onSelect={onSelect} />);

    fireEvent.click(screen.getByText('Cardiologia'));

    expect(onSelect).toHaveBeenCalledWith('cardio-1');
  });

  it('não chama onSelect quando bloqueado', () => {
    const onSelect = vi.fn();
    render(<DisciplineCard info={{ ...baseInfo, status: 'locked' }} onSelect={onSelect} />);

    fireEvent.click(screen.getByText('Cardiologia'));

    expect(onSelect).not.toHaveBeenCalled();
    expect(screen.getByText('Indisponível')).toBeInTheDocument();
  });
});
