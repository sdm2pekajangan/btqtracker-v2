export interface User {
  username: string;
  password?: string;
  role: 'admin' | 'guru';
  nama: string;
}

export interface Siswa {
  id: string;
  nama: string;
  kelas: string;
  jilidSaatIni?: string; // Jilid key (e.g. 'jilid1', 'alquran')
  halTerakhir?: string | number; // Last page completed
  jilid?: string; // Fallback
  halaman?: string | number; // Fallback
}

export interface Setoran {
  id: string;
  siswaId: string;
  guruId?: string;
  tanggal: string; // ISO date format "YYYY-MM-DD"
  jilid: string; // e.g. "jilid1"
  halaman: string | number;
  nilai: string | number;
  status: 'lancar' | 'perlu_ulang' | 'tidak_hadir';
  catatan?: string;
}
