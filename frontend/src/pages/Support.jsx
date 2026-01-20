import React, { useState, useEffect } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { supportAPI } from '../lib/api';
import { 
  HelpCircle, MessageSquare, Mail, Phone, Send, 
  ChevronDown, ChevronUp, Clock, CheckCircle, Loader2
} from 'lucide-react';
import { toast } from 'sonner';

export const Support = () => {
  const { user, isAuthenticated } = useAuth();
  const { t, language } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [tickets, setTickets] = useState([]);
  const [expandedFaq, setExpandedFaq] = useState(null);
  const [contacts, setContacts] = useState({
    telegram: '',
    whatsapp: '',
    email: '',
    phone: ''
  });
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });

  useEffect(() => {
    fetchContacts();
    if (user) {
      setFormData(prev => ({
        ...prev,
        name: user.name || '',
        email: user.email || ''
      }));
    }
    if (isAuthenticated) {
      fetchTickets();
    }
  }, [user, isAuthenticated]);

  const fetchContacts = async () => {
    try {
      const res = await supportAPI.getContacts();
      setContacts(res.data);
    } catch (error) {
      console.error('Failed to fetch contacts:', error);
    }
  };

  const fetchTickets = async () => {
    try {
      const res = await supportAPI.getUserTickets();
      setTickets(res.data);
    } catch (error) {
      console.error('Failed to fetch tickets:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.subject || !formData.message) {
      toast.error(language === 'ru' ? 'Заполните все поля' : 'Ҳамаи майдонҳоро пур кунед');
      return;
    }

    setLoading(true);
    try {
      await supportAPI.createTicket(formData);
      toast.success(language === 'ru' ? 'Заявка отправлена!' : 'Дархост фиристода шуд!');
      setFormData(prev => ({ ...prev, subject: '', message: '' }));
      if (isAuthenticated) {
        fetchTickets();
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || (language === 'ru' ? 'Ошибка отправки' : 'Хатогӣ'));
    } finally {
      setLoading(false);
    }
  };

  const faqs = language === 'ru' ? [
    {
      question: 'Как пополнить баланс?',
      answer: 'Перейдите в раздел "Пополнение", переведите деньги на указанную карту, загрузите скриншот чека и ожидайте подтверждения администратора.'
    },
    {
      question: 'Сколько времени занимает доставка?',
      answer: 'Доставка занимает до 24 часов после подтверждения заказа.'
    },
    {
      question: 'Как использовать промокод?',
      answer: 'При оформлении заказа введите промокод в специальное поле в корзине и нажмите "Применить".'
    },
    {
      question: 'Что такое XP и уровни?',
      answer: 'За каждую покупку вы получаете XP (опыт). Накапливая XP, вы повышаете уровень и получаете бонусы: скидки, вращения колеса удачи и эксклюзивные награды.'
    },
    {
      question: 'Как получить скидку?',
      answer: 'Скидки предоставляются автоматически в зависимости от вашего уровня (1% за каждый уровень, максимум 15%), а также по промокодам и на товары со скидкой.'
    }
  ] : [
    {
      question: 'Чӣ тавр балансро пур кунам?',
      answer: 'Ба бахши "Пуркунӣ" гузаред, маблағро ба корти нишондодашуда интиқол диҳед, скриншоти чекро боргузорӣ кунед ва мунтазири тасдиқи админ бошед.'
    },
    {
      question: 'Расонидан чанд вақт мегирад?',
      answer: 'Расонидан то 24 соат пас аз тасдиқи фармоиш мегирад.'
    },
    {
      question: 'Чӣ тавр промокодро истифода барам?',
      answer: 'Ҳангоми расмикунонии фармоиш промокодро дар майдони махсус дар сабад ворид кунед ва "Татбиқ"-ро пахш кунед.'
    },
    {
      question: 'XP ва сатҳҳо чист?',
      answer: 'Бо ҳар харид шумо XP (таҷриба) мегиред. Бо ҷамъкунии XP сатҳи худро баланд мебаред ва бонусҳо мегиред.'
    },
    {
      question: 'Чӣ тавр тахфиф гирам?',
      answer: 'Тахфифҳо автоматикӣ вобаста ба сатҳи шумо дода мешаванд (1% барои ҳар сатҳ, максимум 15%).'
    }
  ];

  // Check if any contacts are configured
  const hasContacts = contacts.telegram || contacts.whatsapp || contacts.email || contacts.phone;

  return (
    <div className="min-h-screen tsmarket-gradient py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            {language === 'ru' ? 'Поддержка' : 'Дастгирӣ'}
          </h1>
          <p className="text-lg text-muted-foreground">
            {language === 'ru' ? 'Мы всегда готовы помочь!' : 'Мо ҳамеша омодаем кӯмак кунем!'}
          </p>
        </div>

        {/* Contact Cards */}
        {hasContacts && (
          <div className="grid md:grid-cols-3 gap-4 mb-12">
            {contacts.telegram && (
              <a 
                href={`https://t.me/${contacts.telegram.replace('@', '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="tsmarket-card p-6 text-center hover:border-primary transition-colors group"
              >
                <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center mx-auto mb-4 group-hover:bg-blue-500/20">
                  <MessageSquare className="w-7 h-7 text-blue-500" />
                </div>
                <h3 className="font-bold mb-1">Telegram</h3>
                <p className="text-sm text-muted-foreground">{contacts.telegram}</p>
              </a>
            )}
            
            {contacts.whatsapp && (
              <a 
                href={`https://wa.me/${contacts.whatsapp.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="tsmarket-card p-6 text-center hover:border-primary transition-colors group"
              >
                <div className="w-14 h-14 rounded-2xl bg-green-500/10 flex items-center justify-center mx-auto mb-4 group-hover:bg-green-500/20">
                  <Phone className="w-7 h-7 text-green-500" />
                </div>
                <h3 className="font-bold mb-1">WhatsApp</h3>
                <p className="text-sm text-muted-foreground">{contacts.whatsapp}</p>
              </a>
            )}
            
            {contacts.email && (
              <a 
                href={`mailto:${contacts.email}`}
                className="tsmarket-card p-6 text-center hover:border-primary transition-colors group"
              >
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/20">
                  <Mail className="w-7 h-7 text-primary" />
                </div>
                <h3 className="font-bold mb-1">Email</h3>
                <p className="text-sm text-muted-foreground">{contacts.email}</p>
              </a>
            )}

            {contacts.phone && (
              <a 
                href={`tel:${contacts.phone.replace(/\D/g, '')}`}
                className="tsmarket-card p-6 text-center hover:border-primary transition-colors group"
              >
                <div className="w-14 h-14 rounded-2xl bg-orange-500/10 flex items-center justify-center mx-auto mb-4 group-hover:bg-orange-500/20">
                  <Phone className="w-7 h-7 text-orange-500" />
                </div>
                <h3 className="font-bold mb-1">{language === 'ru' ? 'Телефон' : 'Телефон'}</h3>
                <p className="text-sm text-muted-foreground">{contacts.phone}</p>
              </a>
            )}
          </div>
        )}

        {/* FAQ Section */}
        <div className="tsmarket-card p-6 mb-8">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
            <HelpCircle className="w-6 h-6 text-primary" />
            {language === 'ru' ? 'Частые вопросы' : 'Саволҳои маъмул'}
          </h2>
          <div className="space-y-3">
            {faqs.map((faq, index) => (
              <div 
                key={index}
                className="border border-border rounded-xl overflow-hidden"
              >
                <button
                  onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors"
                >
                  <span className="font-medium">{faq.question}</span>
                  {expandedFaq === index ? (
                    <ChevronUp className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-muted-foreground" />
                  )}
                </button>
                {expandedFaq === index && (
                  <div className="px-4 pb-4 text-muted-foreground">
                    {faq.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Contact Form */}
        <div className="tsmarket-card p-6 mb-8">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
            <Send className="w-6 h-6 text-primary" />
            {language === 'ru' ? 'Написать нам' : 'Ба мо нависед'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  {language === 'ru' ? 'Ваше имя' : 'Номи шумо'}
                </label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="tsmarket-input"
                  placeholder={language === 'ru' ? 'Иван' : 'Ном'}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Email</label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="tsmarket-input"
                  placeholder="email@example.com"
                  required
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">
                {language === 'ru' ? 'Тема' : 'Мавзӯъ'}
              </label>
              <Input
                value={formData.subject}
                onChange={(e) => setFormData({...formData, subject: e.target.value})}
                className="tsmarket-input"
                placeholder={language === 'ru' ? 'Тема обращения' : 'Мавзӯъи дархост'}
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">
                {language === 'ru' ? 'Сообщение' : 'Паём'}
              </label>
              <textarea
                value={formData.message}
                onChange={(e) => setFormData({...formData, message: e.target.value})}
                className="tsmarket-input min-h-[120px] w-full resize-none"
                placeholder={language === 'ru' ? 'Опишите вашу проблему или вопрос...' : 'Проблема ё савол худро тавсиф кунед...'}
                required
              />
            </div>
            <Button 
              type="submit" 
              className="w-full tsmarket-btn-primary rounded-full py-6"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Send className="w-5 h-5 mr-2" />
                  {language === 'ru' ? 'Отправить' : 'Фиристодан'}
                </>
              )}
            </Button>
          </form>
        </div>

        {/* User Tickets */}
        {isAuthenticated && tickets.length > 0 && (
          <div className="tsmarket-card p-6">
            <h2 className="text-2xl font-bold mb-6">
              {language === 'ru' ? 'Мои обращения' : 'Дархостҳои ман'}
            </h2>
            <div className="space-y-4">
              {tickets.map((ticket) => (
                <div 
                  key={ticket.ticket_id}
                  className="p-4 bg-muted/50 rounded-xl"
                >
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <h4 className="font-bold">{ticket.subject}</h4>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      ticket.status === 'resolved' ? 'bg-green-500/20 text-green-500' :
                      ticket.status === 'in_progress' ? 'bg-yellow-500/20 text-yellow-500' :
                      'bg-blue-500/20 text-blue-500'
                    }`}>
                      {ticket.status === 'resolved' ? (language === 'ru' ? 'Решено' : 'Ҳал шуд') :
                       ticket.status === 'in_progress' ? (language === 'ru' ? 'В работе' : 'Дар кор') :
                       (language === 'ru' ? 'Открыто' : 'Кушода')}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{ticket.message}</p>
                  {ticket.admin_response && (
                    <div className="mt-3 p-3 bg-primary/10 rounded-lg">
                      <p className="text-xs font-medium text-primary mb-1">
                        {language === 'ru' ? 'Ответ поддержки:' : 'Ҷавоби дастгирӣ:'}
                      </p>
                      <p className="text-sm">{ticket.admin_response}</p>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">
                    {new Date(ticket.created_at).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
