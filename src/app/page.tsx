// Path: src/app/page.tsx - Complete Fixed Version with materialCode Integration
"use client";

import React, { useEffect, useState } from "react";
import { useBarcodeDetection } from "../hooks/useBarcodeDetection";
import { useInventoryManager } from "../hooks/useInventoryManager";
import { useEmployeeAuth } from "../hooks/useEmployeeAuth";
// ✅ เพิ่ม import สำหรับ useInventoryExport - ใช้ direct import เพื่อหลีกเลี่ยง conflict
import { useInventoryExport } from "../hooks/inventory/useInventoryExport";
import {
  EmployeeBranchForm,
  EmployeeInfo,
} from "../components/auth/EmployeeBranchForm";
import { CameraSection } from "../components/CameraSection";
import { InventoryDisplay } from "../components/InventoryDisplay";
import { ErrorDisplay } from "../components/ErrorDisplay";
import { ExportSuccessToast } from "../components/ExportSuccessToast";

// Import Product type
import { Product, ProductStatus } from "../types/product";

// ✅ Import utility functions from csvTypes
import {
  getProductCategoryFromGroup,
  isValidProductGroup,
} from "../data/types/csvTypes";

// ✅ Import new quantity types from Phase 2
import { QuantityInput, QuantityDetail } from "../hooks/inventory/types";

// Import new sub-components
import { MobileAppHeader } from "../components/headers/MobileAppHeader";
import { DesktopAppHeader } from "../components/headers/DesktopAppHeader";
import { AppFooter } from "../components/footer/AppFooter";
import { QuickStats } from "../components/stats/QuickStats";
import { ProductInfoSection } from "../components/sections/ProductInfoSection";

// Import updated layout components
import { MobileScannerLayout } from "../components/layout/MobileScannerLayout";

// Import logout confirmation
import { LogoutConfirmationModal } from "../components/modals/LogoutConfirmationModal";
import { useLogoutConfirmation } from "../hooks/useLogoutConfirmation";

// ✅ Import AddNewProductForm
import { AddNewProductForm } from "../components/forms/AddNewProductForm";

export default function BarcodeDetectionPage() {
  const [activeTab, setActiveTab] = useState<"scanner" | "inventory">(
    "scanner"
  );
  const [showExportSuccess, setShowExportSuccess] = useState(false);
  const [exportFileName, setExportFileName] = useState<string>("");
  const [isMobile, setIsMobile] = useState(false);
  const [fullScreenMode, setFullScreenMode] = useState(false);

  // ✅ State สำหรับ AddNewProductForm
  const [showAddProductForm, setShowAddProductForm] = useState(false);
  const [newProductBarcode, setNewProductBarcode] = useState<string>("");

  // ✅ State สำหรับ Export Error
  const [exportError, setExportError] = useState<string | null>(null);

  // Detect mobile viewport and set full screen mode
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      // Auto enable full screen on mobile for scanner tab
      if (mobile && activeTab === "scanner") {
        setFullScreenMode(true);
      } else {
        setFullScreenMode(false);
      }
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, [activeTab]);

  // Toggle full screen mode when tab changes
  useEffect(() => {
    if (isMobile && activeTab === "scanner") {
      setFullScreenMode(true);
    } else {
      setFullScreenMode(false);
    }
  }, [isMobile, activeTab]);

  // Employee Authentication
  const {
    isAuthenticated,
    isLoading: isAuthLoading,
    employee,
    employeeName,
    branchCode,
    branchName,
    login,
    logout,
    formatTimeRemaining,
  } = useEmployeeAuth();

  // Barcode Detection
  const {
    videoRef,
    canvasRef,
    containerRef,
    isStreaming,
    detections,
    processingQueue,
    lastDetectedCode,
    errors,
    product,
    detectedBarcodeType,
    isLoadingProduct,
    productError,
    startCamera,
    stopCamera,
    switchCamera,
    captureAndProcess,
    drawDetections,
    updateCanvasSize,
    clearError,
    restartForNextScan,
    torchOn,
    toggleTorch,
  } = useBarcodeDetection();

  useEffect(() => {
    // หยุดกล้องเมื่อไม่ได้อยู่ใน scanner tab
    if (activeTab !== "scanner" && isStreaming) {
      console.log("🔄 Switching away from scanner tab, stopping camera...");
      stopCamera();
    }
  }, [activeTab, isStreaming, stopCamera]);

  useEffect(() => {
    console.log("🏷️ Detected Barcode Type:", detectedBarcodeType);
    console.log("📦 Product:", product?.name || "No product");
    console.log("📱 Last Detected Code:", lastDetectedCode);
    console.log("---");
  }, [detectedBarcodeType, product, lastDetectedCode]);

  // ✅ FIXED: Enhanced Inventory Management with Multi-Unit API - ไม่ส่ง parameter
  const {
    inventory,
    isLoading: isLoadingInventory,
    error: inventoryError,

    // ✅ NEW: Multi-Unit API methods
    addOrUpdateMultiUnitItem,
    findItemByMaterialCode,

    // ✅ LEGACY: Keep for backward compatibility
    addOrUpdateItem,
    updateItemQuantity,
    updateItemQuantityDetail,

    // Core methods (unchanged)
    removeItem,
    clearInventory,
    findItemByBarcode,
    searchItems,
    clearError: clearInventoryError,
    resetInventoryState,
    summary,
  } = useInventoryManager(); // ✅ FIXED: ไม่ส่ง parameter ใดๆ

  // ✅ เพิ่ม useInventoryExport hook สำหรับ export จริง
  const { exportInventory: performRealExport } = useInventoryExport({
    inventory,
    employeeContext: employee
      ? {
          employeeName: employee.employeeName,
          branchCode: employee.branchCode,
          branchName: employee.branchName,
        }
      : undefined,
    setError: setExportError, // ใช้ exportError state
  });

  // Functions to check unsaved data for logout confirmation
  const hasUnsavedData = (): boolean => {
    return inventory.length > 0;
  };

  const getUnsavedDataCount = (): number => {
    return inventory.length;
  };

  // Handle logout with camera cleanup and inventory reset
  const handleLogout = () => {
    try {
      console.log("🚪 Starting logout process...");

      // Stop camera if running
      if (isStreaming) {
        console.log("📷 Stopping camera...");
        stopCamera();
      }

      // Reset inventory state first (clears memory state)
      console.log("📦 Resetting inventory state...");
      const resetSuccess = resetInventoryState();

      if (resetSuccess) {
        console.log("✅ Inventory state reset successfully");
      } else {
        console.warn(
          "⚠️ Inventory state reset had issues, continuing logout..."
        );
      }

      // Logout (clears localStorage and session)
      console.log("👋 Logging out...");
      logout();

      console.log("✅ Logout process completed");
    } catch (error) {
      console.error("❌ Error during logout process:", error);

      // Force logout even if there are errors
      try {
        resetInventoryState();
        logout();
        console.log("⚠️ Force logout completed despite errors");
      } catch (forceError) {
        console.error("❌ Even force logout failed:", forceError);
      }
    }
  };

  // Logout confirmation hook
  const {
    isModalOpen,
    showLogoutConfirmation,
    hideLogoutConfirmation,
    confirmLogout,
    hasUnsavedData: hasUnsaved,
    unsavedDataCount,
  } = useLogoutConfirmation({
    onLogout: handleLogout,
    hasUnsavedData,
    getUnsavedDataCount,
  });

  // Handle employee login
  const handleEmployeeLogin = async (employeeInfo: EmployeeInfo) => {
    try {
      await login(employeeInfo);
      console.log("✅ Employee logged in:", employeeInfo.employeeName);
    } catch (error) {
      console.error("❌ Login failed:", error);
    }
  };

  // ประมวลผลอัตโนมัติ Real-time
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isStreaming && activeTab === "scanner" && isAuthenticated) {
      interval = setInterval(() => {
        captureAndProcess();
      }, 300);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isStreaming, activeTab, captureAndProcess, isAuthenticated]);

  // ✅ UPDATED: หาจำนวนสินค้าปัจจุบันใน inventory (รองรับ multi-unit)
  const currentInventoryQuantity = React.useMemo(() => {
    if (!lastDetectedCode || !product) return 0;

    // หาด้วย Material Code ก่อน (วิธีใหม่)
    const materialCode = product.id || product.barcode;
    const itemByMaterialCode = findItemByMaterialCode?.(materialCode);

    if (itemByMaterialCode) {
      // คืนค่าจำนวนรวมของหน่วยที่ตรงกับ detected barcode type
      const detectedUnit = detectedBarcodeType || "ea";
      const unitQuantity = itemByMaterialCode.quantities?.[detectedUnit] || 0;

      console.log(
        `🔍 Found by materialCode: ${materialCode}, unit: ${detectedUnit}, qty: ${unitQuantity}`
      );
      return unitQuantity;
    }

    // Fallback: หาด้วย barcode (วิธีเก่า)
    const itemByBarcode = findItemByBarcode(lastDetectedCode);
    const fallbackQuantity = itemByBarcode?.quantity || 0;

    console.log(
      `🔍 Fallback by barcode: ${lastDetectedCode}, qty: ${fallbackQuantity}`
    );
    return fallbackQuantity;
  }, [
    lastDetectedCode,
    product,
    detectedBarcodeType,
    findItemByMaterialCode,
    findItemByBarcode,
  ]);

  // ✅ UPDATED: Enhanced add to inventory with Multi-Unit API
  const handleAddToInventory = (
    product: Product,
    quantityInput: QuantityInput,
    barcodeType?: "ea" | "dsp" | "cs"
  ): boolean => {
    const finalBarcodeType = barcodeType || detectedBarcodeType || "ea";

    console.log("🎯 handleAddToInventory called with Multi-Unit API:");
    console.log("  📦 Product:", product?.name);
    console.log("  🆔 Material Code:", product.id || product.barcode);
    console.log("  🔢 QuantityInput:", quantityInput);
    console.log("  🏷️ BarcodeType received:", barcodeType);
    console.log("  🏷️ DetectedBarcodeType:", detectedBarcodeType);
    console.log("  🏷️ Final BarcodeType:", finalBarcodeType);

    let success = false;
    let usedMultiUnitAPI = false; // ✅ Track which API was actually used

    // ✅ Try new Multi-Unit API first
    if (addOrUpdateMultiUnitItem) {
      try {
        console.log("🚀 Using new Multi-Unit API...");
        success = addOrUpdateMultiUnitItem(
          product,
          quantityInput,
          finalBarcodeType,
          product.category // directProductGroup
        );

        if (success) {
          console.log("✅ Multi-Unit API succeeded");
          usedMultiUnitAPI = true; // ✅ Mark as used Multi-Unit API
        } else {
          console.warn("⚠️ Multi-Unit API returned false, trying fallback...");
        }
      } catch (error) {
        console.error("❌ Multi-Unit API error:", error);
        console.log("🔄 Falling back to legacy API...");
      }
    }

    // ✅ Fallback to legacy API if new API fails or unavailable
    if (!success) {
      console.log("🔄 Using legacy API...");

      // ✅ FIXED: Convert QuantityInput to number for legacy API
      let legacyQuantity: number = 1; // default

      if (typeof quantityInput === "number") {
        legacyQuantity = quantityInput;
      } else if (
        typeof quantityInput === "object" &&
        "quantity" in quantityInput
      ) {
        // New format: { quantity: number, unit: string }
        legacyQuantity = quantityInput.quantity;
      } else {
        // QuantityDetail format - sum up the detected unit
        const quantityDetail = quantityInput as QuantityDetail;
        legacyQuantity =
          quantityDetail[finalBarcodeType] ||
          quantityDetail.cs + quantityDetail.dsp + quantityDetail.ea ||
          1; // fallback to 1
      }

      success = addOrUpdateItem(product, legacyQuantity, finalBarcodeType);
      usedMultiUnitAPI = false; // ✅ Mark as used Legacy API
    }

    if (success && employee) {
      // ✅ Enhanced logging for different quantity types
      let logMessage = "";
      if (typeof quantityInput === "number") {
        const unitType =
          finalBarcodeType === "cs"
            ? "ลัง"
            : finalBarcodeType === "dsp"
            ? "แพ็ค"
            : "ชิ้น";
        logMessage = `${quantityInput} ${unitType}`;
      } else if (
        typeof quantityInput === "object" &&
        "quantity" in quantityInput
      ) {
        // New format: { quantity: number, unit: string }
        const unitMap = { ea: "ชิ้น", dsp: "แพ็ค", cs: "ลัง" };
        logMessage = `${quantityInput.quantity} ${unitMap[quantityInput.unit]}`;
      } else {
        // ✅ FIXED: QuantityDetail format - use new structure
        const quantityDetail = quantityInput as QuantityDetail;
        const unitMap = { ea: "ชิ้น", dsp: "แพ็ค", cs: "ลัง" };

        // สร้าง log message จาก quantities ที่มีค่า > 0
        const activeParts: string[] = [];
        if (quantityDetail.cs > 0)
          activeParts.push(`${quantityDetail.cs} ${unitMap.cs}`);
        if (quantityDetail.dsp > 0)
          activeParts.push(`${quantityDetail.dsp} ${unitMap.dsp}`);
        if (quantityDetail.ea > 0)
          activeParts.push(`${quantityDetail.ea} ${unitMap.ea}`);

        logMessage = activeParts.join(" + ") || "0 ชิ้น";
      }

      console.log(
        `✅ Added ${logMessage} of ${
          product?.name
        } (${finalBarcodeType.toUpperCase()}) using ${
          usedMultiUnitAPI ? "Multi-Unit" : "Legacy"
        } API`
      );

      // ✅ Log current inventory summary
      console.log("📊 Current inventory summary:", {
        totalItems: summary.totalItems,
        totalCS: summary.quantityBreakdown?.totalCS || 0,
        totalDSP: summary.quantityBreakdown?.totalDSP || 0,
        totalEA: summary.quantityBreakdown?.totalEA || 0,
        itemsWithMultipleUnits:
          summary.quantityBreakdown?.itemsWithMultipleUnits || 0,
      });
    }

    return success;
  };

  // ✅ New handler สำหรับเพิ่มสินค้าใหม่
  const handleAddNewProduct = (barcode: string) => {
    console.log("🆕 Add new product requested for barcode:", barcode);

    // เปิด form และเก็บ barcode
    setNewProductBarcode(barcode);
    setShowAddProductForm(true);
  };

  // ✅ UPDATED: Handler สำหรับบันทึกสินค้าใหม่ - รองรับครบ 3 หน่วย (CS, DSP, EA)
  const handleSaveNewProduct = async (productData: {
    barcode: string;
    productName: string;
    productGroup: string;
    description: string;
    countCs: number;
    countDsp: number; // ✅ เพิ่ม DSP
    countPieces: number;
  }): Promise<boolean> => {
    try {
      console.log(
        "💾 Saving new product with Multi-Unit API (3 units):",
        productData
      );

      // ✅ Validate product group
      if (!isValidProductGroup(productData.productGroup)) {
        console.error("❌ Invalid product group:", productData.productGroup);
        return false;
      }

      // ✅ สร้าง Product object
      const newProduct: Product = {
        id: `NEW_${Date.now()}`, // Material Code ใหม่
        barcode: productData.barcode,
        name: productData.productName,
        brand: "สินค้าใหม่",
        category: getProductCategoryFromGroup(productData.productGroup),
        description: productData.description,
        price: 0,
        status: ProductStatus.ACTIVE,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      console.log("📦 New product object:", newProduct);

      let success = false;

      // ✅ Use new Multi-Unit API for adding quantities
      if (addOrUpdateMultiUnitItem) {
        // เพิ่ม CS ถ้ามี
        if (productData.countCs > 0) {
          const csQuantityInput: QuantityInput = {
            quantity: productData.countCs,
            unit: "cs",
          };

          const csSuccess = addOrUpdateMultiUnitItem(
            newProduct,
            csQuantityInput,
            "cs",
            productData.productGroup
          );

          if (csSuccess) {
            console.log(`✅ Added CS: ${productData.countCs} ลัง`);
            success = true;
          }
        }

        // ✅ เพิ่ม DSP ถ้ามี - ใหม่!
        if (productData.countDsp > 0) {
          const dspQuantityInput: QuantityInput = {
            quantity: productData.countDsp,
            unit: "dsp",
          };

          const dspSuccess = addOrUpdateMultiUnitItem(
            newProduct,
            dspQuantityInput,
            "dsp",
            productData.productGroup
          );

          if (dspSuccess) {
            console.log(`✅ Added DSP: ${productData.countDsp} แพ็ค`);
            success = true;
          }
        }

        // เพิ่ม EA ถ้ามี
        if (productData.countPieces > 0) {
          const eaQuantityInput: QuantityInput = {
            quantity: productData.countPieces,
            unit: "ea",
          };

          const eaSuccess = addOrUpdateMultiUnitItem(
            newProduct,
            eaQuantityInput,
            "ea",
            productData.productGroup
          );

          if (eaSuccess) {
            console.log(`✅ Added EA: ${productData.countPieces} ชิ้น`);
            success = true;
          }
        }
      } else {
        // ✅ FIXED: Fallback to legacy method with correct QuantityDetail structure
        console.log("🔄 Multi-Unit API not available, using legacy method...");

        // ✅ ตรวจสอบว่ามีจำนวนอย่างน้อย 1 หน่วย
        if (
          productData.countCs > 0 ||
          productData.countDsp > 0 ||
          productData.countPieces > 0
        ) {
          const quantityDetail: QuantityDetail = {
            cs: productData.countCs,
            dsp: productData.countDsp, // ✅ เพิ่ม DSP support
            ea: productData.countPieces,
            // ✅ เลือก scannedType ตามลำดับความสำคัญ
            scannedType:
              productData.countCs > 0
                ? "cs"
                : productData.countDsp > 0
                ? "dsp"
                : "ea",
            isManualEdit: true,
            lastModified: new Date().toISOString(),
          };

          // ✅ FIXED: Convert QuantityDetail to number for legacy API
          const legacyQuantity = quantityDetail.scannedType
            ? quantityDetail[quantityDetail.scannedType]
            : quantityDetail.cs + quantityDetail.dsp + quantityDetail.ea;

          success = addOrUpdateItem(
            newProduct,
            legacyQuantity, // ← Send number instead of QuantityDetail
            quantityDetail.scannedType,
            productData.productGroup
          );
        }
      }

      if (success) {
        console.log("✅ New product saved successfully with 3-unit support");
        console.log(`   📦 Product Group: ${productData.productGroup}`);
        console.log(`   📦 CS: ${productData.countCs} ลัง`);
        console.log(`   📦 DSP: ${productData.countDsp} แพ็ค`); // ✅ เพิ่ม log DSP
        console.log(`   🔢 EA: ${productData.countPieces} ชิ้น`);

        // ปิด form
        setShowAddProductForm(false);
        setNewProductBarcode("");

        // ปิด product slide และเริ่มสแกนใหม่
        restartForNextScan();

        return true;
      } else {
        console.warn("⚠️ No quantities to save (all units are 0)"); // ✅ อัปเดต message
        return false;
      }
    } catch (error) {
      console.error("❌ Error saving new product:", error);
      return false;
    }
  };

  // ✅ Handler สำหรับปิด form
  const handleCloseAddProductForm = () => {
    setShowAddProductForm(false);
    setNewProductBarcode("");
  };

  // ✅ FIXED: Handler for updating quantity details with materialCode support
  const handleUpdateItemQuantityDetail = (
    materialCode: string,
    quantityDetail: QuantityDetail
  ): boolean => {
    console.log("🔧 Main page handleUpdateItemQuantityDetail:", {
      materialCode,
      quantityDetail,
      updateItemQuantityDetailExists: !!updateItemQuantityDetail,
    });

    // ✅ Call the actual inventory manager function with materialCode
    if (updateItemQuantityDetail) {
      try {
        const success = updateItemQuantityDetail(materialCode, quantityDetail);

        if (success) {
          console.log("✅ Quantity detail updated successfully");

          // ✅ Log current inventory summary after update
          console.log("📊 Updated inventory summary:", {
            totalItems: summary.totalItems,
            totalCS: summary.quantityBreakdown?.totalCS || 0,
            totalDSP: summary.quantityBreakdown?.totalDSP || 0,
            totalEA: summary.quantityBreakdown?.totalEA || 0,
            itemsWithMultipleUnits:
              summary.quantityBreakdown?.itemsWithMultipleUnits || 0,
          });
        } else {
          console.warn("⚠️ Quantity detail update returned false");
        }

        return success;
      } catch (error) {
        console.error("❌ Error in handleUpdateItemQuantityDetail:", error);
        return false;
      }
    }

    console.error("❌ updateItemQuantityDetail function not available");
    return false;
  };

  // ✅ FIXED: Handle export with real export function - Updated to return Promise<void>
  const handleExportInventory = async (): Promise<void> => {
    if (!employee) {
      console.warn("⚠️ No employee data available for export");
      return;
    }

    console.log("📤 Starting REAL export process...");
    console.log(`👤 Employee: ${employee.employeeName}`);
    console.log(`🏢 Branch: ${employee.branchName} (${employee.branchCode})`);
    console.log(`📦 Inventory items: ${inventory.length}`);

    try {
      // ✅ ใช้ performRealExport แทน exportInventory
      const success = await performRealExport();

      if (success) {
        // Generate filename with employee and branch info
        const now = new Date();
        const dateStr = now.toISOString().split("T")[0];
        const timeStr = now.toTimeString().split(" ")[0].replace(/:/g, "-");
        const fileName = `FN_Stock_Wide_${employee.branchCode}_${dateStr}_${timeStr}.csv`;

        setExportFileName(fileName);
        setShowExportSuccess(true);

        console.log(
          `✅ ${employee.employeeName} exported inventory for ${employee.branchName}`
        );
        console.log(`📁 File generated: ${fileName}`);
      } else {
        console.error("❌ Export failed");
        if (exportError) {
          console.error("❌ Export error:", exportError);
        }
      }
    } catch (error) {
      console.error("❌ Export error:", error);
    }
  };

  // Clear all errors
  const clearAllErrors = () => {
    clearError();
    clearInventoryError();
    setExportError(null); // ✅ เพิ่ม clear export error
  };

  // Show login form if not authenticated
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-xl p-8 shadow-lg">
          <div className="animate-spin w-8 h-8 border-4 border-fn-green border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600 text-center">กำลังโหลดระบบ...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <EmployeeBranchForm onSubmit={handleEmployeeLogin} />;
  }

  // Mobile Full Screen Scanner Mode
  if (isMobile && activeTab === "scanner" && fullScreenMode) {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-900">
        {/* Export Success Toast */}
        <ExportSuccessToast
          show={showExportSuccess}
          onClose={() => setShowExportSuccess(false)}
          fileName={exportFileName}
          itemCount={inventory.length}
        />

        {/* Header - แสดงปกติแม้ในโหมด full screen */}
        <MobileAppHeader
          employeeName={employeeName}
          activeTab={activeTab}
          totalSKUs={summary.totalProducts}
          isStreaming={isStreaming}
          lastDetectedCode={lastDetectedCode}
          totalItems={summary.totalItems}
          onLogout={showLogoutConfirmation}
          onTabChange={setActiveTab}
        />

        {/* Main Content - Full Screen Scanner */}
        <div className="flex-1">
          <MobileScannerLayout
            // Camera props
            videoRef={videoRef}
            canvasRef={canvasRef}
            containerRef={containerRef}
            isStreaming={isStreaming}
            processingQueue={processingQueue}
            detections={detections}
            // Camera actions
            startCamera={startCamera}
            stopCamera={stopCamera}
            switchCamera={switchCamera}
            captureAndProcess={captureAndProcess}
            drawDetections={drawDetections}
            updateCanvasSize={updateCanvasSize}
            // Torch props
            torchOn={torchOn}
            onToggleTorch={toggleTorch}
            // ✅ Updated Product props
            product={product}
            detectedBarcodeType={detectedBarcodeType}
            isLoadingProduct={isLoadingProduct}
            productError={productError}
            lastDetectedCode={lastDetectedCode}
            scannedBarcode={lastDetectedCode}
            // Product actions - ✅ Updated with Multi-Unit API
            onAddToInventory={handleAddToInventory}
            onAddNewProduct={handleAddNewProduct}
            restartForNextScan={restartForNextScan}
            currentInventoryQuantity={currentInventoryQuantity}
            // Layout options
            fullScreen={true}
            showHeader={false}
          />
        </div>

        {/* Logout Confirmation Modal */}
        <LogoutConfirmationModal
          isOpen={isModalOpen}
          onClose={hideLogoutConfirmation}
          onConfirm={confirmLogout}
          employeeName={employeeName}
          branchCode={branchCode}
          branchName={branchName}
          sessionTimeRemaining={formatTimeRemaining()}
          hasUnsavedData={hasUnsaved}
          unsavedDataCount={unsavedDataCount}
        />

        {/* ✅ Add New Product Form */}
        <AddNewProductForm
          isVisible={showAddProductForm}
          barcode={newProductBarcode}
          onClose={handleCloseAddProductForm}
          onSave={handleSaveNewProduct}
        />
      </div>
    );
  }

  // Regular Layout (Desktop or Mobile Inventory)
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* Export Success Toast */}
      <ExportSuccessToast
        show={showExportSuccess}
        onClose={() => setShowExportSuccess(false)}
        fileName={exportFileName}
        itemCount={inventory.length}
      />

      {/* Header - Responsive */}
      {isMobile ? (
        <MobileAppHeader
          employeeName={employeeName}
          activeTab={activeTab}
          totalSKUs={summary.totalProducts}
          isStreaming={isStreaming}
          lastDetectedCode={lastDetectedCode}
          totalItems={summary.totalItems}
          onLogout={showLogoutConfirmation}
          onTabChange={setActiveTab}
        />
      ) : (
        <DesktopAppHeader
          employeeName={employeeName}
          branchCode={branchCode}
          branchName={branchName}
          formatTimeRemaining={formatTimeRemaining}
          activeTab={activeTab}
          totalSKUs={summary.totalProducts}
          isStreaming={isStreaming}
          lastDetectedCode={lastDetectedCode}
          product={product}
          totalItems={summary.totalItems}
          onLogout={showLogoutConfirmation}
          onTabChange={setActiveTab}
        />
      )}

      {/* Main Content */}
      <div className="flex-1">
        {/* Scanner Tab */}
        {activeTab === "scanner" && (
          <>
            {isMobile ? (
              /* Mobile Layout - Regular Scanner with Header (when not in full screen) */
              <MobileScannerLayout
                // Camera props
                videoRef={videoRef}
                canvasRef={canvasRef}
                containerRef={containerRef}
                isStreaming={isStreaming}
                processingQueue={processingQueue}
                detections={detections}
                // Camera actions
                startCamera={startCamera}
                stopCamera={stopCamera}
                switchCamera={switchCamera}
                captureAndProcess={captureAndProcess}
                drawDetections={drawDetections}
                updateCanvasSize={updateCanvasSize}
                // Torch props
                torchOn={torchOn}
                onToggleTorch={toggleTorch}
                // ✅ Updated Product props
                product={product}
                detectedBarcodeType={detectedBarcodeType}
                isLoadingProduct={isLoadingProduct}
                productError={productError}
                lastDetectedCode={lastDetectedCode}
                scannedBarcode={lastDetectedCode}
                // Product actions - ✅ Updated with Multi-Unit API
                onAddToInventory={handleAddToInventory}
                onAddNewProduct={handleAddNewProduct}
                restartForNextScan={restartForNextScan}
                currentInventoryQuantity={currentInventoryQuantity}
                // Layout options
                fullScreen={false}
                showHeader={true}
              />
            ) : (
              /* Desktop Layout - Side by Side */
              <div className="container mx-auto px-4 py-4 sm:py-6">
                {/* Error Display - Desktop Only */}
                {(errors || productError || inventoryError || exportError) && (
                  <div className="mb-4">
                    <ErrorDisplay
                      error={
                        errors ||
                        productError ||
                        inventoryError ||
                        exportError ||
                        ""
                      }
                      onDismiss={clearAllErrors}
                      onRetry={() => {
                        clearAllErrors();
                        if (!isStreaming && activeTab === "scanner")
                          startCamera();
                      }}
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 xl:grid-cols-5 gap-4 lg:gap-6">
                  {/* Camera Section */}
                  <div className="xl:col-span-3">
                    <CameraSection
                      videoRef={videoRef}
                      canvasRef={canvasRef}
                      containerRef={containerRef}
                      isStreaming={isStreaming}
                      processingQueue={processingQueue}
                      detections={detections}
                      startCamera={startCamera}
                      stopCamera={stopCamera}
                      switchCamera={switchCamera}
                      captureAndProcess={captureAndProcess}
                      drawDetections={drawDetections}
                      updateCanvasSize={updateCanvasSize}
                      fullScreen={false}
                      showHeader={true}
                      // Torch props
                      torchOn={torchOn}
                      onToggleTorch={toggleTorch}
                    />
                  </div>

                  {/* Product Info Sidebar */}
                  <div className="xl:col-span-2 space-y-4">
                    <ProductInfoSection
                      product={product}
                      barcode={lastDetectedCode}
                      barcodeType={detectedBarcodeType || undefined}
                      isLoading={isLoadingProduct}
                      error={productError || undefined}
                      currentInventoryQuantity={currentInventoryQuantity}
                      isMobile={false}
                      onAddToInventory={handleAddToInventory} // ✅ Updated with Multi-Unit API
                    />
                  </div>
                </div>

                {/* Quick Stats - Desktop Only */}
                <div className="mt-6">
                  <QuickStats
                    totalProducts={summary.totalProducts}
                    totalItems={summary.totalItems}
                    categories={summary.categories}
                    product={product}
                    currentInventoryQuantity={currentInventoryQuantity}
                  />
                </div>
              </div>
            )}
          </>
        )}

        {/* Inventory Tab */}
        {activeTab === "inventory" && (
          <div
            className={`${
              isMobile ? "px-2 py-3" : "container mx-auto px-4 py-4 sm:py-6"
            }`}
          >
            {/* Error Display for Inventory */}
            {(inventoryError || exportError) && !isMobile && (
              <div className="mb-4">
                <ErrorDisplay
                  error={inventoryError || exportError || ""}
                  onDismiss={() => {
                    clearInventoryError();
                    setExportError(null);
                  }}
                  onRetry={() => {
                    clearInventoryError();
                    setExportError(null);
                  }}
                />
              </div>
            )}

            <div className="space-y-6">
              <InventoryDisplay
                inventory={inventory}
                summary={summary}
                isLoading={isLoadingInventory}
                error={inventoryError || exportError}
                // ✅ FIXED: ใช้ prop names ที่ถูกต้องตาม interface
                onAddOrUpdateItem={addOrUpdateItem}
                onUpdateItemQuantity={updateItemQuantity}
                onUpdateItemQuantityDetail={handleUpdateItemQuantityDetail} // ✅ FIXED: Use wrapper function with materialCode
                onRemoveItem={removeItem}
                onClearInventory={clearInventory}
                onExport={handleExportInventory} // ✅ ใช้ function ที่แก้ไขแล้ว
                onClearError={() => {
                  clearInventoryError();
                  setExportError(null);
                }}
                onSearch={searchItems}
              />
            </div>
          </div>
        )}
      </div>

      {/* Footer - Hidden on mobile */}
      {!isMobile && (
        <AppFooter
          employeeName={employeeName}
          branchName={branchName}
          product={product}
          totalItems={summary.totalItems}
          lastUpdate={summary.lastUpdate}
        />
      )}

      {/* Logout Confirmation Modal */}
      <LogoutConfirmationModal
        isOpen={isModalOpen}
        onClose={hideLogoutConfirmation}
        onConfirm={confirmLogout}
        employeeName={employeeName}
        branchCode={branchCode}
        branchName={branchName}
        sessionTimeRemaining={formatTimeRemaining()}
        hasUnsavedData={hasUnsaved}
        unsavedDataCount={unsavedDataCount}
      />

      {/* ✅ Add New Product Form */}
      <AddNewProductForm
        isVisible={showAddProductForm}
        barcode={newProductBarcode}
        onClose={handleCloseAddProductForm}
        onSave={handleSaveNewProduct}
      />
    </div>
  );
}
