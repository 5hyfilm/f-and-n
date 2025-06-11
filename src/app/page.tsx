// src/app/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useBarcodeDetection } from "../hooks/useBarcodeDetection";
import { useInventoryManager } from "../hooks/useInventoryManager";
import { useEmployeeAuth } from "../hooks/useEmployeeAuth";
import {
  EmployeeBranchForm,
  EmployeeInfo,
} from "../components/auth/EmployeeBranchForm";
import { CameraSection } from "../components/CameraSection";
import { InventoryDisplay } from "../components/InventoryDisplay";
import { ErrorDisplay } from "../components/ErrorDisplay";
import { ExportSuccessToast } from "../components/ExportSuccessToast";

// Import new sub-components
import { MobileAppHeader } from "../components/headers/MobileAppHeader";
import { DesktopAppHeader } from "../components/headers/DesktopAppHeader";
import { AppFooter } from "../components/footer/AppFooter";
import { QuickStats } from "../components/stats/QuickStats";
import { ProductInfoSection } from "../components/sections/ProductInfoSection";

export default function BarcodeDetectionPage() {
  const [activeTab, setActiveTab] = useState<"scanner" | "inventory">(
    "scanner"
  );
  const [showExportSuccess, setShowExportSuccess] = useState(false);
  const [exportFileName, setExportFileName] = useState<string>("");
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

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
  } = useBarcodeDetection();

  useEffect(() => {
    console.log("🏷️ Detected Barcode Type:", detectedBarcodeType);
    console.log("📦 Product:", product?.name || "No product");
    console.log("📱 Last Detected Code:", lastDetectedCode);
    console.log("---");
  }, [detectedBarcodeType, product, lastDetectedCode]);

  // Inventory Management with Employee Context
  const {
    inventory,
    isLoading: isLoadingInventory,
    error: inventoryError,
    addOrUpdateItem,
    updateItemQuantity,
    removeItem,
    clearInventory,
    findItemByBarcode,
    searchItems,
    exportInventory,
    clearError: clearInventoryError,
    summary,
  } = useInventoryManager(
    employee
      ? {
          employeeName: employee.employeeName,
          branchCode: employee.branchCode,
          branchName: employee.branchName,
        }
      : undefined
  );

  // Handle employee login
  const handleEmployeeLogin = async (employeeInfo: EmployeeInfo) => {
    try {
      await login(employeeInfo);
      console.log("✅ Employee logged in:", employeeInfo.employeeName);
    } catch (error) {
      console.error("❌ Login failed:", error);
    }
  };

  // Handle logout
  const handleLogout = () => {
    if (isStreaming) {
      stopCamera();
    }
    logout();
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

  // หาจำนวนสินค้าปัจจุบันใน inventory
  const currentInventoryQuantity = React.useMemo(() => {
    if (!lastDetectedCode) return 0;
    const item = findItemByBarcode(lastDetectedCode);
    return item?.quantity || 0;
  }, [lastDetectedCode, findItemByBarcode]);

  // Handle add to inventory with employee info
  const handleAddToInventory = (
    product: any,
    quantity: number,
    barcodeType?: "ea" | "dsp" | "cs"
  ) => {
    const finalBarcodeType = barcodeType || detectedBarcodeType || "ea";

    console.log("🔄 handleAddToInventory called with:");
    console.log("  📦 Product:", product?.name);
    console.log("  🔢 Quantity:", quantity);
    console.log("  🏷️ BarcodeType received:", barcodeType);
    console.log("  🏷️ DetectedBarcodeType:", detectedBarcodeType);
    console.log("  🏷️ Final BarcodeType:", finalBarcodeType);

    const success = addOrUpdateItem(product, quantity, finalBarcodeType);

    if (success && employee) {
      const unitType = finalBarcodeType === "cs" ? "ลัง" : "ชิ้น";
      console.log(
        `✅ Added ${quantity} ${unitType} of ${
          product?.name
        } (${finalBarcodeType.toUpperCase()})`
      );
    }

    return success;
  };

  // Handle export with employee info
  const handleExportInventory = () => {
    if (!employee) return false;

    const success = exportInventory();
    if (success) {
      // Generate filename with employee and branch info
      const now = new Date();
      const dateStr = now.toISOString().split("T")[0];
      const timeStr = now.toTimeString().split(" ")[0].replace(/:/g, "-");
      const fileName = `FN_Stock_${branchCode}_${dateStr}_${timeStr}.csv`;

      setExportFileName(fileName);
      setShowExportSuccess(true);

      console.log(`📤 ${employeeName} exported inventory for ${branchName}`);
    }
    return success;
  };

  // Clear all errors
  const clearAllErrors = () => {
    clearError();
    clearInventoryError();
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
          totalProducts={summary.totalProducts}
          isStreaming={isStreaming}
          lastDetectedCode={lastDetectedCode}
          totalItems={summary.totalItems}
          onLogout={handleLogout}
          onTabChange={setActiveTab}
        />
      ) : (
        <DesktopAppHeader
          employeeName={employeeName}
          branchCode={branchCode}
          branchName={branchName}
          formatTimeRemaining={formatTimeRemaining}
          activeTab={activeTab}
          totalProducts={summary.totalProducts}
          isStreaming={isStreaming}
          lastDetectedCode={lastDetectedCode}
          product={product}
          totalItems={summary.totalItems}
          onLogout={handleLogout}
          onTabChange={setActiveTab}
        />
      )}

      {/* Main Content */}
      <div
        className={`${
          isMobile ? "px-2 py-3" : "container mx-auto px-4 py-4 sm:py-6"
        }`}
      >
        {/* Error Display */}
        {(errors || productError || inventoryError) && (
          <div className="mb-4">
            <ErrorDisplay
              error={errors || productError || inventoryError || ""}
              onDismiss={clearAllErrors}
              onRetry={() => {
                clearAllErrors();
                if (!isStreaming && activeTab === "scanner") startCamera();
              }}
            />
          </div>
        )}

        {/* Scanner Tab */}
        {activeTab === "scanner" && (
          <div
            className={`${
              isMobile
                ? "space-y-3"
                : "grid grid-cols-1 xl:grid-cols-5 gap-4 lg:gap-6"
            }`}
          >
            {/* Camera Section */}
            <div className={isMobile ? "" : "xl:col-span-3"}>
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
              />
            </div>

            {/* Product Info Sidebar */}
            <div className={isMobile ? "" : "xl:col-span-2 space-y-4"}>
              <ProductInfoSection
                product={product}
                barcode={lastDetectedCode}
                barcodeType={detectedBarcodeType || undefined}
                isLoading={isLoadingProduct}
                error={productError || undefined}
                currentInventoryQuantity={currentInventoryQuantity}
                isMobile={isMobile}
                onAddToInventory={handleAddToInventory}
              />
            </div>
          </div>
        )}

        {/* Inventory Tab */}
        {activeTab === "inventory" && (
          <div className="space-y-6">
            <InventoryDisplay
              inventory={inventory}
              summary={summary}
              isLoading={isLoadingInventory}
              error={inventoryError}
              onUpdateQuantity={updateItemQuantity}
              onRemoveItem={removeItem}
              onClearInventory={clearInventory}
              onExportInventory={handleExportInventory}
              onClearError={clearInventoryError}
              onSearch={searchItems}
            />
          </div>
        )}

        {/* Quick Stats - Desktop Only */}
        {activeTab === "scanner" && !isMobile && (
          <QuickStats
            totalProducts={summary.totalProducts}
            totalItems={summary.totalItems}
            categories={summary.categories}
            product={product}
            currentInventoryQuantity={currentInventoryQuantity}
          />
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
    </div>
  );
}
