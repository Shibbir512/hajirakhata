import React from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  CertificatePadSettings,
  CertificateTemplateStyle,
  CertificateType,
} from "../../types";
import { CERTIFICATE_TYPE_META } from "../../utils/certificateTemplates";
import { toBengaliDate, toBengaliNumber } from "../../utils/dateFormatter";

export interface CertificateFrameProps {
  certificateType: CertificateType;
  templateStyle: CertificateTemplateStyle;
  memoNumber: string;
  issueDate: string;
  studentName: string;
  fatherName: string;
  motherName?: string;
  address?: string;
  roll: string | number;
  studentUid?: string;
  className: string;
  academicYear: string;
  customTitle?: string;
  customBody: string;
  padSettings: CertificatePadSettings;
  orgName: string;
  issuedByName?: string;
}

const CornerOrnament: React.FC<{
  color: string;
  position: "tl" | "tr" | "bl" | "br";
}> = ({ color, position }) => {
  const rotateMap = {
    tl: "rotate(0deg)",
    tr: "rotate(90deg)",
    br: "rotate(180deg)",
    bl: "rotate(270deg)",
  };
  const posStyle: React.CSSProperties = {
    position: "absolute",
    width: "44px",
    height: "44px",
    transform: rotateMap[position],
    ...(position === "tl" ? { top: "10px", left: "10px" } : {}),
    ...(position === "tr" ? { top: "10px", right: "10px" } : {}),
    ...(position === "bl" ? { bottom: "10px", left: "10px" } : {}),
    ...(position === "br" ? { bottom: "10px", right: "10px" } : {}),
  };

  return (
    <svg viewBox="0 0 48 48" fill="none" style={posStyle} aria-hidden="true">
      <path d="M2 22V2H22" stroke={color} strokeWidth="2.5" />
      <path d="M8 22V8H22" stroke={color} strokeWidth="1.2" />
      <circle cx="8" cy="8" r="2.5" fill={color} />
    </svg>
  );
};

export const CertificateFrame: React.FC<CertificateFrameProps> = ({
  certificateType,
  templateStyle,
  memoNumber,
  issueDate,
  studentName,
  fatherName,
  motherName,
  address,
  roll,
  studentUid,
  className,
  academicYear,
  customTitle,
  customBody,
  padSettings,
  orgName,
  issuedByName,
}) => {
  const meta = CERTIFICATE_TYPE_META[certificateType];
  const displayOrgName = padSettings.orgNameBn?.trim() || orgName || "প্রতিষ্ঠানের নাম";
  const displayTitle = customTitle?.trim() || meta.titleBn;
  const displayDate = issueDate ? toBengaliDate(issueDate) : "";

  const isClassic = templateStyle === "classic";
  const isRoyal = templateStyle === "royal";
  const isMinimal = templateStyle === "minimal";

  const primaryColor = isRoyal ? "#1E3A8A" : "#0F5C7A";
  const accentColor = isRoyal ? "#B45309" : isClassic ? "#B45309" : "#0D9488";
  const paperBg = isClassic ? "#FFFDF8" : "#FFFFFF";

  const qrPayload = JSON.stringify({
    org: displayOrgName,
    type: meta.titleBn,
    memo: memoNumber,
    student: studentName,
    roll: String(roll || ""),
    class: className,
    date: issueDate,
  });

  const paragraphs = (customBody || "")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <div
      data-keep-light="true"
      data-print="true"
      className="a4-page certificate-paper"
      style={{
        width: "794px",
        minHeight: "1123px",
        backgroundColor: paperBg,
        color: "#0F172A",
        padding: isMinimal ? "40px" : "28px",
        boxSizing: "border-box",
        position: "relative",
        fontFamily: '"Noto Sans Bengali", "Noto Sans Arabic", "Hind Siliguri", "Google Sans", sans-serif',
        WebkitPrintColorAdjust: "exact",
        printColorAdjust: "exact",
      }}
    >
      {/* Outer Ornamental Frame */}
      <div
        style={{
          minHeight: isMinimal ? "1043px" : "1067px",
          border: isMinimal
            ? "1.5px solid #CBD5E1"
            : `3px solid ${primaryColor}`,
          padding: isMinimal ? "0px" : "7px",
          boxSizing: "border-box",
          position: "relative",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Inner Frame */}
        <div
          style={{
            flex: 1,
            border: isMinimal ? "none" : `1.5px solid ${accentColor}`,
            padding: isMinimal ? "36px 40px 32px 40px" : "34px 40px 30px 40px",
            boxSizing: "border-box",
            position: "relative",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          {/* Corner Ornaments for Classic & Royal */}
          {!isMinimal && (
            <>
              <CornerOrnament color={accentColor} position="tl" />
              <CornerOrnament color={accentColor} position="tr" />
              <CornerOrnament color={accentColor} position="bl" />
              <CornerOrnament color={accentColor} position="br" />
            </>
          )}

          {/* Watermark (Subtle centered institutional seal) */}
          {padSettings.showWatermark !== false && (
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                pointerEvents: "none",
                zIndex: 0,
              }}
            >
              {padSettings.logoUrl ? (
                <img
                  src={padSettings.logoUrl}
                  alt=""
                  crossOrigin="anonymous"
                  style={{
                    width: "320px",
                    height: "320px",
                    objectFit: "contain",
                    opacity: 0.045,
                    filter: "grayscale(30%)",
                  }}
                />
              ) : (
                <div
                  style={{
                    fontSize: "64px",
                    fontWeight: 800,
                    color: primaryColor,
                    opacity: 0.04,
                    transform: "rotate(-24deg)",
                    textAlign: "center",
                    lineHeight: 1.2,
                  }}
                >
                  {displayOrgName}
                </div>
              )}
            </div>
          )}

          {/* TOP HEADER + BODY */}
          <div style={{ position: "relative", zIndex: 1 }}>
            {/* Bismillah Header */}
            {padSettings.showBismillah !== false && (
              <div
                style={{
                  textAlign: "center",
                  marginBottom: "10px",
                }}
              >
                <div
                  dir="rtl"
                  lang="ar"
                  style={{
                    fontSize: "20px",
                    fontWeight: 700,
                    lineHeight: 1.8,
                    color: primaryColor,
                    fontFamily: '"Noto Sans Arabic", "Noto Naskh Arabic", "Amiri", sans-serif',
                    letterSpacing: "0",
                    fontFeatureSettings: '"liga" 1, "calt" 1, "ccmp" 1, "mark" 1, "mkmk" 1, "kern" 1',
                    unicodeBidi: "isolate",
                  }}
                >
                  بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
                </div>
                <div
                  style={{
                    fontSize: "11px",
                    color: "#475569",
                    marginTop: "1px",
                    letterSpacing: "normal",
                  }}
                >
                  বিসমিল্লাহির রাহমানির রাহিম
                </div>
              </div>
            )}

            {/* Organization Letterhead */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "18px",
                paddingBottom: "16px",
                borderBottom: `2px solid ${primaryColor}`,
                position: "relative",
              }}
            >
              {padSettings.logoUrl && (
                <div
                  style={{
                    width: "72px",
                    height: "72px",
                    borderRadius: "50%",
                    border: `1.5px solid ${accentColor}`,
                    padding: "4px",
                    backgroundColor: "#FFFFFF",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <img
                    src={padSettings.logoUrl}
                    alt={displayOrgName}
                    crossOrigin="anonymous"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                      borderRadius: "50%",
                    }}
                  />
                </div>
              )}

              <div style={{ textAlign: "center", flex: 1 }}>
                <h1
                  style={{
                    fontSize: "26px",
                    fontWeight: 700,
                    color: primaryColor,
                    margin: 0,
                    lineHeight: 1.3,
                    letterSpacing: "normal",
                  }}
                >
                  {displayOrgName}
                </h1>

                {padSettings.address && (
                  <p
                    style={{
                      fontSize: "13px",
                      color: "#334155",
                      margin: "5px 0 0 0",
                      fontWeight: 500,
                    }}
                  >
                    {padSettings.address}
                  </p>
                )}

                {(padSettings.established ||
                  padSettings.eiinOrCode ||
                  padSettings.phone ||
                  padSettings.email) && (
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "10px",
                      marginTop: "5px",
                      fontSize: "11.5px",
                      color: "#475569",
                    }}
                  >
                    {padSettings.established && (
                      <span>স্থাপিত: {toBengaliNumber(padSettings.established)}</span>
                    )}
                    {padSettings.eiinOrCode && (
                      <span>· কোড: {toBengaliNumber(padSettings.eiinOrCode)}</span>
                    )}
                    {padSettings.phone && (
                      <span>· মোবাইল: {toBengaliNumber(padSettings.phone)}</span>
                    )}
                    {padSettings.email && <span>· ইমেইল: {padSettings.email}</span>}
                  </div>
                )}
              </div>
            </div>

            {/* Memo & Date Row */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "12px 4px",
                fontSize: "13.5px",
                color: "#1E293B",
                fontWeight: 600,
              }}
            >
              <div>
                <span style={{ color: "#475569", fontWeight: 500 }}>স্মারক নং: </span>
                <span style={{ fontFamily: "monospace", fontSize: "13.5px" }}>
                  {memoNumber || "—"}
                </span>
              </div>
              <div>
                <span style={{ color: "#475569", fontWeight: 500 }}>তারিখ: </span>
                <span>{displayDate || "—"}</span>
              </div>
            </div>

            {/* Certificate Title Ribbon */}
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                marginTop: "14px",
                marginBottom: "24px",
                position: "relative",
                zIndex: 2,
              }}
            >
              <div
                style={{
                  display: "inline-flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  minWidth: "280px",
                  padding: "12px 40px",
                  borderTop: `2px solid ${accentColor}`,
                  borderBottom: `2px solid ${accentColor}`,
                  backgroundColor: isRoyal
                    ? "#EFF6FF"
                    : isClassic
                    ? "#F0FDFA"
                    : "#F8FAFC",
                  textAlign: "center",
                  position: "relative",
                }}
              >
                <div
                  style={{
                    fontSize: "24px",
                    fontWeight: 700,
                    color: primaryColor,
                    margin: 0,
                    lineHeight: 1.35,
                    letterSpacing: "normal",
                    position: "relative",
                    zIndex: 2,
                  }}
                >
                  {displayTitle}
                </div>
                <div
                  style={{
                    fontSize: "11px",
                    fontWeight: 600,
                    color: accentColor,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    marginTop: "4px",
                    position: "relative",
                    zIndex: 2,
                  }}
                >
                  {meta.titleEn}
                </div>
              </div>
            </div>

            {/* Structured Student Identity Strip */}
            <div
              style={{
                border: "1px solid #E2E8F0",
                backgroundColor: "#F8FAFC",
                padding: "14px 18px",
                marginBottom: "24px",
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                rowGap: "8px",
                columnGap: "24px",
                fontSize: "13.5px",
                lineHeight: 1.5,
              }}
            >
              <div>
                <span style={{ color: "#475569", fontWeight: 500 }}>শিক্ষার্থীর নাম: </span>
                <strong style={{ color: "#0F172A" }}>{studentName || "—"}</strong>
              </div>
              <div>
                <span style={{ color: "#475569", fontWeight: 500 }}>শ্রেণি / জামাত: </span>
                <strong style={{ color: "#0F172A" }}>{className || "—"}</strong>
              </div>
              <div>
                <span style={{ color: "#475569", fontWeight: 500 }}>পিতার নাম: </span>
                <strong style={{ color: "#0F172A" }}>{fatherName || "—"}</strong>
              </div>
              <div>
                <span style={{ color: "#475569", fontWeight: 500 }}>রোল নম্বর: </span>
                <strong style={{ color: "#0F172A" }}>
                  {roll ? toBengaliNumber(roll) : "—"}
                </strong>
                {studentUid && (
                  <span style={{ color: "#475569", marginLeft: "10px" }}>
                    (আইডি: <strong style={{ color: "#0F172A" }}>{toBengaliNumber(studentUid)}</strong>)
                  </span>
                )}
              </div>
              {motherName && (
                <div>
                  <span style={{ color: "#475569", fontWeight: 500 }}>মাতার নাম: </span>
                  <strong style={{ color: "#0F172A" }}>{motherName}</strong>
                </div>
              )}
              <div>
                <span style={{ color: "#475569", fontWeight: 500 }}>শিক্ষাবর্ষ: </span>
                <strong style={{ color: "#0F172A" }}>{academicYear || "—"}</strong>
              </div>
              {address && (
                <div style={{ gridColumn: "1 / -1" }}>
                  <span style={{ color: "#475569", fontWeight: 500 }}>স্থায়ী ঠিকানা: </span>
                  <strong style={{ color: "#0F172A" }}>{address}</strong>
                </div>
              )}
            </div>

            {/* Main Prose Body */}
            <div
              style={{
                fontSize: "15.5px",
                lineHeight: 1.95,
                color: "#0F172A",
                textAlign: "justify",
                padding: "0 4px",
              }}
            >
              {paragraphs.length > 0 ? (
                paragraphs.map((para, idx) => (
                  <p
                    key={idx}
                    style={{
                      margin: "0 0 14px 0",
                      whiteSpace: "pre-line",
                    }}
                  >
                    {para}
                  </p>
                ))
              ) : (
                <p style={{ color: "#64748B", fontStyle: "italic" }}>
                  সনদপত্রের বিবরণ এখানে প্রদর্শিত হবে...
                </p>
              )}
            </div>
          </div>

          {/* BOTTOM SIGNATURE & VERIFICATION SECTION */}
          <div style={{ position: "relative", zIndex: 1, marginTop: "36px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "flex-end",
                justifyContent: "space-between",
                gap: "16px",
                paddingTop: "18px",
              }}
            >
              {/* Left: Prepared By + Official Seal Note */}
              <div style={{ width: "185px", textAlign: "center" }}>
                <div
                  style={{
                    height: "44px",
                    display: "flex",
                    alignItems: "flex-end",
                    justifyContent: "center",
                    paddingBottom: "4px",
                    fontSize: "12px",
                    color: "#475569",
                  }}
                >
                  {issuedByName || ""}
                </div>
                <div
                  style={{
                    borderTop: "1.2px solid #334155",
                    paddingTop: "6px",
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "#1E293B",
                  }}
                >
                  প্রস্তুতকারীর স্বাক্ষর
                </div>
                <div style={{ fontSize: "11px", color: "#64748B" }}>
                  দাপ্তরিক ও যাচাইকারী
                </div>
              </div>

              {/* Center: QR Code Verification or Official Seal */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {padSettings.showQrCode !== false ? (
                  <>
                    <div
                      style={{
                        padding: "6px",
                        border: "1px solid #CBD5E1",
                        backgroundColor: "#FFFFFF",
                      }}
                    >
                      <QRCodeSVG
                        value={qrPayload}
                        size={68}
                        level="M"
                        fgColor="#0F172A"
                        bgColor="#FFFFFF"
                      />
                    </div>
                    <span
                      style={{
                        fontSize: "9.5px",
                        color: "#64748B",
                        marginTop: "4px",
                      }}
                    >
                      যাচাইকরণ QR কোড
                    </span>
                  </>
                ) : (
                  <div
                    style={{
                      width: "74px",
                      height: "74px",
                      borderRadius: "50%",
                      border: `1px dashed ${accentColor}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "10px",
                      color: "#64748B",
                      textAlign: "center",
                      padding: "4px",
                    }}
                  >
                    প্রতিষ্ঠানের সিলমোহর
                  </div>
                )}
              </div>

              {/* Right: Principal / Muhtamim Signature */}
              <div style={{ width: "205px", textAlign: "center" }}>
                <div
                  style={{
                    height: "44px",
                    display: "flex",
                    alignItems: "flex-end",
                    justifyContent: "center",
                    paddingBottom: "4px",
                    fontSize: "13px",
                    fontWeight: 600,
                    color: primaryColor,
                  }}
                >
                  {padSettings.principalName || ""}
                </div>
                <div
                  style={{
                    borderTop: "1.2px solid #0F172A",
                    paddingTop: "6px",
                    fontSize: "13.5px",
                    fontWeight: 700,
                    color: "#0F172A",
                  }}
                >
                  {padSettings.principalTitle?.trim() || "মুহতামিম / অধ্যক্ষ"}
                </div>
                <div style={{ fontSize: "11px", color: "#475569" }}>
                  {displayOrgName}
                </div>
              </div>
            </div>

            {/* Footer line */}
            <div
              style={{
                marginTop: "20px",
                paddingTop: "8px",
                borderTop: "1px solid #E2E8F0",
                display: "flex",
                justifyContent: "space-between",
                fontSize: "10.5px",
                color: "#64748B",
              }}
            >
              <span>ডিজিটাল সনদপত্র · {displayOrgName}</span>
              <span>স্মারক নং: {memoNumber}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
