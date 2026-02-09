"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { jsPDF } from 'jspdf';

// --- KOMPONENTAI ---

const ImageGallery = ({ images, onImageClick }: { images: string[], onImageClick: (idx: number) => void }) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const next = (e: any) => { e.stopPropagation(); setCurrentIdx((currentIdx + 1) % images.length); };
  const prev = (e: any) => { e.stopPropagation(); setCurrentIdx((currentIdx - 1 + images.length) % images.length); };

  return (
    <div className="relative w-full h-48 mb-4 group cursor-zoom-in" onClick={() => onImageClick(currentIdx)}>
      <img src={images[currentIdx]} alt="Prekė" className="w-full h-full object-cover rounded-lg bg-gray-100 transition hover:opacity-90" />
      {images.length > 1 && (
        <><button onClick={prev} className="absolute left-1 top-1/2 -translate-y-1/2 bg-white/80 rounded-full p-1 opacity-0 group-hover:opacity-100 transition text-black">◀</button>
        <button onClick={next} className="absolute right-1 top-1/2 -translate-y-1/2 bg-white/80 rounded-full p-1 opacity-0 group-hover:opacity-100 transition text-black">▶</button></>
      )}
    </div>
  );
};

// Padidintos nuotraukos langas (Modal)
const ImageModal = ({ images, startIndex, onClose }: { images: string[], startIndex: number, onClose: () => void }) => {
  const [idx, setIdx] = useState(startIndex);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  const next = () => {
    setIdx((idx + 1) % images.length);
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };
  const prev = () => {
    setIdx((idx - 1 + images.length) % images.length);
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const toggleZoom = () => {
    if (zoom === 1) {
      setZoom(2.5);
      setPan({ x: 0, y: 0 });
    } else {
      setZoom(1);
      setPan({ x: 0, y: 0 });
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoom > 1) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4" onClick={onClose}>
      <button className="absolute top-6 right-6 text-[#c29a74] text-4xl hover:text-white transition" onClick={onClose}>&times;</button>
      <div 
        className="relative max-w-4xl w-full h-full flex items-center justify-center" 
        onClick={e => e.stopPropagation()}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {images.length > 1 && (
          <button onClick={prev} className="absolute left-0 text-[#c29a74] text-5xl p-4 hover:text-white transition z-30">❮</button>
        )}
        <div 
          className={`overflow-hidden rounded-lg shadow-2xl ${zoom > 1 ? 'cursor-grab' : 'cursor-zoom-in'} ${isDragging ? 'cursor-grabbing' : ''}`}
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onClick={toggleZoom}
          onMouseDown={handleMouseDown}
        >
          <img 
            src={images[idx]} 
            className="max-w-full max-h-full object-contain select-none transition-transform"
            style={{
              transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
              transformOrigin: 'center center'
            }}
            alt="Padidinta" 
            draggable={false}
          />
        </div>
        {images.length > 1 && (
          <button onClick={next} className="absolute right-0 text-[#c29a74] text-5xl p-4 hover:text-white transition z-30">❯</button>
        )}
        <div className="absolute bottom-4 text-white font-semibold">{idx + 1} / {images.length}</div>
      </div>
    </div>
  );
};

const ProductCard = ({ product, onAdd, getPrice, onOpenModal }: any) => {
  const [qty, setQty] = useState(1);
  const price = getPrice(product.basePrice);

  return (
    <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col text-slate-800">
      <ImageGallery images={product.images} onImageClick={(idx) => onOpenModal(product.images, idx)} />
      <h2 className="text-lg font-semibold leading-tight mb-2 h-12 overflow-hidden">{product.name}</h2>
      <div className="flex justify-between items-end mt-auto">
        <div>
          <p className="text-xs text-gray-400 line-through">{product.basePrice.toFixed(2)} €</p>
          <p className="text-black font-semibold text-xl">{price.toFixed(2)} €</p>
        </div>
        <div className="flex gap-2">
          <input type="number" min="1" value={qty} onChange={(e) => setQty(parseInt(e.target.value) || 1)} className="w-12 border rounded text-center text-sm" />
          <button onClick={() => {onAdd(product, qty); setQty(1);}} className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm hover:bg-black transition">Įdėti</button>
        </div>
      </div>
    </div>
  );
};

// --- PAGRINDINIS PUSLAPIS ---

export default function B2BPortal() {
  const [view, setView] = useState("katalogas");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [clientCode, setClientCode] = useState("");
  const [orderHistory, setOrderHistory] = useState<any[]>([]);
  const [allCarts, setAllCarts] = useState<any>({});
  
  // Modal būsena
  const [modalData, setModalData] = useState<{images: string[], index: number} | null>(null);

  // Įmonės duomenys ir pristatymo adresai
  const [companyData, setCompanyData] = useState<any>({
    name: "",
    code: "",
    phone: "",
    email: "",
    address: ""
  });
  const [editCompanyData, setEditCompanyData] = useState<any>({
    name: "",
    code: "",
    phone: "",
    email: "",
    address: ""
  });
  const [editingCompany, setEditingCompany] = useState(false);
  const [deliveryAddresses, setDeliveryAddresses] = useState<any[]>([]);
  const [newAddress, setNewAddress] = useState({ id: "", name: "", address: "", city: "", postalCode: "", phone: "" });
  const [editingAddressIdx, setEditingAddressIdx] = useState<number | null>(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [formPassword, setFormPassword] = useState("");

  // Client data will be loaded from localStorage after Supabase Auth login
  const [clients, setClients] = useState<any>({});

  const [products, setProducts] = useState<any[]>([]);

  // Fetch products from Supabase and filter by client ('all' or client's name)
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const clientName = typeof window !== 'undefined' ? localStorage.getItem('client_name') : null;
        console.log('📦 Fetching products...');
        console.log('📦 isLoggedIn:', isLoggedIn);
        console.log('📦 clientCode:', clientCode);
        console.log('📦 client_name from localStorage:', clientName);
        const clientFilter = clientName ? `client.eq.${clientName}` : `client.eq.all`;
        console.log('📦 Client filter query:', clientFilter);
        let { data, error } = await supabase.from('products').select('*').or(clientFilter);
        if (!error && clientName && (!data || data.length === 0)) {
          console.log('📦 No client products found, falling back to all');
          const fallback = await supabase.from('products').select('*').eq('client', 'all');
          data = fallback.data;
          error = fallback.error;
        }
        console.log('📦 Products data:', data);
        console.log('📦 Products error:', error);
        if (error) {
          console.error('Klaida traukiant prekes:', error.message);
          return;
        }
        const mapped = (data || []).map((row: any) => {
          // Determine images from image_url, images, image fields
          let images: string[] = ['/placeholder.jpg'];
          if (row.image_url) {
            if (Array.isArray(row.image_url)) images = row.image_url;
            else if (typeof row.image_url === 'string') images = [row.image_url];
          } else if (row.images) {
            images = Array.isArray(row.images) ? row.images : [row.images];
          } else if (row.image) {
            images = [row.image];
          }

          return {
            id: row.id,
            name: row.name,
            basePrice: row.price ?? row.base_price ?? row.basePrice ?? 0,
            category: row.category ?? 'general',
            images,
            client: row.client ?? 'all'
          };
        });
        console.log('📦 Mapped products count:', mapped.length);
        console.log('📦 Mapped products:', mapped);
        setProducts(mapped);
      } catch (e) {
        console.error('Fetch products error', e);
      }
    };
    fetchProducts();
  }, [isLoggedIn, clientCode]);

  // Patikrinti localStorage prisijungimo būsenai, saugytam langui ir užsakymams
  useEffect(() => {
    const savedLoggedIn = localStorage.getItem('isLoggedIn');
    const savedClientCode = localStorage.getItem('clientCode');
    const savedView = localStorage.getItem('currentView');
    const savedOrderHistory = localStorage.getItem('orderHistory');
    
    if (savedOrderHistory) {
      try {
        setOrderHistory(JSON.parse(savedOrderHistory));
      } catch (e) {
        console.log('Klaida skaitant užsakymus');
      }
    }
    
    if (savedLoggedIn === 'true' && savedClientCode) {
      setIsLoggedIn(true);
      setClientCode(savedClientCode);
      setView(savedView || 'katalogas');
      
      // Load client profile from localStorage and populate clients object
      const profileClientName = localStorage.getItem('client_name');
      const profileDiscountGroup = localStorage.getItem('discount_group');
      
      // Parse discount (stored as string like "0.8" or "1.0")
      const discount = profileDiscountGroup ? parseFloat(profileDiscountGroup) : 1.0;
      
      setClients({
        [savedClientCode]: {
          name: profileClientName || savedClientCode,
          discount: discount
        }
      });
    }
  }, []);

  // Saugoti dabartinį langą į localStorage
  useEffect(() => {
    if (isLoggedIn) {
      localStorage.setItem('currentView', view);
    }
  }, [view, isLoggedIn]);

  // Saugoti užsakymų istoriją į localStorage
  useEffect(() => {
    localStorage.setItem('orderHistory', JSON.stringify(orderHistory));
  }, [orderHistory]);

  // Kraustyti užsakymų istoriją iš Supabase kai vartotojas prisijungia
  useEffect(() => {
    if (isLoggedIn) {
      const fetchOrders = async () => {
        try {
          const { data: { user }, error: authError } = await supabase.auth.getUser();
          if (authError || !user) return;
          
          const { data, error } = await supabase
            .from('orders')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });
          
          if (!error && data) {
            const mapped = data.map((order: any, index: number) => ({
              id: order.id,
              order_number: index + 1,
              date: new Date(order.created_at).toLocaleString('lt-LT'),
              client: order.client_name,
              items: order.order_items || [],
              total: order.total_price,
              status: order.status,
              manager_email: order.manager_email
            }));
            setOrderHistory(mapped);
          }
        } catch (e) {
          console.error('Klaida kraunant užsakymus:', e);
        }
      };
      fetchOrders();
    }
  }, [isLoggedIn]);

  // Įkelti duomenis iš localStorage kai pasikeičia clientCode
  useEffect(() => {
    if (isLoggedIn && clientCode) {
      const savedCompanyData = localStorage.getItem(`companyData_${clientCode}`);
      const savedDeliveryAddresses = localStorage.getItem(`deliveryAddresses_${clientCode}`);
      
      if (savedCompanyData) {
        const parsed = JSON.parse(savedCompanyData);
        setCompanyData(parsed);
        setEditCompanyData(parsed);
        setEditingCompany(false);
      } else {
        const emptyData = {
          name: "",
          code: "",
          phone: "",
          email: "",
          address: ""
        };
        setCompanyData(emptyData);
        setEditCompanyData(emptyData);
        setEditingCompany(true);
      }
      
      if (savedDeliveryAddresses) {
        setDeliveryAddresses(JSON.parse(savedDeliveryAddresses));
      } else {
        setDeliveryAddresses([]);
      }
      
      setShowAddressForm(false);
      setEditingAddressIdx(null);
      setNewAddress({ id: "", name: "", address: "", city: "", postalCode: "", phone: "" });
    }
  }, [clientCode, isLoggedIn]);

  const getPrice = (basePrice: number) => {
    let multiplier = 1;
    try {
      const discountGroup = typeof window !== 'undefined' ? localStorage.getItem('discount_group') : null;
      if (discountGroup && discountGroup.startsWith('D')) {
        const pct = parseInt(discountGroup.slice(1));
        if (!isNaN(pct)) multiplier = 1 - pct / 100;
      } else {
        multiplier = (clients[clientCode]?.discount) || 1;
      }
    } catch (e) {
      multiplier = (clients[clientCode]?.discount) || 1;
    }
    return basePrice * multiplier;
  };

  const filteredProducts = selectedCategory
    ? products.filter((p) => p.category === selectedCategory)
    : products;

  const addToCart = (product: any, addedQty: number) => {
    const price = getPrice(product.basePrice);
    setAllCarts((prev: any) => {
      const currentClientCart = prev[clientCode] || [];
      const existingIdx = currentClientCart.findIndex((i: any) => i.id === product.id);
      let newItems;
      if (existingIdx > -1) {
        newItems = currentClientCart.map((item: any, idx: number) => {
          if (idx === existingIdx) {
            const updatedQty = item.qty + addedQty;
            return { ...item, qty: updatedQty, totalPrice: updatedQty * price };
          }
          return item;
        });
      } else {
        newItems = [...currentClientCart, { ...product, price, qty: addedQty, totalPrice: price * addedQty }];
      }
      return { ...prev, [clientCode]: newItems };
    });
  };

  const updateQty = (productId: number, newQty: number) => {
    if (newQty < 1) return;
    const price = getPrice(products.find(p => p.id === productId)?.basePrice || 0);
    setAllCarts((prev: any) => ({
      ...prev,
      [clientCode]: prev[clientCode].map((item: any) => 
        item.id === productId ? { ...item, qty: newQty, totalPrice: price * newQty } : item
      )
    }));
  };

  const removeItem = (productId: number) => {
    setAllCarts((prev: any) => ({
      ...prev,
      [clientCode]: prev[clientCode].filter((item: any) => item.id !== productId)
    }));
  };

  const clearCart = () => setAllCarts((prev: any) => ({ ...prev, [clientCode]: [] }));

  const submitOrder = async () => {
    const cartItems = allCarts[clientCode] || [];
    if (!cartItems || cartItems.length === 0) {
      alert('Krepšelis tuščias');
      return;
    }

    const total = cartItems.reduce((s: number, i: any) => s + i.totalPrice, 0);

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError) {
      console.error('Klaida gaunant vartotoją:', authError.message);
    }
    const userId = authData?.user?.id || null;
    if (!userId) {
      alert('Nepavyko nustatyti vartotojo. Prisijunkite iš naujo.');
      return;
    }

    const managerEmail = typeof window !== 'undefined' ? localStorage.getItem('manager_email') : null;
    
    const payload = {
      user_id: userId,
      client_name: clients[clientCode]?.name || clientCode || 'unknown',
      order_items: cartItems,
      total_price: total,
      manager_email: managerEmail || companyData?.email || 'orders@flokati.lt',
      status: 'Išsiųsta',
      created_at: new Date().toISOString()
    };

    // Insert into Supabase 'orders' table
    try {
      const { data, error } = await supabase.from('orders').insert(payload).select().single();
      if (error) {
        console.error('Klaida įrašant užsakymą:', error.message);
        alert('Įvyko klaida siunčiant užsakymą. Bandykite vėliau.');
        return;
      }

      const serverOrder = data || null;

      const nextOrderNumber = orderHistory.length > 0 
        ? Math.max(...orderHistory.map(o => o.order_number || 0)) + 1 
        : 1;

      const newOrder = {
        id: serverOrder?.id ?? Math.floor(Math.random() * 100000),
        order_number: nextOrderNumber,
        date: new Date().toLocaleString('lt-LT'),
        client: payload.client_name,
        items: [...cartItems],
        total: total,
        status: payload.status,
        manager_email: payload.manager_email
      };

      setOrderHistory([newOrder, ...orderHistory]);
      clearCart();
      alert(`Užsakymas išsiųstas ${payload.manager_email}!\nSuma: ${total.toFixed(2)} €`);
    } catch (e) {
      console.error('submitOrder error', e);
      alert('Įvyko klaida siunčiant užsakymą.');
    }
  };

  const exportOrderToPDF = (order: any) => {
    const pdf = new jsPDF();
    let yPosition = 20;

    // Antraštė
    pdf.setFontSize(20);
    pdf.text('FLOKATI B2B', 20, yPosition);
    
    yPosition += 15;
    pdf.setFontSize(12);
    pdf.text(`Užsakymas #${order.order_number}`, 20, yPosition);
    yPosition += 7;
    pdf.setFontSize(10);
    pdf.text(`Data: ${order.date}`, 20, yPosition);
    
    yPosition += 15;
    pdf.setFontSize(11);
    pdf.text(`Kliento vardas: ${order.client}`, 20, yPosition);
    
    yPosition += 15;
    // Lentelės antraštės
    pdf.setFontSize(10);
    pdf.setFont('Helvetica', 'bold');
    pdf.text('Prekė', 20, yPosition);
    pdf.text('Kiekis', 100, yPosition);
    pdf.text('Vnt. kaina', 130, yPosition);
    pdf.text('Suma', 160, yPosition);
    
    yPosition += 8;
    pdf.setFont('Helvetica', 'normal');
    
    // Prekės
    order.items.forEach((item: any) => {
      pdf.setFontSize(9);
      pdf.text(item.name.substring(0, 45), 20, yPosition);
      pdf.text(item.qty.toString(), 100, yPosition);
      pdf.text(`${item.price.toFixed(2)} €`, 130, yPosition);
      pdf.text(`${item.totalPrice.toFixed(2)} €`, 160, yPosition);
      yPosition += 7;
    });
    
    yPosition += 5;
    pdf.setDrawColor(200);
    pdf.line(20, yPosition, 180, yPosition);
    
    yPosition += 8;
    pdf.setFontSize(12);
    pdf.setFont('Helvetica', 'bold');
    pdf.text(`VISO: ${order.total.toFixed(2)} €`, 160, yPosition, { align: 'left' });
    
    // Šaltinis ir data
    yPosition += 20;
    pdf.setFontSize(8);
    pdf.setFont('Helvetica', 'normal');
    pdf.text(`Generuota: ${new Date().toLocaleString('lt-LT')}`, 20, yPosition);
    
    // Išsaugoti failą
    pdf.save(`Uzsakymas_${order.id}_${Date.now()}.pdf`);
  };

  const currentCart = allCarts[clientCode] || [];
  const currentTotal = currentCart.reduce((s: number, i: any) => s + i.totalPrice, 0);

  // Redirect to login page if not authenticated
  if (!isLoggedIn) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center bg-cover bg-center bg-no-repeat p-4 font-sans relative"
        style={{ backgroundImage: "url('/background.jpg')" }}
      >
        {/* Tamsus sluoksnis gylio pojūčiui */}
        <div className="absolute inset-0 bg-black/40"></div>

        <form 
          onSubmit={async (e: any) => {
            e.preventDefault();
            const email = e.target.email.value;
            const password = formPassword;
            
            try {
              const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ 
                email, 
                password 
              });

              if (signInError) {
                alert("Neteisingas prisijungimo vardas arba slaptažodis");
                return;
              }

              const user = signInData.user;
              if (!user) {
                alert("Vartotojas nerastas");
                return;
              }

              // Fetch profile from 'customers' table
              const { data: profiles, error: profileError } = await supabase
                .from("customers")
                .select("client_name, discount_group, manager_email")
                .eq("id", user.id);

              console.log('🔍 User ID:', user.id);
              console.log('🔍 Profiles result:', profiles);
              console.log('🔍 Profile error:', profileError);

              if (profileError) {
                console.warn("Klaida gaunant profile:", profileError.message);
              }

              const profile = profiles && profiles.length > 0 ? profiles[0] : null;
              console.log('🔍 Selected profile:', profile);

              const clientName = profile?.client_name || null;
              const discountGroup = profile?.discount_group || null;
              const managerEmail = profile?.manager_email || null;
              const clientCode = discountGroup || clientName || "";

              // Save to localStorage
              localStorage.setItem('isLoggedIn', 'true');
              if (clientCode) localStorage.setItem('clientCode', clientCode);
              if (clientName) localStorage.setItem('client_name', clientName);
              if (discountGroup) localStorage.setItem('discount_group', discountGroup);
              if (managerEmail) localStorage.setItem('manager_email', managerEmail);

              // Update state
              setClientCode(clientCode);
              setIsLoggedIn(true);
              setView("katalogas");
              
              // Populate clients object
              const discount = discountGroup ? parseFloat(discountGroup) : 1.0;
              setClients({
                [clientCode]: {
                  name: clientName || clientCode,
                  discount: discount
                }
              });
            } catch (err: any) {
              alert(err?.message || "Prisijungimo klaida");
            }
          }} 
          className="relative z-10 p-6 w-full max-w-md bg-transparent text-center"
        >
          <div className="mb-4">
            <span className="block text-6xl font-extralight text-white/95 uppercase tracking-[0.35em]">FLOKATI</span>
            <div className="text-xl text-white/80 uppercase tracking-[0.15em] mt-2">B2B</div>
          </div>

          <div className="space-y-6">
            <input 
              name="email"
              type="email"
              placeholder="Prisijungimo vardas" 
              className="w-full bg-transparent border-0 border-b border-white placeholder-white/50 py-3 outline-none text-white text-lg"
              required 
            />
            <div className="relative">
              <input 
                name="password"
                value={formPassword}
                onChange={(e) => setFormPassword(e.target.value)}
                type={showPassword ? "text" : "password"}
                placeholder="Slaptažodis" 
                className="w-full bg-transparent border-0 border-b border-white placeholder-white/50 py-3 outline-none text-white text-lg pr-10"
                required 
              />
              {formPassword.length > 0 && (
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-white/70 hover:text-white"
                aria-label={showPassword ? "Slėpti slaptažodį" : "Rodyti slaptažodį"}
              >
                {showPassword ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-5 w-5"
                  >
                    <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a21.77 21.77 0 0 1 5.06-6.94" />
                    <path d="M1 1l22 22" />
                    <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
                    <path d="M14.12 14.12 9.88 9.88" />
                    <path d="M7.12 7.12A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a21.68 21.68 0 0 1-4.87 6.06" />
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-5 w-5"
                  >
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
              )}
            </div>
            <button className="w-full bg-slate-900/80 text-white py-3 rounded-md font-semibold uppercase tracking-[0.18em] transition-all hover:bg-slate-900/90">
              PRISIJUNGTI
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-slate-800 font-sans">
      {/* Modal Langas */}
      {modalData && (
        <ImageModal 
          images={modalData.images} 
          startIndex={modalData.index} 
          onClose={() => setModalData(null)} 
        />
      )}

      <nav className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center text-slate-800">
          <div className="flex gap-8 items-center">
            <button onClick={() => setView("katalogas")} className={`font-medium ${view === 'katalogas' ? 'text-[#c29a74] border-b-2 border-[#c29a74]' : 'text-gray-500'}`}>Katalogas</button>
            <button onClick={() => setView("uzsakymai")} className={`font-medium ${view === 'uzsakymai' ? 'text-[#c29a74] border-b-2 border-[#c29a74]' : 'text-gray-500'}`}>Užsakymai</button>
            <button onClick={() => setView("mano-duomenis")} className={`font-medium ${view === 'mano-duomenis' ? 'text-[#c29a74] border-b-2 border-[#c29a74]' : 'text-gray-500'}`}>Mano duomenys</button>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm font-semibold bg-[#c29a74]/10 px-3 py-1 rounded-full text-black">{clients[clientCode].name}</span>
            <button onClick={() => {
              setIsLoggedIn(false);
              setClientCode('');
              setFormPassword('');
              setShowPassword(false);
              localStorage.removeItem('isLoggedIn');
              localStorage.removeItem('clientCode');
              localStorage.removeItem('client_name');
              localStorage.removeItem('discount_group');
              localStorage.removeItem('manager_email');
              localStorage.removeItem('currentView');
            }} className="text-gray-400 hover:text-[#c29a74] text-sm">Atsijungti</button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-6">
        {view === "mano-duomenis" ? (
          <div className="bg-white p-8 rounded-2xl shadow-sm border">
            <h2 className="text-2xl font-extralight mb-8">Mano duomenys</h2>
            
            {/* Įmonės duomenys */}
            <div className="mb-10 pb-8 border-b">
              <h3 className="text-xl font-semibold mb-6 text-[#c29a74] flex items-center justify-between">
                Įmonės informacija
                {!editingCompany && companyData.name && (
                  <button 
                    onClick={() => {
                      setEditCompanyData(companyData);
                      setEditingCompany(true);
                    }}
                    className="text-sm bg-[#c29a74]/10 text-[#c29a74] px-3 py-1 rounded-lg hover:bg-[#c29a74]/20 transition"
                  >
                    Redaguoti
                  </button>
                )}
              </h3>

              {editingCompany || !companyData.name ? (
                // Redagavimo režimas (arba jei nėra duomenų)
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <label className="block text-sm font-semibold mb-2 text-gray-700">Įmonės pavadinimas</label>
                      <input 
                        type="text" 
                        value={editCompanyData.name} 
                        onChange={(e) => setEditCompanyData({...editCompanyData, name: e.target.value})}
                        className="w-full border rounded-lg p-3 text-slate-800 focus:ring-2 focus:ring-[#c29a74] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2 text-gray-700">Įmonės kodas</label>
                      <input 
                        type="text" 
                        value={editCompanyData.code} 
                        onChange={(e) => setEditCompanyData({...editCompanyData, code: e.target.value})}
                           className="w-full border rounded-lg p-3 text-slate-800 focus:ring-2 focus:ring-[#c29a74] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2 text-gray-700">Telefonas</label>
                      <input 
                        type="tel" 
                        value={editCompanyData.phone} 
                        onChange={(e) => setEditCompanyData({...editCompanyData, phone: e.target.value})}
                                className="w-full border rounded-lg p-3 text-slate-800 focus:ring-2 focus:ring-[#c29a74] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2 text-gray-700">El. paštas</label>
                      <input 
                        type="email" 
                        value={editCompanyData.email} 
                        onChange={(e) => setEditCompanyData({...editCompanyData, email: e.target.value})}
                           className="w-full border rounded-lg p-3 text-slate-800 focus:ring-2 focus:ring-[#c29a74] outline-none"                        
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold mb-2 text-gray-700">Įmonės registracijos adresas</label>
                      <input 
                        type="text" 
                        value={editCompanyData.address} 
                        onChange={(e) => setEditCompanyData({...editCompanyData, address: e.target.value})}
                           className="w-full border rounded-lg p-3 text-slate-800 focus:ring-2 focus:ring-[#c29a74] outline-none"                       
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        localStorage.setItem(`companyData_${clientCode}`, JSON.stringify(editCompanyData));
                        setCompanyData(editCompanyData);
                        setEditingCompany(false);
                        alert("Įmonės duomenys išsaugoti!");
                      }}
                      className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition"
                    >
                      ✓ Išsaugoti
                    </button>
                    <button 
                      onClick={() => {
                        setEditCompanyData(companyData);
                        setEditingCompany(false);
                      }}
                      className="flex-1 bg-gray-400 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-500 transition"
                    >
                      ✕ Atšaukti
                    </button>
                  </div>
                </>
              ) : companyData.name ? (
                // Peržiūros režimas su duomenimis
                <div className="bg-gray-50 p-6 rounded-lg border">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-1">Įmonės pavadinimas</p>
                      <p className="text-lg text-slate-800 font-semibold">{companyData.name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-1">Įmonės kodas</p>
                      <p className="text-lg text-slate-800 font-semibold">{companyData.code || "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-1">Telefonas</p>
                      <p className="text-lg text-slate-800 font-semibold">{companyData.phone || "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-1">El. paštas</p>
                      <p className="text-lg text-slate-800 font-semibold">{companyData.email || "—"}</p>
                    </div>
                    <div className="md:col-span-2">
                      <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-1">Įmonės registracijos adresas</p>
                      <p className="text-lg text-slate-800 font-semibold">{companyData.address || "—"}</p>
                    </div>
                  </div>
                </div>
              ) : (
                // Forma kai nėra duomenų
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <label className="block text-sm font-semibold mb-2 text-gray-700">Įmonės pavadinimas</label>
                      <input 
                        type="text" 
                        value={editCompanyData.name} 
                        onChange={(e) => setEditCompanyData({...editCompanyData, name: e.target.value})}
                        className="w-full border rounded-lg p-3 text-slate-800 focus:ring-2 focus:ring-[#c29a74] outline-none"
                        placeholder="pvz. UAB Flokati"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2 text-gray-700">Įmonės kodas</label>
                      <input 
                        type="text" 
                        value={editCompanyData.code} 
                        onChange={(e) => setEditCompanyData({...editCompanyData, code: e.target.value})}
                        className="w-full border rounded-lg p-3 text-slate-800 focus:ring-2 focus:ring-[#c29a74] outline-none"
                        placeholder="pvz. 305522547"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2 text-gray-700">Telefonas</label>
                      <input 
                        type="tel" 
                        value={editCompanyData.phone} 
                        onChange={(e) => setEditCompanyData({...editCompanyData, phone: e.target.value})}
                        className="w-full border rounded-lg p-3 text-slate-800 focus:ring-2 focus:ring-[#c29a74] outline-none"
                        placeholder="pvz. +370 600 12345"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2 text-gray-700">El. paštas</label>
                      <input 
                        type="email" 
                        value={editCompanyData.email} 
                        onChange={(e) => setEditCompanyData({...editCompanyData, email: e.target.value})}
                        className="w-full border rounded-lg p-3 text-slate-800 focus:ring-2 focus:ring-[#c29a74] outline-none"
                        placeholder="pvz. info@flokati.lt"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold mb-2 text-gray-700">Pagrindinės sėdybos adresas</label>
                      <input 
                        type="text" 
                        value={editCompanyData.address} 
                        onChange={(e) => setEditCompanyData({...editCompanyData, address: e.target.value})}
                        className="w-full border rounded-lg p-3 text-slate-800 focus:ring-2 focus:ring-[#c29a74] outline-none"
                        placeholder="pvz. Kalnu g. 5, Vilnius"
                      />
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      localStorage.setItem(`companyData_${clientCode}`, JSON.stringify(editCompanyData));
                      setCompanyData(editCompanyData);
                      setEditingCompany(false);
                      alert("Įmonės duomenys išsaugoti!");
                    }}
                    className="w-full bg-[#c29a74] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#b8885e] transition"
                  >
                    Išsaugoti
                  </button>
                </>
              )}
            </div>

            {/* Pristatymo adresai */}
            <div>
              <h3 className="text-xl font-semibold mb-6 text-[#c29a74]">Pristatymo adresai</h3>
              
              {/* Esamų adresų sąrašas */}
              {deliveryAddresses.length > 0 && (
                <div className="mb-8 space-y-3">
                  {deliveryAddresses.map((addr, idx) => (
                    <div key={addr.id || idx} className="bg-gray-50 p-4 rounded-lg border">
                      {editingAddressIdx === idx ? (
                        // Redagavimo režimas
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-semibold mb-2 text-gray-700">Įmonės pavadinimas</label>
                              <input
                                type="text" 
                                value={addr.name} 
                                onChange={(e) => {
                                  const updated = [...deliveryAddresses];
                                  updated[idx].name = e.target.value;
                                  setDeliveryAddresses(updated);
                                }}
                                className="w-full border rounded-lg p-3 text-slate-800 focus:ring-2 focus:ring-[#c29a74] outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold mb-2 text-gray-700">Adresas</label>
                              <input 
                                type="text" 
                                value={addr.address} 
                                onChange={(e) => {
                                  const updated = [...deliveryAddresses];
                                  updated[idx].address = e.target.value;
                                  setDeliveryAddresses(updated);
                                }}
                                className="w-full border rounded-lg p-3 text-slate-800 focus:ring-2 focus:ring-[#c29a74] outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold mb-2 text-gray-700">Miestas</label>
                              <input 
                                type="text" 
                                value={addr.city} 
                                onChange={(e) => {
                                  const updated = [...deliveryAddresses];
                                  updated[idx].city = e.target.value;
                                  setDeliveryAddresses(updated);
                                }}
                                className="w-full border rounded-lg p-3 text-slate-800 focus:ring-2 focus:ring-[#c29a74] outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold mb-2 text-gray-700">Pašto kodas</label>
                              <input 
                                type="text" 
                                value={addr.postalCode} 
                                onChange={(e) => {
                                  const updated = [...deliveryAddresses];
                                  updated[idx].postalCode = e.target.value;
                                  setDeliveryAddresses(updated);
                                }}
                                className="w-full border rounded-lg p-3 text-slate-800 focus:ring-2 focus:ring-[#c29a74] outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold mb-2 text-gray-700">Telefonas</label>
                              <input 
                                type="tel" 
                                value={addr.phone} 
                                onChange={(e) => {
                                  const updated = [...deliveryAddresses];
                                  updated[idx].phone = e.target.value;
                                  setDeliveryAddresses(updated);
                                }}
                                className="w-full border rounded-lg p-3 text-slate-800 focus:ring-2 focus:ring-[#c29a74] outline-none"
                              />
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button 
                              onClick={() => {
                                localStorage.setItem(`deliveryAddresses_${clientCode}`, JSON.stringify(deliveryAddresses));
                                setEditingAddressIdx(null);
                                alert("Adresas atnaujintas!");
                              }}
                              className="flex-1 bg-[#c29a74] text-white px-4 py-2 rounded-lg font-semibold hover:bg-[#b8885e] transition"
                            >
                              ✓ Išsaugoti
                            </button>
                            <button 
                              onClick={() => setEditingAddressIdx(null)}
                              className="flex-1 bg-gray-400 text-white px-4 py-2 rounded-lg font-semibold hover:bg-gray-500 transition"
                            >
                              ✕ Atšaukti
                            </button>
                          </div>
                        </div>
                      ) : (
                        // Peržiūros režimas
                        <div className="flex justify-between items-start">
                          <div className="flex-1 cursor-pointer hover:text-[#c29a74]" onClick={() => setEditingAddressIdx(idx)}>
                            <h4 className="font-semibold text-slate-800 mb-1">{addr.name}</h4>
                            <p className="text-sm text-gray-600">{addr.address}</p>
                            <p className="text-sm text-gray-600">{addr.city}, {addr.postalCode}</p>
                            {addr.phone && <p className="text-sm text-gray-600 mt-1">📞 {addr.phone}</p>}
                            <p className="text-xs text-[#c29a74] mt-2">Spustelėkite redaguoti</p>
                          </div>
                          <button 
                            onClick={() => {
                              const updated = deliveryAddresses.filter((_, i) => i !== idx);
                              setDeliveryAddresses(updated);
                              localStorage.setItem(`deliveryAddresses_${clientCode}`, JSON.stringify(updated));
                            }}
                            className="text-red-500 hover:text-red-700 font-bold ml-4 flex-shrink-0"
                          >
                            ✕
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Mygtukas pridėti naują adresą */}
              {!showAddressForm && (
                <button 
                  onClick={() => setShowAddressForm(true)}
                  className="w-full bg-[#c29a74] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#b8885e] transition mb-6"
                >
                  Pridėti naują adresą
                </button>
              )}

              {/* Naujo adreso forma */}
              {showAddressForm && (
                <div className="bg-[#c29a74]/10 p-6 rounded-xl border-2 border-[#c29a74]/30">
                  <h4 className="font-semibold text-slate-800 mb-4">Pridėti naują adresą</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-gray-700">Įmonės pavadinimas</label>
                    <input 
                      type="text" 
                      value={newAddress.name} 
                      onChange={(e) => setNewAddress({...newAddress, name: e.target.value})}
                      className="w-full border rounded-lg p-3 text-slate-800 focus:ring-2 focus:ring-[#c29a74] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-gray-700">Adresas</label>
                    <input 
                      type="text" 
                      value={newAddress.address} 
                      onChange={(e) => setNewAddress({...newAddress, address: e.target.value})}
                      className="w-full border rounded-lg p-3 text-slate-800 focus:ring-2 focus:ring-[#c29a74] outline-none"

                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-gray-700">Miestas</label>
                    <input 
                      type="text" 
                      value={newAddress.city} 
                      onChange={(e) => setNewAddress({...newAddress, city: e.target.value})}
                      className="w-full border rounded-lg p-3 text-slate-800 focus:ring-2 focus:ring-[#c29a74] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-gray-700">Pašto kodas</label>
                    <input 
                      type="text" 
                      value={newAddress.postalCode} 
                      onChange={(e) => setNewAddress({...newAddress, postalCode: e.target.value})}
                      className="w-full border rounded-lg p-3 text-slate-800 focus:ring-2 focus:ring-[#c29a74] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-gray-700">Telefonas</label>
                    <input 
                      type="tel" 
                      value={newAddress.phone} 
                      onChange={(e) => setNewAddress({...newAddress, phone: e.target.value})}
                      className="w-full border rounded-lg p-3 text-slate-800 focus:ring-2 focus:ring-[#c29a74] outline-none"
                    />
                  </div>
                </div>
                <button 
                  onClick={() => {
                    if (newAddress.name && newAddress.address && newAddress.city && newAddress.postalCode) {
                      const updatedAddress = { ...newAddress, id: Date.now().toString() };
                      const updated = [...deliveryAddresses, updatedAddress];
                      setDeliveryAddresses(updated);
                      localStorage.setItem(`deliveryAddresses_${clientCode}`, JSON.stringify(updated));
                      setNewAddress({ id: "", name: "", address: "", city: "", postalCode: "", phone: "" });
                      setShowAddressForm(false);
                      alert("Adresas pridėtas!");
                    } else {
                      alert("Prašome užpildyti visus laukus!");
                    }
                  }}
                  className="mt-4 w-full bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition"
                >
                  Pridėti adresą
                </button>
                <button 
                  onClick={() => {
                    setShowAddressForm(false);
                    setNewAddress({ id: "", name: "", address: "", city: "", postalCode: "", phone: "" });
                  }}
                  className="mt-2 w-full bg-gray-400 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-500 transition"
                >
                  ✕ Atšaukti
                </button>
              </div>
              )}
            </div>
          </div>
        ) : view === "uzsakymai" ? (
          <div className="bg-white p-8 rounded-2xl shadow-sm border">
            <h2 className="text-2xl font-bold mb-6">Užsakymų istorija</h2>
            {orderHistory.filter(o => o.client === clients[clientCode].name).length === 0 ? (
              <p className="text-gray-400 italic text-center py-10">Istorija tuščia.</p>
            ) : (
              <div className="space-y-6">
                {orderHistory.filter(o => o.client === clients[clientCode].name).map(order => (
                  <div key={order.id} className="border rounded-xl p-6 bg-gray-50">
                    <div className="flex justify-between mb-4 border-b pb-2 items-center">
                      <div className="flex-1">
                        <span className="font-bold">Užsakymas #{order.order_number}</span>
                        <span className="text-gray-500 text-sm ml-4">{order.date}</span>
                      </div>
                      <button 
                        onClick={() => exportOrderToPDF(order)}
                        className="bg-[#c29a74] text-white px-4 py-2 rounded-lg font-semibold hover:bg-[#b8885e] transition text-sm whitespace-nowrap ml-4"
                      >
                        📥 PDF
                      </button>
                    </div>
                    {order.items.map((it: any, idx: number) => (
                      <div key={idx} className="text-sm flex justify-between py-1">
                        <span>{it.name} ({it.qty} vnt.)</span>
                        <span>{it.totalPrice.toFixed(2)} €</span>
                      </div>
                    ))}
                    <div className="text-right mt-4 font-black text-lg text-green-700">VISO: {order.total.toFixed(2)} €</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex gap-8">
            {/* Kategorijų Sidebar */}
            <div className="w-48 bg-white p-6 rounded-2xl shadow-sm border h-fit">
              <h3 className="text-lg font-bold mb-6 text-slate-800">Kategorijos</h3>
              <div className="space-y-2">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={`block w-full text-left px-4 py-3 rounded-lg font-medium transition ${!selectedCategory ? 'bg-[#c29a74] text-white' : 'text-slate-800 hover:bg-gray-100'}`}
                >
                  Visos prekės
                </button>
                <button
                  onClick={() => setSelectedCategory("antklodės")}
                  className={`block w-full text-left px-4 py-3 rounded-lg font-medium transition ${selectedCategory === "antklodės" ? 'bg-[#c29a74] text-white' : 'text-slate-800 hover:bg-gray-100'}`}
                >
                  Antklodės
                </button>
                <button
                  onClick={() => setSelectedCategory("pagalvės")}
                  className={`block w-full text-left px-4 py-3 rounded-lg font-medium transition ${selectedCategory === "pagalvės" ? 'bg-[#c29a74] text-white' : 'text-slate-800 hover:bg-gray-100'}`}
                >
                  Pagalvės
                </button>
                <button
                  onClick={() => setSelectedCategory("šlepetės")}
                  className={`block w-full text-left px-4 py-3 rounded-lg font-medium transition ${selectedCategory === "šlepetės" ? 'bg-[#c29a74] text-white' : 'text-slate-800 hover:bg-gray-100'}`}
                >
                  Šlepetės
                </button>
              </div>
            </div>

            {/* Produktai ir Krepšelis */}
            <div className="flex-1 flex flex-col lg:flex-row gap-8">
              <div className="flex-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-2 gap-6">
                  {filteredProducts.map(p => (
                    <ProductCard 
                      key={p.id} 
                      product={p} 
                      onAdd={addToCart} 
                      getPrice={getPrice}
                      onOpenModal={(images: string[], index: number) => setModalData({images, index})}
                    />
                  ))}
                </div>
              </div>

              <div className="w-full lg:w-80 bg-white p-5 rounded-2xl shadow-xl border-t-4 border-[#c29a74] h-fit sticky top-24">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-bold text-black">Krepšelis</h2>
                  {currentCart.length > 0 && <button onClick={clearCart} className="text-xs text-red-400 hover:underline font-bold">IŠVALYTI</button>}
                </div>
                <div className="space-y-3 mb-4 max-h-[50vh] overflow-y-auto pr-2">
                  {currentCart.length === 0 ? <p className="text-gray-400 italic text-center py-3 text-sm">Tuščias</p> : 
                    currentCart.map((item: any) => (
                      <div key={item.id} className="border-b border-gray-100 pb-2">
                        <div className="flex justify-between mb-1">
                          <span className="font-bold text-xs pr-2 text-black">{item.name}</span>
                          <button onClick={() => removeItem(item.id)} className="text-gray-300 hover:text-red-500 text-sm">✕</button>
                        </div>
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-1">
                            <button onClick={() => updateQty(item.id, item.qty - 1)} className="w-6 h-6 flex items-center justify-center border rounded bg-gray-50 hover:bg-gray-100 text-black text-xs">-</button>
                            <input type="number" value={item.qty} onChange={(e) => updateQty(item.id, parseInt(e.target.value) || 1)} className="w-8 text-center text-xs font-bold border-none bg-transparent text-black" />
                            <button onClick={() => updateQty(item.id, item.qty + 1)} className="w-6 h-6 flex items-center justify-center border rounded bg-gray-50 hover:bg-gray-100 text-black text-xs">+</button>
                          </div>
                          <div className="text-right">
                            <p className="text-[8px] text-gray-400 mb-0.5">{item.price.toFixed(2)} € / vnt.</p>
                            <p className="font-bold text-xs text-black">{(item.price * item.qty).toFixed(2)} €</p>
                          </div>
                        </div>
                      </div>
                    ))
                  }
              </div>
              {currentCart.length > 0 && (
                <div className="pt-3 border-t-2 border-[#c29a74]/20">
                  <div className="flex justify-between text-lg font-black text-green-700 mb-4 tracking-tighter">
                    <span>VISO:</span><span>{currentTotal.toFixed(2)} €</span>
                  </div>
                  <button onClick={submitOrder} className="w-full bg-green-600 text-white py-3 rounded-xl font-bold text-sm hover:bg-green-700 shadow-lg transition active:scale-95">PATVIRTINTI</button>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}