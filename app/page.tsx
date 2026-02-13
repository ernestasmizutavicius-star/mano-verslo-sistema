"use client";
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { jsPDF } from 'jspdf';
import { LayoutGrid, ClipboardList, User } from 'lucide-react';

// --- KOMPONENTAI ---

const loginBackgrounds = [
  "https://vltpeycabrrruokwmjvq.supabase.co/storage/v1/object/public/LoginPhotos/background.jpg",
  "https://vltpeycabrrruokwmjvq.supabase.co/storage/v1/object/public/LoginPhotos/background2.jpg",
  "https://vltpeycabrrruokwmjvq.supabase.co/storage/v1/object/public/LoginPhotos/background3.jpg",
  "https://vltpeycabrrruokwmjvq.supabase.co/storage/v1/object/public/LoginPhotos/background4.jpg",
  "https://vltpeycabrrruokwmjvq.supabase.co/storage/v1/object/public/LoginPhotos/background5.jpg"
];

const ImageGallery = ({ images, onImageClick }: { images: string[], onImageClick: (idx: number) => void }) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const next = (e: any) => { e.stopPropagation(); setCurrentIdx((currentIdx + 1) % images.length); };
  const prev = (e: any) => { e.stopPropagation(); setCurrentIdx((currentIdx - 1 + images.length) % images.length); };

  if (!images || images.length === 0) {
    return <div className="w-full aspect-[4/3] mb-3 rounded-[2rem] bg-[var(--surface-muted)]" />;
  }

  return (
    <div className="relative w-full aspect-[4/3] mb-3 group cursor-zoom-in" onClick={() => onImageClick(currentIdx)}>
      <img src={images[currentIdx]} alt="" className="w-full h-full object-cover rounded-[2rem] bg-[var(--surface-muted)] transition group-hover:opacity-90" />
      {images.length > 1 && (
        <><button onClick={prev} className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 rounded-full p-1 opacity-0 group-hover:opacity-100 transition text-black shadow">◀</button>
        <button onClick={next} className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 rounded-full p-1 opacity-0 group-hover:opacity-100 transition text-black shadow">▶</button></>
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
      <button className="absolute top-6 right-6 text-[var(--accent)] text-4xl hover:text-white transition" onClick={onClose}>&times;</button>
      <div 
        className="relative max-w-4xl w-full h-full flex items-center justify-center" 
        onClick={e => e.stopPropagation()}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {images.length > 1 && (
          <button onClick={prev} className="absolute left-0 text-[var(--accent)] text-5xl p-4 hover:text-white transition z-30">❮</button>
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
          <button onClick={next} className="absolute right-0 text-[var(--accent)] text-5xl p-4 hover:text-white transition z-30">❯</button>
        )}
        <div className="absolute bottom-4 text-white font-semibold">{idx + 1} / {images.length}</div>
      </div>
    </div>
  );
};

const ProductCard = ({ product, onAdd, getPrice, onOpenModal }: any) => {
  const price = getPrice(product.basePrice);
  const hasDiscount = price < product.basePrice;
  const [selectedSizes, setSelectedSizes] = useState<number[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const hasSizes = Array.isArray(product.sizes) && product.sizes.length > 0;
  const hasSizeLabels = hasSizes && product.sizes.some((s: any) => s.size);
  const sortedSizes = hasSizes
    ? [...product.sizes].sort((a: any, b: any) => {
        const parse = (value: any) => {
          if (!value || typeof value !== 'string') return [Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER];
          const alphaOrder: Record<string, number> = {
            XS: 1,
            S: 2,
            M: 3,
            L: 4,
            XL: 5,
            XXL: 6
          };
          const alphaTokens = value
            .split('/')
            .map((t) => t.trim().toUpperCase())
            .filter(Boolean);
          const alphaRanks = alphaTokens.map((t) => alphaOrder[t]).filter((n) => Number.isFinite(n));
          if (alphaRanks.length > 0) {
            const minRank = Math.min(...alphaRanks);
            return [minRank, minRank];
          }
          const normalized = value.replace(',', '.');
          const parts = normalized
            .split(/[xX\-]/)
            .map((p) => parseFloat(p.trim()))
            .filter((n) => Number.isFinite(n));
          if (parts.length === 0) return [Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER];
          return [parts[0], parts[1] ?? parts[0]];
        };
        const [a1, a2] = parse(a.size);
        const [b1, b2] = parse(b.size);
        if (a1 !== b1) return a1 - b1;
        return a2 - b2;
      })
    : [];

  useEffect(() => {
    if (hasSizeLabels) {
      const labeled = product.sizes.filter((s: any) => s.size);
      if (labeled.length === 1) {
        setSelectedSizes([labeled[0].id]);
      }
    }
  }, [hasSizeLabels, product.sizes]);

  const toggleSize = (sizeId: number) => {
    setSelectedSizes((prev) =>
      prev.includes(sizeId) ? prev.filter((id) => id !== sizeId) : [...prev, sizeId]
    );
  };

  const handleAdd = () => {
    if (!hasSizeLabels) {
      onAdd(product, 1);
      return;
    }
    if (selectedSizes.length === 0) return;
    const selected = product.sizes.filter((s: any) => selectedSizes.includes(s.id));
    selected.forEach((sizeProduct: any) => onAdd(sizeProduct, 1));
    setSelectedSizes([]);
  };

  const sizeOptions = hasSizeLabels ? sortedSizes.filter((s: any) => s.size) : [];

  return (
    <>
    {isExpanded && (
      <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm" onClick={() => setIsExpanded(false)} />
    )}
    {isExpanded && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setIsExpanded(false)}>
        <div
          className="bg-[var(--surface-muted)] p-8 rounded-3xl shadow-[var(--shadow-strong)] border border-black/5 w-full max-w-[960px]"
          onClick={(e) => e.stopPropagation()}
        >
          <ImageGallery images={product.images} onImageClick={(idx) => onOpenModal(product.images, idx)} />
          <div className="flex items-start justify-between gap-3 mb-2">
            <h2 className="text-lg font-semibold leading-tight text-[var(--foreground)] flex-1">{product.name}</h2>
            {product.description && (
              <button
                type="button"
                onClick={() => setIsExpanded(false)}
                className="text-[var(--ink-soft)] hover:text-[var(--foreground)] text-xs font-semibold"
                aria-label="Uždaryti sudėtį"
              >
                Uždaryti
              </button>
            )}
          </div>
          {product.description && (
            <div className="mb-4 text-sm text-[var(--ink-soft)]">
              <span className="font-semibold text-[var(--foreground)]">Sudėtis: </span>
              {product.description}
            </div>
          )}
          {product.clientItemNo && (
            <div className="mb-4 text-sm text-[var(--ink-soft)]">
              <span className="font-semibold text-[var(--foreground)]">Kliento prekės kodas: </span>
              {product.clientItemNo}
            </div>
          )}
          {hasSizeLabels && (
            <div className="mb-4">
              <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--ink-soft)] mb-2">Dydis</div>
              <div className="flex flex-wrap gap-2">
                {sizeOptions.map((sizeProduct: any) => (
                  <button
                    key={sizeProduct.id}
                    onClick={() => toggleSize(sizeProduct.id)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold border transition ${
                      selectedSizes.includes(sizeProduct.id)
                        ? 'bg-[var(--foreground)] text-white border-[var(--foreground)]'
                        : 'bg-white text-[var(--foreground)] border-black/10 hover:bg-[var(--surface)]'
                    }`}
                    type="button"
                  >
                    {sizeProduct.size || '—'}
                  </button>
                ))}
              </div>
              {selectedSizes.length === 0 && (
                <div className="mt-2 text-[10px] text-[var(--ink-soft)]">Pasirinkite dydį</div>
              )}
            </div>
          )}
          <div className="flex justify-between items-center">
            <div>
              {hasDiscount && (
                <p className="text-[10px] text-[var(--ink-soft)] line-through mb-1">{product.basePrice.toFixed(2)} €</p>
              )}
              <p className="text-[#166534] font-bold text-lg">{price.toFixed(2)} €</p>
            </div>
            <button
              onClick={handleAdd}
              disabled={hasSizeLabels && selectedSizes.length === 0}
              className="bg-white border border-black/10 text-[var(--foreground)] px-4 py-2 rounded-xl text-xs font-semibold hover:bg-[var(--surface)] transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Užsakyti
            </button>
          </div>
        </div>
      </div>
    )}
    <div className="w-full max-w-[280px] min-h-[500px] rounded-[2rem] overflow-hidden bg-[#e2e8d4] flex flex-col">
      <div className="w-full h-64">
        {product.images && product.images.length > 0 ? (
          <img
            src={product.images[0]}
            alt=""
            className="h-full w-full object-cover"
            onClick={() => onOpenModal(product.images, 0)}
          />
        ) : (
          <div className="h-full w-full bg-[#e2e8d4]" />
        )}
      </div>
      <div className="px-4 pb-4 pt-3 flex flex-col flex-grow text-[#2d3427]">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-sm font-semibold leading-tight min-h-[2.5rem] flex-1">{product.name}</h2>
          {product.description && (
            <button
              type="button"
              onClick={() => setIsExpanded((prev) => !prev)}
              className="text-[#2d3427] hover:text-black text-xs font-semibold bg-transparent border-0 p-0"
              aria-label="Rodyti sudeti"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
                <circle cx="12" cy="12" r="10" fill="#2d3427" />
                <circle cx="12" cy="7" r="1.6" fill="#ffffff" />
                <rect x="11" y="10" width="2" height="7" rx="1" fill="#ffffff" />
              </svg>
            </button>
          )}
        </div>
        {hasSizeLabels && (
          <div className="min-h-[80px]">
            <div className="text-[10px] uppercase tracking-[0.2em] text-[#2d3427] mb-2">Dydis</div>
            <div className="flex flex-wrap gap-2">
              {sizeOptions.map((sizeProduct: any) => (
                <button
                  key={sizeProduct.id}
                  onClick={() => toggleSize(sizeProduct.id)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold border transition ${
                    selectedSizes.includes(sizeProduct.id)
                      ? 'bg-[#2d3427] text-white border-[#2d3427]'
                      : 'bg-white text-[#2d3427] border-black/10 hover:bg-[#f2f5e8]'
                  }`}
                  type="button"
                >
                  {sizeProduct.size || '—'}
                </button>
              ))}
            </div>
            {selectedSizes.length === 0 && (
              <div className="mt-2 text-[10px] text-[#2d3427]">Pasirinkite dydį</div>
            )}
          </div>
        )}
        <div className="flex justify-between items-center mt-auto">
          <div>
            {hasDiscount && (
              <p className="text-[10px] text-[#2d3427] line-through mb-1">{product.basePrice.toFixed(2)} €</p>
            )}
            <p className="text-[#166534] font-bold text-lg">{price.toFixed(2)} €</p>
          </div>
          <button
            onClick={handleAdd}
            disabled={hasSizeLabels && selectedSizes.length === 0}
            className="bg-white border border-black/10 text-[#2d3427] px-4 py-2 rounded-xl text-xs font-semibold hover:bg-[#f2f5e8] transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Užsakyti
          </button>
        </div>
      </div>
    </div>
    </>
  );
};

// --- PAGRINDINIS PUSLAPIS ---

export default function B2BPortal() {
  const [view, setView] = useState("katalogas");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [clientCode, setClientCode] = useState("");
  const [orderHistory, setOrderHistory] = useState<any[]>([]);
  const [allCarts, setAllCarts] = useState<any>({});
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [cartNotice, setCartNotice] = useState<string | null>(null);
  const cartSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingCartRef = useRef<any[]>([]);
  
  // Modal būsena
  const [modalData, setModalData] = useState<{images: string[], index: number} | null>(null);

  // Įmonės duomenys ir pristatymo adresai
  const [companyData, setCompanyData] = useState<any>({
    name: "",
    code: "",
    phone: "",
    email: "",
    address: "",
    contactPerson: ""
  });
  const [editCompanyData, setEditCompanyData] = useState<any>({
    name: "",
    code: "",
    phone: "",
    email: "",
    address: "",
    contactPerson: ""
  });
  const [editingCompany, setEditingCompany] = useState(false);
  const [deliveryAddresses, setDeliveryAddresses] = useState<any[]>([]);
  const [selectedDeliveryAddress, setSelectedDeliveryAddress] = useState<number | null>(null);
  const [newAddress, setNewAddress] = useState({ id: "", name: "", address: "", city: "", postalCode: "", phone: "" });
  const [editingAddressIdx, setEditingAddressIdx] = useState<number | null>(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [isProductsLoading, setIsProductsLoading] = useState(false);
  const [isCartVisible, setIsCartVisible] = useState(false);
  const [loginBgIndex, setLoginBgIndex] = useState(0);

  // Client data will be loaded from localStorage after Supabase Auth login
  const [clients, setClients] = useState<any>({});

  const [products, setProducts] = useState<any[]>([]);

  const parseDiscountGroup = (value: string | null) => {
    if (!value) return 1;
    if (value.startsWith('D')) {
      const pct = parseInt(value.slice(1), 10);
      return Number.isFinite(pct) ? 1 - pct / 100 : 1;
    }
    const num = parseFloat(value);
    return Number.isFinite(num) ? num : 1;
  };

  const getAvailableItemNoSet = () => {
    const set = new Set<string>();
    products.forEach((product: any) => {
      if (product?.itemNo) set.add(String(product.itemNo));
      if (Array.isArray(product?.sizes)) {
        product.sizes.forEach((size: any) => {
          if (size?.itemNo) set.add(String(size.itemNo));
        });
      }
    });
    return set;
  };

  const applyAvailability = (items: any[]) => {
    const availableItemNos = getAvailableItemNoSet();
    return items.map((item: any) => {
      const itemNo = item.itemNo ?? item.item_no ?? null;
      const isUnavailable = itemNo ? !availableItemNos.has(String(itemNo)) : false;
      return {
        ...item,
        itemNo,
        unavailable: isUnavailable
      };
    });
  };

  const getUserId = async () => {
    if (authUserId) return authUserId;
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return null;
    setAuthUserId(user.id);
    return user.id;
  };

  const flushCartToDb = async (items: any[]) => {
    const userId = await getUserId();
    if (!userId) return;
    const { error } = await supabase
      .from('cart_items')
      .upsert({ user_id: userId, items }, { onConflict: 'user_id' });
    if (error) {
      console.error('Klaida saugant krepšeli:', error.message);
    }
  };

  const syncCartToDb = (items: any[]) => {
    pendingCartRef.current = items;
    if (cartSyncTimerRef.current) {
      clearTimeout(cartSyncTimerRef.current);
    }
    cartSyncTimerRef.current = setTimeout(() => {
      cartSyncTimerRef.current = null;
      flushCartToDb(pendingCartRef.current);
    }, 400);
  };

  useEffect(() => {
    return () => {
      if (cartSyncTimerRef.current) {
        clearTimeout(cartSyncTimerRef.current);
        cartSyncTimerRef.current = null;
        flushCartToDb(pendingCartRef.current);
      }
    };
  }, []);

  // Set loading state when clientCode changes
  useEffect(() => {
    if (isLoggedIn && clientCode) {
      setIsProductsLoading(true);
    }
  }, [isLoggedIn, clientCode]);

  // Fetch products from Supabase and filter by client ('all' or client's name)
  useEffect(() => {
    const fetchProducts = async () => {
      if (!isLoggedIn || !clientCode) {
        setProducts([]);
        setIsProductsLoading(false);
        return;
      }

      const clientNameFromState = clients[clientCode]?.name;
      try {
        const clientName = clientNameFromState || (typeof window !== 'undefined' ? localStorage.getItem('client_name') : null);
        if (!clientName) {
          setProducts([]);
          setIsProductsLoading(false);
          return;
        }
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
        const normalized = (data || []).map((row: any) => {
          // Determine images from image_url, images, image fields
          let images: string[] = [];
          if (row.image_url) {
            if (Array.isArray(row.image_url)) images = row.image_url;
            else if (typeof row.image_url === 'string') images = [row.image_url];
          } else if (row.images) {
            images = Array.isArray(row.images) ? row.images : [row.images];
          } else if (row.image) {
            images = [row.image];
          }

          const connectionRaw = row.conection ?? row.connection ?? row.conections ?? null;
          const connection = typeof connectionRaw === 'string' && connectionRaw.trim() === '' ? null : connectionRaw;

          return {
            id: row.id,
            name: row.name,
            basePrice: row.price ?? row.base_price ?? row.basePrice ?? 0,
            category: typeof row.category === 'string' && row.category.trim() !== '' ? row.category.trim() : null,
            images,
            client: row.client ?? 'all',
            itemNo: row.item_no ?? row.itemNo ?? null,
            clientItemNo: row.client_item_no ?? row.clientItemNo ?? null,
            connection: connection ?? null,
            size: row.size ?? null,
            description: row.description ?? null
          };
        });
        const connectionMap = new Map<string, any[]>();
        normalized.forEach((row: any) => {
          if (row.connection) {
            const key = String(row.connection);
            if (!connectionMap.has(key)) connectionMap.set(key, []);
            connectionMap.get(key)!.push(row);
          }
        });

        const mainProducts = normalized.filter((row: any) => !row.connection);
        const mainItemNos = new Set(
          mainProducts
            .map((row: any) => (row.itemNo ? String(row.itemNo) : null))
            .filter(Boolean)
        );

        const grouped = mainProducts.map((main: any) => {
          const variants = main.itemNo ? connectionMap.get(String(main.itemNo)) || [] : [];
          const sizeOptions = [main, ...variants].map((row: any) => ({
            id: row.id,
            name: row.name || main.name,
            basePrice: row.basePrice,
            category: row.category,
            images: main.images,
            client: row.client,
            itemNo: row.itemNo,
            clientItemNo: row.clientItemNo,
            connection: row.connection,
            size: row.size,
            description: row.description ?? main.description ?? null
          }));
          const sortedSizeOptions = [...sizeOptions].sort((a: any, b: any) => {
            const parse = (value: any) => {
              if (!value || typeof value !== 'string') return [Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER];
              const alphaOrder: Record<string, number> = {
                XS: 1,
                S: 2,
                M: 3,
                L: 4,
                XL: 5,
                XXL: 6
              };
              const alphaTokens = value
                .split('/')
                .map((t) => t.trim().toUpperCase())
                .filter(Boolean);
              const alphaRanks = alphaTokens.map((t) => alphaOrder[t]).filter((n) => Number.isFinite(n));
              if (alphaRanks.length > 0) {
                const minRank = Math.min(...alphaRanks);
                return [minRank, minRank];
              }
              const normalized = value.replace(',', '.');
              const parts = normalized
                .split(/[xX\-]/)
                .map((p) => parseFloat(p.trim()))
                .filter((n) => Number.isFinite(n));
              if (parts.length === 0) return [Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER];
              return [parts[0], parts[1] ?? parts[0]];
            };
            const [a1, a2] = parse(a.size);
            const [b1, b2] = parse(b.size);
            if (a1 !== b1) return a1 - b1;
            return a2 - b2;
          });

          return {
            ...main,
            sizes: sortedSizeOptions
          };
        });

        const orphans = normalized.filter((row: any) => row.connection && !mainItemNos.has(String(row.connection)));
        const orphanProducts = orphans.map((row: any) => ({
          ...row,
          sizes: [row]
        }));

        const mapped = [...grouped, ...orphanProducts];
        console.log('📦 Mapped products count:', mapped.length);
        console.log('📦 Mapped products:', mapped);
        setProducts(mapped);
      } catch (e) {
        console.error('Fetch products error', e);
        setIsProductsLoading(false);
      } finally {
        setIsProductsLoading(false);
      }
    };
    fetchProducts();
  }, [isLoggedIn, clientCode, clients]);

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
      const discount = parseDiscountGroup(profileDiscountGroup);
      
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

  useEffect(() => {
    setIsCartVisible(false);
  }, [view]);

  // Saugoti užsakymų istoriją į localStorage
  useEffect(() => {
    localStorage.setItem('orderHistory', JSON.stringify(orderHistory));
  }, [orderHistory]);

  // Išvalyti prisijungimo laukus kai atsijungiama
  useEffect(() => {
    if (!isLoggedIn) {
      setFormEmail('');
      setFormPassword('');
      setShowPassword(false);
    }
  }, [isLoggedIn]);

  useEffect(() => {
    if (!isLoggedIn) {
      const intervalId = setInterval(() => {
        setLoginBgIndex((prev) => (prev + 1) % loginBackgrounds.length);
      }, 7000);
      return () => clearInterval(intervalId);
    }
  }, [isLoggedIn]);


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
            .order('created_at', { ascending: true });
          
          if (!error && data) {
            const mapped = data.map((order: any, index: number) => ({
              id: order.id,
              order_number: index + 1,
              date: new Date(order.created_at).toLocaleString('lt-LT'),
              client: order.client_name,
              items: order.order_items || [],
              total: order.total_price,
              delivery_address: order.delivery_address,
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
      const clientName = localStorage.getItem('client_name') || '';
      const companyCode = localStorage.getItem('company_code') || '';
      const phone = localStorage.getItem('phone') || '';
      const email = localStorage.getItem('email') || '';
      const registrationAddress = localStorage.getItem('registration_address') || '';
      const contactPerson = localStorage.getItem('contact_person') || '';
      const deliveryAddressesStr = localStorage.getItem('delivery_addresses');
      
      const loadedData = {
        name: clientName,
        code: companyCode,
        phone: phone,
        email: email,
        address: registrationAddress,
        contactPerson: contactPerson
      };
      
      setCompanyData(loadedData);
      setEditCompanyData(loadedData);
      setEditingCompany(false);
      
      if (deliveryAddressesStr) {
        try {
          const parsed = JSON.parse(deliveryAddressesStr);
          setDeliveryAddresses(Array.isArray(parsed) ? parsed : []);
        } catch (e) {
          setDeliveryAddresses([]);
        }
      } else {
        setDeliveryAddresses([]);
      }
      
      setShowAddressForm(false);
      setEditingAddressIdx(null);
      setNewAddress({ id: "", name: "", address: "", city: "", postalCode: "", phone: "" });
      setSelectedDeliveryAddress(null);
    }
  }, [clientCode, isLoggedIn]);

  useEffect(() => {
    if (!isLoggedIn || !clientCode) return;

    const loadCart = async () => {
      const userId = await getUserId();
      if (!userId) return;

      const { data, error } = await supabase
        .from('cart_items')
        .select('items')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Klaida kraunant krepšeli:', error.message);
        return;
      }

      const items = Array.isArray(data?.items) ? data?.items : [];
      const normalizedItems = items.map((item: any) => {
        const basePrice = item.basePrice ?? item.base_price ?? 0;
        const price = getPrice(basePrice);
        const qty = item.qty ?? 1;
        return {
          ...item,
          itemNo: item.itemNo ?? item.item_no ?? null,
          basePrice,
          price,
          qty,
          totalPrice: price * qty
        };
      });

      const nextItems = applyAvailability(normalizedItems);

      setAllCarts((prev: any) => ({
        ...prev,
        [clientCode]: nextItems
      }));
    };

    loadCart();
  }, [isLoggedIn, clientCode]);

  useEffect(() => {
    if (!clientCode) return;
    setAllCarts((prev: any) => {
      const currentItems = prev[clientCode];
      if (!Array.isArray(currentItems) || currentItems.length === 0) return prev;
      const nextItems = applyAvailability(currentItems);
      return {
        ...prev,
        [clientCode]: nextItems
      };
    });
  }, [products, clientCode]);

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

  const currentClientName = clients[clientCode]?.name || clientCode || '';
  const filteredOrders = currentClientName
    ? orderHistory.filter((o) => o.client === currentClientName)
    : [];


  const availableCategories = Array.from(
    new Set(
      products
        .map((p) => (typeof p.category === 'string' ? p.category.trim() : null))
        .filter(Boolean)
    )
  ).sort((a: any, b: any) => String(a).localeCompare(String(b), 'lt-LT'));

  const filteredProducts = (selectedCategory
    ? products.filter((p) => p.category === selectedCategory)
    : products
  ).slice().sort((a, b) => String(a.name).localeCompare(String(b.name), 'lt-LT'));

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
      const nextItems = applyAvailability(newItems);
      syncCartToDb(nextItems);
      return { ...prev, [clientCode]: nextItems };
    });
  };

  const updateQty = (productId: number, newQty: number) => {
    const normalizedQty = Math.floor(newQty);
    if (!Number.isFinite(normalizedQty) || normalizedQty < 1) return;
    const price = getPrice(products.find(p => p.id === productId)?.basePrice || 0);
    setAllCarts((prev: any) => {
      const nextItems = (prev[clientCode] || []).map((item: any) => {
        if (item.id !== productId) return item;
        if (item.unavailable) return item;
        return { ...item, qty: normalizedQty, totalPrice: price * normalizedQty };
      });
      const withAvailability = applyAvailability(nextItems);
      syncCartToDb(withAvailability);
      return {
        ...prev,
        [clientCode]: withAvailability
      };
    });
  };

  const removeItem = (productId: number) => {
    setAllCarts((prev: any) => {
      const nextItems = (prev[clientCode] || []).filter((item: any) => item.id !== productId);
      if (nextItems.length === 0) {
        setIsCartVisible(false);
      }
      const withAvailability = applyAvailability(nextItems);
      syncCartToDb(withAvailability);
      return {
        ...prev,
        [clientCode]: withAvailability
      };
    });
  };

  const clearCart = () => {
    setAllCarts((prev: any) => ({ ...prev, [clientCode]: [] }));
    setSelectedDeliveryAddress(null);
    setIsCartVisible(false);
    syncCartToDb([]);
  };

  const handleEditOrder = async (order: any) => {
    const confirmEdit = window.confirm(
      'Ar tikrai norite koreguoti užsakymą? Dabartinis užsakymas bus atšauktas ir prekės grįš į krepšelį.'
    );
    if (!confirmEdit) return;

    const userId = await getUserId();
    if (!userId) {
      alert('Nepavyko nustatyti vartotojo. Prisijunkite iš naujo.');
      return;
    }

    const { data: cartRow, error: cartError } = await supabase
      .from('cart_items')
      .select('items')
      .eq('user_id', userId)
      .maybeSingle();

    if (cartError) {
      console.error('Klaida kraunant krepšeli:', cartError.message);
      alert('Nepavyko užkrauti krepšelio. Bandykite dar kartą.');
      return;
    }

    const existingItems = Array.isArray(cartRow?.items) ? cartRow?.items : [];
    const normalizedExisting = existingItems.map((item: any) => {
      const basePrice = item.basePrice ?? item.base_price ?? item.price ?? 0;
      const price = getPrice(basePrice);
      const qty = item.qty ?? 1;
      return {
        ...item,
        itemNo: item.itemNo ?? item.item_no ?? null,
        basePrice,
        price,
        qty,
        totalPrice: price * qty
      };
    });

    const orderItems = Array.isArray(order?.items) ? order.items : [];
    const normalizedOrderItems = orderItems.map((item: any) => {
      const basePrice = item.basePrice ?? item.base_price ?? item.price ?? 0;
      const price = getPrice(basePrice);
      const qty = item.qty ?? 1;
      return {
        ...item,
        itemNo: item.itemNo ?? item.item_no ?? null,
        basePrice,
        price,
        qty,
        totalPrice: price * qty
      };
    });

    const merged = [...normalizedExisting];
    normalizedOrderItems.forEach((item: any) => {
      const itemNo = item.itemNo;
      const existingIdx = merged.findIndex((i: any) => i.itemNo && i.itemNo === itemNo);
      if (existingIdx > -1) {
        const nextQty = merged[existingIdx].qty + item.qty;
        merged[existingIdx] = {
          ...merged[existingIdx],
          qty: nextQty,
          price: item.price,
          basePrice: item.basePrice,
          totalPrice: nextQty * item.price
        };
      } else {
        merged.push(item);
      }
    });

    const mergedWithAvailability = applyAvailability(merged);

    const { error: upsertError } = await supabase
      .from('cart_items')
      .upsert({ user_id: userId, items: mergedWithAvailability }, { onConflict: 'user_id' });

    if (upsertError) {
      console.error('Klaida saugant krepšeli:', upsertError.message);
      alert('Nepavyko išsaugoti krepšelio. Bandykite dar kartą.');
      return;
    }

    const { error: deleteError } = await supabase
      .from('orders')
      .delete()
      .eq('id', order.id)
      .eq('user_id', userId);

    if (deleteError) {
      console.error('Klaida atšaukiant užsakymą:', deleteError.message);
      alert('Nepavyko atšaukti užsakymo. Bandykite dar kartą.');
      return;
    }

    const unavailableNames = mergedWithAvailability
      .filter((item: any) => item.unavailable)
      .map((item: any) => item.name)
      .filter(Boolean);
    if (unavailableNames.length > 0) {
      const uniqueNames = Array.from(new Set(unavailableNames));
      setCartNotice(`Kai kurių prekių nebeturime: ${uniqueNames.join(', ')}. Jos pažymėtos krepšelyje.`);
    }

    setAllCarts((prev: any) => ({
      ...prev,
      [clientCode]: mergedWithAvailability
    }));
    setOrderHistory((prev) => prev.filter((o: any) => o.id !== order.id));
    setView('katalogas');
    setIsCartVisible(true);
  };

  const handleCancelOrder = async (order: any) => {
    const userId = await getUserId();
    if (!userId) {
      alert('Nepavyko nustatyti vartotojo. Prisijunkite iš naujo.');
      return;
    }

    const { error } = await supabase
      .from('orders')
      .update({ status: 'Atšauktas' })
      .eq('id', order.id)
      .eq('user_id', userId);

    if (error) {
      console.error('Klaida atšaukiant užsakymą:', error.message);
      alert('Nepavyko atšaukti užsakymo. Bandykite dar kartą.');
      return;
    }

    setOrderHistory((prev) =>
      prev.map((o: any) => (o.id === order.id ? { ...o, status: 'Atšauktas' } : o))
    );
  };

  const submitOrder = async () => {
    const cartItems = allCarts[clientCode] || [];
    if (!cartItems || cartItems.length === 0) {
      alert('Krepšelis tuščias');
      return;
    }

    const availableItems = cartItems.filter((item: any) => !item.unavailable);
    if (availableItems.length === 0) {
      alert('Užsakymas negali būti pateiktas, nes visų prekių nebeturime. Pašalinkite jas iš krepšelio.');
      return;
    }

    if (deliveryAddresses.length === 0 || selectedDeliveryAddress === null) {
      alert('Prieš pateikiant užsakymą, pasirinkite pristatymo adresą');
      return;
    }

    const total = availableItems.reduce((s: number, i: any) => s + i.totalPrice, 0);
    const selectedAddress = deliveryAddresses[selectedDeliveryAddress];

    const userId = await getUserId();
    if (!userId) {
      console.error('Klaida gaunant vartotoją');
    }
    if (!userId) {
      alert('Nepavyko nustatyti vartotojo. Prisijunkite iš naujo.');
      return;
    }

    const managerEmail = typeof window !== 'undefined' ? localStorage.getItem('manager_email') : null;
    
    const payload = {
      user_id: userId,
      client_name: clients[clientCode]?.name || clientCode || 'unknown',
      order_items: availableItems,
      total_price: total,
      manager_email: managerEmail || companyData?.email || 'orders@flokati.lt',
      delivery_address: selectedAddress,
      status: 'Išsiustas',
      created_at: new Date().toISOString()
    };

    // Insert into Supabase 'orders' table
    try {
      console.log('📤 Siuntimas į Supabase:', payload);
      const { data, error } = await supabase.from('orders').insert(payload).select().single();
      if (error) {
        console.error('❌ Klaida įrašant užsakymą:', error);
        console.error('Error message:', error.message);
        console.error('Error details:', error.details);
        console.error('Error hint:', error.hint);
        alert(`Įvyko klaida siunčiant užsakymą:\n${error.message || 'Nežinoma klaida'}`);
        return;
      }

      const serverOrder = data || null;

      // Fetch all user's orders to calculate correct order number
      const { data: allOrders } = await supabase
        .from('orders')
        .select('id')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });
      
      const nextOrderNumber = allOrders ? allOrders.length : 1;

      const newOrder = {
        id: serverOrder?.id ?? Math.floor(Math.random() * 100000),
        order_number: nextOrderNumber,
        date: new Date().toLocaleString('lt-LT'),
        client: payload.client_name,
        items: [...availableItems],
        total: total,
        delivery_address: selectedAddress,
        status: payload.status,
        manager_email: payload.manager_email
      };

      const remainingItems = applyAvailability(cartItems.filter((item: any) => item.unavailable));
      const { error: clearError } = await supabase
        .from('cart_items')
        .update({ items: remainingItems })
        .eq('user_id', userId);

      if (clearError) {
        console.error('Klaida atnaujinant krepšelį:', clearError.message);
        alert('Užsakymas sukurtas, bet nepavyko atnaujinti krepšelio. Bandykite vėliau.');
        return;
      }

      setOrderHistory([newOrder, ...orderHistory]);
      setAllCarts((prev: any) => ({
        ...prev,
        [clientCode]: remainingItems
      }));
      if (remainingItems.length === 0) {
        setIsCartVisible(false);
        setSelectedDeliveryAddress(null);
        setCartNotice(null);
      } else {
        setCartNotice('Kai kurių prekių nebeturime. Jos pažymėtos krepšelyje.');
      }
      alert(`Užsakymas išsiuštas ${payload.manager_email}!\nSuma: ${total.toFixed(2)} €`);
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
    
    if (order.delivery_address) {
      yPosition += 7;
      pdf.setFontSize(10);
      pdf.text(`Pristatymo adresas:`, 20, yPosition);
      yPosition += 5;
      pdf.setFontSize(9);
      const addr = order.delivery_address;
      pdf.text(`${addr.name}`, 25, yPosition);
      yPosition += 5;
      pdf.text(`${addr.address}, ${addr.city} ${addr.postalCode}`, 25, yPosition);
      if (addr.phone) {
        yPosition += 5;
        pdf.text(`Tel: ${addr.phone}`, 25, yPosition);
      }
    }
    
    yPosition += 10;
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
      const itemLabel = item.size ? `${item.name} (${item.size})` : item.name;
      pdf.text(itemLabel.substring(0, 45), 20, yPosition);
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
  const getBaseLineTotal = (item: any) => {
    const basePrice = Number.isFinite(item.basePrice)
      ? item.basePrice
      : (Number.isFinite(item.price) ? item.price : 0);
    return basePrice * item.qty;
  };
  const currentBaseTotal = currentCart.reduce((s: number, i: any) => s + getBaseLineTotal(i), 0);
  const currentTotal = currentCart.reduce((s: number, i: any) => s + i.totalPrice, 0);
  const cartItemCount = currentCart.reduce((s: number, i: any) => s + i.qty, 0);

  useEffect(() => {
    if (!cartNotice) return;
    const hasUnavailable = currentCart.some((item: any) => item.unavailable);
    if (!hasUnavailable) {
      setCartNotice(null);
    }
  }, [cartNotice, currentCart]);

  // Redirect to login page if not authenticated
  if (!isLoggedIn) {
    return (
      <div
        className="min-h-screen px-4 py-12 flex items-center justify-center relative overflow-hidden"
        style={{
          backgroundImage: `url(${loginBackgrounds[loginBgIndex]})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        <div className="absolute inset-0 bg-white/0" />
        <div className="relative w-full max-w-5xl grid gap-8 lg:grid-cols-[1.1fr_0.9fr] items-center">
          <div className="hidden lg:block">
            <h1 className="mt-6 text-4xl font-semibold leading-tight text-white">
              Premium tekstile verslui.
              <span className="block text-white/80">Užsakymai be triukšmo.</span>
            </h1>
          </div>

          <form 
            key={isLoggedIn ? 'logged-in' : 'logged-out'}
            onSubmit={async (e: any) => {
            e.preventDefault();
            const email = formEmail;
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
                .select("*")
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
              const companyCode = profile?.company_code || null;
              const phone = profile?.phone || null;
              const companyEmail = profile?.email || null;
              const registrationAddress = profile?.registration_address || null;
              const contactPerson = profile?.contact_person || null;
              const deliveryAddresses = profile?.delivery_addresses || [];
              const clientCode = discountGroup || clientName || "";

              // Save to localStorage
              localStorage.setItem('isLoggedIn', 'true');
              if (clientCode) localStorage.setItem('clientCode', clientCode);
              if (clientName) localStorage.setItem('client_name', clientName);
              if (discountGroup) localStorage.setItem('discount_group', discountGroup);
              else localStorage.removeItem('discount_group');
              if (managerEmail) localStorage.setItem('manager_email', managerEmail);
              if (companyCode) localStorage.setItem('company_code', companyCode);
              if (phone) localStorage.setItem('phone', phone);
              if (companyEmail) localStorage.setItem('email', companyEmail);
              if (registrationAddress) localStorage.setItem('registration_address', registrationAddress);
              if (contactPerson) localStorage.setItem('contact_person', contactPerson);
              localStorage.setItem('delivery_addresses', JSON.stringify(deliveryAddresses));

              // Update state
              setClientCode(clientCode);
              setIsLoggedIn(true);
              setIsCartVisible(false);
              setView("katalogas");
              
              // Populate clients object
              const discount = parseDiscountGroup(discountGroup);
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
            className="w-full max-w-md bg-[var(--surface)] rounded-3xl p-8 shadow-[var(--shadow-strong)] border border-black/5"
          >
            <div className="mb-8">
              <div className="text-xs uppercase tracking-[0.35em] text-[var(--ink-soft)]">FLOKATI</div>
              <div className="text-3xl font-semibold text-[var(--foreground)] mt-2">B2B Prisijungimas</div>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-[var(--ink-soft)] mb-2">El. paštas</label>
                <input 
                  name="email"
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="" 
                  className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]"
                  autoComplete="off"
                  required 
                />
              </div>
              <div className="relative">
                <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-[var(--ink-soft)] mb-2">Slaptažodis</label>
                <input 
                  name="password"
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  type={showPassword ? "text" : "password"}
                  placeholder="" 
                  className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)] pr-10"
                  autoComplete="new-password"
                  required 
                />
                {formPassword.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-[38px] text-[var(--ink-soft)] hover:text-[var(--foreground)]"
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
              <button className="w-full bg-[var(--foreground)] text-white py-3 rounded-2xl font-semibold uppercase tracking-[0.2em] transition-all hover:opacity-90">
                PRISIJUNGTI
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-[#2d3427] font-sans">
      {/* Modal Langas */}
      {modalData && (
        <ImageModal 
          images={modalData.images} 
          startIndex={modalData.index} 
          onClose={() => setModalData(null)} 
        />
      )}

      <div className="max-w-[1800px] mx-auto px-4 lg:px-6 py-6">
        <div className="grid gap-10 lg:gap-x-10 lg:gap-y-10 lg:grid-cols-[240px_1fr_auto] items-start">
          <aside className="order-1 lg:order-none bg-transparent p-3 sticky top-6">
            <div className="mb-6">
              <div className="text-[10px] uppercase tracking-[0.35em] text-[var(--ink-soft)]">FLOKATI</div>
              <div className="text-lg font-semibold">B2B Portalas</div>
            </div>
            <nav className="space-y-2">
              <button
                onClick={() => setView("katalogas")}
                className={`w-full text-left px-4 py-3 rounded-xl text-sm font-semibold transition flex items-center gap-3 ${view === 'katalogas' ? 'bg-[#e2e8d4] text-[#2d3427]' : 'text-[#2d3427] hover:bg-[#f2f5e8]'}`}
              >
                <LayoutGrid className="h-4 w-4" />
                Katalogas
              </button>
              <button
                onClick={() => setView("uzsakymai")}
                className={`w-full text-left px-4 py-3 rounded-xl text-sm font-semibold transition flex items-center gap-3 ${view === 'uzsakymai' ? 'bg-[#e2e8d4] text-[#2d3427]' : 'text-[#2d3427] hover:bg-[#f2f5e8]'}`}
              >
                <ClipboardList className="h-4 w-4" />
                Užsakymai
              </button>
              <button
                onClick={() => setView("mano-duomenis")}
                className={`w-full text-left px-4 py-3 rounded-xl text-sm font-semibold transition flex items-center gap-3 ${view === 'mano-duomenis' ? 'bg-[#e2e8d4] text-[#2d3427]' : 'text-[#2d3427] hover:bg-[#f2f5e8]'}`}
              >
                <User className="h-4 w-4" />
                Mano duomenys
              </button>
            </nav>
          </aside>

          <main className="order-2 lg:order-none">
            {view === "mano-duomenis" ? (
              <div className="bg-white p-8 rounded-[2rem]">
            <h2 className="text-2xl font-extralight mb-8">Mano duomenys</h2>
            
            {/* Įmonės duomenys */}
            <div className="mb-10 pb-8 border-b border-[#d6ddc7]">
              <h3 className="text-xl font-semibold mb-6 text-[var(--foreground)] flex items-center justify-between">
                Įmonės informacija
                {!editingCompany && companyData.name && (
                  <button 
                    onClick={() => {
                      setEditCompanyData(companyData);
                      setEditingCompany(true);
                    }}
                    className="text-sm bg-[#e2e8d4] text-[#2d3427] px-3 py-1 rounded-2xl hover:opacity-80 transition"
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
                      <label className="block text-sm font-semibold mb-2 text-[#2d3427]">Įmonės pavadinimas</label>
                      <input 
                        type="text" 
                        value={editCompanyData.name} 
                        onChange={(e) => setEditCompanyData({...editCompanyData, name: e.target.value})}
                        className="w-full border border-black/10 rounded-2xl p-3 text-[#2d3427] focus:ring-2 focus:ring-[var(--accent)] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2 text-[#2d3427]">Įmonės kodas</label>
                      <input 
                        type="text" 
                        value={editCompanyData.code} 
                        onChange={(e) => setEditCompanyData({...editCompanyData, code: e.target.value})}
                            className="w-full border border-black/10 rounded-2xl p-3 text-[#2d3427] focus:ring-2 focus:ring-[var(--accent)] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2 text-[#2d3427]">Kontaktinis asmuo</label>
                      <input 
                        type="text" 
                        value={editCompanyData.contactPerson} 
                        onChange={(e) => setEditCompanyData({...editCompanyData, contactPerson: e.target.value})}
                        className="w-full border border-black/10 rounded-2xl p-3 text-[#2d3427] focus:ring-2 focus:ring-[var(--accent)] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2 text-[#2d3427]">Telefonas</label>
                      <input 
                        type="tel" 
                        value={editCompanyData.phone} 
                        onChange={(e) => setEditCompanyData({...editCompanyData, phone: e.target.value})}
                                className="w-full border border-black/10 rounded-2xl p-3 text-[#2d3427] focus:ring-2 focus:ring-[var(--accent)] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2 text-[#2d3427]">El. paštas</label>
                      <input 
                        type="email" 
                        value={editCompanyData.email} 
                        onChange={(e) => setEditCompanyData({...editCompanyData, email: e.target.value})}
                            className="w-full border border-black/10 rounded-2xl p-3 text-[#2d3427] focus:ring-2 focus:ring-[var(--accent)] outline-none"                        
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold mb-2 text-[#2d3427]">Įmonės registracijos adresas</label>
                      <input 
                        type="text" 
                        value={editCompanyData.address} 
                        onChange={(e) => setEditCompanyData({...editCompanyData, address: e.target.value})}
                            className="w-full border border-black/10 rounded-2xl p-3 text-[#2d3427] focus:ring-2 focus:ring-[var(--accent)] outline-none"                       
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={async () => {
                        try {
                          const { data: { user } } = await supabase.auth.getUser();
                          if (!user) {
                            alert('Vartotojas nerastas');
                            return;
                          }
                          
                          console.log('🔄 Updating company data for user:', user.id);
                          console.log('📝 Data to update:', {
                            client_name: editCompanyData.name,
                            company_code: editCompanyData.code,
                            contact_person: editCompanyData.contactPerson,
                            phone: editCompanyData.phone,
                            email: editCompanyData.email,
                            registration_address: editCompanyData.address
                          });
                          
                          const { data, error } = await supabase
                            .from('customers')
                            .update({
                              client_name: editCompanyData.name,
                              company_code: editCompanyData.code,
                              contact_person: editCompanyData.contactPerson,
                              phone: editCompanyData.phone,
                              email: editCompanyData.email,
                              registration_address: editCompanyData.address
                            })
                            .eq('id', user.id)
                            .select();
                          
                          console.log('✅ Update response:', { data, error });
                          
                          if (error) {
                            console.error('❌ Klaida išsaugant:', error);
                            alert(`Klaida išsaugant duomenis: ${error.message}`);
                            return;
                          }
                          
                          // Update localStorage
                          localStorage.setItem('client_name', editCompanyData.name);
                          localStorage.setItem('company_code', editCompanyData.code);
                          localStorage.setItem('contact_person', editCompanyData.contactPerson);
                          localStorage.setItem('phone', editCompanyData.phone);
                          localStorage.setItem('email', editCompanyData.email);
                          localStorage.setItem('registration_address', editCompanyData.address);
                          
                          setCompanyData(editCompanyData);
                          setEditingCompany(false);
                          alert("Įmonės duomenys išsaugoti!");
                        } catch (e) {
                          console.error('Save error:', e);
                          alert('Klaida išsaugant duomenis');
                        }
                      }}
                      className="flex-1 bg-[#2d3427] text-white px-6 py-3 rounded-2xl font-semibold hover:opacity-90 transition"
                    >
                      ✓ Išsaugoti
                    </button>
                    <button 
                      onClick={() => {
                        setEditCompanyData(companyData);
                        setEditingCompany(false);
                      }}
                      className="flex-1 bg-[#e2e8d4] text-[#2d3427] px-6 py-3 rounded-2xl font-semibold hover:bg-[#cfd8c0] transition"
                    >
                      ✕ Atšaukti
                    </button>
                  </div>
                </>
              ) : companyData.name ? (
                // Peržiūros režimas su duomenimis
                <div className="bg-[#e2e8d4] p-6 rounded-[2rem]">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-1">Įmonės pavadinimas</p>
                      <p className="text-lg text-[#2d3427] font-semibold">{companyData.name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-1">Įmonės kodas</p>
                      <p className="text-lg text-[#2d3427] font-semibold">{companyData.code || "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-1">Kontaktinis asmuo</p>
                      <p className="text-lg text-[#2d3427] font-semibold">{companyData.contactPerson || "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-1">Telefonas</p>
                      <p className="text-lg text-[#2d3427] font-semibold">{companyData.phone || "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-1">El. paštas</p>
                      <p className="text-lg text-[#2d3427] font-semibold">{companyData.email || "—"}</p>
                    </div>
                    <div className="md:col-span-2">
                      <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-1">Įmonės registracijos adresas</p>
                      <p className="text-lg text-[#2d3427] font-semibold">{companyData.address || "—"}</p>
                    </div>
                  </div>
                </div>
              ) : (
                // Forma kai nėra duomenų
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <label className="block text-sm font-semibold mb-2 text-[#2d3427]">Įmonės pavadinimas</label>
                      <input 
                        type="text" 
                        value={editCompanyData.name} 
                        onChange={(e) => setEditCompanyData({...editCompanyData, name: e.target.value})}
                        className="w-full border border-black/10 rounded-2xl p-3 text-[#2d3427] focus:ring-2 focus:ring-[var(--accent)] outline-none"
                        placeholder="pvz. UAB Flokati"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2 text-[#2d3427]">Įmonės kodas</label>
                      <input 
                        type="text" 
                        value={editCompanyData.code} 
                        onChange={(e) => setEditCompanyData({...editCompanyData, code: e.target.value})}
                        className="w-full border border-black/10 rounded-2xl p-3 text-[#2d3427] focus:ring-2 focus:ring-[var(--accent)] outline-none"
                        placeholder="pvz. 305522547"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2 text-[#2d3427]">Telefonas</label>
                      <input 
                        type="tel" 
                        value={editCompanyData.phone} 
                        onChange={(e) => setEditCompanyData({...editCompanyData, phone: e.target.value})}
                        className="w-full border border-black/10 rounded-2xl p-3 text-[#2d3427] focus:ring-2 focus:ring-[var(--accent)] outline-none"
                        placeholder="pvz. +370 600 12345"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2 text-[#2d3427]">El. paštas</label>
                      <input 
                        type="email" 
                        value={editCompanyData.email} 
                        onChange={(e) => setEditCompanyData({...editCompanyData, email: e.target.value})}
                        className="w-full border border-black/10 rounded-2xl p-3 text-[#2d3427] focus:ring-2 focus:ring-[var(--accent)] outline-none"
                        placeholder="pvz. info@flokati.lt"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold mb-2 text-[#2d3427]">Pagrindinės sėdybos adresas</label>
                      <input 
                        type="text" 
                        value={editCompanyData.address} 
                        onChange={(e) => setEditCompanyData({...editCompanyData, address: e.target.value})}
                        className="w-full border border-black/10 rounded-2xl p-3 text-[#2d3427] focus:ring-2 focus:ring-[var(--accent)] outline-none"
                        placeholder="pvz. Kalnu g. 5, Vilnius"
                      />
                    </div>
                  </div>
                  <button 
                    onClick={async () => {
                      try {
                        const { data: { user } } = await supabase.auth.getUser();
                        if (!user) {
                          alert('Vartotojas nerastas');
                          return;
                        }
                        
                        console.log('🔄 Updating company data (initial save) for user:', user.id);
                        console.log('📝 Data to update:', {
                          client_name: editCompanyData.name,
                          company_code: editCompanyData.code,
                          contact_person: editCompanyData.contactPerson,
                          phone: editCompanyData.phone,
                          email: editCompanyData.email,
                          registration_address: editCompanyData.address
                        });
                        
                        const { data, error } = await supabase
                          .from('customers')
                          .update({
                            client_name: editCompanyData.name,
                            company_code: editCompanyData.code,
                            contact_person: editCompanyData.contactPerson,
                            phone: editCompanyData.phone,
                            email: editCompanyData.email,
                            registration_address: editCompanyData.address
                          })
                          .eq('id', user.id)
                          .select();
                        
                        console.log('✅ Update response:', { data, error });
                        
                        if (error) {
                          console.error('❌ Klaida išsaugant:', error);
                          alert(`Klaida išsaugant duomenis: ${error.message}`);
                          return;
                        }
                        
                        // Update localStorage
                        localStorage.setItem('client_name', editCompanyData.name);
                        localStorage.setItem('company_code', editCompanyData.code);
                        localStorage.setItem('contact_person', editCompanyData.contactPerson);
                        localStorage.setItem('phone', editCompanyData.phone);
                        localStorage.setItem('email', editCompanyData.email);
                        localStorage.setItem('registration_address', editCompanyData.address);
                        
                        setCompanyData(editCompanyData);
                        setEditingCompany(false);
                        alert("Įmonės duomenys išsaugoti!");
                      } catch (e) {
                        console.error('Save error:', e);
                        alert('Klaida išsaugant duomenis');
                      }
                    }}
                    className="w-full bg-[#2d3427] text-white px-6 py-3 rounded-2xl font-semibold hover:opacity-90 transition"
                  >
                    Išsaugoti
                  </button>
                </>
              )}
            </div>

            {/* Pristatymo adresai */}
            <div>
              <h3 className="text-xl font-semibold mb-6 text-[var(--foreground)]">Pristatymo adresai</h3>
              
              {/* Esamų adresų sąrašas */}
              {deliveryAddresses.length > 0 && (
                <div className="mb-8 space-y-3">
                  {deliveryAddresses.map((addr, idx) => (
                    <div key={addr.id || idx} className="bg-[#e2e8d4] p-4 rounded-[2rem]">
                      {editingAddressIdx === idx ? (
                        // Redagavimo režimas
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-semibold mb-2 text-[#2d3427]">Įmonės pavadinimas</label>
                              <input
                                type="text" 
                                value={addr.name} 
                                onChange={(e) => {
                                  const updated = [...deliveryAddresses];
                                  updated[idx].name = e.target.value;
                                  setDeliveryAddresses(updated);
                                }}
                                className="w-full border border-black/10 rounded-2xl p-3 text-[#2d3427] focus:ring-2 focus:ring-[var(--accent)] outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold mb-2 text-[#2d3427]">Adresas</label>
                              <input 
                                type="text" 
                                value={addr.address} 
                                onChange={(e) => {
                                  const updated = [...deliveryAddresses];
                                  updated[idx].address = e.target.value;
                                  setDeliveryAddresses(updated);
                                }}
                                className="w-full border border-black/10 rounded-2xl p-3 text-[#2d3427] focus:ring-2 focus:ring-[var(--accent)] outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold mb-2 text-[#2d3427]">Miestas</label>
                              <input 
                                type="text" 
                                value={addr.city} 
                                onChange={(e) => {
                                  const updated = [...deliveryAddresses];
                                  updated[idx].city = e.target.value;
                                  setDeliveryAddresses(updated);
                                }}
                                className="w-full border border-black/10 rounded-2xl p-3 text-[#2d3427] focus:ring-2 focus:ring-[var(--accent)] outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold mb-2 text-[#2d3427]">Pašto kodas</label>
                              <input 
                                type="text" 
                                value={addr.postalCode} 
                                onChange={(e) => {
                                  const updated = [...deliveryAddresses];
                                  updated[idx].postalCode = e.target.value;
                                  setDeliveryAddresses(updated);
                                }}
                                className="w-full border border-black/10 rounded-2xl p-3 text-[#2d3427] focus:ring-2 focus:ring-[var(--accent)] outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold mb-2 text-[#2d3427]">Telefonas</label>
                              <input 
                                type="tel" 
                                value={addr.phone} 
                                onChange={(e) => {
                                  const updated = [...deliveryAddresses];
                                  updated[idx].phone = e.target.value;
                                  setDeliveryAddresses(updated);
                                }}
                                className="w-full border border-black/10 rounded-2xl p-3 text-[#2d3427] focus:ring-2 focus:ring-[var(--accent)] outline-none"
                              />
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button 
                              onClick={async () => {
                                try {
                                  const { data: { user } } = await supabase.auth.getUser();
                                  if (!user) {
                                    alert('Vartotojas nerastas');
                                    return;
                                  }
                                  
                                  console.log('🔄 Updating delivery addresses for user:', user.id);
                                  console.log('📦 Addresses:', deliveryAddresses);
                                  
                                  const { data, error } = await supabase
                                    .from('customers')
                                    .update({ delivery_addresses: deliveryAddresses })
                                    .eq('id', user.id)
                                    .select();
                                  
                                  console.log('✅ Update response:', { data, error });
                                  
                                  if (error) {
                                    console.error('❌ Klaida išsaugant adresą:', error);
                                    alert(`Klaida išsaugant adresą: ${error.message}`);
                                    return;
                                  }
                                  
                                  localStorage.setItem('delivery_addresses', JSON.stringify(deliveryAddresses));
                                  setEditingAddressIdx(null);
                                  alert("Adresas atnaujintas!");
                                } catch (e) {
                                  console.error('Save address error:', e);
                                  alert('Klaida išsaugant adresą');
                                }
                              }}
                              className="flex-1 bg-[#2d3427] text-white px-4 py-2 rounded-2xl font-semibold hover:opacity-90 transition"
                            >
                              ✓ Išsaugoti
                            </button>
                            <button 
                              onClick={() => setEditingAddressIdx(null)}
                              className="flex-1 bg-[#e2e8d4] text-[#2d3427] px-4 py-2 rounded-2xl font-semibold hover:bg-[#cfd8c0] transition"
                            >
                              ✕ Atšaukti
                            </button>
                          </div>
                        </div>
                      ) : (
                        // Peržiūros režimas
                        <div className="flex justify-between items-start">
                          <div className="flex-1 cursor-pointer hover:text-[#2d3427]" onClick={() => setEditingAddressIdx(idx)}>
                            <h4 className="font-semibold text-[#2d3427] mb-1">{addr.name}</h4>
                            <p className="text-sm text-[#2d3427] opacity-70">{addr.address}</p>
                            <p className="text-sm text-[#2d3427] opacity-70">{addr.city}, {addr.postalCode}</p>
                            {addr.phone && <p className="text-sm text-[#2d3427] opacity-70 mt-1">📞 {addr.phone}</p>}
                            <p className="text-xs text-[#2d3427] mt-2">Spustelekite redaguoti</p>
                          </div>
                          <button 
                            onClick={async () => {
                              const updated = deliveryAddresses.filter((_, i) => i !== idx);
                              try {
                                const { data: { user } } = await supabase.auth.getUser();
                                if (user) {
                                  console.log('🗑️ Deleting address for user:', user.id);
                                  const { error } = await supabase
                                    .from('customers')
                                    .update({ delivery_addresses: updated })
                                    .eq('id', user.id);
                                  if (error) {
                                    console.error('❌ Delete error:', error);
                                    alert(`Klaida trinant adresą: ${error.message}`);
                                    return;
                                  }
                                }
                                localStorage.setItem('delivery_addresses', JSON.stringify(updated));
                                setDeliveryAddresses(updated);
                              } catch (e) {
                                console.error('Delete address error:', e);
                                setDeliveryAddresses(updated);
                              }
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
                  className="w-full bg-[#2d3427] text-white px-6 py-3 rounded-2xl font-semibold hover:opacity-90 transition mb-6"
                >
                  Pridėti naują adresą
                </button>
              )}

              {/* Naujo adreso forma */}
              {showAddressForm && (
                <div className="bg-[#e2e8d4] p-6 rounded-[2rem]">
                  <h4 className="font-semibold text-[#2d3427] mb-4">Pridėti naują adresą</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-[#2d3427]">Įmonės pavadinimas</label>
                    <input 
                      type="text" 
                      value={newAddress.name} 
                      onChange={(e) => setNewAddress({...newAddress, name: e.target.value})}
                      className="w-full border border-black/10 rounded-2xl p-3 text-[#2d3427] focus:ring-2 focus:ring-[var(--accent)] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-[#2d3427]">Adresas</label>
                    <input 
                      type="text" 
                      value={newAddress.address} 
                      onChange={(e) => setNewAddress({...newAddress, address: e.target.value})}
                      className="w-full border border-black/10 rounded-2xl p-3 text-[#2d3427] focus:ring-2 focus:ring-[var(--accent)] outline-none"

                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-[#2d3427]">Miestas</label>
                    <input 
                      type="text" 
                      value={newAddress.city} 
                      onChange={(e) => setNewAddress({...newAddress, city: e.target.value})}
                      className="w-full border border-black/10 rounded-2xl p-3 text-[#2d3427] focus:ring-2 focus:ring-[var(--accent)] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-[#2d3427]">Pašto kodas</label>
                    <input 
                      type="text" 
                      value={newAddress.postalCode} 
                      onChange={(e) => setNewAddress({...newAddress, postalCode: e.target.value})}
                      className="w-full border border-black/10 rounded-2xl p-3 text-[#2d3427] focus:ring-2 focus:ring-[var(--accent)] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-[#2d3427]">Telefonas</label>
                    <input 
                      type="tel" 
                      value={newAddress.phone} 
                      onChange={(e) => setNewAddress({...newAddress, phone: e.target.value})}
                      className="w-full border border-black/10 rounded-2xl p-3 text-[#2d3427] focus:ring-2 focus:ring-[var(--accent)] outline-none"
                    />
                  </div>
                </div>
                <button 
                  onClick={async () => {
                    if (newAddress.name && newAddress.address && newAddress.city && newAddress.postalCode) {
                      try {
                        const updatedAddress = { ...newAddress, id: Date.now().toString() };
                        const updated = [...deliveryAddresses, updatedAddress];
                        
                        const { data: { user } } = await supabase.auth.getUser();
                        if (!user) {
                          alert('Vartotojas nerastas');
                          return;
                        }
                        
                        console.log('➕ Adding new address for user:', user.id);
                        console.log('📦 New address:', updatedAddress);
                        
                        const { data, error } = await supabase
                          .from('customers')
                          .update({ delivery_addresses: updated })
                          .eq('id', user.id)
                          .select();
                        
                        console.log('✅ Add response:', { data, error });
                        
                        if (error) {
                          console.error('❌ Klaida pridedant adresą:', error);
                          alert(`Klaida pridedant adresą: ${error.message}`);
                          return;
                        }
                        
                        localStorage.setItem('delivery_addresses', JSON.stringify(updated));
                        setDeliveryAddresses(updated);
                        setNewAddress({ id: "", name: "", address: "", city: "", postalCode: "", phone: "" });
                        setShowAddressForm(false);
                        alert("Adresas pridėtas!");
                      } catch (e) {
                        console.error('Add address error:', e);
                        alert('Klaida pridedant adresą');
                      }
                    } else {
                      alert("Prašome užpildyti visus laukus!");
                    }
                  }}
                  className="mt-4 w-full bg-[#2d3427] text-white px-6 py-3 rounded-2xl font-semibold hover:opacity-90 transition"
                >
                  Pridėti adresą
                </button>
                <button 
                  onClick={() => {
                    setShowAddressForm(false);
                    setNewAddress({ id: "", name: "", address: "", city: "", postalCode: "", phone: "" });
                  }}
                  className="mt-2 w-full bg-[#e2e8d4] text-[#2d3427] px-6 py-3 rounded-2xl font-semibold hover:bg-[#cfd8c0] transition"
                >
                  ✕ Atšaukti
                </button>
              </div>
              )}
            </div>
          </div>
        ) : view === "uzsakymai" ? (
          <div className="bg-white p-8 rounded-[2rem]">
            <h2 className="text-2xl font-semibold mb-6">Užsakymų istorija</h2>
            {filteredOrders.sort((a, b) => b.order_number - a.order_number).length === 0 ? (
              <p className="text-[#2d3427]/60 italic text-center py-10">Istorija tuščia.</p>
            ) : (
              <div className="space-y-6">
                {filteredOrders.sort((a, b) => b.order_number - a.order_number).map(order => (
                  <div key={order.id} className="rounded-[2rem] p-6 bg-[#e2e8d4]">
                    <div className="flex justify-between mb-4 border-b border-[#d6ddc7] pb-2 items-center">
                      <div className="flex-1">
                        <span className="font-bold">Užsakymas #{order.order_number}</span>
                        <span className="text-[#2d3427]/70 text-sm ml-4">{order.date}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-xs font-semibold px-3 py-1 rounded-full ${order.status === 'Išsiustas' ? 'bg-[#f2f5e8] text-[#2d3427]' : order.status === 'Išsiųsta' ? 'bg-[#f2f5e8] text-[#2d3427]' : order.status === 'Įvykdytas' ? 'bg-white text-[#2d3427]' : order.status === 'Atšauktas' ? 'bg-white text-[#2d3427]' : 'bg-white text-[#2d3427]'}`}>
                          {order.status || 'Nežinomas'}
                        </span>
                        {order.status === 'Išsiustas' && (
                          <button
                            onClick={() => handleCancelOrder(order)}
                            className="bg-white border border-black/10 text-red-600 px-4 py-2 rounded-2xl font-semibold hover:bg-[#f2f5e8] transition text-sm whitespace-nowrap"
                          >
                            Atšaukti
                          </button>
                        )}
                        {(order.status === 'Išsiustas' || order.status === 'Atšauktas') && (
                          <button
                            onClick={() => handleEditOrder(order)}
                            className="bg-white border border-black/10 text-[#2d3427] px-4 py-2 rounded-2xl font-semibold hover:bg-[#f2f5e8] transition text-sm whitespace-nowrap"
                          >
                            Koreguoti
                          </button>
                        )}
                        <button 
                          onClick={() => exportOrderToPDF(order)}
                          className="bg-[#2d3427] text-white px-4 py-2 rounded-2xl font-semibold hover:opacity-90 transition text-sm whitespace-nowrap"
                        >
                          📥 PDF
                        </button>
                      </div>
                    </div>
                    {order.items.map((it: any, idx: number) => (
                      <div key={idx} className="text-sm flex justify-between py-1">
                        <span>{it.name}{it.size ? ` (${it.size})` : ''} ({it.qty} vnt.)</span>
                        <span>{it.totalPrice.toFixed(2)} €</span>
                      </div>
                    ))}
                    <div className="text-right mt-4 font-black text-lg text-[#166534]">VISO: {order.total.toFixed(2)} €</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white p-6 rounded-[2rem]">
            <div className="mb-6">
              <h2 className="text-2xl font-semibold mb-3">Katalogas</h2>
              <div className="flex gap-5 flex-wrap text-sm">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={`font-medium transition ${!selectedCategory ? 'text-[#2d3427] underline' : 'text-[#2d3427]/70 hover:text-[#2d3427]'}`}
                >
                  Visos prekės
                </button>
                {availableCategories.map((category: string) => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`font-medium transition ${selectedCategory === category ? 'text-[#2d3427] underline' : 'text-[#2d3427]/70 hover:text-[#2d3427]'}`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>
            {isProductsLoading ? (
              <div className="py-8">
                <div className="grid gap-4 justify-items-start" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 280px))', justifyContent: 'start' }}>
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="bg-white p-3 rounded-[2rem] animate-pulse">
                      <div className="w-full aspect-[4/3] bg-[#e2e8d4] rounded-[2rem] mb-3"></div>
                      <div className="h-5 bg-[#e2e8d4] rounded-2xl mb-2 w-3/4"></div>
                      <div className="h-5 bg-[#e2e8d4] rounded-2xl mb-4 w-1/2"></div>
                      <div className="flex justify-between items-end mt-auto">
                        <div className="space-y-2">
                          <div className="h-3 bg-[#e2e8d4] rounded-2xl w-16"></div>
                          <div className="h-6 bg-[#e2e8d4] rounded-2xl w-20"></div>
                        </div>
                        <div className="h-10 w-24 bg-[#e2e8d4] rounded-2xl"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="grid gap-4 justify-items-start" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 280px))', justifyContent: 'start' }}>
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
            )}
          </div>
        )}
          </main>

          <aside className="order-3 lg:order-none relative lg:justify-self-end">
            <div className="sticky top-6 space-y-3">
              <div className="flex flex-col items-end gap-3">
                <button
                  onClick={() => {
                    setIsLoggedIn(false);
                    setClientCode('');
                    setFormEmail('');
                    setFormPassword('');
                    setShowPassword(false);
                    localStorage.removeItem('isLoggedIn');
                    localStorage.removeItem('clientCode');
                    localStorage.removeItem('client_name');
                    localStorage.removeItem('discount_group');
                    localStorage.removeItem('manager_email');
                    localStorage.removeItem('currentView');
                  }}
                  className="text-xs font-semibold text-[#2d3427] hover:text-[#2d3427] hover:bg-[#e2e8d4] rounded-xl px-2 py-1 transition flex items-center gap-2"
                  aria-label="Atsijungti"
                >
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full border border-[#2d3427]">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      <path d="M16 17l5-5-5-5" />
                      <path d="M21 12H9" />
                    </svg>
                  </span>
                  Atsijungti
                </button>
                <button
                  onClick={() => {
                    if (cartItemCount > 0 || isCartVisible) {
                      setIsCartVisible(!isCartVisible);
                    }
                  }}
                  className="relative text-[#2d3427] hover:text-[#2d3427] hover:bg-[#e2e8d4] p-2 bg-[var(--surface)] rounded-xl shadow-[var(--shadow-soft)] border border-black/5 transition"
                  title={cartItemCount === 0 ? "Jūsų krepšelis tuščias" : ""}
                  aria-label="Krepšelis"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
                    <circle cx="9" cy="20" r="1" />
                    <circle cx="17" cy="20" r="1" />
                    <path d="M3 3h2l2.4 12.4a2 2 0 0 0 2 1.6h7.6a2 2 0 0 0 2-1.6L21 7H6" />
                  </svg>
                  {cartItemCount > 0 && (
                    <span className="absolute -right-2 -top-2 min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--accent)] text-[#2d3427] text-[10px] font-semibold flex items-center justify-center">
                      {cartItemCount}
                    </span>
                  )}
                </button>
              </div>
              {isCartVisible && (
                <div className="bg-[var(--surface)] rounded-3xl shadow-[var(--shadow-soft)] border border-black/5 overflow-hidden w-full lg:w-[320px] lg:absolute lg:right-0 top-20 lg:top-24 lg:z-20">
                  <div className="p-5 pb-0">
                    <div className="flex justify-between items-center mb-2">
                      <h2 className="text-2xl font-semibold text-[var(--foreground)]">Mano krepšelis</h2>
                    </div>
                    {cartNotice && (
                      <div className="mb-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
                        {cartNotice}
                      </div>
                    )}
                    {currentCart.length > 0 && (
                      <div className="flex justify-end pb-3">
                        <button onClick={clearCart} className="text-xs text-[var(--ink-soft)] hover:text-[var(--foreground)] font-semibold">Išvalyti</button>
                      </div>
                    )}
                  </div>
                  <div className="space-y-0 mb-0 max-h-[50vh] overflow-y-auto">
                    {currentCart.length === 0 ? <p className="text-[var(--ink-soft)] italic text-center py-8 text-sm px-5">Jūsų krepšelis tuščias</p> : 
                      currentCart.map((item: any) => (
                        <div key={item.id} className="p-5 border-t border-black/5 hover:bg-[var(--surface-muted)] transition">
                          <div className="flex gap-3">
                            {item.images && item.images.length > 0 ? (
                              <img src={item.images[0]} alt="" className="w-16 h-16 bg-gray-200 rounded-xl flex-shrink-0 object-cover" />
                            ) : (
                              <div className="w-16 h-16 bg-gray-200 rounded-xl flex-shrink-0"></div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-start mb-1">
                                <div className={`pr-2 ${item.unavailable ? 'opacity-60 blur-[1px]' : ''}`}>
                                  <h3 className="font-semibold text-sm text-[var(--foreground)]">{item.name}</h3>
                                  {item.size && (
                                    <div className="text-xs font-semibold text-green-700">{item.size}</div>
                                  )}
                                </div>
                                <button
                                  onClick={() => removeItem(item.id)}
                                  className="text-gray-400 hover:text-red-500 text-lg"
                                  title="Pašalinti prekę"
                                  aria-label="Pašalinti prekę"
                                >
                                  x
                                </button>
                              </div>
                              <div className={`flex justify-between items-center mt-2 ${item.unavailable ? 'opacity-60 blur-[1px]' : ''}`}>
                                <div className="text-lg font-bold text-[var(--foreground)]">{item.price.toFixed(2)} €</div>
                                <div className="flex items-center gap-2 bg-white border border-black/10 rounded-full px-3 py-1">
                                  <button
                                    onClick={() => updateQty(item.id, item.qty - 1)}
                                    className="text-gray-600 hover:text-[var(--foreground)] text-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                                    disabled={item.unavailable}
                                  >
                                    -
                                  </button>
                                  <input
                                    type="number"
                                    inputMode="numeric"
                                    min={1}
                                    step={1}
                                    value={item.qty}
                                    onChange={(e) => updateQty(item.id, Number(e.target.value))}
                                    className="w-14 text-sm font-bold text-[var(--foreground)] text-center bg-transparent outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none disabled:opacity-50 disabled:cursor-not-allowed"
                                    aria-label="Kiekis"
                                    readOnly={item.unavailable}
                                  />
                                  <button
                                    onClick={() => updateQty(item.id, item.qty + 1)}
                                    className="text-gray-600 hover:text-[var(--foreground)] text-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                                    disabled={item.unavailable}
                                  >
                                    +
                                  </button>
                                </div>
                              </div>
                              {item.unavailable && (
                                <div className="mt-2 text-xs font-semibold text-red-600">
                                  Prekės nebeturime.
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    }
                  </div>
                  {currentCart.length > 0 && (
                    <div className="p-5 border-t border-black/5 bg-white">
                      {deliveryAddresses.length > 0 && (
                        <div className="mb-4">
                          <label className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--ink-soft)] mb-2">Pristatymo adresas</label>
                          <select
                            value={selectedDeliveryAddress ?? ''}
                            onChange={(e) => setSelectedDeliveryAddress(e.target.value ? parseInt(e.target.value) : null)}
                            className="w-full border border-black/10 rounded-2xl p-2 text-sm bg-white text-slate-800 focus:ring-2 focus:ring-[var(--accent)] outline-none"
                          >
                            <option value="">-- Pasirinkite adresą --</option>
                            {deliveryAddresses.map((addr, idx) => (
                              <option key={idx} value={idx}>
                                {addr.name} - {addr.address}, {addr.city}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                      {deliveryAddresses.length === 0 && (
                        <div className="mb-4 p-3 bg-[var(--surface-muted)] border border-black/5 rounded-2xl text-xs text-[var(--ink-soft)]">
                          Prieš pateikiant užsakymą, pridėkite pristatymo adresą skiltyje "Mano duomenys".
                        </div>
                      )}
                      <div className="space-y-2 mb-4">
                        <div className="flex justify-between text-sm text-[var(--foreground)]">
                          <span>Suma iš viso</span><span className="font-semibold">{currentBaseTotal.toFixed(2)} €</span>
                        </div>
                        <div className="flex justify-between text-sm text-[var(--foreground)]">
                          <span>Nuolaida</span><span className="font-semibold text-green-600">-{(currentBaseTotal - currentTotal).toFixed(2)} €</span>
                        </div>
                      </div>
                      <div className="flex justify-between text-lg font-bold text-[var(--foreground)] mb-4 pb-4 border-b border-black/5">
                        <span>Iš viso</span><span>{currentTotal.toFixed(2)} €</span>
                      </div>
                      <button 
                        onClick={submitOrder}
                        disabled={deliveryAddresses.length === 0 || selectedDeliveryAddress === null}
                        className="w-full bg-[#3e5d4f] text-white py-4 rounded-2xl font-bold text-sm hover:opacity-90 transition active:scale-95 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
                      >
                        Užsakyti
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </aside>
      </div>
    </div>
  </div>
  );
}