// src/app/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import {
  Camera,
  Sparkles,
  Package,
  Info,
  Archive,
  BarChart3,
} from "lucide-react";
import Image from "next/image";
import { useBarcodeDetection } from "../hooks/useBarcodeDetection";
import { useInventoryManager } from "../hooks/useInventoryManager";
import { CameraSection } from "../components/CameraSection";
import { ProductInfo } from "../components/ProductInfo";
import { InventoryDisplay } from "../components/InventoryDisplay";
import { ErrorDisplay } from "../components/ErrorDisplay";
import { ExportSuccessToast } from "../components/ExportSuccessToast";

export default function BarcodeDetectionPage() {
  const [activeTab, setActiveTab] = useState<"scanner" | "inventory">(
    "scanner"
  );
  const [showExportSuccess, setShowExportSuccess] = useState(false);
  const [exportFileName, setExportFileName] = useState<string>("");

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
  } = useInventoryManager();

  // ประมวลผลอัตโนมัติ Real-time
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isStreaming && activeTab === "scanner") {
      interval = setInterval(() => {
        captureAndProcess();
      }, 300);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isStreaming, activeTab, captureAndProcess]);

  // หาจำนวนสินค้าปัจจุบันใน inventory
  const currentInventoryQuantity = React.useMemo(() => {
    if (!lastDetectedCode) return 0;
    const item = findItemByBarcode(lastDetectedCode);
    return item?.quantity || 0;
  }, [lastDetectedCode, findItemByBarcode]);

  // Handle add to inventory
  const handleAddToInventory = (product: any, quantity: number) => {
    return addOrUpdateItem(product, quantity);
  };

  // Handle export with success notification
  const handleExportInventory = () => {
    const success = exportInventory();
    if (success) {
      // Generate filename for display
      const now = new Date();
      const dateStr = now.toISOString().split("T")[0];
      const timeStr = now.toTimeString().split(" ")[0].replace(/:/g, "-");
      const fileName = `FN_Stock_Inventory_${dateStr}_${timeStr}.csv`;

      setExportFileName(fileName);
      setShowExportSuccess(true);
    }
    return success;
  };

  // Clear all errors
  const clearAllErrors = () => {
    clearError();
    clearInventoryError();
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* Export Success Toast */}
      <ExportSuccessToast
        show={showExportSuccess}
        onClose={() => setShowExportSuccess(false)}
        fileName={exportFileName}
        itemCount={inventory.length}
      />

      {/* Header */}
      <div className="bg-white/95 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-center mb-4">
            <div className="flex items-center gap-3">
              {/* F&N Logo */}
              <div className="bg-gray-100 backdrop-blur-sm rounded-xl p-2 border border-gray-300 shadow-sm">
                <Image
                  src="/fn-logo.png"
                  alt="F&N Logo"
                  width={48}
                  height={48}
                  className="w-12 h-12 object-contain"
                  priority
                />
              </div>

              {/* Title Section */}
              <div className="text-center">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold flex items-center justify-center gap-2 sm:gap-3">
                  <span className="fn-gradient-text">
                    ระบบเช็ค Stock สินค้า
                  </span>
                  <Sparkles className="fn-red" size={20} />
                </h1>
                <p className="text-gray-600 text-sm mt-2">
                  F&N Inventory Tracking & Stock Management System
                </p>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex justify-center">
            <div className="bg-gray-100 rounded-lg p-1 flex">
              <button
                onClick={() => setActiveTab("scanner")}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                  activeTab === "scanner"
                    ? "bg-white text-fn-green shadow-sm"
                    : "text-gray-600 hover:text-gray-800"
                }`}
              >
                <Camera size={16} />
                สแกนสินค้า
              </button>
              <button
                onClick={() => setActiveTab("inventory")}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                  activeTab === "inventory"
                    ? "bg-white text-fn-green shadow-sm"
                    : "text-gray-600 hover:text-gray-800"
                }`}
              >
                <Archive size={16} />
                จัดการ Stock
                {summary.totalProducts > 0 && (
                  <span className="bg-fn-green text-white text-xs px-2 py-0.5 rounded-full min-w-[20px] text-center">
                    {summary.totalProducts}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Status Bar */}
          <div className="flex items-center justify-center gap-4 text-xs text-gray-600 mt-3">
            <div className="flex items-center gap-1">
              <div
                className={`w-2 h-2 rounded-full ${
                  isStreaming ? "bg-green-500" : "bg-red-500"
                }`}
              ></div>
              <span>{isStreaming ? "กล้องทำงาน" : "กล้องหยุด"}</span>
            </div>

            {lastDetectedCode && (
              <div className="flex items-center gap-1">
                <Package size={12} className="fn-green" />
                <span>สแกนล่าสุด: {lastDetectedCode.substring(0, 8)}...</span>
              </div>
            )}

            {product && (
              <div className="flex items-center gap-1">
                <Info size={12} className="text-blue-500" />
                <span className="text-blue-600 font-medium">
                  {product.name}
                </span>
              </div>
            )}

            {summary.totalItems > 0 && (
              <div className="flex items-center gap-1">
                <BarChart3 size={12} className="text-purple-500" />
                <span className="text-purple-600 font-medium">
                  Stock: {summary.totalItems} ชิ้น
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-4 sm:py-6">
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
              />
            </div>

            {/* Product Info Sidebar */}
            <div className="xl:col-span-2 space-y-4">
              <div>
                <div className="mb-3 flex items-center gap-2">
                  <Package className="fn-green" size={20} />
                  <h3 className="text-lg font-semibold text-gray-900">
                    ข้อมูลสินค้า
                  </h3>
                  {isLoadingProduct && (
                    <div className="animate-spin w-4 h-4 border-2 border-fn-green border-t-transparent rounded-full"></div>
                  )}
                </div>

                <ProductInfo
                  product={product}
                  barcode={lastDetectedCode}
                  isLoading={isLoadingProduct}
                  error={productError || undefined}
                  onAddToInventory={handleAddToInventory}
                  currentInventoryQuantity={currentInventoryQuantity}
                />
              </div>
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
        {activeTab === "scanner" && (
          <div className="hidden xl:block mt-6">
            <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
              <div className="grid grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold fn-green">
                    {summary.totalProducts}
                  </div>
                  <div className="text-xs text-gray-600">รายการใน Stock</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-600">
                    {summary.totalItems}
                  </div>
                  <div className="text-xs text-gray-600">จำนวนรวม</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-600">
                    {Object.keys(summary.categories).length}
                  </div>
                  <div className="text-xs text-gray-600">หมวดหมู่</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-orange-600">
                    {product && currentInventoryQuantity > 0 ? "📦" : "⏳"}
                  </div>
                  <div className="text-xs text-gray-600">
                    {product && currentInventoryQuantity > 0
                      ? "มีใน Stock"
                      : product
                      ? "ไม่มีใน Stock"
                      : "รอสแกน"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Mobile Tips */}
        <div className="xl:hidden mt-6 bg-white rounded-lg p-4 text-center border border-gray-200 shadow-sm">
          <p className="text-gray-700 text-sm mb-2">💡 เคล็ดลับการใช้งาน</p>
          <div className="text-xs text-gray-500 space-y-1">
            {activeTab === "scanner" ? (
              <>
                <p>• สแกนบาร์โค้ดเพื่อดูข้อมูลสินค้าและเพิ่มเข้า Stock</p>
                <p>• ใช้ในแนวนอนเพื่อประสบการณ์ที่ดีที่สุด</p>
                <p>• วางบาร์โค้ดให้อยู่ตรงกลางหน้าจอ</p>
                <p>• ระบบจะแสดงข้อมูลสินค้าอัตโนมัติเมื่อสแกนสำเร็จ</p>
              </>
            ) : (
              <>
                <p>• ดูรายการสินค้าทั้งหมดใน Stock</p>
                <p>• แก้ไขจำนวนสินค้าได้ตลอดเวลา</p>
                <p>• ส่งออกข้อมูลเป็นไฟล์ CSV (เปิดใน Excel ได้)</p>
                <p>• ใช้ตัวกรองเพื่อค้นหาสินค้าได้ง่าย</p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-white/80 border-t border-gray-200 mt-8 shadow-sm">
        <div className="container mx-auto px-4 py-4 text-center">
          <p className="text-xs sm:text-sm text-gray-600">
            F&N Stock Management System | ระบบเช็ค Stock และจัดการสินค้า |
            <span className="fn-green font-medium">
              {" "}
              พัฒนาด้วย Next.js & CSV Export
            </span>
          </p>
          <div className="flex justify-center items-center gap-4 mt-2 text-xs text-gray-500">
            {product && (
              <span>
                🎯 สินค้าล่าสุด: {product.name} ({product.brand})
              </span>
            )}
            {summary.totalItems > 0 && (
              <span>📦 รวม Stock: {summary.totalItems} ชิ้น</span>
            )}
            {summary.lastUpdate && (
              <span>
                🕒 อัพเดต:{" "}
                {new Date(summary.lastUpdate).toLocaleDateString("th-TH")}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
