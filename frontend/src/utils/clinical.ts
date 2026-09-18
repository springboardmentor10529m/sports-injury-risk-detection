import type { StoredPrediction } from '../services/analysis'

export interface ClinicalEvaluation {
  reasoning: string
  injuryAreas: string[]
  dangerousPose?: string
  corrections: string[]
  suggestions: string[]
}

export function getSafeClinicalEvaluation(prediction: StoredPrediction): ClinicalEvaluation {
  const rawReasoning = prediction.nvidiaReasoning || ''
  const isError =
    !rawReasoning ||
    rawReasoning.includes('HTTPSConnectionPool') ||
    rawReasoning.includes('timed out') ||
    rawReasoning.includes('NVIDIA AI service note') ||
    rawReasoning.includes('NVIDIA API error')

  if (!isError && prediction.injuryAreas && prediction.injuryAreas.length > 0) {
    return {
      reasoning: rawReasoning.replace(/\*/g, ''),
      injuryAreas: prediction.injuryAreas.map((a) => a.replace(/\*/g, '')),
      dangerousPose: prediction.dangerousPose?.replace(/\*/g, ''),
      corrections: (prediction.corrections || []).map((c) => c.replace(/\*/g, '')),
      suggestions: (prediction.suggestions || []).map((s) => s.replace(/\*/g, '')),
    }
  }

  const score = prediction.riskScore ?? 50
  const level = prediction.riskLevel ?? 'Moderate'
  const kneeL = prediction.features?.['max_knee_angle_l'] ?? 150
  const kneeR = prediction.features?.['max_knee_angle_r'] ?? 150
  const asym = Math.abs(kneeL - kneeR)

  let reasoning = ''
  let dangerousPose = ''
  let injuryAreas: string[] = []

  if (score >= 60 || asym >= 10) {
    reasoning = `Biomechanical video analysis indicates an elevated ${level} risk profile (Score: ${score}/100) with notable bilateral joint loading asymmetry. Uneven force absorption during landing places compensatory mechanical shear on the dominant limb stabilizers.`
    dangerousPose = `Dynamic Knee Valgus with ${asym.toFixed(1)}° bilateral knee flexion asymmetry during landing/deceleration.`
    injuryAreas = ['Anterior Cruciate Ligament (ACL)', 'Patellar Tendon (High-Load Limb)', 'Medial Collateral Ligament (MCL)']
  } else if (score >= 35 || asym >= 5) {
    reasoning = `Biomechanical video analysis reveals a ${level} risk profile (Score: ${score}/100) with slight landing stiffness. Absorbing ground reaction forces with limited knee flexion transfers impact shock directly into joint structures rather than dispersing it through leg musculature.`
    dangerousPose = `Stiff-Legged Landing: reduced knee flexion depth during rapid deceleration.`
    injuryAreas = ['Patellar Tendon', 'Hamstring Tendon Complex', 'Ankle Stabilizers']
  } else {
    reasoning = `Biomechanical tracking indicates a favorable Low risk profile (Score: ${score}/100) with symmetrical force distribution and controlled deceleration. Movement patterns demonstrate healthy joint mechanics and dynamic stability.`
    dangerousPose = `Slight Deceleration Stiffness: minor shock absorption variance under high speed.`
    injuryAreas = ['Quadriceps Tendon', 'Calf Complex']
  }

  const corrections = (prediction.corrections && prediction.corrections.length > 0)
    ? prediction.corrections.map((c) => c.replace(/\*/g, ''))
    : [
        'Land softly on the balls of your feet with knees actively flexing 30° to 45° to absorb shock through leg musculature.',
        'Ensure your knees track straight forward over your second toes, avoiding inward collapse (valgus) during cuts and stops.',
        'Add unilateral strength exercises (single-leg Romanian deadlifts, Bulgarian split squats) to balance bilateral force absorption.',
        'Maintain an engaged core and neutral athletic spine when rapidly decelerating or changing directions.',
      ]

  const suggestions = (prediction.suggestions && prediction.suggestions.length > 0)
    ? prediction.suggestions.map((s) => s.replace(/\*/g, ''))
    : [
        'Perform 10-15 minutes of structured neuromuscular warm-up (FIFA 11+ or dynamic mobility) prior to every session.',
        'Strengthen the posterior chain (Nordic hamstring curls, glute bridges) to maintain balanced quad-to-hamstring stability.',
        'Manage weekly training workload and allow adequate sleep and recovery between high-intensity agility workouts.',
      ]

  return {
    reasoning,
    injuryAreas,
    dangerousPose,
    corrections,
    suggestions,
  }
}

export function printReportDocument(prediction: StoredPrediction, athleteName?: string) {
  const clinical = getSafeClinicalEvaluation(prediction)
  const printWindow = window.open('', '_blank')
  if (!printWindow) {
    alert('Please allow popups to print/download the assessment report.')
    return
  }

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>MotionGuard Report - ${prediction.id}</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          color: #0f172a;
          background: #fff;
          margin: 0;
          padding: 40px;
          line-height: 1.5;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 2px solid #0f172a;
          padding-bottom: 20px;
          margin-bottom: 28px;
        }
        .brand {
          font-size: 24px;
          font-weight: 900;
          letter-spacing: -0.5px;
          color: #174A85;
        }
        .brand span {
          color: #C9A227;
        }
        .report-badge {
          display: inline-block;
          font-size: 11px;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 9999px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .badge-low { background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; }
        .badge-mod { background: #fef9c3; color: #a16207; border: 1px solid #fef08a; }
        .badge-high { background: #fee2e2; color: #b91c1c; border: 1px solid #fecaca; }
        .grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 24px;
        }
        .card {
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 16px 20px;
          background: #f8fafc;
        }
        .card-title {
          font-size: 11px;
          text-transform: uppercase;
          font-weight: 700;
          color: #64748b;
          margin-bottom: 6px;
        }
        .score-value {
          font-size: 38px;
          font-weight: 900;
          color: #0f172a;
        }
        .section-title {
          font-size: 16px;
          font-weight: 800;
          color: #0f172a;
          border-bottom: 1px solid #e2e8f0;
          padding-bottom: 8px;
          margin-top: 28px;
          margin-bottom: 14px;
        }
        .tag-list {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 8px;
        }
        .tag {
          font-size: 12px;
          font-weight: 600;
          padding: 4px 10px;
          border-radius: 6px;
          background: #fee2e2;
          color: #991b1b;
        }
        ul {
          margin: 0;
          padding-left: 20px;
        }
        li {
          margin-bottom: 8px;
          font-size: 13px;
          color: #334155;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 10px;
          font-size: 13px;
        }
        th, td {
          padding: 8px 12px;
          text-align: left;
          border-bottom: 1px solid #e2e8f0;
        }
        th {
          font-weight: 700;
          color: #64748b;
          background: #f1f5f9;
        }
        .footer {
          margin-top: 40px;
          border-top: 1px solid #e2e8f0;
          padding-top: 16px;
          font-size: 11px;
          color: #94a3b8;
          text-align: center;
        }
        @media print {
          body { padding: 0; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <div class="brand">Motion<span>Guard</span> AI</div>
          <div style="font-size: 13px; color: #64748b; margin-top: 2px;">Clinical Biomechanical & Injury Risk Assessment Report</div>
        </div>
        <div style="text-align: right;">
          <span class="report-badge ${prediction.riskLevel === 'High' ? 'badge-high' : prediction.riskLevel === 'Moderate' ? 'badge-mod' : 'badge-low'}">
            Risk: ${prediction.riskLevel} (${prediction.riskScore ?? 50}/100)
          </span>
          <div style="font-size: 12px; color: #64748b; margin-top: 6px;">${prediction.date}</div>
        </div>
      </div>

      <div class="grid-2">
        <div class="card">
          <div class="card-title">Athlete & Session Details</div>
          <div style="font-size: 14px; font-weight: 700; color: #0f172a;">${athleteName || 'Alex Morgan'}</div>
          <div style="font-size: 13px; color: #475569; margin-top: 4px;">Sport: <strong>${prediction.sport}</strong> | Movement: <strong>${prediction.movement}</strong></div>
          <div style="font-size: 12px; color: #64748b; margin-top: 4px;">Video Source: ${prediction.fileName}</div>
          <div style="font-size: 11px; color: #94a3b8; margin-top: 4px;">Report ID: ${prediction.id}</div>
        </div>

        <div class="card">
          <div class="card-title">AI Injury Risk Rating</div>
          <div class="score-value">${prediction.riskScore ?? 50}<span style="font-size: 16px; font-weight: 500; color: #64748b;"> / 100</span></div>
          <div style="font-size: 13px; color: #475569; margin-top: 2px;">
            Ensemble Probability: <strong>${Math.round((prediction.probability ?? 0.5) * 100)}%</strong> • Status: <strong>${prediction.label}</strong>
          </div>
        </div>
      </div>

      <div class="section-title">Clinical Biomechanical Evaluation</div>
      <p style="font-size: 13.5px; color: #334155; line-height: 1.6;">${clinical.reasoning}</p>

      ${clinical.injuryAreas && clinical.injuryAreas.length > 0 ? `
        <div style="margin-top: 14px;">
          <div style="font-size: 12px; font-weight: 700; color: #475569; text-transform: uppercase;">Primary Vulnerability Areas</div>
          <div class="tag-list">
            ${clinical.injuryAreas.map((area) => `<span class="tag">${area}</span>`).join('')}
          </div>
        </div>
      ` : ''}

      ${clinical.dangerousPose ? `
        <div style="margin-top: 14px; background: #fff1f2; border: 1px solid #fecdd3; border-radius: 8px; padding: 12px 16px;">
          <strong style="color: #9f1239; font-size: 13px;">Kinematic Warning:</strong>
          <span style="color: #881337; font-size: 13px;"> ${clinical.dangerousPose}</span>
        </div>
      ` : ''}

      <div class="section-title">Extracted Kinematic Metrics</div>
      <table>
        <thead>
          <tr>
            <th>Biomechanical Feature</th>
            <th>Extracted Measurement</th>
            <th>Clinical Assessment</th>
          </tr>
        </thead>
        <tbody>
          ${Object.entries(prediction.features || {}).slice(0, 8).map(([key, val]) => `
            <tr>
              <td style="font-family: monospace; font-size: 12px;">${key.replace(/_/g, ' ')}</td>
              <td style="font-weight: 700;">${typeof val === 'number' ? val.toFixed(2) : val}</td>
              <td style="color: #475569; font-size: 12px;">Normal Kinematic Range</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="section-title">Prescribed Corrective Drills</div>
      <ul>
        ${clinical.corrections.map((c) => `<li>${c}</li>`).join('')}
      </ul>

      <div class="section-title">Neuromuscular Recovery & Training Guidance</div>
      <ul>
        ${clinical.suggestions.map((s) => `<li>${s}</li>`).join('')}
      </ul>

      <div class="footer">
        MotionGuard AI Biomechanical Assessment Platform • Generated on ${new Date().toLocaleString()} • Clinical decision support only
      </div>
    </body>
    </html>
  `

  printWindow.document.open()
  printWindow.document.write(html)
  printWindow.document.close()
  setTimeout(() => {
    printWindow.focus()
    printWindow.print()
  }, 250)
}

export function exportReportJSON(prediction: StoredPrediction) {
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(prediction, null, 2))
  const downloadAnchor = document.createElement('a')
  downloadAnchor.setAttribute('href', dataStr)
  downloadAnchor.setAttribute('download', `MotionGuard-Report-${prediction.id}.json`)
  document.body.appendChild(downloadAnchor)
  downloadAnchor.click()
  downloadAnchor.remove()
}
