// src/hooks/useInventoryManager.tsx - Main Export for Backward Compatibility
"use client";

// Re-export everything from the inventory module
export {
  useInventoryManager,
  type InventoryItem,
  type InventorySummary,
  type EmployeeContext,
  type UseInventoryManagerReturn,
} from "./inventory/useInventoryManager";

// Additional exports for advanced usage
export {
  useInventoryStorage,
  useInventoryOperations,
  useInventorySummary,
  useInventoryExport,
} from "./inventory";
