import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { gamificationAPI } from '../lib/api';
import { useLanguage } from '../context/LanguageContext';
import { Trophy, Sparkles, ArrowLeft, Calendar } from 'lucide-react';

export const PublicProfile = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await gamificationAPI.getPublicProfile(userId);
        setProfile(res.data);
      } catch (error) {
        console.error('Failed to fetch profile:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [userId]);

  if (loading) return <div className="min-h-screen tsmarket-gradient flex items-center justify-center">Loading...</div>;
  if (!profile) return <div className="min-h-screen tsmarket-gradient flex items-center justify-center">User not found</div>;

  return (
    <div className="min-h-screen tsmarket-gradient py-8">
      <div className="max-w-4xl mx-auto px-4">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6 rounded-full">
          <ArrowLeft className="w-4 h-4 mr-2" /> {t('product.back')}
        </Button>

        <div className="tsmarket-card p-8 mb-8 text-center">
          <div className="w-32 h-32 rounded-full bg-primary mx-auto mb-4 flex items-center justify-center ring-4 ring-primary/30 overflow-hidden">
            {profile.picture ? (
              <img src={profile.picture} alt={profile.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-primary-foreground text-5xl font-black">{profile.name[0]}</span>
            )}
          </div>
          <h1 className="text-4xl font-bold mb-2">{profile.name}</h1>
          <div className="flex items-center justify-center gap-4 text-muted-foreground">
            <span className="flex items-center gap-1"><Trophy className="w-4 h-4" /> Level {profile.level}</span>
            <span className="flex items-center gap-1"><Sparkles className="w-4 h-4" /> {profile.xp} XP</span>
          </div>
        </div>

        {/* Achievements */}
        <div className="tsmarket-card p-8">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <Trophy className="w-6 h-6 text-yellow-500" /> {t('profile.achievements')}
          </h2>
          <div className="grid grid-cols-3 gap-4">
            <div className={`p-4 rounded-xl border-2 text-center ${profile.achievements?.includes('pioneer') ? 'border-primary bg-primary/5' : 'border-muted opacity-50'}`}>
              <div className="text-3xl mb-1">🚀</div>
              <p className="font-bold text-xs">{t('profile.pioneer')}</p>
            </div>
            <div className={`p-4 rounded-xl border-2 text-center ${profile.achievements?.includes('level_master') ? 'border-primary bg-primary/5' : 'border-muted opacity-50'}`}>
              <div className="text-3xl mb-1">👑</div>
              <p className="font-bold text-xs">{t('profile.levelMaster')}</p>
            </div>
            <div className={`p-4 rounded-xl border-2 text-center ${profile.achievements?.includes('rich') ? 'border-primary bg-primary/5' : 'border-muted opacity-50'}`}>
              <div className="text-3xl mb-1">💰</div>
              <p className="font-bold text-xs">{t('profile.rich')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
