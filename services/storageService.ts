import { Ingredient, Recipe, Sale, Purchase, Unit, CashSession } from '../types';

// Initial Mock Data with Package Details
const INITIAL_INGREDIENTS: Ingredient[] = [
  { 
    id: '1', name: 'Farinha de Trigo', unit: Unit.KG, 
    pricePerUnit: 5.50, lastPackagePrice: 5.50, lastPackageSize: 1,
    currentStock: 10, minStockAlert: 5, updatedAt: new Date().toISOString() 
  },
  { 
    id: '2', name: 'Frango Desfiado', unit: Unit.KG, 
    pricePerUnit: 22.00, lastPackagePrice: 22.00, lastPackageSize: 1,
    currentStock: 2, minStockAlert: 2, updatedAt: new Date().toISOString() 
  },
  { 
    id: '3', name: 'Óleo de Soja', unit: Unit.L, 
    pricePerUnit: 8.00, lastPackagePrice: 8.00, lastPackageSize: 1,
    currentStock: 5, minStockAlert: 2, updatedAt: new Date().toISOString() 
  },
  {
    id: '4', name: 'Fermento Químico', unit: Unit.G,
    pricePerUnit: 0.03798, lastPackagePrice: 18.99, lastPackageSize: 500, // 18.99 / 500g
    currentStock: 500, minStockAlert: 50, updatedAt: new Date().toISOString()
  },
  {
    id: '5', name: 'Ovos', unit: Unit.UN,
    pricePerUnit: 0.75, lastPackagePrice: 14.99, lastPackageSize: 20, // 14.99 / 20 eggs
    currentStock: 40, minStockAlert: 12, updatedAt: new Date().toISOString()
  }
];

const INITIAL_RECIPES: Recipe[] = [
  {
    id: '1',
    name: 'Coxinha de Frango',
    yieldAmount: 20,
    yieldUnit: 'unidades',
    sellingPrice: 8.00,
    indirectCosts: 5.00,
    preparationTimeMinutes: 60,
    items: [
      { ingredientId: '1', quantity: 0.5 }, // 500g flour
      { ingredientId: '2', quantity: 0.4 }, // 400g chicken
      { ingredientId: '3', quantity: 0.1 }, // 100ml oil
    ]
  }
];

// Helper to manage localStorage
const get = <T>(key: string, initial: T): T => {
  const stored = localStorage.getItem(key);
  if (!stored) return initial;
  try {
    return JSON.parse(stored);
  } catch {
    return initial;
  }
};

const set = (key: string, value: any) => {
  localStorage.setItem(key, JSON.stringify(value));
};

export const storageService = {
  getIngredients: (): Ingredient[] => get('ingredients', INITIAL_INGREDIENTS),
  saveIngredients: (data: Ingredient[]) => set('ingredients', data),

  getRecipes: (): Recipe[] => get('recipes', INITIAL_RECIPES),
  saveRecipes: (data: Recipe[]) => set('recipes', data),

  getSales: (): Sale[] => get('sales', []),
  saveSales: (data: Sale[]) => set('sales', data),

  getPurchases: (): Purchase[] => get('purchases', []),
  savePurchases: (data: Purchase[]) => set('purchases', data),
  
  getCashSessions: (): CashSession[] => get('cash_sessions', []),
  saveCashSessions: (data: CashSession[]) => set('cash_sessions', data),
  
  // Logic to process a purchase (update stock and average price)
  processPurchase: (purchase: Purchase, currentIngredients: Ingredient[]) => {
    const newIngredients = [...currentIngredients];
    
    purchase.items.forEach(item => {
      // Skip items that are not linked to an ingredient (General Expenses)
      if (!item.ingredientId) return;

      const index = newIngredients.findIndex(i => i.id === item.ingredientId);
      if (index >= 0) {
        const ing = newIngredients[index];
        // Calculate new weighted average price
        const currentValue = ing.currentStock * ing.pricePerUnit;
        const newValue = item.totalPrice; // Total price for this batch
        const totalStock = ing.currentStock + item.quantity;
        
        // Avoid division by zero
        const newPricePerUnit = totalStock > 0 ? (currentValue + newValue) / totalStock : ing.pricePerUnit;

        newIngredients[index] = {
          ...ing,
          currentStock: totalStock,
          pricePerUnit: newPricePerUnit,
          // Update the "Last Package" reference for display
          lastPackagePrice: item.totalPrice,
          lastPackageSize: item.quantity,
          updatedAt: new Date().toISOString()
        };
      }
    });
    
    set('ingredients', newIngredients);
    return newIngredients;
  },

  // Deduct stock based on recipe production (Simulated production run)
  deductStockForProduction: (recipe: Recipe, batchCount: number, currentIngredients: Ingredient[]) => {
    const newIngredients = [...currentIngredients];
    let possible = true;

    // First check if possible
    for (const item of recipe.items) {
      const ing = newIngredients.find(i => i.id === item.ingredientId);
      if (!ing || ing.currentStock < (item.quantity * batchCount)) {
        possible = false;
        break;
      }
    }

    if (!possible) return { success: false, ingredients: currentIngredients };

    // Deduct
    recipe.items.forEach(item => {
      const index = newIngredients.findIndex(i => i.id === item.ingredientId);
      if (index >= 0) {
        newIngredients[index].currentStock -= (item.quantity * batchCount);
      }
    });

    set('ingredients', newIngredients);
    return { success: true, ingredients: newIngredients };
  }
};