import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Switch } from '../components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../components/ui/dialog";
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { adminAPI, productsAPI, categoriesAPI } from '../lib/api';
import { 
  Package, ShoppingCart, CreditCard, Loader2, Check, X, Eye, Plus, Trash2, Clock, CheckCircle, XCircle, Edit2, Gift, Sparkles, Target, Edit, MessageSquare
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
  const [rewards, setRewards] = useState([]);
  const [wheelPrizes, setWheelPrizes] = useState([]);
  const [missions, setMissions] = useState([]);
  const [productImages, setProductImages] = useState([]);
  const [imageUrls, setImageUrls] = useState(['']);
  const [viewingImage, setViewingImage] = useState(null);
  
  // Edit state
  const [editingProduct, setEditingProduct] = useState(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingReward, setEditingReward] = useState(null);
  const [editingPrize, setEditingPrize] = useState(null);
  const [editingMission, setEditingMission] = useState(null);

  // Form states
  const [newProduct, setNewProduct] = useState({ 
    name: '', name_ru: '', name_tj: '',
    description: '', description_ru: '', description_tj: '',
    price: 0, xp_reward: 10, category_id: '', image_url: '', images: [], sizes: '', stock: 100,
    in_stock: true, arrival_date: ''
  });
  const [newReward, setNewReward] = useState({ level_required: 1, name: '', description: '', reward_type: 'coins', value: 50, is_exclusive: false });
  const [newPrize, setNewPrize] = useState({ name: '', prize_type: 'coins', value: 10, probability: 0.2, color: '#0D9488' });
  const [newMission, setNewMission] = useState({ title: '', description: '', mission_type: 'orders_count', target_value: 5, reward_type: 'coins', reward_value: 100, min_level: 1 });

  const isHelper = user?.role === 'helper' || user?.role === 'admin';

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
      const [productsRes, categoriesRes, requestsRes, ordersRes, rewardsRes, prizesRes, missionsRes] = await Promise.all([
        productsAPI.getAll(),
        categoriesAPI.getAll(),
        adminAPI.getTopupRequests(),
        adminAPI.getOrders(),
        adminAPI.getRewards ? adminAPI.getRewards() : { data: [] },
        adminAPI.getWheelPrizes ? adminAPI.getWheelPrizes() : { data: [] },
        adminAPI.getMissions ? adminAPI.getMissions() : { data: [] }
      ]);
      
      setProducts(productsRes.data);
      setCategories(categoriesRes.data);
      setTopupRequests(requestsRes.data);
      setOrders(ordersRes.data);
      setRewards(rewardsRes.data || []);
      setWheelPrizes(prizesRes.data || []);
      setMissions(missionsRes.data || []);
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
      const validUrls = imageUrls.filter(url => url.trim().startsWith('http'));
      let allImages = [...productImages, ...validUrls];
      if (allImages.length === 0) {
        toast.error('Добавьте хотя бы одно изображение или URL');
        return;
      }
      const productData = {
        ...newProduct,
        image_url: allImages[0],
        images: allImages,
        sizes: newProduct.sizes ? (Array.isArray(newProduct.sizes) ? newProduct.sizes : newProduct.sizes.split(',').map(s => s.trim())) : [],
      };
      await productsAPI.create(productData);
      toast.success('Товар создан!');
      setNewProduct({ 
        name: '', name_ru: '', name_tj: '',
        description: '', description_ru: '', description_tj: '',
        price: 0, xp_reward: 10, category_id: '', image_url: '', images: [], sizes: '', stock: 100,
        in_stock: true, arrival_date: ''
      });
      setProductImages([]);
      setImageUrls(['']);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Ошибка создания товара');
    }
  };

  const handleUpdateProduct = async (e) => {
    e.preventDefault();
    try {
      const validUrls = imageUrls.filter(url => url.trim().startsWith('http'));
      let allImages = [...productImages, ...validUrls];
      if (allImages.length === 0) {
        toast.error('Добавьте хотя бы одно изображение или URL');
        return;
      }
      const productData = {
        ...editingProduct,
        image_url: allImages[0],
        images: allImages,
        sizes: typeof editingProduct.sizes === 'string' 
          ? editingProduct.sizes.split(',').map(s => s.trim()) 
          : editingProduct.sizes,
      };
      await productsAPI.update(editingProduct.product_id, productData);
      toast.success('Товар обновлен!');
      setIsEditDialogOpen(false);
      setEditingProduct(null);
      setProductImages([]);
      setImageUrls(['']);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Ошибка обновления товара');
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (!window.confirm(lang === 'ru' ? 'Удалить этот товар?' : 'Ин молро нест кунед?')) return;
    try {
      await productsAPI.delete(productId);
      toast.success(lang === 'ru' ? 'Товар удален' : 'Мол нест шуд');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Ошибка удаления');
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

  // Reward handlers
  const handleEditReward = (r) => {
    setEditingReward(r);
    setNewReward({
      level_required: r.level_required,
      name: r.name,
      description: r.description,
      reward_type: r.reward_type,
      value: r.value,
      is_exclusive: r.is_exclusive || false
    });
  };

  const handleCancelEditReward = () => {
    setEditingReward(null);
    setNewReward({ level_required: 1, name: '', description: '', reward_type: 'coins', value: 50, is_exclusive: false });
  };

  const handleCreateReward = async (e) => {
    e.preventDefault();
    try {
      if (editingReward) {
        await adminAPI.updateReward(editingReward.reward_id, newReward);
        toast.success('Reward updated');
        setEditingReward(null);
      } else {
        await adminAPI.createReward(newReward);
        toast.success('Reward created');
      }
      setNewReward({ level_required: 1, name: '', description: '', reward_type: 'coins', value: 50, is_exclusive: false });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save reward');
    }
  };

  const handleDeleteReward = async (id) => {
    if (!window.confirm('Удалить эту награду?')) return;
    try {
      await adminAPI.deleteReward(id);
      toast.success('Reward deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete reward');
    }
  };

  // Wheel prize handlers
  const handleEditPrize = (p) => {
    setEditingPrize(p);
    setNewPrize({
      name: p.name,
      prize_type: p.prize_type,
      value: p.value,
      probability: p.probability,
      color: p.color || '#0D9488'
    });
  };

  const handleCancelEditPrize = () => {
    setEditingPrize(null);
    setNewPrize({ name: '', prize_type: 'coins', value: 10, probability: 0.2, color: '#0D9488' });
  };

  const handleCreatePrize = async (e) => {
    e.preventDefault();
    try {
      if (editingPrize) {
        await adminAPI.updateWheelPrize(editingPrize.prize_id, newPrize);
        toast.success('Prize updated');
        setEditingPrize(null);
      } else {
        await adminAPI.createWheelPrize(newPrize);
        toast.success('Prize created');
      }
      setNewPrize({ name: '', prize_type: 'coins', value: 10, probability: 0.2, color: '#0D9488' });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save prize');
    }
  };

  const handleDeletePrize = async (id) => {
    if (!window.confirm('Удалить этот приз?')) return;
    try {
      await adminAPI.deleteWheelPrize(id);
      toast.success('Prize deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete prize');
    }
  };

  // Mission handlers
  const handleEditMission = (m) => {
    setEditingMission(m);
    setNewMission({
      title: m.title,
      description: m.description,
      mission_type: m.mission_type,
      target_value: m.target_value,
      reward_type: m.reward_type,
      reward_value: m.reward_value,
      min_level: m.min_level || 1
    });
  };

  const handleCancelEditMission = () => {
    setEditingMission(null);
    setNewMission({ title: '', description: '', mission_type: 'orders_count', target_value: 5, reward_type: 'coins', reward_value: 100, min_level: 1 });
  };

  const handleCreateMission = async (e) => {
    e.preventDefault();
    if (!newMission.title.trim()) {
      toast.error('Введите название миссии');
      return;
    }
    try {
      if (editingMission) {
        await adminAPI.updateMission(editingMission.mission_id, newMission);
        toast.success('Миссия обновлена!');
        setEditingMission(null);
      } else {
        await adminAPI.createMission(newMission);
        toast.success('Миссия создана!');
      }
      setNewMission({ title: '', description: '', mission_type: 'orders_count', target_value: 5, reward_type: 'coins', reward_value: 100, min_level: 1 });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Ошибка сохранения миссии');
    }
  };

  const handleDeleteMission = async (id) => {
    if (!window.confirm('Удалить эту миссию?')) return;
    try {
      await adminAPI.deleteMission(id);
      toast.success('Миссия удалена');
      fetchData();
    } catch (error) {
      toast.error('Ошибка удаления миссии');
    }
  };

  const handleToggleMission = async (id) => {
    try {
      await adminAPI.toggleMission(id);
      toast.success('Статус изменён');
      fetchData();
    } catch (error) {
      toast.error('Ошибка изменения статуса');
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
              {lang === 'ru' ? 'Пополнения' : 'Пуркунӣ'}
              {pendingRequests.length > 0 && (
                <span className="ml-2 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                  {pendingRequests.length}
                </span>
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
            <TabsTrigger value="rewards" className="admin-tab">
              <Gift className="w-4 h-4 mr-2" />
              {lang === 'ru' ? 'Награды' : 'Мукофотҳо'}
            </TabsTrigger>
            <TabsTrigger value="wheel" className="admin-tab">
              <Sparkles className="w-4 h-4 mr-2" />
              {lang === 'ru' ? 'Колесо' : 'Чарх'}
            </TabsTrigger>
            <TabsTrigger value="missions" className="admin-tab">
              <Target className="w-4 h-4 mr-2" />
              {lang === 'ru' ? 'Миссии' : 'Миссияҳо'}
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
                          size="sm" 
                          variant="outline" 
                          onClick={() => setViewingImage(req.receipt_image_url)}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          {lang === 'ru' ? 'Чек' : 'Чек'}
                        </Button>
                      )}
                      {req.status === 'pending' && (
                        <>
                          <Button 
                            size="sm" 
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => handleApproveTopup(req.request_id)}
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={() => handleRejectTopup(req.request_id)}
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
                        placeholder="Ном бо тоҷикӣ" 
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

                <div className="grid md:grid-cols-2 gap-4 p-3 border border-slate-600 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>{lang === 'ru' ? 'В наличии' : 'Дар анбор'}</Label>
                    </div>
                    <Switch 
                      checked={newProduct.in_stock}
                      onCheckedChange={(checked) => setNewProduct({...newProduct, in_stock: checked})}
                    />
                  </div>
                  <div>
                    <Label>{lang === 'ru' ? 'Дата прибытия' : 'Санаи омадан'}</Label>
                    <Input 
                      type="text" 
                      value={newProduct.arrival_date || ''} 
                      onChange={(e) => setNewProduct({...newProduct, arrival_date: e.target.value})} 
                      className="admin-input" 
                      placeholder={lang === 'ru' ? 'Напр: 15 февраля' : 'Мис: 15 феврал'}
                      disabled={newProduct.in_stock}
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button type="submit">{lang === 'ru' ? 'Создать товар' : 'Эҷод кардани мол'}</Button>
                </div>
              </form>
            </div>

            <div className="admin-card">
              <h3 className="font-bold mb-4">{lang === 'ru' ? 'Список товаров' : 'Рӯйхати молҳо'} ({products.length})</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {products.map((product) => (
                  <div key={product.product_id} className="flex items-center gap-4 p-3 bg-slate-800 rounded-lg border border-slate-700">
                    <img src={product.image_url} alt={product.name} className="w-16 h-16 object-cover rounded" />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold truncate">{getLocalizedText(product, 'name')}</p>
                      <p className="text-sm text-primary">{product.price} coins</p>
                      <p className="text-xs text-slate-400">Stock: {product.stock}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="text-blue-400"
                        onClick={() => {
                          setEditingProduct(product);
                          setImageUrls(product.images || [product.image_url]);
                          setIsEditDialogOpen(true);
                        }}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      {user?.role === 'admin' && (
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="text-red-500"
                          onClick={() => handleDeleteProduct(product.product_id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
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
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-primary text-xl">{order.total}</p>
                          <span className={`text-xs px-2 py-1 rounded-full ${config.color}`}>
                            {config.label}
                          </span>
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t border-slate-700 flex flex-wrap gap-2">
                        {['confirmed', 'processing', 'shipped', 'delivered', 'cancelled'].map((status) => (
                          <Button
                            key={status}
                            size="sm"
                            variant={order.status === status ? 'default' : 'outline'}
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

          {/* Rewards Tab */}
          <TabsContent value="rewards" className="space-y-6">
            <div className="admin-card">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                {editingReward ? <Edit className="w-4 h-4" /> : <Plus className="w-4 h-4" />} 
                {editingReward ? 'Редактировать награду' : 'Добавить награду'}
              </h3>
              <form onSubmit={handleCreateReward} className="grid md:grid-cols-3 gap-4">
                <div>
                  <Label>Требуемый уровень</Label>
                  <Input type="number" value={newReward.level_required} onChange={(e) => setNewReward({...newReward, level_required: parseInt(e.target.value)})} className="admin-input" required />
                </div>
                <div>
                  <Label>Название</Label>
                  <Input value={newReward.name} onChange={(e) => setNewReward({...newReward, name: e.target.value})} className="admin-input" required />
                </div>
                <div>
                  <Label>Описание</Label>
                  <Input value={newReward.description} onChange={(e) => setNewReward({...newReward, description: e.target.value})} className="admin-input" required />
                </div>
                <div>
                  <Label>Тип</Label>
                  <select value={newReward.reward_type} onChange={(e) => setNewReward({...newReward, reward_type: e.target.value})} className="admin-input w-full h-9">
                    <option value="coins">Монеты</option>
                    <option value="xp_boost">XP буст</option>
                    <option value="discount">Скидка</option>
                  </select>
                </div>
                <div>
                  <Label>Значение</Label>
                  <Input type="number" value={newReward.value} onChange={(e) => setNewReward({...newReward, value: parseFloat(e.target.value)})} className="admin-input" required />
                </div>
                <div className="flex items-end gap-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={newReward.is_exclusive} onChange={(e) => setNewReward({...newReward, is_exclusive: e.target.checked})} />
                    Эксклюзив
                  </label>
                  <div className="flex gap-2">
                    <Button type="submit">{editingReward ? 'Сохранить' : 'Создать'}</Button>
                    {editingReward && (
                      <Button type="button" variant="outline" onClick={handleCancelEditReward}>Отмена</Button>
                    )}
                  </div>
                </div>
              </form>
            </div>

            <div className="admin-card">
              <h3 className="font-bold mb-4">Награды ({rewards.length})</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {rewards.map((r) => (
                  <div key={r.reward_id} className="flex items-center justify-between p-3 bg-slate-700 rounded-lg">
                    <div>
                      <p className="font-bold">{r.name} {r.is_exclusive && <span className="text-yellow-400">(Эксклюзив)</span>}</p>
                      <p className="text-sm text-slate-400">Уровень {r.level_required} • {r.reward_type}: {r.value}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="text-blue-400" onClick={() => handleEditReward(r)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-red-500" onClick={() => handleDeleteReward(r.reward_id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Wheel Tab */}
          <TabsContent value="wheel" className="space-y-6">
            <div className="admin-card">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                {editingPrize ? <Edit className="w-4 h-4" /> : <Plus className="w-4 h-4" />} 
                {editingPrize ? 'Редактировать приз' : 'Добавить приз'}
              </h3>
              <form onSubmit={handleCreatePrize} className="grid md:grid-cols-5 gap-4">
                <div>
                  <Label>Название</Label>
                  <Input value={newPrize.name} onChange={(e) => setNewPrize({...newPrize, name: e.target.value})} className="admin-input" required />
                </div>
                <div>
                  <Label>Тип</Label>
                  <select value={newPrize.prize_type} onChange={(e) => setNewPrize({...newPrize, prize_type: e.target.value})} className="admin-input w-full h-9">
                    <option value="coins">Монеты</option>
                    <option value="xp">XP</option>
                    <option value="discount">Скидка</option>
                  </select>
                </div>
                <div>
                  <Label>Значение</Label>
                  <Input type="number" value={newPrize.value} onChange={(e) => setNewPrize({...newPrize, value: parseFloat(e.target.value)})} className="admin-input" required />
                </div>
                <div>
                  <Label>Вероятность (0-1)</Label>
                  <Input type="number" step="0.01" value={newPrize.probability} onChange={(e) => setNewPrize({...newPrize, probability: parseFloat(e.target.value)})} className="admin-input" required />
                </div>
                <div>
                  <Label>Цвет</Label>
                  <Input type="color" value={newPrize.color} onChange={(e) => setNewPrize({...newPrize, color: e.target.value})} className="admin-input h-10" />
                </div>
                <div className="md:col-span-5 flex justify-end gap-2">
                  {editingPrize && (
                    <Button type="button" variant="outline" onClick={handleCancelEditPrize}>Отмена</Button>
                  )}
                  <Button type="submit">{editingPrize ? 'Сохранить' : 'Создать'}</Button>
                </div>
              </form>
            </div>

            <div className="admin-card">
              <h3 className="font-bold mb-4">Призы колеса ({wheelPrizes.length})</h3>
              <div className="space-y-2">
                {wheelPrizes.map((p) => (
                  <div key={p.prize_id} className="flex items-center justify-between p-3 bg-slate-700 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded" style={{ backgroundColor: p.color }} />
                      <div>
                        <p className="font-bold">{p.name}</p>
                        <p className="text-sm text-slate-400">{p.prize_type}: {p.value} • {(p.probability * 100).toFixed(0)}%</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="text-blue-400" onClick={() => handleEditPrize(p)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-red-500" onClick={() => handleDeletePrize(p.prize_id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Missions Tab */}
          <TabsContent value="missions" className="space-y-6">
            <div className="admin-card">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                {editingMission ? <Edit className="w-4 h-4" /> : <Plus className="w-4 h-4" />} 
                {editingMission ? 'Редактировать миссию' : 'Создать миссию'}
              </h3>
              <form onSubmit={handleCreateMission} className="grid md:grid-cols-3 gap-4">
                <div>
                  <Label>Название</Label>
                  <Input value={newMission.title} onChange={(e) => setNewMission({...newMission, title: e.target.value})} className="admin-input" placeholder="Первые покупки" required />
                </div>
                <div>
                  <Label>Описание</Label>
                  <Input value={newMission.description} onChange={(e) => setNewMission({...newMission, description: e.target.value})} className="admin-input" placeholder="Сделай 5 покупок" required />
                </div>
                <div>
                  <Label>Тип миссии</Label>
                  <select value={newMission.mission_type} onChange={(e) => setNewMission({...newMission, mission_type: e.target.value})} className="admin-input w-full h-9">
                    <option value="orders_count">Кол-во заказов</option>
                    <option value="spend_amount">Потратить монеты</option>
                    <option value="purchase">Покупки</option>
                    <option value="topup">Пополнения</option>
                    <option value="level">Достичь уровня</option>
                    <option value="review">Оставить отзыв</option>
                  </select>
                </div>
                <div>
                  <Label>Цель (число)</Label>
                  <Input type="number" value={newMission.target_value} onChange={(e) => setNewMission({...newMission, target_value: parseFloat(e.target.value)})} className="admin-input" required />
                </div>
                <div>
                  <Label>Тип награды</Label>
                  <select value={newMission.reward_type} onChange={(e) => setNewMission({...newMission, reward_type: e.target.value})} className="admin-input w-full h-9">
                    <option value="coins">Монеты</option>
                    <option value="xp">XP</option>
                    <option value="spin">Вращения колеса</option>
                  </select>
                </div>
                <div>
                  <Label>Размер награды</Label>
                  <Input type="number" value={newMission.reward_value} onChange={(e) => setNewMission({...newMission, reward_value: parseFloat(e.target.value)})} className="admin-input" required />
                </div>
                <div>
                  <Label>Мин. уровень</Label>
                  <Input type="number" value={newMission.min_level} onChange={(e) => setNewMission({...newMission, min_level: parseInt(e.target.value)})} className="admin-input" required min="1" />
                </div>
                <div className="md:col-span-3 flex justify-end gap-2">
                  {editingMission && (
                    <Button type="button" variant="outline" onClick={handleCancelEditMission}>Отмена</Button>
                  )}
                  <Button type="submit">{editingMission ? 'Сохранить' : 'Создать миссию'}</Button>
                </div>
              </form>
            </div>

            <div className="admin-card">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <Target className="w-5 h-5" />
                Миссии ({missions.length})
              </h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {missions.length === 0 ? (
                  <p className="text-slate-400 text-center py-4">Миссий пока нет</p>
                ) : (
                  missions.map((mission) => (
                    <div key={mission.mission_id} className="flex items-center justify-between p-3 bg-slate-700 rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className={`w-3 h-3 rounded-full ${mission.is_active ? 'bg-green-500' : 'bg-red-500'}`}></span>
                        <div>
                          <p className="font-bold">{mission.title}</p>
                          <p className="text-sm text-slate-400">
                            {mission.description} • Цель: {mission.target_value} • Награда: {mission.reward_value} {mission.reward_type} • Ур: {mission.min_level || 1}+
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleToggleMission(mission.mission_id)}>
                          {mission.is_active ? 'Деактив.' : 'Актив.'}
                        </Button>
                        <Button variant="ghost" size="icon" className="text-blue-400" onClick={() => handleEditMission(mission)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-red-500" onClick={() => handleDeleteMission(mission.mission_id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Edit Product Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-slate-900 text-white border-slate-700">
            <DialogHeader>
              <DialogTitle>{lang === 'ru' ? 'Редактировать товар' : 'Таҳрири мол'}</DialogTitle>
            </DialogHeader>
            {editingProduct && (
              <form onSubmit={handleUpdateProduct} className="space-y-4 py-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>🇷🇺 Название (RU)</Label>
                    <Input 
                      value={editingProduct.name_ru || ''} 
                      onChange={(e) => setEditingProduct({...editingProduct, name_ru: e.target.value, name: e.target.value})} 
                      className="admin-input" 
                    />
                  </div>
                  <div>
                    <Label>🇹🇯 Ном (TJ)</Label>
                    <Input 
                      value={editingProduct.name_tj || ''} 
                      onChange={(e) => setEditingProduct({...editingProduct, name_tj: e.target.value})} 
                      className="admin-input" 
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>Отмена</Button>
                  <Button type="submit">Сохранить</Button>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>

        {/* Image Modal */}
        {viewingImage && (
          <div 
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
            onClick={() => setViewingImage(null)}
          >
            <div className="relative max-w-3xl max-h-[80vh]">
              <img src={viewingImage} alt="Receipt" className="max-w-full max-h-[80vh] object-contain rounded-lg" />
              <button onClick={() => setViewingImage(null)} className="absolute -top-4 -right-4 w-10 h-10 bg-white text-black rounded-full flex items-center justify-center">
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
