import { jsPDF } from 'jspdf'

export interface SetlistPdfAssignment {
  memberName: string
  instrument: string
}

export interface SetlistPdfSong {
  position: number
  title: string
  artist: string
  durationSeconds?: number | null | undefined
  assignments: SetlistPdfAssignment[]
}

// ponytail: plain jsPDF table, no autotable dep — add when layout needs grow
export function exportSetlistPdf(data: {
  name: string
  description?: string | null
  eventDate?: string | null
  songs: SetlistPdfSong[]
  totalSeconds: number
}): void {
  const formatDuration = (totalSeconds: number): string => {
    const m = Math.floor(totalSeconds / 60)
    const s = Math.floor(totalSeconds % 60)
    return `${m}:${String(s).padStart(2, '0')}`
  }
  const formatTotal = (totalSeconds: number): string => {
    const totalMinutes = Math.floor(totalSeconds / 60)
    const h = Math.floor(totalMinutes / 60)
    const m = totalMinutes % 60
    return h > 0 ? `${h}h ${m}m` : `${m} min`
  }

  const doc = new jsPDF({ orientation: 'landscape' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 12
  const contentWidth = pageWidth - margin * 2
  let y = 16

  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text(data.name, margin, y)
  y += 7

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(120, 120, 120)
  const infoParts = [`${data.songs.length} brani`, `Totale: ${formatTotal(data.totalSeconds)}`]
  if (data.eventDate) infoParts.unshift(`Data: ${data.eventDate}`)
  doc.text(infoParts.join('  •  '), margin, y)
  if (data.description) {
    y += 4
    doc.text(data.description, margin, y, { maxWidth: contentWidth })
  }
  y += 6

  const usedInstruments = [...new Set(data.songs.flatMap((s) => s.assignments.map((a) => a.instrument)))]

  const colDefs = [
    { label: '#', width: 8 },
    { label: 'Titolo', width: 0 },
    { label: 'Artista', width: 40 },
    { label: 'Durata', width: 18 },
    ...usedInstruments.map((inst) => ({ label: inst, width: 22 })),
  ]
  const fixedWidth = colDefs.reduce((s, c) => s + c.width, 0)
  colDefs[1].width = contentWidth - fixedWidth
  const rowHeight = 7
  const headerHeight = 8

  const drawHeader = (): void => {
    doc.setFillColor(40, 40, 50)
    doc.rect(margin, y, contentWidth, headerHeight, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')
    let x = margin
    for (const col of colDefs) {
      doc.text(col.label, x + 2, y + 5.5)
      x += col.width
    }
    y += headerHeight
  }

  const checkPageBreak = (needed: number): void => {
    if (y + needed > pageHeight - 14) {
      doc.addPage()
      y = 14
      drawHeader()
    }
  }

  drawHeader()

  data.songs.forEach((song, idx) => {
    const byInstrument = new Map(usedInstruments.map((inst) => [inst, song.assignments.filter((a) => a.instrument === inst).map((a) => a.memberName)]))
    const maxLines = Math.max(1, ...usedInstruments.map((inst) => byInstrument.get(inst)?.length ?? 1))
    const thisRowHeight = Math.max(rowHeight, maxLines * 4.5 + 3)
    checkPageBreak(thisRowHeight)
    if (idx % 2 === 0) {
      doc.setFillColor(245, 245, 248)
      doc.rect(margin, y, contentWidth, thisRowHeight, 'F')
    }

    doc.setFontSize(7)
    let x = margin
    doc.setTextColor(100, 100, 100)
    doc.setFont('helvetica', 'normal')
    doc.text(`${song.position}`, x + 2, y + 4.5)
    x += colDefs[0].width
    doc.setTextColor(30, 30, 30)
    doc.setFont('helvetica', 'bold')
    doc.text(song.title, x + 2, y + 4.5, { maxWidth: colDefs[1].width - 4 })
    x += colDefs[1].width
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(80, 80, 80)
    doc.text(song.artist, x + 2, y + 4.5, { maxWidth: colDefs[2].width - 4 })
    x += colDefs[2].width
    doc.setTextColor(100, 100, 100)
    doc.text(song.durationSeconds ? formatDuration(song.durationSeconds) : '-', x + 2, y + 4.5)
    x += colDefs[3].width
    doc.setFontSize(6.5)
    doc.setTextColor(50, 50, 120)
    usedInstruments.forEach((inst, i) => {
      for (const [ni, name] of (byInstrument.get(inst) ?? []).entries()) {
        doc.text(name, x + 2, y + 4.5 + ni * 4.5, { maxWidth: colDefs[4 + i].width - 4 })
      }
      x += colDefs[4 + i].width
    })
    y += thisRowHeight
    doc.setDrawColor(220, 220, 220)
    doc.line(margin, y, margin + contentWidth, y)
  })

  doc.setFontSize(7)
  doc.setTextColor(160, 160, 160)
  doc.text(`Generato il ${new Date().toLocaleDateString()}`, margin, pageHeight - 8)
  doc.save(`${data.name.replace(/[^a-zA-Z0-9]/g, '_')}_setlist.pdf`)
}
