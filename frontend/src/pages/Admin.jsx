import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { adminAPI, categoriesAPI, productsAPI, rewardsAPI, wheelAPI } from '../lib/api';
import { 
  Settings, Users, Package, Tag, Gift, Sparkles, CreditCard, User,
  Plus, Trash2, ShoppingCart, BarChart3, Loader2, Check, X, Eye, Edit, Clock, CheckCircle, XCircle, Percent, Target, MessageSquare, MapPin, Truck, Trophy
} from 'lucide-react';
import { toast } from 'sonner';

export const Admin = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, isAdmin, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [topupCodes, setTopupCodes] = useState([]);
  const [topupRequests, setTopupRequests] = useState([]);
  const [withdrawalRequests, setWithdrawalRequests] = useState([]);
  const [rewards, setRewards] = useState([]);
  const [wheelPrizes, setWheelPrizes] = useState([]);
  const [orders, setOrders] = useState([]);
  const [adminSettings, setAdminSettings] = useState({ 
    card_number: '', 
    card_holder: '', 
    additional_info: '',
    daily_bonus_coins: 10,
    daily_bonus_xp: 50
  });
  const [promoCodes, setPromoCodes] = useState([]);
  const [missions, setMissions] = useState([]);
  const [tags, setTags] = useState([]);
  const [supportTickets, setSupportTickets] = useState([]);
  const [bankCards, setBankCards] = useState([]);
  const [themes, setThemes] = useState([]);
  const [deliveryMethods, setDeliveryMethods] = useState([]);

  // Form states
  const [newProduct, setNewProduct] = useState({ 
    name: '', name_ru: '', name_tj: '',
    description: '', description_ru: '', description_tj: '',
    price: 0, xp_reward: 10, category_id: '', image_url: '', images: [], sizes: '', colors: '', stock: 100, in_stock: true, arrival_date: ''
  });
  const [newCategory, setNewCategory] = useState({ name: '', name_ru: '', name_tj: '', slug: '', description: '', parent_id: '' });
  const [newTopupCode, setNewTopupCode] = useState({ code: '', amount: 100 });
  const [newReward, setNewReward] = useState({ level_required: 1, name: '', description: '', reward_type: 'coins', value: 50, is_exclusive: false });
  const [newPrize, setNewPrize] = useState({ name: '', prize_type: 'coins', value: 10, probability: 0.2, color: '#0D9488' });
  const [newPromoCode, setNewPromoCode] = useState({ code: '', discount_percent: 10, usage_limit: 0, expires_at: '' });
  const [newMission, setNewMission] = useState({ title: '', description: '', mission_type: 'orders_count', target_value: 5, reward_type: 'coins', reward_value: 100, min_level: 1 });
  const [newTag, setNewTag] = useState({ name: '', slug: '', color: '#0D9488' });
  const [newBankCard, setNewBankCard] = useState({ card_number: '', card_holder: '', bank_name: '' });
  const [newTheme, setNewTheme] = useState({ name: '', icon: '🎨', hero_image: '', gradient: '', title_color: '', tagline: '' });
  const [showThemeForm, setShowThemeForm] = useState(false);
  const [newDeliveryMethod, setNewDeliveryMethod] = useState({ name: '', description: '', cost: 0, delivery_days: 1 });
  const [editingDeliveryMethod, setEditingDeliveryMethod] = useState(null);
  const [showDeliveryForm, setShowDeliveryForm] = useState(false);
  const [productImages, setProductImages] = useState([]);
  const [imageUrls, setImageUrls] = useState(['']);
  
  // Edit user modal
  const [editingUser, setEditingUser] = useState(null);
  const [editBalance, setEditBalance] = useState('');
  const [editXP, setEditXP] = useState('');
  
  // Edit product modal
  const [editingProduct, setEditingProduct] = useState(null);
  const [editingReward, setEditingReward] = useState(null);
  const [editingPrize, setEditingPrize] = useState(null);
  const [editingMission, setEditingMission] = useState(null);
  
  // Admin profile edit
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminSecretKey, setAdminSecretKey] = useState('');
  const ADMIN_SECRET = 'Manah';

  // Image modal for viewing receipts
  const [viewingImage, setViewingImage] = useState(null);
  const [isEditingRevenue, setIsEditingRevenue] = useState(false);
  const [newRevenueValue, setNewRevenueValue] = useState('');
  const [isSwitchingTheme, setIsSwitchingTheme] = useState(false);
  
  // AI Assistant state
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState(null);

  useEffect(() => {
    // Wait for auth to finish loading before checking permissions
    if (authLoading) return;
    
    const canAccess = isAdmin || user?.role === 'helper';
    if (!isAuthenticated || !canAccess) {
      navigate('/');
      return;
    }
    fetchAllData();
  }, [isAuthenticated, isAdmin, navigate, authLoading, user]);

  useEffect(() => {
    if (user) {
      setAdminEmail(user.email || '');
      setAdminName(user.name || '');
    }
  }, [user]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      // Base data that both admin and helper can access
      const [statsRes, usersRes, productsRes, categoriesRes, codesRes, ordersRes, prizesRes, requestsRes, withdrawalRes, promoRes, tagsRes] = await Promise.all([
        adminAPI.getStats(),
        adminAPI.getUsers(),
        productsAPI.getAll({ limit: 100000 }),
        categoriesAPI.getAll(),
        adminAPI.getTopupCodes(),
        adminAPI.getOrders(),
        wheelAPI.getPrizes(),
        adminAPI.getTopupRequests(),
        adminAPI.getWithdrawalRequests(),
        adminAPI.getPromoCodes(),
        adminAPI.getTags(),
      ]);
      
      // Admin-only data (settings and bank cards)
      let settingsData = {};
      let cardsData = [];
      if (isAdmin) {
        try {
          const [settingsRes, cardsRes] = await Promise.all([
            adminAPI.getSettings(),
            adminAPI.getBankCards(),
          ]);
          settingsData = settingsRes.data;
          cardsData = cardsRes.data;
        } catch (e) {
          console.log('Admin-only data not accessible');
        }
      }
      
      let rewardsData = [];
      try {
        const rewardsRes = await rewardsAPI.getAll();
        rewardsData = rewardsRes.data;
      } catch (e) {}

      let missionsData = [];
      try {
        const missionsRes = await adminAPI.getMissions();
        missionsData = missionsRes.data;
      } catch (e) {}

      let ticketsData = [];
      try {
        const ticketsRes = await adminAPI.getSupportTickets();
        ticketsData = ticketsRes.data;
      } catch (e) {}

      let themesData = [];
      try {
        const themesRes = await adminAPI.getThemes();
        themesData = themesRes.data;
      } catch (e) {}

      let deliveryMethodsData = [];
      try {
        const deliveryRes = await adminAPI.getDeliveryMethods();
        deliveryMethodsData = deliveryRes.data;
      } catch (e) {}

      setStats(statsRes.data);
      setUsers(usersRes.data);
      setProducts(productsRes.data);
      setCategories(categoriesRes.data);
      setTopupCodes(codesRes.data);
      setOrders(ordersRes.data);
      setRewards(rewardsData);
      setWheelPrizes(prizesRes.data);
      setAdminSettings(settingsData);
      setTopupRequests(requestsRes.data);
      setWithdrawalRequests(withdrawalRes.data);
      setPromoCodes(promoRes.data);
      setTags(tagsRes.data);
      setMissions(missionsData);
      setSupportTickets(ticketsData);
      setBankCards(cardsData);
      setThemes(themesData);
      setDeliveryMethods(deliveryMethodsData);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  // Product handlers
  const handleAiAnalyze = async () => {
    if (!aiPrompt.trim()) {
      toast.error('Введите описание товара');
      return;
    }
    
    setIsAiAnalyzing(true);
    try {
      const response = await adminAPI.analyzeProduct(aiPrompt);
      setAiResult(response.data);
      toast.success('ИИ проанализировал запрос!');
    } catch (error) {
      console.error('AI Analysis failed:', error);
      toast.error('Ошибка анализа ИИ');
    } finally {
      setIsAiAnalyzing(false);
    }
  };

  const applyAiResult = () => {
    if (!aiResult) return;
    
    setNewProduct({
      ...newProduct,
      ...aiResult.suggested_product,
      // Ensure category exists in our list
      category_id: categories.find(c => c._id === aiResult.suggested_product.category_id)?._id || categories[0]?._id || ''
    });
    
    // Switch to products tab
    const productsTab = document.querySelector('[data-value="products"]');
    if (productsTab) productsTab.click();
    
    toast.success('Данные применены! Проверьте и сохраните товар.');
  };

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    try {
      // Collect all valid URLs
      const validUrls = imageUrls.filter(url => url.trim().startsWith('http'));
      
      // Combine uploaded images and URLs
      let allImages = [...productImages, ...validUrls];
      
      if (allImages.length === 0) {
        toast.error('Добавьте хотя бы одно изображение или URL');
        return;
      }

      const productData = {
        ...newProduct,
        image_url: allImages[0], // First image is main
        images: allImages,
        sizes: typeof newProduct.sizes === 'string' ? newProduct.sizes.split(',').map(s => s.trim()).filter(s => s) : newProduct.sizes,
        colors: typeof newProduct.colors === 'string' ? newProduct.colors.split(',').map(c => c.trim()).filter(c => c) : newProduct.colors,
      };
      
      if (editingProduct) {
        await productsAPI.update(editingProduct.product_id, productData);
        toast.success('Товар обновлен!');
        setEditingProduct(null);
      } else {
        await productsAPI.create(productData);
        toast.success('Товар создан!');
      }

    setNewProduct({ 
      name: '', name_ru: '', name_tj: '',
      description: '', description_ru: '', description_tj: '',
      price: 0, xp_reward: 10, category_id: '', image_url: '', images: [], sizes: '', colors: '', stock: 100, in_stock: true, arrival_date: ''
    });
      setProductImages([]); // Clear uploaded images
      setImageUrls(['']); // Reset URLs
      fetchAllData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Ошибка сохранения товара');
    }
  };

  const handleDeleteProduct = async (id) => {
    if (!window.confirm('Удалить этот товар?')) return;
    try {
      await productsAPI.delete(id);
      toast.success('Товар удалён');
      fetchAllData();
    } catch (error) {
      toast.error('Ошибка удаления товара');
    }
  };

  // Category handlers
  const handleCreateCategory = async (e) => {
    e.preventDefault();
    try {
      await categoriesAPI.create(newCategory);
      toast.success('Category created');
      setNewCategory({ name: '', name_ru: '', name_tj: '', slug: '', description: '', parent_id: '' });
      fetchAllData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create category');
    }
  };

  const handleDeleteCategory = async (id) => {
    if (!window.confirm('Delete this category?')) return;
    try {
      await categoriesAPI.delete(id);
      toast.success('Category deleted');
      fetchAllData();
    } catch (error) {
      toast.error('Failed to delete category');
    }
  };

  // Topup code handlers
  const handleQuickThemeSwitch = async (themeId) => {
    setIsSwitchingTheme(true);
    try {
      const updatedSettings = {
        ...adminSettings,
        active_theme: themeId
      };
      await adminAPI.updateSettings(updatedSettings);
      setAdminSettings(updatedSettings);
      toast.success(`Тема переключена на ${themes.find(t => t.theme_id === themeId)?.name || themeId}`);
    } catch (error) {
      toast.error('Ошибка переключения темы');
    } finally {
      setIsSwitchingTheme(false);
    }
  };

  const handleCreateTopupCode = async (e) => {
    e.preventDefault();
    try {
      await adminAPI.createTopupCode(newTopupCode);
      toast.success('Code created');
      setNewTopupCode({ code: '', amount: 100 });
      fetchAllData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create code');
    }
  };

  const handleDeleteTopupCode = async (id) => {
    try {
      await adminAPI.deleteTopupCode(id);
      toast.success('Code deleted');
      fetchAllData();
    } catch (error) {
      toast.error('Failed to delete code');
    }
  };

  // Top-up request handlers
  const handleApproveRequest = async (id) => {
    try {
      await adminAPI.approveTopupRequest(id);
      toast.success('Request approved');
      fetchAllData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to approve');
    }
  };

  const handleRejectRequest = async (id) => {
    const note = prompt('Reason for rejection (optional):');
    try {
      await adminAPI.rejectTopupRequest(id, note || '');
      toast.success('Request rejected');
      fetchAllData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to reject');
    }
  };

  const handleApproveWithdrawal = async (id) => {
    if (!window.confirm('Одобрить вывод средств?')) return;
    try {
      await adminAPI.approveWithdrawalRequest(id);
      toast.success('Вывод одобрен');
      fetchAllData();
    } catch (error) {
      toast.error('Ошибка одобрения вывода');
    }
  };

  const handleRejectWithdrawal = async (id) => {
    const note = window.prompt('Причина отклонения:', 'Неверные данные карты');
    if (note === null) return;
    try {
      await adminAPI.rejectWithdrawalRequest(id, note);
      toast.success('Вывод отклонен, средства возвращены пользователю');
      fetchAllData();
    } catch (error) {
      toast.error('Ошибка отклонения вывода');
    }
  };

  const handleApproveReturn = async (orderId) => {
    if (!window.confirm('Одобрить возврат? 90% от фактически оплаченной суммы будет автоматически возвращено на баланс пользователя.')) return;
    try {
      await adminAPI.approveReturn(orderId);
      toast.success('Возврат одобрен, средства возвращены');
      fetchAllData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Ошибка при одобрении возврата');
    }
  };

  // Settings handlers
  const handleSaveSettings = async () => {
    try {
      await adminAPI.updateSettings({
        ...adminSettings,
        active_theme: adminSettings.active_theme || 'default'
      });
      toast.success('Settings saved');
    } catch (error) {
      toast.error('Failed to save settings');
    }
  };

  // Admin profile handlers
  const handleCreateTheme = async (e) => {
    e.preventDefault();
    try {
      await adminAPI.createTheme(newTheme);
      toast.success('Тема создана!');
      setNewTheme({ name: '', icon: '🎨', hero_image: '', gradient: '', title_color: '', tagline: '' });
      setShowThemeForm(false);
      fetchAllData();
    } catch (error) {
      toast.error('Ошибка создания темы');
    }
  };

  const handleDeleteTheme = async (id) => {
    if (!window.confirm('Удалить эту тему?')) return;
    try {
      await adminAPI.deleteTheme(id);
      toast.success('Тема удалена');
      fetchAllData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Ошибка удаления темы');
    }
  };

  const handleSaveAdminProfile = async () => {
    // Check secret key
    if (adminSecretKey !== ADMIN_SECRET) {
      toast.error('Неверное ключевое слово! / Калимаи асосӣ нодуруст!');
      return;
    }
    
    try {
      const updates = {};
      if (adminEmail && adminEmail !== user?.email) updates.email = adminEmail;
      if (adminPassword) updates.password = adminPassword;
      if (adminName && adminName !== user?.name) updates.name = adminName;
      
      if (Object.keys(updates).length === 0) {
        toast.info('Нет изменений');
        return;
      }
      
      await adminAPI.updateProfile(updates);
      toast.success('Профиль обновлён! Войдите заново.');
      setAdminPassword('');
      setAdminSecretKey('');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Ошибка обновления профиля');
    }
  };

  // User management handlers
  const handleUpdateUserRole = async (userId, newRole) => {
    const targetUser = users.find(u => u.user_id === userId);
    if (targetUser && (targetUser.is_admin || targetUser.role === 'admin') && userId !== user?.user_id) {
      toast.error('Нельзя изменять роль другого администратора');
      return;
    }
    try {
      await adminAPI.updateUserRole(userId, newRole);
      toast.success('Роль пользователя обновлена');
      fetchAllData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Ошибка обновления роли');
    }
  };

  const handleToggleAdmin = async (userId, currentIsAdmin) => {
    const targetUser = users.find(u => u.user_id === userId);
    if (targetUser && (targetUser.is_admin || targetUser.role === 'admin') && userId !== user?.user_id) {
      toast.error('Нельзя изменять статус администратора другого администратора');
      return;
    }
    try {
      await adminAPI.toggleAdmin(userId, !currentIsAdmin);
      toast.success('User status updated');
      fetchAllData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update user');
    }
  };

  const handleDeleteUser = async (userId) => {
    const targetUser = users.find(u => u.user_id === userId);
    if (targetUser && (targetUser.is_admin || targetUser.role === 'admin')) {
      toast.error('Нельзя удалить администратора');
      return;
    }
    if (!window.confirm('Delete this user? This cannot be undone.')) return;
    try {
      await adminAPI.deleteUser(userId);
      toast.success('User deleted');
      fetchAllData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete user');
    }
  };

  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    try {
      await adminAPI.updateOrderStatus(orderId, newStatus);
      toast.success(`Статус обновлен: ${newStatus}`);
      fetchAllData();
    } catch (error) {
      toast.error('Ошибка обновления статуса');
    }
  };

  const handleDeleteOrder = async (orderId) => {
    if (!window.confirm('Вы уверены, что хотите удалить этот заказ?')) return;
    try {
      await adminAPI.deleteOrder(orderId);
      toast.success('Заказ удален');
      fetchAllData();
    } catch (error) {
      toast.error('Ошибка при удалении заказа');
    }
  };

  const handleEditUser = (u) => {
    setEditingUser(u);
    setEditBalance(u.balance?.toString() || '0');
    setEditXP(u.xp?.toString() || '0');
  };

  const handleEditProduct = (p) => {
    setEditingProduct(p);
    setNewProduct({
      ...p,
      in_stock: p.in_stock !== undefined ? p.in_stock : true,
      arrival_date: p.arrival_date || '',
      sizes: Array.isArray(p.sizes) ? p.sizes.join(', ') : (p.sizes || ''),
      colors: Array.isArray(p.colors) ? p.colors.join(', ') : (p.colors || '')
    });
    
    // Set uploaded images
    setProductImages(p.images?.filter(img => img.startsWith('data:')) || []);
    
    // Set URL images
    const urls = p.images?.filter(img => img.startsWith('http')) || [];
    setImageUrls(urls.length > 0 ? urls : ['']);
    
    // Scroll to form
    const formElement = document.querySelector('[data-testid="create-product-form"]');
    if (formElement) formElement.scrollIntoView({ behavior: 'smooth' });
  };

  const handleCancelEditProduct = () => {
    setEditingProduct(null);
    setNewProduct({ 
      name: '', name_ru: '', name_tj: '',
      description: '', description_ru: '', description_tj: '',
      price: 0, xp_reward: 10, category_id: '', image_url: '', images: [], sizes: '', stock: 100 
    });
    setProductImages([]);
    setImageUrls(['']);
  };

  const handleSaveUserEdit = async () => {
    if (!editingUser) return;
    if ((editingUser.is_admin || editingUser.role === 'admin') && editingUser.user_id !== user?.user_id) {
      toast.error('Нельзя изменять данные другого администратора');
      return;
    }
    try {
      await adminAPI.updateUserBalance(editingUser.user_id, parseFloat(editBalance));
      await adminAPI.updateUserXP(editingUser.user_id, parseInt(editXP));
      toast.success('User updated');
      setEditingUser(null);
      fetchAllData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update user');
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
    // Scroll to form
    const formElement = document.querySelector('[data-testid="reward-form"]');
    if (formElement) formElement.scrollIntoView({ behavior: 'smooth' });
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
      fetchAllData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save reward');
    }
  };

  const handleDeleteReward = async (id) => {
    if (!window.confirm('Удалить эту награду?')) return;
    try {
      await adminAPI.deleteReward(id);
      toast.success('Reward deleted');
      fetchAllData();
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
    // Scroll to form
    const formElement = document.querySelector('[data-testid="prize-form"]');
    if (formElement) formElement.scrollIntoView({ behavior: 'smooth' });
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
      fetchAllData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save prize');
    }
  };

  const handleDeletePrize = async (id) => {
    if (!window.confirm('Удалить этот приз?')) return;
    try {
      await adminAPI.deleteWheelPrize(id);
      toast.success('Prize deleted');
      fetchAllData();
    } catch (error) {
      toast.error('Failed to delete prize');
    }
  };

  // Promo code handlers
  const handleCreatePromoCode = async (e) => {
    e.preventDefault();
    if (!newPromoCode.code.trim()) {
      toast.error('Введите код промокода');
      return;
    }
    try {
      const promoData = {
        ...newPromoCode,
        expires_at: newPromoCode.expires_at ? new Date(newPromoCode.expires_at).toISOString() : null
      };
      await adminAPI.createPromoCode(promoData);
      toast.success('Промокод создан!');
      setNewPromoCode({ code: '', discount_percent: 10, usage_limit: 0, expires_at: '' });
      fetchAllData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Ошибка создания промокода');
    }
  };

  const handleDeletePromoCode = async (id) => {
    try {
      await adminAPI.deletePromoCode(id);
      toast.success('Промокод удалён');
      fetchAllData();
    } catch (error) {
      toast.error('Ошибка удаления промокода');
    }
  };

  const handleTogglePromoCode = async (id) => {
    try {
      await adminAPI.togglePromoCode(id);
      toast.success('Статус изменён');
      fetchAllData();
    } catch (error) {
      toast.error('Ошибка изменения статуса');
    }
  };

  // Product discount handler
  const handleUpdateProductDiscount = async (productId, discountPercent) => {
    try {
      await adminAPI.updateProductDiscount(productId, discountPercent);
      toast.success('Скидка обновлена');
      fetchAllData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Ошибка обновления скидки');
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
    // Scroll to form
    const formElement = document.querySelector('[data-testid="mission-form"]');
    if (formElement) formElement.scrollIntoView({ behavior: 'smooth' });
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
      fetchAllData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Ошибка сохранения миссии');
    }
  };

  const handleDeleteMission = async (id) => {
    if (!window.confirm('Удалить эту миссию?')) return;
    try {
      await adminAPI.deleteMission(id);
      toast.success('Миссия удалена');
      fetchAllData();
    } catch (error) {
      toast.error('Ошибка удаления миссии');
    }
  };

  const handleToggleMission = async (id) => {
    try {
      await adminAPI.toggleMission(id);
      toast.success('Статус изменён');
      fetchAllData();
    } catch (error) {
      toast.error('Ошибка изменения статуса');
    }
  };

  // Tag handlers
  const handleCreateTag = async (e) => {
    e.preventDefault();
    if (!newTag.name.trim() || !newTag.slug.trim()) {
      toast.error('Заполните все поля');
      return;
    }
    try {
      await adminAPI.createTag(newTag);
      toast.success('Тег создан!');
      setNewTag({ name: '', slug: '', color: '#0D9488' });
      fetchAllData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Ошибка создания тега');
    }
  };

  const handleDeleteTag = async (id) => {
    try {
      await adminAPI.deleteTag(id);
      toast.success('Тег удалён');
      fetchAllData();
    } catch (error) {
      toast.error('Ошибка удаления тега');
    }
  };

  // Support ticket handler
  const handleRespondTicket = async (ticketId, response) => {
    if (!response.trim()) {
      toast.error('Введите ответ');
      return;
    }
    try {
      await adminAPI.respondToTicket(ticketId, response, 'resolved');
      toast.success('Ответ отправлен');
      fetchAllData();
    } catch (error) {
      toast.error('Ошибка отправки ответа');
    }
  };

  // Bank card handlers
  const handleCreateBankCard = async (e) => {
    e.preventDefault();
    if (!newBankCard.card_number || !newBankCard.card_holder || !newBankCard.bank_name) {
      toast.error('Заполните все поля');
      return;
    }
    try {
      await adminAPI.createBankCard(newBankCard);
      toast.success('Карта добавлена!');
      setNewBankCard({ card_number: '', card_holder: '', bank_name: '' });
      fetchAllData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Ошибка добавления карты');
    }
  };

  const handleToggleBankCard = async (id) => {
    try {
      await adminAPI.toggleBankCard(id);
      toast.success('Статус изменён');
      fetchAllData();
    } catch (error) {
      toast.error('Ошибка изменения статуса');
    }
  };

  const handleDeleteBankCard = async (id) => {
    try {
      await adminAPI.deleteBankCard(id);
      toast.success('Карта удалена');
      fetchAllData();
    } catch (error) {
      toast.error('Ошибка удаления карты');
    }
  };

  // Delivery Methods handlers
  const handleCreateDeliveryMethod = async (e) => {
    e.preventDefault();
    try {
      if (editingDeliveryMethod) {
        await adminAPI.updateDeliveryMethod(editingDeliveryMethod.method_id, newDeliveryMethod);
        toast.success('Способ доставки обновлен');
        setEditingDeliveryMethod(null);
      } else {
        await adminAPI.createDeliveryMethod(newDeliveryMethod);
        toast.success('Способ доставки создан');
      }
      setNewDeliveryMethod({ name: '', description: '', cost: 0, delivery_days: 1 });
      fetchAllData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Ошибка сохранения способа доставки');
    }
  };

  const handleDeleteDeliveryMethod = async (id) => {
    if (!window.confirm('Удалить этот способ доставки?')) return;
    try {
      await adminAPI.deleteDeliveryMethod(id);
      toast.success('Способ доставки удален');
      fetchAllData();
    } catch (error) {
      toast.error('Ошибка удаления');
    }
  };

  const handleToggleDeliveryMethod = async (id, newStatus) => {
    try {
      await adminAPI.updateDeliveryMethod(id, { is_active: newStatus });
      toast.success(newStatus ? 'Способ активирован' : 'Способ деактивирован');
      fetchAllData();
    } catch (error) {
      toast.error('Ошибка обновления');
    }
  };

  // Image upload handler
  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProductImages(prev => [...prev, reader.result]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveImage = (index) => {
    setProductImages(prev => prev.filter((_, i) => i !== index));
  };

  const pendingRequests = topupRequests.filter(r => r.status === 'pending');
  const pendingWithdrawals = withdrawalRequests.filter(r => r.status === 'pending');
  const openTickets = supportTickets.filter(t => t.status === 'open');

  // Group orders by user
  const groupedOrders = orders.reduce((acc, order) => {
    const userId = order.user_id || 'unknown';
    if (!acc[userId]) {
      acc[userId] = {
        user_id: userId,
        user_name: order.user_name || 'Unknown User',
        user_email: order.user_email || '',
        orders: []
      };
    }
    acc[userId].orders.push(order);
    return acc;
  }, {});

  // Sort users by their latest order date
  const sortedGroupedOrders = Object.values(groupedOrders).sort((a, b) => {
    const latestA = new Date(a.orders[0]?.created_at || 0);
    const latestB = new Date(b.orders[0]?.created_at || 0);
    return latestB - latestA;
  });

  // Check if user is admin or helper
  const isHelper = user?.role === 'helper';
  const canAccessAdmin = isAdmin || isHelper;

  // Show loading while auth is being verified
  if (authLoading) {
    return (
      <div className="min-h-screen admin-panel flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!canAccessAdmin) return null;

  if (loading) {
    return (
      <div className="min-h-screen admin-panel flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen admin-panel" data-testid="admin-page">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <Settings className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">{t('admin.title')}</h1>
              <p className="text-slate-400">{t('admin.subtitle')}</p>
            </div>
          </div>
          
          {/* Quick Theme Switcher */}
          <div className="flex items-center gap-2 bg-slate-800/50 p-2 rounded-2xl border border-slate-700 overflow-x-auto no-scrollbar">
            <span className="text-xs font-bold text-slate-500 uppercase ml-2 mr-1 whitespace-nowrap">Стиль:</span>
            {themes.map((theme) => (
              <Button
                key={theme.theme_id}
                variant="ghost"
                size="sm"
                disabled={isSwitchingTheme}
                onClick={() => handleQuickThemeSwitch(theme.theme_id)}
                className={`rounded-xl h-9 px-3 flex items-center gap-2 transition-all ${
                  (adminSettings.active_theme || 'default') === theme.theme_id
                    ? 'bg-primary text-white shadow-lg shadow-primary/20'
                    : 'hover:bg-slate-700 text-slate-300'
                }`}
              >
                <span className="text-lg">{theme.icon}</span>
                <span className="text-xs font-bold whitespace-nowrap">{theme.name}</span>
              </Button>
            ))}
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8" data-testid="admin-stats">
            <div className="admin-card">
              <Users className="w-6 h-6 text-primary mb-2" />
              <p className="text-2xl font-black">{stats.users_count}</p>
              <p className="text-sm text-slate-400">{t('admin.totalUsers')}</p>
            </div>
            <div className="admin-card">
              <Package className="w-6 h-6 text-primary mb-2" />
              <p className="text-2xl font-black">{stats.products_count}</p>
              <p className="text-sm text-slate-400">{t('admin.totalProducts')}</p>
            </div>
            <div className="admin-card">
              <ShoppingCart className="w-6 h-6 text-primary mb-2" />
              <p className="text-2xl font-black">{stats.orders_count}</p>
              <p className="text-sm text-slate-400">{t('admin.totalOrders')}</p>
            </div>
            <div className="admin-card group relative">
              <BarChart3 className="w-6 h-6 text-primary mb-2" />
              {isEditingRevenue ? (
                <div className="flex items-center gap-2 mb-1">
                  <Input 
                    type="number" 
                    value={newRevenueValue} 
                    onChange={(e) => setNewRevenueValue(e.target.value)}
                    className="admin-input h-8 w-24 text-sm"
                    autoFocus
                  />
                  <Button size="icon" className="h-7 w-7 bg-green-600" onClick={async () => {
                    try {
                      await adminAPI.updateRevenue(parseFloat(newRevenueValue));
                      toast.success('Выручка обновлена');
                      setIsEditingRevenue(false);
                      fetchAllData();
                    } catch (e) {
                      toast.error('Ошибка обновления');
                    }
                  }}>
                    <Check className="w-3 h-3" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setIsEditingRevenue(false)}>
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-black">
                    {stats.total_revenue?.toFixed(0)}
                    {stats.is_custom_revenue && <span className="text-xs text-yellow-500 ml-1" title="Установлено вручную">*</span>}
                  </p>
                  {isAdmin && (
                    <button 
                      onClick={() => {
                        setNewRevenueValue(stats.total_revenue?.toString());
                        setIsEditingRevenue(true);
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-slate-700 rounded"
                    >
                      <Edit className="w-3 h-3 text-slate-400" />
                    </button>
                  )}
                </div>
              )}
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-400">{t('admin.totalRevenue')}</p>
                {stats.is_custom_revenue && isAdmin && !isEditingRevenue && (
                  <button 
                    onClick={async () => {
                      if (window.confirm('Сбросить выручку к реальным значениям?')) {
                        try {
                          await adminAPI.resetRevenue();
                          toast.success('Выручка сброшена');
                          fetchAllData();
                        } catch (e) {
                          toast.error('Ошибка сброса');
                        }
                      }
                    }}
                    className="text-[10px] text-yellow-500 hover:underline"
                  >
                    Сброс
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Pending Requests Alert */}
        {pendingRequests.length > 0 && (
          <div className="mb-6 p-4 bg-yellow-500/20 border border-yellow-500/50 rounded-xl flex items-center gap-3">
            <Clock className="w-6 h-6 text-yellow-400" />
            <p className="text-yellow-200">
              <span className="font-bold">{pendingRequests.length}</span> {t('admin.topupRequests')} ожидают проверки!
            </p>
          </div>
        )}

        {/* Tabs */}
        <Tabs defaultValue="requests" className="space-y-6">
          <TabsList className="bg-slate-800 border border-slate-700 flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="requests" className="relative" data-testid="tab-requests">
              {t('admin.topupRequests')}
              {pendingRequests.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-500 text-black text-xs font-bold rounded-full flex items-center justify-center">
                  {pendingRequests.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="withdrawals" className="relative" data-testid="tab-withdrawals">
              Выводы
              {pendingWithdrawals.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-500 text-black text-xs font-bold rounded-full flex items-center justify-center">
                  {pendingWithdrawals.length}
                </span>
              )}
            </TabsTrigger>
            {isAdmin && <TabsTrigger value="settings" data-testid="tab-settings">{t('admin.settings')}</TabsTrigger>}
            <TabsTrigger value="themes" data-testid="tab-themes">Стили</TabsTrigger>
            <TabsTrigger value="discounts" data-testid="tab-discounts">Скидки</TabsTrigger>
            <TabsTrigger value="missions" data-testid="tab-missions">
              <Target className="w-4 h-4 mr-1" />
              Миссии
            </TabsTrigger>
            <TabsTrigger value="tags" data-testid="tab-tags">
              <Tag className="w-4 h-4 mr-1" />
              Теги
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="bank-cards" data-testid="tab-bank-cards">
                <CreditCard className="w-4 h-4 mr-1" />
                Карты
              </TabsTrigger>
            )}
            {isAdmin && (
              <TabsTrigger value="delivery" data-testid="tab-delivery">
                <Truck className="w-4 h-4 mr-1" />
                Доставка
              </TabsTrigger>
            )}
            <TabsTrigger value="support" data-testid="tab-support" className="relative">
              <MessageSquare className="w-4 h-4 mr-1" />
              Поддержка
              {openTickets.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {openTickets.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="users" data-testid="tab-users">{t('admin.users')}</TabsTrigger>
            <TabsTrigger value="products" data-testid="tab-products">{t('admin.products')}</TabsTrigger>
            <TabsTrigger value="categories" data-testid="tab-categories">{t('admin.categories')}</TabsTrigger>
            <TabsTrigger value="rewards" data-testid="tab-rewards">{t('admin.rewards')}</TabsTrigger>
            <TabsTrigger value="wheel" data-testid="tab-wheel">{t('admin.wheel')}</TabsTrigger>
            <TabsTrigger value="orders" data-testid="tab-orders">{t('admin.orders')}</TabsTrigger>
          </TabsList>

          {/* Top-up Requests Tab */}
          <TabsContent value="requests" className="space-y-6">
            <div className="admin-card">
              <h3 className="font-bold mb-4">{t('admin.topupRequests')} ({topupRequests.length})</h3>
              <div className="space-y-4 max-h-[600px] overflow-y-auto">
                {topupRequests.length === 0 ? (
                  <p className="text-slate-400 text-center py-8">Заявок пока нет</p>
                ) : (
                  topupRequests.map((req) => (
                    <div key={req.request_id} className="p-4 bg-slate-700 rounded-lg" data-testid={`request-${req.request_id}`}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            {req.status === 'pending' && <Clock className="w-5 h-5 text-yellow-400" />}
                            {req.status === 'approved' && <CheckCircle className="w-5 h-5 text-green-400" />}
                            {req.status === 'rejected' && <XCircle className="w-5 h-5 text-red-400" />}
                            <span className="font-bold text-xl text-primary">+{req.amount}</span>
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              req.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                              req.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                              'bg-red-500/20 text-red-400'
                            }`}>
                              {t(`topup.status.${req.status}`)}
                            </span>
                          </div>
                          <p className="text-sm"><span className="text-slate-400">User:</span> {req.user_name} ({req.user_email})</p>
                          <p className="text-xs text-slate-400 mt-1">{new Date(req.created_at).toLocaleString()}</p>
                        </div>
                        
                        {/* Receipt preview */}
                        {req.receipt_url && (
                          <button 
                            onClick={() => setViewingImage(req.receipt_url)} 
                            className="shrink-0"
                          >
                            <img 
                              src={req.receipt_url} 
                              alt="Receipt" 
                              className="w-24 h-24 object-cover rounded-lg border border-slate-600 hover:border-primary transition-colors cursor-pointer"
                            />
                            <p className="text-xs text-center mt-1 text-primary">Нажмите для увеличения</p>
                          </button>
                        )}
                      </div>
                      
                      {req.status === 'pending' && (
                        <div className="flex gap-2 mt-4">
                          <Button 
                            onClick={() => handleApproveRequest(req.request_id)}
                            className="bg-green-600 hover:bg-green-700"
                            data-testid={`approve-${req.request_id}`}
                          >
                            <Check className="w-4 h-4 mr-1" />
                            {t('admin.approve')}
                          </Button>
                          <Button 
                            variant="destructive"
                            onClick={() => handleRejectRequest(req.request_id)}
                            data-testid={`reject-${req.request_id}`}
                          >
                            <X className="w-4 h-4 mr-1" />
                            {t('admin.reject')}
                          </Button>
                        </div>
                      )}
                      
                      {req.admin_note && (
                        <p className="text-sm text-slate-400 mt-2">Примечание: {req.admin_note}</p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="withdrawals" className="space-y-6">
            <div className="admin-card">
              <h3 className="font-bold mb-6 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary" />
                Заявки на вывод средств
              </h3>
              <div className="space-y-4">
                {withdrawalRequests.length === 0 ? (
                  <div className="text-center py-12 bg-slate-800/30 rounded-2xl border border-dashed border-slate-700">
                    <CreditCard className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-400">Заявок на вывод пока нет</p>
                  </div>
                ) : (
                  withdrawalRequests.map((req) => (
                    <div key={req.request_id} className="p-4 bg-slate-800/50 rounded-xl border border-slate-700 hover:border-slate-600 transition-all">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-3">
                            <span className="text-xl font-black text-primary">{req.amount}</span>
                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                              req.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                              req.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                              'bg-red-500/20 text-red-400'
                            }`}>
                              {req.status === 'pending' ? 'Ожидает' : req.status === 'approved' ? 'Выполнено' : 'Отклонено'}
                            </span>
                          </div>
                          <p className="text-sm font-bold text-slate-200">Карта: {req.card_number}</p>
                          <p className="text-sm"><span className="text-slate-400">User:</span> {req.user_name} ({req.user_email})</p>
                          <p className="text-xs text-slate-400 mt-1">{new Date(req.created_at).toLocaleString()}</p>
                        </div>
                        
                        {req.status === 'pending' && (
                          <div className="flex gap-2">
                            <Button 
                              onClick={() => handleApproveWithdrawal(req.request_id)}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <Check className="w-4 h-4 mr-1" />
                              Одобрить
                            </Button>
                            <Button 
                              variant="destructive"
                              onClick={() => handleRejectWithdrawal(req.request_id)}
                            >
                              <X className="w-4 h-4 mr-1" />
                              Отклонить
                            </Button>
                          </div>
                        )}
                      </div>
                      
                      {req.admin_note && (
                        <p className="text-sm text-slate-400 mt-2 p-2 bg-slate-900/50 rounded-lg border border-slate-700">
                          Примечание: {req.admin_note}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            {/* Daily Bonus Settings */}
            <div className="admin-card">
              <h3 className="font-bold mb-4 flex items-center gap-2 text-orange-500">
                <Gift className="w-5 h-5" />
                Настройки ежедневного бонуса
              </h3>
              <p className="text-sm text-slate-400 mb-6">
                Укажите количество монет и XP, которые пользователи будут получать каждый день.
              </p>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <Label>Монеты за вход</Label>
                  <Input
                    type="number"
                    value={adminSettings.daily_bonus_coins}
                    onChange={(e) => setAdminSettings({...adminSettings, daily_bonus_coins: parseFloat(e.target.value)})}
                    className="admin-input"
                    placeholder="10.0"
                  />
                </div>
                <div>
                  <Label>XP за вход</Label>
                  <Input
                    type="number"
                    value={adminSettings.daily_bonus_xp}
                    onChange={(e) => setAdminSettings({...adminSettings, daily_bonus_xp: parseInt(e.target.value)})}
                    className="admin-input"
                    placeholder="50"
                  />
                </div>
              </div>
              <Button 
                onClick={handleSaveSettings} 
                className="mt-6 tsmarket-btn-primary w-full md:w-auto"
              >
                Сохранить настройки бонуса
              </Button>
            </div>

            {/* TOP 10 Rewards Settings */}
            <div className="admin-card">
              <h3 className="font-bold mb-4 flex items-center gap-2 text-yellow-500">
                <Trophy className="w-5 h-5" />
                Настройки наград ТОП-10
              </h3>
              <p className="text-sm text-slate-400 mb-6">
                Укажите награды, которые будут отображаться в лидерборде для первых 10 мест.
                <br />
                <span className="text-orange-400 font-bold">Примечание:</span> Скидки для ТОП-10 удваиваются автоматически.
              </p>
              
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                {[...Array(10)].map((_, i) => {
                  const rank = i + 1;
                  const reward = adminSettings.top_rewards?.find(r => r.rank === rank) || { rank, reward_text: '', coins: 0, xp: 0 };
                  
                  return (
                    <div key={rank} className="p-4 bg-slate-800/50 rounded-xl border border-slate-700 flex flex-col md:flex-row gap-4 items-end">
                      <div className="shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-slate-700 font-bold text-primary border border-slate-600">
                        {rank}
                      </div>
                      <div className="flex-1 w-full">
                        <Label className="text-[10px] uppercase text-slate-500">Текст награды (напр. "iPhone 16")</Label>
                        <Input
                          value={reward.reward_text}
                          onChange={(e) => {
                            const newRewards = [...(adminSettings.top_rewards || [])];
                            const idx = newRewards.findIndex(r => r.rank === rank);
                            if (idx > -1) {
                              newRewards[idx] = { ...newRewards[idx], reward_text: e.target.value };
                            } else {
                              newRewards.push({ rank, reward_text: e.target.value, coins: 0, xp: 0 });
                            }
                            setAdminSettings({ ...adminSettings, top_rewards: newRewards });
                          }}
                          className="admin-input"
                          placeholder="Награда за это место..."
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="admin-card" data-testid="card-settings">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                {t('admin.cardSettings')}
              </h3>
              <div className="space-y-4">
                <div>
                  <Label>{t('admin.cardForPayments')}</Label>
                  <Input
                    value={adminSettings.card_number}
                    onChange={(e) => setAdminSettings({...adminSettings, card_number: e.target.value})}
                    className="admin-input font-mono text-lg"
                    placeholder="0000 0000 0000 0000"
                    data-testid="card-number-input"
                  />
                </div>
                <div>
                  <Label>Имя держателя карты</Label>
                  <Input
                    value={adminSettings.card_holder}
                    onChange={(e) => setAdminSettings({...adminSettings, card_holder: e.target.value})}
                    className="admin-input"
                    placeholder="IVAN IVANOV"
                  />
                </div>
                <div>
                  <Label>Дополнительная информация</Label>
                  <Input
                    value={adminSettings.additional_info}
                    onChange={(e) => setAdminSettings({...adminSettings, additional_info: e.target.value})}
                    className="admin-input"
                    placeholder="Банк, комментарий к переводу и т.д."
                  />
                </div>
              </div>
            </div>

            {/* Support Contacts Settings */}
            <div className="admin-card">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Контакты поддержки
              </h3>
              <p className="text-sm text-slate-400 mb-4">
                Эти контакты будут отображаться на странице поддержки для пользователей
              </p>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Telegram</Label>
                  <Input
                    value={adminSettings.support_telegram || ''}
                    onChange={(e) => setAdminSettings({...adminSettings, support_telegram: e.target.value})}
                    className="admin-input"
                    placeholder="@username или https://t.me/username"
                  />
                </div>
                <div>
                  <Label>WhatsApp</Label>
                  <Input
                    value={adminSettings.support_whatsapp || ''}
                    onChange={(e) => setAdminSettings({...adminSettings, support_whatsapp: e.target.value})}
                    className="admin-input"
                    placeholder="+992 XXX XX XX XX"
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={adminSettings.support_email || ''}
                    onChange={(e) => setAdminSettings({...adminSettings, support_email: e.target.value})}
                    className="admin-input"
                    placeholder="support@example.com"
                  />
                </div>
                <div>
                  <Label>Телефон</Label>
                  <Input
                    value={adminSettings.support_phone || ''}
                    onChange={(e) => setAdminSettings({...adminSettings, support_phone: e.target.value})}
                    className="admin-input"
                    placeholder="+992 XXX XX XX XX"
                  />
                </div>
              </div>
            </div>

            {/* AI Assistant Settings */}
            <div className="p-4 border border-slate-600 rounded-lg bg-gradient-to-r from-purple-900/20 to-blue-900/20">
              <h4 className="text-sm font-bold mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                🤖 AI Помощник для пополнений
              </h4>
              <p className="text-xs text-slate-400 mb-3">
                Когда включено, AI автоматически анализирует чеки и одобряет заявки, если сумма совпадает. 
                При сомнениях - оставляет для ручной проверки.
              </p>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={adminSettings.ai_auto_approve_enabled || false}
                  onChange={(e) => setAdminSettings({...adminSettings, ai_auto_approve_enabled: e.target.checked})}
                  className="w-5 h-5 rounded border-slate-600 bg-slate-800 text-primary focus:ring-primary"
                />
                <span className={`text-sm ${adminSettings.ai_auto_approve_enabled ? 'text-green-400' : 'text-slate-400'}`}>
                  {adminSettings.ai_auto_approve_enabled ? '✅ AI помощник включён' : '⏸️ AI помощник выключен'}
                </span>
              </label>
            </div>



            <Button onClick={handleSaveSettings} className="w-full" data-testid="save-settings-btn">
              {t('admin.saveSettings')}
            </Button>

            {/* Admin Profile Settings */}
            <div className="admin-card" data-testid="admin-profile-settings">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <User className="w-5 h-5" />
                Мой профиль / Профили ман
              </h3>
              <div className="space-y-4">
                <div>
                  <Label>Имя / Ном</Label>
                  <Input
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    className="admin-input"
                    placeholder="Admin"
                    data-testid="admin-name-input"
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    className="admin-input"
                    placeholder="admin@example.com"
                    data-testid="admin-email-input"
                  />
                </div>
                <div>
                  <Label>Новый пароль / Рамзи нав (оставьте пустым если не меняете)</Label>
                  <Input
                    type="password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    className="admin-input"
                    placeholder="••••••••"
                    data-testid="admin-password-input"
                  />
                </div>
                <div>
                  <Label className="text-yellow-400">Ключевое слово / Калимаи асосӣ *</Label>
                  <Input
                    type="password"
                    value={adminSecretKey}
                    onChange={(e) => setAdminSecretKey(e.target.value)}
                    className="admin-input border-yellow-500"
                    placeholder="Введите ключевое слово"
                    data-testid="admin-secret-input"
                  />
                  <p className="text-xs text-yellow-400 mt-1">Обязательно для сохранения изменений</p>
                </div>
                <Button onClick={handleSaveAdminProfile} className="w-full bg-blue-600 hover:bg-blue-700" data-testid="save-profile-btn">
                  Сохранить профиль / Нигоҳ доштани профил
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* Discounts Tab */}
          <TabsContent value="discounts" className="space-y-6">
            {/* Promo Codes Section */}
            <div className="admin-card">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Создать промокод
              </h3>
              <form onSubmit={handleCreatePromoCode} className="grid md:grid-cols-4 gap-4">
                <div>
                  <Label>Код</Label>
                  <Input
                    value={newPromoCode.code}
                    onChange={(e) => setNewPromoCode({...newPromoCode, code: e.target.value.toUpperCase()})}
                    className="admin-input font-mono"
                    placeholder="SALE2024"
                    required
                  />
                </div>
                <div>
                  <Label>Скидка (%)</Label>
                  <Input
                    type="number"
                    min="1"
                    max="100"
                    value={newPromoCode.discount_percent}
                    onChange={(e) => setNewPromoCode({...newPromoCode, discount_percent: parseFloat(e.target.value)})}
                    className="admin-input"
                    required
                  />
                </div>
                <div>
                  <Label>Лимит использований (0 = безлимит)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={newPromoCode.usage_limit}
                    onChange={(e) => setNewPromoCode({...newPromoCode, usage_limit: parseInt(e.target.value)})}
                    className="admin-input"
                  />
                </div>
                <div>
                  <Label>Дата истечения (необязательно)</Label>
                  <Input
                    type="datetime-local"
                    value={newPromoCode.expires_at}
                    onChange={(e) => setNewPromoCode({...newPromoCode, expires_at: e.target.value})}
                    className="admin-input"
                  />
                </div>
                <div className="flex items-end">
                  <Button type="submit" className="w-full">Создать</Button>
                </div>
              </form>
            </div>

            {/* Promo Codes List */}
            <div className="admin-card">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <Percent className="w-5 h-5" />
                Промокоды ({promoCodes.length})
              </h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {promoCodes.length === 0 ? (
                  <p className="text-slate-400 text-center py-4">Промокодов пока нет</p>
                ) : (
                  promoCodes.map((promo) => (
                    <div key={promo.promo_id} className="flex items-center justify-between p-3 bg-slate-700 rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className={`w-3 h-3 rounded-full ${promo.is_active ? 'bg-green-500' : 'bg-red-500'}`}></span>
                        <div>
                          <p className="font-bold font-mono">{promo.code}</p>
                          <p className="text-sm text-slate-400">
                            -{promo.discount_percent}% • 
                            {promo.usage_limit > 0 ? ` ${promo.times_used || 0}/${promo.usage_limit} использований` : ' безлимит'}
                            {promo.expires_at && (
                              <>
                                {' • '}
                                <span className={new Date(promo.expires_at) < new Date() ? "text-red-400" : ""}>
                                  До: {new Date(promo.expires_at).toLocaleString()}
                                </span>
                              </>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleTogglePromoCode(promo.promo_id)}
                        >
                          {promo.is_active ? 'Деактив.' : 'Актив.'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-500"
                          onClick={() => handleDeletePromoCode(promo.promo_id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Product Discounts Section */}
            <div className="admin-card">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <Tag className="w-5 h-5" />
                Скидки на товары
              </h3>
              <p className="text-sm text-slate-400 mb-4">
                Установите скидку в процентах на конкретный товар. Скидка будет применена к оригинальной цене.
              </p>
              <div className="space-y-2">
                {products.map((product) => (
                  <div key={product.product_id} className="flex items-center justify-between p-3 bg-slate-700 rounded-lg gap-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {product.image_url && (
                        <img src={product.image_url} alt={product.name} className="w-12 h-12 object-cover rounded" />
                      )}
                      <div className="min-w-0">
                        <p className="font-bold truncate">{product.name}</p>
                        <p className="text-sm text-slate-400">
                          {product.price} монет
                          {product.discount_percent > 0 && (
                            <span className="text-green-400 ml-2">
                              → {(product.price * (1 - product.discount_percent / 100)).toFixed(0)} монет
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          defaultValue={product.discount_percent || 0}
                          className="admin-input w-20 text-center"
                          onBlur={(e) => {
                            const newDiscount = parseFloat(e.target.value) || 0;
                            if (newDiscount !== (product.discount_percent || 0)) {
                              handleUpdateProductDiscount(product.product_id, newDiscount);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.target.blur();
                            }
                          }}
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400">%</span>
                      </div>
                      {product.discount_percent > 0 && (
                        <span className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded">
                          -{product.discount_percent}%
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Level Discounts Info */}
            <div className="admin-card bg-blue-500/10 border border-blue-500/30">
              <h3 className="font-bold mb-2 flex items-center gap-2 text-blue-400">
                <Sparkles className="w-5 h-5" />
                Скидки по уровню (автоматические)
              </h3>
              <p className="text-sm text-slate-300">
                Пользователи автоматически получают скидку в зависимости от их уровня: 
                <strong className="text-white"> 1% за каждый уровень (максимум 15%)</strong>.
              </p>
              <div className="mt-3 grid grid-cols-5 gap-2 text-center text-sm">
                <div className="p-2 bg-slate-700/50 rounded">Lvl 1: 1%</div>
                <div className="p-2 bg-slate-700/50 rounded">Lvl 5: 5%</div>
                <div className="p-2 bg-slate-700/50 rounded">Lvl 10: 10%</div>
                <div className="p-2 bg-slate-700/50 rounded">Lvl 15+: 15%</div>
              </div>
            </div>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6">
            <div className="admin-card">
              <h3 className="font-bold mb-4">{t('admin.users')} ({users.length})</h3>
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {users.map((u) => (
                  <div key={u.user_id} className="flex items-center justify-between p-3 bg-slate-700 rounded-lg" data-testid={`admin-user-${u.user_id}`}>
                    <div className="flex items-center gap-3">
                      {u.picture ? (
                        <img src={u.picture} alt={u.name} className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                          <span className="text-white font-bold">{u.name?.charAt(0)?.toUpperCase()}</span>
                        </div>
                      )}
                      <div>
                        <p className="font-bold">{u.name} {u.is_admin && <span className="text-red-400">(Admin)</span>}</p>
                        <p className="text-sm text-slate-400">{u.email}</p>
                        <p className="text-xs text-slate-500">
                          Lvl {u.level} • {u.xp} XP • {u.balance?.toFixed(0)} coins
                          {u.referred_by && (
                            <span className="ml-2 px-1.5 py-0.5 bg-indigo-500/20 text-indigo-400 rounded border border-indigo-500/30">
                              Promo: {u.referred_by}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleEditUser(u)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Select 
                        value={u.role || (u.is_admin ? 'admin' : 'user')} 
                        onValueChange={(newRole) => handleUpdateUserRole(u.user_id, newRole)}
                        disabled={u.user_id === user?.user_id}
                      >
                        <SelectTrigger className="w-[130px] h-8">
                          <SelectValue placeholder="Роль" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">Пользователь</SelectItem>
                          <SelectItem value="helper">Хелпер</SelectItem>
                          <SelectItem value="delivery">Доставщик</SelectItem>
                          <SelectItem value="admin">Админ</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => handleDeleteUser(u.user_id)}
                        disabled={u.user_id === user?.user_id}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Products Tab */}
          <TabsContent value="products" className="space-y-6">
            <div className="admin-card" data-testid="create-product-form">
              <h3 className="font-bold mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {editingProduct ? <Edit className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  {editingProduct ? 'Редактировать товар' : t('admin.addProduct')}
                </div>
                {editingProduct && (
                  <Button variant="ghost" size="sm" onClick={handleCancelEditProduct}>Отмена</Button>
                )}
              </h3>
              <form onSubmit={handleCreateProduct} className="space-y-4">
                {/* Multilingual Name Fields */}
                <div className="p-3 border border-slate-600 rounded-lg">
                  <Label className="text-sm text-slate-400 mb-2 block">Название товара</Label>
                  <div className="grid md:grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs">🇷🇺 Русский *</Label>
                      <Input value={newProduct.name_ru} onChange={(e) => setNewProduct({...newProduct, name_ru: e.target.value, name: e.target.value})} className="admin-input" placeholder="Название на русском" required />
                    </div>
                    <div>
                      <Label className="text-xs">🇹🇯 Тоҷикӣ</Label>
                      <Input value={newProduct.name_tj} onChange={(e) => setNewProduct({...newProduct, name_tj: e.target.value})} className="admin-input" placeholder="Номи тоҷикӣ" />
                    </div>
                    <div>
                      <Label className="text-xs">🌐 По умолчанию</Label>
                      <Input value={newProduct.name} onChange={(e) => setNewProduct({...newProduct, name: e.target.value})} className="admin-input" placeholder="Default name" />
                    </div>
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <Label>Цена</Label>
                    <Input type="number" value={newProduct.price} onChange={(e) => setNewProduct({...newProduct, price: parseFloat(e.target.value)})} className="admin-input" required />
                  </div>
                  <div>
                    <Label>XP награда</Label>
                    <Input type="number" value={newProduct.xp_reward} onChange={(e) => setNewProduct({...newProduct, xp_reward: parseInt(e.target.value)})} className="admin-input" required />
                  </div>
                  <div>
                    <Label>Категория</Label>
                    <Select value={newProduct.category_id} onValueChange={(v) => setNewProduct({...newProduct, category_id: v})}>
                      <SelectTrigger className="admin-input"><SelectValue placeholder="Выбрать" /></SelectTrigger>
                      <SelectContent>
                        {categories.filter(c => !c.parent_id).map((parentCat) => {
                          const subcats = categories.filter(c => c.parent_id === parentCat.category_id);
                          return (
                            <React.Fragment key={parentCat.category_id}>
                              <SelectItem value={parentCat.category_id} className="font-bold text-primary">
                                {parentCat.name_ru || parentCat.name}
                              </SelectItem>
                              {subcats.map((subcat) => (
                                <SelectItem key={subcat.category_id} value={subcat.category_id} className="pl-6 text-sm">
                                  ↳ {subcat.name_ru || subcat.name}
                                </SelectItem>
                              ))}
                            </React.Fragment>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Размеры (через запятую)</Label>
                    <Input value={newProduct.sizes} onChange={(e) => setNewProduct({...newProduct, sizes: e.target.value})} className="admin-input" placeholder="S, M, L" />
                  </div>
                  <div>
                    <Label>Цвета (через запятую)</Label>
                    <Input value={newProduct.colors} onChange={(e) => setNewProduct({...newProduct, colors: e.target.value})} className="admin-input" placeholder="Красный, Синий, Черный" />
                  </div>
                  <div className="space-y-2">
                    <Label>URL изображений</Label>
                    {imageUrls.map((url, index) => (
                      <div key={index} className="flex gap-2">
                        <Input 
                          value={url} 
                          onChange={(e) => {
                            const newUrls = [...imageUrls];
                            newUrls[index] = e.target.value;
                            setImageUrls(newUrls);
                          }} 
                          className="admin-input flex-1" 
                          placeholder="https://..." 
                        />
                        {imageUrls.length > 1 && (
                          <Button 
                            type="button" 
                            variant="destructive" 
                            size="icon" 
                            onClick={() => setImageUrls(imageUrls.filter((_, i) => i !== index))}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setImageUrls([...imageUrls, ''])}
                      className="w-full border-dashed"
                    >
                      <Plus className="w-4 h-4 mr-2" /> Добавить URL
                    </Button>
                  </div>
                  <div className="flex items-center gap-4 p-3 border border-slate-600 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="in_stock">В наличии</Label>
                      <input 
                        id="in_stock"
                        type="checkbox" 
                        checked={newProduct.in_stock} 
                        onChange={(e) => setNewProduct({...newProduct, in_stock: e.target.checked})}
                        className="w-4 h-4 accent-primary"
                      />
                    </div>
                    <div className="flex-1">
                      <Label>Дата прибытия (если нет)</Label>
                      <Input 
                        value={newProduct.arrival_date || ''} 
                        onChange={(e) => setNewProduct({...newProduct, arrival_date: e.target.value})} 
                        className="admin-input" 
                        placeholder="Напр: 15 февраля" 
                        disabled={newProduct.in_stock}
                      />
                    </div>
                  </div>
                </div>
                
                {/* Multilingual Description Fields */}
                <div className="p-3 border border-slate-600 rounded-lg">
                  <Label className="text-sm text-slate-400 mb-2 block">Описание товара</Label>
                  <div className="grid md:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">🇷🇺 Русский *</Label>
                      <Input value={newProduct.description_ru} onChange={(e) => setNewProduct({...newProduct, description_ru: e.target.value, description: e.target.value})} className="admin-input" placeholder="Описание на русском" required />
                    </div>
                    <div>
                      <Label className="text-xs">🇹🇯 Тоҷикӣ</Label>
                      <Input value={newProduct.description_tj} onChange={(e) => setNewProduct({...newProduct, description_tj: e.target.value})} className="admin-input" placeholder="Тавсифи тоҷикӣ" />
                    </div>
                  </div>
                </div>

                {/* Image Upload Section */}
                <div>
                  <Label className="mb-2 block">Загрузить изображения из галереи</Label>
                  <div className="flex flex-wrap gap-3 mb-3">
                    {productImages.map((img, index) => (
                      <div key={index} className="relative group">
                        <img src={img} alt={`Preview ${index + 1}`} className="w-20 h-20 object-cover rounded-lg border border-slate-600" />
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(index)}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-sm opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    <label className="w-20 h-20 border-2 border-dashed border-slate-600 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors">
                      <Plus className="w-6 h-6 text-slate-400" />
                      <span className="text-xs text-slate-400 mt-1">Добавить</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                  <p className="text-xs text-slate-400">Выберите одно или несколько изображений. Первое будет главным.</p>
                </div>

                <div className="flex gap-3">
                  <Button type="submit" className="flex-1 md:flex-none">
                    {editingProduct ? 'Сохранить изменения' : t('admin.create')}
                  </Button>
                  {editingProduct && (
                    <Button type="button" variant="outline" onClick={handleCancelEditProduct} className="flex-1 md:flex-none">
                      Отмена
                    </Button>
                  )}
                </div>
              </form>
            </div>

            <div className="admin-card">
              <h3 className="font-bold mb-4">{t('admin.products')} ({products.length})</h3>
              <div className="space-y-2">
                {products.map((p) => (
                  <div key={p.product_id} className="flex items-center justify-between p-3 bg-slate-700 rounded-lg">
                    <div className="flex items-center gap-3">
                      <img src={p.image_url} alt={p.name} className="w-10 h-10 rounded object-cover" />
                      <div>
                        <p className="font-bold">{p.name}</p>
                        <p className="text-sm text-slate-400">{p.price} coins • {p.xp_reward} XP</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" className="text-blue-400" onClick={() => handleEditProduct(p)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-red-500" onClick={() => handleDeleteProduct(p.product_id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Themes Tab */}
          <TabsContent value="themes" className="space-y-6">
            <div className="admin-card">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-yellow-400" />
                Стиль оформления магазина
              </h3>
              <p className="text-sm text-slate-400 mb-4">
                Выберите праздничную тему, чтобы изменить баннеры и цвета магазина одним кликом.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                {themes.map((theme) => (
                  <div key={theme.theme_id} className="relative group">
                    <button
                      onClick={() => setAdminSettings({...adminSettings, active_theme: theme.theme_id})}
                      className={`w-full p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                        (adminSettings.active_theme || 'default') === theme.theme_id 
                          ? 'border-primary bg-primary/10 shadow-[0_0_15px_rgba(13,148,136,0.3)]' 
                          : 'border-slate-700 hover:border-slate-500 bg-slate-800/50'
                      }`}
                    >
                      <span className="text-2xl">{theme.icon}</span>
                      <span className="text-xs font-bold uppercase">{theme.name}</span>
                      <div className="w-full h-1 rounded-full bg-primary/30" />
                    </button>
                    {!theme.is_system && (
                      <button 
                        onClick={() => handleDeleteTheme(theme.theme_id)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={() => setShowThemeForm(!showThemeForm)}
                  className="p-3 rounded-xl border-2 border-dashed border-slate-700 hover:border-primary hover:bg-primary/5 transition-all flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-primary"
                >
                  <Plus className="w-6 h-6" />
                  <span className="text-xs font-bold uppercase">Добавить</span>
                </button>
              </div>

              <div className="flex justify-end mb-6">
                <Button 
                  onClick={handleSaveSettings}
                  className="tsmarket-btn-primary px-6"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Применить выбранную тему
                </Button>
              </div>

              {showThemeForm && (
                <form onSubmit={handleCreateTheme} className="space-y-4 p-4 border border-slate-700 rounded-xl bg-slate-800/30 mb-6">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label>Название темы</Label>
                      <Input 
                        value={newTheme.name} 
                        onChange={e => setNewTheme({...newTheme, name: e.target.value})}
                        placeholder="Напр: Весенний стиль"
                        className="admin-input"
                        required
                      />
                    </div>
                    <div>
                      <Label>Иконка (Emoji)</Label>
                      <Input 
                        value={newTheme.icon} 
                        onChange={e => setNewTheme({...newTheme, icon: e.target.value})}
                        placeholder="🌸"
                        className="admin-input"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label>URL Баннера (Hero Image)</Label>
                      <Input 
                        value={newTheme.hero_image} 
                        onChange={e => setNewTheme({...newTheme, hero_image: e.target.value})}
                        placeholder="https://images.unsplash.com/..."
                        className="admin-input"
                        required
                      />
                    </div>
                    <div>
                      <Label>Gradient (Tailwind classes)</Label>
                      <Input 
                        value={newTheme.gradient} 
                        onChange={e => setNewTheme({...newTheme, gradient: e.target.value})}
                        placeholder="bg-gradient-to-br from-green-400 to-blue-500"
                        className="admin-input"
                        required
                      />
                    </div>
                    <div>
                      <Label>Цвет заголовка (Tailwind class)</Label>
                      <Input 
                        value={newTheme.title_color} 
                        onChange={e => setNewTheme({...newTheme, title_color: e.target.value})}
                        placeholder="text-green-500"
                        className="admin-input"
                        required
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label>Тэглайн (Текст в бабле)</Label>
                      <Input 
                        value={newTheme.tagline} 
                        onChange={e => setNewTheme({...newTheme, tagline: e.target.value})}
                        placeholder="🌸 Весенние скидки!"
                        className="admin-input"
                        required
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" className="flex-1">Создать тему</Button>
                    <Button type="button" variant="outline" onClick={() => setShowThemeForm(false)}>Отмена</Button>
                  </div>
                </form>
              )}
            </div>
          </TabsContent>

          {/* Categories Tab */}
          <TabsContent value="categories" className="space-y-6">
            <div className="admin-card">
              <h3 className="font-bold mb-4 flex items-center gap-2"><Plus className="w-4 h-4" /> {t('admin.addCategory')}</h3>
              <form onSubmit={handleCreateCategory} className="space-y-4">
                {/* Multilingual Name */}
                <div className="p-3 border border-slate-600 rounded-lg">
                  <Label className="text-sm text-slate-400 mb-2 block">Название категории</Label>
                  <div className="grid md:grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs">🇷🇺 Русский *</Label>
                      <Input 
                        value={newCategory.name_ru} 
                        onChange={(e) => setNewCategory({...newCategory, name_ru: e.target.value, name: e.target.value})} 
                        className="admin-input" 
                        placeholder="Название на русском"
                        required 
                      />
                    </div>
                    <div>
                      <Label className="text-xs">🇹🇯 Тоҷикӣ</Label>
                      <Input 
                        value={newCategory.name_tj} 
                        onChange={(e) => setNewCategory({...newCategory, name_tj: e.target.value})} 
                        className="admin-input" 
                        placeholder="Номи тоҷикӣ"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Slug (URL)</Label>
                      <Input 
                        value={newCategory.slug} 
                        onChange={(e) => setNewCategory({...newCategory, slug: e.target.value})} 
                        className="admin-input" 
                        placeholder="category-slug"
                        required 
                      />
                    </div>
                  </div>
                </div>
                
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <Label>Родительская категория</Label>
                    <Select 
                      value={newCategory.parent_id || 'none'} 
                      onValueChange={(v) => setNewCategory({...newCategory, parent_id: v === 'none' ? '' : v})}
                    >
                      <SelectTrigger className="admin-input">
                        <SelectValue placeholder="Без родителя (главная)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Без родителя (главная)</SelectItem>
                        {categories.filter(c => !c.parent_id).map((c) => (
                          <SelectItem key={c.category_id} value={c.category_id}>
                            {c.name_ru || c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Описание</Label>
                    <Input 
                      value={newCategory.description} 
                      onChange={(e) => setNewCategory({...newCategory, description: e.target.value})} 
                      className="admin-input" 
                      placeholder="Описание категории"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button type="submit" className="w-full">{t('admin.create')}</Button>
                  </div>
                </div>
              </form>
            </div>

            <div className="admin-card">
              <h3 className="font-bold mb-4">{t('admin.categories')} ({categories.length})</h3>
              <div className="space-y-2">
                {/* Parent categories */}
                {categories.filter(c => !c.parent_id).map((parentCat) => {
                  const subcats = categories.filter(c => c.parent_id === parentCat.category_id);
                  return (
                    <div key={parentCat.category_id}>
                      <div className="flex items-center justify-between p-3 bg-slate-700 rounded-lg">
                        <div>
                          <p className="font-bold">{parentCat.name_ru || parentCat.name}</p>
                          <p className="text-sm text-slate-400">{parentCat.slug} {parentCat.is_parent && <span className="text-xs text-primary">• Главная</span>}</p>
                        </div>
                        <Button variant="ghost" size="icon" className="text-red-500" onClick={() => handleDeleteCategory(parentCat.category_id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      {/* Subcategories */}
                      {subcats.length > 0 && (
                        <div className="ml-6 mt-2 space-y-2 border-l-2 border-slate-600 pl-4">
                          {subcats.map((subcat) => (
                            <div key={subcat.category_id} className="flex items-center justify-between p-2 bg-slate-800 rounded-lg">
                              <div>
                                <p className="font-medium text-sm">{subcat.name_ru || subcat.name}</p>
                                <p className="text-xs text-slate-500">{subcat.slug}</p>
                              </div>
                              <Button variant="ghost" size="icon" className="text-red-500 h-8 w-8" onClick={() => handleDeleteCategory(subcat.category_id)}>
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </TabsContent>

          {/* Rewards Tab */}
          <TabsContent value="rewards" className="space-y-6">
            <div className="admin-card" data-testid="reward-form">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                {editingReward ? <Edit className="w-4 h-4" /> : <Plus className="w-4 h-4" />} 
                {editingReward ? 'Редактировать награду' : t('admin.addReward')}
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
                  <Select value={newReward.reward_type} onValueChange={(v) => setNewReward({...newReward, reward_type: v})}>
                    <SelectTrigger className="admin-input"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="coins">Монеты</SelectItem>
                      <SelectItem value="xp_boost">XP буст</SelectItem>
                      <SelectItem value="discount">Скидка</SelectItem>
                    </SelectContent>
                  </Select>
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
                    <Button type="submit">{editingReward ? 'Сохранить' : t('admin.create')}</Button>
                    {editingReward && (
                      <Button type="button" variant="outline" onClick={handleCancelEditReward}>Отмена</Button>
                    )}
                  </div>
                </div>
              </form>
            </div>

            <div className="admin-card">
              <h3 className="font-bold mb-4">{t('admin.rewards')} ({rewards.length})</h3>
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
            <div className="admin-card" data-testid="prize-form">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                {editingPrize ? <Edit className="w-4 h-4" /> : <Plus className="w-4 h-4" />} 
                {editingPrize ? 'Редактировать приз' : t('admin.addPrize')}
              </h3>
              <form onSubmit={handleCreatePrize} className="grid md:grid-cols-5 gap-4">
                <div>
                  <Label>Название</Label>
                  <Input value={newPrize.name} onChange={(e) => setNewPrize({...newPrize, name: e.target.value})} className="admin-input" required />
                </div>
                <div>
                  <Label>Тип</Label>
                  <Select value={newPrize.prize_type} onValueChange={(v) => setNewPrize({...newPrize, prize_type: v})}>
                    <SelectTrigger className="admin-input"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="coins">Монеты</SelectItem>
                      <SelectItem value="xp">XP</SelectItem>
                      <SelectItem value="discount">Скидка</SelectItem>
                    </SelectContent>
                  </Select>
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
                  <Button type="submit">{editingPrize ? 'Сохранить' : t('admin.create')}</Button>
                </div>
              </form>
            </div>

            <div className="admin-card">
              <h3 className="font-bold mb-4">{t('admin.wheel')} ({wheelPrizes.length})</h3>
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

          {/* Orders Tab */}
          <TabsContent value="orders" className="space-y-6">
            <div className="admin-card">
              <h3 className="font-bold mb-4">{t('admin.orders')} ({orders.length})</h3>
              <div className="space-y-8 max-h-[800px] overflow-y-auto pr-2">
                {orders.length === 0 ? (
                  <p className="text-slate-400 text-center py-8">Заказов пока нет</p>
                ) : (
                  sortedGroupedOrders.map((group) => (
                    <div key={group.user_id} className="space-y-4 p-4 bg-slate-800/30 rounded-2xl border border-slate-700">
                      <div className="flex items-center justify-between border-b border-slate-700 pb-2">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                            <User className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-bold text-lg">{group.user_name}</p>
                            <p className="text-xs text-slate-400">{group.user_email}</p>
                          </div>
                        </div>
                        <span className="text-xs font-bold px-3 py-1 bg-slate-700 rounded-full text-slate-300">
                          {group.orders.length} {group.orders.length === 1 ? 'заказ' : 'заказа'}
                        </span>
                      </div>
                      
                      <div className="space-y-4 pl-4 border-l-2 border-slate-700">
                        {group.orders.map((o) => (
                          <div key={o.order_id} className="p-4 bg-slate-700/50 rounded-xl border border-slate-600 hover:border-primary/30 transition-colors">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-3">
                              <div>
                                <p className="font-mono text-xs text-slate-400 uppercase tracking-wider">{o.order_id}</p>
                                <p className="text-sm font-medium">{new Date(o.created_at).toLocaleString()}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                                  o.status === 'delivered' ? 'bg-green-500/20 text-green-500' :
                                  o.status === 'cancelled' ? 'bg-red-500/20 text-red-500' :
                                  o.status === 'returned' ? 'bg-gray-500/20 text-gray-500' :
                                  o.status === 'return_pending' ? 'bg-purple-500/20 text-purple-400' :
                                  o.status === 'shipped' ? 'bg-orange-500/20 text-orange-500' :
                                  o.status === 'confirmed' ? 'bg-blue-500/20 text-blue-500' :
                                  'bg-yellow-500/20 text-yellow-500'
                                }`}>
                                  {o.status === 'return_pending' ? 'ОЖИДАЕТ ВОЗВРАТА' : o.status.toUpperCase()}
                                </span>
                              </div>
                            </div>

                            <div className="grid md:grid-cols-2 gap-4 mb-4">
                              <div className="space-y-1">
                                <p className="text-sm text-slate-400">Состав заказа:</p>
                                <div className="text-sm">
                                  {o.items?.map((item, idx) => (
                                    <div key={idx} className="flex flex-col mb-2 last:mb-0">
                                      <div className="flex justify-between">
                                        <span>{item.product_name} x{item.quantity}</span>
                                        <span className="text-slate-400">{item.price * item.quantity} c.</span>
                                      </div>
                                      {item.custom_request && (
                                        <p className="text-xs text-primary italic mt-0.5">
                                          Пожелание: {item.custom_request}
                                        </p>
                                      )}
                                    </div>
                                  ))}
                                  <div className="border-t border-slate-600 mt-1 pt-1 flex justify-between font-bold text-primary">
                                    <span>Итого:</span>
                                    <span>{o.total} coins</span>
                                  </div>
                                </div>
                              </div>
                              <div className="space-y-2">
                                {o.delivery_address && (
                                  <div className="p-2 bg-slate-800/50 rounded text-sm">
                                    <span className="text-slate-400 flex items-center gap-1"><MapPin className="w-3 h-3" /> Адрес:</span>
                                    <p className="text-white">{o.delivery_address}</p>
                                  </div>
                                )}
                                {o.phone_number && (
                                  <div className="p-2 bg-slate-800/50 rounded text-sm">
                                    <span className="text-slate-400 flex items-center gap-1"><User className="w-3 h-3" /> Телефон:</span>
                                    <p className="text-white">{o.phone_number}</p>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-600">
                              <Button 
                                size="sm" 
                                variant={o.status === 'confirmed' ? 'default' : 'outline'}
                                className="h-8 text-xs"
                                onClick={() => handleUpdateOrderStatus(o.order_id, 'confirmed')}
                              >
                                <Check className="w-3 h-3 mr-1" /> Одобрить
                              </Button>
                              <Button 
                                size="sm" 
                                variant={o.status === 'shipped' ? 'default' : 'outline'}
                                className="h-8 text-xs"
                                onClick={() => handleUpdateOrderStatus(o.order_id, 'shipped')}
                              >
                                <Truck className="w-3 h-3 mr-1" /> Отправлено
                              </Button>
                              <Button 
                                size="sm" 
                                variant={o.status === 'delivered' ? 'default' : 'outline'}
                                className="h-8 text-xs"
                                onClick={() => handleUpdateOrderStatus(o.order_id, 'delivered')}
                              >
                                <CheckCircle className="w-3 h-3 mr-1" /> Доставлено
                              </Button>
                              <Button 
                                size="sm" 
                                variant={o.status === 'cancelled' ? 'destructive' : 'outline'}
                                className="h-8 text-xs"
                                onClick={() => handleUpdateOrderStatus(o.order_id, 'cancelled')}
                              >
                                <XCircle className="w-3 h-3 mr-1" /> Отменить
                              </Button>
                              <Button 
                                size="sm" 
                                variant="destructive"
                                className="h-8 text-xs"
                                onClick={() => handleDeleteOrder(o.order_id)}
                              >
                                <Trash2 className="w-3 h-3 mr-1" /> Удалить
                              </Button>
                              {o.status === 'return_pending' && (
                                <Button 
                                  size="sm" 
                                  className="h-8 text-xs bg-purple-600 hover:bg-purple-700 text-white"
                                  onClick={() => handleApproveReturn(o.order_id)}
                                >
                                  <Check className="w-3 h-3 mr-1" /> Одобрить возврат (90%)
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </TabsContent>

          {/* Delivery Methods Tab */}
          {isAdmin && (
            <TabsContent value="delivery" className="space-y-6">
              <div className="admin-card" data-testid="delivery-form">
                <h3 className="font-bold mb-4 flex items-center gap-2">
                  {editingDeliveryMethod ? <Edit className="w-4 h-4" /> : <Plus className="w-4 h-4" />} 
                  {editingDeliveryMethod ? 'Редактировать способ доставки' : 'Создать способ доставки'}
                </h3>
                <form onSubmit={handleCreateDeliveryMethod} className="grid md:grid-cols-4 gap-4">
                  <div>
                    <Label>Название</Label>
                    <Input
                      placeholder="Например: Курьер, Самовывоз"
                      value={newDeliveryMethod.name}
                      onChange={(e) => setNewDeliveryMethod({...newDeliveryMethod, name: e.target.value})}
                      className="admin-input"
                      required
                    />
                  </div>
                  <div>
                    <Label>Описание</Label>
                    <Input
                      placeholder="Описание способа доставки"
                      value={newDeliveryMethod.description}
                      onChange={(e) => setNewDeliveryMethod({...newDeliveryMethod, description: e.target.value})}
                      className="admin-input"
                    />
                  </div>
                  <div>
                    <Label>Стоимость (coins)</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={newDeliveryMethod.cost}
                      onChange={(e) => setNewDeliveryMethod({...newDeliveryMethod, cost: parseFloat(e.target.value) || 0})}
                      className="admin-input"
                      required
                      min="0"
                    />
                  </div>
                  <div>
                    <Label>Дней доставки</Label>
                    <Input
                      type="number"
                      placeholder="1"
                      value={newDeliveryMethod.delivery_days}
                      onChange={(e) => setNewDeliveryMethod({...newDeliveryMethod, delivery_days: parseInt(e.target.value) || 1})}
                      className="admin-input"
                      required
                      min="1"
                    />
                  </div>
                  <div className="flex items-end gap-2">
                    <Button type="submit" className="flex-1">
                      {editingDeliveryMethod ? 'Обновить' : 'Создать'}
                    </Button>
                    {editingDeliveryMethod && (
                      <Button type="button" variant="outline" onClick={() => {
                        setEditingDeliveryMethod(null);
                        setNewDeliveryMethod({ name: '', description: '', cost: 0, delivery_days: 1 });
                      }}>
                        Отмена
                      </Button>
                    )}
                  </div>
                </form>
              </div>

              <div className="admin-card">
                <h3 className="font-bold mb-4">Способы доставки ({deliveryMethods.length})</h3>
                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                  {deliveryMethods.length === 0 ? (
                    <p className="text-slate-400 text-center py-8">Способы доставки не добавлены</p>
                  ) : (
                    deliveryMethods.map((method) => (
                      <div key={method.method_id} className="p-4 bg-slate-700/50 rounded-xl border border-slate-600 hover:border-primary/30 transition-colors">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <p className="font-bold text-lg">{method.name}</p>
                            {method.description && <p className="text-sm text-slate-400">{method.description}</p>}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                              method.is_active ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'
                            }`}>
                              {method.is_active ? 'Активно' : 'Неактивно'}
                            </span>
                          </div>
                        </div>
                        <div className="grid md:grid-cols-3 gap-4 mb-3 text-sm">
                          <div>
                            <p className="text-slate-400">Стоимость</p>
                            <p className="font-bold text-primary">{method.cost} coins</p>
                          </div>
                          <div>
                            <p className="text-slate-400">Время доставки</p>
                            <p className="font-bold">{method.delivery_days} дн.</p>
                          </div>
                          <div>
                            <p className="text-slate-400">Создано</p>
                            <p className="font-bold text-xs">{new Date(method.created_at).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => {
                              setEditingDeliveryMethod(method);
                              setNewDeliveryMethod({
                                name: method.name,
                                description: method.description || '',
                                cost: method.cost,
                                delivery_days: method.delivery_days
                              });
                            }}
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            Редактировать
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleToggleDeliveryMethod(method.method_id, !method.is_active)}
                          >
                            {method.is_active ? 'Деактивировать' : 'Активировать'}
                          </Button>
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={() => handleDeleteDeliveryMethod(method.method_id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </TabsContent>
          )}

          {/* Missions Tab */}
          <TabsContent value="missions" className="space-y-6">
            <div className="admin-card" data-testid="mission-form">
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
                  <Select value={newMission.mission_type} onValueChange={(v) => setNewMission({...newMission, mission_type: v})}>
                    <SelectTrigger className="admin-input"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="orders_count">Кол-во заказов</SelectItem>
                      <SelectItem value="spend_amount">Потратить монеты</SelectItem>
                      <SelectItem value="purchase">Покупки</SelectItem>
                      <SelectItem value="topup">Пополнения</SelectItem>
                      <SelectItem value="level">Достичь уровня</SelectItem>
                      <SelectItem value="review">Оставить отзыв</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Цель (число)</Label>
                  <Input type="number" value={newMission.target_value} onChange={(e) => setNewMission({...newMission, target_value: parseFloat(e.target.value)})} className="admin-input" required />
                </div>
                <div>
                  <Label>Тип награды</Label>
                  <Select value={newMission.reward_type} onValueChange={(v) => setNewMission({...newMission, reward_type: v})}>
                    <SelectTrigger className="admin-input"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="coins">Монеты</SelectItem>
                      <SelectItem value="xp">XP</SelectItem>
                      <SelectItem value="spin">Вращения колеса</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Награда (значение)</Label>
                  <Input type="number" value={newMission.reward_value} onChange={(e) => setNewMission({...newMission, reward_value: parseFloat(e.target.value)})} className="admin-input" required />
                </div>
                <div className="space-y-2">
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

          {/* Tags Tab */}
          <TabsContent value="tags" className="space-y-6">
            <div className="admin-card">
              <h3 className="font-bold mb-4 flex items-center gap-2"><Plus className="w-4 h-4" /> Создать тег</h3>
              <form onSubmit={handleCreateTag} className="grid md:grid-cols-4 gap-4">
                <div>
                  <Label>Название</Label>
                  <Input value={newTag.name} onChange={(e) => setNewTag({...newTag, name: e.target.value})} className="admin-input" placeholder="Новинка" required />
                </div>
                <div>
                  <Label>Slug (URL)</Label>
                  <Input value={newTag.slug} onChange={(e) => setNewTag({...newTag, slug: e.target.value})} className="admin-input" placeholder="new" required />
                </div>
                <div>
                  <Label>Цвет</Label>
                  <Input type="color" value={newTag.color} onChange={(e) => setNewTag({...newTag, color: e.target.value})} className="admin-input h-10" />
                </div>
                <div className="flex items-end">
                  <Button type="submit" className="w-full">Создать</Button>
                </div>
              </form>
            </div>

            <div className="admin-card">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <Tag className="w-5 h-5" />
                Теги ({tags.length})
              </h3>
              <div className="space-y-2">
                {tags.length === 0 ? (
                  <p className="text-slate-400 text-center py-4">Тегов пока нет</p>
                ) : (
                  tags.map((tag) => (
                    <div key={tag.tag_id} className="flex items-center justify-between p-3 bg-slate-700 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded" style={{ backgroundColor: tag.color }} />
                        <div>
                          <p className="font-bold">{tag.name}</p>
                          <p className="text-sm text-slate-400">{tag.slug}</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="text-red-500" onClick={() => handleDeleteTag(tag.tag_id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </TabsContent>

          {/* Bank Cards Tab */}
          <TabsContent value="bank-cards" className="space-y-6">
            <div className="admin-card">
              <h3 className="font-bold mb-4 flex items-center gap-2"><Plus className="w-4 h-4" /> Добавить карту</h3>
              <form onSubmit={handleCreateBankCard} className="grid md:grid-cols-4 gap-4">
                <div>
                  <Label>Номер карты</Label>
                  <Input 
                    value={newBankCard.card_number} 
                    onChange={(e) => setNewBankCard({...newBankCard, card_number: e.target.value})} 
                    className="admin-input" 
                    placeholder="1234 5678 9012 3456"
                    required 
                  />
                </div>
                <div>
                  <Label>Имя владельца</Label>
                  <Input 
                    value={newBankCard.card_holder} 
                    onChange={(e) => setNewBankCard({...newBankCard, card_holder: e.target.value})} 
                    className="admin-input" 
                    placeholder="IVAN IVANOV"
                    required 
                  />
                </div>
                <div>
                  <Label>Название банка</Label>
                  <Input 
                    value={newBankCard.bank_name} 
                    onChange={(e) => setNewBankCard({...newBankCard, bank_name: e.target.value})} 
                    className="admin-input" 
                    placeholder="Сбербанк"
                    required 
                  />
                </div>
                <div className="flex items-end">
                  <Button type="submit" className="w-full">Добавить</Button>
                </div>
              </form>
            </div>

            <div className="admin-card">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Банковские карты ({bankCards.length})
              </h3>
              <div className="space-y-2">
                {bankCards.length === 0 ? (
                  <p className="text-slate-400 text-center py-4">Карт пока нет</p>
                ) : (
                  bankCards.map((card) => (
                    <div key={card.card_id} className="flex items-center justify-between p-4 bg-slate-700 rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className={`w-3 h-3 rounded-full ${card.is_active ? 'bg-green-500' : 'bg-red-500'}`}></span>
                        <CreditCard className="w-8 h-8 text-primary" />
                        <div>
                          <p className="font-bold font-mono">{card.card_number}</p>
                          <p className="text-sm text-slate-400">{card.card_holder} • {card.bank_name}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleToggleBankCard(card.card_id)}>
                          {card.is_active ? 'Деактив.' : 'Актив.'}
                        </Button>
                        <Button variant="ghost" size="icon" className="text-red-500" onClick={() => handleDeleteBankCard(card.card_id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </TabsContent>

          {/* Support Tab */}
          <TabsContent value="support" className="space-y-6">
            <div className="admin-card">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Обращения ({supportTickets.length})
              </h3>
              <div className="space-y-4 max-h-[600px] overflow-y-auto">
                {supportTickets.length === 0 ? (
                  <p className="text-slate-400 text-center py-8">Обращений пока нет</p>
                ) : (
                  supportTickets.map((ticket) => (
                    <div key={ticket.ticket_id} className={`p-4 rounded-lg ${ticket.status === 'open' ? 'bg-yellow-500/10 border border-yellow-500/30' : 'bg-slate-700'}`}>
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div>
                          <p className="font-bold">{ticket.subject}</p>
                          <p className="text-sm text-slate-400">
                            {ticket.name} • {ticket.email} • {new Date(ticket.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          ticket.status === 'resolved' ? 'bg-green-500/20 text-green-500' :
                          ticket.status === 'in_progress' ? 'bg-blue-500/20 text-blue-500' :
                          'bg-yellow-500/20 text-yellow-500'
                        }`}>
                          {ticket.status === 'resolved' ? 'Решено' : ticket.status === 'in_progress' ? 'В работе' : 'Открыто'}
                        </span>
                      </div>
                      <p className="text-sm mb-3 p-3 bg-slate-600/50 rounded">{ticket.message}</p>
                      {ticket.admin_response ? (
                        <div className="p-3 bg-green-500/10 rounded border border-green-500/30">
                          <p className="text-xs text-green-400 mb-1">Ваш ответ:</p>
                          <p className="text-sm">{ticket.admin_response}</p>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <Input
                            id={`response-${ticket.ticket_id}`}
                            placeholder="Введите ответ..."
                            className="admin-input flex-1"
                          />
                          <Button onClick={() => {
                            const input = document.getElementById(`response-${ticket.ticket_id}`);
                            handleRespondTicket(ticket.ticket_id, input.value);
                          }}>
                            Ответить
                          </Button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="ai-assistant">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <h2 className="text-xl font-bold flex items-center mb-4">
                  <Sparkles className="w-5 h-5 mr-2 text-purple-500" />
                  Добавить товар через ИИ
                </h2>
                <p className="text-slate-400 mb-4">
                  Опишите товар своими словами. ИИ проанализирует рынок и предложит оптимальную цену, категорию и описание.
                </p>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="ai-prompt">Описание товара</Label>
                    <textarea
                      id="ai-prompt"
                      className="w-full h-32 bg-slate-800 border-slate-700 rounded-md p-3 mt-1 text-white focus:ring-purple-500 focus:border-purple-500"
                      placeholder="Например: Добавь кроссовки Nike Air Max 270, цвет белый, размер 41-44, цена должна быть конкурентной..."
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                    />
                  </div>
                  <Button 
                    className="w-full bg-purple-600 hover:bg-purple-700" 
                    onClick={handleAiAnalyze}
                    disabled={isAiAnalyzing}
                  >
                    {isAiAnalyzing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Анализирую...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Проанализировать
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {aiResult && (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 animate-in fade-in slide-in-from-right-4">
                  <h2 className="text-xl font-bold flex items-center mb-4">
                    <CheckCircle className="w-5 h-5 mr-2 text-green-500" />
                    Результат анализа
                  </h2>
                  
                  <div className="space-y-4">
                    <div className="p-4 bg-slate-800 rounded-lg border border-slate-700">
                      <h3 className="font-bold text-purple-400 mb-1">Предложенная цена: {aiResult.suggested_product.price} монет</h3>
                      <p className="text-sm text-slate-300 italic">"{aiResult.market_analysis}"</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-slate-500">Название:</span>
                        <p className="font-medium">{aiResult.suggested_product.name}</p>
                      </div>
                      <div>
                        <span className="text-slate-500">Категория:</span>
                        <p className="font-medium">
                          {categories.find(c => c._id === aiResult.suggested_product.category_id)?.name || 'Неизвестно'}
                        </p>
                      </div>
                    </div>

                    <div className="text-sm">
                      <span className="text-slate-500">Описание:</span>
                      <p className="line-clamp-3 text-slate-300">{aiResult.suggested_product.description}</p>
                    </div>

                    <Button 
                      className="w-full bg-green-600 hover:bg-green-700" 
                      onClick={applyAiResult}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Применить данные в форму
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 p-6 rounded-xl max-w-md w-full mx-4">
            <h3 className="font-bold text-lg mb-4">Редактировать: {editingUser.name}</h3>
            <div className="space-y-4">
              <div>
                <Label>Баланс</Label>
                <Input
                  type="number"
                  value={editBalance}
                  onChange={(e) => setEditBalance(e.target.value)}
                  className="admin-input"
                />
              </div>
              <div>
                <Label>XP</Label>
                <Input
                  type="number"
                  value={editXP}
                  onChange={(e) => setEditXP(e.target.value)}
                  className="admin-input"
                />
              </div>
              <div>
                <Label>Роль</Label>
                <Select 
                  value={editingUser.role || 'user'} 
                  onValueChange={(v) => {
                    handleUpdateUserRole(editingUser.user_id, v);
                    setEditingUser({...editingUser, role: v});
                  }}
                >
                  <SelectTrigger className="admin-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Пользователь</SelectItem>
                    <SelectItem value="helper">Помощник</SelectItem>
                    <SelectItem value="delivery">Доставщик</SelectItem>
                    <SelectItem value="admin">Админ</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSaveUserEdit} className="flex-1">{t('common.save')}</Button>
                <Button variant="outline" onClick={() => setEditingUser(null)} className="flex-1">{t('common.cancel')}</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Viewer Modal */}
      {viewingImage && (
        <div 
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4"
          onClick={() => setViewingImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img 
              src={viewingImage} 
              alt="Receipt" 
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
            />
            <Button 
              variant="ghost" 
              size="icon" 
              className="absolute top-2 right-2 bg-black/50 text-white hover:bg-black/70"
              onClick={() => setViewingImage(null)}
            >
              <X className="w-6 h-6" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
