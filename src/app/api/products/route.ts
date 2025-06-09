// src/app/api/products/route.ts - Updated to use CSV
import { NextRequest, NextResponse } from "next/server";
import {
  loadCSVProducts,
  searchProducts,
  getProductStats,
} from "@/data/csvProducts";
import { ProductCategory, ProductStatus } from "@/types/product";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Get query parameters
    const name = searchParams.get("name");
    const category = searchParams.get("category") as ProductCategory;
    const brand = searchParams.get("brand");
    const status = searchParams.get("status") as ProductStatus;
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    console.log("🔍 Product search request:", {
      name,
      category,
      brand,
      status,
      limit,
      offset,
    });

    // Load CSV products first
    await loadCSVProducts();

    // Search products
    const filteredProducts = await searchProducts({
      name: name || undefined,
      category,
      brand: brand || undefined,
      status,
    });

    // Apply pagination
    const paginatedProducts = filteredProducts.slice(offset, offset + limit);

    console.log(
      `📋 Found ${filteredProducts.length} products, returning ${paginatedProducts.length}`
    );

    return NextResponse.json({
      success: true,
      data: paginatedProducts,
      total: filteredProducts.length,
      stats: await getProductStats(),
    });
  } catch (error: any) {
    console.error("Error fetching products:", error);
    return NextResponse.json(
      {
        success: false,
        error: `เกิดข้อผิดพลาดในการดึงข้อมูลสินค้า: ${error.message}`,
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const productData = await request.json();

    // Validate required fields
    if (!productData.barcode || !productData.name || !productData.brand) {
      return NextResponse.json(
        {
          success: false,
          error: "ข้อมูลไม่ครบถ้วน: ต้องมี barcode, name, และ brand",
        },
        { status: 400 }
      );
    }

    // Load CSV products to check for existing barcode
    const existingProducts = await loadCSVProducts();
    const existingProduct = existingProducts.find(
      (p) => p.barcode === productData.barcode
    );

    if (existingProduct) {
      return NextResponse.json(
        {
          success: false,
          error: "Barcode นี้มีอยู่ในระบบแล้ว",
        },
        { status: 409 }
      );
    }

    // Create new product (in real app, save to database/CSV)
    const newProduct = {
      id: Date.now().toString(),
      ...productData,
      status: productData.status || ProductStatus.ACTIVE,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // In real app: save to CSV/database
    console.log("📝 New product would be saved:", newProduct);

    return NextResponse.json({
      success: true,
      data: newProduct,
      message: "เพิ่มสินค้าใหม่เรียบร้อยแล้ว (สำหรับ demo เท่านั้น)",
    });
  } catch (error: any) {
    console.error("Error creating product:", error);
    return NextResponse.json(
      {
        success: false,
        error: `เกิดข้อผิดพลาดในการเพิ่มสินค้า: ${error.message}`,
      },
      { status: 500 }
    );
  }
}
