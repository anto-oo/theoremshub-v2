import { jsPDF } from 'jspdf'

export interface InventoryPdfItem {
  name: string
  quantity: number
}

export interface InventoryPdfData {
  name: string
  className: string
  event: string
  date: string
  time: string
  referentName: string
}

export interface InventoryPdfSettings {
  logoLeftUrl: string
  logoRightUrl: string
  footerLabel: string
}

const LS_KEYS = {
  logoLeft: 'inventory-pdf-logo-left',
  logoRight: 'inventory-pdf-logo-right',
  footer: 'inventory-pdf-footer',
} as const

// ponytail: localStorage instead of an inventory_settings table — enough for logo URLs + footer label
export function loadPdfSettings(): InventoryPdfSettings {
  try {
    return {
      logoLeftUrl: localStorage.getItem(LS_KEYS.logoLeft) ?? '',
      logoRightUrl: localStorage.getItem(LS_KEYS.logoRight) ?? '',
      footerLabel: localStorage.getItem(LS_KEYS.footer) ?? '',
    }
  } catch {
    return { logoLeftUrl: '', logoRightUrl: '', footerLabel: '' }
  }
}

export function savePdfSettings(s: InventoryPdfSettings): void {
  try {
    localStorage.setItem(LS_KEYS.logoLeft, s.logoLeftUrl)
    localStorage.setItem(LS_KEYS.logoRight, s.logoRightUrl)
    localStorage.setItem(LS_KEYS.footer, s.footerLabel)
  } catch {
    // private mode etc. — settings just don't persist
  }
}

async function loadImage(url: string): Promise<string | null> {
  try {
    const response = await fetch(url)
    if (!response.ok) return null
    const blob = await response.blob()
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

export async function generateInventoryPdf(
  items: InventoryPdfItem[],
  data: InventoryPdfData,
  settings: InventoryPdfSettings,
): Promise<void> {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 14
  const contentWidth = pageWidth - margin * 2
  let y = 14

  const [logoLeftData, logoRightData] = await Promise.all([
    settings.logoLeftUrl ? loadImage(settings.logoLeftUrl) : null,
    settings.logoRightUrl ? loadImage(settings.logoRightUrl) : null,
  ])

  // === Header ===
  const logoHeight = 20
  const logoWidth = 30
  if (logoLeftData) {
    try {
      doc.addImage(logoLeftData, 'PNG', margin, y, logoWidth, logoHeight)
    } catch {
      // ignore undecodable images
    }
  }
  if (logoRightData) {
    try {
      doc.addImage(logoRightData, 'PNG', pageWidth - margin - logoWidth, y, logoWidth, logoHeight)
    } catch {
      // ignore undecodable images
    }
  }
  y += logoHeight + 4

  doc.setDrawColor(180, 180, 180)
  doc.line(margin, y, margin + contentWidth, y)
  y += 8

  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(30, 30, 30)
  doc.text(`Nome: ${data.name}`, margin, y)
  doc.text(`Classe: ${data.className}`, pageWidth / 2 + 10, y)
  y += 7

  doc.text(`Evento: ${data.event}`, margin, y)
  doc.text(`Data: ${data.date}`, pageWidth / 2 - 20, y)
  doc.text(`Ora: ${data.time}`, pageWidth - margin - 20, y)
  y += 7

  doc.text(`Referente: ${data.referentName}`, margin, y)
  y += 12

  // === Items list ===
  const checkboxSize = 4
  const itemColWidth = contentWidth * 0.65
  const rowHeight = 7

  doc.setFillColor(40, 40, 50)
  doc.rect(margin, y, contentWidth, 8, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.text('Oggetto', margin + 3, y + 5.5)
  doc.text('#', margin + itemColWidth + 3, y + 5.5)
  y += 8

  items.forEach((item, idx) => {
    if (y + rowHeight > pageHeight - 40) {
      doc.addPage()
      y = 14
    }

    if (idx % 2 === 0) {
      doc.setFillColor(245, 245, 248)
      doc.rect(margin, y, contentWidth, rowHeight, 'F')
    }

    doc.setDrawColor(150, 150, 150)
    doc.rect(margin + 2, y + 1.5, checkboxSize, checkboxSize)

    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(30, 30, 30)
    doc.text(item.name, margin + checkboxSize + 6, y + 5, { maxWidth: itemColWidth - checkboxSize - 10 })

    doc.setTextColor(100, 100, 100)
    doc.text(`___/${item.quantity}`, margin + itemColWidth + 3, y + 5)

    y += rowHeight
    doc.setDrawColor(220, 220, 220)
    doc.line(margin, y, margin + contentWidth, y)
  })

  y += 12

  // === Footer ===
  if (y + 50 > pageHeight - 14) {
    doc.addPage()
    y = 14
  }

  const printDateTime = new Date().toLocaleString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(80, 80, 80)
  doc.text(printDateTime, margin, y)
  y += 14

  const sigLabelWidth = contentWidth / 3
  doc.setFontSize(9)
  doc.setTextColor(30, 30, 30)

  doc.text(`${data.name}/${data.className}`, margin + 2, y, { maxWidth: sigLabelWidth - 4 })
  doc.text(data.referentName, margin + sigLabelWidth + 2, y, { maxWidth: sigLabelWidth - 4 })
  if (settings.footerLabel) {
    doc.text(settings.footerLabel, margin + sigLabelWidth * 2 + 2, y, { maxWidth: sigLabelWidth - 4 })
  }
  y += 12

  doc.setDrawColor(100, 100, 100)
  doc.line(margin + 2, y, margin + sigLabelWidth - 4, y)
  doc.line(margin + sigLabelWidth + 2, y, margin + sigLabelWidth * 2 - 4, y)
  doc.line(margin + sigLabelWidth * 2 + 2, y, margin + contentWidth - 2, y)

  doc.save('inventario.pdf')
}
