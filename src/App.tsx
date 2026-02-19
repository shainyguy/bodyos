import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Home, Utensils, Droplets, Scale, Pill, Dumbbell, BarChart3,
  User, Plus, Minus, Check, X, Search, Copy,
  TrendingUp, TrendingDown, Target, Flame, Zap, Award,
  AlertTriangle, Coffee, Sun, Sunset
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import type {
  UserProfile, FoodItem, MealEntry, WaterEntry, WeightEntry,
  Supplement, SupplementEntry, Workout, NutritionTargets,
  MealType, Goal, ActivityLevel, Gender
} from './types';
import {
  calculateBMR, calculateTDEE, calculateNutritionTargets, calculateBMI,
  getBMICategory, calculateWeightProjection, calculateTimeToGoal,
  checkDeficitSafety, calculateDisciplineScore, getCompensationAdvice,
  generateId, getToday, activityLevelNames, goalNames
} from './utils/calculations';
import {
  initDB, getAll, put, deleteItem, getMealsByDate, getWaterByDate,
  getWeightHistory, getWorkoutsByDate, getSupplementEntriesByDate
} from './utils/db';
import { initializeFoodsDB } from './data/foods';

// ============ ТИПЫ НАВИГАЦИИ ============
type TabType = 'home' | 'food' | 'water' | 'weight' | 'supplements' | 'workout' | 'analytics' | 'profile';

// ============ КОМПОНЕНТ APP ============
export function App() {
  // ===== STATE =====
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(getToday());
  
  // Данные
  const [meals, setMeals] = useState<MealEntry[]>([]);
  const [waterEntries, setWaterEntries] = useState<WaterEntry[]>([]);
  const [weightHistory, setWeightHistory] = useState<WeightEntry[]>([]);
  const [supplements, setSupplements] = useState<Supplement[]>([]);
  const [supplementEntries, setSupplementEntries] = useState<SupplementEntry[]>([]);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [foods, setFoods] = useState<FoodItem[]>([]);
  
  // Модальные окна
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [showFoodSearch, setShowFoodSearch] = useState(false);
  const [showAddWorkout, setShowAddWorkout] = useState(false);
  const [showAddSupplement, setShowAddSupplement] = useState(false);
  const [showAddWeight, setShowAddWeight] = useState(false);
  
  // Форма добавления еды
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [servings, setServings] = useState(1);
  const [selectedMealType, setSelectedMealType] = useState<MealType>('breakfast');

  // ===== ИНИЦИАЛИЗАЦИЯ =====
  useEffect(() => {
    async function init() {
      await initDB();
      
      // Загрузка профиля
      const profiles = await getAll('profile');
      if (profiles.length > 0) {
        setProfile(profiles[0]);
      } else {
        setShowProfileSetup(true);
      }
      
      // Загрузка продуктов
      let foodsData = await getAll('foods');
      if (foodsData.length === 0) {
        const defaultFoods = initializeFoodsDB();
        for (const food of defaultFoods) {
          await put('foods', food);
        }
        foodsData = defaultFoods;
      }
      setFoods(foodsData);
      
      // Загрузка БАДов
      const supps = await getAll('supplements');
      setSupplements(supps);
      
      setIsLoading(false);
    }
    init();
  }, []);
  
  // Загрузка данных при смене даты
  useEffect(() => {
    async function loadDayData() {
      const [mealsData, waterData, workoutsData, suppEntriesData] = await Promise.all([
        getMealsByDate(selectedDate),
        getWaterByDate(selectedDate),
        getWorkoutsByDate(selectedDate),
        getSupplementEntriesByDate(selectedDate)
      ]);
      setMeals(mealsData);
      setWaterEntries(waterData);
      setWorkouts(workoutsData);
      setSupplementEntries(suppEntriesData);
    }
    loadDayData();
  }, [selectedDate]);
  
  // Загрузка истории веса
  useEffect(() => {
    async function loadWeightHistory() {
      const history = await getWeightHistory(30);
      setWeightHistory(history);
    }
    loadWeightHistory();
  }, []);

  // ===== РАСЧЁТЫ =====
  const targets = useMemo<NutritionTargets | null>(() => {
    if (!profile) return null;
    return calculateNutritionTargets(profile);
  }, [profile]);
  
  const dailyTotals = useMemo(() => {
    const totals = {
      calories: 0, protein: 0, carbs: 0, fat: 0,
      fiber: 0, sugar: 0, sodium: 0
    };
    
    meals.forEach(meal => {
      const multiplier = meal.servings;
      totals.calories += meal.foodItem.calories * multiplier;
      totals.protein += meal.foodItem.protein * multiplier;
      totals.carbs += meal.foodItem.carbs * multiplier;
      totals.fat += meal.foodItem.fat * multiplier;
      totals.fiber += meal.foodItem.fiber * multiplier;
      totals.sugar += meal.foodItem.sugar * multiplier;
      totals.sodium += meal.foodItem.sodium * multiplier;
    });
    
    return {
      calories: Math.round(totals.calories),
      protein: Math.round(totals.protein),
      carbs: Math.round(totals.carbs),
      fat: Math.round(totals.fat),
      fiber: Math.round(totals.fiber),
      sugar: Math.round(totals.sugar),
      sodium: Math.round(totals.sodium)
    };
  }, [meals]);
  
  const totalWater = useMemo(() => {
    return waterEntries.reduce((sum, entry) => sum + entry.amount, 0);
  }, [waterEntries]);
  
  const disciplineScore = useMemo(() => {
    if (!targets) return 0;
    const suppsTaken = supplementEntries.filter(e => e.taken).length;
    return calculateDisciplineScore(
      dailyTotals.calories, targets.calories,
      totalWater, targets.water,
      suppsTaken, supplements.length
    );
  }, [dailyTotals, targets, totalWater, supplements, supplementEntries]);

  // ===== HANDLERS =====
  const saveProfile = useCallback(async (newProfile: UserProfile) => {
    await put('profile', newProfile);
    setProfile(newProfile);
    setShowProfileSetup(false);
  }, []);
  
  const addMeal = useCallback(async () => {
    if (!selectedFood) return;
    
    const entry: MealEntry = {
      id: generateId(),
      date: selectedDate,
      mealType: selectedMealType,
      foodItem: selectedFood,
      servings,
      timestamp: Date.now()
    };
    
    await put('meals', entry);
    setMeals(prev => [...prev, entry]);
    setShowFoodSearch(false);
    setSelectedFood(null);
    setServings(1);
  }, [selectedFood, selectedDate, selectedMealType, servings]);
  
  const deleteMeal = useCallback(async (id: string) => {
    await deleteItem('meals', id);
    setMeals(prev => prev.filter(m => m.id !== id));
  }, []);
  
  const addWater = useCallback(async (amount: number) => {
    const entry: WaterEntry = {
      id: generateId(),
      date: selectedDate,
      amount,
      timestamp: Date.now()
    };
    
    await put('water', entry);
    setWaterEntries(prev => [...prev, entry]);
  }, [selectedDate]);
  
  const addWeightEntry = useCallback(async (weight: number) => {
    const entry: WeightEntry = {
      id: generateId(),
      date: selectedDate,
      weight,
      timestamp: Date.now()
    };
    
    await put('weights', entry);
    setWeightHistory(prev => [...prev.filter(w => w.date !== selectedDate), entry].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    ));
    setShowAddWeight(false);
  }, [selectedDate]);
  
  const addWorkoutEntry = useCallback(async (workout: Omit<Workout, 'id' | 'timestamp'>) => {
    const entry: Workout = {
      ...workout,
      id: generateId(),
      timestamp: Date.now()
    };
    
    await put('workouts', entry);
    setWorkouts(prev => [...prev, entry]);
    setShowAddWorkout(false);
  }, []);
  
  const addSupplementEntry = useCallback(async (supp: Supplement) => {
    const entry: SupplementEntry = {
      id: generateId(),
      supplementId: supp.id,
      date: selectedDate,
      taken: true,
      timestamp: Date.now()
    };
    
    await put('supplementEntries', entry);
    setSupplementEntries(prev => [...prev, entry]);
  }, [selectedDate]);
  
  const saveNewSupplement = useCallback(async (supp: Omit<Supplement, 'id'>) => {
    const newSupp: Supplement = { ...supp, id: generateId() };
    await put('supplements', newSupp);
    setSupplements(prev => [...prev, newSupp]);
    setShowAddSupplement(false);
  }, []);
  
  const copyYesterdayMeals = useCallback(async () => {
    const yesterday = new Date(selectedDate);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    const yesterdayMeals = await getMealsByDate(yesterdayStr);
    
    for (const meal of yesterdayMeals) {
      const newMeal: MealEntry = {
        ...meal,
        id: generateId(),
        date: selectedDate,
        timestamp: Date.now()
      };
      await put('meals', newMeal);
    }
    
    const updatedMeals = await getMealsByDate(selectedDate);
    setMeals(updatedMeals);
  }, [selectedDate]);
  
  const filteredFoods = useMemo(() => {
    if (!searchQuery) return foods.filter(f => f.isFavorite).slice(0, 10);
    const q = searchQuery.toLowerCase();
    return foods.filter(f => 
      f.name.toLowerCase().includes(q) || 
      f.brand?.toLowerCase().includes(q)
    );
  }, [foods, searchQuery]);

  // ===== LOADING =====
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Загрузка BodyOS...</p>
        </div>
      </div>
    );
  }

  // ===== PROFILE SETUP =====
  if (showProfileSetup || !profile) {
    return <ProfileSetup onSave={saveProfile} existingProfile={profile} />;
  }

  // ===== MAIN RENDER =====
  return (
    <div className="min-h-screen bg-slate-950 text-white pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              BodyOS
            </h1>
            <p className="text-xs text-slate-500">{formatDateRu(selectedDate)}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedDate(getToday())}
              className="px-3 py-1 text-xs bg-slate-800 rounded-full text-slate-300"
            >
              Сегодня
            </button>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-sm text-white"
            />
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="px-4 py-4 space-y-4">
        {activeTab === 'home' && (
          <HomeTab
            profile={profile}
            targets={targets!}
            dailyTotals={dailyTotals}
            totalWater={totalWater}
            meals={meals}
            disciplineScore={disciplineScore}
            weightHistory={weightHistory}
            onAddMeal={() => { setSelectedMealType('snack'); setShowFoodSearch(true); }}
            onAddWater={() => addWater(250)}
          />
        )}
        
        {activeTab === 'food' && (
          <FoodTab
            meals={meals}
            dailyTotals={dailyTotals}
            onAddMeal={(type) => { setSelectedMealType(type); setShowFoodSearch(true); }}
            onDeleteMeal={deleteMeal}
            onCopyYesterday={copyYesterdayMeals}
          />
        )}
        
        {activeTab === 'water' && (
          <WaterTab
            entries={waterEntries}
            total={totalWater}
            target={targets!.water}
            onAdd={addWater}
          />
        )}
        
        {activeTab === 'weight' && (
          <WeightTab
            profile={profile}
            history={weightHistory}
            onAddWeight={() => setShowAddWeight(true)}
          />
        )}
        
        {activeTab === 'supplements' && (
          <SupplementsTab
            supplements={supplements}
            entries={supplementEntries}
            onTake={addSupplementEntry}
            onAddNew={() => setShowAddSupplement(true)}
          />
        )}
        
        {activeTab === 'workout' && (
          <WorkoutTab
            workouts={workouts}
            onAdd={() => setShowAddWorkout(true)}
          />
        )}
        
        {activeTab === 'analytics' && (
          <AnalyticsTab
            profile={profile}
            weightHistory={weightHistory}
            targets={targets!}
          />
        )}
        
        {activeTab === 'profile' && (
          <ProfileTab
            profile={profile}
            targets={targets!}
            onEdit={() => setShowProfileSetup(true)}
          />
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 z-50">
        <div className="flex justify-around py-2">
          {[
            { id: 'home', icon: Home, label: 'Главная' },
            { id: 'food', icon: Utensils, label: 'Еда' },
            { id: 'water', icon: Droplets, label: 'Вода' },
            { id: 'weight', icon: Scale, label: 'Вес' },
            { id: 'analytics', icon: BarChart3, label: 'Аналитика' },
            { id: 'profile', icon: User, label: 'Профиль' },
          ].map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as TabType)}
              className={`flex flex-col items-center py-1 px-3 rounded-lg transition-all ${
                activeTab === id
                  ? 'text-emerald-400'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <Icon size={20} />
              <span className="text-[10px] mt-0.5">{label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Food Search Modal */}
      {showFoodSearch && (
        <Modal onClose={() => setShowFoodSearch(false)} title="Добавить продукт">
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="text"
                placeholder="Поиск продуктов..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                autoFocus
              />
            </div>
            
            <div className="flex gap-2 overflow-x-auto pb-2">
              {(['breakfast', 'lunch', 'dinner', 'snack'] as MealType[]).map(type => (
                <button
                  key={type}
                  onClick={() => setSelectedMealType(type)}
                  className={`px-4 py-2 rounded-full text-sm whitespace-nowrap transition-all ${
                    selectedMealType === type
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {mealTypeNames[type]}
                </button>
              ))}
            </div>
            
            <div className="max-h-64 overflow-y-auto space-y-2">
              {filteredFoods.map(food => (
                <button
                  key={food.id}
                  onClick={() => setSelectedFood(food)}
                  className={`w-full text-left p-3 rounded-xl transition-all ${
                    selectedFood?.id === food.id
                      ? 'bg-emerald-500/20 border border-emerald-500'
                      : 'bg-slate-800 border border-transparent hover:border-slate-700'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{food.name}</p>
                      <p className="text-xs text-slate-500">
                        {food.servingSize} {food.servingUnit}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-emerald-400 font-medium">{food.calories} ккал</p>
                      <p className="text-xs text-slate-500">
                        Б{food.protein} Ж{food.fat} У{food.carbs}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            
            {selectedFood && (
              <div className="bg-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Порций:</span>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setServings(Math.max(0.5, servings - 0.5))}
                      className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center"
                    >
                      <Minus size={18} />
                    </button>
                    <span className="text-xl font-bold w-12 text-center">{servings}</span>
                    <button
                      onClick={() => setServings(servings + 0.5)}
                      className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center"
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                </div>
                
                <div className="grid grid-cols-4 gap-2 text-center text-sm">
                  <div className="bg-slate-700 rounded-lg p-2">
                    <p className="text-emerald-400 font-bold">{Math.round(selectedFood.calories * servings)}</p>
                    <p className="text-xs text-slate-500">ккал</p>
                  </div>
                  <div className="bg-slate-700 rounded-lg p-2">
                    <p className="text-rose-400 font-bold">{Math.round(selectedFood.protein * servings)}</p>
                    <p className="text-xs text-slate-500">белок</p>
                  </div>
                  <div className="bg-slate-700 rounded-lg p-2">
                    <p className="text-amber-400 font-bold">{Math.round(selectedFood.fat * servings)}</p>
                    <p className="text-xs text-slate-500">жиры</p>
                  </div>
                  <div className="bg-slate-700 rounded-lg p-2">
                    <p className="text-blue-400 font-bold">{Math.round(selectedFood.carbs * servings)}</p>
                    <p className="text-xs text-slate-500">углеводы</p>
                  </div>
                </div>
                
                <button
                  onClick={addMeal}
                  className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-medium py-3 rounded-xl"
                >
                  Добавить
                </button>
              </div>
            )}
          </div>
        </Modal>
      )}
      
      {/* Add Weight Modal */}
      {showAddWeight && (
        <AddWeightModal
          currentWeight={profile.weight}
          onSave={addWeightEntry}
          onClose={() => setShowAddWeight(false)}
        />
      )}
      
      {/* Add Workout Modal */}
      {showAddWorkout && (
        <AddWorkoutModal
          date={selectedDate}
          onSave={addWorkoutEntry}
          onClose={() => setShowAddWorkout(false)}
        />
      )}
      
      {/* Add Supplement Modal */}
      {showAddSupplement && (
        <AddSupplementModal
          onSave={saveNewSupplement}
          onClose={() => setShowAddSupplement(false)}
        />
      )}
    </div>
  );
}

// ============ HELPER COMPONENTS ============

const mealTypeNames: Record<MealType, string> = {
  breakfast: 'Завтрак',
  lunch: 'Обед',
  dinner: 'Ужин',
  snack: 'Перекус'
};

const mealTypeIcons: Record<MealType, typeof Sun> = {
  breakfast: Sun,
  lunch: Coffee,
  dinner: Sunset,
  snack: Zap
};

function formatDateRu(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('ru-RU', {
    weekday: 'short',
    day: 'numeric',
    month: 'long'
  });
}

// ============ MODAL ============
function Modal({ onClose, title, children }: { onClose: () => void; title: string; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-slate-900 rounded-t-3xl sm:rounded-3xl p-6 max-h-[90vh] overflow-y-auto animate-slide-up">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">{title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full">
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ============ PROGRESS RING ============
function ProgressRing({ progress, size = 120, strokeWidth = 8, color = 'emerald', children }: {
  progress: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  children?: React.ReactNode;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - Math.min(progress, 100) / 100 * circumference;
  
  const colorClasses: Record<string, string> = {
    emerald: 'stroke-emerald-500',
    cyan: 'stroke-cyan-500',
    rose: 'stroke-rose-500',
    amber: 'stroke-amber-500',
    blue: 'stroke-blue-500'
  };

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="rotate-[-90deg]" width={size} height={size}>
        <circle
          className="stroke-slate-800"
          strokeWidth={strokeWidth}
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        <circle
          className={`transition-all duration-500 ${colorClasses[color]}`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
          style={{ strokeDasharray: circumference, strokeDashoffset: offset }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {children}
      </div>
    </div>
  );
}

// ============ CARD ============
function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-slate-900 border border-slate-800 rounded-2xl p-4 ${className}`}>
      {children}
    </div>
  );
}

// ============ HOME TAB ============
function HomeTab({
  profile, targets, dailyTotals, totalWater, meals, disciplineScore,
  weightHistory, onAddMeal, onAddWater
}: {
  profile: UserProfile;
  targets: NutritionTargets;
  dailyTotals: { calories: number; protein: number; carbs: number; fat: number };
  totalWater: number;
  meals: MealEntry[];
  disciplineScore: number;
  weightHistory: WeightEntry[];
  onAddMeal: () => void;
  onAddWater: () => void;
}) {
  const caloriesProgress = (dailyTotals.calories / targets.calories) * 100;
  const waterProgress = (totalWater / targets.water) * 100;
  const proteinProgress = (dailyTotals.protein / targets.protein) * 100;
  
  const remainingCalories = targets.calories - dailyTotals.calories;
  const overEating = remainingCalories < 0;
  
  const bmr = calculateBMR(profile.weight, profile.height, profile.age, profile.gender);
  const tdee = calculateTDEE(bmr, profile.activityLevel);
  const timeToGoal = calculateTimeToGoal(profile.weight, profile.targetWeight, targets.calories, tdee);
  
  const lastWeight = weightHistory.length > 0 ? weightHistory[weightHistory.length - 1].weight : profile.weight;
  const firstWeight = weightHistory.length > 1 ? weightHistory[0].weight : lastWeight;
  const weightChange = lastWeight - firstWeight;
  
  const compensation = overEating ? getCompensationAdvice(Math.abs(remainingCalories), 7 - new Date().getDay()) : '';

  return (
    <div className="space-y-4">
      {/* Главный прогресс калорий */}
      <Card>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-slate-400 text-sm">Калории сегодня</p>
            <p className="text-3xl font-bold">
              <span className={overEating ? 'text-rose-400' : 'text-white'}>{dailyTotals.calories}</span>
              <span className="text-slate-500 text-lg"> / {targets.calories}</span>
            </p>
            <p className={`text-sm ${overEating ? 'text-rose-400' : 'text-emerald-400'}`}>
              {overEating ? `+${Math.abs(remainingCalories)} переедание` : `${remainingCalories} осталось`}
            </p>
          </div>
          <ProgressRing progress={caloriesProgress} color={overEating ? 'rose' : 'emerald'}>
            <div className="text-center">
              <Flame className="mx-auto text-emerald-400" size={24} />
              <p className="text-xs text-slate-400">{Math.round(caloriesProgress)}%</p>
            </div>
          </ProgressRing>
        </div>
        
        {/* AI-совет при переедании */}
        {overEating && compensation && (
          <div className="mt-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl">
            <p className="text-xs text-rose-300 whitespace-pre-line">{compensation}</p>
          </div>
        )}
      </Card>

      {/* БЖУ */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="text-center">
          <p className="text-2xl font-bold text-rose-400">{dailyTotals.protein}г</p>
          <p className="text-xs text-slate-500">Белок</p>
          <div className="mt-2 h-1 bg-slate-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-rose-500 transition-all" 
              style={{ width: `${Math.min(proteinProgress, 100)}%` }}
            />
          </div>
        </Card>
        <Card className="text-center">
          <p className="text-2xl font-bold text-amber-400">{dailyTotals.fat}г</p>
          <p className="text-xs text-slate-500">Жиры</p>
          <div className="mt-2 h-1 bg-slate-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-amber-500 transition-all" 
              style={{ width: `${Math.min((dailyTotals.fat / targets.fat) * 100, 100)}%` }}
            />
          </div>
        </Card>
        <Card className="text-center">
          <p className="text-2xl font-bold text-blue-400">{dailyTotals.carbs}г</p>
          <p className="text-xs text-slate-500">Углеводы</p>
          <div className="mt-2 h-1 bg-slate-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-500 transition-all" 
              style={{ width: `${Math.min((dailyTotals.carbs / targets.carbs) * 100, 100)}%` }}
            />
          </div>
        </Card>
      </div>

      {/* Вода и быстрые действия */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <div className="flex items-center justify-between mb-2">
            <Droplets className="text-cyan-400" size={20} />
            <span className="text-xs text-slate-500">{Math.round(waterProgress)}%</span>
          </div>
          <p className="text-xl font-bold">{totalWater} мл</p>
          <p className="text-xs text-slate-500">из {targets.water} мл</p>
          <button
            onClick={onAddWater}
            className="mt-3 w-full bg-cyan-500/20 text-cyan-400 py-2 rounded-lg text-sm font-medium"
          >
            +250 мл
          </button>
        </Card>
        
        <Card>
          <div className="flex items-center justify-between mb-2">
            <Award className="text-amber-400" size={20} />
            <span className="text-xs text-slate-500">Дисциплина</span>
          </div>
          <p className="text-xl font-bold">{disciplineScore}%</p>
          <p className="text-xs text-slate-500">баллов сегодня</p>
          <button
            onClick={onAddMeal}
            className="mt-3 w-full bg-emerald-500/20 text-emerald-400 py-2 rounded-lg text-sm font-medium"
          >
            + Добавить еду
          </button>
        </Card>
      </div>

      {/* Прогресс цели */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Target className="text-emerald-400" size={20} />
            <span className="font-medium">Цель: {goalNames[profile.goal]}</span>
          </div>
          {weightChange !== 0 && (
            <span className={`text-sm flex items-center gap-1 ${
              (profile.goal === 'lose' && weightChange < 0) ||
              (profile.goal === 'gain' && weightChange > 0)
                ? 'text-emerald-400'
                : 'text-rose-400'
            }`}>
              {weightChange > 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
              {Math.abs(weightChange).toFixed(1)} кг
            </span>
          )}
        </div>
        
        <div className="flex justify-between text-sm">
          <div>
            <p className="text-slate-500">Текущий вес</p>
            <p className="font-bold">{lastWeight} кг</p>
          </div>
          <div className="text-center">
            <p className="text-slate-500">Цель</p>
            <p className="font-bold">{profile.targetWeight} кг</p>
          </div>
          <div className="text-right">
            <p className="text-slate-500">До цели</p>
            <p className="font-bold">{timeToGoal === Infinity ? '∞' : `~${timeToGoal} нед.`}</p>
          </div>
        </div>
        
        <div className="mt-3 h-2 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 transition-all"
            style={{
              width: `${Math.min(Math.max(
                profile.goal === 'lose'
                  ? ((firstWeight - lastWeight) / (firstWeight - profile.targetWeight)) * 100
                  : ((lastWeight - firstWeight) / (profile.targetWeight - firstWeight)) * 100
              , 0), 100)}%`
            }}
          />
        </div>
      </Card>

      {/* Последние приёмы пищи */}
      {meals.length > 0 && (
        <Card>
          <h3 className="font-medium mb-3">Сегодня съедено</h3>
          <div className="space-y-2">
            {meals.slice(-3).map(meal => (
              <div key={meal.id} className="flex items-center justify-between py-2 border-b border-slate-800 last:border-0">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center`}>
                    {(() => {
                      const Icon = mealTypeIcons[meal.mealType];
                      return <Icon size={16} className="text-slate-400" />;
                    })()}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{meal.foodItem.name}</p>
                    <p className="text-xs text-slate-500">{mealTypeNames[meal.mealType]} • {meal.servings} порц.</p>
                  </div>
                </div>
                <p className="text-emerald-400 font-medium">
                  {Math.round(meal.foodItem.calories * meal.servings)} ккал
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

// ============ FOOD TAB ============
function FoodTab({
  meals, dailyTotals, onAddMeal, onDeleteMeal, onCopyYesterday
}: {
  meals: MealEntry[];
  dailyTotals: { calories: number; protein: number; carbs: number; fat: number; fiber: number; sugar: number; sodium: number };
  onAddMeal: (type: MealType) => void;
  onDeleteMeal: (id: string) => void;
  onCopyYesterday: () => void;
}) {
  const mealTypes: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];
  
  const mealsByType = useMemo(() => {
    const grouped: Record<MealType, MealEntry[]> = {
      breakfast: [], lunch: [], dinner: [], snack: []
    };
    meals.forEach(meal => grouped[meal.mealType].push(meal));
    return grouped;
  }, [meals]);

  const getMealCalories = (type: MealType) => {
    return mealsByType[type].reduce((sum, m) => sum + m.foodItem.calories * m.servings, 0);
  };

  return (
    <div className="space-y-4">
      {/* Сводка */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium">Дневник питания</h3>
          <button
            onClick={onCopyYesterday}
            className="flex items-center gap-1 text-xs text-cyan-400"
          >
            <Copy size={14} />
            Копировать вчера
          </button>
        </div>
        
        <div className="grid grid-cols-4 gap-2 text-center">
          <div>
            <p className="text-lg font-bold">{dailyTotals.calories}</p>
            <p className="text-xs text-slate-500">ккал</p>
          </div>
          <div>
            <p className="text-lg font-bold text-rose-400">{dailyTotals.protein}г</p>
            <p className="text-xs text-slate-500">белок</p>
          </div>
          <div>
            <p className="text-lg font-bold text-amber-400">{dailyTotals.fat}г</p>
            <p className="text-xs text-slate-500">жиры</p>
          </div>
          <div>
            <p className="text-lg font-bold text-blue-400">{dailyTotals.carbs}г</p>
            <p className="text-xs text-slate-500">углеводы</p>
          </div>
        </div>
        
        <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
          <div className="bg-slate-800 rounded-lg p-2">
            <p className="font-medium">{dailyTotals.fiber}г</p>
            <p className="text-slate-500">клетчатка</p>
          </div>
          <div className="bg-slate-800 rounded-lg p-2">
            <p className="font-medium">{dailyTotals.sugar}г</p>
            <p className="text-slate-500">сахар</p>
          </div>
          <div className="bg-slate-800 rounded-lg p-2">
            <p className="font-medium">{dailyTotals.sodium}мг</p>
            <p className="text-slate-500">соль</p>
          </div>
        </div>
      </Card>

      {/* Приёмы пищи */}
      {mealTypes.map(type => {
        const Icon = mealTypeIcons[type];
        const mealsList = mealsByType[type];
        const totalCals = getMealCalories(type);
        
        return (
          <Card key={type}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center">
                  <Icon size={20} className="text-emerald-400" />
                </div>
                <div>
                  <p className="font-medium">{mealTypeNames[type]}</p>
                  <p className="text-xs text-slate-500">{totalCals} ккал</p>
                </div>
              </div>
              <button
                onClick={() => onAddMeal(type)}
                className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-400"
              >
                <Plus size={20} />
              </button>
            </div>
            
            {mealsList.length > 0 && (
              <div className="space-y-2">
                {mealsList.map(meal => (
                  <div
                    key={meal.id}
                    className="flex items-center justify-between py-2 px-3 bg-slate-800 rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="text-sm">{meal.foodItem.name}</p>
                      <p className="text-xs text-slate-500">
                        {meal.servings}× • Б{Math.round(meal.foodItem.protein * meal.servings)} 
                        Ж{Math.round(meal.foodItem.fat * meal.servings)} 
                        У{Math.round(meal.foodItem.carbs * meal.servings)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-emerald-400">
                        {Math.round(meal.foodItem.calories * meal.servings)} ккал
                      </span>
                      <button
                        onClick={() => onDeleteMeal(meal.id)}
                        className="p-1 text-slate-500 hover:text-rose-400"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}

// ============ WATER TAB ============
function WaterTab({
  entries, total, target, onAdd
}: {
  entries: WaterEntry[];
  total: number;
  target: number;
  onAdd: (amount: number) => void;
}) {
  const progress = (total / target) * 100;
  const amounts = [100, 200, 250, 300, 500];

  return (
    <div className="space-y-4">
      <Card className="text-center">
        <ProgressRing progress={progress} size={160} strokeWidth={12} color="cyan">
          <div>
            <Droplets className="mx-auto text-cyan-400 mb-1" size={32} />
            <p className="text-2xl font-bold">{total} мл</p>
            <p className="text-xs text-slate-500">из {target} мл</p>
          </div>
        </ProgressRing>
        
        <div className="mt-6 grid grid-cols-5 gap-2">
          {amounts.map(amount => (
            <button
              key={amount}
              onClick={() => onAdd(amount)}
              className="bg-cyan-500/20 text-cyan-400 py-3 rounded-xl font-medium text-sm hover:bg-cyan-500/30 transition-all"
            >
              +{amount}
            </button>
          ))}
        </div>
      </Card>

      {/* История сегодня */}
      <Card>
        <h3 className="font-medium mb-3">История за сегодня</h3>
        {entries.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-4">Ещё не пили воду</p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {entries.map(entry => (
              <div key={entry.id} className="flex items-center justify-between py-2 border-b border-slate-800 last:border-0">
                <div className="flex items-center gap-3">
                  <Droplets size={16} className="text-cyan-400" />
                  <span className="text-sm">
                    {new Date(entry.timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <span className="font-medium text-cyan-400">+{entry.amount} мл</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Советы */}
      <Card className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border-cyan-500/30">
        <h3 className="font-medium mb-2 flex items-center gap-2">
          <Zap size={16} className="text-cyan-400" />
          Советы по гидратации
        </h3>
        <ul className="text-sm text-slate-400 space-y-1">
          <li>• Пейте стакан воды сразу после пробуждения</li>
          <li>• Пейте за 30 минут до еды</li>
          <li>• В жару увеличьте норму на 500-1000 мл</li>
          <li>• При тренировках добавляйте 500 мл на час занятий</li>
        </ul>
      </Card>
    </div>
  );
}

// ============ WEIGHT TAB ============
function WeightTab({
  profile, history, onAddWeight
}: {
  profile: UserProfile;
  history: WeightEntry[];
  onAddWeight: () => void;
}) {
  const currentWeight = history.length > 0 ? history[history.length - 1].weight : profile.weight;
  const startWeight = history.length > 0 ? history[0].weight : profile.weight;
  const weightChange = currentWeight - startWeight;
  
  const bmi = calculateBMI(currentWeight, profile.height);
  const bmiCategory = getBMICategory(bmi);
  
  // Среднее за 7 дней
  const last7Days = history.slice(-7);
  const avgWeight = last7Days.length > 0
    ? last7Days.reduce((sum, w) => sum + w.weight, 0) / last7Days.length
    : currentWeight;
  
  const bmr = calculateBMR(currentWeight, profile.height, profile.age, profile.gender);
  const tdee = calculateTDEE(bmr, profile.activityLevel);
  const nutritionTargets = calculateNutritionTargets(profile);
  
  // Прогноз
  const projection4w = calculateWeightProjection(currentWeight, nutritionTargets.calories, tdee, 4);
  const projection8w = calculateWeightProjection(currentWeight, nutritionTargets.calories, tdee, 8);
  
  const chartData = history.map(w => ({
    date: w.date.slice(5),
    weight: w.weight
  }));

  return (
    <div className="space-y-4">
      {/* Текущий вес */}
      <Card className="text-center">
        <p className="text-slate-400 text-sm">Текущий вес</p>
        <p className="text-4xl font-bold mt-1">{currentWeight} кг</p>
        {weightChange !== 0 && (
          <p className={`text-sm flex items-center justify-center gap-1 mt-1 ${
            (profile.goal === 'lose' && weightChange < 0) ||
            (profile.goal === 'gain' && weightChange > 0)
              ? 'text-emerald-400'
              : 'text-rose-400'
          }`}>
            {weightChange > 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
            {weightChange > 0 ? '+' : ''}{weightChange.toFixed(1)} кг с начала
          </p>
        )}
        <button
          onClick={onAddWeight}
          className="mt-4 w-full bg-gradient-to-r from-emerald-500 to-cyan-500 py-3 rounded-xl font-medium"
        >
          Записать вес
        </button>
      </Card>

      {/* Статистика */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="text-center">
          <p className="text-xs text-slate-500">ИМТ</p>
          <p className={`text-xl font-bold ${bmiCategory.color}`}>{bmi}</p>
          <p className="text-[10px] text-slate-500">{bmiCategory.category}</p>
        </Card>
        <Card className="text-center">
          <p className="text-xs text-slate-500">Среднее 7д</p>
          <p className="text-xl font-bold">{avgWeight.toFixed(1)}</p>
          <p className="text-[10px] text-slate-500">кг</p>
        </Card>
        <Card className="text-center">
          <p className="text-xs text-slate-500">Цель</p>
          <p className="text-xl font-bold text-emerald-400">{profile.targetWeight}</p>
          <p className="text-[10px] text-slate-500">кг</p>
        </Card>
      </div>

      {/* График */}
      {chartData.length > 1 && (
        <Card>
          <h3 className="font-medium mb-3">Динамика веса</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="weightGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={10} />
                <YAxis 
                  stroke="#64748b" 
                  fontSize={10}
                  domain={['dataMin - 1', 'dataMax + 1']}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: 8 }}
                  labelStyle={{ color: '#94a3b8' }}
                />
                <Area
                  type="monotone"
                  dataKey="weight"
                  stroke="#10b981"
                  strokeWidth={2}
                  fill="url(#weightGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* Прогноз */}
      <Card>
        <h3 className="font-medium mb-3 flex items-center gap-2">
          <TrendingDown className="text-emerald-400" size={18} />
          Прогноз
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-800 rounded-xl p-3 text-center">
            <p className="text-xs text-slate-500">Через 4 недели</p>
            <p className="text-2xl font-bold">{projection4w} кг</p>
          </div>
          <div className="bg-slate-800 rounded-xl p-3 text-center">
            <p className="text-xs text-slate-500">Через 8 недель</p>
            <p className="text-2xl font-bold">{projection8w} кг</p>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ============ SUPPLEMENTS TAB ============
function SupplementsTab({
  supplements, entries, onTake, onAddNew
}: {
  supplements: Supplement[];
  entries: SupplementEntry[];
  onTake: (supp: Supplement) => void;
  onAddNew: () => void;
}) {
  const takenIds = new Set(entries.filter(e => e.taken).map(e => e.supplementId));
  const takenCount = takenIds.size;
  const totalCount = supplements.length;
  const progress = totalCount > 0 ? (takenCount / totalCount) * 100 : 0;

  return (
    <div className="space-y-4">
      <Card className="text-center">
        <ProgressRing progress={progress} size={120} color="amber">
          <div>
            <Pill className="mx-auto text-amber-400" size={24} />
            <p className="text-sm font-bold mt-1">{takenCount}/{totalCount}</p>
          </div>
        </ProgressRing>
        <p className="mt-3 text-slate-400 text-sm">Принято сегодня</p>
      </Card>

      <div className="flex justify-between items-center">
        <h3 className="font-medium">Мои БАДы</h3>
        <button
          onClick={onAddNew}
          className="flex items-center gap-1 text-sm text-emerald-400"
        >
          <Plus size={16} />
          Добавить
        </button>
      </div>

      {supplements.length === 0 ? (
        <Card className="text-center py-8">
          <Pill className="mx-auto text-slate-600 mb-2" size={32} />
          <p className="text-slate-500">Нет добавленных БАДов</p>
          <button
            onClick={onAddNew}
            className="mt-3 text-emerald-400 text-sm"
          >
            Добавить первый
          </button>
        </Card>
      ) : (
        <div className="space-y-2">
          {supplements.map(supp => {
            const taken = takenIds.has(supp.id);
            return (
              <Card
                key={supp.id}
                className={`flex items-center justify-between ${taken ? 'opacity-60' : ''}`}
              >
                <div>
                  <p className="font-medium">{supp.name}</p>
                  <p className="text-xs text-slate-500">{supp.dosage} • {supp.timeOfDay.join(', ')}</p>
                </div>
                <button
                  onClick={() => !taken && onTake(supp)}
                  disabled={taken}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    taken
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-slate-800 text-slate-400 hover:bg-emerald-500/20 hover:text-emerald-400'
                  }`}
                >
                  <Check size={20} />
                </button>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============ WORKOUT TAB ============
function WorkoutTab({
  workouts, onAdd
}: {
  workouts: Workout[];
  onAdd: () => void;
}) {
  const totalCalories = workouts.reduce((sum, w) => sum + w.caloriesBurned, 0);
  const totalDuration = workouts.reduce((sum, w) => sum + w.duration, 0);

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium">Тренировки сегодня</h3>
          <button
            onClick={onAdd}
            className="flex items-center gap-1 text-sm text-emerald-400"
          >
            <Plus size={16} />
            Добавить
          </button>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-800 rounded-xl p-4 text-center">
            <Dumbbell className="mx-auto text-emerald-400 mb-2" size={24} />
            <p className="text-2xl font-bold">{totalDuration}</p>
            <p className="text-xs text-slate-500">минут</p>
          </div>
          <div className="bg-slate-800 rounded-xl p-4 text-center">
            <Flame className="mx-auto text-orange-400 mb-2" size={24} />
            <p className="text-2xl font-bold">{totalCalories}</p>
            <p className="text-xs text-slate-500">ккал сожжено</p>
          </div>
        </div>
      </Card>

      {workouts.length === 0 ? (
        <Card className="text-center py-8">
          <Dumbbell className="mx-auto text-slate-600 mb-2" size={32} />
          <p className="text-slate-500">Нет тренировок сегодня</p>
          <button
            onClick={onAdd}
            className="mt-3 text-emerald-400 text-sm"
          >
            Записать тренировку
          </button>
        </Card>
      ) : (
        <div className="space-y-2">
          {workouts.map(workout => (
            <Card key={workout.id} className="flex items-center justify-between">
              <div>
                <p className="font-medium">{workout.name}</p>
                <p className="text-xs text-slate-500">
                  {workout.type === 'cardio' ? '🏃 Кардио' :
                   workout.type === 'strength' ? '💪 Силовая' :
                   workout.type === 'mixed' ? '🔥 Смешанная' : '🏋️ Другое'}
                  {' • '}{workout.duration} мин
                </p>
              </div>
              <span className="text-orange-400 font-medium">{workout.caloriesBurned} ккал</span>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ============ ANALYTICS TAB ============
function AnalyticsTab({
  profile, weightHistory, targets
}: {
  profile: UserProfile;
  weightHistory: WeightEntry[];
  targets: NutritionTargets;
}) {
  // Данные БЖУ для круговой диаграммы
  const macroData = [
    { name: 'Белки', value: targets.protein * 4, color: '#f43f5e' },
    { name: 'Жиры', value: targets.fat * 9, color: '#f59e0b' },
    { name: 'Углеводы', value: targets.carbs * 4, color: '#3b82f6' },
  ];

  const weightChartData = weightHistory.slice(-14).map(w => ({
    date: w.date.slice(5),
    weight: w.weight
  }));

  const bmr = calculateBMR(profile.weight, profile.height, profile.age, profile.gender);
  const tdee = calculateTDEE(bmr, profile.activityLevel);

  return (
    <div className="space-y-4">
      {/* Метаболизм */}
      <Card>
        <h3 className="font-medium mb-3 flex items-center gap-2">
          <Zap className="text-amber-400" size={18} />
          Метаболизм
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-800 rounded-xl p-3 text-center">
            <p className="text-xs text-slate-500">BMR (базовый)</p>
            <p className="text-xl font-bold">{Math.round(bmr)}</p>
            <p className="text-[10px] text-slate-500">ккал/день</p>
          </div>
          <div className="bg-slate-800 rounded-xl p-3 text-center">
            <p className="text-xs text-slate-500">TDEE (с активностью)</p>
            <p className="text-xl font-bold text-emerald-400">{tdee}</p>
            <p className="text-[10px] text-slate-500">ккал/день</p>
          </div>
        </div>
        
        <div className="mt-4 p-3 bg-slate-800 rounded-xl">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">Целевые калории</span>
            <span className="font-bold">{targets.calories} ккал</span>
          </div>
          <div className="flex items-center justify-between text-sm mt-1">
            <span className="text-slate-400">
              {profile.goal === 'lose' ? 'Дефицит' : profile.goal === 'gain' ? 'Профицит' : 'Баланс'}
            </span>
            <span className={`font-bold ${
              profile.goal === 'lose' ? 'text-emerald-400' :
              profile.goal === 'gain' ? 'text-blue-400' : 'text-slate-400'
            }`}>
              {Math.abs(tdee - targets.calories)} ккал/день
            </span>
          </div>
        </div>
      </Card>

      {/* Распределение БЖУ */}
      <Card>
        <h3 className="font-medium mb-3">Распределение БЖУ</h3>
        <div className="flex items-center">
          <div className="w-32 h-32">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={macroData}
                  cx="50%"
                  cy="50%"
                  innerRadius={30}
                  outerRadius={50}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {macroData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex-1 space-y-2 ml-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-rose-500" />
              <span className="text-sm">Белки: {targets.protein}г ({Math.round(targets.protein * 4 / targets.calories * 100)}%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-amber-500" />
              <span className="text-sm">Жиры: {targets.fat}г ({Math.round(targets.fat * 9 / targets.calories * 100)}%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span className="text-sm">Углеводы: {targets.carbs}г ({Math.round(targets.carbs * 4 / targets.calories * 100)}%)</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Тренд веса */}
      {weightChartData.length > 1 && (
        <Card>
          <h3 className="font-medium mb-3">Тренд веса (14 дней)</h3>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weightChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={10} />
                <YAxis 
                  stroke="#64748b" 
                  fontSize={10} 
                  domain={['dataMin - 0.5', 'dataMax + 0.5']}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: 8 }}
                />
                <Line
                  type="monotone"
                  dataKey="weight"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ fill: '#10b981', strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* Рекомендации */}
      <Card className="bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 border-emerald-500/30">
        <h3 className="font-medium mb-2 flex items-center gap-2">
          <Target className="text-emerald-400" size={18} />
          AI-рекомендации
        </h3>
        <ul className="text-sm text-slate-300 space-y-2">
          {profile.goal === 'lose' && (
            <>
              <li>• Оптимальная потеря веса: 0.5-1% от массы тела в неделю</li>
              <li>• Не снижайте калории более чем на 500 ккал от TDEE</li>
              <li>• Приоритет белку: {Math.round(profile.weight * 1.8)}-{Math.round(profile.weight * 2.2)}г в день</li>
            </>
          )}
          {profile.goal === 'gain' && (
            <>
              <li>• Оптимальный набор: 0.25-0.5% от массы тела в неделю</li>
              <li>• Профицит 200-500 ккал минимизирует набор жира</li>
              <li>• Белок: не менее {Math.round(profile.weight * 1.6)}г в день</li>
            </>
          )}
          {profile.goal === 'maintain' && (
            <>
              <li>• Следите за балансом калорий ±100 ккал от TDEE</li>
              <li>• Белок: {Math.round(profile.weight * 1.4)}-{Math.round(profile.weight * 1.8)}г в день</li>
              <li>• Регулярные взвешивания помогут отслеживать тренд</li>
            </>
          )}
        </ul>
      </Card>
    </div>
  );
}

// ============ PROFILE TAB ============
function ProfileTab({
  profile, targets, onEdit
}: {
  profile: UserProfile;
  targets: NutritionTargets;
  onEdit: () => void;
}) {
  const bmi = calculateBMI(profile.weight, profile.height);
  const bmiCategory = getBMICategory(bmi);
  const bmr = calculateBMR(profile.weight, profile.height, profile.age, profile.gender);
  const tdee = calculateTDEE(bmr, profile.activityLevel);
  const safety = checkDeficitSafety(targets.calories, tdee, profile.gender);

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center">
              <User size={32} className="text-white" />
            </div>
            <div>
              <p className="text-xl font-bold">{profile.name || 'Пользователь'}</p>
              <p className="text-sm text-slate-500">{goalNames[profile.goal]}</p>
            </div>
          </div>
          <button
            onClick={onEdit}
            className="px-4 py-2 bg-slate-800 rounded-xl text-sm"
          >
            Изменить
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-800 rounded-xl p-3">
            <p className="text-xs text-slate-500">Возраст</p>
            <p className="font-bold">{profile.age} лет</p>
          </div>
          <div className="bg-slate-800 rounded-xl p-3">
            <p className="text-xs text-slate-500">Пол</p>
            <p className="font-bold">{profile.gender === 'male' ? 'Мужской' : 'Женский'}</p>
          </div>
          <div className="bg-slate-800 rounded-xl p-3">
            <p className="text-xs text-slate-500">Рост</p>
            <p className="font-bold">{profile.height} см</p>
          </div>
          <div className="bg-slate-800 rounded-xl p-3">
            <p className="text-xs text-slate-500">Вес</p>
            <p className="font-bold">{profile.weight} кг</p>
          </div>
        </div>
      </Card>

      <Card>
        <h3 className="font-medium mb-3">Активность</h3>
        <p className="text-slate-400">{activityLevelNames[profile.activityLevel]}</p>
      </Card>

      <Card>
        <h3 className="font-medium mb-3">Показатели</h3>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-slate-400">ИМТ</span>
            <span className={`font-medium ${bmiCategory.color}`}>
              {bmi} ({bmiCategory.category})
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">BMR (базовый метаболизм)</span>
            <span className="font-medium">{Math.round(bmr)} ккал</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">TDEE (с активностью)</span>
            <span className="font-medium">{tdee} ккал</span>
          </div>
        </div>
      </Card>

      <Card>
        <h3 className="font-medium mb-3">Дневные цели</h3>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-slate-400">Калории</span>
            <span className="font-medium text-emerald-400">{targets.calories} ккал</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Белки</span>
            <span className="font-medium">{targets.protein} г</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Жиры</span>
            <span className="font-medium">{targets.fat} г</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Углеводы</span>
            <span className="font-medium">{targets.carbs} г</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Вода</span>
            <span className="font-medium">{targets.water} мл</span>
          </div>
        </div>
      </Card>

      {!safety.safe && (
        <Card className="bg-rose-500/10 border-rose-500/30">
          <div className="flex items-start gap-2">
            <AlertTriangle className="text-rose-400 flex-shrink-0 mt-0.5" size={18} />
            <p className="text-sm text-rose-300">{safety.message}</p>
          </div>
        </Card>
      )}
    </div>
  );
}

// ============ PROFILE SETUP ============
function ProfileSetup({ onSave, existingProfile }: { 
  onSave: (profile: UserProfile) => void; 
  existingProfile: UserProfile | null;
}) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState(existingProfile?.name || '');
  const [age, setAge] = useState(existingProfile?.age || 30);
  const [gender, setGender] = useState<Gender>(existingProfile?.gender || 'male');
  const [height, setHeight] = useState(existingProfile?.height || 175);
  const [weight, setWeight] = useState(existingProfile?.weight || 75);
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>(existingProfile?.activityLevel || 'moderate');
  const [goal, setGoal] = useState<Goal>(existingProfile?.goal || 'lose');
  const [targetWeight, setTargetWeight] = useState(existingProfile?.targetWeight || 70);

  const handleSubmit = () => {
    const profile: UserProfile = {
      id: existingProfile?.id || generateId(),
      name,
      age,
      gender,
      height,
      weight,
      activityLevel,
      goal,
      targetWeight,
      createdAt: existingProfile?.createdAt || Date.now(),
      updatedAt: Date.now()
    };
    onSave(profile);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      <div className="flex-1 px-6 py-8">
        {/* Progress */}
        <div className="flex gap-2 mb-8">
          {[1, 2, 3, 4].map(s => (
            <div
              key={s}
              className={`flex-1 h-1 rounded-full ${s <= step ? 'bg-emerald-500' : 'bg-slate-800'}`}
            />
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h1 className="text-2xl font-bold">Добро пожаловать в BodyOS</h1>
              <p className="text-slate-400 mt-2">Давайте настроим ваш профиль</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-2">Ваше имя</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Введите имя"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">Возраст</label>
                <input
                  type="number"
                  value={age}
                  onChange={e => setAge(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">Пол</label>
                <div className="grid grid-cols-2 gap-3">
                  {(['male', 'female'] as Gender[]).map(g => (
                    <button
                      key={g}
                      onClick={() => setGender(g)}
                      className={`py-3 rounded-xl font-medium transition-all ${
                        gender === g
                          ? 'bg-emerald-500 text-white'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {g === 'male' ? 'Мужской' : 'Женский'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h1 className="text-2xl font-bold">Параметры тела</h1>
              <p className="text-slate-400 mt-2">Для точного расчёта калорий</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-2">Рост (см)</label>
                <input
                  type="number"
                  value={height}
                  onChange={e => setHeight(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">Текущий вес (кг)</label>
                <input
                  type="number"
                  value={weight}
                  onChange={e => setWeight(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">Целевой вес (кг)</label>
                <input
                  type="number"
                  value={targetWeight}
                  onChange={e => setTargetWeight(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h1 className="text-2xl font-bold">Уровень активности</h1>
              <p className="text-slate-400 mt-2">Как часто вы тренируетесь?</p>
            </div>

            <div className="space-y-3">
              {(Object.entries(activityLevelNames) as [ActivityLevel, string][]).map(([level, label]) => (
                <button
                  key={level}
                  onClick={() => setActivityLevel(level)}
                  className={`w-full text-left p-4 rounded-xl transition-all ${
                    activityLevel === level
                      ? 'bg-emerald-500/20 border-2 border-emerald-500'
                      : 'bg-slate-800 border-2 border-transparent'
                  }`}
                >
                  <p className="font-medium">{label}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {level === 'sedentary' && 'Офисная работа, без тренировок'}
                    {level === 'light' && '1-3 тренировки в неделю'}
                    {level === 'moderate' && '3-5 тренировок в неделю'}
                    {level === 'active' && '6-7 тренировок в неделю'}
                    {level === 'veryActive' && '2 тренировки в день / физ. работа'}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h1 className="text-2xl font-bold">Ваша цель</h1>
              <p className="text-slate-400 mt-2">Что вы хотите достичь?</p>
            </div>

            <div className="space-y-3">
              {(Object.entries(goalNames) as [Goal, string][]).map(([g, label]) => (
                <button
                  key={g}
                  onClick={() => setGoal(g)}
                  className={`w-full text-left p-4 rounded-xl transition-all ${
                    goal === g
                      ? 'bg-emerald-500/20 border-2 border-emerald-500'
                      : 'bg-slate-800 border-2 border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {g === 'lose' && <TrendingDown className="text-emerald-400" size={24} />}
                    {g === 'maintain' && <Target className="text-blue-400" size={24} />}
                    {g === 'gain' && <TrendingUp className="text-amber-400" size={24} />}
                    <div>
                      <p className="font-medium">{label}</p>
                      <p className="text-xs text-slate-500">
                        {g === 'lose' && 'Снижение веса с сохранением мышц'}
                        {g === 'maintain' && 'Поддержание текущей формы'}
                        {g === 'gain' && 'Набор мышечной массы'}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-6 border-t border-slate-800">
        <div className="flex gap-3">
          {step > 1 && (
            <button
              onClick={() => setStep(s => s - 1)}
              className="flex-1 py-3 bg-slate-800 rounded-xl font-medium"
            >
              Назад
            </button>
          )}
          {step < 4 ? (
            <button
              onClick={() => setStep(s => s + 1)}
              className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-xl font-medium"
            >
              Далее
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-xl font-medium"
            >
              Начать
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============ MODAL FORMS ============

function AddWeightModal({ currentWeight, onSave, onClose }: {
  currentWeight: number;
  onSave: (weight: number) => void;
  onClose: () => void;
}) {
  const [weight, setWeight] = useState(currentWeight);

  return (
    <Modal onClose={onClose} title="Записать вес">
      <div className="space-y-4">
        <div className="text-center">
          <input
            type="number"
            value={weight}
            onChange={e => setWeight(Number(e.target.value))}
            step="0.1"
            className="text-4xl font-bold text-center bg-transparent border-none focus:outline-none w-32"
          />
          <span className="text-xl text-slate-400">кг</span>
        </div>
        
        <div className="flex gap-2 justify-center">
          {[-0.5, -0.1, 0.1, 0.5].map(delta => (
            <button
              key={delta}
              onClick={() => setWeight(w => Math.round((w + delta) * 10) / 10)}
              className="px-4 py-2 bg-slate-800 rounded-lg text-sm"
            >
              {delta > 0 ? '+' : ''}{delta}
            </button>
          ))}
        </div>
        
        <button
          onClick={() => onSave(weight)}
          className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 py-3 rounded-xl font-medium"
        >
          Сохранить
        </button>
      </div>
    </Modal>
  );
}

function AddWorkoutModal({ date, onSave, onClose }: {
  date: string;
  onSave: (workout: Omit<Workout, 'id' | 'timestamp'>) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState('');
  const [type, setType] = useState<Workout['type']>('strength');
  const [duration, setDuration] = useState(60);
  const [calories, setCalories] = useState(300);

  return (
    <Modal onClose={onClose} title="Добавить тренировку">
      <div className="space-y-4">
        <div>
          <label className="block text-sm text-slate-400 mb-2">Название</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Например: Силовая в зале"
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm text-slate-400 mb-2">Тип</label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: 'cardio', label: '🏃 Кардио' },
              { value: 'strength', label: '💪 Силовая' },
              { value: 'mixed', label: '🔥 Смешанная' },
              { value: 'other', label: '🏋️ Другое' }
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => setType(opt.value as Workout['type'])}
                className={`py-2 rounded-lg text-sm ${
                  type === opt.value
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-slate-400 mb-2">Длительность (мин)</label>
            <input
              type="number"
              value={duration}
              onChange={e => setDuration(Number(e.target.value))}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-emerald-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-2">Калории</label>
            <input
              type="number"
              value={calories}
              onChange={e => setCalories(Number(e.target.value))}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-emerald-500 focus:outline-none"
            />
          </div>
        </div>

        <button
          onClick={() => onSave({ date, type, name: name || 'Тренировка', duration, caloriesBurned: calories })}
          disabled={!name && !duration}
          className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 py-3 rounded-xl font-medium disabled:opacity-50"
        >
          Добавить
        </button>
      </div>
    </Modal>
  );
}

function AddSupplementModal({ onSave, onClose }: {
  onSave: (supp: Omit<Supplement, 'id'>) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [timeOfDay, setTimeOfDay] = useState<string[]>(['утро']);

  const times = ['утро', 'день', 'вечер', 'на ночь'];

  return (
    <Modal onClose={onClose} title="Добавить БАД">
      <div className="space-y-4">
        <div>
          <label className="block text-sm text-slate-400 mb-2">Название</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Например: Витамин D3"
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm text-slate-400 mb-2">Дозировка</label>
          <input
            type="text"
            value={dosage}
            onChange={e => setDosage(e.target.value)}
            placeholder="Например: 5000 МЕ"
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm text-slate-400 mb-2">Время приёма</label>
          <div className="flex flex-wrap gap-2">
            {times.map(time => (
              <button
                key={time}
                onClick={() => {
                  setTimeOfDay(prev =>
                    prev.includes(time)
                      ? prev.filter(t => t !== time)
                      : [...prev, time]
                  );
                }}
                className={`px-4 py-2 rounded-lg text-sm ${
                  timeOfDay.includes(time)
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {time}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => onSave({ name, dosage, frequency: 'daily', timeOfDay })}
          disabled={!name}
          className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 py-3 rounded-xl font-medium disabled:opacity-50"
        >
          Добавить
        </button>
      </div>
    </Modal>
  );
}

export default App;
