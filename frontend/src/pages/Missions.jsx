import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { missionsAPI } from '../lib/api';
import { 
  Target, Trophy, Gift, Coins, Zap, RotateCw,
  CheckCircle, Clock, Loader2, ShoppingCart, TrendingUp, MessageSquare
} from 'lucide-react';
import { toast } from 'sonner';

export const Missions = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, refreshUser } = useAuth();
  const { language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [missions, setMissions] = useState([]);
  const [claiming, setClaiming] = useState(null);

  const fetchMissions = useCallback(async () => {
    try {
      const res = await missionsAPI.getAll();
      // Ensure missions is always an array
      setMissions(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error('Failed to fetch missions:', error);
      setMissions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/auth');
      return;
    }
    fetchMissions();
  }, [isAuthenticated, navigate, fetchMissions]);

  const handleClaim = async (missionId) => {
    setClaiming(missionId);
    try {
      const res = await missionsAPI.claim(missionId);
      toast.success(language === 'ru' ? `Награда получена! +${res.data.reward_value} ${getRewardLabel(res.data.reward_type)}` : `Мукофот гирифта шуд! +${res.data.reward_value}`);
      await refreshUser();
      fetchMissions();
    } catch (error) {
      toast.error(error.response?.data?.detail || (language === 'ru' ? 'Ошибка' : 'Хатогӣ'));
    } finally {
      setClaiming(null);
    }
  };

  const getMissionIcon = (type) => {
    switch (type) {
      case 'purchase': return <ShoppingCart className="w-6 h-6" />;
      case 'orders_count': return <ShoppingCart className="w-6 h-6" />;
      case 'spend_amount': return <Coins className="w-6 h-6" />;
      case 'level': return <TrendingUp className="w-6 h-6" />;
      case 'topup': return <Coins className="w-6 h-6" />;
      case 'review': return <MessageSquare className="w-6 h-6" />;
      default: return <Target className="w-6 h-6" />;
    }
  };

  const getRewardIcon = (type) => {
    switch (type) {
      case 'coins': return <Coins className="w-5 h-5 text-yellow-500" />;
      case 'xp': return <Zap className="w-5 h-5 text-purple-500" />;
      case 'spin': return <RotateCw className="w-5 h-5 text-primary" />;
      default: return <Gift className="w-5 h-5 text-primary" />;
    }
  };

  const getRewardLabel = (type) => {
    if (language === 'ru') {
      switch (type) {
        case 'coins': return 'монет';
        case 'xp': return 'XP';
        case 'spin': return 'вращений';
        default: return '';
      }
    } else {
      switch (type) {
        case 'coins': return 'тангаҳо';
        case 'xp': return 'XP';
        case 'spin': return 'давонишҳо';
        default: return '';
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen tsmarket-gradient flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  // Defensive checks for missions array
  const activeMissions = Array.isArray(missions) ? missions.filter(m => !m.is_claimed) : [];
  const completedMissions = Array.isArray(missions) ? missions.filter(m => m.is_claimed) : [];

  return (
    <div className="min-h-screen tsmarket-gradient py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            <Target className="w-4 h-4" />
            {language === 'ru' ? 'Выполняй задания' : 'Вазифаҳоро иҷро кунед'}
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            {language === 'ru' ? 'Миссии' : 'Миссияҳо'}
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {language === 'ru' 
              ? 'Выполняй миссии и получай награды: монеты, XP и бесплатные вращения колеса!'
              : 'Миссияҳоро иҷро кунед ва мукофотҳо гиред: тангаҳо, XP ва давонишҳои ройгон!'
            }
          </p>
        </div>

        {/* User Progress Summary */}
        <div className="tsmarket-card p-6 mb-8">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-3xl font-black text-primary">{user?.level || 1}</p>
              <p className="text-sm text-muted-foreground">{language === 'ru' ? 'Уровень' : 'Сатҳ'}</p>
            </div>
            <div>
              <p className="text-3xl font-black text-yellow-500">{user?.balance?.toFixed(0) || 0}</p>
              <p className="text-sm text-muted-foreground">{language === 'ru' ? 'Монет' : 'Тангаҳо'}</p>
            </div>
            <div>
              <p className="text-3xl font-black text-purple-500">{user?.xp || 0}</p>
              <p className="text-sm text-muted-foreground">XP</p>
            </div>
          </div>
        </div>

        {/* Active Missions */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <Target className="w-6 h-6 text-primary" />
            {language === 'ru' ? 'Активные миссии' : 'Миссияҳои фаъол'}
          </h2>
          
          {activeMissions.length === 0 ? (
            <div className="tsmarket-card p-8 text-center">
              <Trophy className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
              <p className="text-muted-foreground">
                {language === 'ru' 
                  ? 'Нет активных миссий. Скоро появятся новые!'
                  : 'Миссияҳои фаъол нест. Наздик миссияҳои нав пайдо мешаванд!'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {activeMissions.map((mission) => {
                const progress = Math.min((mission.progress / mission.target_value) * 100, 100);
                const isCompleted = mission.is_completed;
                
                return (
                  <div 
                    key={mission.mission_id}
                    className={`tsmarket-card p-6 ${isCompleted ? 'border-green-500/50' : ''}`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                        isCompleted ? 'bg-green-500/20 text-green-500' : 'bg-primary/10 text-primary'
                      }`}>
                        {isCompleted ? <CheckCircle className="w-7 h-7" /> : getMissionIcon(mission.mission_type)}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h3 className="font-bold text-lg">{mission.title}</h3>
                            <p className="text-sm text-muted-foreground">{mission.description}</p>
                          </div>
                          <div className="text-right flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-full">
                            {getRewardIcon(mission.reward_type)}
                            <span className="font-bold">+{mission.reward_value}</span>
                          </div>
                        </div>
                        
                        {/* Progress Bar */}
                        <div className="mt-4">
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-muted-foreground">
                              {language === 'ru' ? 'Прогресс' : 'Прогресс'}
                            </span>
                            <span className="font-medium">
                              {Math.floor(mission.progress)}/{mission.target_value}
                            </span>
                          </div>
                          <div className="h-3 bg-muted rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${
                                isCompleted ? 'bg-green-500' : 'bg-primary'
                              }`}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                        
                        {/* Claim Button */}
                        {isCompleted && (
                          <Button
                            onClick={() => handleClaim(mission.mission_id)}
                            disabled={claiming === mission.mission_id}
                            className="mt-4 w-full sm:w-auto tsmarket-btn-primary rounded-full"
                          >
                            {claiming === mission.mission_id ? (
                              <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                              <>
                                <Gift className="w-5 h-5 mr-2" />
                                {language === 'ru' ? 'Получить награду' : 'Мукофотро гиред'}
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Completed Missions */}
        {completedMissions.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <Trophy className="w-6 h-6 text-yellow-500" />
              {language === 'ru' ? 'Выполненные миссии' : 'Миссияҳои иҷрошуда'}
            </h2>
            <div className="space-y-3">
              {completedMissions.map((mission) => (
                <div 
                  key={mission.mission_id}
                  className="tsmarket-card p-4 opacity-75"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold">{mission.title}</h3>
                      <p className="text-sm text-muted-foreground">{mission.description}</p>
                    </div>
                    <div className="flex items-center gap-1 text-green-500">
                      {getRewardIcon(mission.reward_type)}
                      <span className="font-bold">+{mission.reward_value}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
