import jsPDF from 'jspdf'

export interface PdfAssignment {
  memberName: string
  roleName: string
}

export interface PdfSong {
  position: number
  title: string
  artist: string
  durationSeconds?: number | null | undefined
  assignments: PdfAssignment[]
}

const formatDuration = (seconds: number): string => {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

const formatTotal = (seconds: number): string => {
  const totalMinutes = Math.floor(seconds / 60)
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  return h > 0 ? `${h}h ${m}m` : `${m} min`
}

// ponytail: fixed landscape table layout, dynamic role columns only for used roles
export function generateSetlistPdf(data: { name: string; songs: PdfSong[]; totalSeconds: number }): void {
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
  doc.text(`${data.songs.length} songs  •  Total: ${formatTotal(data.totalSeconds)}`, margin, y)
  y += 6

  const usedRoles = [...new Set(data.songs.flatMap((s) => s.assignments.map((a) => a.roleName)))]

  const colDefs = [
    { label: '#', width: 8 },
    { label: 'Title', width: 0 },
    { label: 'Artist', width: 40 },
    { label: 'Duration', width: 18 },
    ...usedRoles.map((r) => ({ label: r, width: 22 })),
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

  drawHeader()

  data.songs.forEach((song, idx) => {
    const byRole: Record<string, string[]> = {}
    for (const r of usedRoles) {
      byRole[r] = song.assignments.filter((a) => a.roleName === r).map((a) => a.memberName)
    }
    const maxLines = Math.max(1, ...usedRoles.map((r) => byRole[r].length))
    const thisRowHeight = Math.max(rowHeight, maxLines * 4.5 + 3)

    if (y + thisRowHeight > pageHeight - 14) {
      doc.addPage()
      y = 14
      drawHeader()
    }

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
    usedRoles.forEach((r, i) => {
      byRole[r].forEach((name, ni) => {
        doc.text(name, x + 2, y + 4.5 + ni * 4.5, { maxWidth: colDefs[4 + i].width - 4 })
      })
      x += colDefs[4 + i].width
    })

    y += thisRowHeight
    doc.setDrawColor(220, 220, 220)
    doc.line(margin, y, margin + contentWidth, y)
  })

  doc.setFontSize(7)
  doc.setTextColor(160, 160, 160)
  doc.text(`Generated on ${new Date().toLocaleDateString()}`, margin, pageHeight - 8)

  doc.save(`${data.name.replace(/[^a-zA-Z0-9]/g, '_')}_setlist.pdf`)
}
