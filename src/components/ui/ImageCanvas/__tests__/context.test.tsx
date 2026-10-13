import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { ImageCanvasController } from '../ImageCanvasActions';
import {
  ImageCanvasContext,
  type ImageCanvasContextValue,
  useImageCanvasContext,
  useOptionalImageCanvasContext,
} from '../context';

describe('ImageCanvasContext', () => {
  const mockController: ImageCanvasController = {
    isGenerating: false,
    copy: async () => {},
    download: async () => {},
    share: async () => {},
  };

  const mockContextValue: ImageCanvasContextValue = {
    canvasRef: { current: null },
    controller: mockController,
    isGenerating: false,
  };

  describe('useImageCanvasContext', () => {
    it('throws an error if not wrapped in provider', () => {
      // Suppress console.error for this expected error test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => renderHook(() => useImageCanvasContext())).toThrow(
        'ImageCanvas compound components must be rendered inside an <ImageCanvas.Provider>.',
      );

      consoleSpy.mockRestore();
    });

    it('returns context value when wrapped in provider', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <ImageCanvasContext.Provider value={mockContextValue}>
          {children}
        </ImageCanvasContext.Provider>
      );

      const { result } = renderHook(() => useImageCanvasContext(), { wrapper });

      expect(result.current).toEqual(mockContextValue);
    });
  });

  describe('useOptionalImageCanvasContext', () => {
    it('returns null if not wrapped in provider', () => {
      const { result } = renderHook(() => useOptionalImageCanvasContext());

      expect(result.current).toBeNull();
    });

    it('returns context value when wrapped in provider', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <ImageCanvasContext.Provider value={mockContextValue}>
          {children}
        </ImageCanvasContext.Provider>
      );

      const { result } = renderHook(() => useOptionalImageCanvasContext(), { wrapper });

      expect(result.current).toEqual(mockContextValue);
    });
  });
});
