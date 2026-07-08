/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  school?: string
  user?: string
  priority?: string
  subject?: string
  message?: string
  time?: string
}

const brand = {
  bg: '#F4F5FB',
  card: '#ffffff',
  primary: '#5B6CF9',
  text: '#0b1020',
  muted: '#64748b',
}

export function AdminSupportTicketEmail({
  school = '-', user = '-', priority = 'normal',
  subject = '-', message = '-', time = '-',
}: Props) {
  return (
    <Html>
      <Head />
      <Preview>Tiket Bantuan Baru dari {school}</Preview>
      <Body style={{ backgroundColor: brand.bg, fontFamily: 'Inter, Arial, sans-serif', margin: 0, padding: '24px 0' }}>
        <Container style={{ maxWidth: 560, margin: '0 auto', padding: '0 16px' }}>
          <Section style={{ backgroundColor: brand.card, borderRadius: 16, padding: 28, boxShadow: '0 4px 16px rgba(15,23,42,0.06)' }}>
            <div style={{ display: 'inline-block', backgroundColor: brand.primary, color: '#fff', padding: '6px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600, marginBottom: 14 }}>
              Tiket Bantuan Baru
            </div>
            <Heading style={{ fontSize: 20, margin: '0 0 18px', color: brand.text }}>{subject}</Heading>

            <table style={{ width: '100%', fontSize: 13, color: '#334155', borderCollapse: 'collapse' }}>
              <tbody>
                <tr><td style={{ padding: '6px 0', color: brand.muted, width: 100 }}>Sekolah</td><td style={{ padding: '6px 0', fontWeight: 600 }}>{school}</td></tr>
                <tr><td style={{ padding: '6px 0', color: brand.muted }}>Pengirim</td><td style={{ padding: '6px 0', fontWeight: 600 }}>{user}</td></tr>
                <tr><td style={{ padding: '6px 0', color: brand.muted }}>Prioritas</td><td style={{ padding: '6px 0', fontWeight: 600, textTransform: 'capitalize' }}>{priority}</td></tr>
                <tr><td style={{ padding: '6px 0', color: brand.muted }}>Waktu</td><td style={{ padding: '6px 0' }}>{time}</td></tr>
              </tbody>
            </table>

            <Section style={{ marginTop: 18, padding: 14, backgroundColor: brand.bg, borderRadius: 10 }}>
              <Text style={{ fontSize: 13, lineHeight: '1.55', color: brand.text, margin: 0, whiteSpace: 'pre-wrap' }}>{message}</Text>
            </Section>

            <Hr style={{ borderColor: '#e2e8f0', margin: '22px 0 12px' }} />
            <Text style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>
              Notifikasi otomatis dari ATSkolla. Buka Super Admin › Tiket Bantuan untuk membalas.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export const template: TemplateEntry = {
  component: AdminSupportTicketEmail,
  subject: (d: Props) => `Tiket Bantuan Baru — ${d?.school || 'ATSkolla'}`,
  displayName: 'Notifikasi Super Admin: Tiket Bantuan',
  previewData: {
    school: 'SDN 1 Jakarta',
    user: 'Budi Santoso',
    priority: 'high',
    subject: 'Tidak bisa scan QR',
    message: 'Halo tim, scanner QR kami tidak merespon sejak pagi. Mohon dibantu.',
    time: new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }),
  },
}
