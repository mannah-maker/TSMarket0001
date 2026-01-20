import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { useAuth } from '../context/AuthContext';
import { rewardsAPI, wheelAPI } from '../lib/api';
import { Gift, Sparkles, Star, Lock, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export const Rewards = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, refreshUser } = useAuth();
  const [rewards, setRewards] = useState([]);
  const [wheelPrizes, setWheelPrizes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [spinning, setSpinning] = useState(false);
  const [spinResult, setSpinResult] = useState(null);
  const [rotation, setRotation] = useState(0);

  const fetchData = useCallback(async () => {
    try {
      const [rewardsRes, prizesRes] = await Promise.all([
        rewardsAPI.getAll(),
        wheelAPI.getPrizes(),
      ]);
      setRewards(rewardsRes.data);
      setWheelPrizes(prizesRes.data);
    } catch (error) {
      console.error('Failed to fetch rewards:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/auth');
      return;
    }
    fetchData();
  }, [isAuthenticated, navigate, fetchData]);

  const handleClaimReward = async (level) => {
    try {
      const res = await rewardsAPI.claim(level);
      toast.success(`Claimed: ${res.data.reward.name}!`);
      await refreshUser();
      await fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to claim reward');
    }
  };

  const handleSpin = async () => {
    if ((user?.wheel_spins_available || 0) <= 0) {
      toast.error('No spins available');
      return;
    }

    setSpinning(true);
    setSpinResult(null);

    try {
      const res = await wheelAPI.spin();
      const prize = res.data.prize;
      
      // Calculate spin rotation (at least 5 full rotations + prize position)
      const prizeIndex = wheelPrizes.findIndex(p => p.prize_id === prize.prize_id);
      const segmentAngle = 360 / wheelPrizes.length;
      const targetAngle = 360 - (prizeIndex * segmentAngle) - (segmentAngle / 2);
      const newRotation = rotation + 1800 + targetAngle; // 5 full spins + target
      
      setRotation(newRotation);
      
      // Wait for animation
      setTimeout(async () => {
        setSpinResult(prize);
        setSpinning(false);
        toast.success(`You won: ${prize.name}!`);
        await refreshUser();
      }, 4000);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Spin failed');
      setSpinning(false);
    }
  };

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen tsmarket-gradient py-8" data-testid="rewards-page">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-2">Rewards</h1>
        <p className="text-lg text-muted-foreground mb-8">
          Claim rewards and spin the wheel to win prizes!
        </p>

        {/* Fortune Wheel Section */}
        <div className="tsmarket-card p-8 mb-8" data-testid="wheel-section">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold mb-2 flex items-center justify-center gap-2">
              <Sparkles className="w-6 h-6 text-primary" />
              Fortune Wheel
            </h2>
            <p className="text-muted-foreground">
              You have <span className="font-bold text-primary">{user?.wheel_spins_available || 0}</span> spins available
            </p>
          </div>

          {wheelPrizes.length > 0 && (
            <div className="flex flex-col items-center">
              {/* Wheel */}
              <div className="relative mb-8">
                {/* Pointer */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-10">
                  <div className="w-0 h-0 border-l-[15px] border-l-transparent border-r-[15px] border-r-transparent border-t-[25px] border-t-primary drop-shadow-lg" />
                </div>
                
                {/* Wheel SVG */}
                <svg
                  viewBox="0 0 300 300"
                  className="w-64 h-64 md:w-80 md:h-80 fortune-wheel"
                  style={{
                    transform: `rotate(${rotation}deg)`,
                    transition: spinning ? 'transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)' : 'none',
                  }}
                  data-testid="wheel-svg"
                >
                  {wheelPrizes.map((prize, index) => {
                    const segmentAngle = 360 / wheelPrizes.length;
                    const startAngle = index * segmentAngle;
                    const endAngle = (index + 1) * segmentAngle;
                    
                    const startRad = (startAngle - 90) * (Math.PI / 180);
                    const endRad = (endAngle - 90) * (Math.PI / 180);
                    
                    const x1 = 150 + 140 * Math.cos(startRad);
                    const y1 = 150 + 140 * Math.sin(startRad);
                    const x2 = 150 + 140 * Math.cos(endRad);
                    const y2 = 150 + 140 * Math.sin(endRad);
                    
                    const largeArc = segmentAngle > 180 ? 1 : 0;
                    
                    const midAngle = (startAngle + endAngle) / 2 - 90;
                    const midRad = midAngle * (Math.PI / 180);
                    const textX = 150 + 90 * Math.cos(midRad);
                    const textY = 150 + 90 * Math.sin(midRad);
                    
                    return (
                      <g key={prize.prize_id}>
                        <path
                          d={`M 150 150 L ${x1} ${y1} A 140 140 0 ${largeArc} 1 ${x2} ${y2} Z`}
                          fill={prize.color}
                          stroke="#fff"
                          strokeWidth="2"
                        />
                        <text
                          x={textX}
                          y={textY}
                          fill="#fff"
                          fontSize="10"
                          fontWeight="bold"
                          textAnchor="middle"
                          dominantBaseline="middle"
                          transform={`rotate(${midAngle + 90}, ${textX}, ${textY})`}
                        >
                          {prize.name}
                        </text>
                      </g>
                    );
                  })}
                  <circle cx="150" cy="150" r="30" fill="#fff" stroke="#0D9488" strokeWidth="4" />
                  <text x="150" y="150" fill="#0D9488" fontSize="12" fontWeight="bold" textAnchor="middle" dominantBaseline="middle">
                    SPIN
                  </text>
                </svg>
              </div>

              {/* Spin Button */}
              <Button
                className="tsmarket-btn-primary rounded-full px-12 py-6 text-lg"
                onClick={handleSpin}
                disabled={spinning || (user?.wheel_spins_available || 0) <= 0}
                data-testid="spin-btn"
              >
                {spinning ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 mr-2" />
                    Spin the Wheel!
                  </>
                )}
              </Button>

              {/* Spin Result */}
              {spinResult && !spinning && (
                <div className="mt-6 p-4 bg-primary/10 rounded-xl text-center animate-pulse-glow" data-testid="spin-result">
                  <p className="text-lg font-bold text-primary">You won:</p>
                  <p className="text-2xl font-black">{spinResult.name}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Level Rewards */}
        <div className="tsmarket-card p-6" data-testid="level-rewards">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <Gift className="w-6 h-6" />
            Level Rewards
          </h2>

          {loading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="skeleton h-20 rounded-xl" />
              ))}
            </div>
          ) : rewards.length === 0 ? (
            <div className="text-center py-8">
              <Gift className="w-12 h-12 text-muted-foreground/50 mx-auto mb-2" />
              <p className="text-muted-foreground">No rewards configured yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {rewards.map((reward) => (
                <div
                  key={reward.reward_id}
                  className={`reward-card p-4 rounded-xl border-2 transition-all ${
                    reward.is_exclusive
                      ? 'border-accent bg-accent/5'
                      : reward.is_claimed
                      ? 'border-muted bg-muted/30'
                      : reward.can_claim
                      ? 'border-primary bg-primary/5'
                      : 'border-border'
                  }`}
                  data-testid={`reward-${reward.level_required}`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                      reward.is_exclusive ? 'bg-accent/20' : 'bg-primary/10'
                    }`}>
                      {reward.is_claimed ? (
                        <Check className="w-7 h-7 text-primary" />
                      ) : reward.can_claim ? (
                        <Star className="w-7 h-7 text-primary" />
                      ) : (
                        <Lock className="w-7 h-7 text-muted-foreground" />
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold">{reward.name}</h3>
                        {reward.is_exclusive && (
                          <span className="text-xs font-bold px-2 py-0.5 bg-accent text-accent-foreground rounded-full">
                            EXCLUSIVE
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{reward.description}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Level {reward.level_required} required
                      </p>
                    </div>

                    <div className="text-right">
                      {reward.is_claimed ? (
                        <span className="text-sm font-bold text-muted-foreground">Claimed</span>
                      ) : reward.can_claim ? (
                        <Button
                          className="tsmarket-btn-primary rounded-full"
                          onClick={() => handleClaimReward(reward.level_required)}
                          data-testid={`claim-${reward.level_required}`}
                        >
                          Claim
                        </Button>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          Level {reward.level_required}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
