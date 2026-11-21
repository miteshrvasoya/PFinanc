export const getMaterialIcon = (backendIcon: string | null | undefined): any => {
  if (!backendIcon) return 'receipt';

  const iconMap: Record<string, string> = {
    'Utensils': 'restaurant',
    'Home': 'home',
    'Zap': 'bolt',
    'Car': 'directions-car',
    'ShoppingBag': 'shopping-bag',
    'HeartPulse': 'favorite',
    'Film': 'movie',
    'GraduationCap': 'school',
    'Coins': 'monetization-on',
    'Briefcase': 'work',
    'Laptop': 'laptop-mac',
    'TrendingUp': 'trending-up',
    'RotateCcw': 'restore',
    'PlusCircle': 'add-circle',
    'PiggyBank': 'savings',
    'Building': 'business',
  };

  return iconMap[backendIcon] || backendIcon.toLowerCase();
};
