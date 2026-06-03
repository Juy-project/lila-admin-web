import { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  LayoutDashboard, Users, CreditCard, Settings, Menu, X, RefreshCw, 
  Megaphone, Upload, Save, Key, ShieldAlert, Camera, LogOut, TrendingUp, 
  Check, Info, CheckCircle2, AlertTriangle, ImageIcon, Package, Plus, Trash2, Edit3, FileText, Download, Edit, Image as ImageIcon2
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const supabase = createClient('https://rqbqbwigvimbudpvjuol.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJxYnFid2lndmltYnVkcHZqdW9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4MjA4MTIsImV4cCI6MjA5NTM5NjgxMn0.hge91kVRonaioauBVTwCGj3OABl6dXUhsY4hYY0p5Gs');

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginData, setLoginData] = useState({ id: '', pass: '' });
  const [activeTab, setActiveTab] = useState('dashboard');
  const [activeChart, setActiveChart] = useState('users'); 
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [broadcastLoading, setBroadcastLoading] = useState(false);

  
  const [toast, setToast] = useState({ show: false, msg: '', type: 'success' });
  const [dialog, setDialog] = useState({ show: false, msg: '', onConfirm: null });
  const [inputDialog, setInputDialog] = useState({ show: false, title: '', placeholder: '', type: 'text', onSubmit: null });
  const [inputValue, setInputValue] = useState('');
  
  const [users, setUsers] = useState([]);
  const [topups, setTopups] = useState([]);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [config, setConfig] = useState({});
  const [bcMsg, setBcMsg] = useState('');
  const [bcImg, setBcImg] = useState('');
  const [trends, setTrends] = useState([]);

  const [productForm, setProductForm] = useState({ id: null, name: '', description: '', price: '', quota_turnitin: '', quota_ai: '' });

  const showToast = (msg, type = 'success') => { setToast({ show: true, msg, type }); setTimeout(() => setToast({ show: false, msg: '', type: 'success' }), 3000); };
  const showConfirm = (msg, onConfirmCallback) => setDialog({ show: true, msg, onConfirm: onConfirmCallback });
  const closeConfirm = () => setDialog({ show: false, msg: '', onConfirm: null });
  const showPrompt = (title, placeholder, type, onSubmitCallback) => { setInputValue(''); setInputDialog({ show: true, title, placeholder, type, onSubmit: onSubmitCallback }); };
  const closePrompt = () => setInputDialog({ show: false, title: '', placeholder: '', type: 'text', onSubmit: null });

  // --- API TELEGRAM (DIRECT - TANPA WORKER) ---
  const sendTgMessage = async (chatId, text) => {
    if (!config?.bot_token) return;
    try {
      const res = await fetch(`https://api.telegram.org/bot${config.bot_token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: String(chatId), text, parse_mode: 'Markdown' })
      });
      const data = await res.json();
      if (!data.ok) console.log('Telegram Error:', data.description);
    } catch(err) { console.log('Send Error:', err); }
  };

  const sendTgDocument = async (chatId, caption, fileOrBlob, fileName) => {
    if (!config?.bot_token) return;
    try {
      const formData = new FormData();
      formData.append('chat_id', String(chatId));
      formData.append('caption', caption);
      formData.append('parse_mode', 'Markdown');
      formData.append('document', fileOrBlob, fileName);
      
      const res = await fetch(`https://api.telegram.org/bot${config.bot_token}/sendDocument`, { 
        method: 'POST', 
        body: formData 
      });
      const data = await res.json();
      if (!data.ok) console.log('Telegram Doc Error:', data.description);
    } catch(err) { console.log('Send Doc Error:', err); }
  };

  const sendTgPhoto = async (chatId, caption, file) => {
    if (!config?.bot_token) return;
    try {
      const formData = new FormData();
      formData.append('chat_id', String(chatId));
      formData.append('caption', caption);
      formData.append('parse_mode', 'Markdown');
      formData.append('photo', file);
      
      const res = await fetch(`https://api.telegram.org/bot${config.bot_token}/sendPhoto`, { 
        method: 'POST', 
        body: formData 
      });
      const data = await res.json();
      if (!data.ok) console.log('Telegram Photo Error:', data.description);
    } catch(err) { console.log('Send Photo Error:', err); }
  };

  // --- REALTIME LISTENER SUPABASE ---
  useEffect(() => {
    const checkSession = () => {
      const s = JSON.parse(localStorage.getItem('lila_sec_protocol'));
      if (s?.logged) setIsLoggedIn(true);
    };
    checkSession();
    fetchData();

    const channel = supabase
      .channel('realtime-db')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, () => {
        fetchData(); 
        showToast('🔔 Ada Order Baru Masuk!', 'success');
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'topups' }, () => fetchData())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchData = async () => {
    setLoading(true);
    
    // OPTIMASI: Jangan pakai select('*') lagi. Tarik data yang cuma mau ditampilkan saja!
    const { data: u } = await supabase.from('users')
      .select('telegram_id, username, quota_turnitin, quota_ai, total_order, total_topup, is_banned, created_at')
      .order('created_at', { ascending: true });
      
    const { data: t } = await supabase.from('topups')
      .select('id, telegram_id, package_name, amount, payment_proof, status, created_at')
      .order('created_at', { ascending: true });
      
    const { data: p } = await supabase.from('products')
      .select('id, name, description, price, quota_turnitin, quota_ai')
      .order('created_at', { ascending: true });
      
    const { data: o } = await supabase.from('orders')
      .select('id, telegram_id, username, service_type, details, file_url, status, created_at')
      .order('created_at', { ascending: true });
      
    const { data: c } = await supabase.from('settings').select('*').eq('id', 1).single();
    
    if (u) setUsers(u); if (c) setConfig(c); if (t) setTopups(t); if (p) setProducts(p); if (o) setOrders(o);
    
// Hitung data untuk chart
const days = [
  'Sen',
  'Sel',
  'Rab',
  'Kam',
  'Jum',
  'Sab',
  'Min'
];

const trendData =
  days.map(day => ({
    name: day,
    users: 0,
    pending: 0,
    success: 0,
    revenue: 0
  }));

// =========================================
// DATA TOPUP
// =========================================
t?.forEach(item => {

  if (item.created_at) {

    const d =
      new Date(
        item.created_at
      ).getDay();

    const idx =
      d === 0
        ? 6
        : d - 1;

    // PENDING
    if (
      item.status === 'PENDING'
    ) {

      trendData[idx].pending += 1;
    }

    // SUCCESS
    if (
      item.status === 'SUCCESS'
    ) {

      trendData[idx].success += 1;

      trendData[idx].revenue +=
        (item.amount || 0);
    }
  }
});

// =========================================
// DATA USER
// =========================================
u?.forEach(item => {

  if (item.created_at) {

    const d =
      new Date(
        item.created_at
      ).getDay();

    const idx =
      d === 0
        ? 6
        : d - 1;

    trendData[idx].users += 1;
  }
});

setTrends(trendData);

setLoading(false);

};

  const handleLogin = async (e) => {
    e.preventDefault();
    if ((loginData.id == config.owner_id && loginData.pass == config.password) || (loginData.id === '7475939789' && loginData.pass === 'masuk123')) {
      localStorage.setItem('lila_sec_protocol', JSON.stringify({ logged: true })); 
      setIsLoggedIn(true);
      showToast('Login Berhasil', 'success');
    } else {
      showToast('Otentikasi Gagal!', 'error');
    }
  };

  const handleLogout = () => { 
    showConfirm('Keluar dari sistem?', () => { 
      localStorage.removeItem('lila_sec_protocol'); 
      setIsLoggedIn(false); 
      setShowProfileModal(false); 
    }); 
  };

  const handleImageUpload = (e, target) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => { if (target === 'broadcast') setBcImg(reader.result); else setConfig({ ...config, [target]: reader.result }); };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveSettings = async () => {
    const { error } = await supabase.from('settings').update(config).eq('id', 1).select();
    if (error) showToast('GAGAL MENYIMPAN: ' + error.message, 'error');
    else { await fetchData(); showToast('PENGATURAN DISIMPAN!', 'success'); setShowProfileModal(false); }
  };

const handleSendBroadcast = async () => {

  // ANTI DOUBLE CLICK
  if (broadcastLoading) return;

  if (!bcMsg)
    return showToast(
      'Isi pesan broadcast terlebih dahulu!',
      'error'
    );

  if (!config?.bot_token)
    return showToast(
      'Token Bot belum diisi di Pengaturan!',
      'error'
    );

  showConfirm(
    `Kirim broadcast ke ${users.length} pengguna aktif sekarang?`,
    async () => {

      try {

        // LOCK BUTTON
        setBroadcastLoading(true);

        showToast(
          `PROSES BROADCAST DIMULAI... Mohon tunggu.`,
          'success'
        );

        let successCount = 0;

        for (const u of users) {

          try {

            if (bcImg) {

              const formData =
                new FormData();

              formData.append(
                'chat_id',
                String(u.telegram_id)
              );

              formData.append(
                'caption',
                bcMsg
              );

              formData.append(
                'parse_mode',
                'Markdown'
              );

              // Convert base64 image to Blob
              const res =
                await fetch(bcImg);

              const blob =
                await res.blob();

              formData.append(
                'photo',
                blob,
                'broadcast.jpg'
              );

              await fetch(
                `https://api.telegram.org/bot${config.bot_token}/sendPhoto`,
                {
                  method: 'POST',
                  body: formData
                }
              );

            } else {

              await fetch(
                `https://api.telegram.org/bot${config.bot_token}/sendMessage`,
                {
                  method: 'POST',
                  headers: {
                    'Content-Type':
                      'application/json'
                  },
                  body: JSON.stringify({
                    chat_id: String(
                      u.telegram_id
                    ),
                    text: bcMsg,
                    parse_mode: 'Markdown'
                  })
                }
              );
            }

            successCount++;

          } catch (e) {

            console.log(
              'Broadcast error:',
              e
            );
          }
        }

        showToast(
          `BROADCAST SELESAI! Terkirim ke ${successCount} user.`,
          'success'
        );

        // RESET FORM
        setBcMsg('');
        setBcImg('');

      } finally {

        // BUKA LOCK LAGI
        setBroadcastLoading(false);

        // TUTUP POPUP CONFIRM
        closeConfirm();
      }
    }
  );
};


  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (!productForm.name || !productForm.price) return showToast('Nama & Harga wajib diisi!', 'error');
    const payload = { name: productForm.name, description: productForm.description, price: parseInt(productForm.price), quota_turnitin: parseInt(productForm.quota_turnitin || 0), quota_ai: parseInt(productForm.quota_ai || 0) };
    
    if (productForm.id) {
      const { error } = await supabase.from('products').update(payload).eq('id', productForm.id).select();
      if (!error) { await fetchData(); showToast('Produk Diperbarui!'); setProductForm({ id: null, name: '', description: '', price: '', quota_turnitin: '', quota_ai: '' }); }
    } else {
      const { error } = await supabase.from('products').insert([payload]).select();
      if (!error) { await fetchData(); showToast('Produk Ditambahkan!'); setProductForm({ id: null, name: '', description: '', price: '', quota_turnitin: '', quota_ai: '' }); }
    }
  };

  const handleDeleteProduct = async (id) => {
    showConfirm('Hapus produk ini?', async () => { await supabase.from('products').delete().eq('id', id); await fetchData(); showToast('Produk Dihapus!'); });
  };

// ==========================================
// RENDER PUSAT
// ==========================================

if (!isLoggedIn) {

  return (

    <div className="h-screen w-full flex items-center justify-center font-mono p-4 bg-[#050505] relative overflow-hidden">

      {toast.show && (
        <div className="fixed top-8 right-8 z-[100] bg-purple-900 border border-purple-500 p-4 rounded-xl shadow-lg text-white font-bold">
          {toast.msg}
        </div>
      )}

      <div className="absolute w-96 h-96 bg-purple-600/10 blur-[120px] rounded-full top-0 left-0"></div>

      <form
        onSubmit={handleLogin}
        className="w-full max-w-md bg-black/40 border border-purple-500/30 p-8 rounded-2xl relative z-10"
      >

        <h1 className="text-2xl font-black text-center mb-8 text-purple-400">
          LILA ACCESS
        </h1>

        <div className="space-y-6">

          <input
            required
            type="text"
            className="w-full bg-white/5 p-4 rounded-xl text-white outline-none focus:border-purple-500 transition-all border border-transparent"
            placeholder="ID Telegram Owner"
            onChange={e =>
              setLoginData({
                ...loginData,
                id: e.target.value
              })
            }
          />

          <input
            required
            type="password"
            className="w-full bg-white/5 p-4 rounded-xl text-white outline-none focus:border-purple-500 transition-all border border-transparent"
            placeholder="Password Sistem"
            onChange={e =>
              setLoginData({
                ...loginData,
                pass: e.target.value
              })
            }
          />

          <button className="w-full bg-purple-600 py-4 rounded-xl font-bold text-white uppercase hover:shadow-[0_0_20px_#8b5cf6]">
            AUTHORIZE LOGIN
          </button>

        </div>

      </form>

    </div>
  );
}

// =========================================
// REALTIME MONTHLY REVENUE
// =========================================

const currentMonth =
  new Date().getMonth();

const currentYear =
  new Date().getFullYear();

// TOPUP BULAN INI
const monthlyTopups =
  topups.filter(t => {

    if (
      t.status !== 'SUCCESS' ||
      !t.created_at
    ) return false;

    const d =
      new Date(t.created_at);

    return (
      d.getMonth() === currentMonth &&
      d.getFullYear() === currentYear
    );
  });

// PENDAPATAN BULAN INI
const monthlyRevenue =
  monthlyTopups.reduce(
    (a, c) =>
      a + (c.amount || 0),
    0
  );

// TOTAL PENDAPATAN
const totalRevenue =
  topups
    .filter(
      t => t.status === 'SUCCESS'
    )
    .reduce(
      (a, c) =>
        a + (c.amount || 0),
      0
    );

  return (
    <div className="flex h-screen bg-[#050505] font-sans text-gray-100 overflow-hidden relative">
      {/* MODALS */}
      {toast.show && <div className="fixed top-8 right-8 z-[100] bg-purple-900 border border-purple-500 p-4 rounded-xl shadow-lg text-white font-bold">{toast.msg}</div>}
      
      {dialog.show && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80">
          <div className="bg-[#0a0a0f] border border-purple-500/30 p-8 rounded-2xl w-96 text-center shadow-2xl">
            <p className="mb-8 font-bold">{dialog.msg}</p>
            <div className="flex gap-4">
              <button onClick={closeConfirm} className="flex-1 py-3 rounded-xl border border-white/10 text-gray-400 hover:text-white transition-all">Batal</button>
              <button onClick={async () => { await dialog.onConfirm(); closeConfirm(); }} className="flex-1 py-3 rounded-xl bg-purple-600 text-white font-bold hover:bg-purple-500 transition-all">Lanjutkan</button>
            </div>
          </div>
        </div>
      )}

      {inputDialog.show && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80">
          <div className="bg-[#0a0a0f] border border-purple-500/30 p-8 rounded-2xl w-[500px] shadow-2xl">
            <h3 className="text-center font-bold text-purple-400 mb-6">{inputDialog.title}</h3>
            {inputDialog.type === 'textarea' ? (
              <textarea autoFocus className="w-full bg-black/40 p-4 rounded-xl mb-6 min-h-[150px] outline-none border border-white/10 focus:border-purple-500" placeholder={inputDialog.placeholder} value={inputValue} onChange={(e) => setInputValue(e.target.value)} />
            ) : (
              <input type={inputDialog.type} autoFocus className="w-full bg-black/40 p-4 rounded-xl mb-6 outline-none border border-white/10 focus:border-purple-500" placeholder={inputDialog.placeholder} value={inputValue} onChange={(e) => setInputValue(e.target.value)} />
            )}
            <div className="flex gap-4">
              <button onClick={closePrompt} className="flex-1 py-3 border border-white/10 rounded-xl text-gray-400 hover:text-white transition-all">Batal</button>
              <button onClick={() => { inputDialog.onSubmit(inputValue); closePrompt(); }} className="flex-1 py-3 bg-purple-600 rounded-xl text-white font-bold hover:bg-purple-500 transition-all">Kirim</button>
            </div>
          </div>
        </div>
      )}

      {/* SIDEBAR */}
      <div className={`${sidebarOpen ? 'w-64' : 'w-20'} transition-all bg-black/20 border-r border-white/5 flex flex-col z-20 backdrop-blur-xl shadow-2xl`}>
        <div className="h-20 flex items-center justify-between px-6 border-b border-white/5">
          {sidebarOpen && <h1 className="text-lg font-black text-purple-400 tracking-tighter">LILA STORE</h1>}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-gray-400 hover:text-white"><Menu size={20} /></button>
        </div>
        <nav className="flex-1 px-4 py-8 space-y-2 overflow-y-auto">
          <NavItem icon={<LayoutDashboard size={20}/>} label="Dashboard" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} open={sidebarOpen} />
          <NavItem icon={<CreditCard size={20}/>} label="Konfirmasi Topup" active={activeTab === 'topup'} onClick={() => setActiveTab('topup')} open={sidebarOpen} />
          <NavItem icon={<FileText size={20}/>} label="Antrean Cek" active={activeTab === 'orders'} onClick={() => setActiveTab('orders')} open={sidebarOpen} />
          <NavItem icon={<Package size={20}/>} label="Setting Produk" active={activeTab === 'products'} onClick={() => setActiveTab('products')} open={sidebarOpen} />
          <NavItem icon={<Users size={20}/>} label="Data Pelanggan" active={activeTab === 'customers'} onClick={() => setActiveTab('customers')} open={sidebarOpen} />
          {/* INI YANG TADI KELUPAAN: PUSAT BROADCAST */}
          <NavItem icon={<Megaphone size={20}/>} label="Pusat Broadcast" active={activeTab === 'broadcast'} onClick={() => setActiveTab('broadcast')} open={sidebarOpen} />
          <NavItem icon={<Settings size={20}/>} label="Pengaturan Bot" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} open={sidebarOpen} />
        </nav>
        <div className="p-4 border-t border-white/5">
          <button onClick={handleLogout} className="flex items-center gap-4 text-red-400 w-full p-3 hover:bg-red-500/10 rounded-xl transition-all">
            <LogOut size={20}/> {sidebarOpen && <span className="text-xs font-bold uppercase tracking-widest">KELUAR</span>}
          </button>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col relative overflow-hidden">
        <header className="h-20 border-b border-white/5 flex items-center justify-between px-8 bg-black/10 backdrop-blur-md relative z-30">
          <div className="text-[10px] font-mono text-purple-500 tracking-widest uppercase">SYSTEM CORE V5.0 SECURE</div>
          <div className="flex items-center gap-4 cursor-pointer hover:bg-white/5 p-2 rounded-xl transition-all" onClick={() => setShowProfileModal(!showProfileModal)}>
            <div className="text-right">
              <p className="text-xs font-bold text-white uppercase">{config.admin_name || 'Owner'}</p>
              <p className="text-[9px] text-purple-400 font-mono">ID: {config.owner_id}</p>
            </div>
            <img src={config.admin_photo || 'https://via.placeholder.com/100'} className="w-10 h-10 rounded-full border border-purple-500/50 object-cover bg-black" />
          </div>

          {showProfileModal && (
            <div className="absolute right-8 top-16 mt-2 w-72 bg-[#0a0a0f] border border-purple-500/30 rounded-2xl shadow-2xl p-6 z-50">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xs font-mono text-purple-400">EDIT PROFIL ADMIN</h3>
                <X size={16} className="cursor-pointer text-gray-400 hover:text-white" onClick={() => setShowProfileModal(false)} />
              </div>
              <div className="space-y-4">
                <div className="flex justify-center relative mb-2">
                  <div className="w-20 h-20 rounded-full border-2 border-purple-500 overflow-hidden relative group bg-black">
                    <img src={config.admin_photo || 'https://via.placeholder.com/100'} className="w-full h-full object-cover" />
                    <label className="absolute inset-0 bg-black/70 flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity"><Camera size={18} className="text-white"/><input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'admin_photo')} /></label>
                  </div>
                </div>
                <div>
                  <label className="text-[9px] text-purple-400 font-mono tracking-widest block mb-1">NAMA TAMPILAN</label>
                  <input type="text" className="w-full bg-black border border-white/10 p-2 rounded-xl text-xs text-white outline-none focus:border-purple-500" value={config.admin_name || ''} onChange={e => setConfig({...config, admin_name: e.target.value})} />
                </div>
                <button onClick={handleSaveSettings} className="w-full bg-purple-600 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-purple-500 transition-all text-white">SIMPAN PERUBAHAN</button>
              </div>
            </div>
          )}
        </header>

        <main className="flex-1 overflow-y-auto p-8">
    
{/* --- TAB DASHBOARD --- */}
{activeTab === 'dashboard' && (

  <div className="space-y-8 animate-in fade-in">

    <div className="flex items-center justify-between">

      <h2 className="text-2xl font-black uppercase text-white">
        Analitik Real-time
      </h2>

      <button
        onClick={async () => {
          await fetchData();

          showToast(
            'Sinkronisasi Berhasil',
            'success'
          );
        }}
        className="p-2 bg-white/5 rounded-lg text-purple-400 hover:bg-white/10 transition-all"
      >
        <RefreshCw
          size={18}
          className={
            loading
              ? 'animate-spin'
              : ''
          }
        />
      </button>

    </div>

    <div className="grid grid-cols-1 md:grid-cols-5 gap-6">

      <StatCard
        title="Total Pelanggan"
        val={users.length}
        color="border-purple-500"
        onClick={() =>
          setActiveChart('users')
        }
      />

      <StatCard
        title="Top Up Pending"
        val={
          topups.filter(
            t => t.status === 'PENDING'
          ).length
        }
        color="border-yellow-500"
        onClick={() =>
          setActiveChart('pending')
        }
      />

      <StatCard
        title="Transaksi Selesai"
        val={
          topups.filter(
            t => t.status === 'SUCCESS'
          ).length
        }
        color="border-green-500"
        onClick={() =>
          setActiveChart('success')
        }
      />

      <StatCard
        title="Pendapatan Bulan Ini"
        val={`Rp ${monthlyRevenue.toLocaleString()}`}
        color="border-cyan-500"
        onClick={() =>
          setActiveChart('revenue')
        }
      />

      <StatCard
        title="Total Pendapatan"
        val={`Rp ${totalRevenue.toLocaleString()}`}
        color="border-fuchsia-500"
        onClick={() =>
          setActiveChart('revenue')
        }
      />

    </div>

    <div className="bg-white/5 border border-white/10 p-6 rounded-2xl h-80 shadow-xl">

      <h3 className="mb-4 font-bold text-purple-400 capitalize flex items-center gap-2">
        <TrendingUp size={18}/>
        {activeChart} Chart
      </h3>

      <ResponsiveContainer
        width="100%"
        height="100%"
      >

        <AreaChart data={trends}>

          <XAxis
            dataKey="name"
            stroke="#666"
          />

          <Tooltip
            contentStyle={{
              background: '#0a0a0f',
              border: '1px solid #333'
            }}
          />

          <Area
            type="monotone"
            dataKey={activeChart}
            stroke="#8b5cf6"
            fillOpacity={0.2}
            strokeWidth={3}
          />

        </AreaChart>

      </ResponsiveContainer>

    </div>

  </div>

)}

          {/* --- TAB LAIN-LAIN --- */}
          {activeTab === 'topup' && <TopupTab topups={topups} products={products} onUpdate={fetchData} showToast={showToast} showConfirm={showConfirm} showPrompt={showPrompt} sendTgMessage={sendTgMessage} supabase={supabase} />}
          {activeTab === 'orders' && <OrdersTab orders={orders} onUpdate={fetchData} showToast={showToast} showConfirm={showConfirm} showPrompt={showPrompt} sendTgMessage={sendTgMessage} sendTgDocument={sendTgDocument} sendTgPhoto={sendTgPhoto} supabase={supabase} />}
          {activeTab === 'customers' && <CustomerTab users={users} onUpdate={fetchData} showToast={showToast} showConfirm={showConfirm} showPrompt={showPrompt} supabase={supabase} />}

          {/* --- TAB PRODUK --- */}
          {activeTab === 'products' && (
            <div className="space-y-8 animate-in fade-in">
               <h2 className="text-xl font-black uppercase text-white flex items-center gap-2"><Package className="text-purple-400"/> Manajemen Produk</h2>
               <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="col-span-1 bg-white/5 p-6 rounded-2xl h-fit border border-white/10">
                     <h3 className="text-sm font-mono text-purple-400 mb-4 uppercase tracking-widest"><Plus size={16} className="inline mr-2"/> {productForm.id ? 'Edit Produk' : 'Tambah Produk Baru'}</h3>
                     <form onSubmit={handleSaveProduct} className="space-y-4">
                        <div>
                          <label className="text-[9px] text-gray-400 font-mono">NAMA PAKET</label>
                          <input className="w-full bg-black/40 p-3 rounded-xl text-xs text-white outline-none focus:border-purple-500 border border-transparent" value={productForm.name} onChange={e => setProductForm({...productForm, name: e.target.value})} placeholder="Contoh: Paket Turnitin" />
                        </div>
                        <div>
                          <label className="text-[9px] text-gray-400 font-mono">DESKRIPSI (Tampil di Bot)</label>
                          <textarea className="w-full bg-black/40 p-3 rounded-xl text-xs text-white min-h-[80px] outline-none focus:border-purple-500 border border-transparent" value={productForm.description} onChange={e => setProductForm({...productForm, description: e.target.value})} placeholder="Deskripsi paket..." />
                        </div>
                        <div>
                          <label className="text-[9px] text-gray-400 font-mono">HARGA (Rp)</label>
                          <input className="w-full bg-black/40 p-3 rounded-xl text-xs text-white outline-none focus:border-purple-500 border border-transparent" type="number" value={productForm.price} onChange={e => setProductForm({...productForm, price: e.target.value})} placeholder="5000" />
                        </div>
                        <div className="flex gap-2">
                           <div className="flex-1">
                             <label className="text-[9px] text-gray-400 font-mono">KUOTA TURNITIN</label>
                             <input className="w-full bg-black/40 p-3 rounded-xl text-xs text-white outline-none focus:border-purple-500 border border-transparent" type="number" value={productForm.quota_turnitin} onChange={e => setProductForm({...productForm, quota_turnitin: e.target.value})} placeholder="0" />
                           </div>
                           <div className="flex-1">
                             <label className="text-[9px] text-gray-400 font-mono">KUOTA AI</label>
                             <input className="w-full bg-black/40 p-3 rounded-xl text-xs text-white outline-none focus:border-purple-500 border border-transparent" type="number" value={productForm.quota_ai} onChange={e => setProductForm({...productForm, quota_ai: e.target.value})} placeholder="0" />
                           </div>
                        </div>
                        <div className="flex gap-2 pt-2">
                           {productForm.id && <button type="button" onClick={() => setProductForm({ id: null, name: '', description: '', price: '', quota_turnitin: '', quota_ai: '' })} className="flex-1 bg-white/5 py-3 rounded-xl text-xs font-bold text-gray-400 hover:text-white transition-all">Batal</button>}
                           <button type="submit" className="flex-1 bg-purple-600 hover:bg-purple-500 py-3 rounded-xl text-xs font-bold text-white transition-all"><Save size={14} className="inline mr-2"/>Simpan</button>
                        </div>
                     </form>
                  </div>
                  <div className="col-span-2 bg-white/5 p-6 rounded-2xl border border-white/10">
                     <h3 className="text-sm font-mono text-purple-400 mb-4 uppercase tracking-widest">Daftar Paket Aktif</h3>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {products.map(p => (
                          <div key={p.id} className="bg-black/40 p-4 rounded-xl border border-white/5 flex justify-between items-center shadow-lg">
                             <div>
                                <p className="font-bold text-white text-base">{p.name}</p>
                                <p className="text-xs text-purple-400 font-mono">Rp {p.price.toLocaleString()}</p>
                                <p className="text-[10px] text-gray-400 font-mono mt-1">Turnitin: {p.quota_turnitin}x | AI: {p.quota_ai}x</p>
                             </div>
                             <div className="flex gap-2">
                                <button onClick={() => setProductForm(p)} className="p-2 bg-purple-600/20 text-purple-400 rounded-lg hover:bg-purple-600 hover:text-white transition-all"><Edit3 size={14}/></button>
                                <button onClick={() => handleDeleteProduct(p.id)} className="p-2 bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600 hover:text-white transition-all"><Trash2 size={14}/></button>
                             </div>
                          </div>
                        ))}
                     </div>
                  </div>
               </div>
            </div>
          )}

          {/* --- TAB BROADCAST --- */}
          {activeTab === 'broadcast' && (
            <div className="max-w-3xl space-y-6 animate-in fade-in">
              <h2 className="text-xl font-black uppercase text-white flex items-center gap-2"><Megaphone className="text-purple-400"/> Pusat Broadcast</h2>
              <div className="bg-white/5 border border-white/10 p-8 rounded-2xl shadow-xl space-y-6">
                <div>
                  <label className="text-[10px] font-mono text-purple-400 uppercase tracking-widest block mb-2">Isi Pesan Siaran</label>
                  <textarea value={bcMsg} onChange={e => setBcMsg(e.target.value)} className="w-full bg-black/40 border border-transparent p-4 rounded-xl text-sm text-white outline-none focus:border-purple-500 min-h-[120px]" placeholder="Ketik pesan promosi..." />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-[10px] font-mono text-purple-400 uppercase tracking-widest block mb-2">Lampiran Gambar (Opsional)</label>
                    <div className="relative group cursor-pointer">
                      <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'broadcast')} className="absolute inset-0 opacity-0 z-10 cursor-pointer"/>
                      <div className="border border-dashed border-purple-500/40 p-4 rounded-xl flex items-center justify-center gap-2 text-purple-400 group-hover:bg-purple-500/10 transition-all text-xs font-bold"><Upload size={16}/> PILIH DARI GALERI</div>
                    </div>
                  </div>
                  {bcImg && (
                    <div className="relative">
                      <img src={bcImg} className="w-full h-24 object-cover border border-purple-500/50 rounded-xl" />
                      <X size={16} className="absolute -top-2 -right-2 bg-red-600 rounded-full cursor-pointer p-0.5" onClick={() => setBcImg('')} />
                    </div>
                  )}
                </div>
              <button onClick={handleSendBroadcast} disabled={broadcastLoading} className={`w-full py-4 rounded-xl text-xs font-black uppercase tracking-widest text-white shadow-lg transition-all active:scale-95 ${ broadcastLoading ? 'bg-gray-700 cursor-not-allowed opacity-60' : 'bg-purple-600 hover:bg-purple-500' }`} > {broadcastLoading ? 'MENGIRIM BROADCAST...' : 'KIRIM BROADCAST SEKARANG'} </button>              </div>
            </div>
          )}

          {/* --- TAB PENGATURAN --- */}
          {activeTab === 'settings' && (
            <div className="max-w-3xl space-y-8 pb-20 animate-in fade-in">
               <h2 className="text-xl font-black uppercase text-white">Pengaturan Sistem</h2>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white/5 border border-white/10 p-6 rounded-2xl space-y-4 shadow-xl">
                     <h3 className="text-xs font-mono text-purple-400 border-b border-white/5 pb-2"><Key size={14} className="inline mr-2"/> Keamanan</h3>
                     <div>
                       <label className="text-[9px] text-gray-400 font-mono block mb-1">ID TELEGRAM OWNER</label>
                       <input type="text" value={config.owner_id || ''} onChange={e=>setConfig({...config, owner_id: e.target.value})} className="w-full bg-black/50 p-3 rounded-xl text-xs text-white outline-none focus:border-purple-500 border border-transparent" />
                     </div>
                     <div>
                       <label className="text-[9px] text-gray-400 font-mono block mb-1">PASSWORD SISTEM</label>
                       <input type="text" value={config.password || ''} onChange={e=>setConfig({...config, password: e.target.value})} className="w-full bg-black/50 p-3 rounded-xl text-xs text-white outline-none focus:border-purple-500 border border-transparent" />
                     </div>
                  </div>
                  <div className="bg-white/5 border border-white/10 p-6 rounded-2xl space-y-4 shadow-xl">
                     <h3 className="text-xs font-mono text-purple-400 border-b border-white/5 pb-2"><Settings size={14} className="inline mr-2"/> Teks Bot</h3>
                     <div>
                       <label className="text-[9px] text-gray-400 font-mono block mb-1">PESAN START</label>
                       <textarea value={config.welcome_message || ''} onChange={e=>setConfig({...config, welcome_message: e.target.value})} className="w-full bg-black/50 p-3 rounded-xl text-xs text-white h-20 outline-none focus:border-purple-500 border border-transparent" />
                     </div>
                     <div>
                       <label className="text-[9px] text-gray-400 font-mono block mb-1">PESAN BANTUAN</label>
                       <textarea value={config.bot_help || ''} onChange={e=>setConfig({...config, bot_help: e.target.value})} className="w-full bg-black/50 p-3 rounded-xl text-xs text-white h-20 outline-none focus:border-purple-500 border border-transparent" />
                     </div>
                  </div>
               </div>

               {/* INI YANG TADI KELUPAAN JUGA: QRIS DAN BOT TOKEN */}
               <div className="bg-white/5 border border-white/10 p-6 rounded-2xl space-y-4 shadow-xl">
                  <h3 className="text-xs font-mono text-purple-400 uppercase tracking-widest">PENGATURAN KONEKSI & QRIS</h3>
                  <div className="flex flex-col md:flex-row gap-6 items-center">
                    <div className="flex-1 w-full relative">
                       <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'qris_url')} className="absolute inset-0 opacity-0 z-10 cursor-pointer" />
                       <div className="border-2 border-dashed border-white/10 p-6 rounded-xl flex flex-col items-center justify-center gap-2 text-gray-400 hover:bg-white/5 text-xs font-bold transition-all uppercase">
                         <Upload size={24}/> Upload QRIS Dari Galeri
                       </div>
                    </div>
                    {config.qris_url && (
                       <img src={config.qris_url} className="w-32 h-32 object-contain border border-white/10 rounded-xl bg-white/5 p-2" />
                    )}
                  </div>
                  <div className="pt-4 border-t border-white/5 mt-4">
                     <label className="text-[9px] font-mono text-gray-400 block mb-1">TOKEN BOT TELEGRAM</label>
                     <input type="text" value={config.bot_token || ''} onChange={e=>setConfig({...config, bot_token: e.target.value})} className="w-full bg-black/50 p-3 rounded-xl text-xs text-white font-mono outline-none focus:border-purple-500 border border-transparent" />
                  </div>
               </div>
               
               <div className="flex items-center justify-between p-4 bg-red-950/20 border border-red-500/20 rounded-2xl shadow-xl">
                  <div className="flex items-center gap-3">
                     <ShieldAlert className="text-red-500"/>
                     <div>
                       <h4 className="text-xs font-bold uppercase text-white">Mode Maintenance Bot</h4>
                       <p className="text-[10px] text-gray-400 font-mono">Aktifkan jika sistem sedang diserang atau dalam perbaikan.</p>
                     </div>
                  </div>
                  <input type="checkbox" checked={config.maintenance_mode || false} onChange={e => setConfig({...config, maintenance_mode: e.target.checked})} className="w-5 h-5 rounded border-white/10 text-red-600 focus:ring-0" />
               </div>

               <button onClick={handleSaveSettings} className="w-full bg-purple-600 py-4 rounded-xl font-bold text-white uppercase hover:bg-purple-500 transition-all shadow-xl"><Save size={16} className="inline mr-2"/> Simpan Pengaturan</button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

// --- KOMPONEN KECIL ---
function StatCard({ title, val, color, onClick }) { return <div onClick={onClick} className={`bg-white/5 p-6 rounded-2xl border-l-4 ${color} cursor-pointer hover:bg-white/10 transition-all`}><p className="text-[10px] text-gray-400 uppercase tracking-widest mb-1">{title}</p><p className="text-2xl font-black text-white">{val}</p></div>; }
function NavItem({ icon, label, active, onClick, open }) { return <div onClick={onClick} className={`flex items-center p-3 rounded-xl cursor-pointer transition-all ${active ? 'bg-purple-600/20 text-purple-400 border border-purple-500/20' : 'text-gray-500 hover:text-white'}`}><div className="mr-4">{icon}</div>{open && <span className="text-xs font-bold uppercase tracking-wide">{label}</span>}</div>; }

// --- TAB TOPUP (FIX TRY-FINALLY) ---
function TopupTab({ topups, products, onUpdate, showToast, showConfirm, showPrompt, sendTgMessage, supabase }) {
  const [processing, setProcessing] = useState(false);
  const [previewImg, setPreviewImg] = useState(null);

  const handleAction = async (id, status, telegram_id, package_name) => {
    if(processing) return;
    if (status === 'REJECTED') {
      showPrompt("Alasan Tolak", "Ketik alasan penolakan...", "text", async (reason) => {
         if (!reason) return;
         try {
           setProcessing(true);
           await supabase.from('topups').update({ status, reject_reason: reason }).eq('id', id);
           await sendTgMessage(telegram_id, `❌ *PEMBAYARAN DITOLAK*\n\n📦 *Paket:* ${package_name}\n📝 *Alasan:* ${reason}\n\n_Silakan perbaiki dan coba lagi._ 💜`);
           await onUpdate(); showToast('Ditolak', 'success');
         } catch(e) { console.log(e); showToast('Error terjadi', 'error'); } finally { setProcessing(false); }
      });
    } else {
      showConfirm(`Terima ${package_name}?`, async () => {
        try {
          setProcessing(true);
          const matchProd = products.find(p => p.name && package_name && p.name.trim().toLowerCase() === package_name.trim().toLowerCase());
          const addTurnitin = matchProd ? matchProd.quota_turnitin : 0;
          const addAi = matchProd ? matchProd.quota_ai : 0;

          const { data: user } = await supabase.from('users').select('quota_turnitin, quota_ai, total_topup').eq('telegram_id', telegram_id).single();
          if(user) {
            await supabase.from('users').update({ quota_turnitin: user.quota_turnitin + addTurnitin, quota_ai: user.quota_ai + addAi, total_topup: (user.total_topup || 0) + 1 }).eq('telegram_id', telegram_id);
          }
          
          await supabase.from('topups').update({ status }).eq('id', id);
          await sendTgMessage(telegram_id, `✅ *PEMBAYARAN BERHASIL*\n\n📦 *Paket:* ${package_name}\n🎁 *Bonus Kuota:*\n• Turnitin: ${addTurnitin}x\n• AI Checker: ${addAi}x\n\n📊 *Status:* SUCCESS\n\n_Silakan gunakan layanan sekarang_ 💜`);
          await onUpdate(); showToast('Sukses!', 'success');
        } catch(e) { console.log(e); showToast('Error terjadi', 'error'); } finally { setProcessing(false); }
      });
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in">
      <h2 className="text-xl font-black uppercase text-white mb-6">Antrean Top Up</h2>
      {topups.filter(t => t.status === 'PENDING').length === 0 && <p className="text-center text-gray-500 py-8 bg-white/5 rounded-2xl">Belum ada antrean.</p>}
      {topups.filter(t => t.status === 'PENDING').map(t => (
        <div key={t.id} className="flex flex-col md:flex-row justify-between items-center bg-white/5 p-5 rounded-xl border border-white/10 shadow-lg gap-4">
          <div className="flex gap-4 items-center w-full md:w-auto">
            <div className="w-16 h-16 bg-black/40 rounded-lg cursor-pointer flex items-center justify-center border border-white/10 relative group" onClick={() => t.payment_proof ? setPreviewImg(t.payment_proof) : null}>
              {t.payment_proof ? <><img src={t.payment_proof} className="w-full h-full object-cover rounded-lg" /><div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg"><Camera size={20} className="text-white"/></div></> : <ImageIcon size={24} className="text-gray-500"/>}
            </div>
            <div><p className="font-bold text-lg text-white">{t.package_name}</p><p className="text-[10px] text-gray-400 font-mono">ID: {t.telegram_id}</p><p className="text-green-400 font-bold text-sm mt-1">Rp {(t.amount || 0).toLocaleString()}</p></div>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <button onClick={() => handleAction(t.id, 'SUCCESS', t.telegram_id, t.package_name)} disabled={processing} className="flex-1 md:flex-none bg-green-600/20 text-green-400 border border-green-500/30 px-6 py-3 rounded-xl text-xs font-bold hover:bg-green-600 hover:text-white transition-all disabled:opacity-50"><Check size={16} className="inline mr-1"/> Terima</button>
            <button onClick={() => handleAction(t.id, 'REJECTED', t.telegram_id, t.package_name)} disabled={processing} className="flex-1 md:flex-none bg-red-600/20 text-red-400 border border-red-500/30 px-6 py-3 rounded-xl text-xs font-bold hover:bg-red-600 hover:text-white transition-all disabled:opacity-50"><X size={16} className="inline mr-1"/> Tolak</button>
          </div>
        </div>
      ))}
      {previewImg && ( <div className="fixed inset-0 z-[999] bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in" onClick={() => setPreviewImg(null)}><div className="relative"><button onClick={() => setPreviewImg(null)} className="absolute -top-12 right-0 text-white/50 hover:text-white bg-white/10 p-2 rounded-full transition-colors"><X size={24} /></button><img src={previewImg} className="max-h-[85vh] max-w-full rounded-xl border border-white/10 shadow-2xl object-contain" onClick={(e) => e.stopPropagation()} /></div></div> )}
    </div>
  );
}

// --- TAB ORDER (FIX PDF ASLI, FOTO HASIL, & TRY-FINALLY) ---
function OrdersTab({ orders, onUpdate, showToast, showConfirm, showPrompt, sendTgMessage, sendTgDocument, sendTgPhoto, supabase }) {
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [processing, setProcessing] = useState(false);

  const handleProcessFile = async (e) => {
    const file = e.target.files[0];
    if(!file || !selectedOrder || processing) return;
    showConfirm(`Kirim file hasil (${file.name}) ke user?`, async () => {
      try {
        setProcessing(true);
        await supabase.from('orders').update({ status: 'SUCCESS' }).eq('id', selectedOrder.id);
        const caption = `✅ *HASIL PENGECEKAN SELESAI*\n\n🧾 *Layanan:* ${selectedOrder.service_type}\n\nTerima kasih telah menggunakan Lila Store! 💜`;
        await sendTgDocument(selectedOrder.telegram_id, caption, file, file.name);
        await onUpdate(); showToast('File Terkirim!', 'success');
      } catch(err) { console.log(err); showToast('Gagal mengirim file', 'error'); } finally { setProcessing(false); setSelectedOrder(null); if (fileInputRef.current) fileInputRef.current.value = ''; }
    });
  };

  const handleProcessImage = async (e) => {
    const file = e.target.files[0];
    if(!file || !selectedOrder || processing) return;
    showConfirm(`Kirim foto hasil (${file.name}) ke user?`, async () => {
      try {
        setProcessing(true);
        await supabase.from('orders').update({ status: 'SUCCESS' }).eq('id', selectedOrder.id);
        const caption = `✅ *HASIL PENGECEKAN SELESAI*\n\n🧾 *Layanan:* ${selectedOrder.service_type}\n\nBerikut lampiran foto hasilnya. Terima kasih! 💜`;
        await sendTgPhoto(selectedOrder.telegram_id, caption, file);
        await onUpdate(); showToast('Foto Terkirim!', 'success');
      } catch(err) { console.log(err); showToast('Gagal mengirim foto', 'error'); } finally { setProcessing(false); setSelectedOrder(null); if (imageInputRef.current) imageInputRef.current.value = ''; }
    });
  };

  const handleProcessText = (order) => {
    if(processing) return;
    showPrompt(`Ketik Hasil ${order.service_type}`, "Contoh: Similarity 5%, AI 0%...", "textarea", async (textValue) => {
      if(!textValue) return;
      try {
        setProcessing(true);
        await supabase.from('orders').update({ status: 'SUCCESS' }).eq('id', order.id);
        const textBlob = new Blob([textValue], { type: 'text/plain' });
        await sendTgDocument(order.telegram_id, `✅ *HASIL PENGECEKAN SELESAI*\n\n🧾 *Layanan:* ${order.service_type}\n\nTerima kasih! 💜`, textBlob, `Hasil_${order.service_type}_LilaStore.txt`);
        await onUpdate(); showToast('Teks (.txt) Terkirim!', 'success');
      } catch(err) { console.log(err); showToast('Gagal memproses', 'error'); } finally { setProcessing(false); }
    });
  };

  const handleReject = (order) => {
    if(processing) return;
    showPrompt("Tolak Cek File", "Alasan penolakan...", "text", async (reason) => {
      if(!reason) return;
      try {
        setProcessing(true);
        const key = order.service_type === 'Turnitin' ? 'quota_turnitin' : 'quota_ai';
        const { data: u } = await supabase.from('users').select(key).eq('telegram_id', order.telegram_id).single();
        if(u) await supabase.from('users').update({ [key]: u[key] + 1 }).eq('telegram_id', order.telegram_id);
        
        await supabase.from('orders').update({ status: 'REJECTED', reject_reason: reason }).eq('id', order.id);
        await sendTgMessage(order.telegram_id, `❌ *CEK DITOLAK*\n\n📝 *Alasan:* ${reason}\n\n_Kuota kamu telah dikembalikan (Refund)._`);
        await onUpdate(); showToast('Ditolak', 'success');
      } catch(err) { console.log(err); showToast('Gagal memproses', 'error'); } finally { setProcessing(false); }
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <h2 className="text-xl font-black uppercase text-white mb-6">Antrean Cek File</h2>
      <input type="file" ref={fileInputRef} className="hidden" onChange={handleProcessFile} />
      <input type="file" accept="image/*" ref={imageInputRef} className="hidden" onChange={handleProcessImage} />
      
      <div className="space-y-4">
        {orders.filter(o => o.status === 'PENDING').length === 0 && <p className="text-center text-gray-500 py-8 bg-white/5 rounded-2xl">Belum ada antrean file.</p>}
        {orders.filter(o => o.status === 'PENDING').map(o => (
          <div key={o.id} className="bg-white/5 p-5 rounded-xl border border-white/10 flex flex-col md:flex-row justify-between items-center gap-4 shadow-lg">
             <div>
                <p className="text-xs font-bold text-white">User: @{o.username || 'Tidak ada username'}</p>
                <p className="text-[10px] text-gray-500 font-mono">ID: {o.telegram_id}</p>
                <span className={`px-2 py-1 text-[10px] font-bold rounded inline-block mt-2 ${o.service_type === 'Turnitin' ? 'bg-purple-600/20 text-purple-400' : 'bg-fuchsia-600/20 text-fuchsia-400'}`}>{o.service_type}</span>
                <p className="text-xs text-gray-300 font-mono break-words mt-2 bg-black/50 p-2 rounded">{o.details}</p>
             </div>
             <div className="flex gap-2 flex-wrap justify-end">
                <a href={o.file_url} target="_blank" rel="noreferrer" className="bg-blue-600/20 text-blue-400 border border-blue-500/30 px-4 py-2 rounded-lg text-xs font-bold hover:bg-blue-600 hover:text-white transition-all"><Download size={14} className="inline mr-1"/> Download</a>
                <button onClick={() => handleProcessText(o)} disabled={processing} className="bg-fuchsia-600/20 text-fuchsia-400 border border-fuchsia-500/30 px-4 py-2 rounded-lg text-xs font-bold hover:bg-fuchsia-600 hover:text-white transition-all disabled:opacity-50"><Edit size={14} className="inline mr-1"/> Teks</button>
                <button onClick={() => { setSelectedOrder(o); imageInputRef.current.click(); }} disabled={processing} className="bg-yellow-600/20 text-yellow-400 border border-yellow-500/30 px-4 py-2 rounded-lg text-xs font-bold hover:bg-yellow-600 hover:text-white transition-all disabled:opacity-50"><ImageIcon2 size={14} className="inline mr-1"/> Foto</button>
                <button onClick={() => { setSelectedOrder(o); fileInputRef.current.click(); }} disabled={processing} className="bg-green-600/20 text-green-400 border border-green-500/30 px-4 py-2 rounded-lg text-xs font-bold hover:bg-green-600 hover:text-white transition-all disabled:opacity-50"><Upload size={14} className="inline mr-1"/> File Asli</button>
                <button onClick={() => handleReject(o)} disabled={processing} className="bg-red-600/20 text-red-400 border border-red-500/30 px-4 py-2 rounded-lg text-xs font-bold hover:bg-red-600 hover:text-white transition-all disabled:opacity-50"><X size={14} className="inline mr-1"/> Tolak</button>
             </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- TAB DATA PELANGGAN (FIX TRY-FINALLY) ---
function CustomerTab({ users, onUpdate, showToast, showConfirm, showPrompt, supabase }) {
  const [processing, setProcessing] = useState(false);
  
  const handleQuota = (tid, type) => {
    if(processing) return;
    showPrompt(`Update Kuota ${type}`, "Angka baru:", "number", async (newVal) => {
      if (!newVal) return;
      showConfirm(`Simpan kuota menjadi ${newVal}?`, async () => {
        try {
          setProcessing(true);
          const key = type === 'Turnitin' ? 'quota_turnitin' : 'quota_ai';
          await supabase.from('users').update({ [key]: parseInt(newVal) }).eq('telegram_id', tid);
          await onUpdate(); showToast(`Kuota diperbarui.`, 'success');
        } catch(err) { showToast('Error', 'error'); } finally { setProcessing(false); }
      });
    });
  };

  const handleBan = (tid, current) => {
    if(processing) return;
    showConfirm(`Ubah status akses pengguna?`, async () => {
      try {
        setProcessing(true);
        await supabase.from('users').update({ is_banned: !current }).eq('telegram_id', tid);
        await onUpdate(); showToast(`Status Firewall diupdate.`, 'success');
      } catch(err) { showToast('Error', 'error'); } finally { setProcessing(false); }
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in">
       <h2 className="text-xl font-black uppercase text-white mb-6">Data Pelanggan</h2>
       <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {users.map(u => (
            <div key={u.telegram_id} className={`bg-white/5 border p-5 rounded-2xl shadow-lg relative overflow-hidden ${u.is_banned ? 'border-red-500/30 bg-red-950/20' : 'border-white/10'}`}>
               <div className="flex justify-between items-start mb-2">
                  <p className="text-xs font-bold text-white">@{u.username || 'Tidak ada username'}</p>
                  <button onClick={() => handleBan(u.telegram_id, u.is_banned)} disabled={processing} className={`text-[9px] font-mono px-2 py-0.5 rounded border ${u.is_banned ? 'bg-green-500/10 text-green-400 border-green-500/30 hover:bg-green-500/30' : 'bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/30'} transition-all disabled:opacity-50`}>{u.is_banned ? 'BUKA BLOKIR' : 'BLOKIR'}</button>
               </div>
               <p className="text-[10px] text-gray-500 font-mono mb-2">ID: {u.telegram_id}</p>
               <p className="text-[10px] text-purple-400 font-bold mb-4">Total Order: {u.total_order || 0} | Topup: {u.total_topup || 0}</p>
               <div className="flex gap-2">
                  <div className="bg-purple-500/10 p-2 rounded-lg flex-1 text-center border border-purple-500/20"><p className="text-[8px] text-purple-400 uppercase">Turnitin</p><p className="font-bold text-white">{u.quota_turnitin || 0}x</p><button onClick={() => handleQuota(u.telegram_id, 'Turnitin')} disabled={processing} className="text-[8px] underline mt-1 text-gray-400 hover:text-white disabled:opacity-50">EDIT</button></div>
                  <div className="bg-fuchsia-500/10 p-2 rounded-lg flex-1 text-center border border-fuchsia-500/20"><p className="text-[8px] text-fuchsia-400 uppercase">AI</p><p className="font-bold text-white">{u.quota_ai || 0}x</p><button onClick={() => handleQuota(u.telegram_id, 'AI')} disabled={processing} className="text-[8px] underline mt-1 text-gray-400 hover:text-white disabled:opacity-50">EDIT</button></div>
               </div>
            </div>
          ))}
       </div>
    </div>
  );
}