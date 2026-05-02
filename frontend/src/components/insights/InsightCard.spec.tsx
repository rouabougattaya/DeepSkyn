import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import InsightCard from './InsightCard';
import type { Insight } from '../../services/analysisService';

describe('InsightCard Component', () => {
  describe('Icon Rendering', () => {
    it('should render trending up icon for improvement insights', () => {
      const insight: Insight = {
        type: 'improvement',
        severity: 'low',
        title: 'Skin Improving',
        message: 'Your skin condition is improving',
      };

      const { container } = render(<InsightCard insight={insight} />);
      expect(container.querySelector('.text-green-500')).toBeDefined();
    });

    it('should render alert icon for fluctuation insights', () => {
      const insight: Insight = {
        type: 'fluctuation',
        severity: 'medium',
        title: 'Skin Fluctuation',
        message: 'Your skin condition is fluctuating',
      };

      const { container } = render(<InsightCard insight={insight} />);
      expect(container.querySelector('.text-red-500')).toBeDefined();
    });

    it('should render minus icon for stagnation insights', () => {
      const insight: Insight = {
        type: 'stagnation',
        severity: 'medium',
        title: 'No Progress',
        message: 'Your skin condition is stagnating',
      };

      const { container } = render(<InsightCard insight={insight} />);
      expect(container.querySelector('.text-yellow-500')).toBeDefined();
    });

    it('should render info icon for info insights', () => {
      const insight: Insight = {
        type: 'info',
        severity: 'low',
        title: 'Information',
        message: 'Here is useful information about your skin',
      };

      const { container } = render(<InsightCard insight={insight} />);
      expect(container.querySelector('.text-blue-500')).toBeDefined();
    });
  });

  describe('Severity Styling', () => {
    it('should apply red styling for high severity', () => {
      const insight: Insight = {
        type: 'improvement',
        severity: 'high',
        title: 'Critical Improvement',
        message: 'Important skin change detected',
      };

      const { container } = render(<InsightCard insight={insight} />);
      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain('border-red-500');
      expect(card.className).toContain('bg-red-50');
    });

    it('should apply yellow styling for medium severity', () => {
      const insight: Insight = {
        type: 'fluctuation',
        severity: 'medium',
        title: 'Medium Fluctuation',
        message: 'Moderate skin change detected',
      };

      const { container } = render(<InsightCard insight={insight} />);
      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain('border-yellow-500');
      expect(card.className).toContain('bg-yellow-50');
    });

    it('should apply green styling for low severity', () => {
      const insight: Insight = {
        type: 'improvement',
        severity: 'low',
        title: 'Minor Improvement',
        message: 'Small positive change',
      };

      const { container } = render(<InsightCard insight={insight} />);
      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain('border-green-500');
      expect(card.className).toContain('bg-green-50');
    });

    it('should apply default styling for unknown severity', () => {
      const insight: Insight = {
        type: 'info',
        severity: 'unknown' as any,
        title: 'Default',
        message: 'Default severity',
      };

      const { container } = render(<InsightCard insight={insight} />);
      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain('border-gray-200');
      expect(card.className).toContain('bg-white');
    });
  });

  describe('Content Rendering', () => {
    it('should display insight title', () => {
      const insight: Insight = {
        type: 'improvement',
        severity: 'low',
        title: 'Hydration Level',
        message: 'Your skin hydration is excellent',
      };

      render(<InsightCard insight={insight} />);
      const title = screen.getByText('Hydration Level');
      expect(title).toBeDefined();
      expect(title.className).toContain('font-bold');
    });

    it('should display insight message', () => {
      const insight: Insight = {
        type: 'improvement',
        severity: 'low',
        title: 'Test Title',
        message: 'This is a test message about skin condition',
      };

      render(<InsightCard insight={insight} />);
      expect(screen.getByText('This is a test message about skin condition')).toBeDefined();
    });

    it('should display long insight messages without truncation', () => {
      const longMessage = 'Your skin condition has improved significantly. ' +
        'The texture is smoother, the tone is more even, and the overall ' +
        'elasticity has increased. Continue your current skincare routine ' +
        'for best results.';
      
      const insight: Insight = {
        type: 'improvement',
        severity: 'low',
        title: 'Long Message Test',
        message: longMessage,
      };

      render(<InsightCard insight={insight} />);
      expect(screen.getByText(longMessage)).toBeDefined();
    });

    it('should handle special characters in title and message', () => {
      const insight: Insight = {
        type: 'info',
        severity: 'low',
        title: 'pH & Moisture (25-30%)',
        message: 'Your skin\'s pH level is between 4.5-5.5 (optimal range)',
      };

      render(<InsightCard insight={insight} />);
      const title = screen.getByText(/pH & Moisture/);
      expect(title).toBeDefined();
      const message = screen.getByText(/4.5-5.5/);
      expect(message).toBeDefined();
    });
  });

  describe('CSS Classes and Styling', () => {
    it('should have proper spacing and layout classes', () => {
      const insight: Insight = {
        type: 'improvement',
        severity: 'low',
        title: 'Test',
        message: 'Test message',
      };

      const { container } = render(<InsightCard insight={insight} />);
      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain('p-4');
      expect(card.className).toContain('rounded-xl');
      expect(card.className).toContain('shadow-sm');
    });

    it('should apply hover effect class', () => {
      const insight: Insight = {
        type: 'improvement',
        severity: 'low',
        title: 'Test',
        message: 'Test message',
      };

      const { container } = render(<InsightCard insight={insight} />);
      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain('transition-all');
      expect(card.className).toContain('hover:shadow-md');
    });

    it('should have flex layout for proper content alignment', () => {
      const insight: Insight = {
        type: 'improvement',
        severity: 'low',
        title: 'Test',
        message: 'Test message',
      };

      const { container } = render(<InsightCard insight={insight} />);
      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain('flex');
      expect(card.className).toContain('items-start');
      expect(card.className).toContain('gap-4');
    });
  });

  describe('Edge Cases', () => {
    it('should render with empty title', () => {
      const insight: Insight = {
        type: 'info',
        severity: 'low',
        title: '',
        message: 'Message without title',
      };

      render(<InsightCard insight={insight} />);
      expect(screen.getByText('Message without title')).toBeDefined();
    });

    it('should render with empty message', () => {
      const insight: Insight = {
        type: 'info',
        severity: 'low',
        title: 'Title without message',
        message: '',
      };

      render(<InsightCard insight={insight} />);
      expect(screen.getByText('Title without message')).toBeDefined();
    });

    it('should render with very long title', () => {
      const longTitle = 'This is a very long title that contains a lot of information about skin improvement and hydration levels and should wrap properly';
      
      const insight: Insight = {
        type: 'improvement',
        severity: 'low',
        title: longTitle,
        message: 'Short message',
      };

      render(<InsightCard insight={insight} />);
      expect(screen.getByText(longTitle)).toBeDefined();
    });

    it('should handle all insight types correctly', () => {
      const insightTypes: Array<Insight['type']> = ['improvement', 'fluctuation', 'stagnation', 'info'];
      
      insightTypes.forEach((type) => {
        const { unmount } = render(
          <InsightCard
            insight={{
              type,
              severity: 'low',
              title: `Test ${type}`,
              message: `This is a ${type} insight`,
            }}
          />
        );
        
        expect(screen.getByText(`Test ${type}`)).toBeDefined();
        unmount();
      });
    });

    it('should handle all severity levels correctly', () => {
      const severities: Array<Insight['severity']> = ['high', 'medium', 'low'];
      
      severities.forEach((severity) => {
        const { unmount } = render(
          <InsightCard
            insight={{
              type: 'improvement',
              severity,
              title: `Test ${severity}`,
              message: `This is a ${severity} severity insight`,
            }}
          />
        );
        
        expect(screen.getByText(`Test ${severity}`)).toBeDefined();
        unmount();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have semantic HTML structure', () => {
      const insight: Insight = {
        type: 'improvement',
        severity: 'low',
        title: 'Accessibility Test',
        message: 'Testing semantic HTML',
      };

      const { container } = render(<InsightCard insight={insight} />);
      const heading = container.querySelector('h4');
      expect(heading).toBeDefined();
      expect(heading?.className).toContain('font-bold');
    });

    it('should have proper text hierarchy', () => {
      const insight: Insight = {
        type: 'improvement',
        severity: 'low',
        title: 'Main Title',
        message: 'Descriptive message below',
      };

      const { container } = render(<InsightCard insight={insight} />);
      const title = screen.getByText('Main Title');
      const message = screen.getByText('Descriptive message below');
      
      expect(title.className).toContain('font-bold');
      expect(message.className).toContain('text-sm');
    });
  });
});
