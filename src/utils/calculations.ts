// Расчёты BMR, TDEE, БЖУ и других показателей
import type { UserProfile, NutritionTargets, ActivityLevel, Goal } from '../types';

// Коэффициенты активности для TDEE
const activityMultipliers: Record<ActivityLevel, number> = {
  sedentary: 1.2,      // Сидячий образ жизни
  light: 1.375,        // Лёгкая активность (1-3 тренировки в неделю)
  moderate: 1.55,      // Умеренная активность (3-5 тренировок)
  active: 1.725,       // Высокая активность (6-7 тренировок)
  veryActive: 1.9,     // Очень высокая активность (2 тренировки в день)
};

// Формула Миффлина-Сан Жеора для расчёта BMR
export function calculateBMR(
  weight: number,
  height: number,
  age: number,
  gender: 'male' | 'female'
): number {
  if (gender === 'male') {
    return 10 * weight + 6.25 * height - 5 * age + 5;
  } else {
    return 10 * weight + 6.25 * height - 5 * age - 161;
  }
}

// Расчёт TDEE (Total Daily Energy Expenditure)
export function calculateTDEE(bmr: number, activityLevel: ActivityLevel): number {
  return Math.round(bmr * activityMultipliers[activityLevel]);
}

// Расчёт целевых калорий на основе цели
export function calculateTargetCalories(tdee: number, goal: Goal): number {
  switch (goal) {
    case 'lose':
      // Дефицит 20% для похудения
      return Math.round(tdee * 0.8);
    case 'gain':
      // Профицит 15% для набора
      return Math.round(tdee * 1.15);
    case 'maintain':
    default:
      return tdee;
  }
}

// Расчёт БЖУ на основе цели
export function calculateMacros(
  calories: number,
  weight: number,
  goal: Goal
): { protein: number; carbs: number; fat: number } {
  let proteinRatio: number;
  let fatRatio: number;

  switch (goal) {
    case 'lose':
      // При похудении: больше белка для сохранения мышц
      proteinRatio = 0.35; // 35% от калорий
      fatRatio = 0.25;     // 25% от калорий
      break;
    case 'gain':
      // При наборе: умеренный белок, больше углеводов
      proteinRatio = 0.25;
      fatRatio = 0.25;
      break;
    case 'maintain':
    default:
      proteinRatio = 0.30;
      fatRatio = 0.25;
  }

  const carbRatio = 1 - proteinRatio - fatRatio;

  // 1г белка = 4 ккал, 1г углеводов = 4 ккал, 1г жира = 9 ккал
  const protein = Math.round((calories * proteinRatio) / 4);
  const carbs = Math.round((calories * carbRatio) / 4);
  const fat = Math.round((calories * fatRatio) / 9);

  // Минимум белка - 1.6г на кг веса
  const minProtein = Math.round(weight * 1.6);

  return {
    protein: Math.max(protein, minProtein),
    carbs,
    fat,
  };
}

// Полный расчёт целей питания
export function calculateNutritionTargets(profile: UserProfile): NutritionTargets {
  const bmr = calculateBMR(profile.weight, profile.height, profile.age, profile.gender);
  const tdee = calculateTDEE(bmr, profile.activityLevel);
  const targetCalories = calculateTargetCalories(tdee, profile.goal);
  const macros = calculateMacros(targetCalories, profile.weight, profile.goal);

  // Рекомендации по клетчатке, сахару и соли
  const fiber = profile.gender === 'male' ? 38 : 25; // г/день
  const sugar = Math.round(targetCalories * 0.05 / 4); // максимум 5% калорий
  const sodium = 2300; // мг/день (WHO рекомендация)
  
  // Вода: 35мл на кг веса
  const water = Math.round(profile.weight * 35);

  return {
    calories: targetCalories,
    protein: macros.protein,
    carbs: macros.carbs,
    fat: macros.fat,
    fiber,
    sugar,
    sodium,
    water,
  };
}

// Расчёт ИМТ
export function calculateBMI(weight: number, height: number): number {
  const heightInMeters = height / 100;
  return Math.round((weight / (heightInMeters * heightInMeters)) * 10) / 10;
}

// Интерпретация ИМТ
export function getBMICategory(bmi: number): { category: string; color: string } {
  if (bmi < 18.5) return { category: 'Недостаток веса', color: 'text-blue-400' };
  if (bmi < 25) return { category: 'Норма', color: 'text-emerald-400' };
  if (bmi < 30) return { category: 'Избыточный вес', color: 'text-yellow-400' };
  if (bmi < 35) return { category: 'Ожирение I степени', color: 'text-orange-400' };
  if (bmi < 40) return { category: 'Ожирение II степени', color: 'text-red-400' };
  return { category: 'Ожирение III степени', color: 'text-red-600' };
}

// Расчёт прогноза веса
export function calculateWeightProjection(
  currentWeight: number,
  targetCalories: number,
  tdee: number,
  weeks: number
): number {
  // 7700 ккал = 1 кг жира
  const dailyDeficit = tdee - targetCalories;
  const weeklyChange = (dailyDeficit * 7) / 7700;
  return Math.round((currentWeight - weeklyChange * weeks) * 10) / 10;
}

// Расчёт времени до достижения цели
export function calculateTimeToGoal(
  currentWeight: number,
  targetWeight: number,
  targetCalories: number,
  tdee: number
): number {
  const weightDiff = currentWeight - targetWeight;
  const dailyDeficit = tdee - targetCalories;
  
  if (dailyDeficit === 0) return Infinity;
  
  // Дней на 1 кг = 7700 / дневной дефицит
  const daysPerKg = 7700 / Math.abs(dailyDeficit);
  const totalDays = Math.abs(weightDiff) * daysPerKg;
  
  return Math.ceil(totalDays / 7); // в неделях
}

// Проверка безопасности дефицита
export function checkDeficitSafety(
  targetCalories: number,
  tdee: number,
  gender: 'male' | 'female'
): { safe: boolean; message: string } {
  const minCalories = gender === 'male' ? 1500 : 1200;
  const deficitPercent = ((tdee - targetCalories) / tdee) * 100;

  if (targetCalories < minCalories) {
    return {
      safe: false,
      message: `⚠️ Калории ниже безопасного минимума (${minCalories} ккал). Риск потери мышц и метаболических нарушений.`,
    };
  }

  if (deficitPercent > 25) {
    return {
      safe: false,
      message: `⚠️ Дефицит ${Math.round(deficitPercent)}% слишком агрессивен. Рекомендуется не более 20-25%.`,
    };
  }

  return { safe: true, message: '' };
}

// Расчёт оптимальной скорости похудения/набора
export function calculateOptimalWeeklyChange(weight: number, goal: Goal): { min: number; max: number } {
  if (goal === 'maintain') return { min: 0, max: 0 };
  
  // 0.5-1% от веса в неделю
  return {
    min: Math.round(weight * 0.005 * 10) / 10,
    max: Math.round(weight * 0.01 * 10) / 10,
  };
}

// Расчёт индекса дисциплины
export function calculateDisciplineScore(
  actualCalories: number,
  targetCalories: number,
  actualWater: number,
  targetWater: number,
  supplementsTaken: number,
  supplementsTotal: number
): number {
  // Калории: отклонение до 10% = 100 баллов, каждые 5% сверх = -10 баллов
  const calorieDeviation = Math.abs(actualCalories - targetCalories) / targetCalories;
  const calorieScore = Math.max(0, 100 - Math.floor(calorieDeviation / 0.05) * 10);

  // Вода: процент выполнения
  const waterScore = Math.min(100, (actualWater / targetWater) * 100);

  // БАДы: процент приёма
  const supplementScore = supplementsTotal > 0 ? (supplementsTaken / supplementsTotal) * 100 : 100;

  // Взвешенная сумма
  return Math.round(calorieScore * 0.5 + waterScore * 0.3 + supplementScore * 0.2);
}

// AI-рекомендации по компенсации переедания
export function getCompensationAdvice(
  overCalories: number,
  remainingDaysInWeek: number
): string {
  if (overCalories <= 0) return '';
  
  const dailyReduction = Math.round(overCalories / Math.max(1, remainingDaysInWeek));
  const walkMinutes = Math.round(overCalories / 5); // ~5 ккал/мин ходьбы
  
  return `Переедание на ${overCalories} ккал. Варианты компенсации:
• Снизить калории на ${dailyReduction} ккал/день до конца недели
• Добавить ${walkMinutes} мин ходьбы
• Комбо: -${Math.round(dailyReduction / 2)} ккал + ${Math.round(walkMinutes / 2)} мин ходьбы`;
}

// Генерация ID
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Форматирование даты
export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

// Получить сегодняшнюю дату
export function getToday(): string {
  return formatDate(new Date());
}

// Названия уровней активности
export const activityLevelNames: Record<ActivityLevel, string> = {
  sedentary: 'Сидячий образ жизни',
  light: 'Лёгкая активность',
  moderate: 'Умеренная активность',
  active: 'Высокая активность',
  veryActive: 'Очень высокая активность',
};

// Названия целей
export const goalNames: Record<Goal, string> = {
  lose: 'Похудение',
  maintain: 'Поддержание веса',
  gain: 'Набор массы',
};
