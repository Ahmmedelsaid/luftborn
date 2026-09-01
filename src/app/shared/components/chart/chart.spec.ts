import { ChartConfiguration } from 'chart.js';
import { describe, expect, it } from 'vitest';
import { withChartDirection } from './chart';

/**
 * `ChartConfiguration` is a union across every chart type, so scale and plugin
 * options are not readable without narrowing. These accessors keep the casts in
 * one place rather than scattered through the assertions.
 */
function scaleOption(config: ChartConfiguration, axis: 'x' | 'y'): Record<string, unknown> {
  const scales = (config.options?.scales ?? {}) as Record<string, Record<string, unknown>>;
  return scales[axis] ?? {};
}

function pluginOption(config: ChartConfiguration, plugin: string): Record<string, unknown> {
  const plugins = (config.options?.plugins ?? {}) as Record<string, Record<string, unknown>>;
  return plugins[plugin] ?? {};
}

/** A bar configuration with the axes the transform mirrors. */
function barConfig(): ChartConfiguration<'bar'> {
  return {
    type: 'bar',
    data: { labels: ['a', 'b'], datasets: [{ data: [1, 2] }] },
    options: {
      plugins: { legend: { position: 'bottom' } },
      scales: {
        x: { grid: { display: false } },
        y: { beginAtZero: true },
      },
    },
  };
}

/** A doughnut configuration, which has no scales at all. */
function doughnutConfig(): ChartConfiguration<'doughnut'> {
  return {
    type: 'doughnut',
    data: { labels: ['a'], datasets: [{ data: [1] }] },
    options: { cutout: '62%' },
  };
}

describe('withChartDirection', () => {
  describe('left-to-right', () => {
    it('keeps the value axis on the leading edge', () => {
      expect(scaleOption(withChartDirection(barConfig(), false), 'y')['position']).toBe('left');
    });

    it('does not reverse the category axis', () => {
      expect(scaleOption(withChartDirection(barConfig(), false), 'x')['reverse']).toBe(false);
    });

    it('leaves the legend and tooltip in document order', () => {
      const result = withChartDirection(barConfig(), false);

      expect(pluginOption(result, 'legend')['rtl']).toBe(false);
      expect(pluginOption(result, 'tooltip')['textDirection']).toBe('ltr');
    });
  });

  describe('right-to-left', () => {
    it('moves the value axis to the other side', () => {
      expect(scaleOption(withChartDirection(barConfig(), true), 'y')['position']).toBe('right');
    });

    it('reverses the category axis, so bars read right to left', () => {
      expect(scaleOption(withChartDirection(barConfig(), true), 'x')['reverse']).toBe(true);
    });

    it('mirrors the legend and tooltip', () => {
      const result = withChartDirection(barConfig(), true);

      expect(pluginOption(result, 'legend')['rtl']).toBe(true);
      expect(pluginOption(result, 'legend')['textDirection']).toBe('rtl');
      expect(pluginOption(result, 'tooltip')['rtl']).toBe(true);
    });
  });

  it('preserves the options it does not own', () => {
    const result = withChartDirection(barConfig(), true);

    expect(pluginOption(result, 'legend')['position']).toBe('bottom');
    expect(scaleOption(result, 'y')['beginAtZero']).toBe(true);
    expect(result.type).toBe('bar');
  });

  it('leaves a scaleless chart alone rather than inventing axes', () => {
    const result = withChartDirection(doughnutConfig(), true);

    expect(result.options?.scales).toEqual({});
    expect(pluginOption(result, 'legend')['rtl']).toBe(true);
  });

  it('does not mutate the configuration it was given', () => {
    const original = barConfig();
    withChartDirection(original, true);

    expect(scaleOption(original, 'y')['position']).toBeUndefined();
  });
});
