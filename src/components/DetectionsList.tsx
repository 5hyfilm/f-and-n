"use client";

import React from "react";
import { QrCode, Copy, CheckCircle, Search } from "lucide-react";

interface DetectionsListProps {
  lastDetectedCode: string;
}

export const DetectionsList: React.FC<DetectionsListProps> = ({
  lastDetectedCode,
}) => {
  const [copied, setCopied] = React.useState(false);

  const copyToClipboard = async () => {
    if (!lastDetectedCode) return;

    try {
      await navigator.clipboard.writeText(lastDetectedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = lastDetectedCode;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl p-4 lg:p-6 shadow-2xl border border-gray-700">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <QrCode className="text-blue-400" size={20} />
        ผลลัพธ์การสแกน
      </h3>

      {lastDetectedCode ? (
        <div className="space-y-4">
          {/* Code Display */}
          <div
            className="bg-gradient-to-r from-green-900 to-green-800 border border-green-500/50 rounded-lg p-4 cursor-pointer hover:from-green-800 hover:to-green-700 transition-all duration-200"
            onClick={copyToClipboard}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-green-400 text-sm font-medium">
                🎯 Barcode Data
              </span>
              <div className="flex items-center gap-1 text-xs text-green-300">
                {copied ? (
                  <>
                    <CheckCircle size={12} />
                    คัดลอกแล้ว!
                  </>
                ) : (
                  <>
                    <Copy size={12} />
                    คลิกเพื่อคัดลอก
                  </>
                )}
              </div>
            </div>

            <code className="text-green-300 text-sm lg:text-base font-mono break-all block leading-relaxed bg-black/30 rounded p-2">
              {lastDetectedCode}
            </code>

            <div className="mt-2 text-xs text-green-400 opacity-70">
              {lastDetectedCode.length} ตัวอักษร
            </div>
          </div>

          {/* Success Indicator */}
          <div className="bg-green-600/20 border border-green-500/30 rounded-lg p-3 text-center">
            <div className="text-green-400 text-sm font-medium mb-1">
              ✅ สแกนสำเร็จ
            </div>
            <div className="text-xs text-green-300">
              ระบบพบและอ่านบาร์โค้ดได้แล้ว
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <div className="bg-gray-700/50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-3">
            <Search className="text-gray-500" size={32} />
          </div>
          <p className="text-gray-400 text-sm lg:text-base mb-1">
            ยังไม่พบบาร์โค้ด
          </p>
          <p className="text-gray-500 text-xs">
            วางบาร์โค้ดในกรอบกล้องเพื่อเริ่มสแกน
          </p>
        </div>
      )}
    </div>
  );
};
