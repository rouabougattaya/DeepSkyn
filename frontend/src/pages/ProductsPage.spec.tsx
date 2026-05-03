import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import ProductsPage from './ProductsPage';
import { MemoryRouter } from 'react-router-dom';
import { productService } from '../services/product.service';
import * as authSession from '../lib/authSession';

// Mock dependencies
vi.mock('../services/product.service', () => ({
  productService: {
    getTypes: vi.fn(),
    getIngredients: vi.fn(),
    filter: vi.fn(),
  }
}));

vi.mock('../lib/authSession', () => ({
  getUser: vi.fn()
}));

vi.mock('../components/Navbar', () => ({
  Navbar: () => <div data-testid="navbar">Navbar</div>
}));

vi.mock('../components/Sidebar', () => ({
  Sidebar: () => <div data-testid="sidebar">Sidebar</div>
}));

vi.mock('../components/ProductCard', () => ({
  default: ({ product }: any) => <div data-testid="product-card">{product.name}</div>
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key
  })
}));

describe('ProductsPage Component', () => {
  const mockProducts = [
    { id: '1', name: 'Product A', price: 10, type: 'Serum', rating: 4.5, isClean: true },
    { id: '2', name: 'Product B', price: 20, type: 'Cream', rating: 4.8, isClean: false }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (authSession.getUser as any).mockReturnValue({ id: 'user1' });
    
    (productService.getTypes as any).mockResolvedValue(['Serum', 'Cream', 'Cleanser']);
    (productService.getIngredients as any).mockResolvedValue(['Vitamin C', 'Retinol', 'Hyaluronic Acid']);
    (productService.filter as any).mockResolvedValue(mockProducts);
  });

  const waitDebounce = () => new Promise(r => setTimeout(r, 500));

  it('renders correctly and loads data', async () => {
    render(
      <MemoryRouter>
        <ProductsPage />
      </MemoryRouter>
    );
    
    expect(screen.getByText('common.loading')).toBeDefined();

    await waitDebounce();

    expect(productService.getTypes).toHaveBeenCalled();
    expect(productService.getIngredients).toHaveBeenCalled();
    expect(productService.filter).toHaveBeenCalled();

    expect(screen.getByText('Product A')).toBeDefined();
    expect(screen.getByText('Product B')).toBeDefined();
  });

  it('handles search input', async () => {
    render(
      <MemoryRouter>
        <ProductsPage />
      </MemoryRouter>
    );

    await waitDebounce();

    const searchInput = screen.getByPlaceholderText('products.search_placeholder');
    
    fireEvent.change(searchInput, { target: { value: 'test search' } });
    await waitDebounce();

    expect(productService.filter).toHaveBeenCalledWith(expect.objectContaining({ search: 'test search' }));
  });

  it('handles type filter', async () => {
    render(
      <MemoryRouter>
        <ProductsPage />
      </MemoryRouter>
    );

    await waitDebounce();

    const serumBtn = screen.getByRole('button', { name: 'Serum' });
    
    fireEvent.click(serumBtn);
    await waitDebounce();

    expect(productService.filter).toHaveBeenCalledWith(expect.objectContaining({ type: 'Serum' }));
  });

  it('handles price range filter', async () => {
    render(
      <MemoryRouter>
        <ProductsPage />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.queryByText('common.loading')).toBeNull());

    const minInput = screen.getByPlaceholderText('Min');

    // Change min price and verify it triggers a filter call
    fireEvent.change(minInput, { target: { value: '10' } });
    await waitFor(() =>
      expect(productService.filter).toHaveBeenCalledWith(
        expect.objectContaining({ minPrice: 10 })
      )
    , { timeout: 2000 });

    const maxInput = screen.getByPlaceholderText('Max');
    // Change max price and verify it also triggers a filter call
    fireEvent.change(maxInput, { target: { value: '50' } });
    await waitFor(() =>
      expect(productService.filter).toHaveBeenCalledWith(
        expect.objectContaining({ maxPrice: 50 })
      )
    , { timeout: 2000 });
  });


  it('handles clean only toggle', async () => {
    render(
      <MemoryRouter>
        <ProductsPage />
      </MemoryRouter>
    );

    await waitDebounce();

    const cleanToggle = screen.getByRole('switch');
    
    fireEvent.click(cleanToggle);
    await waitDebounce();

    expect(productService.filter).toHaveBeenCalledWith(expect.objectContaining({ isClean: true }));
  });

  it('handles ingredient selection', async () => {
    render(
      <MemoryRouter>
        <ProductsPage />
      </MemoryRouter>
    );

    // Wait for ingredients to load (conditional render requires setIngredients to fire)
    const select = await waitFor(() => screen.getByLabelText('Filtrer par ingrédient'));
    
    fireEvent.change(select, { target: { value: 'Retinol' } });
    await waitDebounce();

    expect(productService.filter).toHaveBeenCalledWith(expect.objectContaining({ ingredient: 'Retinol' }));
  });

  it('displays empty state when no products found', async () => {
    (productService.filter as any).mockResolvedValue([]);
    render(
      <MemoryRouter>
        <ProductsPage />
      </MemoryRouter>
    );

    await waitDebounce();

    expect(screen.getByText('products.no_products')).toBeDefined();

    const resetBtn = screen.getByText('products.reset');
    fireEvent.click(resetBtn);
  });

  it('displays error state if fetch fails', async () => {
    (productService.filter as any).mockRejectedValue(new Error('Fetch failed'));
    render(
      <MemoryRouter>
        <ProductsPage />
      </MemoryRouter>
    );

    await waitDebounce();

    expect(screen.getByText('Impossible de charger les produits. Vérifiez votre connexion.')).toBeDefined();
  });

  it('toggles mobile sidebar', async () => {
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 500 });
    render(
      <MemoryRouter>
        <ProductsPage />
      </MemoryRouter>
    );

    await waitDebounce();

    // The 'Filtres' button is lg:hidden but still in DOM
    const filterBtn = screen.getByLabelText('Ouvrir les filtres');
    fireEvent.click(filterBtn);

    // Mobile overlay should now show the close button
    const closeBtn = await waitFor(() => screen.getByLabelText('Fermer les filtres'));
    expect(closeBtn).toBeDefined();
    fireEvent.click(closeBtn);
    
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1024 });
  });

  it('handles sorting', async () => {
    render(
      <MemoryRouter>
        <ProductsPage />
      </MemoryRouter>
    );

    await waitDebounce();

    const sortSelect = screen.getByLabelText('Trier les produits');
    
    fireEvent.change(sortSelect, { target: { value: '2' } });
    await waitDebounce();

    expect(productService.filter).toHaveBeenCalledWith(expect.objectContaining({ sortBy: 'price', sortOrder: 'ASC' }));
  });
});
