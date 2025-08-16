import { render, screen, fireEvent, act, within } from '@testing-library/react';
import HomePage from '../page';

describe('HomePage suggestions', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    global.fetch = jest.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/api/search?q=')) {
        return {
          ok: true,
          json: async () => ({
            results: [
              { id: 1, title: 'Фильм A', media_type: 'movie', release_date: '2020-01-01' },
              { id: 2, title: 'Фильм B', media_type: 'movie', release_date: '2021-01-01' },
              { id: 3, title: 'Фильм C', media_type: 'movie', release_date: '2022-01-01' },
              { id: 4, title: 'Фильм D', media_type: 'movie', release_date: '2023-01-01' },
            ]
          })
        } as any;
      }
      // trending
      return { ok: true, json: async () => ({ results: [] }) } as any;
    }) as any;
  });

  afterEach(() => {
    jest.useRealTimers();
    (global.fetch as any) = undefined;
  });

  it('shows up to 3 suggestions while typing', async () => {
    render(<HomePage />);
    const input = screen.getByPlaceholderText('Найти фильм или сериал...');
    fireEvent.change(input, { target: { value: 'фил' } });

    await act(async () => {
      jest.advanceTimersByTime(350);
    });

    const box = await screen.findByTestId('suggestions');
    const withinBox = within(box);
    expect(await withinBox.findByText('Фильм A')).toBeInTheDocument();
    expect(withinBox.getByText('Фильм B')).toBeInTheDocument();
    expect(withinBox.getByText('Фильм C')).toBeInTheDocument();
  });
});
