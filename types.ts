
export enum Unit {
  KG = 'kg',
  G = 'g',
  L = 'l',
  ML = 'ml',
  UN = 'un'
}

export enum PaymentMethod {
  CASH = 'Dinheiro',
  PIX = 'Pix',
  DEBIT = 'Débito',
  CREDIT = 'Crédito'
}

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string; // Novo campo
  phone?: string;     // Novo campo
  subscription_status: 'active' | 'blocked';
  subscription_expires_at: string; // ISO Date
  is_admin: boolean;
}

export interface Ingredient {
  id: string;
  name: string;
  unit: Unit;
  pricePerUnit: number; // Price per 1 unit (normalized cost)
  
  // New fields to track the "Packaging" context
  lastPackagePrice: number; // e.g., 18.99
  lastPackageSize: number;  // e.g., 500 (g)
  
  currentStock: number;
  minStockAlert: number;
  updatedAt: string;
}

export interface RecipeItem {
  ingredientId: string;
  quantity: number; // Amount used in recipe
}

export interface Recipe {
  id: string;
  name: string;
  items: RecipeItem[];
  yieldAmount: number; // How many units (salgados) it produces
  yieldUnit: string; // e.g., "unidades", "kg"
  sellingPrice: number; // Per unit
  indirectCosts: number; // Gas, energy, packaging per batch
  preparationTimeMinutes: number;
}

export interface PurchaseItem {
  ingredientId: string; // Or a temp name if new
  quantity: number;
  totalPrice: number;
  tempName?: string; // Optional temporary name from OCR or manual input
}

export interface Purchase {
  id: string;
  date: string;
  items: PurchaseItem[];
  total: number;
  notes?: string;
}

export interface SaleItem {
  recipeId: string;
  quantity: number;
  unitPrice: number;
  costPrice: number; // Snapshot of cost at time of sale
}

export interface Sale {
  id: string;
  date: string;
  items: SaleItem[];
  total: number;
  paymentMethod: PaymentMethod;
  profit: number;
}

export interface CashSession {
    id: string;
    openedAt: string;
    closedAt?: string;
    initialBalance: number;
    finalBalance?: number; // Calculated or manually entered
    salesTotal: number; // Sales during this session
    status: 'open' | 'closed';
    notes?: string;
}

export type Page = 'dashboard' | 'recipes' | 'inventory' | 'purchases' | 'sales' | 'settings' | 'login' | 'admin';
