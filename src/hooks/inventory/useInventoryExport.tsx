// ./src/hooks/inventory/useInventoryExport.tsx
"use client";

import { useCallback } from "react";
import { InventoryItem, EmployeeContext, ExportConfig } from "./types";

interface UseInventoryExportProps {
  inventory: InventoryItem[];
  employeeContext?: EmployeeContext;
  setError: (error: string | null) => void;
}

const DEFAULT_EXPORT_CONFIG: ExportConfig = {
  includeEmployeeInfo: true,
  includeTimestamp: true,
  includeStats: false, // เปลี่ยนเป็น false เพื่อให้ไฟล์สั้นลง
  csvDelimiter: ",",
  dateFormat: "th-TH",
};

export const useInventoryExport = ({
  inventory,
  employeeContext,
  setError,
}: UseInventoryExportProps) => {
  // Helper function to escape CSV fields
  const escapeCsvField = useCallback((field: string | number): string => {
    if (typeof field === "number") return field.toString();
    if (!field) return "";

    // Convert to string and handle special characters
    const str = field.toString();

    // If field contains comma, double quote, or newline, wrap in quotes and escape internal quotes
    if (
      str.includes(",") ||
      str.includes('"') ||
      str.includes("\n") ||
      str.includes("\r")
    ) {
      return `"${str.replace(/"/g, '""')}"`;
    }

    return str;
  }, []);

  // Generate CSV content
  const generateCSVContent = useCallback(
    (config: ExportConfig = DEFAULT_EXPORT_CONFIG): string => {
      const now = new Date();
      const thaiDate = now.toLocaleDateString(config.dateFormat, {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
      const thaiTime = now.toLocaleTimeString(config.dateFormat, {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });

      const branchCode = employeeContext?.branchCode || "XXX";
      const branchName = employeeContext?.branchName || "ไม่ระบุสาขา";

      const csvRows: string[] = [];

      // Header section
      if (config.includeTimestamp) {
        csvRows.push(
          escapeCsvField(
            `สถานะคลังล่าสุด ${thaiDate} ${thaiTime} สำหรับ ${branchCode} - ${branchName}`
          )
        );
      }

      if (config.includeEmployeeInfo && employeeContext) {
        csvRows.push(
          `ตรวจนับโดย,${escapeCsvField(employeeContext.employeeName)}`
        );
      }

      // เว้น 1 row
      csvRows.push("");

      // Column headers
      const headers = [
        "F/FG",
        "Prod. Gr.",
        "รายละเอียด",
        "นับจริง (cs)",
        "นับจริง (ชิ้น)",
      ];
      csvRows.push(headers.map((header) => escapeCsvField(header)).join(","));

      // จัดกลุ่มข้อมูลตาม material code และ product group
      const groupedData = new Map<
        string,
        {
          materialCode: string;
          productGroup: string;
          thaiDescription: string;
          csCount: number;
          pieceCount: number;
          // ✅ เก็บ materialCode ของแต่ละประเภทตามลำดับความสำคัญ
          csMaterialCode?: string; // รหัสของ CS (ลัง)
          dspMaterialCode?: string; // รหัสของ DSP (แพ็ค)
          eaMaterialCode?: string; // รหัสของ EA (ชิ้น)
        }
      >();

      inventory.forEach((item) => {
        console.log("📤 Exporting item:", {
          name: item.productName,
          barcodeType: item.barcodeType,
          quantity: item.quantity,
          quantityDetail: item.quantityDetail,
          materialCode: item.materialCode,
        });

        const key = `${item.materialCode}_${item.productGroup}`;
        const existing = groupedData.get(key);

        // ✅ Enhanced logic สำหรับ quantityDetail (Phase 2)
        let csToAdd = 0;
        let piecesToAdd = 0;
        let itemType: "cs" | "dsp" | "ea" = "ea";

        if (item.quantityDetail) {
          // ใช้ quantityDetail จาก Phase 2
          const { major, remainder, scannedType } = item.quantityDetail;
          itemType = scannedType;

          if (scannedType === "dsp" || scannedType === "cs") {
            csToAdd = major; // major ไปใน CS column
            piecesToAdd = remainder; // ✅ เศษไปใน ชิ้น column
            console.log(
              `  📦 Adding to CS count (${scannedType}): ${major}, remainder pieces: ${remainder}`
            );
          } else if (scannedType === "ea") {
            csToAdd = 0;
            piecesToAdd = major + remainder; // EA รวมทั้งหมดไปใน ชิ้น column
            console.log(
              `  🔢 Adding to piece count (ea): ${major + remainder}`
            );
          }
        } else {
          // Fallback สำหรับข้อมูลเก่าที่ไม่มี quantityDetail
          itemType = (item.barcodeType as "cs" | "dsp" | "ea") || "ea";

          if (item.barcodeType === "dsp" || item.barcodeType === "cs") {
            csToAdd = item.quantity;
            piecesToAdd = 0;
            console.log(
              `  📦 Adding to CS count (${item.barcodeType}): ${item.quantity}`
            );
          } else if (item.barcodeType === "ea") {
            csToAdd = 0;
            piecesToAdd = item.quantity;
            console.log(`  🔢 Adding to piece count (ea): ${item.quantity}`);
          }
        }

        if (existing) {
          existing.csCount += csToAdd;
          existing.pieceCount += piecesToAdd;

          // ✅ อัปเดต materialCode ตามประเภทที่เพิ่มเข้ามา
          if (itemType === "cs" && csToAdd > 0) {
            existing.csMaterialCode = item.materialCode;
          } else if (itemType === "dsp" && csToAdd > 0) {
            existing.dspMaterialCode = item.materialCode;
          } else if (itemType === "ea" && piecesToAdd > 0) {
            existing.eaMaterialCode = item.materialCode;
          }
        } else {
          groupedData.set(key, {
            materialCode: item.materialCode || "",
            productGroup: item.productGroup || "",
            thaiDescription: item.thaiDescription || item.productName,
            csCount: csToAdd,
            pieceCount: piecesToAdd,
            // ✅ เก็บ materialCode ตามประเภท
            csMaterialCode:
              itemType === "cs" && csToAdd > 0 ? item.materialCode : undefined,
            dspMaterialCode:
              itemType === "dsp" && csToAdd > 0 ? item.materialCode : undefined,
            eaMaterialCode:
              itemType === "ea" && piecesToAdd > 0
                ? item.materialCode
                : undefined,
          });
        }
      });

      // เพิ่มข้อมูลแต่ละ row
      Array.from(groupedData.values()).forEach((group) => {
        // ✅ เลือก materialCode ของหน่วยใหญ่สุดที่มีจำนวน
        let displayMaterialCode = group.materialCode; // fallback

        if (group.csCount > 0 && group.csMaterialCode) {
          displayMaterialCode = group.csMaterialCode; // CS มีความสำคัญสูงสุด
        } else if (group.csCount > 0 && group.dspMaterialCode) {
          displayMaterialCode = group.dspMaterialCode; // DSP รองลงมา (ในกรณี DSP ไปใน CS column)
        } else if (group.pieceCount > 0 && group.eaMaterialCode) {
          displayMaterialCode = group.eaMaterialCode; // EA สำหรับชิ้น
        }

        console.log(
          `📝 Exporting row: ${displayMaterialCode} - CS:${group.csCount}, Pieces:${group.pieceCount}`
        );

        const row = [
          escapeCsvField(displayMaterialCode), // ✅ ใช้ materialCode ของหน่วยใหญ่สุด
          escapeCsvField(group.productGroup),
          escapeCsvField(group.thaiDescription),
          group.csCount > 0 ? group.csCount.toString() : "",
          group.pieceCount > 0 ? group.pieceCount.toString() : "",
        ];

        csvRows.push(row.join(","));
      });

      return csvRows.join("\n");
    },
    [inventory, employeeContext, escapeCsvField]
  );

  // Generate filename
  const generateFileName = useCallback((): string => {
    const now = new Date();
    const dateStr = now.toISOString().split("T")[0]; // YYYY-MM-DD
    const timeStr = now.toTimeString().split(" ")[0].replace(/:/g, "-"); // HH-MM-SS

    let fileName = `inventory_${dateStr}_${timeStr}`;

    if (employeeContext) {
      fileName += `_${employeeContext.branchCode}`;
    }

    return `${fileName}.csv`;
  }, [employeeContext]);

  // Download CSV file
  const downloadCSV = useCallback(
    (csvContent: string, fileName: string): boolean => {
      try {
        // Add BOM for proper Unicode handling in Excel
        const BOM = "\uFEFF";
        const blob = new Blob([BOM + csvContent], {
          type: "text/csv;charset=utf-8;",
        });

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = fileName;
        link.style.display = "none";

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        URL.revokeObjectURL(url);
        return true;
      } catch (error: unknown) {
        console.error("❌ Error downloading CSV:", error);
        setError("เกิดข้อผิดพลาดในการดาวน์โหลดไฟล์");
        return false;
      }
    },
    [setError]
  );

  // Main export function
  const exportInventory = useCallback(
    (config: ExportConfig = DEFAULT_EXPORT_CONFIG): boolean => {
      try {
        if (inventory.length === 0) {
          setError("ไม่มีข้อมูลสินค้าให้ส่งออก");
          return false;
        }

        setError(null);

        const csvContent = generateCSVContent(config);
        const fileName = generateFileName();

        const success = downloadCSV(csvContent, fileName);

        if (success) {
          console.log(
            "📤 Exported inventory data as CSV:",
            inventory.length,
            "items by",
            employeeContext?.employeeName
          );
        }

        return success;
      } catch (error: unknown) {
        console.error("❌ Error exporting inventory:", error);
        setError("เกิดข้อผิดพลาดในการส่งออกข้อมูล");
        return false;
      }
    },
    [
      inventory,
      employeeContext,
      generateCSVContent,
      generateFileName,
      downloadCSV,
      setError,
    ]
  );

  // Export as JSON (for backup purposes)
  const exportAsJSON = useCallback((): boolean => {
    try {
      if (inventory.length === 0) {
        setError("ไม่มีข้อมูลสินค้าให้ส่งออก");
        return false;
      }

      const exportData = {
        metadata: {
          exportedAt: new Date().toISOString(),
          exportedBy: employeeContext?.employeeName,
          branchCode: employeeContext?.branchCode,
          branchName: employeeContext?.branchName,
          totalItems: inventory.length,
          version: "1.1",
        },
        inventory: inventory,
      };

      const jsonContent = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonContent], { type: "application/json" });

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      const fileName = generateFileName().replace(".csv", ".json");
      link.href = url;
      link.download = fileName;
      link.click();

      URL.revokeObjectURL(url);

      console.log("📤 Exported inventory as JSON:", inventory.length, "items");
      return true;
    } catch (error: unknown) {
      console.error("❌ Error exporting JSON:", error);
      setError("เกิดข้อผิดพลาดในการส่งออก JSON");
      return false;
    }
  }, [inventory, employeeContext, generateFileName, setError]);

  // Preview export data (for UI)
  const previewExportData = useCallback(
    (maxRows: number = 10) => {
      const csvContent = generateCSVContent();
      const rows = csvContent.split("\n");

      return {
        totalRows: rows.length,
        previewRows: rows.slice(0, maxRows),
        estimatedFileSize: new Blob([csvContent]).size,
        fileName: generateFileName(),
      };
    },
    [generateCSVContent, generateFileName]
  );

  // ✅ **CRITICAL FIX: Return the export functions (ที่หายไป)**
  return {
    // Main export functions
    exportInventory,
    exportAsJSON,

    // Utility functions
    generateCSVContent,
    generateFileName,
    previewExportData,

    // Helper functions
    downloadCSV,
    escapeCsvField,
  };
};
