export type DocumentStatus = 'Pending' | 'In Transit' | 'Received' | 'Mismatch Warning';

export interface TrackedDocument {
  id: string;
  document_number: string;
  subject: string;
  sender: string;
  destination: string;
  status: DocumentStatus;
  timestamp: Date;
}

export const SKPD_LIST = [
  "SKPD 1 - Dinas Pendidikan",
  "SKPD 2 - Dinas Kesehatan",
  "SKPD 3 - Dinas Pekerjaan Umum",
  "SKPD 4 - Dinas Sosial",
  "SKPD 5 - Dinas Perhubungan",
  "SKPD 6 - Dinas Lingkungan Hidup",
  "SKPD 7 - Dinas Kependudukan",
  "SKPD 8 - Dinas Perdagangan",
  "SKPD 9 - Dinas Pertanian",
];

export const INITIAL_DOCUMENTS: TrackedDocument[] = [
  {
    id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    document_number: "SURAT/BKAD/2026/001",
    subject: "Verifikasi Data Aset Semester I",
    sender: "BKAD",
    destination: "SKPD 1 - Dinas Pendidikan",
    status: "In Transit",
    timestamp: new Date("2026-03-05T08:30:00"),
  },
  {
    id: "b2c3d4e5-f6a7-8901-bcde-f12345678901",
    document_number: "SURAT/BKAD/2026/002",
    subject: "Rekonsiliasi Barang Milik Daerah",
    sender: "BKAD",
    destination: "SKPD 2 - Dinas Kesehatan",
    status: "Received",
    timestamp: new Date("2026-03-04T14:15:00"),
  },
  {
    id: "c3d4e5f6-a7b8-9012-cdef-123456789012",
    document_number: "SURAT/BKAD/2026/003",
    subject: "Berita Acara Penghapusan Aset",
    sender: "BKAD",
    destination: "SKPD 3 - Dinas Pekerjaan Umum",
    status: "In Transit",
    timestamp: new Date("2026-03-05T09:00:00"),
  },
  {
    id: "d4e5f6a7-b8c9-0123-defa-234567890123",
    document_number: "SURAT/BKAD/2026/004",
    subject: "Surat Perintah Inventarisasi",
    sender: "BKAD",
    destination: "SKPD 5 - Dinas Perhubungan",
    status: "Mismatch Warning",
    timestamp: new Date("2026-03-03T11:45:00"),
  },
  {
    id: "e5f6a7b8-c9d0-1234-efab-345678901234",
    document_number: "SURAT/BKAD/2026/005",
    subject: "Laporan Mutasi Aset Tetap",
    sender: "BKAD",
    destination: "SKPD 7 - Dinas Kependudukan",
    status: "Received",
    timestamp: new Date("2026-03-02T16:30:00"),
  },
];
