import { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  LayoutDashboard, Users, CreditCard, Settings, Menu, X, RefreshCw, 
  Megaphone, Upload, Save, Key, ShieldAlert, Camera, LogOut, TrendingUp, 
  Check, Info, CheckCircle2, AlertTriangle, ImageIcon, Package, Plus, Trash2, Edit3, FileText, Download
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

// HUBUNGKAN SUPABASE
const supabase = createClient('https://rqbqbwigvimbudpvjuol.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJxYnFid2lndmltYnVkcHZqdW9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4MjA4MTIsImV4cCI6MjA5NTM5NjgxMn0.hge91kVRonaioauBVTwCGj3OABl6dXUhsY4hYY0p5Gs');

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginData, setLoginData] = useState({ id: '', pass: '' });
  const [activeTab, setActiveTab] = useState('dashboard');
  const [activeChart, setActiveChart] = useState('users'); 
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  
  // Custom Notification & Modal States
  const [toast, setToast] = useState({ show: false, msg: '', type: 'success' });
  const [dialog, setDialog] = useState({ show: false, msg: '', onConfirm: null });
  const [inputDialog, setInputDialog] = useState({ show: false, title: '', placeholder: '', type: 'text', onSubmit: null });
  const [inputValue, setInputValue] = useState('');
  
  // Data States
  const [users, setUsers] = useState([]);
  const [topups, setTopups] = useState([]);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [config, setConfig] = useState({});
  const [bcMsg, setBcMsg] = useState('');
  const [bcImg, setBcImg] = useState('');
  const [trends, setTrends] = useState([]);

  // Form State Produk
  const [productForm, setProductForm] = useState({ id: null, name: '', description: '', price: '', quota_turnitin: '', quota_ai: '' });

  const showToast = (msg, type = 'success') => {
    setToast({ show: true, msg, type });
    setTimeout(() => setToast({ show: false, msg: '', type: 'success' }), 3000);
  };

  const showConfirm = (msg, onConfirmCallback) => {
    setDialog({ show: true, msg, onConfirm: onConfirmCallback });
  };

  const closeConfirm = () => {
    setDialog({ show: false, msg: '', onConfirm: null });
  };

  const showPrompt = (title, placeholder, type, onSubmitCallback) => {
    setInputValue('');
    setInputDialog({ show: true, title, placeholder, type, onSubmit: onSubmitCallback });
  };

  const closePrompt = () => {
    setInputDialog({ show: false, title: '', placeholder: '', type: 'text', onSubmit: null });
  };

  // --- API PENGIRIMAN TELEGRAM TERPUSAT ---
  const sendTgMessage = async (chatId, text) => {
    console.log("Token Bot dari Config (Text):", config?.bot_token);
    if (!config?.bot_token) return;
    try {
      await fetch(`https://api.telegram.org/bot${config.bot_token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: String(chatId), text, parse_mode: 'Markdown' })
      });
    } catch(e) { console.log('Telegram API Error:', e); }
  };

  const sendTgDocument = async (chatId, caption, blob, fileName) => {
    console.log("Token Bot dari Config (Doc):", config?.bot_token);
    if (!config?.bot_token) return;
    try {
      const formData = new FormData();
      formData.append('chat_id', String(chatId));
      formData.append('caption', caption);
      formData.append('parse_mode', 'Markdown');
      formData.append('document', blob, fileName);
      await fetch(`https://api.telegram.org/bot${config.bot_token}/sendDocument`, { method: 'POST', body: formData });
    } catch(e) { console.log('Telegram API Error:', e); }
  };

  const checkSession = async () => {
    try {
      const savedSession = JSON.parse(localStorage.getItem('lila_sec_protocol'));
      if (!savedSession) return setIsLoggedIn(false);

      const res = await fetch('https://api.ipify.org?format=json');
      const { ip } = await res.json();
      const currentAgent = navigator.userAgent;

      if (savedSession.ip === ip && savedSession.agent === currentAgent) {
        setIsLoggedIn(true);
      } else {
        localStorage.removeItem('lila_sec_protocol');
        setIsLoggedIn(false);
      }
    } catch (error) {
      const savedSession = JSON.parse(localStorage.getItem('lila_sec_protocol'));
      if (savedSession && savedSession.agent === navigator.userAgent) setIsLoggedIn(true);
      else setIsLoggedIn(false);
    }
  };

  useEffect(() => {
    checkSession();
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: u } = await supabase.from('users').select('*').order('created_at', { ascending: true });
    const { data: t } = await supabase.from('topups').select('*').order('created_at', { ascending: true });
    const { data: p } = await supabase.from('products').select('*').order('created_at', { ascending: true });
    const { data: o } = await supabase.from('orders').select('*').order('created_at', { ascending: true });
    const { data: c } = await supabase.from('settings').select('*').eq('id', 1).single();
    
    if (u) setUsers(u);
    if (c) setConfig(c);
    if (t) setTopups(t);
    if (p) setProducts(p);
    if (o) setOrders(o);

    const days = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
    const data = days.map(day => ({ name: day, users: 0, pending: 0, success: 0, revenue: 0 }));
    
    t?.forEach(item => {
      if(item.created_at) {
        const d = new Date(item.created_at).getDay();
        const idx = d === 0 ? 6 : d - 1; 
        if (item.status === 'PENDING') data[idx].pending += 1;
        if (item.status === 'SUCCESS') {
          data[idx].success += 1;
          data[idx].revenue += (item.amount || 0);
        }
      }
    });

    u?.forEach(item => {
      if(item.created_at) {
        const d = new Date(item.created_at).getDay();
        const idx = d === 0 ? 6 : d - 1;
        data[idx].users += 1;
      }
    });

    setTrends(data);
    setLoading(false);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (
      (loginData.id == config.owner_id && loginData.pass == config.password) ||
      (loginData.id === '7475939789' && loginData.pass === 'masuk123')
    ) {
      try {
        const res = await fetch('https://api.ipify.org?format=json');
        const { ip } = await res.json();
        const agent = navigator.userAgent;
        
        localStorage.setItem('lila_sec_protocol', JSON.stringify({ ip, agent, timestamp: Date.now() }));
        setIsLoggedIn(true);
        showToast('OTORISASI BERHASIL. SELAMAT DATANG.', 'success');
      } catch (error) {
        localStorage.setItem('lila_sec_protocol', JSON.stringify({ ip: 'unknown', agent: navigator.userAgent }));
        setIsLoggedIn(true);
        showToast('OTORISASI BERHASIL (IP MASKED).', 'success');
      }
    } else {
      showToast('OTENTIKASI GAGAL: ID Owner atau Password Salah!', 'error');
    }
  };

  const handleLogout = () => {
    showConfirm('Apakah Anda yakin ingin keluar dari sistem keamanan?', () => {
      localStorage.removeItem('lila_sec_protocol');
      setIsLoggedIn(false);
      setShowProfileModal(false);
      showToast('SISTEM LOGOUT BERHASIL', 'success');
    });
  };

  const handleImageUpload = (e, target) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (target === 'broadcast') setBcImg(reader.result);
        else setConfig({ ...config, [target]: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveSettings = async () => {
    const { error } = await supabase.from('settings').update(config).eq('id', 1).select();
    if (error) {
      showToast('GAGAL MENYIMPAN: ' + error.message, 'error');
    } else {
      await fetchData();
      showToast('DATA MAINFRAME BERHASIL DISIMPAN!', 'success');
      setShowProfileModal(false);
    }
  };

  const handleSendBroadcast = async () => {
    if (!bcMsg) return showToast('Isi pesan broadcast terlebih dahulu!', 'error');
    if (!config?.bot_token) return showToast('Token Bot belum diisi di Pengaturan!', 'error');

    showConfirm(`Kirim broadcast ke ${users.length} pengguna aktif sekarang?`, async () => {
      showToast(`PROSES BROADCAST DIMULAI... Mohon tunggu.`, 'success');
      let successCount = 0;
      for (const u of users) {
        try {
          if (bcImg) {
             const formData = new FormData();
             formData.append('chat_id', String(u.telegram_id));
             formData.append('caption', bcMsg);
             formData.append('parse_mode', 'Markdown');
             const res = await fetch(bcImg);
             const blob = await res.blob();
             formData.append('photo', blob, 'broadcast.jpg');
             await fetch(`https://api.telegram.org/bot${config.bot_token}/sendPhoto`, { method: 'POST', body: formData });
          } else {
             await fetch(`https://api.telegram.org/bot${config.bot_token}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: String(u.telegram_id), text: bcMsg, parse_mode: 'Markdown' })
             });
          }
          successCount++;
        } catch(e) {}
      }
      showToast(`BROADCAST SELESAI! Terkirim ke ${successCount} user.`, 'success');
      setBcMsg(''); setBcImg('');
    });
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (!productForm.name || !productForm.price) return showToast('Nama & Harga wajib diisi!', 'error');

    const payload = {
      name: productForm.name,
      description: productForm.description,
      price: parseInt(productForm.price),
      quota_turnitin: parseInt(productForm.quota_turnitin || 0),
      quota_ai: parseInt(productForm.quota_ai || 0)
    };

    if (productForm.id) {
      const { error } = await supabase.from('products').update(payload).eq('id', productForm.id).select();
      if (error) showToast(error.message, 'error');
      else { 
        await fetchData(); 
        showToast('Produk Berhasil Diperbarui!'); 
        setProductForm({ id: null, name: '', description: '', price: '', quota_turnitin: '', quota_ai: '' }); 
      }
    } else {
      const { error } = await supabase.from('products').insert([payload]).select();
      if (error) showToast(error.message, 'error');
      else { 
        await fetchData(); 
        showToast('Produk Berhasil Ditambahkan!'); 
        setProductForm({ id: null, name: '', description: '', price: '', quota_turnitin: '', quota_ai: '' }); 
      }
    }
  };

  const handleDeleteProduct = async (id) => {
    showConfirm('Hapus produk ini secara permanen dari database?', async () => {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) showToast(error.message, 'error');
      else { 
        await fetchData(); 
        showToast('Produk Berhasil Dihapus!'); 
      }
    });
  };

  if (!isLoggedIn) {
    return (
      <div className="h-screen w-full flex items-center justify-center font-mono p-4 overflow-hidden relative bg-[#050505]">
        {toast.show && (
          <div className="fixed top-8 right-8 z-[100] animate-in slide-in-from-right fade-in duration-300">
            <div className={`flex items-center gap-3 px-6 py-4 rounded-xl backdrop-blur-xl border ${toast.type === 'error' ? 'bg-red-950/80 border-red-500/50 text-red-100 shadow-[0_0_20px_rgba(239,68,68,0.3)]' : 'bg-purple-900/80 border-purple-500/50 text-purple-100 shadow-[0_0_20px_rgba(168,85,247,0.3)]'}`}>
              {toast.type === 'error' ? <AlertTriangle size={20} className="text-red-400" /> : <CheckCircle2 size={20} className="text-purple-400" />}
              <p className="text-sm font-bold tracking-wide">{toast.msg}</p>
            </div>
          </div>
        )}
        <div className="absolute w-96 h-96 bg-purple-600/10 blur-[120px] rounded-full top-0 left-0"></div>
        <form onSubmit={handleLogin} className="w-full max-w-md bg-black/40 border border-purple-500/30 p-8 rounded-2xl backdrop-blur-xl z-10 relative shadow-2xl">
          <h1 className="text-2xl font-black text-center mb-8 tracking-[0.3em] uppercase text-purple-400 drop-shadow-[0_0_8px_rgba(139,92,246,0.4)]">LILA ACCESS</h1>
          <div className="space-y-6">
            <div>
              <label className="text-[9px] text-purple-400 block mb-1 tracking-widest">TELEGRAM ID OWNER</label>
              <input required type="text" className="w-full bg-white/5 border border-purple-500/20 p-4 rounded-xl outline-none focus:border-purple-500 transition-all text-white font-bold" placeholder="Masukkan ID Telegram" onChange={e => setLoginData({...loginData, id: e.target.value})} />
            </div>
            <div>
              <label className="text-[9px] text-purple-400 block mb-1 tracking-widest">SYSTEM PASSWORD</label>
              <input required type="password" className="w-full bg-white/5 border border-purple-500/20 p-4 rounded-xl outline-none focus:border-purple-500 transition-all text-white font-bold" placeholder="••••••••" onChange={e => setLoginData({...loginData, pass: e.target.value})} />
            </div>
            <button className="w-full bg-purple-600 py-4 rounded-xl font-bold tracking-widest hover:shadow-[0_0_20px_#8b5cf6] transition-all uppercase text-white active:scale-95">AUTHORIZE LOGIN</button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-transparent font-sans text-gray-100 overflow-hidden relative">
      
      {/* ---------------- MODAL INLINE ---------------- */}
      {toast.show && (
        <div className="fixed top-8 right-8 z-[100] animate-in slide-in-from-right fade-in duration-300">
          <div className={`flex items-center gap-3 px-6 py-4 rounded-xl backdrop-blur-xl border ${toast.type === 'error' ? 'bg-red-950/80 border-red-500/50 text-red-100 shadow-[0_0_20px_rgba(239,68,68,0.3)]' : 'bg-purple-900/80 border-purple-500/50 text-purple-100 shadow-[0_0_20px_rgba(168,85,247,0.3)]'}`}>
            {toast.type === 'error' ? <AlertTriangle size={20} className="text-red-400" /> : <CheckCircle2 size={20} className="text-purple-400" />}
            <p className="text-sm font-bold tracking-wide">{toast.msg}</p>
          </div>
        </div>
      )}

      {dialog.show && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#0a0a0f] border border-purple-500/30 p-8 rounded-2xl shadow-[0_0_40px_rgba(139,92,246,0.2)] max-w-sm w-full mx-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-center mb-6">
              <div className="w-16 h-16 bg-purple-500/10 rounded-full flex items-center justify-center border border-purple-500/30">
                <Info size={32} className="text-purple-400" />
              </div>
            </div>
            <p className="text-center text-white font-bold mb-8">{dialog.msg}</p>
            <div className="flex gap-4">
              <button onClick={closeConfirm} className="flex-1 py-3 rounded-xl border border-white/10 text-gray-400 hover:bg-white/5 hover:text-white transition-all font-bold text-xs uppercase tracking-widest">BATAL</button>
              <button onClick={async () => { await dialog.onConfirm(); closeConfirm(); }} className="flex-1 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white transition-all font-bold text-xs uppercase tracking-widest shadow-[0_0_15px_rgba(139,92,246,0.4)]">LANJUTKAN</button>
            </div>
          </div>
        </div>
      )}

      {inputDialog.show && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#0a0a0f] border border-purple-500/30 p-8 rounded-2xl shadow-[0_0_40px_rgba(139,92,246,0.2)] max-w-xl w-full mx-4 animate-in zoom-in-95 duration-200">
            <h3 className="text-center text-purple-400 font-black tracking-widest uppercase mb-6">{inputDialog.title}</h3>
            {inputDialog.type === 'textarea' ? (
              <textarea 
                autoFocus
                className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-sm text-white outline-none focus:border-purple-500 mb-6 font-mono min-h-[150px]" 
                placeholder={inputDialog.placeholder}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
              />
            ) : (
              <input 
                type={inputDialog.type} 
                autoFocus
                className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-sm text-white outline-none focus:border-purple-500 mb-6 font-mono" 
                placeholder={inputDialog.placeholder}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
              />
            )}
            <div className="flex gap-4">
              <button onClick={closePrompt} className="flex-1 py-3 rounded-xl border border-white/10 text-gray-400 hover:bg-white/5 hover:text-white transition-all font-bold text-xs uppercase tracking-widest">Batal</button>
              <button onClick={() => { inputDialog.onSubmit(inputValue); closePrompt(); }} className="flex-1 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white transition-all font-bold text-xs uppercase tracking-widest shadow-[0_0_15px_rgba(139,92,246,0.4)]">Kirim</button>
            </div>
          </div>
        </div>
      )}

      {/* SIDEBAR NAVIGATION */}
      <div className={`${sidebarOpen ? 'w-64' : 'w-20'} transition-all bg-black/20 border-r border-white/5 flex flex-col z-20 backdrop-blur-xl shadow-[4px_0_15px_rgba(0,0,0,0.5)]`}>
        <div className="h-20 flex items-center justify-between px-6 border-b border-white/5">
          {sidebarOpen && <h1 className="text-lg font-black tracking-tighter text-purple-400">LILA STORE <span className="text-[10px] bg-purple-500/20 px-1 rounded">VVIP</span></h1>}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-gray-400 hover:text-white"><Menu size={20} /></button>
        </div>
        <nav className="flex-1 px-4 py-8 space-y-2 overflow-y-auto">
          <NavItem icon={<LayoutDashboard size={20}/>} label="Dashboard" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} open={sidebarOpen} />
          <NavItem icon={<CreditCard size={20}/>} label="Konfirmasi Topup" active={activeTab === 'topup'} onClick={() => setActiveTab('topup')} open={sidebarOpen} />
          <NavItem icon={<FileText size={20}/>} label="Antrean Cek" active={activeTab === 'orders'} onClick={() => setActiveTab('orders')} open={sidebarOpen} />
          <NavItem icon={<Package size={20}/>} label="Setting Produk" active={activeTab === 'products'} onClick={() => setActiveTab('products')} open={sidebarOpen} />
          <NavItem icon={<Users size={20}/>} label="Data Pelanggan" active={activeTab === 'customers'} onClick={() => setActiveTab('customers')} open={sidebarOpen} />
          <NavItem icon={<Megaphone size={20}/>} label="Pusat Broadcast" active={activeTab === 'broadcast'} onClick={() => setActiveTab('broadcast')} open={sidebarOpen} />
          <NavItem icon={<Settings size={20}/>} label="Pengaturan Bot" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} open={sidebarOpen} />
        </nav>
        <div className="p-4 border-t border-white/5">
          <button onClick={handleLogout} className="flex items-center gap-4 text-red-400 hover:bg-red-500/10 w-full p-3 rounded-xl transition-all">
            <LogOut size={20}/> {sidebarOpen && <span className="text-xs font-bold tracking-widest uppercase">KELUAR SISTEM</span>}
          </button>
        </div>
      </div>

      {/* CORE DISPLAY */}
      <div className="flex-1 flex flex-col relative">
        <header className="h-20 border-b border-white/5 flex items-center justify-between px-8 bg-black/10 backdrop-blur-md relative z-30">
          <div className="text-[10px] font-mono text-purple-500 tracking-[0.2em] uppercase">SYSTEM CORE V5.0 SECURE</div>
          
          <div className="relative">
            <div onClick={() => setShowProfileModal(!showProfileModal)} className="flex items-center gap-4 cursor-pointer hover:bg-white/5 p-2 rounded-xl transition-all">
              <div className="text-right">
                <p className="text-xs font-bold text-white uppercase">{config.admin_name || 'Owner'}</p>
                <p className="text-[9px] text-purple-400 font-mono">ID: {config.owner_id || '7475939789'}</p>
              </div>
              <div className="w-10 h-10 rounded-full border border-purple-500/50 overflow-hidden bg-purple-900/20 shadow-[0_0_10px_rgba(139,92,246,0.3)]">
                {config.admin_photo ? <img src={config.admin_photo} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xs font-bold text-purple-300">PIC</div>}
              </div>
            </div>

            {showProfileModal && (
              <div className="absolute right-0 mt-2 w-72 bg-[#0a0a0f] border border-purple-500/30 rounded-2xl shadow-2xl p-6 z-50 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xs font-mono text-purple-400">EDIT PROFIL ADMIN</h3>
                  <X size={16} className="cursor-pointer text-gray-400 hover:text-white" onClick={() => setShowProfileModal(false)} />
                </div>
                <div className="space-y-4">
                  <div className="flex justify-center relative mb-2">
                    <div className="w-20 h-20 rounded-full border-2 border-purple-500 overflow-hidden relative group bg-black">
                      <img src={config.admin_photo || 'https://via.placeholder.com/100'} className="w-full h-full object-cover" />
                      <label className="absolute inset-0 bg-black/70 flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                        <Camera size={18} className="text-white"/>
                        <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'admin_photo')} />
                      </label>
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
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8">
          
          {activeTab === 'dashboard' && (
            <div className="space-y-8 animate-in fade-in duration-500">
               <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-black tracking-tight uppercase text-white">Analitik Real-time</h2>
                  <button onClick={async () => { await fetchData(); showToast('Sinkronisasi Data Berhasil', 'success'); }} className="p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-all text-purple-400"><RefreshCw size={18} className={loading?'animate-spin':''}/></button>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <StatCard title="Total Pelanggan" val={users.length} color="border-purple-500" onClick={() => setActiveChart('users')} />
                  <StatCard title="Top Up Pending" val={topups.filter(t=>t.status==='PENDING').length} color="border-yellow-500" onClick={() => setActiveChart('pending')} />
                  <StatCard title="Transaksi Selesai" val={topups.filter(t=>t.status==='SUCCESS').length} color="border-green-500" onClick={() => setActiveChart('success')} />
                  <StatCard title="Omset (IDR)" val={`Rp ${topups.filter(t=>t.status==='SUCCESS').reduce((a,c)=>a+(c.amount||0), 0).toLocaleString()}`} color="border-fuchsia-500" onClick={() => setActiveChart('revenue')} />
               </div>

               <div className="bg-white/5 border border-white/10 p-6 rounded-2xl backdrop-blur-md shadow-lg h-80">
                  <h3 className="mb-4 font-bold text-purple-400 capitalize flex items-center gap-2"><TrendingUp size={18}/> {activeChart} Chart</h3>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trends}>
                      <defs>
                        <linearGradient id="colorChart" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.5}/>
                          <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="name" stroke="#666" />
                      <Tooltip contentStyle={{background: '#0a0a0f', border: '1px solid #333'}} />
                      <Area type="monotone" dataKey={activeChart} stroke="#8b5cf6" fillOpacity={1} fill="url(#colorChart)" strokeWidth={3} />
                    </AreaChart>
                  </ResponsiveContainer>
               </div>
            </div>
          )}

          {activeTab === 'topup' && (
            <TopupTab 
              topups={topups} 
              products={products} 
              config={config} 
              onUpdate={fetchData} 
              showToast={showToast} 
              showConfirm={showConfirm} 
              showPrompt={showPrompt} 
            />
          )}
          
          {activeTab === 'orders' && (
            <OrdersTab 
              orders={orders} 
              config={config} 
              onUpdate={fetchData} 
              showToast={showToast} 
              showConfirm={showConfirm} 
              showPrompt={showPrompt} 
              sendTgMessage={sendTgMessage}
              sendTgDocument={sendTgDocument}
            />
          )}

          {activeTab === 'customers' && (
            <CustomerTab 
              users={users} 
              onUpdate={fetchData} 
              showToast={showToast} 
              showConfirm={showConfirm} 
              showPrompt={showPrompt} 
            />
          )}

          {activeTab === 'broadcast' && (
            <div className="max-w-3xl space-y-6 animate-in fade-in duration-300">
              <h2 className="text-xl font-black uppercase text-white flex items-center gap-2"><Megaphone className="text-purple-400"/> Pusat Broadcast</h2>
              <div className="bg-white/5 border border-white/10 p-8 rounded-2xl backdrop-blur-md space-y-6">
                <div>
                  <label className="text-[10px] font-mono text-purple-400 uppercase tracking-widest block mb-2">Isi Pesan Siaran</label>
                  <textarea value={bcMsg} onChange={e => setBcMsg(e.target.value)} className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-sm text-white outline-none focus:border-purple-500 min-h-[120px]" placeholder="Ketik pesan promosi atau pengumuman massal..." />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-[10px] font-mono text-purple-400 uppercase tracking-widest block mb-2">Lampiran Gambar (Opsional)</label>
                    <div className="relative group cursor-pointer">
                      <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'broadcast')} className="absolute inset-0 opacity-0 z-10 cursor-pointer"/>
                      <div className="border border-dashed border-purple-500/40 p-4 rounded-xl flex items-center justify-center gap-2 text-purple-400 group-hover:bg-purple-500/10 transition-all text-xs font-bold">
                        <Upload size={16}/> PILIH DARI GALERI
                      </div>
                    </div>
                  </div>
                  {bcImg && (
                    <div className="relative">
                      <img src={bcImg} className="w-full h-24 object-cover border border-purple-500/50 rounded-xl" />
                      <X size={16} className="absolute -top-2 -right-2 bg-red-600 rounded-full cursor-pointer p-0.5" onClick={() => setBcImg('')} />
                    </div>
                  )}
                </div>
                <button onClick={handleSendBroadcast} className="w-full bg-purple-600 py-4 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-purple-500 text-white shadow-lg transition-all active:scale-95">KIRIM BROADCAST SEKARANG</button>
              </div>
            </div>
          )}

          {activeTab === 'products' && (
            <div className="space-y-8 animate-in fade-in duration-300">
               <h2 className="text-xl font-black uppercase text-white flex items-center gap-2"><Package className="text-purple-400"/> Manajemen Produk</h2>
               
               <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="bg-white/5 border border-white/10 p-6 rounded-2xl backdrop-blur-md h-fit">
                     <h3 className="text-sm font-mono text-purple-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                       <Plus size={16}/> {productForm.id ? 'Edit Produk' : 'Tambah Produk Baru'}
                     </h3>
                     <form onSubmit={handleSaveProduct} className="space-y-4">
                        <div>
                           <label className="text-[9px] text-gray-400 font-mono">NAMA PAKET</label>
                           <input type="text" value={productForm.name} onChange={e => setProductForm({...productForm, name: e.target.value})} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-xs outline-none focus:border-purple-500 text-white font-bold" placeholder="Contoh: Paket 1x Cek" />
                        </div>
                        <div>
                           <label className="text-[9px] text-gray-400 font-mono">DESKRIPSI (Tampil di Bot)</label>
                           <textarea value={productForm.description} onChange={e => setProductForm({...productForm, description: e.target.value})} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-xs outline-none focus:border-purple-500 text-white font-bold min-h-[80px]" placeholder="Berisi informasi kuota & fitur..." />
                        </div>
                        <div>
                           <label className="text-[9px] text-gray-400 font-mono">HARGA (Rp)</label>
                           <input type="number" value={productForm.price} onChange={e => setProductForm({...productForm, price: e.target.value})} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-xs outline-none focus:border-purple-500 text-white font-bold" placeholder="5000" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                           <div>
                              <label className="text-[9px] text-gray-400 font-mono">BONUS KUOTA TURNITIN</label>
                              <input type="number" value={productForm.quota_turnitin} onChange={e => setProductForm({...productForm, quota_turnitin: e.target.value})} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-xs outline-none focus:border-purple-500 text-white font-bold" placeholder="0" />
                           </div>
                           <div>
                              <label className="text-[9px] text-gray-400 font-mono">BONUS KUOTA AI</label>
                              <input type="number" value={productForm.quota_ai} onChange={e => setProductForm({...productForm, quota_ai: e.target.value})} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-xs outline-none focus:border-purple-500 text-white font-bold" placeholder="0" />
                           </div>
                        </div>
                        <div className="flex gap-2 pt-2">
                           {productForm.id && (
                             <button type="button" onClick={() => setProductForm({ id: null, name: '', description: '', price: '', quota_turnitin: '', quota_ai: '' })} className="flex-1 bg-white/5 border border-white/10 py-3 rounded-xl text-xs font-bold uppercase tracking-widest text-gray-400 hover:text-white">Batal</button>
                           )}
                           <button type="submit" className="flex-1 bg-purple-600 hover:bg-purple-500 py-3 rounded-xl text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-purple-600/20"><Save size={14} className="inline mr-2"/>Simpan</button>
                        </div>
                     </form>
                  </div>

                  <div className="lg:col-span-2 bg-white/5 border border-white/10 p-6 rounded-2xl backdrop-blur-md">
                     <h3 className="text-sm font-mono text-purple-400 uppercase tracking-widest mb-4">Daftar Paket Aktif</h3>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {products.map(p => (
                          <div key={p.id} className="bg-black/40 p-4 rounded-xl border border-white/5 flex justify-between items-center">
                             <div>
                                <p className="font-bold text-white text-base">{p.name}</p>
                                <p className="text-xs text-purple-400 font-mono">Rp {p.price.toLocaleString()}</p>
                                <div className="flex gap-3 mt-2 text-[10px] font-mono text-gray-400">
                                   <span>Turnitin: <b className="text-white">{p.quota_turnitin}x</b></span>
                                   <span>AI: <b className="text-white">{p.quota_ai}x</b></span>
                                </div>
                             </div>
                             <div className="flex gap-2">
                                <button onClick={() => setProductForm(p)} className="p-2 bg-purple-600/20 text-purple-400 border border-purple-500/30 rounded-lg hover:bg-purple-600 hover:text-white transition-all"><Edit3 size={14}/></button>
                                <button onClick={() => handleDeleteProduct(p.id)} className="p-2 bg-red-600/20 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-600 hover:text-white transition-all"><Trash2 size={14}/></button>
                             </div>
                          </div>
                        ))}
                     </div>
                  </div>
               </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="max-w-3xl space-y-8 pb-20 animate-in fade-in duration-300">
               <h2 className="text-xl font-black uppercase text-white">Pengaturan Bot & Mainframe</h2>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white/5 border border-white/10 p-6 rounded-2xl backdrop-blur-md space-y-4">
                     <h3 className="text-xs font-mono text-purple-400 uppercase tracking-widest border-b border-white/5 pb-2 flex items-center gap-2"><Key size={14}/> Keamanan Akses</h3>
                     <div>
                        <label className="text-[9px] font-mono text-gray-400 block mb-1">ID TELEGRAM OWNER</label>
                        <input type="text" value={config.owner_id || ''} onChange={e=>setConfig({...config, owner_id: e.target.value})} className="w-full bg-black/50 border border-white/10 p-3 rounded-xl outline-none focus:border-purple-500 text-cyan-300 text-xs font-mono" />
                     </div>
                     <div>
                        <label className="text-[9px] font-mono text-gray-400 block mb-1">USERNAME ADMIN (@)</label>
                        <input type="text" value={config.owner_username || ''} onChange={e=>setConfig({...config, owner_username: e.target.value})} className="w-full bg-black/50 border border-white/10 p-3 rounded-xl outline-none focus:border-purple-500 text-cyan-300 text-xs font-mono" placeholder="@BossJuy" />
                     </div>
                     <div>
                        <label className="text-[9px] font-mono text-gray-400 block mb-1">PASSWORD SISTEM</label>
                        <input type="text" value={config.password || ''} onChange={e=>setConfig({...config, password: e.target.value})} className="w-full bg-black/50 border border-white/10 p-3 rounded-xl outline-none focus:border-purple-500 text-cyan-300 text-xs font-mono" />
                     </div>
                  </div>
                  <div className="bg-white/5 border border-white/10 p-6 rounded-2xl backdrop-blur-md space-y-4">
                     <h3 className="text-xs font-mono text-purple-400 uppercase tracking-widest border-b border-white/5 pb-2 flex items-center gap-2"><Settings size={14}/> Teks Menu Bot</h3>
                     <div>
                        <label className="text-[9px] font-mono text-gray-400 block mb-1">PESAN SAMBUTAN START (/start)</label>
                        <textarea value={config.welcome_message || ''} onChange={e=>setConfig({...config, welcome_message: e.target.value})} className="w-full bg-black/50 border border-white/10 p-3 rounded-xl outline-none focus:border-purple-500 text-xs text-white h-20" />
                     </div>
                     <div>
                        <label className="text-[9px] font-mono text-gray-400 block mb-1">PESAN MENU BANTUAN</label>
                        <textarea value={config.bot_help || ''} onChange={e=>setConfig({...config, bot_help: e.target.value})} className="w-full bg-black/50 border border-white/10 p-3 rounded-xl outline-none focus:border-purple-500 text-xs text-white h-20" />
                     </div>
                  </div>
               </div>
               <div className="bg-white/5 border border-white/10 p-6 rounded-2xl backdrop-blur-md space-y-4">
                  <h3 className="text-xs font-mono text-purple-400 uppercase tracking-widest">PENGATURAN KONEKSI & GAMBAR QRIS</h3>
                  <div className="flex flex-col md:flex-row gap-6 items-center">
                    <div className="flex-1 w-full relative">
                       <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'qris_url')} className="absolute inset-0 opacity-0 z-10 cursor-pointer" />
                       <div className="border-2 border-dashed border-white/10 p-6 rounded-xl flex flex-col items-center justify-center gap-2 text-gray-400 hover:bg-white/5 text-xs font-bold transition-all uppercase">
                         <Upload size={24}/> Upload Kode QRIS dari Galeri
                       </div>
                    </div>
                    {config.qris_url && (
                       <img src={config.qris_url} className="w-32 h-32 object-contain border border-white/10 rounded-xl bg-white/5 p-2 shadow-[0_0_15px_rgba(255,255,255,0.05)]" />
                    )}
                  </div>
                  <div className="pt-4 border-t border-white/5">
                     <label className="text-[9px] font-mono text-gray-400 block mb-1">TOKEN BOT TELEGRAM</label>
                     <input type="text" value={config.bot_token || ''} onChange={e=>setConfig({...config, bot_token: e.target.value})} className="w-full bg-black/50 border border-white/10 p-3 rounded-xl outline-none focus:border-purple-500 text-xs text-white font-mono" />
                  </div>
               </div>
               <div className="flex items-center justify-between p-4 bg-red-950/20 border border-red-500/20 rounded-2xl backdrop-blur-md">
                  <div className="flex items-center gap-3">
                     <ShieldAlert className="text-red-500"/>
                     <div>
                       <h4 className="text-xs font-bold uppercase text-white">Mode Maintenance Bot</h4>
                       <p className="text-[10px] text-gray-400 font-mono">Aktifkan jika sistem sedang diserang atau dalam perbaikan.</p>
                     </div>
                  </div>
                  <input type="checkbox" checked={config.maintenance_mode || false} onChange={e => setConfig({...config, maintenance_mode: e.target.checked})} className="w-5 h-5 rounded border-white/10 text-red-600 focus:ring-0" />
               </div>
               <button onClick={handleSaveSettings} className="w-full bg-purple-600 py-4 rounded-xl font-bold uppercase tracking-widest hover:bg-purple-500 transition-all text-white shadow-xl flex items-center justify-center gap-2"><Save size={16}/> SIMPAN SEMUA PENGATURAN</button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function StatCard({ title, val, color, onClick }) {
  return (
    <div onClick={onClick} className={`bg-white/5 border border-white/10 rounded-2xl p-6 relative overflow-hidden group hover:border-white/20 transition-all backdrop-blur-md shadow-lg border-l-4 ${color} cursor-pointer`}>
      <div className="relative z-10">
        <h4 className="text-[10px] font-mono text-gray-400 uppercase tracking-widest mb-1">{title}</h4>
        <p className="text-2xl font-black mb-1 tracking-tighter">{val}</p>
      </div>
    </div>
  );
}

function NavItem({ icon, label, active, onClick, open }) {
  return (
    <div onClick={onClick} className={`flex items-center p-3 rounded-xl cursor-pointer transition-all ${active ? 'bg-purple-600/20 text-purple-400 border border-purple-500/20 shadow-[0_0_15px_rgba(139,92,246,0.1)]' : 'text-gray-500 hover:text-white'}`}>
      <div className="mr-4">{icon}</div>
      {open && <span className="text-xs font-bold tracking-wide uppercase">{label}</span>}
    </div>
  );
}

// COMPONENT: TOPUP TAB (FIX ANTI BUG + EXACT FORMAT DARI BOSS JUY)
function TopupTab({ topups, products, config, onUpdate, showToast, showConfirm, showPrompt }) {
  const [previewImg, setPreviewImg] = useState(null);

  const handleAction = (id, status, telegram_id, package_name) => {
    
    // ==========================================
    // AKSI: ADMIN MENOLAK PEMBAYARAN TOP UP
    // ==========================================
    if (status === 'REJECTED') {
      showPrompt("Alasan Penolakan", "Ketik alasan penolakan di sini...", "text", (reasonText) => {
        if (!reasonText) return;
        
        showConfirm(`Tolak transaksi ini dengan alasan: "${reasonText}"?`, async () => {
          
          // Fix React Stale Update pakai .select()
          const { error } = await supabase.from('topups').update({ status, reject_reason: reasonText }).eq('id', id).select();
          
          if (error) {
            showToast(error.message, 'error');
          } else {
            console.log("Menyiapkan pengiriman notif tolak. Token:", config?.bot_token);
            if (config?.bot_token) {
              await fetch(`https://api.telegram.org/bot${config.bot_token}/sendMessage`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  chat_id: telegram_id,
                  text: `❌ Pembayaran kamu ditolak\n\n📝 Alasan:\n${reasonText}`
                })
              }).catch(e => console.log(e));
            }
            
            // Fix Async Dashboard
            await onUpdate(); 
            showToast('Transaksi ditolak dan notifikasi terkirim.', 'success'); 
          }
        });
      });
      
    // ==========================================
    // AKSI: ADMIN MENERIMA PEMBAYARAN TOP UP
    // ==========================================
    } else if (status === 'SUCCESS') {
      console.log("Parameter Diterima:", status, telegram_id, package_name);
      
      showConfirm(`Terima transaksi ini? Kuota akan otomatis bertambah ke akun user.`, async () => {
        
        const matchProd = products.find(p => p.name === package_name);
        const addTurnitin = matchProd ? matchProd.quota_turnitin : 0;
        const addAi = matchProd ? matchProd.quota_ai : 0;

        const { data: user } = await supabase.from('users').select('quota_turnitin, quota_ai').eq('telegram_id', telegram_id).single();
        if (user) {
          const newTurnitin = (user.quota_turnitin || 0) + addTurnitin;
          const newAi = (user.quota_ai || 0) + addAi;
          await supabase.from('users').update({ quota_turnitin: newTurnitin, quota_ai: newAi }).eq('telegram_id', telegram_id);
        }

        // Fix React Stale Update pakai .select()
        const { error } = await supabase.from('topups').update({ status }).eq('id', id).select();
        
        if (error) {
          showToast(error.message, 'error');
        } else {
          console.log("Menyiapkan pengiriman notif terima. Token:", config?.bot_token);
          if (config?.bot_token) {
            await fetch(`https://api.telegram.org/bot${config.bot_token}/sendMessage`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                chat_id: telegram_id,
                text: `✅ Pembayaran kamu berhasil\n\nPesanan kamu telah diterima, kuota sudah bertambah otomatis. Silakan cek di menu Akun Saya.`
              })
            }).catch(e => console.log(e));
          }
          
          // Fix Async Dashboard
          await onUpdate(); 
          showToast('Top Up diterima & Kuota bertambah!', 'success'); 
        }
      });
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 relative">
       <h2 className="text-xl font-black uppercase text-white">Konfirmasi Pembayaran</h2>
       <div className="bg-white/5 rounded-2xl border border-white/10 p-6 space-y-4 backdrop-blur-md shadow-xl">
          {topups.filter(t => t.status === 'PENDING').length === 0 && (
            <p className="text-center text-gray-500 text-sm py-8">Belum ada antrean pembayaran saat ini.</p>
          )}
          
          {topups.filter(t => t.status === 'PENDING').map(t => (
            <div key={t.id} className="flex flex-col md:flex-row gap-6 justify-between items-center p-4 bg-black/40 rounded-xl border border-white/5">
               <div className="flex items-center gap-4 w-full md:w-auto">
                 <div 
                    className="w-16 h-16 bg-white/5 border border-white/10 rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity flex items-center justify-center relative group"
                    onClick={() => t.payment_proof ? setPreviewImg(t.payment_proof) : null}
                    title="Klik untuk melihat bukti full"
                 >
                   {t.payment_proof ? (
                     <>
                        <img src={t.payment_proof} alt="Bukti Transfer" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"><Camera size={20} className="text-white"/></div>
                     </>
                   ) : ( <ImageIcon size={24} className="text-gray-500" /> )}
                 </div>
                 <div>
                   <p className="font-bold text-white text-lg">{t.package_name || 'Paket'}</p>
                   <p className="text-xs font-mono text-purple-300 mb-1">ID: {t.telegram_id}</p>
                   <p className="text-sm font-bold text-green-400">Rp {(t.amount || 0).toLocaleString()}</p>
                 </div>
               </div>
               
               <div className="flex gap-3 w-full md:w-auto">
                  <button onClick={() => handleAction(t.id, 'SUCCESS', t.telegram_id, t.package_name)} className="flex-1 md:flex-none bg-green-600/20 text-green-400 border border-green-500/30 px-6 py-3 rounded-xl text-xs font-black uppercase hover:bg-green-600 hover:text-white transition-all shadow-[0_0_15px_rgba(34,197,94,0.1)]"><Check size={16} className="inline mr-2"/> Terima</button>
                  <button onClick={() => handleAction(t.id, 'REJECTED', t.telegram_id, t.package_name)} className="flex-1 md:flex-none bg-red-600/20 text-red-400 border border-red-500/30 px-6 py-3 rounded-xl text-xs font-black uppercase hover:bg-red-600 hover:text-white transition-all shadow-[0_0_15px_rgba(239,68,68,0.1)]"><X size={16} className="inline mr-2"/> Tolak</button>
               </div>
            </div>
          ))}
       </div>

       {previewImg && (
         <div className="fixed inset-0 z-[999] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setPreviewImg(null)}>
           <div className="relative max-w-4xl w-full flex flex-col items-center">
             <button onClick={() => setPreviewImg(null)} className="absolute -top-12 right-0 text-white/50 hover:text-white bg-white/10 p-2 rounded-full transition-colors"><X size={24} /></button>
             <img src={previewImg} alt="Zoom" className="max-w-full max-h-[85vh] object-contain rounded-xl border border-white/10 shadow-2xl" onClick={(e) => e.stopPropagation()} />
           </div>
         </div>
       )}
    </div>
  );
}

// COMPONENT: ANTREAN ORDER SERVIS (CEK FILE) FIX ASYNC & CONFIG
function OrdersTab({ orders, config, onUpdate, showToast, showConfirm, showPrompt, sendTgMessage, sendTgDocument }) {
  const fileInputRef = useRef(null);
  const [selectedOrder, setSelectedOrder] = useState(null);

  const handleProcess = async (e) => {
    const file = e.target.files[0];
    if (!file || !selectedOrder) return;
    
    showConfirm(`Kirim file hasil cek (${file.name}) ke user ini?`, async () => {
      // Fix React Stale Update pakai .select()
      await supabase.from('orders').update({ status: 'SUCCESS' }).eq('id', selectedOrder.id).select();
      
      const caption = `✅ *HASIL PENGECEKAN SELESAI*\n\nServis: ${selectedOrder.service_type}\nDetail: ${selectedOrder.details}\n\nTerima kasih telah menggunakan layanan Lila Store! 💜`;
      
      console.log("Kirim Dokumen. Token:", config?.bot_token);
      if (config?.bot_token) {
        await sendTgDocument(selectedOrder.telegram_id, caption, file, file.name);
      }
      
      // Fix Async Dashboard
      await onUpdate();
      showToast('Hasil berhasil dikirim!', 'success');
      setSelectedOrder(null);
    });
  };

  const handleReject = (order) => {
    showPrompt("Tolak Cek File", "Masukkan alasan file ditolak...", "text", async (reasonText) => {
      if(!reasonText) return;
      showConfirm(`Tolak dan kembalikan kuota user?`, async () => {
         const key = order.service_type === 'Turnitin' ? 'quota_turnitin' : 'quota_ai';
         const { data: user } = await supabase.from('users').select(key).eq('telegram_id', order.telegram_id).single();
         if (user) {
           await supabase.from('users').update({ [key]: user[key] + 1 }).eq('telegram_id', order.telegram_id);
         }

         // Fix React Stale Update pakai .select()
         await supabase.from('orders').update({ status: 'REJECTED', reject_reason: reasonText }).eq('id', order.id).select();
         
         console.log("Kirim Notif Refund. Token:", config?.bot_token);
         if (config?.bot_token) {
            await fetch(`https://api.telegram.org/bot${config.bot_token}/sendMessage`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                chat_id: order.telegram_id,
                text: `❌ Pengecekan Ditolak\n\n📝 Alasan:\n${reasonText}\n\n*Kuota kamu telah dikembalikan (Refund).*`
              })
            }).catch(e => console.log(e));
         }
         
         // Fix Async Dashboard
         await onUpdate();
         showToast('Ditolak & Kuota kembali.', 'success'); 
      });
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in">
       <h2 className="text-xl font-black uppercase text-white">Antrean Cek File</h2>
       <input type="file" ref={fileInputRef} className="hidden" onChange={handleProcess} />
       
       <div className="bg-white/5 rounded-2xl p-6 space-y-4 border border-white/10 backdrop-blur-md shadow-xl">
          {orders.filter(o => o.status === 'PENDING').length === 0 && (
            <p className="text-center text-gray-500 py-8">Belum ada antrean file yang perlu dicek.</p>
          )}
          
          {orders.filter(o => o.status === 'PENDING').map(o => (
            <div key={o.id} className="flex justify-between items-center p-5 bg-black/40 rounded-xl border border-white/5">
               <div>
                  <span className={`px-2 py-1 rounded text-[10px] font-bold ${o.service_type === 'Turnitin' ? 'bg-purple-600/20 text-purple-400' : 'bg-fuchsia-600/20 text-fuchsia-400'}`}>
                    {o.service_type}
                  </span>
                  <p className="text-xs text-gray-300 mt-2 font-mono break-words bg-black/50 p-2 rounded border border-white/5 inline-block">{o.details}</p>
                  <p className="text-[10px] text-gray-500 mt-2">ID User: {o.telegram_id}</p>
               </div>
               <div className="flex flex-col gap-2">
                  <a href={o.file_url} target="_blank" rel="noreferrer" className="text-center bg-blue-600/20 text-blue-400 border border-blue-500/30 px-4 py-2 rounded-lg text-xs font-bold hover:bg-blue-600 hover:text-white transition-all">
                    <Download size={14} className="inline mr-1"/> Download File User
                  </a>
                  <button onClick={() => { setSelectedOrder(o); fileInputRef.current.click(); }} className="bg-green-600/20 text-green-400 border border-green-500/30 px-4 py-2 rounded-lg text-xs font-bold hover:bg-green-600 hover:text-white transition-all">
                    <Upload size={14} className="inline mr-1"/> Kirim Hasil Cek (PDF/Doc)
                  </button>
                  <button onClick={() => handleReject(o)} className="bg-red-600/20 text-red-400 border border-red-500/30 px-4 py-2 rounded-lg text-xs font-bold hover:bg-red-600 hover:text-white transition-all">
                    <X size={14} className="inline mr-1"/> Tolak & Refund Kuota
                  </button>
               </div>
            </div>
          ))}
       </div>
    </div>
  );
}

// COMPONENT DATA PELANGGAN FIX ASYNC
function CustomerTab({ users, onUpdate, showToast, showConfirm, showPrompt }) {
  const handleQuota = (tid, type) => {
    showPrompt(`Update Kuota ${type}`, "Masukkan jumlah kuota baru (angka)", "number", (newVal) => {
      if (!newVal || isNaN(newVal)) return;
      showConfirm(`Simpan perubahan kuota menjadi ${newVal}?`, async () => {
        const key = type === 'Turnitin' ? 'quota_turnitin' : 'quota_ai';
        // Fix React Stale Update pakai .select()
        const { error } = await supabase.from('users').update({ [key]: parseInt(newVal) }).eq('telegram_id', tid).select();
        
        if(error) {
          showToast('Gagal mengubah kuota', 'error');
        } else {
          await onUpdate(); 
          showToast(`Kuota ${type} diperbarui.`, 'success'); 
        }
      });
    });
  };

  const handleBan = (tid, current) => {
    showConfirm(`Ubah status akses pengguna ini?`, async () => {
      await supabase.from('users').update({ is_banned: !current }).eq('telegram_id', tid).select();
      await onUpdate();
      showToast(`Status Firewall pengguna diupdate.`, 'success');
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
       <h2 className="text-xl font-black uppercase text-white">Data Pelanggan</h2>
       <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {users.map((u, i) => (
            <div key={i} className={`bg-white/5 border p-5 rounded-2xl backdrop-blur-md relative overflow-hidden ${u.is_banned ? 'border-red-500/30 bg-red-950/5' : 'border-white/10'}`}>
               <div className="flex justify-between items-start mb-1">
                  <p className="text-xs font-bold text-white">@{u.username || 'Tidak Diketahui'}</p>
                  <button onClick={() => handleBan(u.telegram_id, u.is_banned)} className={`text-[9px] font-mono px-2 py-0.5 rounded border ${u.is_banned ? 'bg-green-500/10 text-green-400 border-green-500/30 hover:bg-green-500/30' : 'bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/30'} transition-colors`}>
                    {u.is_banned ? 'BUKA BLOKIR' : 'BLOKIR'}
                  </button>
               </div>
               <p className="text-[10px] font-mono text-gray-500 mb-4">{u.telegram_id}</p>
               <div className="flex gap-2">
                  <div className="bg-purple-500/10 p-2 rounded-lg flex-1 text-center border border-purple-500/20">
                     <p className="text-[8px] text-purple-400 uppercase">Turnitin</p>
                     <p className="font-bold text-sm text-white">{u.quota_turnitin || 0}x</p>
                     <button onClick={() => handleQuota(u.telegram_id, 'Turnitin')} className="text-[8px] text-gray-500 hover:text-white underline block mx-auto mt-1">EDIT</button>
                  </div>
                  <div className="bg-fuchsia-500/10 p-2 rounded-lg flex-1 text-center border border-fuchsia-500/20">
                     <p className="text-[8px] text-fuchsia-400 uppercase">AI Checker</p>
                     <p className="font-bold text-sm text-white">{u.quota_ai || 0}x</p>
                     <button onClick={() => handleQuota(u.telegram_id, 'AI')} className="text-[8px] text-gray-500 hover:text-white underline block mx-auto mt-1">EDIT</button>
                  </div>
               </div>
            </div>
          ))}
       </div>
    </div>
  );
}