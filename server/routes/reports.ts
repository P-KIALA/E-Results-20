import { RequestHandler } from "express";
import { supabase } from "../lib/supabase";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";

// Build query according to filters, return logs rows
async function fetchLogsForReport(queryParams: any) {
  const { startDate, endDate, site_id, doctor_id, sender_id } = queryParams;
  let query = supabase
    .from("send_logs")
    .select("*, doctors(name, phone)", { count: "exact" })
    .order("created_at", { ascending: false });

  if (doctor_id) query = query.eq("doctor_id", doctor_id);
  if (sender_id) query = query.eq("sender_id", sender_id);
  if (site_id) {
    const { data: site } = await supabase
      .from("sites")
      .select("name")
      .eq("id", site_id)
      .single();
    if (site) query = query.eq("patient_site", site.name);
  }
  if (startDate) query = query.gte("created_at", startDate);
  if (endDate) {
    const endDateObj = new Date(endDate);
    endDateObj.setDate(endDateObj.getDate() + 1);
    query = query.lt("created_at", endDateObj.toISOString());
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export const exportReport: RequestHandler = async (req, res) => {
  try {
    // Accept filters in body (POST) or query
    const filters = { ...req.query, ...(req.body || {}) };
    const format = (filters.format || "csv").toLowerCase();

    const logs = await fetchLogsForReport(filters);

    // Build flattened rows
    const rows = (logs || []).map((l: any) => ({
      id: l.id,
      doctor_name: l.doctors?.name || "",
      doctor_phone: l.doctors?.phone || "",
      status: l.status || "",
      sent_at: l.sent_at || "",
      delivered_at: l.delivered_at || "",
      read_at: l.read_at || "",
      created_at: l.created_at || "",
      sender_id: l.sender_id || "",
      patient_name: l.patient_name || "",
      patient_site: l.patient_site || "",
      error_message: l.error_message || "",
    }));

    if (format === "csv" || format === "xlsx") {
      if (format === "csv") {
        res.setHeader("Content-Type", "text/csv");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="report-${Date.now()}.csv"`,
        );
        // CSV header
        const header = Object.keys(rows[0] || {}).join(",") + "\n";
        res.write(header);
        for (const r of rows) {
          const line = Object.values(r)
            .map((v) => {
              if (v === null || v === undefined) return "";
              const s = String(v).replace(/"/g, '""');
              return `"${s}"`;
            })
            .join(",");
          res.write(line + "\n");
        }
        return res.end();
      }

      // xlsx
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Report");
      if (rows.length > 0) {
        sheet.addRow(Object.keys(rows[0]));
        for (const r of rows) sheet.addRow(Object.values(r));
      }
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="report-${Date.now()}.xlsx"`,
      );
      await workbook.xlsx.write(res);
      return res.end();
    }

    // PDF
    const doc = new PDFDocument({ margin: 30, size: "A4" });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="report-${Date.now()}.pdf"`,
    );
    doc.pipe(res);

    doc.fontSize(16).text("Rapport - Envois", { align: "center" });
    doc.moveDown();

    // summary numbers
    const total = rows.length;
    const byStatus: Record<string, number> = {};
    for (const r of rows) {
      byStatus[r.status] = (byStatus[r.status] || 0) + 1;
    }

    doc.fontSize(12).text(`Total envois: ${total}`);
    for (const s of Object.keys(byStatus)) {
      doc.text(`${s}: ${byStatus[s]}`);
    }
    doc.moveDown();

    // table header
    const cols = [
      "created_at",
      "doctor_name",
      "doctor_phone",
      "status",
      "sent_at",
      "delivered_at",
      "read_at",
      "sender_id",
      "patient_name",
      "patient_site",
    ];

    const tableTop = doc.y;
    const colWidth = Math.floor((doc.page.width - doc.page.margins.left - doc.page.margins.right) / cols.length);

    // header
    doc.fontSize(10);
    cols.forEach((c, i) => {
      doc.text(c, doc.page.margins.left + i * colWidth, tableTop, {
        width: colWidth,
        continued: false,
      });
    });
    doc.moveDown(0.5);

    // rows (limit to a reasonable count to avoid huge PDFs)
    for (const r of rows.slice(0, 1000)) {
      const rowY = doc.y;
      cols.forEach((c, i) => {
        const text = String(r[c] ?? "");
        doc.text(text, doc.page.margins.left + i * colWidth, rowY, {
          width: colWidth,
          continued: false,
        });
      });
      doc.moveDown(0.8);
      if (doc.y > doc.page.height - doc.page.margins.bottom - 50) doc.addPage();
    }

    doc.end();
    return;
  } catch (error: any) {
    console.error("Error exporting report:", error?.message || error, error?.stack || "no-stack");
    res.status(500).json({ error: error?.message || "Failed to export report" });
  }
};
