// PDF export. Two approaches:
//   buildTextPdf / exportTextPdf - draws real text with jsPDF (selectable, ATS-friendly)
//   exportStyledPdf - screenshots the on-screen preview into the PDF (pixel-perfect, but just an image)
import { jsPDF } from "jspdf";
import { getTemplate, normalizeResume, contactLine, dates } from "./config";

// Converts "#RRGGBB" into [r, g, b] numbers (jsPDF wants numbers, not hex).
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
// jsPDF's built-in fonts only cover Latin-1/WinAnsi; map common typographic characters.
const clean = (s = "") =>
  String(s).replace(/[–—]/g, "-").replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/…/g, "...").replace(/[▪●◦]/g, "•").replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF•]/g, "");

// ---- Text PDF builder ----
/**
 * Builds a real-text PDF (selectable and machine-readable, which is what ATS parsers need).
 * Layout follows the chosen template's section order, headings, font and accent colour.
 * Returns the jsPDF document so callers can save it (or inspect it in tests).
 */
export function buildTextPdf(data, templateId) {
  const cfg = getTemplate(templateId || data?.template);
  const r = normalizeResume(data);
  // jsPDF with points as the unit on an A4 page.
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  // M = page margin, W = usable text width, y = current vertical writing position (moves down as we write).
  const M = 48;
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const W = pageW - M * 2;
  const accent = cfg.atsSafe ? [0, 0, 0] : hex(cfg.accent);
  const ink = [23, 23, 18];
  const muted = [95, 102, 94];
  let y = M;

  // Start a new page if the next block of height h wouldn't fit above the bottom margin.
  const ensure = (h) => { if (y + h > pageH - M) { doc.addPage(); y = M; } };

  // Writes (word-wrapped) text at the current y position, then moves y down. Options control size, weight, colour, alignment, indent and the gap after.
  const write = (str, { size = 10.5, bold = false, color = ink, align = "left", indent = 0, gap = 2, x } = {}) => {
    doc.setFont(cfg.pdfFont, bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.setTextColor(...color);
    // splitTextToSize breaks the string into lines that fit the width.
    const lines = doc.splitTextToSize(clean(str), W - indent);
    lines.forEach((line) => {
      ensure(size * 1.3);
      const px = align === "center" ? pageW / 2 : x ?? M + indent;
      doc.text(line, px, y + size, { align });
      y += size * 1.3;
    });
    y += gap;
  };

  // Writes a bold left label with a right-aligned secondary text (dates) on the same line.
  const rowText = (left, right, size = 10.5) => {
    doc.setFont(cfg.pdfFont, "bold");
    doc.setFontSize(size);
    ensure(size * 1.3);
    if (cfg.atsSafe || !right) {
      write([left, right].filter(Boolean).join(cfg.atsSafe ? " | " : "  "), { bold: true, size, gap: 1 });
      return;
    }
    // Measure the right text so the left text wraps before running into it.
    const rw = doc.getTextWidth(clean(right)) + 8;
    const lines = doc.splitTextToSize(clean(left), W - rw);
    doc.setTextColor(...ink);
    lines.forEach((l, i) => {
      ensure(size * 1.3);
      doc.setFont(cfg.pdfFont, "bold");
      doc.text(l, M, y + size);
      if (i === 0) {
        doc.setFont(cfg.pdfFont, "normal");
        doc.setTextColor(...muted);
        doc.text(clean(right), M + W, y + size, { align: "right" });
        doc.setTextColor(...ink);
      }
      y += size * 1.3;
    });
    y += 1;
  };

  // Section heading: uppercase title with an accent-coloured underline (skipped for the "accent" style).
  const heading = (text) => {
    ensure(34);
    y += 8;
    write(text.toUpperCase(), { size: 9.5, bold: true, color: accent, gap: 1 });
    doc.setDrawColor(...(cfg.headingStyle === "accent" ? [255, 255, 255] : accent));
    doc.setLineWidth(cfg.atsSafe ? 0.6 : 1);
    if (cfg.headingStyle !== "accent") doc.line(M, y, M + W, y);
    y += 6;
  };

  // Bullet list: each item gets a "•" and is indented.
  const bullets = (items) => items.forEach((b) => write("• " + b, { indent: 10, gap: 1 }));

  // Header: name and contact line at the top.
  // header
  write(r.personal.fullName || "Your Name", { size: cfg.atsSafe ? 20 : 24, bold: true, align: cfg.headerAlign === "center" ? "center" : "left", gap: 2 });
  write(contactLine(r.personal).join(cfg.atsSafe ? " | " : "  |  "), { size: 9.5, color: muted, align: cfg.headerAlign === "center" ? "center" : "left", gap: 4 });

  // One drawing function per section key, matching the keys in the template's `order`.
  const sections = {
    summary: () => r.summary && write(r.summary, { gap: 2 }),
    skills: () => r.skills.length && write(r.skills.join(cfg.atsSafe ? ", " : "  |  "), { gap: 2 }),
    experience: () => r.experience.forEach((e) => {
      rowText([e.role, e.company].filter(Boolean).join(", "), dates(e.startDate, e.endDate));
      if (e.location) write(e.location, { size: 9.5, color: muted, gap: 1 });
      bullets(e.bullets || []);
      y += 4;
    }),
    projects: () => r.projects.forEach((p) => {
      write([p.name, p.link && `(${p.link})`].filter(Boolean).join(" "), { bold: true, gap: 0 });
      if (p.tech) write(p.tech, { size: 9.5, color: muted, gap: 0 });
      if (p.description) write(p.description, { gap: 4 });
    }),
    education: () => r.education.forEach((e) => {
      rowText([e.degree, e.school].filter(Boolean).join(", "), dates(e.startDate, e.endDate));
      if (e.grade) write(e.grade, { size: 9.5, color: muted, gap: 3 });
    }),
  };

  // Only draw sections that actually have content, in the template's order.
  const has = { summary: !!r.summary, skills: r.skills.length > 0, experience: r.experience.length > 0, projects: r.projects.length > 0, education: r.education.length > 0 };
  cfg.order.forEach((key) => {
    if (!has[key]) return;
    heading(cfg.titles[key]);
    sections[key]();
  });
  return doc;
}

// Builds the text PDF and downloads it as <filename>.pdf.
export function exportTextPdf(data, templateId, filename = "resume") {
  buildTextPdf(data, templateId).save(`${filename}.pdf`);
}

// Image-based export. html2canvas is loaded lazily (dynamic import) so it only downloads when needed.
/** Exact on-screen look, rendered to an image and sliced across A4 pages. Not machine-readable. */
export async function exportStyledPdf(node, filename = "resume") {
  const { default: html2canvas } = await import("html2canvas");
  // scale: 2 renders at double resolution so the PDF stays sharp.
  const canvas = await html2canvas(node, { scale: 2, backgroundColor: "#ffffff", useCORS: true });
  const img = canvas.toDataURL("image/jpeg", 0.95);
  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  // Height of the whole image once scaled to the page width; if taller than one page it is split across pages.
  const imgH = (canvas.height * pageW) / canvas.width;
  // `left` = height still to place; each extra page re-draws the same image shifted up (negative pos) so a different slice shows.
  let left = imgH;
  let pos = 0;
  pdf.addImage(img, "JPEG", 0, pos, pageW, imgH);
  left -= pageH;
  while (left > 0) {
    pos = left - imgH;
    pdf.addPage();
    pdf.addImage(img, "JPEG", 0, pos, pageW, imgH);
    left -= pageH;
  }
  pdf.save(`${filename}.pdf`);
}
