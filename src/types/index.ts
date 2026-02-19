// Основные типы для BodyOS

export type Gender = 'male' | 'female';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'veryActive';
export type Goal = 'lose' | 'maintain' | 'gain';

export interface UserProfile {
  id: string;
  name: string;
  age: number;
  gender: Gender;
  height: number; // в см
  weight: number; // в кг
  activityLevel: ActivityLevel;
  goal: Goal;
  targetWeight: number;
  createdAt: number;
  updatedAt: number;
}

export interface NutritionTargets {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
  water: number;
}

export interface FoodItem {
  id: string;
  name: string;
  brand?: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
  servingSize: number;
  servingUnit: string;
  barcode?: string;
  isCustom: boolean;
  isFavorite: boolean;
}

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface MealEntry {
  id: string;
  date: string; // YYYY-MM-DD
  mealType: MealType;
  foodItem: FoodItem;
  servings: number;
  timestamp: number;
}

export interface WaterEntry {
  id: string;
  date: string;
  amount: number; // мл
  timestamp: number;
}

export interface WeightEntry {
  id: string;
  date: string;
  weight: number;
  timestamp: number;
  photoUrl?: string;
}

export interface BodyMeasurement {
  id: string;
  date: string;
  chest?: number;
  waist?: number;
  hips?: number;
  biceps?: number;
  thigh?: number;
  timestamp: number;
}

export interface Supplement {
  id: string;
  name: string;
  dosage: string;
  frequency: 'daily' | 'weekly' | 'asNeeded';
  timeOfDay: string[];
  notes?: string;
}

export interface SupplementEntry {
  id: string;
  supplementId: string;
  date: string;
  taken: boolean;
  timestamp: number;
}

export interface Workout {
  id: string;
  date: string;
  type: 'cardio' | 'strength' | 'mixed' | 'other';
  name: string;
  duration: number; // минуты
  caloriesBurned: number;
  notes?: string;
  timestamp: number;
}

export interface DailyStats {
  date: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
  water: number;
  weight?: number;
  workoutCalories: number;
  disciplineScore: number;
}

export interface MealTemplate {
  id: string;
  name: string;
  items: { foodItem: FoodItem; servings: number }[];
}
