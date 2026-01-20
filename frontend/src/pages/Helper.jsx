import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { adminAPI, productsAPI, categoriesAPI } from '../lib/api';
import { 
  Package, ShoppingCart, CreditCard, Loader2, Check, X, Eye, Plus, Trash2, Clock, CheckCircle, XCircle
} from 'lucide-react';
import { toast } from 'sonner';

export const Helper = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { t, lang } = useLanguage();
  
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [topupRequests, setTopupRequests] = useState([]);
  const [orders, setOrders] = useState([]);
  const [productImages, setProductImages] = useState([]);
  const [viewingImage, setViewingImage] = useState(null);

  // Form states
  const [newProduct, setNewProduct] = useState({ 
    name: '', name_ru: '', name_tj: '',
    description: '', description_ru: '', description_tj: '',
    price: 0, xp_reward: 10, category_id: '', image_url: '', images: [], sizes: '', stock: 100 
  });

  const isHelper = user?.role === 'helper';

  useEffect(() => {
    if (authLoading) return;
    
    if (!isAuthenticated || !isHelper) {
      navigate('/');
      return;
    }
    fetchData();
  }, [isAuthenticated, isHelper, navigate, authLoading]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [productsRes, categoriesRes, requestsRes, ordersRes] = await Promise.all([
        productsAPI.getAll(),
        categoriesAPI.getAll(),
        adminAPI.getTopupRequests(),
        adminAPI.getOrders(),
      ]);
      
      setProducts(productsRes.data);
      setCategories(categoriesRes.data);
      setTopupRequests(requestsRes.data);
      setOrders(ordersRes.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  // Product handlers
  const handleCreateProduct = async (e) => {
    e.preventDefault();
    try {
      let imageUrl = newProduct.image_url;
      let images = [];
      
      if (productImages.length > 0) {
        images = productImages;
        imageUrl = productImages[0];
      } else if (!imageUrl) {
        toast.error('Добавьте хотя бы одно изображение');
        return;
      }

      const productData = {
        ...newProduct,
        image_url: imageUrl,
        images: images,
        sizes: newProduct.sizes ? newProduct.sizes.split(',').map(s => s.trim()) : [],
      };
      
      await productsAPI.create(productData);
      toast.success('Товар создан!');
      setNewProduct({ 
        name: '', name_ru: '', name_tj: '',
        description: '', description_ru: '', description_tj: '',
        price: 0, xp_reward: 10, category_id: '', image_url: '', images: [], sizes: '', stock: 100 
      });
      setProductImages([]);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Ошибка создания товара');
    }
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        toast.error('Только изображения');
        continue;
      }
      
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64 = reader.result.split(',')[1];
          const res = await adminAPI.uploadImage(base64);
          setProductImages(prev => [...prev, res.data.image_url]);
          toast.success('Изображение загружено');
        } catch (error) {
          toast.error('Ошибка загрузки изображения');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = (index) => {
    setProductImages(prev => prev.filter((_, i) => i !== index));
  };

  // Topup handlers
  const handleApproveTopup = async (requestId) => {
    try {
      await adminAPI.approveTopup(requestId);
      toast.success('Заявка одобрена!');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Ошибка');
    }
  };

  const handleRejectTopup = async (requestId) => {
    if (!window.confirm('Отклонить эту заявку?')) return;
    try {
      await adminAPI.rejectTopup(requestId);
      toast.success('Заявка отклонена');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Ошибка');
    }
  };

  // Order handlers
  const handleUpdateOrderStatus = async (orderId, status) => {
    try {
      let trackingNumber = null;
      if (status === 'shipped') {
        trackingNumber = prompt(lang === 'ru' ? 'Введите трек-номер (опционально):' : 'Рақами пайгириро ворид кунед:');
      }
      await adminAPI.updateOrderStatus(orderId, status, null, trackingNumber);
      toast.success(lang === 'ru' ? 'Статус обновлён!' : 'Вазъият навсозӣ шуд!');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Ошибка');
    }
  };

  const getLocalizedText = (item, field) => {
    if (!item) return '';
    if (lang === 'ru' && item[`${field}_ru`]) return item[`${field}_ru`];
    if (lang === 'tj' && item[`${field}_tj`]) return item[`${field}_tj`];
    return item[field] || '';
  };

  if (authLoading) {
    return (
      <div className="min-h-screen admin-panel flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!isHelper) return null;

  if (loading) {
    return (
      <div className="min-h-screen admin-panel flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  const pendingRequests = topupRequests.filter(r => r.status === 'pending');

  return (
    <div className="min-h-screen admin-panel">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Package className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">
              {lang === 'ru' ? 'Панель помощника' : 'Панели ёрдамчӣ'}
            </h1>
            <p className="text-slate-400">
              {lang === 'ru' ? 'Добро пожаловать, ' : 'Хуш омадед, '}{user?.name}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          <div className="admin-card">
            <CreditCard className="w-6 h-6 text-yellow-500 mb-2" />
            <p className="text-2xl font-bold">{pendingRequests.length}</p>
            <p className="text-sm text-slate-400">{lang === 'ru' ? 'Ожидают' : 'Интизорӣ'}</p>
          </div>
          <div className="admin-card">
            <Package className="w-6 h-6 text-purple-500 mb-2" />
            <p className="text-2xl font-bold">{products.length}</p>
            <p className="text-sm text-slate-400">{lang === 'ru' ? 'Товаров' : 'Молҳо'}</p>
          </div>
          <div className="admin-card">
            <ShoppingCart className="w-6 h-6 text-blue-500 mb-2" />
            <p className="text-2xl font-bold">{orders.length}</p>
            <p className="text-sm text-slate-400">{lang === 'ru' ? 'Заказов' : 'Фармоишҳо'}</p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="topup" className="space-y-6">
          <TabsList className="admin-tabs">
            <TabsTrigger value="topup" className="admin-tab">
              <CreditCard className="w-4 h-4 mr-2" />
              {lang === 'ru' ? 'Заявки на пополнение' : 'Дархостҳои пуркунӣ'}
              {pendingRequests.length > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-red-500 rounded-full text-xs">{pendingRequests.length}</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="products" className="admin-tab">
              <Package className="w-4 h-4 mr-2" />
              {lang === 'ru' ? 'Товары' : 'Молҳо'}
            </TabsTrigger>
            <TabsTrigger value="orders" className="admin-tab">
              <ShoppingCart className="w-4 h-4 mr-2" />
              {lang === 'ru' ? 'Заказы' : 'Фармоишҳо'}
            </TabsTrigger>
          </TabsList>

          {/* Topup Requests Tab */}
          <TabsContent value="topup" className="space-y-4">
            <h3 className="font-bold text-lg">
              {lang === 'ru' ? `Заявки на пополнение (${topupRequests.length})` : `Дархостҳои пуркунӣ (${topupRequests.length})`}
            </h3>
            {topupRequests.length === 0 ? (
              <p className="text-slate-400">{lang === 'ru' ? 'Нет заявок' : 'Дархост нест'}</p>
            ) : (
              <div className="space-y-4">
                {topupRequests.map((req) => (
                  <div key={req.request_id} className="admin-card flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      {req.status === 'pending' ? (
                        <Clock className="w-5 h-5 text-yellow-500" />
                      ) : req.status === 'approved' ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500" />
                      )}
                      <div>
                        <p className="font-bold text-primary">+{req.amount}</p>
                        <p className="text-sm text-slate-400">User: {req.user_name} ({req.user_email})</p>
                        <p className="text-xs text-slate-500">{new Date(req.created_at).toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {req.receipt_image_url && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setViewingImage(req.receipt_image_url)}
                          className="rounded-full"
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          {lang === 'ru' ? 'Чек' : 'Чек'}
                        </Button>
                      )}
                      {req.status === 'pending' && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleApproveTopup(req.request_id)}
                            className="bg-green-600 hover:bg-green-700 rounded-full"
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleRejectTopup(req.request_id)}
                            className="rounded-full"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                      {req.status !== 'pending' && (
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          req.status === 'approved' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                        }`}>
                          {req.status === 'approved' 
                            ? (lang === 'ru' ? 'Одобрено' : 'Тасдиқ шуд')
                            : (lang === 'ru' ? 'Отклонено' : 'Рад шуд')
                          }
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Products Tab */}
          <TabsContent value="products" className="space-y-6">
            <div className="admin-card">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <Plus className="w-4 h-4" /> 
                {lang === 'ru' ? 'Добавить товар' : 'Илова кардани мол'}
              </h3>
              <form onSubmit={handleCreateProduct} className="space-y-4">
                {/* Multilingual Name Fields */}
                <div className="p-3 border border-slate-600 rounded-lg">
                  <Label className="text-sm text-slate-400 mb-2 block">
                    {lang === 'ru' ? 'Название товара' : 'Номи мол'}
                  </Label>
                  <div className="grid md:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">🇷🇺 Русский *</Label>
                      <Input 
                        value={newProduct.name_ru} 
                        onChange={(e) => setNewProduct({...newProduct, name_ru: e.target.value, name: e.target.value})} 
                        className="admin-input" 
                        placeholder="Название на русском" 
                        required 
                      />
                    </div>
                    <div>
                      <Label className="text-xs">🇹🇯 Тоҷикӣ</Label>
                      <Input 
                        value={newProduct.name_tj} 
                        onChange={(e) => setNewProduct({...newProduct, name_tj: e.target.value})} 
                        className="admin-input" 
                        placeholder="Номи тоҷикӣ" 
                      />
                    </div>
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <Label>{lang === 'ru' ? 'Цена' : 'Нарх'}</Label>
                    <Input 
                      type="number" 
                      value={newProduct.price} 
                      onChange={(e) => setNewProduct({...newProduct, price: parseFloat(e.target.value)})} 
                      className="admin-input" 
                      required 
                    />
                  </div>
                  <div>
                    <Label>XP</Label>
                    <Input 
                      type="number" 
                      value={newProduct.xp_reward} 
                      onChange={(e) => setNewProduct({...newProduct, xp_reward: parseInt(e.target.value)})} 
                      className="admin-input" 
                      required 
                    />
                  </div>
                  <div>
                    <Label>{lang === 'ru' ? 'Категория' : 'Категория'}</Label>
                    <select 
                      value={newProduct.category_id} 
                      onChange={(e) => setNewProduct({...newProduct, category_id: e.target.value})}
                      className="admin-input w-full h-9"
                      required
                    >
                      <option value="">{lang === 'ru' ? 'Выбрать' : 'Интихоб'}</option>
                      {categories.map((c) => (
                        <option key={c.category_id} value={c.category_id}>
                          {getLocalizedText(c, 'name')}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Description */}
                <div className="p-3 border border-slate-600 rounded-lg">
                  <Label className="text-sm text-slate-400 mb-2 block">
                    {lang === 'ru' ? 'Описание товара' : 'Тавсифи мол'}
                  </Label>
                  <div className="grid md:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">🇷🇺 Русский *</Label>
                      <Input 
                        value={newProduct.description_ru} 
                        onChange={(e) => setNewProduct({...newProduct, description_ru: e.target.value, description: e.target.value})} 
                        className="admin-input" 
                        placeholder="Описание на русском" 
                        required 
                      />
                    </div>
                    <div>
                      <Label className="text-xs">🇹🇯 Тоҷикӣ</Label>
                      <Input 
                        value={newProduct.description_tj} 
                        onChange={(e) => setNewProduct({...newProduct, description_tj: e.target.value})} 
                        className="admin-input" 
                        placeholder="Тавсифи тоҷикӣ" 
                      />
                    </div>
                  </div>
                </div>

                {/* Image Upload */}
                <div>
                  <Label className="mb-2 block">{lang === 'ru' ? 'Изображения' : 'Расмҳо'}</Label>
                  <div className="flex flex-wrap gap-3 mb-3">
                    {productImages.map((img, index) => (
                      <div key={index} className="relative group">
                        <img src={img} alt={`Preview ${index + 1}`} className="w-20 h-20 object-cover rounded-lg border border-slate-600" />
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(index)}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-sm opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    <label className="w-20 h-20 border-2 border-dashed border-slate-600 rounded-lg flex items-center justify-center cursor-pointer hover:border-primary transition-colors">
                      <Plus className="w-6 h-6 text-slate-400" />
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                <Button type="submit" className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  {lang === 'ru' ? 'Создать товар' : 'Сохтани мол'}
                </Button>
              </form>
            </div>

            {/* Products List */}
            <div className="admin-card">
              <h3 className="font-bold mb-4">{lang === 'ru' ? `Все товары (${products.length})` : `Ҳамаи молҳо (${products.length})`}</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {products.map((product) => (
                  <div key={product.product_id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <img src={product.image_url} alt={product.name} className="w-12 h-12 object-cover rounded" />
                      <div>
                        <p className="font-medium">{getLocalizedText(product, 'name')}</p>
                        <p className="text-sm text-slate-400">{product.price} • {product.xp_reward} XP</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders" className="space-y-4">
            <h3 className="font-bold text-lg">
              {lang === 'ru' ? `Заказы (${orders.length})` : `Фармоишҳо (${orders.length})`}
            </h3>
            {orders.length === 0 ? (
              <p className="text-slate-400">{lang === 'ru' ? 'Нет заказов' : 'Фармоиш нест'}</p>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => {
                  const statusConfig = {
                    pending: { color: 'bg-yellow-500/20 text-yellow-400', label: lang === 'ru' ? 'Ожидает' : 'Интизорӣ' },
                    confirmed: { color: 'bg-blue-500/20 text-blue-400', label: lang === 'ru' ? 'Подтверждён' : 'Тасдиқ шуд' },
                    processing: { color: 'bg-purple-500/20 text-purple-400', label: lang === 'ru' ? 'Обрабатывается' : 'Коркард' },
                    shipped: { color: 'bg-orange-500/20 text-orange-400', label: lang === 'ru' ? 'Отправлен' : 'Фиристода шуд' },
                    delivered: { color: 'bg-green-500/20 text-green-400', label: lang === 'ru' ? 'Доставлен' : 'Расонида шуд' },
                    cancelled: { color: 'bg-red-500/20 text-red-400', label: lang === 'ru' ? 'Отменён' : 'Бекор шуд' },
                    completed: { color: 'bg-green-500/20 text-green-400', label: lang === 'ru' ? 'Завершён' : 'Анҷом ёфт' }
                  };
                  const config = statusConfig[order.status] || statusConfig.pending;
                  
                  return (
                    <div key={order.order_id} className="admin-card">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-bold">#{order.order_id.slice(-8).toUpperCase()}</p>
                          <p className="text-sm text-slate-400">{order.user_email}</p>
                          <p className="text-sm text-slate-400">📍 {order.delivery_address}</p>
                          <p className="text-sm text-slate-400">📞 {order.phone_number}</p>
                          {order.tracking_number && (
                            <p className="text-sm text-slate-400">📦 Трек: <span className="font-mono">{order.tracking_number}</span></p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-primary text-xl">{order.total}</p>
                          <span className={`text-xs px-2 py-1 rounded-full ${config.color}`}>
                            {config.label}
                          </span>
                        </div>
                      </div>
                      
                      <div className="mt-3 pt-3 border-t border-slate-700">
                        {order.items?.map((item, i) => (
                          <p key={i} className="text-sm text-slate-300">
                            {item.product_name || item.name} x{item.quantity} — {item.price * item.quantity}
                          </p>
                        ))}
                      </div>
                      
                      {/* Status change buttons */}
                      <div className="mt-3 pt-3 border-t border-slate-700 flex flex-wrap gap-2">
                        <p className="w-full text-xs text-slate-500 mb-1">{lang === 'ru' ? 'Изменить статус:' : 'Иваз кардани вазъият:'}</p>
                        {['confirmed', 'processing', 'shipped', 'delivered', 'cancelled'].map((status) => (
                          <Button
                            key={status}
                            size="sm"
                            variant={order.status === status ? 'default' : 'outline'}
                            className={`text-xs ${order.status === status ? '' : 'opacity-60 hover:opacity-100'}`}
                            onClick={() => handleUpdateOrderStatus(order.order_id, status)}
                            disabled={order.status === status}
                          >
                            {statusConfig[status].label}
                          </Button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Image Modal */}
        {viewingImage && (
          <div 
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
            onClick={() => setViewingImage(null)}
          >
            <div className="relative max-w-3xl max-h-[80vh]">
              <img 
                src={viewingImage} 
                alt="Receipt" 
                className="max-w-full max-h-[80vh] object-contain rounded-lg"
              />
              <button
                onClick={() => setViewingImage(null)}
                className="absolute -top-4 -right-4 w-10 h-10 bg-white text-black rounded-full flex items-center justify-center"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
