import React, { useState, useLayoutEffect, useRef, useCallback, useEffect } from "react";
import { convertNumber } from "../../utils/numeralConverter";

// ─── Types ──────────────────────────────────────────────────────────────────

interface PageModel {
  pageIndex: number;
  studentStartIndex: number;
  studentEndIndex: number;
  studentIds: string[];
  subjectGroupIndex: number;
  totalSubjectGroups: number;
  studentGroupIndex: number;
  totalStudentGroups: number;
  isSummary: boolean;
  contentHeight: number;
  bottomRemaining: number;
  hasData: boolean;
}

interface TabulationSheetDocumentProps {
  processedResults: any[];
  subjects: any[];
  results: any[];
  reportHeader: any;
  numeralFormat: 'bn' | 'ar' | 'en';
  onPaginationReport?: (report: PaginationReport) => void;
}

interface PaginationReport {
  sourceStudents: number;
  renderedStudents: number;
  missing: number;
  duplicates: number;
  sourceSubjects: number;
  renderedSubjects: number;
  totalPages: number;
  pages: Array<{
    pageIndex: number;
    studentsRange: string;
    subjectsRange: string;
    contentHeight: number;
    bottomRemaining: number;
    isSummary: boolean;
  }>;
}

// ─── Constants ──────────────────────────────────────────────────────────────

// A4 Landscape in CSS px (96 DPI)
const A4_WIDTH = 1123;
const A4_HEIGHT = 794;

// Margins and safe zones
const PAGE_PADDING_TOP = 40;
const PAGE_PADDING_BOTTOM = 30;
const PAGE_PADDING_LEFT = 44;
const PAGE_PADDING_RIGHT = 44;

// Footer reserved zone height
const FOOTER_RESERVED_HEIGHT = 36;

// Minimum bottom safe margin between table and footer
// VERY IMPORTANT: This must be large enough to account for browser print dialogs
// that use "Default" margins (which steal ~1cm from top and bottom of the paper).
// If this is too small, rows at the bottom of the page will be physically chopped off.
const BOTTOM_SAFE_MARGIN = 120;


// Maximum subjects per horizontal group
const MAX_SUBJECTS_PER_GROUP = 7;

// Near-empty page threshold: if last page has <= this many rows, try backtracking
const NEAR_EMPTY_THRESHOLD = 2;

// ─── Shared Styles ──────────────────────────────────────────────────────────

const pageStyle: React.CSSProperties = {
  width: `${A4_WIDTH}px`,
  height: `${A4_HEIGHT}px`,
  padding: `${PAGE_PADDING_TOP}px ${PAGE_PADDING_RIGHT}px ${PAGE_PADDING_BOTTOM}px ${PAGE_PADDING_LEFT}px`,
  boxSizing: "border-box",
  display: "flex",
  flexDirection: "column",
  fontFamily: "'Tiro Bangla', serif",
  position: "relative",
  backgroundColor: "white",
  // DO NOT use overflow:hidden — it silently clips students if measurement is slightly off
};

const tableCellStyle: React.CSSProperties = {
  padding: "4px 6px",
  border: "1px solid black",
  lineHeight: "1.4",
  whiteSpace: "normal",
  overflowWrap: "anywhere",
  wordBreak: "normal",
  verticalAlign: "middle",
};

// ─── Component ──────────────────────────────────────────────────────────────

export const TabulationSheetDocument: React.FC<TabulationSheetDocumentProps> = ({
  processedResults,
  subjects,
  results,
  reportHeader,
  numeralFormat,
  onPaginationReport,
}) => {
  const [pageModels, setPageModels] = useState<PageModel[]>([]);
  const [measuring, setMeasuring] = useState(true);
  const measureRef = useRef<HTMLDivElement>(null);

  // ─── Derived Data ────────────────────────────────────────────────────────

  const cleanExamTitle = reportHeader.examTitle
    ? reportHeader.examTitle.replace("পরীক্ষা পরীক্ষা", "পরীক্ষা")
    : "";

  // Split subjects into horizontal groups
  const subjectGroups: any[][] = [];
  for (let i = 0; i < subjects.length; i += MAX_SUBJECTS_PER_GROUP) {
    subjectGroups.push(subjects.slice(i, i + MAX_SUBJECTS_PER_GROUP));
  }

  // Summary statistics
  const totalStudents = processedResults.length;
  const gradeCounts: Record<string, number> = { 'A+': 0, 'A': 0, 'A-': 0, 'B': 0, 'C': 0, 'D': 0, 'F': 0 };
  let totalPass = 0;
  let totalFail = 0;

  processedResults.forEach((row: any) => {
    const status = row.metrics.statusKey;
    const grade = row.metrics.grade || "";

    if (status === 'pass') totalPass++;
    else totalFail++;

    if (grade === 'A+' || grade === 'মুমতায') gradeCounts['A+']++;
    else if (grade === 'A' || grade === 'জায়্যিদ জিদ্দান') gradeCounts['A']++;
    else if (grade === 'A-' || grade === 'জায়্যিদ') gradeCounts['A-']++;
    else if (grade === 'B' || grade === 'মাকবুল') gradeCounts['B']++;
    else if (grade === 'C') gradeCounts['C']++;
    else if (grade === 'D') gradeCounts['D']++;
    else gradeCounts['F']++;
  });

  const passRate = totalStudents > 0 ? ((totalPass / totalStudents) * 100).toFixed(2) : "0";

  // ─── PASS 1: Measurement ─────────────────────────────────────────────────

  const performMeasurement = useCallback(() => {
    const container = measureRef.current;
    if (!container) return;

    const headerEl = container.querySelector('.measure-header') as HTMLElement;
    const footerEl = container.querySelector('.measure-footer') as HTMLElement;
    const theadEls = container.querySelectorAll('.measure-thead');

    const headerHeight = headerEl ? Math.ceil(headerEl.getBoundingClientRect().height) : 100;
    // getBoundingClientRect() does NOT include CSS margins. The header div uses
    // marginBottom: 8px which takes real space in the flex layout of the actual page.
    const HEADER_MARGIN_BOTTOM = 8;
    const footerHeight = footerEl ? Math.ceil(footerEl.getBoundingClientRect().height) : FOOTER_RESERVED_HEIGHT;

    // Get max thead height across subject groups
    let maxTheadHeight = 0;
    theadEls.forEach((el) => {
      maxTheadHeight = Math.max(maxTheadHeight, Math.ceil(el.getBoundingClientRect().height));
    });

    // ─── PASS 2: Composition ────────────────────────────────────────────────

    // Usable height for TABLE BODY ROWS ONLY (everything else subtracted)
    const usableBodyHeight =
      A4_HEIGHT -
      PAGE_PADDING_TOP -
      PAGE_PADDING_BOTTOM -
      headerHeight -
      HEADER_MARGIN_BOTTOM -
      maxTheadHeight -
      Math.max(footerHeight, FOOTER_RESERVED_HEIGHT) -
      BOTTOM_SAFE_MARGIN;

    // ─── Cumulative Body Height Measurement ─────────────────────────────────
    // CRITICAL FIX: Instead of measuring each row's height individually and
    // summing them (which accumulates subpixel/border-collapse rounding errors
    // — typically 1-2px per row, totaling 30-90px over a full page of students),
    // we measure the CUMULATIVE distance from the first row's top edge to each
    // row's bottom edge. This captures the ACTUAL rendered table body height
    // including all border-collapse, subpixel, and font-metric effects.

    const numStudents = processedResults.length;
    const cumulativeBodyH: number[] = new Array(numStudents).fill(0);

    subjectGroups.forEach((_, sgIdx) => {
      const rowEls = container.querySelectorAll(`.measure-row-sg-${sgIdx}`);
      if (rowEls.length === 0) return;

      const firstRowTop = rowEls[0].getBoundingClientRect().top;

      rowEls.forEach((el, i) => {
        // Cumulative distance: first row top → this row bottom = actual height of rows 0..i
        const h = Math.ceil(el.getBoundingClientRect().bottom - firstRowTop);
        // Take the max across subject groups (widest row group determines page break)
        cumulativeBodyH[i] = Math.max(cumulativeBodyH[i], h);
      });
    });

    // Derive individual row heights from cumulative (for backtracking logic)
    const rowHeights: number[] = new Array(numStudents).fill(0);
    for (let i = 0; i < numStudents; i++) {
      rowHeights[i] = i === 0 ? cumulativeBodyH[0] : cumulativeBodyH[i] - cumulativeBodyH[i - 1];
    }

    // ─── Build Student Chunks ───────────────────────────────────────────────
    // Each chunk is a contiguous range of students that fit on one page.
    // For chunks after the first, we add a small buffer because a new table's
    // first row has a slightly different border layout (shared with thead, not
    // with the previous row that's now on the previous page).

    const CHUNK_BORDER_BUFFER = 4; // px per new chunk for border layout difference

    const studentChunks: Array<{ startIdx: number; endIdx: number; totalHeight: number }> = [];
    let chunkStart = 0;

    while (chunkStart < numStudents) {
      let chunkEnd = chunkStart; // at minimum, one student per chunk

      for (let i = chunkStart; i < numStudents; i++) {
        // Calculate body height for rows chunkStart..i
        let bodyH: number;
        if (chunkStart === 0) {
          bodyH = cumulativeBodyH[i];
        } else {
          // Height ≈ cumH[i] - cumH[chunkStart-1] + border buffer
          bodyH = cumulativeBodyH[i] - cumulativeBodyH[chunkStart - 1] + CHUNK_BORDER_BUFFER;
        }

        if (bodyH > usableBodyHeight && i > chunkStart) {
          // Row i doesn't fit; chunk ends at i-1
          break;
        }
        chunkEnd = i;
      }

      const totalH = chunkStart === 0
        ? cumulativeBodyH[chunkEnd]
        : cumulativeBodyH[chunkEnd] - cumulativeBodyH[chunkStart - 1] + CHUNK_BORDER_BUFFER;

      studentChunks.push({
        startIdx: chunkStart,
        endIdx: chunkEnd,
        totalHeight: totalH,
      });

      chunkStart = chunkEnd + 1;
    }

    console.log('[TabulationSheet Pagination]', {
      A4_HEIGHT, usableBodyHeight,
      headerHeight, headerMargin: HEADER_MARGIN_BOTTOM,
      theadHeight: maxTheadHeight,
      footerHeight,
      totalStudents: numStudents,
      cumulativeH_first5: cumulativeBodyH.slice(0, 5),
      cumulativeH_last3: cumulativeBodyH.slice(-3),
    });

    console.log('[TabulationSheet Pagination] Chunks:', studentChunks.map(c =>
      `[${c.startIdx}-${c.endIdx}] (${c.endIdx - c.startIdx + 1} students, ${Math.round(c.totalHeight)}px / ${Math.round(usableBodyHeight)}px)`
    ));

    // ─── Near-empty page backtracking (Rule #8) ─────────────────────────────
    if (studentChunks.length >= 2) {
      const lastChunk = studentChunks[studentChunks.length - 1];
      const lastChunkRowCount = lastChunk.endIdx - lastChunk.startIdx + 1;

      if (lastChunkRowCount <= NEAR_EMPTY_THRESHOLD) {
        const prevChunk = studentChunks[studentChunks.length - 2];

        // Try to fit last chunk's rows into previous chunk
        let extraHeight = 0;
        for (let i = lastChunk.startIdx; i <= lastChunk.endIdx; i++) {
          extraHeight += rowHeights[i];
        }

        if (prevChunk.totalHeight + extraHeight <= usableBodyHeight) {
          // Merge: extend previous chunk to include last chunk
          prevChunk.endIdx = lastChunk.endIdx;
          prevChunk.totalHeight += extraHeight;
          studentChunks.pop();
        }
      }
    }

    // ─── Build PageModels ───────────────────────────────────────────────────

    const newPageModels: PageModel[] = [];
    let globalPageIndex = 0;

    for (let sChunkIdx = 0; sChunkIdx < studentChunks.length; sChunkIdx++) {
      const chunk = studentChunks[sChunkIdx];

      for (let sgIdx = 0; sgIdx < subjectGroups.length; sgIdx++) {
        const studentIds = processedResults
          .slice(chunk.startIdx, chunk.endIdx + 1)
          .map((r: any) => r.student.id);

        const pageContentHeight =
          headerHeight + HEADER_MARGIN_BOTTOM + maxTheadHeight + chunk.totalHeight;
        const bottomRemainingPx =
          A4_HEIGHT -
          PAGE_PADDING_TOP -
          PAGE_PADDING_BOTTOM -
          pageContentHeight -
          Math.max(footerHeight, FOOTER_RESERVED_HEIGHT);

        newPageModels.push({
          pageIndex: globalPageIndex++,
          studentStartIndex: chunk.startIdx,
          studentEndIndex: chunk.endIdx,
          studentIds,
          subjectGroupIndex: sgIdx,
          totalSubjectGroups: subjectGroups.length,
          studentGroupIndex: sChunkIdx,
          totalStudentGroups: studentChunks.length,
          isSummary: false,
          contentHeight: pageContentHeight,
          bottomRemaining: bottomRemainingPx,
          hasData: studentIds.length > 0,
        });
      }
    }

    // Summary page
    newPageModels.push({
      pageIndex: globalPageIndex,
      studentStartIndex: -1,
      studentEndIndex: -1,
      studentIds: [],
      subjectGroupIndex: 0,
      totalSubjectGroups: 1,
      studentGroupIndex: 0,
      totalStudentGroups: 1,
      isSummary: true,
      contentHeight: 0,
      bottomRemaining: 0,
      hasData: true,
    });

    // ─── Data Integrity Validation (Rule #19) ────────────────────────────────

    const allRenderedStudentIds = new Set<string>();
    newPageModels
      .filter((p) => !p.isSummary)
      .forEach((p) => {
        // For same student chunk but different subject groups, 
        // we use the same student set — only count unique from first subject group
        if (p.subjectGroupIndex === 0) {
          p.studentIds.forEach((id) => allRenderedStudentIds.add(id));
        }
      });

    const sourceStudentIds = new Set(processedResults.map((r: any) => r.student.id));
    const missingStudents = [...sourceStudentIds].filter((id) => !allRenderedStudentIds.has(id));
    const duplicateCheck = newPageModels
      .filter((p) => !p.isSummary && p.subjectGroupIndex === 0)
      .flatMap((p) => p.studentIds);
    const duplicateStudents = duplicateCheck.filter((id, idx) => duplicateCheck.indexOf(id) !== idx);

    if (missingStudents.length > 0) {
      console.error("DATA INTEGRITY ERROR: Missing students in pagination:", missingStudents);
    }
    if (duplicateStudents.length > 0) {
      console.error("DATA INTEGRITY ERROR: Duplicate students in pagination:", duplicateStudents);
    }

    // Emit pagination report
    if (onPaginationReport) {
      onPaginationReport({
        sourceStudents: processedResults.length,
        renderedStudents: allRenderedStudentIds.size,
        missing: missingStudents.length,
        duplicates: duplicateStudents.length,
        sourceSubjects: subjects.length,
        renderedSubjects: subjects.length,
        totalPages: newPageModels.length,
        pages: newPageModels.map((p) => ({
          pageIndex: p.pageIndex,
          studentsRange: p.isSummary
            ? "Summary"
            : `${p.studentStartIndex + 1}–${p.studentEndIndex + 1}`,
          subjectsRange: p.isSummary
            ? "-"
            : `Group ${p.subjectGroupIndex + 1}/${p.totalSubjectGroups}`,
          contentHeight: Math.round(p.contentHeight),
          bottomRemaining: Math.round(p.bottomRemaining),
          isSummary: p.isSummary,
        })),
      });
    }

    setPageModels(newPageModels);
    setMeasuring(false);
  }, [processedResults, subjects, subjectGroups, onPaginationReport]);

  useLayoutEffect(() => {
    if (!measuring || !processedResults || processedResults.length === 0) return;
    
    let isMounted = true;
    
    const measure = async () => {
      // Wait for fonts to be ready to ensure accurate text measurement
      if (document.fonts) {
        try {
          await document.fonts.ready;
        } catch (e) {
          console.warn("Font loading wait failed", e);
        }
      }
      
      if (!isMounted) return;
      
      // Additional small delay to ensure DOM layout is completely settled
      setTimeout(() => {
        if (isMounted) performMeasurement();
      }, 150);
    };

    measure();

    return () => {
      isMounted = false;
    };
  }, [measuring, performMeasurement, processedResults]);

  // ─── Guard ────────────────────────────────────────────────────────────────

  if (!processedResults || processedResults.length === 0 || !subjects || subjects.length === 0) {
    return null;
  }

  // ─── Render: Header Block (shared across pages) ──────────────────────────

  const renderHeader = (pm: PageModel) => (
    <div style={{ textAlign: "center", marginBottom: "8px" }}>
      <h1 style={{ fontSize: "20px", fontWeight: "bold", margin: "0 0 3px 0" }}>
        {reportHeader.orgName}
      </h1>
      <p style={{ fontSize: "12px", margin: "0 0 3px 0", color: "#374151" }}>
        {reportHeader.address}
      </p>
      <h2 style={{ fontSize: "16px", fontWeight: "bold", margin: "0 0 3px 0" }}>
        {cleanExamTitle}
      </h2>
      <div style={{ fontSize: "12px", margin: "0 0 4px 0", color: "#374151" }}>
        <span>{reportHeader.academicYearText}</span>
        <span style={{ marginLeft: "24px" }}>{reportHeader.classNameText}</span>
      </div>
      <p style={{ fontSize: "10px", color: "#6B7280" }}>
        বিষয় অংশ: {convertNumber(pm.subjectGroupIndex + 1, numeralFormat)}/{convertNumber(pm.totalSubjectGroups, numeralFormat)}
        {" | "}
        শিক্ষার্থী অংশ: {convertNumber(pm.studentGroupIndex + 1, numeralFormat)}/{convertNumber(pm.totalStudentGroups, numeralFormat)}
      </p>
    </div>
  );

  // ─── Render: Footer Block ────────────────────────────────────────────────

  const renderFooter = () => (
    <div
      style={{
        position: "absolute",
        bottom: `${PAGE_PADDING_BOTTOM}px`,
        right: `${PAGE_PADDING_RIGHT}px`,
        fontSize: "10px",
        color: "#374151",
        fontFamily: "'Tiro Bangla', serif",
      }}
    >
      প্রস্তুত: {convertNumber(new Date().toLocaleDateString('en-GB'), numeralFormat)}
    </div>
  );

  // ─── Render: Measurement DOM (PASS 1) ─────────────────────────────────────

  if (measuring) {
    return (
      <div
        ref={measureRef}
        style={{
          width: `${A4_WIDTH}px`,
          position: "fixed",
          left: "-100000px",
          top: "0px",
          fontFamily: "'Tiro Bangla', serif",
          backgroundColor: "white",
        }}
      >
        <div style={{ padding: `${PAGE_PADDING_TOP}px ${PAGE_PADDING_RIGHT}px ${PAGE_PADDING_BOTTOM}px ${PAGE_PADDING_LEFT}px` }}>
          {/* Measure header */}
          <div className="measure-header" style={{ textAlign: "center", marginBottom: "8px" }}>
            <h1 style={{ fontSize: "20px", fontWeight: "bold", margin: "0 0 3px 0" }}>
              {reportHeader.orgName}
            </h1>
            <p style={{ fontSize: "12px", margin: "0 0 3px 0" }}>{reportHeader.address}</p>
            <h2 style={{ fontSize: "16px", fontWeight: "bold", margin: "0 0 3px 0" }}>
              {cleanExamTitle}
            </h2>
            <div style={{ fontSize: "12px", margin: "0 0 4px 0" }}>
              <span>{reportHeader.academicYearText}</span>
              <span style={{ marginLeft: "24px" }}>{reportHeader.classNameText}</span>
            </div>
            <p style={{ fontSize: "10px", color: "#6B7280" }}>
              বিষয় অংশ: ১/১ | শিক্ষার্থী অংশ: ১/১
            </p>
          </div>

          {/* Measure all subject groups separately to find max height per row */}
          {subjectGroups.map((sg, sgIdx) => {
            const isLast = sgIdx === subjectGroups.length - 1;
            return (
              <table
                key={`measure-table-${sgIdx}`}
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "11px",
                  tableLayout: "fixed",
                  marginBottom: "20px",
                }}
              >
                <thead className="measure-thead">
                  <tr style={{ backgroundColor: "#F3F4F6" }}>
                    <th style={{ ...tableCellStyle, width: "40px", textAlign: "center", fontWeight: "bold" }}>রোল</th>
                    <th style={{ ...tableCellStyle, width: "170px", fontWeight: "bold" }}>নাম</th>
                    {sg.map((s: any) => (
                      <th key={s.id} style={{ ...tableCellStyle, width: "72px", textAlign: "center" }}>
                        <div style={{ lineHeight: "1.3", fontWeight: "bold", whiteSpace: "normal", overflowWrap: "anywhere" }}>
                          {s.name}
                        </div>
                        <div style={{ fontSize: "9px", fontWeight: "normal", marginTop: "2px" }}>
                          ({convertNumber(s.fullMarks, numeralFormat)})
                        </div>
                      </th>
                    ))}
                    {isLast && (
                      <>
                        <th style={{ ...tableCellStyle, width: "48px", textAlign: "center", fontWeight: "bold" }}>মোট</th>
                        <th style={{ ...tableCellStyle, width: "48px", textAlign: "center", fontWeight: "bold" }}>পূর্ণমান</th>
                        <th style={{ ...tableCellStyle, width: "44px", textAlign: "center", fontWeight: "bold" }}>শতকরা</th>
                        <th style={{ ...tableCellStyle, width: "64px", textAlign: "center", fontWeight: "bold" }}>বিভাগ</th>
                        <th style={{ ...tableCellStyle, width: "48px", textAlign: "center", fontWeight: "bold" }}>মেধাক্রম</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {processedResults.map((row: any) => (
                    <tr key={row.student.id} className={`measure-row-sg-${sgIdx}`}>
                      <td style={{ ...tableCellStyle, width: "40px", textAlign: "center" }}>
                        {convertNumber(row.student.roll, numeralFormat)}
                      </td>
                      <td style={{ ...tableCellStyle, width: "170px", fontWeight: "600" }}>
                        <div style={{ whiteSpace: "normal", overflowWrap: "anywhere", wordBreak: "normal" }}>
                          {row.student.name}
                        </div>
                      </td>
                      {sg.map((s: any) => (
                        <td key={s.id} style={{ ...tableCellStyle, width: "72px", textAlign: "center" }}>
                          -
                        </td>
                      ))}
                      {isLast && (
                        <>
                          <td style={{ ...tableCellStyle, width: "48px", textAlign: "center" }}>
                            {convertNumber(row.metrics.totalMarks, numeralFormat)}
                          </td>
                          <td style={{ ...tableCellStyle, width: "48px", textAlign: "center" }}>-</td>
                          <td style={{ ...tableCellStyle, width: "44px", textAlign: "center" }}>-</td>
                          <td style={{ ...tableCellStyle, width: "64px", textAlign: "center", fontSize: "10px", lineHeight: "1.3", fontWeight: "600" }}>
                            {row.metrics.statusKey === 'pass' ? 'কৃতকার্য' : 'অকৃতকার্য'}
                            <br />({row.metrics.grade})
                          </td>
                          <td style={{ ...tableCellStyle, width: "48px", textAlign: "center" }}>-</td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            );
          })}

          {/* Measure footer */}
          <div className="measure-footer" style={{ fontSize: "10px", padding: "8px" }}>
            প্রস্তুত: {convertNumber(new Date().toLocaleDateString('en-GB'), numeralFormat)}
          </div>
        </div>
      </div>
    );
  }

  // ─── Render: Actual A4 Pages (PASS 2 output) ──────────────────────────────

  return (
    <div className="tabulation-sheet-renderer" style={{ position: "relative", backgroundColor: "white" }}>
      {pageModels
        .filter((pm) => !pm.isSummary)
        .map((pm) => {
          const subjectGroup = subjectGroups[pm.subjectGroupIndex];
          const isLastSubGroup = pm.subjectGroupIndex === subjectGroups.length - 1;
          const studentSlice = processedResults.slice(
            pm.studentStartIndex,
            pm.studentEndIndex + 1
          );

          return (
            <div
              key={`page-${pm.pageIndex}`}
              className="a4-page"
              data-has-data={pm.hasData.toString()}
              data-page-index={pm.pageIndex}
              style={pageStyle}
            >
              {/* Header */}
              {renderHeader(pm)}

              {/* Table */}
              <div style={{ flex: "1 1 auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: "11px",
                    tableLayout: "fixed",
                  }}
                >
                  <thead>
                    <tr style={{ backgroundColor: "#F3F4F6" }}>
                      <th style={{ ...tableCellStyle, width: "40px", textAlign: "center", fontWeight: "bold" }}>রোল</th>
                      <th style={{ ...tableCellStyle, width: "170px", fontWeight: "bold" }}>নাম</th>
                      {subjectGroup.map((s: any) => (
                        <th key={s.id} style={{ ...tableCellStyle, width: "72px", textAlign: "center" }}>
                          <div style={{ lineHeight: "1.3", fontWeight: "bold", whiteSpace: "normal", overflowWrap: "anywhere" }}>
                            {s.name}
                          </div>
                          <div style={{ fontSize: "9px", fontWeight: "normal", marginTop: "2px" }}>
                            ({convertNumber(s.fullMarks, numeralFormat)})
                          </div>
                        </th>
                      ))}
                      {isLastSubGroup && (
                        <>
                          <th style={{ ...tableCellStyle, width: "48px", textAlign: "center", fontWeight: "bold" }}>মোট</th>
                          <th style={{ ...tableCellStyle, width: "48px", textAlign: "center", fontWeight: "bold" }}>পূর্ণমান</th>
                          <th style={{ ...tableCellStyle, width: "44px", textAlign: "center", fontWeight: "bold" }}>শতকরা</th>
                          <th style={{ ...tableCellStyle, width: "64px", textAlign: "center", fontWeight: "bold" }}>বিভাগ</th>
                          <th style={{ ...tableCellStyle, width: "48px", textAlign: "center", fontWeight: "bold" }}>মেধাক্রম</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {studentSlice.map((row: any) => {
                      const student = row.student;
                      const metrics = row.metrics;
                      return (
                        <tr key={student.id}>
                          <td style={{ ...tableCellStyle, textAlign: "center" }}>
                            {convertNumber(student.roll, numeralFormat)}
                          </td>
                          <td style={{ ...tableCellStyle, fontWeight: "600" }}>
                            <div style={{ whiteSpace: "normal", overflowWrap: "anywhere", wordBreak: "normal" }}>
                              {student.name}
                            </div>
                          </td>
                          {subjectGroup.map((subject: any) => {
                            const result = results.find(
                              (r) => r.student_id === student.id && r.subject_id === subject.id
                            );
                            return (
                              <td
                                key={subject.id}
                                style={{
                                  ...tableCellStyle,
                                  textAlign: "center",
                                  fontWeight: "600",
                                  fontSize: "12px",
                                }}
                              >
                                {result ? convertNumber(result.marks, numeralFormat) : "-"}
                              </td>
                            );
                          })}
                          {isLastSubGroup && (
                            <>
                              <td style={{ ...tableCellStyle, textAlign: "center", fontWeight: "bold", fontSize: "12px" }}>
                                {convertNumber(metrics.totalMarks, numeralFormat)}
                              </td>
                              <td style={{ ...tableCellStyle, textAlign: "center", fontSize: "11px" }}>
                                {convertNumber(metrics.totalFullMarks, numeralFormat)}
                              </td>
                              <td style={{ ...tableCellStyle, textAlign: "center", fontSize: "12px" }}>
                                {convertNumber(metrics.percentage, numeralFormat)}%
                              </td>
                              <td style={{ ...tableCellStyle, textAlign: "center", fontSize: "10px", lineHeight: "1.3", fontWeight: "600" }}>
                                {metrics.statusKey === 'pass' ? 'কৃতকার্য' : 'অকৃতকার্য'}
                                <br />({metrics.grade})
                              </td>
                              <td style={{ ...tableCellStyle, textAlign: "center", fontWeight: "bold", fontSize: "12px" }}>
                                {convertNumber(metrics.rank, numeralFormat)}
                              </td>
                            </>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Footer */}
              {renderFooter()}
            </div>
          );
        })}

      {/* ─── Summary Page ─────────────────────────────────────────────────── */}
      <div
        className="a4-page"
        data-has-data="true"
        data-page-index={pageModels.length > 0 ? pageModels[pageModels.length - 1].pageIndex : 0}
        style={pageStyle}
      >
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "16px" }}>
          <h1 style={{ fontSize: "20px", fontWeight: "bold", margin: "0 0 3px 0" }}>
            {reportHeader.orgName}
          </h1>
          <p style={{ fontSize: "12px", margin: "0 0 3px 0", color: "#374151" }}>
            {reportHeader.address}
          </p>
          <h2 style={{ fontSize: "16px", fontWeight: "bold", margin: "0 0 3px 0" }}>
            {cleanExamTitle}
          </h2>
          <div style={{ fontSize: "12px", margin: "0 0 8px 0", color: "#374151" }}>
            <span>{reportHeader.academicYearText}</span>
            <span style={{ marginLeft: "24px" }}>{reportHeader.classNameText}</span>
          </div>
        </div>

        {/* Summary Content */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", paddingTop: "24px" }}>
          <h3
            style={{
              fontSize: "22px",
              fontWeight: "bold",
              marginBottom: "20px",
              borderBottom: "2px solid black",
              paddingBottom: "6px",
            }}
          >
            সার্বিক ফলাফল
          </h3>

          {/* Grade distribution table */}
          <table
            style={{
              borderCollapse: "collapse",
              border: "1px solid black",
              width: "700px",
              textAlign: "center",
              fontSize: "13px",
              marginBottom: "28px",
            }}
          >
            <thead>
              <tr style={{ backgroundColor: "#F3F4F6", fontWeight: "bold" }}>
                <td style={{ padding: "10px 8px", border: "1px solid black", width: "100px" }}>মোট শিক্ষার্থী</td>
                <td style={{ padding: "10px 8px", border: "1px solid black" }}>A+ / মুমতায</td>
                <td style={{ padding: "10px 8px", border: "1px solid black" }}>A / জায়্যিদ জিদ্দান</td>
                <td style={{ padding: "10px 8px", border: "1px solid black" }}>A- / জায়্যিদ</td>
                <td style={{ padding: "10px 8px", border: "1px solid black" }}>B / মাকবুল</td>
                <td style={{ padding: "10px 8px", border: "1px solid black", width: "55px" }}>C</td>
                <td style={{ padding: "10px 8px", border: "1px solid black", width: "55px" }}>D</td>
                <td style={{ padding: "10px 8px", border: "1px solid black" }}>F / রাসিব</td>
              </tr>
            </thead>
            <tbody>
              <tr style={{ fontWeight: "600", fontSize: "15px" }}>
                <td style={{ padding: "10px 8px", border: "1px solid black" }}>{convertNumber(totalStudents, numeralFormat)}</td>
                <td style={{ padding: "10px 8px", border: "1px solid black" }}>{convertNumber(gradeCounts['A+'], numeralFormat)}</td>
                <td style={{ padding: "10px 8px", border: "1px solid black" }}>{convertNumber(gradeCounts['A'], numeralFormat)}</td>
                <td style={{ padding: "10px 8px", border: "1px solid black" }}>{convertNumber(gradeCounts['A-'], numeralFormat)}</td>
                <td style={{ padding: "10px 8px", border: "1px solid black" }}>{convertNumber(gradeCounts['B'], numeralFormat)}</td>
                <td style={{ padding: "10px 8px", border: "1px solid black" }}>{convertNumber(gradeCounts['C'], numeralFormat)}</td>
                <td style={{ padding: "10px 8px", border: "1px solid black" }}>{convertNumber(gradeCounts['D'], numeralFormat)}</td>
                <td style={{ padding: "10px 8px", border: "1px solid black" }}>{convertNumber(gradeCounts['F'], numeralFormat)}</td>
              </tr>
            </tbody>
          </table>

          {/* Pass/Fail/Rate summary table */}
          <table
            style={{
              borderCollapse: "collapse",
              border: "1px solid black",
              width: "500px",
              textAlign: "center",
              fontSize: "14px",
            }}
          >
            <thead>
              <tr style={{ backgroundColor: "#F3F4F6", fontWeight: "bold" }}>
                <td style={{ padding: "10px 12px", border: "1px solid black" }}>মোট পাশ</td>
                <td style={{ padding: "10px 12px", border: "1px solid black" }}>মোট ফেল</td>
                <td style={{ padding: "10px 12px", border: "1px solid black" }}>পাশের হার</td>
              </tr>
            </thead>
            <tbody>
              <tr style={{ fontWeight: "bold", fontSize: "18px" }}>
                <td style={{ padding: "12px", border: "1px solid black", color: "#16A34A" }}>
                  {convertNumber(totalPass, numeralFormat)} জন
                </td>
                <td style={{ padding: "12px", border: "1px solid black", color: "#DC2626" }}>
                  {convertNumber(totalFail, numeralFormat)} জন
                </td>
                <td style={{ padding: "12px", border: "1px solid black", color: "#4F46E5" }}>
                  {convertNumber(passRate, numeralFormat)}%
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Footer */}
        {renderFooter()}
      </div>
    </div>
  );
};
