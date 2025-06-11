// src/app/api/products/lookup/route.ts
import { NextRequest, NextResponse } from "next/server";
import { findProductByBarcode } from "@/data/services/productServices";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const barcode = searchParams.get("barcode");

  if (!barcode) {
    return NextResponse.json(
      {
        success: false,
        error: "กรุณาระบุบาร์โค้ด",
      },
      { status: 400 }
    );
  }

  const cleanBarcode = barcode.trim().replace(/[^0-9]/g, "");

  if (cleanBarcode.length === 0) {
    return NextResponse.json(
      {
        success: false,
        error: "บาร์โค้ดไม่ถูกต้อง",
      },
      { status: 400 }
    );
  }

  const debug = {
    originalBarcode: barcode,
    cleanBarcode,
    timestamp: new Date().toISOString(),
  };

  try {
    console.log("🔍 Looking up product for barcode:", cleanBarcode);

    const result = await findProductByBarcode(cleanBarcode);

    if (result?.product) {
      console.log("✅ Product found:", result.product.name);

      return NextResponse.json({
        success: true,
        data: result.product,
        barcodeType: result.barcodeType,
        debug,
      });
    } else {
      console.log("❌ Product not found for barcode:", barcode);

      return NextResponse.json(
        {
          success: false,
          error: `ไม่พบสินค้าที่มี barcode: ${barcode}`,
          debug: {
            ...debug,
            barcodeLength: cleanBarcode.length,
            searchAttempts: [
              "exact_match",
              "last_12_digits",
              "first_12_digits",
              "without_leading_zeros",
              "padded_to_13_digits",
            ],
          },
        },
        { status: 404 }
      );
    }
  } catch (error: any) {
    console.error("💥 Error in product lookup:", error);

    return NextResponse.json(
      {
        success: false,
        error: `เกิดข้อผิดพลาดในการโหลดข้อมูลสินค้า: ${error.message}`,
        debug: {
          error: error.message,
          stack:
            process.env.NODE_ENV === "development" ? error.stack : undefined,
          timestamp: new Date().toISOString(),
        },
      },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function POST(request: NextRequest) {
  return NextResponse.json(
    {
      success: false,
      error: "Method not allowed. Use GET instead.",
    },
    { status: 405 }
  );
}
