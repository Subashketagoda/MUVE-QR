import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import fs from 'fs'
import path from 'path'

const doc = new jsPDF({
  orientation: 'portrait',
  unit: 'mm',
  format: 'a4',
})

const pageWidth = doc.internal.pageSize.getWidth()
const pageHeight = doc.internal.pageSize.getHeight()
const margin = 14
const contentWidth = pageWidth - margin * 2

const primaryColor = [15, 23, 42] // #0F172A Slate 900
const accentColor = [37, 99, 235] // #2563EB Blue 600
const textColor = [51, 65, 85] // #334155 Slate 700
const mutedColor = [100, 116, 139] // #64748B Slate 500
const lightBg = [248, 250, 252] // #F8FAFC Slate 50

let currentY = 16

function checkPageBreak(spaceNeeded) {
  if (currentY + spaceNeeded > pageHeight - 20) {
    doc.addPage()
    currentY = 20
    drawHeaderBar()
  }
}

function drawHeaderBar() {
  doc.setFillColor(accentColor[0], accentColor[1], accentColor[2])
  doc.rect(margin, 10, contentWidth, 1.5, 'F')
}

// ================= PAGE 1 =================
// Top Header
doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2])
doc.roundedRect(margin, currentY, contentWidth, 26, 3, 3, 'F')

doc.setTextColor(255, 255, 255)
doc.setFont('helvetica', 'bold')
doc.setFontSize(18)
doc.text('MUVE QR', margin + 8, currentY + 11)

doc.setFont('helvetica', 'normal')
doc.setFontSize(10)
doc.setTextColor(191, 219, 254) // #BFDBFE
doc.text('Smart Security Patrol & Facility Guard Tour Management System', margin + 8, currentY + 18)

doc.setFontSize(8)
doc.setTextColor(148, 163, 184)
doc.text('SYSTEM CAPABILITIES & SPECIFICATION OVERVIEW', pageWidth - margin - 8, currentY + 11, { align: 'right' })
doc.text('FOR MANAGEMENT & OPERATIONS REVIEW', pageWidth - margin - 8, currentY + 18, { align: 'right' })

currentY += 34

// Section: Executive Summary
doc.setFont('helvetica', 'bold')
doc.setFontSize(13)
doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
doc.text('1. Executive Summary', margin, currentY)
currentY += 6

doc.setFont('helvetica', 'normal')
doc.setFontSize(9.5)
doc.setTextColor(textColor[0], textColor[1], textColor[2])
const summaryText =
  'MUVE QR is an enterprise-grade digital guard tour tracking, facility inspection, and emergency dispatch management platform. It replaces outdated paper logbooks and legacy RFID baton hardware with an intelligent, cloud-connected mobile web solution that guarantees real-time guard accountability, incident documentation, and rapid emergency response.'
const splitSummary = doc.splitTextToSize(summaryText, contentWidth)
doc.text(splitSummary, margin, currentY)
currentY += splitSummary.length * 5 + 4

// Section: Mobile Field Operations
doc.setFont('helvetica', 'bold')
doc.setFontSize(13)
doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
doc.text('2. Security Guard Mobile Application (Field Operations)', margin, currentY)
currentY += 6

const mobileFeatures = [
  {
    title: 'A. Next Checkpoint Guidance (Hero Tour Navigator)',
    points: [
      'Giant Pending Checkpoint Card: Displays the exact next checkpoint to patrol (e.g., 01st Floor - Ladies Washroom), eliminating missed checkpoints.',
      'Tour Progress Indicator: Live visual gauge (e.g., 8 / 10 Points Completed) showing real-time patrol tour completion percentage.',
      'One-Tap Scan Trigger: Prominently placed on the mobile home screen for quick scanning without navigating menus.',
    ],
  },
  {
    title: 'B. High-Speed QR Checkpoint Scanner',
    points: [
      'Built-in Flashlight & Camera Scanner: Rapid QR scanning in dark basements, stairwells, and night patrols.',
      'Haptic Vibration Feedback: Tactile confirmation on successful scans.',
      'GPS Geolocation Tagging: Captures exact device coordinates per scan to prevent off-site check-in fraud.',
      'Anti-Spoof Token Verification: Cryptographically secured QR tokens prevent reproduction from photographs.',
    ],
  },
  {
    title: 'C. Tactical Emergency SOS & Panic Dispatch System',
    points: [
      '5-Second Safety Hold Activation: Requires holding the SOS button for 5 seconds with a live circular progress countdown to eliminate accidental pocket presses.',
      'Dual-Tone Tactical Siren Engine: Multi-oscillator emergency alarm (540Hz - 1180Hz rapid frequency sweep + dissonant alarm + sub-bass pulses) engineered via Web Audio API without requiring audio downloads.',
      'Hardware Vibration Engine: Aggressive pulsing vibration alerts nearby personnel in stealth or high-noise situations.',
      'Live GPS Emergency Broadcast: Coordinates are immediately dispatched to Headquarters and the Admin Operations Center.',
      'Full-Screen Strobe Alert & Hotlines: Flashing emergency overlay with one-tap calling to 119 (Police) and 1990 (Ambulance).',
    ],
  },
  {
    title: 'D. Mobile Incident & Hazard Reporting',
    points: [
      'Live Camera Evidence Attachment: Guards take photos of broken locks, water leaks, or safety hazards directly from their device.',
      'Auto Image Compression: Client-side optimization ensures instant upload even on low-speed 3G/4G connections.',
      'Categorization & Severity: Tagged as Security, Fire Safety, Maintenance, Medical, or Hazard with Low/Medium/High/Critical ratings.',
      'Guard Incident History: Guards can review previously submitted reports and resolution statuses.',
    ],
  },
  {
    title: 'E. Task Checklist & PWA Support',
    points: [
      'Daily Routine Checklist: Real-time digital tasks (e.g., verify fire extinguishers, test emergency exit doors).',
      'Progressive Web App (PWA): Installable on Android and iOS devices via "Add to Home Screen" without App Store delays.',
      'Offline Service Worker Support: Offline caching ensures continuous UI and emergency operation during signal loss.',
    ],
  },
]

for (const group of mobileFeatures) {
  checkPageBreak(24)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10.5)
  doc.setTextColor(accentColor[0], accentColor[1], accentColor[2])
  doc.text(group.title, margin, currentY)
  currentY += 5

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(textColor[0], textColor[1], textColor[2])

  for (const pt of group.points) {
    checkPageBreak(12)
    const bullet = '• ' + pt
    const splitPt = doc.splitTextToSize(bullet, contentWidth - 4)
    doc.text(splitPt, margin + 4, currentY)
    currentY += splitPt.length * 4.5
  }
  currentY += 3
}

// ================= ADMIN COMMAND CENTER =================
checkPageBreak(30)
doc.setFont('helvetica', 'bold')
doc.setFontSize(13)
doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
doc.text('3. Admin Command Center & Headquarters Dashboard', margin, currentY)
currentY += 6

const adminFeatures = [
  {
    title: 'A. Real-Time Operations & Live Feed',
    points: [
      'Executive KPI Counters: Live counts of Total Scans Today, Active Guards on Duty, Pending Checkpoints, and Open Incidents.',
      'Live Scans Stream: Real-time incoming feed showing guard name, checkpoint location, exact timestamp, and GPS coordinates.',
    ],
  },
  {
    title: 'B. Incident Operations Center (/admin/incidents)',
    points: [
      'Audible Alarm in Admin Room: Plays a siren on the supervisor computer immediately upon an SOS trigger or critical incident.',
      'Evidence Photo Viewer: Full-resolution modal for reviewing photos uploaded by field guards.',
      'Status & Action Logging: Full incident lifecycle management (Open -> In Progress -> Resolved) with supervisor resolution notes.',
      'Audit CSV Export: One-click export of incident reports for security audits, insurance claims, and client compliance.',
    ],
  },
  {
    title: 'C. QR Code & Checkpoint Management',
    points: [
      'Multi-Zone Hierarchy: Organize checkpoints by Building, Floor, Zone, and Description.',
      'Printable Batch QR Sheets: Generates crisp, branded QR codes ready for printing and physical mounting.',
      'Dynamic Token Rotation: Regulate and rotate checkpoint security tokens at any time.',
    ],
  },
  {
    title: 'D. Guard Performance & Accountability Analytics',
    points: [
      'Tour Completion Tracking: Pinpoints missed checkpoints, patrol lapses, and incomplete tours.',
      'Patrol Punctuality & Duration: Tracks time elapsed between checkpoints to prevent rushing or patrol skipping.',
    ],
  },
  {
    title: 'E. User Management & Access Control (RBAC)',
    points: [
      'Role Permissions: Strict separation between Administrators (HQ control, reports) and Officers/Guards (mobile patrol only).',
      'Audit Trail: Immutable timestamped log of all patrol activities, logins, and system changes.',
      'Management Reports: Generate daily, weekly, and monthly summaries with CSV/PDF export.',
    ],
  },
]

for (const group of adminFeatures) {
  checkPageBreak(22)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10.5)
  doc.setTextColor(accentColor[0], accentColor[1], accentColor[2])
  doc.text(group.title, margin, currentY)
  currentY += 5

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(textColor[0], textColor[1], textColor[2])

  for (const pt of group.points) {
    checkPageBreak(12)
    const bullet = '• ' + pt
    const splitPt = doc.splitTextToSize(bullet, contentWidth - 4)
    doc.text(splitPt, margin + 4, currentY)
    currentY += splitPt.length * 4.5
  }
  currentY += 3
}

// ================= BUSINESS BENEFITS TABLE =================
checkPageBreak(50)
doc.setFont('helvetica', 'bold')
doc.setFontSize(13)
doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
doc.text('4. Key Business Benefits for the Organization', margin, currentY)
currentY += 6

autoTable(doc, {
  startY: currentY,
  margin: { left: margin, right: margin },
  head: [['Key Benefit', 'How MUVE QR Delivers']],
  body: [
    [
      '100% Guard Accountability',
      'Eliminates falsified paper logbooks. Every checkpoint scan is cryptographically signed with GPS coordinates and tamper-resistant timestamps.',
    ],
    [
      'Zero Dedicated Hardware Cost',
      'Runs on guards\' existing Android or iOS smartphones. No expensive proprietary batons, RFID wands, or docking stations required.',
    ],
    [
      'Officer Life Safety & Panic Response',
      '5-second hold SOS button with loud dual-tone emergency siren and instant GPS broadcast ensures rapid backup during attacks or medical emergencies.',
    ],
    [
      'Real-Time Facility Maintenance',
      'Hazards, leaks, and damages are photographed and flagged immediately, minimizing facility downtime and property liability.',
    ],
    [
      'Client Transparency & SLA Proof',
      'Instantly generate verified PDF and CSV reports to prove contractual security SLA compliance to property owners and auditors.',
    ],
  ],
  theme: 'grid',
  headStyles: {
    fillColor: [15, 23, 42],
    textColor: [255, 255, 255],
    fontSize: 9.5,
    fontStyle: 'bold',
    halign: 'left',
  },
  bodyStyles: {
    fontSize: 8.5,
    textColor: [51, 65, 85],
    lineColor: [226, 232, 240],
  },
  columnStyles: {
    0: { cellWidth: 55, fontStyle: 'bold', textColor: [37, 99, 235] },
    1: { cellWidth: contentWidth - 55 },
  },
})

// Footer & Page Numbers
const totalPages = doc.internal.getNumberOfPages()
for (let i = 1; i <= totalPages; i++) {
  doc.setPage(i)
  doc.setDrawColor(226, 232, 240)
  doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2])
  doc.text('MUVE QR System Overview  |  Confidential - For Office Review', margin, pageHeight - 7)
  doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 7, { align: 'right' })
}

// Ensure output directories exist
const pdfBuffer = Buffer.from(doc.output('arraybuffer'))

// 1. Project Root
const rootPath = path.resolve('MUVE_QR_System_Overview.pdf')
fs.writeFileSync(rootPath, pdfBuffer)

// 2. Public folder (for web access/download)
const publicPath = path.resolve('public', 'MUVE_QR_System_Overview.pdf')
fs.writeFileSync(publicPath, pdfBuffer)

// 3. User's Windows Desktop
const desktopPath = path.resolve('C:\\Users\\User\\Desktop\\MUVE_QR_System_Overview.pdf')
fs.writeFileSync(desktopPath, pdfBuffer)

console.log('PDF Generated Successfully!')
console.log('Saved to:', rootPath)
console.log('Saved to:', publicPath)
console.log('Saved to:', desktopPath)
