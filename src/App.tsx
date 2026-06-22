import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  User, 
  Shield, 
  Search, 
  ArrowLeft, 
  LogOut, 
  Check, 
  Save, 
  Plus, 
  Settings, 
  AlertCircle, 
  RefreshCw, 
  Star, 
  Info, 
  TrendingUp, 
  Filter, 
  BookOpenCheck,
  ChevronRight,
  UserCheck,
  Calendar,
  Layers,
  FileText,
  AlertTriangle
} from 'lucide-react';
import { User as UserType, Siswa, Setoran } from './types';

// Default Apps Script URL provided by the user
const DEFAULT_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwd_wzJvsPwyP8_Ex6rnwUtXj4MN1dGKpPO07kziYTPR0o5_VlxWXEsx3h0L4LyBbgK4Q/exec";

const JILID_LABEL: Record<string, string> = { 
  jilid1: 'Jilid 1', 
  jilid2: 'Jilid 2', 
  jilid3: 'Jilid 3', 
  jilid4: 'Jilid 4', 
  jilid5: 'Jilid 5', 
  jilid6: 'Jilid 6', 
  alquran: "Al-Qur'an" 
};

const JILID_ICON: Record<string, string> = { 
  jilid1: '📗', 
  jilid2: '📘', 
  jilid3: '📙', 
  jilid4: '📕', 
  jilid5: '📓', 
  jilid6: '📔', 
  alquran: '📖' 
};

const JILID_WEIGHT: Record<string, number> = { 
  jilid1: 1, 
  jilid2: 2, 
  jilid3: 3, 
  jilid4: 4, 
  jilid5: 5, 
  jilid6: 6, 
  alquran: 7 
};

const STATUS_LABEL: Record<string, string> = { 
  lancar: '✅ Lancar', 
  perlu_ulang: '🔄 Mengulang', 
  tidak_hadir: '❌ Absen' 
};

const STATUS_COLOR_CLASSES: Record<string, { bg: string, text: string, border: string }> = { 
  lancar: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' }, 
  perlu_ulang: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' }, 
  tidak_hadir: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' } 
};

interface InputMassalRow {
  siswaId: string;
  nama: string;
  lastJilid: string;
  lastHalaman: string;
  lastStatus: string;
  lastTanggal: string;
  lastCatatan: string;
  lastNilai: string | number;
  jilid: string;
  halaman: string;
  nilai: number;
  status: 'lancar' | 'perlu_ulang' | 'tidak_hadir';
  catatan: string;
}

export default function App() {
  // Config & Database States
  const [scriptUrl, setScriptUrl] = useState<string>(() => {
    return localStorage.getItem('btq_script_url') || DEFAULT_SCRIPT_URL;
  });
  
  const [db, setDb] = useState<{ users: UserType[]; siswa: Siswa[]; setoran: Setoran[] }>(() => {
    const cached = localStorage.getItem('btq_cached_db');
    return cached ? JSON.parse(cached) : { users: [], siswa: [], setoran: [] };
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Screen Routing States
  // 'gate' | 'parent_leaderboard' | 'parent_detail' | 'login' | 'app'
  const [currentScreen, setCurrentScreen] = useState<'gate' | 'parent_leaderboard' | 'parent_detail' | 'login' | 'app'>('gate');
  const [loginRole, setLoginRole] = useState<'admin' | 'guru'>('guru');
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  
  // Login form fields
  const [usernameInput, setUsernameInput] = useState<string>('');
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [loginError, setLoginError] = useState<string | null>(null);

  // App Main View States
  // Admin tabs: 'dashboard' | 'siswa' | 'laporan'
  // Guru tabs: 'inputmassal'
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  // Selected entities for detail screens
  const [selectedParentSiswaId, setSelectedParentSiswaId] = useState<string | null>(null);

  // Filter States
  const [ortuKelasFilter, setOrtuKelasFilter] = useState<string>('Kelas 1');
  const [ortuSearch, setOrtuSearch] = useState<string>('');
  const [dashKelasFilter, setDashKelasFilter] = useState<string>('');
  const [siswaPageKelasFilter, setSiswaPageKelasFilter] = useState<string>('');
  const [laporanKelasFilter, setLaporanKelasFilter] = useState<string>('');
  const [laporanSearchSiswa, setLaporanSearchSiswa] = useState<string>('');

  // SCRIPT_URL Configuration Panel modal
  const [showConfigModal, setShowConfigModal] = useState<boolean>(false);
  const [editingUrlValue, setEditingUrlValue] = useState<string>(scriptUrl);

  // Add Siswa Data form state
  const [newSiswaNama, setNewSiswaNama] = useState<string>('');
  const [newSiswaKelas, setNewSiswaKelas] = useState<string>('Kelas 1');
  const [newSiswaJilid, setNewSiswaJilid] = useState<string>('jilid1');
  const [newSiswaHalaman, setNewSiswaHalaman] = useState<string>('1');
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  // Input Setoran Massal Form state
  const [imKelas, setImKelas] = useState<string>('');
  const [imTanggal, setImTanggal] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [massalRows, setMassalRows] = useState<InputMassalRow[]>([]);
  const [savingMassal, setSavingMassal] = useState<boolean>(false);

  // Synchronize with layout context
  useEffect(() => {
    muatDataDariCloud();
  }, [scriptUrl]);

  const muatDataDariCloud = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout
      
      const res = await fetch(`${scriptUrl}?action=read`, { signal: controller.signal });
      clearTimeout(timeoutId);
      
      if (!res.ok) throw new Error("Format respon tidak valid");
      const data = await res.json();
      
      const updatedDb = {
        users: data.users || [],
        siswa: data.siswa || [],
        setoran: data.setoran || []
      };
      
      setDb(updatedDb);
      localStorage.setItem('btq_cached_db', JSON.stringify(updatedDb));
    } catch (e) {
      console.error("Gagal sinkronisasi data dari Google Sheets: ", e);
      // If we have cached database, inform user we are using cache
      const cached = localStorage.getItem('btq_cached_db');
      if (cached) {
        setDb(JSON.parse(cached));
        setErrorMsg("Koneksi gagal. Menggunakan data tersimpan terakhir.");
      } else {
        setErrorMsg("Gagal memuat basis data sekolah dari Google Sheets. Silakan periksa URL Apps Script Anda.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getSetoranTerakhir = (siswaId: string): Setoran | null => {
    if (!db.setoran || db.setoran.length === 0) return null;
    const list = db.setoran
      .filter(s => String(s.siswaId || s.SiswaID || '').trim() === String(siswaId).trim())
      .sort((a, b) => {
        const dateA = a.tanggal || '';
        const dateB = b.tanggal || '';
        return dateB.localeCompare(dateA); // Descending date
      });
    return list.length ? list[0] : null;
  };

  const formatTanggalIndonesia = (tanggalMentah: string): string => {
    if (!tanggalMentah) return '—';
    try {
      const d = new Date(tanggalMentah);
      if (isNaN(d.getTime())) return tanggalMentah;
      return d.toLocaleDateString('id-ID', {
        timeZone: 'Asia/Jakarta',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (e) {
      return tanggalMentah;
    }
  };

  const hitungPersen = (jilidKey: string): number => {
    const wt = JILID_WEIGHT[jilidKey] || 0;
    return Math.round((wt / 7) * 100);
  };

  // Login handler
  const doLogin = () => {
    setLoginError(null);
    if (!usernameInput.trim() || !passwordInput.trim()) {
      setLoginError("Mohon masukkan username dan password.");
      return;
    }
    
    // Find user in database
    const user = db.users.find(
      x => String(x.username).trim() === usernameInput.trim() && 
           String(x.password || '').trim() === passwordInput.trim() && 
           x.role === loginRole
    );

    if (!user) {
      setLoginError("Username atau password salah atau peran tidak sesuai.");
      return;
    }

    setCurrentUser(user);
    setUsernameInput('');
    setPasswordInput('');
    setCurrentScreen('app');
    
    if (user.role === 'admin') {
      setActiveTab('dashboard');
    } else {
      setActiveTab('inputmassal');
      setImKelas('');
      setMassalRows([]);
    }
  };

  const doLogout = () => {
    setCurrentUser(null);
    setCurrentScreen('gate');
  };

  // Add Student Handler
  const tambahSiswa = async () => {
    setActionSuccessMessage(null);
    if (!newSiswaNama.trim()) {
      alert("Masukkan nama siswa terlebih dahulu.");
      return;
    }

    setIsLoading(true);
    const newId = 's' + Date.now();
    const rawData: Siswa = {
      id: newId,
      nama: newSiswaNama.trim(),
      kelas: newSiswaKelas,
      jilidSaatIni: newSiswaJilid,
      halTerakhir: newSiswaHalaman || '1'
    };

    // Update locally first for instantaneous feedback
    const updatedSiswa = [...db.siswa, rawData];
    setDb(prev => ({ ...prev, siswa: updatedSiswa }));

    try {
      // Post to Apps Script
      await fetch(scriptUrl, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "single",
          table: "Siswa",
          data: rawData
        })
      });
      
      setNewSiswaNama('');
      setNewSiswaHalaman('1');
      setActionSuccessMessage(`Siswa "${rawData.nama}" berhasil terdaftar di ${rawData.kelas}!`);
      
      // Delay fetching updated state
      setTimeout(() => {
        muatDataDariCloud();
      }, 1500);

    } catch (e) {
      console.error("Gagal mengirim data siswa baru:", e);
      alert("Berhasil disimpan secara lokal, namun gagal menyelaraskan ke Google Sheets.");
      setIsLoading(false);
    }
  };

  // Pre-load siswa for class bulk entry
  // CRITICAL FIX: we pre-populate the input fields (Jilid and Halaman) based on their latest history!
  const loadSiswaMassal = (kelas: string) => {
    setImKelas(kelas);
    if (!kelas) {
      setMassalRows([]);
      return;
    }

    const siswaKelas = db.siswa
      .filter(s => s.kelas === kelas)
      .sort((a, b) => a.nama.localeCompare(b.nama));

    const rows: InputMassalRow[] = siswaKelas.map(s => {
      // Get the true latest setoran record
      const lastSetoranObj = getSetoranTerakhir(s.id);
      
      // Get initial fallbacks from the Student properties
      const initialJilid = s.jilidSaatIni || s.jilid || 'jilid1';
      const initialHalaman = String(s.halTerakhir || s.halaman || '1');

      // CRITICAL LOGIC FIX: pre-fill with the student's actual last read state!
      const activeJilid = lastSetoranObj ? lastSetoranObj.jilid : initialJilid;
      const activeHalaman = lastSetoranObj ? String(lastSetoranObj.halaman) : initialHalaman;
      
      const lastStatus = lastSetoranObj ? lastSetoranObj.status : '';
      const lastTanggal = lastSetoranObj ? lastSetoranObj.tanggal : '';
      const lastCatatan = lastSetoranObj ? lastSetoranObj.catatan || '' : '';
      const lastNilai = lastSetoranObj ? lastSetoranObj.nilai || '' : '';

      return {
        siswaId: s.id,
        nama: s.nama,
        lastJilid: lastSetoranObj ? lastSetoranObj.jilid : initialJilid,
        lastHalaman: activeHalaman,
        lastStatus,
        lastTanggal,
        lastCatatan,
        lastNilai,
        // INPUT CONTROLLERS (Pre-populated statically instead of default 'jilid1' and '1'):
        jilid: activeJilid,
        halaman: activeHalaman,
        nilai: 85, // Default grade
        status: 'lancar', // Default to passed
        catatan: ''
      };
    });

    setMassalRows(rows);
  };

  // Modify individual rows in input massal state
  const handleMassalRowChange = (index: number, key: keyof InputMassalRow, value: any) => {
    const updated = [...massalRows];
    updated[index] = {
      ...updated[index],
      [key]: value
    };
    setMassalRows(updated);
  };

  // Increment page number tool
  const incrementHalaman = (index: number) => {
    const updated = [...massalRows];
    const currentVal = parseInt(updated[index].halaman, 10);
    if (!isNaN(currentVal)) {
      updated[index].halaman = String(currentVal + 1);
      setMassalRows(updated);
    }
  };

  // Bulk setoran list upload
  const simpanSetoranMassal = async () => {
    if (massalRows.length === 0) return;
    
    setSavingMassal(true);
    setIsLoading(true);

    const activeSetoranList = massalRows
      .filter(row => row.halaman.trim() !== "")
      .map(row => ({
        id: 'st' + Date.now() + Math.floor(Math.random() * 1000),
        siswaId: row.siswaId,
        guruId: currentUser?.username || 'guru',
        tanggal: imTanggal,
        jilid: row.jilid,
        halaman: row.halaman,
        nilai: row.nilai,
        status: row.status,
        catatan: row.catatan.trim()
      }));

    if (activeSetoranList.length === 0) {
      alert("Tidak ada data halaman siswa yang diisi.");
      setSavingMassal(false);
      setIsLoading(false);
      return;
    }

    // Apply change locally for instant feel
    const updatedSiswaLocal = db.siswa.map(s => {
      const matchInput = activeSetoranList.find(a => a.siswaId === s.id);
      if (matchInput && matchInput.status !== 'tidak_hadir') {
        return {
          ...s,
          jilidSaatIni: matchInput.jilid,
          halTerakhir: matchInput.halaman
        };
      }
      return s;
    });

    // Merge into local list
    const updatedSetoranLocal = [...activeSetoranList, ...db.setoran];
    setDb(prev => ({
      ...prev,
      siswa: updatedSiswaLocal,
      setoran: updatedSetoranLocal
    }));
    localStorage.setItem('btq_cached_db', JSON.stringify({
      ...db,
      siswa: updatedSiswaLocal,
      setoran: updatedSetoranLocal
    }));

    try {
      await fetch(scriptUrl, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "massal",
          table: "Setoran",
          data: activeSetoranList
        })
      });

      alert("✅ Sukses Menyimpan Semua Data Setoran Kelas!");
      
      // Reload class list
      setTimeout(async () => {
        await muatDataDariCloud();
        // reload class massal layout with newly loaded state
        loadSiswaMassal(imKelas);
      }, 1500);

    } catch (e) {
      console.error("Gagal menyimpan setoran massal di Sheets:", e);
      alert("Berhasil disimpan secara lokal, namun gagal menghubungi server Google Sheets.");
    } finally {
      setSavingMassal(false);
      setIsLoading(false);
    }
  };

  // Helper properties
  const selectedParentSiswa = db.siswa.find(s => String(s.id).trim() === String(selectedParentSiswaId).trim());
  const selectedParentSetoran = db.setoran
    .filter(s => String(s.siswaId).trim() === String(selectedParentSiswaId).trim())
    .sort((a, b) => (b.tanggal || '').localeCompare(a.tanggal || ''));

  // Save Config Settings
  const saveScriptConfig = () => {
    let cleanUrl = editingUrlValue.trim();
    if (!cleanUrl.startsWith("http")) {
      alert("Mohon masukkan format URL Web App Google Apps Script yang valid.");
      return;
    }
    setScriptUrl(cleanUrl);
    localStorage.setItem('btq_script_url', cleanUrl);
    setShowConfigModal(false);
    alert("URL Web App berhasil disimpan dan disematkan!");
  };

  const handleResetUrl = () => {
    setEditingUrlValue(DEFAULT_SCRIPT_URL);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased relative selection:bg-emerald-500/20 selection:text-emerald-200">
      
      {/* Background ambient light effects */}
      <div className="fixed inset-0 -z-50 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-15%] w-[60%] h-[60%] rounded-full bg-emerald-600/10 blur-[130px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-15%] w-[60%] h-[60%] rounded-full bg-teal-600/10 blur-[130px] animate-pulse"></div>
        <div className="absolute top-[35%] right-[10%] w-[40%] h-[40%] rounded-full bg-emerald-900/5 blur-[100px]"></div>
      </div>

      {/* Header Topband */}
      <div className="bg-slate-900/55 backdrop-blur-md text-white border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-2 flex justify-between items-center text-[10px] sm:text-[11px] font-semibold tracking-wide">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              SDM 2 Pekajangan BTQ Tracker
            </span>
            <span className="opacity-20">|</span>
            <span className="hidden sm:inline text-slate-400">Waktu Server: {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => {
                setEditingUrlValue(scriptUrl);
                setShowConfigModal(true);
              }}
              className="flex items-center gap-1.5 text-slate-300 hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-3 py-1 rounded-lg border border-white/10 cursor-pointer"
              id="btn-settings"
            >
              <Settings className="w-3.5 h-3.5 text-emerald-400" />
              <span>Ganti Server Google</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Container Layout */}
      <div className="flex-1 flex flex-col">
        
        {/* ==================================== LANDING GATE SCREEN ==================================== */}
        {currentScreen === 'gate' && (
          <div className="flex-1 flex items-center justify-center p-4 py-12 md:py-20 relative overflow-hidden">
            
            <div className="bg-slate-900/40 backdrop-blur-xl rounded-3xl p-6 md:p-10 w-full max-w-lg shadow-2xl relative border border-white/10 transition-all">
              
              {/* Header Logo */}
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white/5 mb-4 border border-white/10 overflow-hidden shadow-inner">
                  <img 
                    src="https://lh3.googleusercontent.com/d/1MROwOO_WruVSfFvVk7XK0R55XTLWK6At" 
                    alt="Logo SDM 2 Pekajangan" 
                    className="w-16 h-16 object-contain whitespace-nowrap"
                  />
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl">BTQ Tracker</h1>
                <p className="text-xs text-slate-300 mt-1.5 max-w-sm mx-auto leading-relaxed">
                  Sistem Pemantauan Progress Mengaji & Jilid Buku Al-Qur'an SD Muhammadiyah 2 Pekajangan
                </p>
              </div>

              {/* Status Banner */}
              {errorMsg && (
                <div className="mb-6 p-3 bg-amber-500/10 rounded-2xl border border-amber-500/20 text-amber-200 text-[11px] flex gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block text-amber-300">Sistem Terbatas:</span>
                    {errorMsg}
                  </div>
                </div>
              )}

              {/* Roles Gate Options */}
              <div className="space-y-4">
                
                <button 
                  onClick={() => {
                    setOrtuKelasFilter('Kelas 1');
                    setOrtuSearch('');
                    setCurrentScreen('parent_leaderboard');
                  }}
                  className="w-full text-left p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-emerald-500/30 transition-all group flex items-center gap-4 cursor-pointer shadow-lg"
                  id="btn-gate-ortu"
                >
                  <div className="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-xl shrink-0 transition-colors group-hover:bg-emerald-500/20">
                    👨‍👩‍👦
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-[14px] text-slate-100 group-hover:text-emerald-400 transition-colors">Halaman Wali Murid</h3>
                    <p className="text-[11px] text-slate-405 mt-0.5 leading-relaxed text-slate-400">Lihat ranking, grafik jilid, & hari presensi mengaji anak</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all shrink-0" />
                </button>

                <button 
                  onClick={() => {
                    setLoginRole('guru');
                    setLoginError(null);
                    setCurrentScreen('login');
                  }}
                  className="w-full text-left p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-emerald-500/30 transition-all group flex items-center gap-4 cursor-pointer shadow-lg"
                  id="btn-gate-guru"
                >
                  <div className="w-11 h-11 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold text-xl shrink-0 transition-colors group-hover:bg-amber-500/20">
                    📖
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-[14px] text-slate-100 group-hover:text-amber-400 transition-colors">Login Guru / Ustadz</h3>
                    <p className="text-[11px] text-slate-405 mt-0.5 leading-relaxed text-slate-400">Pilih kelas, tanggal, dan rekam progress hafalan harian massal se-kelas</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-amber-400 group-hover:translate-x-1 transition-all shrink-0" />
                </button>

                <button 
                  onClick={() => {
                    setLoginRole('admin');
                    setLoginError(null);
                    setCurrentScreen('login');
                  }}
                  className="w-full text-left p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-emerald-500/30 transition-all group flex items-center gap-4 cursor-pointer shadow-lg"
                  id="btn-gate-admin"
                >
                  <div className="w-11 h-11 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold text-xl shrink-0 transition-colors group-hover:bg-blue-500/20">
                    👑
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-[14px] text-slate-100 group-hover:text-blue-400 transition-colors">Login Admin Kepala</h3>
                    <p className="text-[11px] text-slate-405 mt-0.5 leading-relaxed text-slate-400">Pantau capaian antar-kelas, kelola daftar siswa & cetak rekap laporan</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-blue-400 group-hover:translate-x-1 transition-all shrink-0" />
                </button>

              </div>

              {/* Sync Loader Button */}
              <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between">
                <span className="text-[11px] text-slate-400 italic">Terakhir disinkronkan: {db.siswa.length ? `${db.siswa.length} Siswa loaded` : 'Belum sinkron'}</span>
                <button 
                  onClick={muatDataDariCloud}
                  disabled={isLoading}
                  className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-350 font-semibold cursor-pointer disabled:opacity-50 transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                  Refresh Data
                </button>
              </div>

            </div>
          </div>
        )}


        {/* ==================================== PARENT LEADERBOARD ==================================== */}
        {currentScreen === 'parent_leaderboard' && (
          <div className="flex-1 max-w-4xl w-full mx-auto p-4 py-6 md:py-10">
            <button 
              onClick={() => setCurrentScreen('gate')}
              className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-400 hover:text-emerald-300 mb-5 cursor-pointer bg-white/5 hover:bg-white/10 px-3.5 py-1.5 rounded-lg border border-white/10 transition-colors"
              id="prent-back-gate"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Kembali ke Menu Utama
            </button>

            {/* Header Title */}
            <div className="bg-slate-900/40 backdrop-blur-xl rounded-3xl p-6 md:p-8 border border-white/10 shadow-xl mb-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white">🏆 Papan Informasi Progres Siswa</h2>
                  <p className="text-xs text-slate-300 mt-1">Silakan cari nama siswa atau saring berdasarkan kelas untuk melihat detail grafik belajar.</p>
                </div>
                <div className="bg-emerald-500/10 backdrop-blur-xs rounded-2xl p-3 border border-emerald-500/20 text-center shrink-0">
                  <span className="text-[10px] text-emerald-300 block font-semibold uppercase tracking-wider">Total Siswa Aktif</span>
                  <span className="text-2xl font-bold text-white mt-0.5 block">{db.siswa.length} Orang</span>
                </div>
              </div>
            </div>

            {/* Filter Card */}
            <div className="bg-slate-900/40 backdrop-blur-xl rounded-3xl p-4 md:p-6 border border-white/10 mb-6 flex flex-col md:flex-row items-center justify-between gap-5">
              <div className="w-full md:w-1/2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">Saring Kelas</label>
                <div className="flex gap-1.5 overflow-x-auto pb-1 max-w-full">
                  {['Kelas 1', 'Kelas 2', 'Kelas 3', 'Kelas 4', 'Kelas 5', 'Kelas 6'].map(kls => (
                    <button
                      key={kls}
                      onClick={() => setOrtuKelasFilter(kls)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer transition-all shrink-0 ${
                        ortuKelasFilter === kls 
                          ? 'bg-emerald-600 text-white shadow-lg border border-emerald-500/50' 
                          : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5'
                      }`}
                    >
                      {kls}
                    </button>
                  ))}
                </div>
              </div>

              <div className="w-full md:w-1/2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">Cari Nama Siswa</label>
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Masukkan nama lengkap anak Anda..."
                    value={ortuSearch}
                    onChange={(e) => setOrtuSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-white/5 hover:bg-white/10 focus:bg-slate-900/40 focus:border-emerald-500 border border-white/10 rounded-xl text-xs outline-hidden transition-all focus:bg-white focus:text-slate-900 text-white placeholder-slate-400"
                  />
                </div>
              </div>
            </div>

            {/* Student List */}
            <div className="bg-slate-900/40 backdrop-blur-xl rounded-3xl border border-white/10 shadow-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-white/5 bg-white/5 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200">Daftar Progress BTQ - {ortuKelasFilter}</span>
                <span className="text-[11px] text-slate-300 bg-white/5 px-2.5 py-1 rounded-lg border border-white/10">{db.siswa.filter(s => s.kelas === ortuKelasFilter).length} Siswa</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 bg-white/5 text-slate-400 text-xs">
                      <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider w-16">Peringkat</th>
                      <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider">Nama Lengkap Siswa</th>
                      <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider">Posisi Saat Ini</th>
                      <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider">Metrik Capaian</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {(() => {
                      // Filter and sort students
                      const filtered = db.siswa
                        .filter(s => s.kelas === ortuKelasFilter)
                        .filter(s => s.nama.toLowerCase().includes(ortuSearch.toLowerCase()))
                        .sort((a, b) => {
                          const jilidA = a.jilidSaatIni || a.jilid || 'jilid1';
                          const jilidB = b.jilidSaatIni || b.jilid || 'jilid1';
                          const weightDiff = (JILID_WEIGHT[jilidB] || 0) - (JILID_WEIGHT[jilidA] || 0);
                          if (weightDiff !== 0) return weightDiff;
                          
                          // Convert pages to numbers if possible
                          const pA = parseInt(String(a.halTerakhir || a.halaman || '1'), 10) || 0;
                          const pB = parseInt(String(b.halTerakhir || b.halaman || '1'), 10) || 0;
                          return pB - pA;
                        });

                      if (filtered.length === 0) {
                        return (
                          <tr>
                            <td colSpan={4} className="px-6 py-12 text-center text-xs text-slate-400">
                              Tidak ditemukan siswa yang cocok dengan kriteria filter.
                            </td>
                          </tr>
                        );
                      }

                      return filtered.map((siswa, idx) => {
                        const activeJilid = siswa.jilidSaatIni || siswa.jilid || 'jilid1';
                        const activeHalaman = siswa.halTerakhir || siswa.halaman || '1';
                        const pBar = hitungPersen(activeJilid);
                        const labelJilid = JILID_LABEL[activeJilid] || activeJilid;
                        const iconJilid = JILID_ICON[activeJilid] || '📕';

                        return (
                          <tr 
                            key={siswa.id}
                            onClick={() => {
                              setSelectedParentSiswaId(siswa.id);
                              setCurrentScreen('parent_detail');
                            }}
                            className="hover:bg-white/5 cursor-pointer transition-colors group"
                            id={`row-ortu-${siswa.id}`}
                          >
                            <td className="px-4 py-3.5 text-xs text-slate-400 font-bold">
                              {idx + 1 === 1 && <span className="bg-amber-500/10 text-amber-300 text-[10px] uppercase font-bold px-2 py-0.5 rounded-md border border-amber-500/20">1st</span>}
                              {idx + 1 === 2 && <span className="bg-slate-400/10 text-slate-300 text-[10px] uppercase font-bold px-2 py-0.5 rounded-md border border-slate-400/20">2nd</span>}
                              {idx + 1 === 3 && <span className="bg-orange-500/10 text-orange-300 text-[10px] uppercase font-bold px-2 py-0.5 rounded-md border border-orange-500/20">3rd</span>}
                              {idx + 1 > 3 && <span className="px-2">{`#${idx + 1}`}</span>}
                            </td>
                            <td className="px-4 py-3.5 text-xs">
                              <span className="font-bold text-slate-100 group-hover:text-emerald-400 block transition-colors">{siswa.nama}</span>
                              <span className="text-[10px] text-slate-400">ID: {siswa.id}</span>
                            </td>
                            <td className="px-4 py-3.5 text-xs">
                              <div className="flex items-center gap-1.5">
                                <span className="text-sm">{iconJilid}</span>
                                <span className="font-semibold text-slate-200 group-hover:text-emerald-350 transition-colors">{labelJilid}</span>
                                <span className="text-slate-500">·</span>
                                <span className="text-slate-300 font-medium">Hal {activeHalaman}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3.5">
                              <div className="flex items-center gap-3">
                                <div className="w-32 bg-white/5 h-2 rounded-full overflow-hidden shrink-0 border border-white/5">
                                  <div className="bg-emerald-550 bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${pBar}%` }}></div>
                                </div>
                                <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/15">{pBar}%</span>
                              </div>
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}


        {/* ==================================== PARENT DETAIL VIEWER ==================================== */}
        {currentScreen === 'parent_detail' && selectedParentSiswa && (
          <div className="flex-1 max-w-4xl w-full mx-auto p-4 py-6 md:py-10">
            <button 
              onClick={() => setCurrentScreen('parent_leaderboard')}
              className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-400 hover:text-emerald-300 mb-5 cursor-pointer bg-white/5 hover:bg-white/10 px-3.5 py-1.5 rounded-lg border border-white/10 transition-colors"
              id="btn-back-leaderboard"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Kembali ke Peringkat Kelas
            </button>

            {/* Profile Hero */}
            <div className="bg-slate-900/40 backdrop-blur-xl rounded-3xl p-6 md:p-8 border border-white/10 shadow-xl mb-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-44 h-44 bg-emerald-500/5 rounded-full -mr-12 -mt-12 blur-xl"></div>
              
              <div className="flex items-center gap-5 relative z-10 font-sans">
                <div className="w-16 h-16 md:w-20 md:h-20 bg-emerald-500/10 text-emerald-300 rounded-2xl flex items-center justify-center font-bold text-2xl md:text-3xl border border-emerald-500/30 shadow-lg select-none">
                  {selectedParentSiswa.nama ? selectedParentSiswa.nama[0].toUpperCase() : 'S'}
                </div>
                <div>
                  <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white">{selectedParentSiswa.nama}</h2>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-1.5 text-xs text-slate-300">
                    <span className="font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20 text-emerald-300">{selectedParentSiswa.kelas}</span>
                    <span className="text-slate-600">·</span>
                    <span>ID: {selectedParentSiswa.id}</span>
                    <span className="text-slate-600">·</span>
                    <span className="font-semibold text-emerald-400">{selectedParentSetoran.length} Hari Presensi Mengaji</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Jilid Progress Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              
              {/* Overall Progress state */}
              <div className="bg-slate-900/40 backdrop-blur-xl rounded-3xl p-5 border border-white/10 md:col-span-1 flex flex-col justify-between shadow-xl">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Status Kelulusan</span>
                  <h3 className="text-xl font-bold text-emerald-400 block mt-1">
                    {(() => {
                      const curJ = selectedParentSiswa.jilidSaatIni || selectedParentSiswa.jilid || 'jilid1';
                      return JILID_LABEL[curJ] || curJ;
                    })()}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">Materi buku mengaji saat ini.</p>
                </div>

                <div className="mt-6">
                  <div className="flex justify-between items-center text-xs font-semibold text-slate-300 mb-2">
                    <span>Progres Belajar</span>
                    <span className="text-emerald-400 font-bold">{hitungPersen(selectedParentSiswa.jilidSaatIni || selectedParentSiswa.jilid || 'jilid1')}%</span>
                  </div>
                  <div className="w-full bg-white/5 h-3 rounded-full overflow-hidden border border-white/5">
                    <div 
                      className="bg-emerald-500 h-full rounded-full transition-all duration-300" 
                      style={{ width: `${hitungPersen(selectedParentSiswa.jilidSaatIni || selectedParentSiswa.jilid || 'jilid1')}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Jilid Grid display */}
              <div className="bg-slate-900/40 backdrop-blur-xl rounded-3xl p-5 border border-white/10 md:col-span-2 shadow-xl font-sans">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-4">Grafik Buku BTQ</span>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
                  {['jilid1', 'jilid2', 'jilid3', 'jilid4', 'jid5', 'jilid6', 'alquran'].map(jk => {
                    // Normalize the matching key
                    const key = jk === 'jid5' ? 'jilid5' : jk;
                    
                    const studentJilid = selectedParentSiswa.jilidSaatIni || selectedParentSiswa.jid || 'jilid1';
                    const sWeight = JILID_WEIGHT[studentJilid] || 1;
                    const cWeight = JILID_WEIGHT[key] || 1;
                    
                    let bgStyle = 'bg-white/5 text-slate-400 border-white/5';
                    let labelStatus = 'Terkunci';
                    
                    if (cWeight < sWeight) {
                      bgStyle = 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25';
                      labelStatus = 'Selesai ✓';
                    } else if (cWeight === sWeight) {
                      bgStyle = 'bg-amber-500/10 text-amber-300 border-amber-300/30 ring-2 ring-amber-500/30';
                      labelStatus = 'Sedang Baca';
                    }

                    return (
                      <div key={key} className={`border p-2.5 rounded-xl text-center flex flex-col items-center justify-between min-h-[95px] ${bgStyle}`}>
                        <span className="text-xl mb-1">{JILID_ICON[key]}</span>
                        <span className="text-[10px] font-bold leading-tight block">{JILID_LABEL[key]}</span>
                        <span className="text-[8px] font-bold uppercase mt-1 px-1.5 py-0.5 rounded bg-white/10 tracking-wide">{labelStatus}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* Setoran Timeline */}
            <div className="bg-slate-900/40 backdrop-blur-xl rounded-3xl border border-white/10 shadow-xl overflow-hidden font-sans">
              <div className="px-6 py-4 border-b border-white/5 bg-white/5 flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-200">Riwayat Catatan Setoran Harian</h3>
                <span className="text-xs font-semibold text-slate-400">{selectedParentSetoran.length} Catatan</span>
              </div>

              <div className="p-4 md:p-6 divide-y divide-white/5 max-h-[480px] overflow-y-auto">
                {selectedParentSetoran.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    Siswa ini belum memiliki catatan setoran hafalan harian.
                  </div>
                ) : (
                  selectedParentSetoran.map((item, index) => {
                    let badgeClass = "bg-white/5 text-slate-300 border-white/5";
                    if (item.status === 'lancar') {
                      badgeClass = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
                    } else if (item.status === 'perlu_ulang') {
                      badgeClass = "bg-amber-500/10 text-amber-400 border-amber-500/20";
                    } else if (item.status === 'tidak_hadir') {
                      badgeClass = "bg-rose-500/10 text-rose-400 border-rose-500/20";
                    }

                    return (
                      <div key={item.id || index} className="py-4 first:pt-0 last:pb-0 flex gap-4">
                        <div className="w-24 shrink-0">
                          <span className="text-xs font-bold text-slate-200 block">{formatTanggalIndonesia(item.tanggal)}</span>
                          <span className="text-[10px] text-slate-400 block mt-0.5">{item.tanggal}</span>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-white">
                              {JILID_LABEL[item.jilid] || item.jilid} · Halaman {item.halaman}
                            </span>
                            <span className={`text-[9px] font-bold px-2.5 py-0.5 rounded-full border ${badgeClass}`}>
                              {STATUS_LABEL[item.status] || item.status}
                            </span>
                            <span className="text-[10px] font-bold text-amber-300 bg-amber-500/10 border border-amber-500/15 px-2 py-0.5 rounded">Nilai: {item.nilai}</span>
                          </div>
                          
                          {item.catatan && (
                            <p className="text-xs text-slate-300 bg-white/5 px-3 py-2.5 rounded-xl border border-white/10 mt-2.5 italic">
                              📝 Evaluasi Guru: "{item.catatan}"
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}


        {/* ==================================== LOGIN SCREEN ==================================== */}
        {currentScreen === 'login' && (
          <div className="flex-1 flex items-center justify-center p-4 py-12 md:py-20">
            <div className="bg-slate-900/40 backdrop-blur-xl rounded-2xl p-6 md:p-8 w-full max-w-md shadow-2xl border border-white/10">
              
              <button 
                onClick={() => setCurrentScreen('gate')}
                className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-400 hover:text-emerald-300 mb-6 cursor-pointer bg-white/5 hover:bg-white/10 px-2.5 py-1 rounded-lg border border-white/5 transition-all"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Kembali
              </button>

              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-500/10 mb-3 border border-emerald-500/20">
                  {loginRole === 'admin' ? <Shield className="w-7 h-7 text-emerald-400" /> : <BookOpen className="w-7 h-7 text-emerald-400" />}
                </div>
                <h2 className="text-xl font-bold tracking-tight text-white">
                  {loginRole === 'admin' ? 'Login Admin Kepala' : 'Login Guru / Ustadz'}
                </h2>
                <p className="text-xs text-slate-300 mt-1">Masukkan kredensial akun Anda yang tercatat di database.</p>
              </div>

              {loginError && (
                <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 justify-start" />
                  <span>{loginError}</span>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1.5">Username</label>
                  <input
                    type="text"
                    placeholder="Masukkan username"
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white/5 hover:bg-white/10 focus:bg-slate-900/40 focus:border-emerald-500 border border-white/10 rounded-xl text-xs outline-hidden focus:bg-white focus:text-slate-900 text-white placeholder-slate-400 transition-all cursor-text"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1.5">Password</label>
                  <input
                    type="password"
                    placeholder="Masukkan password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white/5 hover:bg-white/10 focus:bg-slate-900/40 focus:border-emerald-500 border border-white/10 rounded-xl text-xs outline-hidden focus:bg-white focus:text-slate-900 text-white placeholder-slate-400 transition-all cursor-text"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') doLogin();
                    }}
                  />
                </div>

                <button
                  onClick={doLogin}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-all cursor-pointer mt-2 shadow-lg border border-emerald-500/40 hover:scale-[1.01]"
                  id="btn-do-login"
                >
                  Masuk Ke Sistem →
                </button>
              </div>

            </div>
          </div>
        )}


        {/* ==================================== SYSTEM WORKSPACE (ADMIN & GURU) ==================================== */}
        {currentScreen === 'app' && currentUser && (
          <div className="flex-1 flex flex-col">
            
            {/* Topbar navigation panel */}
            <div className="bg-slate-900/55 backdrop-blur-md border-b border-white/10 sticky top-0 z-40">
              <div className="max-w-7xl mx-auto px-4 md:px-6 py-3.5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-550/10 bg-emerald-500/10 overflow-hidden flex items-center justify-center border border-emerald-500/20">
                    <img 
                      src="https://lh3.googleusercontent.com/d/1MROwOO_WruVSfFvVk7XK0R55XTLWK6At" 
                      alt="Logo SD" 
                      className="w-7 h-7 object-contain"
                    />
                  </div>
                  <div>
                    <h1 className="text-sm font-bold text-slate-100 leading-tight">BTQ Tracker</h1>
                    <p className="text-[10px] text-slate-400 font-medium">Internal Panel: {currentUser.nama}</p>
                  </div>
                </div>

                {/* Tab Navigation */}
                <div className="hidden md:flex items-center gap-1">
                  {currentUser.role === 'admin' ? (
                    <>
                      <button
                        onClick={() => setActiveTab('dashboard')}
                        className={`px-4 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors border ${
                          activeTab === 'dashboard' ? 'bg-emerald-600 text-white border-emerald-500/50 shadow-md' : 'text-slate-300 hover:bg-white/5 border-transparent'
                        }`}
                      >
                        🏆 Ranking Jilid
                      </button>
                      <button
                        onClick={() => setActiveTab('siswa')}
                        className={`px-4 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors border ${
                          activeTab === 'siswa' ? 'bg-emerald-600 text-white border-emerald-500/50 shadow-md' : 'text-slate-300 hover:bg-white/5 border-transparent'
                        }`}
                      >
                        👦 Data Siswa
                      </button>
                      <button
                        onClick={() => setActiveTab('laporan')}
                        className={`px-4 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors border ${
                          activeTab === 'laporan' ? 'bg-emerald-600 text-white border-emerald-500/50 shadow-md' : 'text-slate-300 hover:bg-white/5 border-transparent'
                        }`}
                      >
                        📋 Laporan Histori
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setActiveTab('inputmassal')}
                      className={`px-4 py-1.5 rounded-lg text-xs font-semibold cursor-pointer bg-emerald-600 border border-emerald-500/50 text-white shadow-md`}
                    >
                      ✏️ Input Setoran Kelas
                    </button>
                  )}
                </div>

                {/* Right side role user badge & logout */}
                <div className="flex items-center gap-2.5">
                  <span className={`text-[9px] uppercase font-bold px-2 py-1 rounded border ${
                    currentUser.role === 'admin' 
                      ? 'bg-blue-500/10 text-blue-300 border-blue-500/25' 
                      : 'bg-orange-500/10 text-orange-300 border-orange-500/25'
                  }`}>
                    {currentUser.role === 'admin' ? '👑 Admin' : '📖 Guru'}
                  </span>
                  <button 
                    onClick={doLogout}
                    className="p-1 px-2.5 rounded-lg bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 text-xs font-bold border border-rose-500/20 transition-all flex items-center gap-1 select-none cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Keluar</span>
                  </button>
                </div>
              </div>

              {/* Mobile tabs bar */}
              <div className="md:hidden flex border-t border-white/5 px-2 py-1 bg-slate-950/60 backdrop-blur-md overflow-x-auto gap-1">
                {currentUser.role === 'admin' ? (
                  <>
                    <button
                      onClick={() => setActiveTab('dashboard')}
                      className={`px-3 py-1.5 rounded-md text-[11px] font-bold whitespace-nowrap flex-1 text-center cursor-pointer transition-all ${
                        activeTab === 'dashboard' ? 'bg-emerald-600 text-white shadow-md border border-emerald-500/50' : 'text-slate-400'
                      }`}
                    >
                      Ranking Jilid
                    </button>
                    <button
                      onClick={() => setActiveTab('siswa')}
                      className={`px-3 py-1.5 rounded-md text-[11px] font-bold whitespace-nowrap flex-1 text-center cursor-pointer transition-all ${
                        activeTab === 'siswa' ? 'bg-emerald-600 text-white shadow-md border border-emerald-500/50' : 'text-slate-400'
                      }`}
                    >
                      Data Siswa
                    </button>
                    <button
                      onClick={() => setActiveTab('laporan')}
                      className={`px-3 py-1.5 rounded-md text-[11px] font-bold whitespace-nowrap flex-1 text-center cursor-pointer transition-all ${
                        activeTab === 'laporan' ? 'bg-emerald-600 text-white shadow-md border border-emerald-500/50' : 'text-slate-400'
                      }`}
                    >
                      Laporan Histori
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setActiveTab('inputmassal')}
                    className="px-3 py-1.5 rounded-md text-[11px] font-bold text-center bg-emerald-600 text-white shadow-md border border-emerald-500/50 flex-1 whitespace-nowrap cursor-pointer"
                  >
                    ✏️ Input Setoran Kelas
                  </button>
                )}
              </div>
            </div>

            {/* View Switching Container */}
            <div className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 py-6">
              
              {/* PAGE: ADMIN INTERNAL DASHBOARD */}
              {activeTab === 'dashboard' && currentUser.role === 'admin' && (
                <div className="space-y-6 font-sans">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-bold tracking-tight text-white">🏆 Peringkat Jilid Siswa (Internal)</h2>
                      <p className="text-xs text-slate-300">Monitoring urutan capaian jilid siswa secara real-time dari seluruh kelas.</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-400 whitespace-nowrap">Filter Kelas:</span>
                      <select 
                        value={dashKelasFilter}
                        onChange={(e) => setDashKelasFilter(e.target.value)}
                        className="bg-slate-900/60 border border-white/10 py-1.5 px-3 rounded-lg text-xs outline-hidden focus:border-emerald-500 font-semibold text-white cursor-pointer"
                      >
                        <option value="" className="bg-slate-900 text-white">Semua Kelas</option>
                        {['Kelas 1', 'Kelas 2', 'Kelas 3', 'Kelas 4', 'Kelas 5', 'Kelas 6'].map(k => (
                          <option key={k} value={k} className="bg-slate-900 text-white">{k}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="bg-slate-900/40 backdrop-blur-xl rounded-3xl shadow-xl border border-white/10 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="border-b border-white/5 bg-white/5 text-slate-300 text-[11px] font-bold uppercase tracking-wider">
                            <th className="px-4 py-3 text-left w-16">Rank</th>
                            <th className="px-4 py-3 text-left">Nama Lengkap</th>
                            <th className="px-4 py-3 text-left">Kelas</th>
                            <th className="px-4 py-3 text-left">Posisi Mengaji</th>
                            <th className="px-4 py-3 text-left">Progress Bar</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-slate-200">
                          {(() => {
                            const filteredList = dashKelasFilter 
                              ? db.siswa.filter(s => s.kelas === dashKelasFilter)
                              : [...db.siswa];

                            const sorted = filteredList.sort((a, b) => {
                              const jilidA = a.jilidSaatIni || a.jilid || 'jilid1';
                              const jilidB = b.jilidSaatIni || b.jilid || 'jilid1';
                              const weightDiff = (JILID_WEIGHT[jilidB] || 0) - (JILID_WEIGHT[jilidA] || 0);
                              if (weightDiff !== 0) return weightDiff;
                              const pA = parseInt(String(a.halTerakhir || a.halaman || '1'), 10) || 0;
                              const pB = parseInt(String(b.halTerakhir || b.halaman || '1'), 10) || 0;
                              return pB - pA;
                            });

                            if (sorted.length === 0) {
                              return (
                                <tr>
                                  <td colSpan={5} className="px-6 py-12 text-center text-xs text-slate-400">
                                    Belum ada data siswa untuk disajikan.
                                  </td>
                                </tr>
                              );
                            }

                            return sorted.map((s, idx) => {
                              const activeJilid = s.jilidSaatIni || s.jilid || 'jilid1';
                              const activeHalaman = s.halTerakhir || s.halaman || '1';
                              const percentVal = hitungPersen(activeJilid);

                              return (
                                <tr key={s.id} className="hover:bg-white/5 text-xs transition-colors">
                                  <td className="px-4 py-3 font-bold text-slate-400">#{idx + 1}</td>
                                  <td className="px-4 py-3 font-semibold text-slate-100">{s.nama}</td>
                                  <td className="px-4 py-3">
                                    <span className="bg-blue-500/10 text-blue-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-500/20">
                                      {s.kelas}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 font-medium text-slate-200">
                                    {JILID_ICON[activeJilid]} {JILID_LABEL[activeJilid]} (Hal {activeHalaman})
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                      <div className="w-24 bg-white/5 h-2 rounded-full overflow-hidden shrink-0 border border-white/5">
                                        <div className="bg-emerald-500 h-full rounded-full transition-all duration-300" style={{ width: `${percentVal}%` }}></div>
                                      </div>
                                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full border border-emerald-500/15">{percentVal}%</span>
                                    </div>
                                  </td>
                                </tr>
                              );
                            });
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* PAGE: KELOLA DATA SISWA MASTER */}
              {activeTab === 'siswa' && currentUser.role === 'admin' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Left Column: Register Student form */}
                  <div className="lg:col-span-1">
                    <div className="bg-slate-900/40 backdrop-blur-xl rounded-3xl p-5 border border-white/10 shadow-xl font-sans">
                      <h3 className="text-xs font-bold text-white border-b border-white/5 pb-3 block mb-4">Tambah Siswa Baru</h3>
                      
                      {actionSuccessMessage && (
                        <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded-xl text-xs flex items-start gap-2">
                          <Check className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                          <span>{actionSuccessMessage}</span>
                        </div>
                      )}

                      <div className="space-y-4">
                        <div>
                          <label className="text-xs font-bold text-slate-400 block mb-1.5">Nama Lengkap Siswa</label>
                          <input
                            type="text"
                            placeholder="Nama Lengkap"
                            value={newSiswaNama}
                            onChange={(e) => setNewSiswaNama(e.target.value)}
                            className="w-full px-3.5 py-2 bg-white/5 hover:bg-white/10 focus:bg-slate-900/40 focus:border-emerald-500 border border-white/10 rounded-xl text-xs outline-hidden focus:bg-white focus:text-slate-900 text-white placeholder-slate-400 transition-all cursor-text"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-bold text-slate-400 block mb-1.5">Kelas Aktif</label>
                          <select
                            value={newSiswaKelas}
                            onChange={(e) => setNewSiswaKelas(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-900/60 border border-white/10 focus:border-emerald-500 rounded-xl text-xs outline-hidden transition-all text-white font-semibold cursor-pointer"
                          >
                            <option value="Kelas 1" className="bg-slate-900 text-white">Kelas 1</option>
                            <option value="Kelas 2" className="bg-slate-900 text-white">Kelas 2</option>
                            <option value="Kelas 3" className="bg-slate-900 text-white">Kelas 3</option>
                            <option value="Kelas 4" className="bg-slate-900 text-white">Kelas 4</option>
                            <option value="Kelas 5" className="bg-slate-900 text-white">Kelas 5</option>
                            <option value="Kelas 6" className="bg-slate-900 text-white">Kelas 6</option>
                          </select>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs font-bold text-slate-400 block mb-1.5">Buku Jilid Awal</label>
                            <select
                              value={newSiswaJilid}
                              onChange={(e) => setNewSiswaJilid(e.target.value)}
                              className="w-full px-2 py-2 bg-slate-900/60 border border-white/10 focus:border-emerald-500 rounded-xl text-xs outline-hidden transition-all text-white cursor-pointer font-semibold"
                            >
                              <option value="jilid1" className="bg-slate-900 text-white">Jilid 1</option>
                              <option value="jilid2" className="bg-slate-900 text-white">Jilid 2</option>
                              <option value="jilid3" className="bg-slate-900 text-white">Jilid 3</option>
                              <option value="jilid4" className="bg-slate-900 text-white">Jilid 4</option>
                              <option value="jilid5" className="bg-slate-900 text-white">Jilid 5</option>
                              <option value="jilid6" className="bg-slate-900 text-white">Jilid 6</option>
                              <option value="alquran" className="bg-slate-900 text-white">Al-Qur'an</option>
                            </select>
                          </div>
                          
                          <div>
                            <label className="text-xs font-bold text-slate-400 block mb-1.5">Halaman Awal</label>
                            <input
                              type="number"
                              value={newSiswaHalaman}
                              onChange={(e) => setNewSiswaHalaman(e.target.value)}
                              className="w-full px-3 py-2 bg-white/5 hover:bg-white/10 focus:bg-slate-900/40 focus:border-emerald-500 border border-white/10 rounded-xl text-xs outline-hidden focus:bg-white focus:text-slate-900 text-white placeholder-slate-400 transition-all cursor-text font-semibold"
                            />
                          </div>
                        </div>

                        <button
                          onClick={tambahSiswa}
                          disabled={isLoading}
                          className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 border border-emerald-500/40 shadow-lg active:scale-95"
                          id="btn-add-siswa"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Daftarkan Siswa Baru</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Student tables */}
                  <div className="lg:col-span-2 space-y-4">
                    <div className="bg-slate-900/40 backdrop-blur-xl rounded-3xl border border-white/10 shadow-xl overflow-hidden font-sans">
                      <div className="px-5 py-4 border-b border-white/5 bg-white/5 flex items-center justify-between text-slate-200">
                        <span className="text-xs font-bold text-slate-200">Daftar Siswa Master ({db.siswa.length})</span>
                        
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] uppercase font-bold text-slate-450 text-slate-400">Saring Kelas:</span>
                          <select 
                            value={siswaPageKelasFilter}
                            onChange={(e) => setSiswaPageKelasFilter(e.target.value)}
                            className="bg-slate-900/60 border border-white/10 py-1.5 px-3 rounded-lg text-xs outline-hidden focus:border-emerald-500 font-semibold text-white cursor-pointer"
                          >
                            <option value="" className="bg-slate-900 text-white">Semua Siswa</option>
                            <option value="Kelas 1" className="bg-slate-900 text-white">Kelas 1</option>
                            <option value="Kelas 2" className="bg-slate-900 text-white">Kelas 2</option>
                            <option value="Kelas 3" className="bg-slate-900 text-white">Kelas 3</option>
                            <option value="Kelas 4" className="bg-slate-900 text-white">Kelas 4</option>
                            <option value="Kelas 5" className="bg-slate-900 text-white">Kelas 5</option>
                            <option value="Kelas 6" className="bg-slate-900 text-white">Kelas 6</option>
                          </select>
                        </div>
                      </div>

                      <div className="overflow-x-auto max-h-[500px]">
                        <table className="w-full border-collapse">
                          <thead>
                            <tr className="border-b border-white/5 bg-white/5 text-slate-300 text-[10px] font-bold uppercase tracking-wider">
                              <th className="px-4 py-3 text-left">Nama Lengkap</th>
                              <th className="px-4 py-3 text-left">Kelas</th>
                              <th className="px-4 py-3 text-left">Buku Jilid</th>
                              <th className="px-4 py-3 text-left">Halaman</th>
                              <th className="px-4 py-3 text-left">Aksi Cepat</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5 text-slate-200">
                            {(() => {
                              const list = siswaPageKelasFilter 
                                ? db.siswa.filter(s => s.kelas === siswaPageKelasFilter) 
                                : db.siswa;

                              if (list.length === 0) {
                                return (
                                  <tr>
                                    <td colSpan={5} className="px-6 py-10 text-center text-slate-450 text-slate-400">
                                      Tidak ada data siswa untuk disajikan.
                                    </td>
                                  </tr>
                                );
                              }

                              return list.map(student => {
                                const activeJilid = student.jilidSaatIni || student.jilid || 'jilid1';
                                const activeHalaman = student.halTerakhir || student.halaman || '1';
                                
                                return (
                                  <tr key={student.id} className="hover:bg-white/5 transition-colors">
                                    <td className="px-4 py-3 font-bold text-slate-100">{student.nama}</td>
                                    <td className="px-4 py-3">
                                      <span className="bg-blue-500/10 text-blue-300 px-2 py-0.5 border border-blue-500/20 rounded text-[10px] font-bold">{student.kelas}</span>
                                    </td>
                                    <td className="px-4 py-3 font-semibold text-slate-200">
                                      {JILID_ICON[activeJilid]} {JILID_LABEL[activeJilid]}
                                    </td>
                                    <td className="px-4 py-3 text-slate-300 font-medium">Halaman {activeHalaman}</td>
                                    <td className="px-4 py-3 text-xs">
                                      <button 
                                        onClick={() => {
                                          setSelectedParentSiswaId(student.id);
                                          setCurrentScreen('parent_detail');
                                        }}
                                        className="text-[10px] text-emerald-400 hover:text-white border border-emerald-500/20 hover:bg-emerald-600 px-2.5 py-1 rounded transition-all font-semibold cursor-pointer"
                                      >
                                        Grafik Detail →
                                      </button>
                                    </td>
                                  </tr>
                                );
                              });
                            })()}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                </div>
              )}

              {/* CONTENTS: REKAP HISTORI LAPORAN SETORAN SISWA */}
              {activeTab === 'laporan' && currentUser.role === 'admin' && (
                <div className="space-y-6">
                  
                  {/* Top Header Card of filter options */}
                  <div className="bg-slate-900/40 backdrop-blur-xl rounded-3xl p-5 border border-white/10 shadow-xl font-sans font-sans">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-4">Saring Berkas Laporan</span>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="text-xs font-bold text-slate-400 block mb-1.5">Cari Nama Siswa</label>
                        <div className="relative">
                          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input 
                            type="text"
                            placeholder="Cari nama santri..."
                            value={laporanSearchSiswa}
                            onChange={(e) => setLaporanSearchSiswa(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 bg-white/5 hover:bg-white/10 focus:bg-slate-900/40 focus:border-emerald-500 border border-white/10 rounded-xl text-xs outline-hidden text-white placeholder-slate-400 transition-all"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-400 block mb-1.5">Materi Kelas</label>
                        <select 
                          value={laporanKelasFilter}
                          onChange={(e) => setLaporanKelasFilter(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-900/60 border border-white/10 focus:border-emerald-500 rounded-xl text-xs outline-hidden transition-all text-white font-semibold cursor-pointer"
                        >
                          <option value="" className="bg-slate-900 text-white">Semua Kelas</option>
                          <option value="Kelas 1" className="bg-slate-900 text-white">Kelas 1</option>
                          <option value="Kelas 2" className="bg-slate-900 text-white">Kelas 2</option>
                          <option value="Kelas 3" className="bg-slate-900 text-white">Kelas 3</option>
                          <option value="Kelas 4" className="bg-slate-900 text-white">Kelas 4</option>
                          <option value="Kelas 5" className="bg-slate-900 text-white">Kelas 5</option>
                          <option value="Kelas 6" className="bg-slate-900 text-white">Kelas 6</option>
                        </select>
                      </div>

                      <div className="flex items-end">
                        <button 
                          onClick={() => window.print()}
                          className="w-full py-2 bg-white/5 hover:bg-white/10 text-white font-bold text-xs rounded-xl transition-all border border-white/10 flex items-center justify-center gap-1.5 select-none cursor-pointer"
                        >
                          <FileText className="w-4 h-4" />
                          Cetak Laporan (Print PDF)
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Laporan Table Card */}
                  <div className="bg-slate-900/40 backdrop-blur-xl rounded-3xl border border-white/10 shadow-xl overflow-hidden font-sans">
                    <div className="overflow-x-auto max-h-[550px]">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="border-b border-white/5 bg-white/5 text-slate-300 text-[10px] font-bold uppercase tracking-wider">
                            <th className="px-4 py-3 text-left">Tanggal</th>
                            <th className="px-4 py-3 text-left">Siswa</th>
                            <th className="px-4 py-3 text-left">Kelas</th>
                            <th className="px-4 py-3 text-left">Materi Buku</th>
                            <th className="px-4 py-3 text-left">Hal</th>
                            <th className="px-4 py-3 text-left">Nilai</th>
                            <th className="px-4 py-3 text-left">Capaian</th>
                            <th className="px-4 py-3 text-left">Ulasan/Catatan Guru</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-slate-200">
                          {(() => {
                            let list = [...db.setoran].sort((a, b) => b.tanggal.localeCompare(a.tanggal));
                            
                            // Applay filters
                            if (laporanKelasFilter) {
                              list = list.filter(s => {
                                const st = db.siswa.find(x => x.id === s.siswaId);
                                return st?.kelas === laporanKelasFilter;
                              });
                            }

                            if (laporanSearchSiswa.trim() !== '') {
                              list = list.filter(s => {
                                const st = db.siswa.find(x => x.id === s.siswaId);
                                return st?.nama.toLowerCase().includes(laporanSearchSiswa.toLowerCase());
                              });
                            }

                            if (list.length === 0) {
                              return (
                                <tr>
                                  <td colSpan={8} className="px-6 py-12 text-center text-xs text-slate-400">
                                    Belum ada data laporan histori mengaji untuk rentang penyaringan ini.
                                  </td>
                                </tr>
                              );
                            }

                            return list.map((s, index) => {
                              const student = db.siswa.find(x => x.id === s.siswaId);
                              
                              let badgeClass = "bg-white/5 text-slate-300 border-white/5";
                              if (s.status === 'lancar') {
                                badgeClass = "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
                              } else if (s.status === 'perlu_ulang') {
                                badgeClass = "bg-amber-500/10 text-amber-400 border border-amber-500/20";
                              } else if (s.status === 'tidak_hadir') {
                                badgeClass = "bg-rose-500/10 text-rose-400 border border-rose-500/20";
                              }

                              return (
                                <tr key={s.id || index} className="hover:bg-white/5 transition-colors">
                                  <td className="px-4 py-3">
                                    <span className="font-semibold text-slate-200 block">{formatTanggalIndonesia(s.tanggal)}</span>
                                    <span className="text-[9px] text-slate-455 text-slate-400">{s.tanggal}</span>
                                  </td>
                                  <td className="px-4 py-3">
                                    <span className="font-bold text-slate-100 text-[12px]">{student?.nama || '—'}</span>
                                    <span className="text-[9px] text-slate-455 text-slate-400 block">ID: {s.siswaId}</span>
                                  </td>
                                  <td className="px-4 py-3">
                                    <span className="bg-slate-500/10 text-slate-300 font-bold border border-white/5 px-2 py-0.5 rounded text-[10px]">
                                      {student?.kelas || '—'}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 font-semibold text-slate-300">
                                    {JILID_ICON[s.jilid]} {JILID_LABEL[s.jilid] || s.jilid}
                                  </td>
                                  <td className="px-4 py-3 font-bold text-slate-100">{s.halaman}</td>
                                  <td className="px-4 py-3 text-xs">
                                    <span className="font-bold text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded px-2 py-0.5">Nilai: {s.nilai}</span>
                                  </td>
                                  <td className="px-4 py-3">
                                    <span className={`px-2 py-0.5 font-bold rounded-md border text-[9px] ${badgeClass}`}>
                                      {STATUS_LABEL[s.status] || s.status}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-slate-300 max-w-xs truncate italic" title={s.catatan}>{s.catatan || '—'}</td>
                                </tr>
                              );
                            });
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </div>

                </div>
              )}


              {/* ========================================================================================= */}
              {/* PAGE: INPUT SETORAN HARIAN MASSAL SE-KELAS (GURU EXCLUSIVE) */}
              {/* ========================================================================================= */}
              {activeTab === 'inputmassal' && (
                <div className="space-y-6">
                  
                  {/* Class selection layout panel */}
                  <div className="bg-slate-900/40 backdrop-blur-xl rounded-3xl p-5 border border-white/10 shadow-xl font-sans">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      
                      {/* Left: title instruction details */}
                      <div>
                        <h2 className="text-lg font-bold tracking-tight text-white">✏️ Input Setoran Harian Kelas</h2>
                        <p className="text-xs text-slate-300 mt-0.5">Pilih rombongan belajar kelas dan tentukan tanggal setoran untuk memuat data cerdas siswa.</p>
                      </div>

                      {/* Right: Controller inputs */}
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2">
                          <label className="text-xs font-bold text-slate-400">Pilih Kelas:</label>
                          <select
                            value={imKelas}
                            onChange={(e) => loadSiswaMassal(e.target.value)}
                            className="bg-slate-900/60 hover:bg-slate-900/80 border border-white/10 py-1.5 px-3 rounded-lg text-xs outline-hidden focus:border-emerald-500 font-bold text-white cursor-pointer transition-all"
                          >
                            <option value="" className="bg-slate-900 text-white">-- PILIH KELAS --</option>
                            <option value="Kelas 1" className="bg-slate-900 text-white">Kelas 1</option>
                            <option value="Kelas 2" className="bg-slate-900 text-white">Kelas 2</option>
                            <option value="Kelas 3" className="bg-slate-900 text-white">Kelas 3</option>
                            <option value="Kelas 4" className="bg-slate-900 text-white">Kelas 4</option>
                            <option value="Kelas 5" className="bg-slate-900 text-white">Kelas 5</option>
                            <option value="Kelas 6" className="bg-slate-900 text-white">Kelas 6</option>
                          </select>
                        </div>

                        <div className="flex items-center gap-2">
                          <label className="text-xs font-bold text-slate-400">Tanggal:</label>
                          <input
                            type="date"
                            value={imTanggal}
                            onChange={(e) => setImTanggal(e.target.value)}
                            className="bg-slate-900/60 border border-white/10 py-1.5 px-3 rounded-lg text-xs font-semibold outline-hidden focus:border-emerald-500 text-white"
                          />
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* Mass Entry Table of rows */}
                  <div className="bg-slate-900/40 backdrop-blur-xl rounded-3xl border border-white/10 shadow-xl overflow-hidden font-sans">
                    <div className="px-5 py-4 border-b border-white/5 bg-white/5 flex items-center justify-between text-slate-200 animate-fade-in">
                      <span className="text-xs font-bold text-slate-200">
                        {imKelas ? `Daftar Siswa - ${imKelas}` : 'Silakan pilih kelas terlebih dahulu'}
                      </span>
                      {imKelas && (
                        <span className="text-xs text-slate-450 text-slate-350 font-bold">
                          {massalRows.length} Siswa Terdaftar
                        </span>
                      )}
                    </div>

                    {massalRows.length === 0 ? (
                      <div className="p-12 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-3 bg-white/5">
                        <BookOpenCheck className="w-12 h-12 text-slate-500" />
                        <div>
                          <p className="font-semibold text-slate-300">Form Belum Terbuka</p>
                          <p className="text-[11px] text-slate-400 mt-1">Silakan pilih kelas di atas untuk memulai penilaian massal makhraj.</p>
                        </div>
                      </div>
                    ) : (
                      <div className="animate-fade-in">
                        
                        <div className="overflow-x-auto animate-fade-in">
                          <table className="w-full border-collapse">
                            <thead>
                              <tr className="border-b border-white/5 bg-white/5 text-slate-300">
                                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider w-1/4">Info Siswa & Riwayat</th>
                                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider w-1/5">Jilid Aktif</th>
                                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider w-[12%]">Halaman</th>
                                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider w-[10%]">Nilai</th>
                                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider w-[15%]">Status</th>
                                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider w-1/5">Catatan Evaluasi Guru</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 text-slate-250">
                              {massalRows.map((row, index) => {
                                return (
                                  <tr key={row.siswaId} className="hover:bg-white/5 transition-colors">
                                    
                                    {/* Column 1: Student Metadata + Last Session Info */}
                                    <td className="px-4 py-3.5 text-xs">
                                      <div className="font-bold text-slate-100 text-sm">{row.nama}</div>
                                      
                                      {/* SUCCESSFUL RESOLUTION DISPLAY SECTION */}
                                      {/* We display their absolute past history clearly below their name */}
                                      <div className="mt-2.5 max-w-sm rounded-[10px] p-2 bg-emerald-500/10 border border-emerald-500/20 text-[10px] leading-relaxed text-slate-300 pr-1">
                                        <div className="flex items-center gap-1.5 font-bold text-emerald-400">
                                          <TrendingUp className="w-3 h-3 text-emerald-400 animate-pulse" />
                                          <span>Hafalan Terakhir:</span>
                                        </div>
                                        {row.lastTanggal ? (
                                          <div className="mt-1 space-y-0.5">
                                            <div className="flex items-center gap-1 flex-wrap">
                                              <span className="font-semibold text-slate-200 bg-white/10 border border-white/5 px-1 py-0.2 rounded">{formatTanggalIndonesia(row.lastTanggal)}</span>
                                              <span>·</span>
                                              <span className="font-bold text-white">{JILID_LABEL[row.lastJilid] || row.lastJilid}</span>
                                              <span>·</span>
                                              <span className="font-bold text-emerald-300 bg-emerald-500/20 px-1 rounded">Hlm {row.lastHalaman}</span>
                                            </div>
                                            {row.lastStatus && (
                                              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                                <span className="text-[10px] text-slate-350 font-semibold">{row.lastStatus === 'lancar' ? '✓ Lancar' : '🔄 Mengulang'}</span>
                                                {row.lastNilai && <span className="text-amber-300 font-bold bg-amber-500/10 px-1 rounded border border-amber-500/15 text-[9px]">Score {row.lastNilai}</span>}
                                                {row.lastCatatan && <span className="text-slate-400 italic shrink truncate max-w-[200px]" title={row.lastCatatan}>"{row.lastCatatan}"</span>}
                                              </div>
                                            )}
                                          </div>
                                        ) : (
                                          <div className="text-slate-400 italic mt-1 font-medium">Buku Baru: Mulai dari {JILID_LABEL[row.lastJilid]} Hlm {row.lastHalaman}</div>
                                        )}
                                      </div>
                                    </td>

                                    {/* Column 2: Jilid selector */}
                                    <td className="px-4 py-3.5">
                                      <select
                                        value={row.jilid}
                                        onChange={(e) => handleMassalRowChange(index, 'jilid', e.target.value)}
                                        className="w-full rounded-lg border border-white/10 bg-slate-900/60 hover:bg-slate-900/80 text-white text-xs p-1.5 outline-hidden focus:border-emerald-500 font-semibold cursor-pointer"
                                      >
                                        <option value="jilid1" className="bg-slate-900 text-white">Jilid 1</option>
                                        <option value="jilid2" className="bg-slate-900 text-white">Jilid 2</option>
                                        <option value="jilid3" className="bg-slate-900 text-white">Jilid 3</option>
                                        <option value="jilid4" className="bg-slate-900 text-white">Jilid 4</option>
                                        <option value="jilid5" className="bg-slate-900 text-white">Jilid 5</option>
                                        <option value="jilid6" className="bg-slate-900 text-white">Jilid 6</option>
                                        <option value="alquran" className="bg-slate-900 text-white">Al-Qur'an</option>
                                      </select>
                                    </td>

                                    {/* Column 3: Halaman Controller with Incrementer Tool */}
                                    <td className="px-4 py-3.5">
                                      <div className="flex items-center gap-1">
                                        <input
                                          type="text"
                                          value={row.halaman}
                                          onChange={(e) => handleMassalRowChange(index, 'halaman', e.target.value)}
                                          className="w-full text-center rounded-lg border border-white/10 bg-slate-900/60 focus:bg-slate-900/40 text-white text-xs p-1.5 focus:border-emerald-500 font-bold placeholder-slate-400 outline-hidden"
                                        />
                                        <button
                                          onClick={() => incrementHalaman(index)}
                                          className="p-1.5 bg-emerald-500/10 border border-emerald-500/25 hover:bg-emerald-600 text-emerald-300 hover:text-white rounded-lg transition-all cursor-pointer font-bold text-xs select-none"
                                          title="Halaman Selanjutnya (+1)"
                                        >
                                          +1
                                        </button>
                                      </div>
                                    </td>

                                    {/* Column 4: Nilai input */}
                                    <td className="px-4 py-3.5">
                                      <input
                                        type="number"
                                        value={row.nilai}
                                        onChange={(e) => handleMassalRowChange(index, 'nilai', parseInt(e.target.value, 10) || 0)}
                                        className="w-full text-center rounded-lg border border-white/10 bg-slate-900/60 focus:bg-slate-900/40 text-amber-350 text-xs p-1.5 focus:border-emerald-500 font-bold text-amber-300"
                                      />
                                    </td>

                                    {/* Column 5: Status selection */}
                                    <td className="px-4 py-3.5">
                                      <select
                                        value={row.status}
                                        onChange={(e) => handleMassalRowChange(index, 'status', e.target.value)}
                                        className="w-full rounded-lg border border-white/10 bg-slate-900/60 hover:bg-slate-900/80 text-white text-xs p-1.5 outline-hidden focus:border-emerald-500 cursor-pointer font-semibold"
                                      >
                                        <option value="lancar" className="bg-slate-900 text-white">✅ Lancar</option>
                                        <option value="perlu_ulang" className="bg-slate-900 text-white">🔄 Ulang</option>
                                        <option value="tidak_hadir" className="bg-slate-900 text-white">❌ Absen</option>
                                      </select>
                                    </td>

                                    {/* Column 6: Catatan input */}
                                    <td className="px-4 py-3.5">
                                      <input
                                        type="text"
                                        placeholder="Catatan tambahan..."
                                        value={row.catatan}
                                        onChange={(e) => handleMassalRowChange(index, 'catatan', e.target.value)}
                                        className="w-full rounded-lg border border-white/10 bg-slate-900/60 focus:bg-white focus:text-slate-900 text-white placeholder-slate-400 text-xs p-1.5 focus:border-emerald-500 transition-all"
                                      />
                                    </td>

                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        {/* Bulk submission final button */}
                        <div className="bg-white/5 border-t border-white/5 p-4 shrink-0 flex items-center justify-end gap-3">
                          <span className="text-xs text-slate-350 italic font-semibold">Terdapat {massalRows.filter(r => r.halaman.trim() !== "").length} baris siap disimpan.</span>
                          <button
                            onClick={simpanSetoranMassal}
                            disabled={savingMassal}
                            className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:border-transparent text-white font-bold text-xs px-6 py-2.5 rounded-xl cursor-pointer transition-all border border-emerald-500/40 shadow-lg flex items-center gap-1.5 select-none hover:scale-[1.01] active:scale-95"
                            id="btn-save-massal"
                          >
                            <Save className="w-4 h-4" />
                            <span>🚀 Simpan Setoran Kelas ({imKelas})</span>
                          </button>
                        </div>

                      </div>
                    )}

                  </div>

                </div>
              )}

            </div>
          </div>
        )}

      </div>

      {/* Footer copyright */}
      <footer className="bg-slate-900 text-slate-400 py-6 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 text-center text-[11px]">
          <p>© {new Date().getFullYear()} SD Muhammadiyah 2 Pekajangan. All Rights Reserved.</p>
          <p className="mt-1 text-slate-500">Dikembangkan secara responsif dengan integrasi lancar Google Sheets API.</p>
        </div>
      </footer>


      {/* ========================================================================================= */}
      {/* SCRIPT CONFIGURATION MODAL */}
      {/* ========================================================================================= */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900/80 backdrop-blur-xl rounded-3xl p-6 w-full max-w-lg shadow-2xl border border-white/15 text-white font-sans animate-fade-in">
            
            <div className="flex items-center gap-2 text-emerald-400 mb-3">
              <Settings className="w-5 h-5 text-emerald-400 rotate-animation" />
              <h3 className="font-bold text-sm tracking-tight">Ganti Server Google Apps Script</h3>
            </div>

            <p className="text-xs text-slate-300 mb-4 leading-relaxed">
              Jika Anda menyalin lembar kerja Google Sheets baru atau mendeploy Web App Apps Script baru, masukkan tautan URL macro web app yang baru di bawah ini agar data sinkron.
            </p>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Google Web App URL</label>
                <textarea
                  rows={2}
                  value={editingUrlValue}
                  onChange={(e) => setEditingUrlValue(e.target.value)}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  className="w-full p-2.5 bg-slate-950/40 border border-white/10 focus:border-emerald-500 rounded-xl text-xs outline-hidden focus:bg-slate-950/20 text-white font-mono leading-tight resize-none placeholder-slate-500"
                />
              </div>

              <div className="bg-white/5 p-3 rounded-xl border border-white/5 text-[10px] text-slate-300 space-y-1">
                <span className="font-semibold block text-slate-200">Petunjuk Deployment:</span>
                <div>1. Buka File Google Sheets yang terhubung.</div>
                <div>2. Salin kode Apps Script pendukung. Klik <span className="font-semibold">Extensions &gt; Apps Script</span>.</div>
                <div>3. Klik tombol <span className="font-semibold">Deploy &gt; New Deployment</span>. Pilih jenis <span className="font-semibold">Web App</span>.</div>
                <div>4. Atur akses: <span className="font-semibold">"Anyone"</span> agar aplikasi dapat menyinkronkan data.</div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={handleResetUrl}
                  className="text-xs font-bold text-slate-400 hover:text-white cursor-pointer"
                >
                  Reset ke Default
                </button>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowConfigModal(false)}
                    className="px-3.5 py-1.5 text-xs text-slate-400 hover:text-white font-semibold cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    onClick={saveScriptConfig}
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg cursor-pointer transition-colors"
                  >
                    Simpan Perubahan
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
