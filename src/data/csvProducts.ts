// src/data/csvProducts.ts - Fixed CSV Product Data Handler with Fallback
import Papa from "papaparse";
import { Product, ProductCategory, ProductStatus } from "../types/product";
import {
  FALLBACK_PRODUCTS,
  findFallbackProductByBarcode,
  getFallbackStats,
} from "./fallbackProducts";

// CSV Row interface based on the actual CSV structure
interface CSVProductRow {
  Material: string;
  Description: string;
  "Thai Desc.": string;
  "Pack Size": string;
  "Product Group": string;
  "Shelflife (Months)": string;
  "Bar Code EA": string;
  "Bar Code DSP": string;
  "Bar Code CS": string;
}

// Product group to category mapping
const PRODUCT_GROUP_MAPPING: Record<string, ProductCategory> = {
  STM: ProductCategory.BEVERAGES, // Sterilized Milk
  "BB Gold": ProductCategory.BEVERAGES, // Bear Brand Gold
  EVAP: ProductCategory.DAIRY, // Evaporated
  SBC: ProductCategory.DAIRY, // Sweetened Beverage Creamer
  SCM: ProductCategory.DAIRY, // Sweetened Condensed Milk
  "Magnolia UHT": ProductCategory.BEVERAGES, // Magnolia UHT
  NUTRISOY: ProductCategory.BEVERAGES, // Nutriwell
  Gummy: ProductCategory.CONFECTIONERY, // Gummy candy
};

// Brand extraction from description
const extractBrand = (description: string, thaiDesc: string): string => {
  // Extract brand from English description
  if (description.includes("BEAR BRAND") || description.includes("BRBR"))
    return "Bear Brand";
  if (description.includes("CARNATION")) return "Carnation";
  if (description.includes("TEAPOT")) return "Teapot";
  if (description.includes("MAGNOLIA")) return "Magnolia";
  if (description.includes("NUTRIWELL")) return "Nutriwell";
  if (description.includes("HAYOCO")) return "Hayoco";

  // Extract from Thai description
  if (thaiDesc.includes("หมี")) return "Bear Brand";
  if (thaiDesc.includes("คาร์เนชัน")) return "Carnation";
  if (thaiDesc.includes("ทีพอท")) return "Teapot";
  if (thaiDesc.includes("แมกโนเลีย")) return "Magnolia";
  if (thaiDesc.includes("นิวทริเวล")) return "Nutriwell";
  if (thaiDesc.includes("ฮาโยโก้")) return "Hayoco";

  return "F&N";
};

// Clean and format product name
const formatProductName = (thaiDesc: string, description: string): string => {
  // Use Thai description if available, otherwise use English
  const name = thaiDesc || description;

  // Remove common prefixes/suffixes and clean up
  return name
    .replace(/^\d+[xX]\(.*?\)\s*/, "") // Remove pack size prefix like "8X(12X140ml)"
    .replace(/\s+\d+[xX].*$/, "") // Remove pack size suffix
    .replace(/\s*TH\s*$/, "") // Remove TH suffix
    .replace(/\s*FS\s*$/, "") // Remove FS suffix
    .replace(/\s*P12\s*$/, "") // Remove P12 suffix
    .replace(/\s*10B\.\s*$/, "") // Remove 10B. suffix
    .replace(/\s*\(.*?\)\s*$/, "") // Remove parentheses at end
    .trim();
};

// Parse pack size to extract size and unit
const parsePackSize = (packSize: string): { size: string; unit: string } => {
  // Handle different pack size formats
  const cleanSize = packSize.replace(/[xX\(\)]/g, " ").trim();

  // Extract last meaningful part as size
  const parts = cleanSize.split(/\s+/).filter(Boolean);
  const lastPart = parts[parts.length - 1];

  // Extract unit
  let unit = "ชิ้น";
  let size = packSize;

  if (lastPart.includes("ml") || lastPart.includes("Ml")) {
    unit = "มล.";
  } else if (lastPart.includes("g") || lastPart.includes("G")) {
    unit = "ก.";
  } else if (
    lastPart.includes("kg") ||
    lastPart.includes("KG") ||
    lastPart.includes("Kg")
  ) {
    unit = "กก.";
  } else if (lastPart.includes("Ltr") || lastPart.includes("L")) {
    unit = "ลิตร";
  }

  return { size, unit };
};

// Clean barcode
const cleanBarcode = (barcode: string): string => {
  if (!barcode || barcode === "-" || barcode === "nan") return "";
  return barcode.replace(/\s+/g, "").replace(/^0+/, ""); // Remove spaces and leading zeros
};

// Convert CSV row to Product
const csvRowToProduct = (row: CSVProductRow, index: number): Product | null => {
  try {
    const material = row.Material?.trim();
    const description = row.Description?.trim();
    const thaiDesc = row["Thai Desc."]?.trim();
    const packSize = row["Pack Size"]?.trim();
    const productGroup = row["Product Group"]?.trim();
    const barcodeEA = cleanBarcode(row["Bar Code EA"]);

    // Skip rows without essential data
    if (!material || !description || !barcodeEA) {
      console.warn(`Skipping row ${index}: Missing essential data`);
      return null;
    }

    const { size, unit } = parsePackSize(packSize);
    const brand = extractBrand(description, thaiDesc);
    const category =
      PRODUCT_GROUP_MAPPING[productGroup] || ProductCategory.OTHER;
    const shelfLife = parseInt(row["Shelflife (Months)"]) || 12;

    const product: Product = {
      id: material,
      barcode: barcodeEA,
      name: formatProductName(thaiDesc, description),
      name_en: description,
      category,
      brand,
      description: `${description} - ${thaiDesc}`,
      size,
      unit,
      price: undefined, // Not available in CSV
      currency: "THB",
      sku: material,
      nutrition_info: undefined,
      ingredients: undefined,
      allergens: undefined,
      storage_instructions: `อายุการเก็บ ${shelfLife} เดือน`,
      country_of_origin: "ไทย",
      barcode_type:
        barcodeEA.length === 13
          ? "EAN-13"
          : barcodeEA.length === 12
          ? "UPC-A"
          : "Other",
      image_url: undefined,
      status: ProductStatus.ACTIVE,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    return product;
  } catch (error) {
    console.error(`Error processing row ${index}:`, error);
    return null;
  }
};

// Load and parse CSV data
let csvProducts: Product[] = [];
let csvLoaded = false;
let csvLoading = false;

export const loadCSVProducts = async (): Promise<Product[]> => {
  if (csvLoaded && csvProducts.length > 0) {
    console.log("📋 Using cached CSV products:", csvProducts.length);
    return csvProducts;
  }

  if (csvLoading) {
    console.log("⏳ CSV already loading...");
    // Wait for loading to complete with timeout
    const startTime = Date.now();
    while (csvLoading && Date.now() - startTime < 15000) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    if (csvLoading) {
      csvLoading = false;
      throw new Error("CSV loading timeout - took too long to load");
    }

    return csvProducts;
  }

  csvLoading = true;

  try {
    console.log("🔄 Loading CSV product data from file...");

    // Fetch CSV file from public directory with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    let response: Response;
    try {
      response = await fetch("/product_list_csv.csv", {
        signal: controller.signal,
        cache: "no-cache", // Ensure fresh data
      });
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === "AbortError") {
        throw new Error("Failed to fetch CSV: Request timeout");
      }
      throw new Error(`Failed to fetch CSV: ${fetchError.message}`);
    }

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(
        `Failed to fetch CSV: ${response.status} ${response.statusText}`
      );
    }

    let csvText: string;
    try {
      csvText = await response.text();
    } catch (textError) {
      throw new Error("Failed to read CSV file content");
    }

    if (!csvText || csvText.trim().length === 0) {
      throw new Error("CSV file is empty or invalid");
    }

    console.log("📄 CSV file loaded, size:", csvText.length, "characters");

    // Parse CSV using Papa Parse with correct types
    let parseResult: Papa.ParseResult<CSVProductRow>;
    try {
      parseResult = Papa.parse<CSVProductRow>(csvText, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header: string) => header.trim(),
        dynamicTyping: false, // Keep everything as strings for now
      });
    } catch (parseError) {
      throw new Error(`Failed to parse CSV: ${parseError}`);
    }

    // Check for critical parsing errors
    if (parseResult.errors && parseResult.errors.length > 0) {
      const criticalErrors = parseResult.errors.filter(
        (error) => error.type === "Delimiter" || error.type === "Quotes"
      );

      if (criticalErrors.length > 0) {
        console.error("💥 Critical CSV parsing errors:", criticalErrors);
        throw new Error(
          `Critical CSV parsing errors: ${criticalErrors[0].message}`
        );
      }

      console.warn("⚠️ Non-critical CSV parsing warnings:", parseResult.errors);
    }

    if (!parseResult.data || parseResult.data.length === 0) {
      throw new Error(
        "No data returned from CSV parsing - file may be empty or invalid format"
      );
    }

    console.log("📊 CSV parsed successfully:", parseResult.data.length, "rows");

    // Convert CSV rows to Product objects
    const products: Product[] = [];
    let successCount = 0;
    let errorCount = 0;

    parseResult.data.forEach((row, index) => {
      try {
        const product = csvRowToProduct(row, index);
        if (product) {
          products.push(product);
          successCount++;
        } else {
          errorCount++;
        }
      } catch (rowError) {
        console.warn(`Error processing row ${index}:`, rowError);
        errorCount++;
      }
    });

    if (products.length === 0) {
      throw new Error("No valid products could be created from CSV data");
    }

    csvProducts = products;
    csvLoaded = true;
    csvLoading = false;

    console.log(
      `✅ CSV products loaded successfully: ${products.length} products (${successCount} success, ${errorCount} errors)`
    );
    console.log(
      "🏷️ Sample products:",
      products
        .slice(0, 3)
        .map((p) => ({ name: p.name, barcode: p.barcode, brand: p.brand }))
    );

    return products;
  } catch (error: any) {
    csvLoading = false;
    csvLoaded = false;
    csvProducts = [];

    console.error("❌ Error loading CSV products:", error);

    // Re-throw with more specific error message
    if (error.message.includes("fetch")) {
      throw new Error(`Cannot load product data file: ${error.message}`);
    } else if (error.message.includes("parse")) {
      throw new Error(`Product data format error: ${error.message}`);
    } else {
      throw new Error(`Product data loading failed: ${error.message}`);
    }
  }
};

// Helper function to normalize barcode
export const normalizeBarcode = (barcode: string): string => {
  return barcode.trim().replace(/[^0-9]/g, "");
};

// Enhanced barcode matching function
export const findProductByBarcode = async (
  inputBarcode: string
): Promise<Product | undefined> => {
  try {
    const products = await loadCSVProducts();
    const searchBarcode = normalizeBarcode(inputBarcode);

    console.log("🔍 Searching for barcode:", searchBarcode);
    console.log("📋 Total products available:", products.length);

    // Try exact match first
    let product = products.find(
      (product) => normalizeBarcode(product.barcode) === searchBarcode
    );

    // If not found, try partial matches (for different barcode formats)
    if (!product) {
      // Try matching last 12 digits (for 13-digit barcodes)
      if (searchBarcode.length >= 12) {
        const last12 = searchBarcode.slice(-12);
        product = products.find(
          (product) => normalizeBarcode(product.barcode).slice(-12) === last12
        );
      }

      // Try matching first 12 digits (for 14-digit barcodes)
      if (!product && searchBarcode.length >= 12) {
        const first12 = searchBarcode.slice(0, 12);
        product = products.find(
          (product) =>
            normalizeBarcode(product.barcode).slice(0, 12) === first12
        );
      }

      // Try without leading zeros
      if (!product) {
        const withoutLeadingZeros = searchBarcode.replace(/^0+/, "");
        product = products.find(
          (product) =>
            normalizeBarcode(product.barcode).replace(/^0+/, "") ===
            withoutLeadingZeros
        );
      }

      // Try with leading zeros (pad to 13 digits)
      if (!product && searchBarcode.length < 13) {
        const padded = searchBarcode.padStart(13, "0");
        product = products.find(
          (product) => normalizeBarcode(product.barcode) === padded
        );
      }
    }

    if (product) {
      console.log("✅ Product found:", product.name, "Brand:", product.brand);
    } else {
      console.log("❌ No product found for barcode:", searchBarcode);
      console.log(
        "🔍 Available barcodes sample:",
        products.slice(0, 5).map((p) => p.barcode)
      );
    }

    return product;
  } catch (csvError) {
    console.warn("⚠️ CSV loading failed, trying fallback products:", csvError);

    // Use fallback products when CSV fails
    const fallbackProduct = findFallbackProductByBarcode(inputBarcode);

    if (fallbackProduct) {
      console.log("✅ Found in fallback products:", fallbackProduct.name);
    } else {
      console.log("❌ Not found in fallback products either");
    }

    return fallbackProduct;
  }
};

export const searchProducts = async (params: {
  name?: string;
  category?: ProductCategory;
  brand?: string;
  status?: ProductStatus;
}): Promise<Product[]> => {
  const products = await loadCSVProducts();

  return products.filter((product) => {
    if (
      params.name &&
      !product.name.toLowerCase().includes(params.name.toLowerCase()) &&
      !product.name_en?.toLowerCase().includes(params.name.toLowerCase())
    ) {
      return false;
    }
    if (params.category && product.category !== params.category) {
      return false;
    }
    if (params.brand && product.brand !== params.brand) {
      return false;
    }
    if (params.status && product.status !== params.status) {
      return false;
    }
    return true;
  });
};

export const getProductsByCategory = async (
  category: ProductCategory
): Promise<Product[]> => {
  const products = await loadCSVProducts();
  return products.filter((product) => product.category === category);
};

export const getAllBrands = async (): Promise<string[]> => {
  const products = await loadCSVProducts();
  return [...new Set(products.map((product) => product.brand))];
};

export const getProductStats = async () => {
  try {
    const products = await loadCSVProducts();
    const totalProducts = products.length;
    const activeProducts = products.filter(
      (p) => p.status === ProductStatus.ACTIVE
    ).length;
    const categories = [...new Set(products.map((p) => p.category))].length;
    const brands = [...new Set(products.map((p) => p.brand))].length;

    return {
      totalProducts,
      activeProducts,
      categories,
      brands,
    };
  } catch (error) {
    console.warn("⚠️ Using fallback stats due to CSV error:", error);
    return getFallbackStats();
  }
};

// Debug function
export const debugBarcodeMatching = async () => {
  const products = await loadCSVProducts();
  console.log("📊 Barcode Debug Info:");
  products.slice(0, 10).forEach((product, index) => {
    console.log(
      `${index + 1}. ${product.name}: ${product.barcode} (${
        product.barcode.length
      } digits) - ${product.brand}`
    );
  });
};
