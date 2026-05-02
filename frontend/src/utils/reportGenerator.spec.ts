import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateClinicalReport } from './reportGenerator';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Mock jsPDF
vi.mock('jspdf', () => {
  const mockDoc = {
    addPage: vi.fn(),
    setFillColor: vi.fn(),
    setDrawColor: vi.fn(),
    rect: vi.fn(),
    roundedRect: vi.fn(),
    setTextColor: vi.fn(),
    setFont: vi.fn(),
    setFontSize: vi.fn(),
    text: vi.fn(),
    splitTextToSize: vi.fn((text) => [text]),
    lastAutoTable: { finalY: 100 },
    internal: { getNumberOfPages: vi.fn(() => 2) },
    setPage: vi.fn(),
    save: vi.fn(),
  };
  return {
    default: vi.fn(() => mockDoc),
  };
});

// Mock autoTable
vi.mock('jspdf-autotable', () => {
  return {
    default: vi.fn(),
  };
});

describe('ReportGenerator - generateClinicalReport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('userAge', '30');
  });

  it('should generate a PDF report with valid mock data', async () => {
    const mockData = {
      user: { name: 'John Doe', email: 'john@example.com' },
      plan: 'PREMIUM',
      routine: {
        inferredSkinType: 'Oily',
        trends: {
          hydration: { current: 40 },
          oil: { current: 80 },
          acne: { current: 60 },
          wrinkles: { current: 20 },
        },
        morning: [
          { stepName: 'Cleanser', product: { name: 'Salicylic Cleanser' }, instruction: 'Wash face' }
        ],
        night: []
      },
      insight: {
        currentSkinAge: 32,
        expertAdvice: ['Drink water', 'Use SPF']
      },
      analysis: {
        realAge: 30,
        skinAge: 32,
        aiRawResponse: {
          globalAnalysis: { dominantCondition: 'Acne' },
          conditionScores: [
            { type: 'Acne', score: 85, description: 'Severe acne' },
            { type: 'Hydration', score: 30, description: 'Dry skin' },
          ]
        }
      },
      products: [
        { name: 'Niacinamide Serum', category: 'Serum', skinBenefit: 'Oil control', keyIngredients: ['Niacinamide', 'Zinc'] }
      ]
    };

    await generateClinicalReport(mockData);

    expect(jsPDF).toHaveBeenCalled();
    const docInstance = (jsPDF as any).mock.results[0].value;
    
    // Check that save was called
    expect(docInstance.save).toHaveBeenCalled();
    
    // Check if the file name contains DeepSkyn_Clinical_Report
    const saveArg = docInstance.save.mock.calls[0][0];
    expect(saveArg).toMatch(/^DeepSkyn_Clinical_Report_.*\.pdf$/);
    
    // Check if text was rendered
    expect(docInstance.text).toHaveBeenCalledWith('DeepSkyn', expect.any(Number), expect.any(Number));
  });

  it('should handle missing data gracefully (fallback logic)', async () => {
    const emptyData = {};

    await generateClinicalReport(emptyData);

    const docInstance = (jsPDF as any).mock.results[0].value;
    expect(docInstance.save).toHaveBeenCalled();
  });
});
