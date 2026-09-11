"""
AthleteGuard - Professional Report Generation Service
Generates 9-section clinical screening PDF reports (ReportLab)
and 6-sheet analytical Excel workbooks (OpenPyXL).
"""

import io
import json
from datetime import datetime
from typing import Dict, Any, List, Optional

from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

DISCLAIMER_TEXT = (
    "NON-MEDICAL SCREENING DISCLAIMER: AthleteGuard provides artificial intelligence and computer-vision-based "
    "biomechanical screening, anomaly detection, and movement risk estimation. The findings, injury risk probabilities, "
    "and suggested training exercises generated in this report are for informational and performance screening purposes only. "
    "They do NOT constitute medical diagnosis, clinical evaluation, or treatment advice. Consult a board-certified sports physician, "
    "physiotherapist, or orthopedist for formal clinical diagnosis and injury management."
)


class ReportGenerator:
    """
    Generates professional PDF and multi-sheet Excel reports.
    """

    @staticmethod
    def generate_pdf_report(
        analysis_id: str,
        video_data: Dict[str, Any],
        athlete_data: Dict[str, Any],
        risk_data: Dict[str, Any],
        prediction_data: Dict[str, Any],
        biomech_summary: Dict[str, Any],
        anomalies: List[Dict[str, Any]],
        risk_factors: List[Dict[str, Any]],
        recommendations: List[Dict[str, Any]]
    ) -> bytes:
        """
        Builds a comprehensive 9-section PDF report.
        """
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=36,
            leftMargin=36,
            topMargin=36,
            bottomMargin=36
        )

        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            "DocTitle",
            parent=styles["Heading1"],
            fontSize=20,
            leading=24,
            textColor=colors.HexColor("#0f172a"),
            fontName="Helvetica-Bold"
        )
        subtitle_style = ParagraphStyle(
            "DocSubtitle",
            parent=styles["Normal"],
            fontSize=10,
            leading=14,
            textColor=colors.HexColor("#475569"),
            fontName="Helvetica"
        )
        h2_style = ParagraphStyle(
            "Heading2Custom",
            parent=styles["Heading2"],
            fontSize=12,
            leading=16,
            textColor=colors.HexColor("#0f172a"),
            fontName="Helvetica-Bold",
            spaceBefore=8,
            spaceAfter=4
        )
        body_style = ParagraphStyle(
            "BodyCustom",
            parent=styles["Normal"],
            fontSize=9,
            leading=12,
            textColor=colors.HexColor("#334155")
        )
        disclaimer_style = ParagraphStyle(
            "Disclaimer",
            parent=styles["Normal"],
            fontSize=7.5,
            leading=10,
            textColor=colors.HexColor("#64748b")
        )

        story = []

        # --- Header Banner ---
        story.append(Paragraph("AthleteGuard", title_style))
        story.append(Paragraph("AI Sports Biomechanics & Injury Prevention Screening Report", subtitle_style))
        story.append(Spacer(1, 4))
        story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#0284c7"), spaceAfter=10))

        # --- Section 1: Athlete Profile & Section 2: Analysis Information ---
        story.append(Paragraph("1. Athlete Profile & 2. Video Analysis Metadata", h2_style))
        
        meta_table_data = [
            [
                Paragraph(f"<b>Athlete Name:</b> {athlete_data.get('name', 'N/A')}", body_style),
                Paragraph(f"<b>Sport / Position:</b> {athlete_data.get('sport', 'General')} / {athlete_data.get('position', 'Athlete')}", body_style)
            ],
            [
                Paragraph(f"<b>Age / Height / Weight:</b> {athlete_data.get('age', 'N/A')} yrs | {athlete_data.get('height', 'N/A')} cm | {athlete_data.get('weight', 'N/A')} kg", body_style),
                Paragraph(f"<b>Training Load Score:</b> {athlete_data.get('training_load', 'N/A')}/100", body_style)
            ],
            [
                Paragraph(f"<b>Video Filename:</b> {video_data.get('filename', 'video.mp4')}", body_style),
                Paragraph(f"<b>Activity Type:</b> {video_data.get('activity', 'General Movement')}", body_style)
            ],
            [
                Paragraph(f"<b>Analysis ID:</b> {analysis_id[:12]}...", body_style),
                Paragraph(f"<b>Date Generated:</b> {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}", body_style)
            ]
        ]
        meta_table = Table(meta_table_data, colWidths=[270, 270])
        meta_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
            ("PADDING", (0, 0), (-1, -1), 4),
        ]))
        story.append(meta_table)
        story.append(Spacer(1, 8))

        # --- Section 3: Overall Risk Scoring ---
        story.append(Paragraph("3. Overall Movement Risk & Screening Profile", h2_style))
        overall_score = risk_data.get("overall_score", risk_data.get("overall_risk_score", 0.0))
        risk_level = (risk_data.get("risk_level") or "LOW").upper()
        confidence = risk_data.get("confidence", 0.95)

        level_color = "#10b981" if risk_level == "LOW" else ("#f59e0b" if risk_level == "MODERATE" else "#ef4444")

        risk_summary_data = [
            [
                Paragraph("<b>Overall Risk Score:</b>", body_style),
                Paragraph(f"<b>{overall_score:.1f} / 100</b>", body_style),
                Paragraph("<b>Risk Classification:</b>", body_style),
                Paragraph(f"<font color='{level_color}'><b>{risk_level}</b></font>", body_style)
            ],
            [
                Paragraph("<b>Model Confidence:</b>", body_style),
                Paragraph(f"{confidence * 100:.0f}%", body_style),
                Paragraph("<b>Model Engine:</b>", body_style),
                Paragraph("AthleteGuard Weighted Risk v2.0", body_style)
            ]
        ]
        risk_table = Table(risk_summary_data, colWidths=[135, 135, 135, 135])
        risk_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f1f5f9")),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
            ("PADDING", (0, 0), (-1, -1), 4),
        ]))
        story.append(risk_table)
        story.append(Spacer(1, 8))

        # --- Section 4: Injury Risk Breakdown ---
        story.append(Paragraph("4. Anatomical Injury Risk Breakdown (Estimated Probabilities)", h2_style))
        pred_table_data = [
            ["Anatomical Region", "Estimated Risk Score", "Risk Tier", "Primary Contributing Factor"],
            ["ACL / Knee Joint", f"{prediction_data.get('acl_risk', 0.0):.1f}%", "Elevated" if prediction_data.get('acl_risk', 0) > 50 else "Normal", "Dynamic valgus & deceleration angles"],
            ["Hamstring Complex", f"{prediction_data.get('hamstring_risk', 0.0):.1f}%", "Elevated" if prediction_data.get('hamstring_risk', 0) > 50 else "Normal", "Bilateral hip asymmetry & sprint load"],
            ["Ankle / Achilles", f"{prediction_data.get('ankle_risk', 0.0):.1f}%", "Elevated" if prediction_data.get('ankle_risk', 0) > 50 else "Normal", "Subtalar sway & dorsiflexion discrepancy"],
            ["Shoulder / Upper Body", f"{prediction_data.get('shoulder_risk', 0.0):.1f}%", "Elevated" if prediction_data.get('shoulder_risk', 0) > 50 else "Normal", "Shoulder tilt & rotational compensation"],
            ["Lower Back / Spine", f"{prediction_data.get('lower_back_risk', 0.0):.1f}%", "Elevated" if prediction_data.get('lower_back_risk', 0) > 50 else "Normal", "Trunk lean & lumbo-pelvic instability"],
            ["Overuse / Systemic", f"{prediction_data.get('overuse_risk', 0.0):.1f}%", "Elevated" if prediction_data.get('overuse_risk', 0) > 50 else "Normal", "Kinematic fatigue & high training load"]
        ]
        pred_table = Table(pred_table_data, colWidths=[140, 110, 90, 200])
        pred_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0f172a")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 8),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
            ("PADDING", (0, 0), (-1, -1), 3),
        ]))
        story.append(pred_table)
        story.append(Spacer(1, 8))

        # --- Section 5: Biomechanical Summary ---
        story.append(Paragraph("5. Sequence Biomechanical Statistics (2D Frontal/Sagittal Projections)", h2_style))
        def _get_bio(name):
            obj = biomech_summary.get(name, {})
            return f"{obj.get('mean', 0.0):.1f}° (Max: {obj.get('max', 0.0):.1f}°, P95: {obj.get('p95', 0.0):.1f}°)" if isinstance(obj, dict) else "N/A"

        bio_table_data = [
            ["Biomechanical Metric", "Mean (Peak / P95)", "Threshold", "High Risk Frames (%)"],
            ["Knee Valgus Deviation", _get_bio("knee_valgus_angle"), "> 12.0°", f"{biomech_summary.get('knee_valgus_angle', {}).get('high_risk_frame_percentage', 0.0):.1f}%"],
            ["Trunk Lean Deviation", _get_bio("trunk_lean"), "> 10.0°", f"{biomech_summary.get('trunk_lean', {}).get('high_risk_frame_percentage', 0.0):.1f}%"],
            ["Bilateral Knee Asymmetry", _get_bio("bilateral_knee_asymmetry"), "> 15.0°", f"{biomech_summary.get('bilateral_knee_asymmetry', {}).get('high_risk_frame_percentage', 0.0):.1f}%"],
            ["Bilateral Hip Asymmetry", _get_bio("bilateral_hip_asymmetry"), "> 12.0°", f"{biomech_summary.get('bilateral_hip_asymmetry', {}).get('high_risk_frame_percentage', 0.0):.1f}%"],
            ["Hip Stability / Pelvic Drop", _get_bio("hip_stability"), "> 8.0°", f"{biomech_summary.get('hip_stability', {}).get('high_risk_frame_percentage', 0.0):.1f}%"]
        ]
        bio_table = Table(bio_table_data, colWidths=[150, 160, 90, 140])
        bio_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e293b")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 8),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
            ("PADDING", (0, 0), (-1, -1), 3),
        ]))
        story.append(bio_table)
        story.append(Spacer(1, 8))

        # --- Section 6: Movement Anomalies ---
        story.append(Paragraph("6. Detected Movement Anomalies (Isolation Forest & Biomechanical Baselines)", h2_style))
        if anomalies:
            anom_table_data = [["Timestamp", "Frame", "Anomaly Type", "Severity", "Region", "Explanation"]]
            for an in anomalies[:8]:
                anom_table_data.append([
                    f"{an.get('timestamp', 0.0):.2f}s",
                    str(an.get("frame", 0)),
                    an.get("type", "movement_anomaly"),
                    an.get("severity", "MODERATE"),
                    an.get("body_region", "lower_limb"),
                    Paragraph(an.get("explanation", ""), body_style)
                ])
            anom_table = Table(anom_table_data, colWidths=[55, 40, 110, 55, 70, 210])
            anom_table.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#334155")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 7.5),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
                ("PADDING", (0, 0), (-1, -1), 2.5),
            ]))
            story.append(anom_table)
        else:
            story.append(Paragraph("No significant kinematic outliers detected relative to movement baseline.", body_style))
        story.append(Spacer(1, 8))

        # --- Section 7: Risk Factors ---
        story.append(Paragraph("7. Primary Contributing Risk Factors (Weighted Scoring Attribution)", h2_style))
        if risk_factors:
            rf_table_data = [["Rank", "Factor Description", "Body Region", "Severity", "Impact Contribution"]]
            for idx, rf in enumerate(risk_factors[:5], 1):
                rf_table_data.append([
                    str(idx),
                    rf.get("factor", ""),
                    rf.get("body_region", "general"),
                    rf.get("severity", "MODERATE"),
                    f"{rf.get('contribution', 0.0):.1f} pts"
                ])
            rf_table = Table(rf_table_data, colWidths=[35, 230, 95, 70, 110])
            rf_table.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#475569")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 8),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
                ("PADDING", (0, 0), (-1, -1), 3),
            ]))
            story.append(rf_table)
        else:
            story.append(Paragraph("No severe individual risk factor exceeded alert threshold.", body_style))
        story.append(Spacer(1, 8))

        # --- Section 8: Recommendations ---
        story.append(Paragraph("8. Personalized Biomechanical Conditioning & Prevention Drills", h2_style))
        if recommendations:
            rec_table_data = [["Priority", "Category", "Target Region", "Actionable Drill / Protocol", "Suggested Dose"]]
            for r in recommendations[:5]:
                rec_table_data.append([
                    r.get("priority", "MODERATE"),
                    r.get("category", "exercise").capitalize(),
                    r.get("target_region", "general"),
                    Paragraph(f"<b>{r.get('exercise', '')}</b><br/><i>Reason: {r.get('reason', '')}</i>", body_style),
                    f"{r.get('suggested_frequency', '2x/week')}<br/>{r.get('suggested_sets_reps', '')}"
                ])
            rec_table = Table(rec_table_data, colWidths=[55, 65, 80, 230, 110])
            rec_table.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0284c7")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 7.5),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
                ("PADDING", (0, 0), (-1, -1), 3),
            ]))
            story.append(rec_table)
        else:
            story.append(Paragraph("Continue baseline athletic maintenance conditioning.", body_style))
        story.append(Spacer(1, 10))

        # --- Section 9: Disclaimer ---
        story.append(Paragraph("9. Regulatory & Medical Disclaimer", h2_style))
        story.append(Paragraph(DISCLAIMER_TEXT, disclaimer_style))

        doc.build(story)
        return buffer.getvalue()

    @staticmethod
    def generate_excel_report(
        analysis_id: str,
        video_data: Dict[str, Any],
        athlete_data: Dict[str, Any],
        risk_data: Dict[str, Any],
        prediction_data: Dict[str, Any],
        biomech_summary: Dict[str, Any],
        biomech_frames: List[Dict[str, Any]],
        anomalies: List[Dict[str, Any]],
        risk_factors: List[Dict[str, Any]],
        recommendations: List[Dict[str, Any]]
    ) -> bytes:
        """
        Builds a professional 6-sheet analytical Excel workbook.
        """
        wb = openpyxl.Workbook()

        # Styles
        header_fill = PatternFill(start_color="0F172A", end_color="0F172A", fill_type="solid")
        header_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
        sub_fill = PatternFill(start_color="F1F5F9", end_color="F1F5F9", fill_type="solid")
        sub_font = Font(name="Calibri", size=10, bold=True, color="0F172A")
        thin_border = Border(
            left=Side(style="thin", color="CBD5E1"),
            right=Side(style="thin", color="CBD5E1"),
            top=Side(style="thin", color="CBD5E1"),
            bottom=Side(style="thin", color="CBD5E1")
        )

        def style_headers(ws):
            for col in range(1, ws.max_column + 1):
                cell = ws.cell(row=1, column=col)
                cell.fill = header_fill
                cell.font = header_font
                cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
            for row in ws.iter_rows(min_row=2, max_row=ws.max_row, min_col=1, max_col=ws.max_column):
                for cell in row:
                    cell.border = thin_border
                    cell.alignment = Alignment(vertical="center")
            for col in ws.columns:
                max_len = max(len(str(cell.value or "")) for cell in col)
                col_letter = get_column_letter(col[0].column)
                ws.column_dimensions[col_letter].width = max(12, min(45, max_len + 3))

        # --- Sheet 1: Summary ---
        ws_summary = wb.active
        ws_summary.title = "Summary"
        ws_summary.append(["Parameter", "Value", "Notes"])
        ws_summary.append(["Analysis ID", analysis_id, "Unique Screening Execution ID"])
        ws_summary.append(["Athlete Name", athlete_data.get("name", "N/A"), ""])
        ws_summary.append(["Sport / Position", f"{athlete_data.get('sport', 'General')} / {athlete_data.get('position', 'Athlete')}", ""])
        ws_summary.append(["Video File", video_data.get("filename", "video.mp4"), ""])
        ws_summary.append(["Overall Risk Score", f"{risk_data.get('overall_score', 0.0):.1f} / 100", "Weighted multi-factorial risk"])
        ws_summary.append(["Risk Classification", risk_data.get("risk_level", "LOW"), "LOW (0-34), MODERATE (35-59), HIGH (60-79), CRITICAL (80-100)"])
        ws_summary.append(["Model Confidence", f"{risk_data.get('confidence', 0.95)*100:.0f}%", ""])
        ws_summary.append(["Total Anomalies Detected", len(anomalies), "Outlier movements identified by Isolation Forest"])
        ws_summary.append(["Report Timestamp", datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC"), "Screening execution date"])
        style_headers(ws_summary)

        # --- Sheet 2: Frame Data ---
        ws_frames = wb.create_sheet(title="Frame Data")
        ws_frames.append(["Frame Number", "Timestamp (s)", "Knee Valgus (°)", "Left Knee (°)", "Right Knee (°)", "Left Hip (°)", "Right Hip (°)", "Trunk Lean (°)", "Knee Asym (°)"])
        for f in biomech_frames:
            angles = f.get("joint_angles", {})
            sym = f.get("symmetry", {})
            ws_frames.append([
                f.get("frame_number", 0),
                f.get("timestamp", 0.0),
                round(sym.get("knee_asymmetry_deg", 0.0) * 1.0, 1),
                angles.get("left_knee_angle", 0.0),
                angles.get("right_knee_angle", 0.0),
                angles.get("left_hip_angle", 0.0),
                angles.get("right_hip_angle", 0.0),
                angles.get("trunk_lean_angle", 0.0),
                sym.get("knee_asymmetry_deg", 0.0)
            ])
        style_headers(ws_frames)

        # --- Sheet 3: Biomechanics ---
        ws_bio = wb.create_sheet(title="Biomechanics")
        ws_bio.append(["Metric Name", "Mean (°)", "Median (°)", "Std Dev", "Min (°)", "Max (°)", "P95 (°)", "High Risk %", "Threshold"])
        for k, v in biomech_summary.items():
            if isinstance(v, dict) and "mean" in v:
                ws_bio.append([
                    k,
                    v.get("mean", 0.0),
                    v.get("median", 0.0),
                    v.get("std", 0.0),
                    v.get("min", 0.0),
                    v.get("max", 0.0),
                    v.get("p95", 0.0),
                    f"{v.get('high_risk_frame_percentage', 0.0):.1f}%",
                    str(v.get("threshold", "N/A"))
                ])
        style_headers(ws_bio)

        # --- Sheet 4: Injury Risk ---
        ws_risk = wb.create_sheet(title="Injury Risk")
        ws_risk.append(["Anatomical Category", "Risk Score (%)", "Risk Level", "Attribution Drivers"])
        ws_risk.append(["ACL / Knee", prediction_data.get("acl_risk", 0.0), "Elevated" if prediction_data.get("acl_risk", 0) > 50 else "Low", "Frontal plane valgus & knee asymmetry"])
        ws_risk.append(["Hamstring", prediction_data.get("hamstring_risk", 0.0), "Elevated" if prediction_data.get("hamstring_risk", 0) > 50 else "Low", "Pelvic asymmetry & sprint velocity"])
        ws_risk.append(["Ankle", prediction_data.get("ankle_risk", 0.0), "Elevated" if prediction_data.get("ankle_risk", 0) > 50 else "Low", "Subtalar sway & bilateral discrepancy"])
        ws_risk.append(["Shoulder", prediction_data.get("shoulder_risk", 0.0), "Elevated" if prediction_data.get("shoulder_risk", 0) > 50 else "Low", "Shoulder tilt & rotational lean"])
        ws_risk.append(["Lower Back", prediction_data.get("lower_back_risk", 0.0), "Elevated" if prediction_data.get("lower_back_risk", 0) > 50 else "Low", "Trunk lean & pelvic instability"])
        ws_risk.append(["Overuse", prediction_data.get("overuse_risk", 0.0), "Elevated" if prediction_data.get("overuse_risk", 0) > 50 else "Low", "Kinematic variability & training load"])
        style_headers(ws_risk)

        # --- Sheet 5: Anomalies ---
        ws_anom = wb.create_sheet(title="Anomalies")
        ws_anom.append(["Frame", "Timestamp (s)", "Anomaly Type", "Anomaly Score", "Severity", "Body Region", "Explanation"])
        for a in anomalies:
            ws_anom.append([
                a.get("frame", 0),
                a.get("timestamp", 0.0),
                a.get("type", "anomaly"),
                a.get("score", 0.0),
                a.get("severity", "MODERATE"),
                a.get("body_region", "knee"),
                a.get("explanation", "")
            ])
        style_headers(ws_anom)

        # --- Sheet 6: Recommendations ---
        ws_recs = wb.create_sheet(title="Recommendations")
        ws_recs.append(["Priority", "Category", "Target Region", "Exercise / Drill", "Suggested Dose", "Objective", "Trigger Reason"])
        for r in recommendations:
            ws_recs.append([
                r.get("priority", "MODERATE"),
                r.get("category", "exercise"),
                r.get("target_region", "general"),
                r.get("exercise", ""),
                f"{r.get('suggested_frequency', '')} | {r.get('suggested_sets_reps', '')}",
                r.get("expected_objective", ""),
                r.get("reason", "")
            ])
        style_headers(ws_recs)

        buffer = io.BytesIO()
        wb.save(buffer)
        return buffer.getvalue()
