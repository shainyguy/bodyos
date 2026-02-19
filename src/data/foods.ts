// Базовая база данных продуктов
import type { FoodItem } from '../types';

export const defaultFoods: Omit<FoodItem, 'id' | 'isCustom' | 'isFavorite'>[] = [
  // Белковые продукты
  { name: 'Куриная грудка', calories: 165, protein: 31, carbs: 0, fat: 3.6, fiber: 0, sugar: 0, sodium: 74, servingSize: 100, servingUnit: 'г' },
  { name: 'Яйцо куриное', calories: 155, protein: 13, carbs: 1.1, fat: 11, fiber: 0, sugar: 1.1, sodium: 124, servingSize: 100, servingUnit: 'г' },
  { name: 'Творог 5%', calories: 121, protein: 17, carbs: 3, fat: 5, fiber: 0, sugar: 3, sodium: 41, servingSize: 100, servingUnit: 'г' },
  { name: 'Творог 0%', calories: 71, protein: 18, carbs: 3.3, fat: 0.1, fiber: 0, sugar: 3.3, sodium: 44, servingSize: 100, servingUnit: 'г' },
  { name: 'Лосось', calories: 208, protein: 20, carbs: 0, fat: 13, fiber: 0, sugar: 0, sodium: 59, servingSize: 100, servingUnit: 'г' },
  { name: 'Тунец консервированный', calories: 116, protein: 26, carbs: 0, fat: 1, fiber: 0, sugar: 0, sodium: 338, servingSize: 100, servingUnit: 'г' },
  { name: 'Говядина постная', calories: 250, protein: 26, carbs: 0, fat: 15, fiber: 0, sugar: 0, sodium: 72, servingSize: 100, servingUnit: 'г' },
  { name: 'Индейка', calories: 189, protein: 29, carbs: 0, fat: 7, fiber: 0, sugar: 0, sodium: 70, servingSize: 100, servingUnit: 'г' },
  { name: 'Греческий йогурт', calories: 59, protein: 10, carbs: 3.6, fat: 0.7, fiber: 0, sugar: 3.2, sodium: 36, servingSize: 100, servingUnit: 'г' },
  { name: 'Протеиновый коктейль', calories: 120, protein: 24, carbs: 3, fat: 1, fiber: 0, sugar: 1, sodium: 150, servingSize: 30, servingUnit: 'г' },
  
  // Углеводы
  { name: 'Рис белый', calories: 130, protein: 2.7, carbs: 28, fat: 0.3, fiber: 0.4, sugar: 0, sodium: 1, servingSize: 100, servingUnit: 'г' },
  { name: 'Рис бурый', calories: 111, protein: 2.6, carbs: 23, fat: 0.9, fiber: 1.8, sugar: 0.4, sodium: 5, servingSize: 100, servingUnit: 'г' },
  { name: 'Гречка', calories: 92, protein: 3.4, carbs: 20, fat: 0.6, fiber: 2.7, sugar: 0.9, sodium: 4, servingSize: 100, servingUnit: 'г' },
  { name: 'Овсянка', calories: 68, protein: 2.5, carbs: 12, fat: 1.4, fiber: 1.7, sugar: 0.5, sodium: 49, servingSize: 100, servingUnit: 'г' },
  { name: 'Макароны', calories: 131, protein: 5, carbs: 25, fat: 1.1, fiber: 1.8, sugar: 0.6, sodium: 1, servingSize: 100, servingUnit: 'г' },
  { name: 'Хлеб цельнозерновой', calories: 247, protein: 13, carbs: 41, fat: 3.4, fiber: 7, sugar: 6, sodium: 400, servingSize: 100, servingUnit: 'г' },
  { name: 'Картофель', calories: 77, protein: 2, carbs: 17, fat: 0.1, fiber: 2.2, sugar: 0.8, sodium: 6, servingSize: 100, servingUnit: 'г' },
  { name: 'Банан', calories: 89, protein: 1.1, carbs: 23, fat: 0.3, fiber: 2.6, sugar: 12, sodium: 1, servingSize: 100, servingUnit: 'г' },
  
  // Жиры
  { name: 'Авокадо', calories: 160, protein: 2, carbs: 9, fat: 15, fiber: 7, sugar: 0.7, sodium: 7, servingSize: 100, servingUnit: 'г' },
  { name: 'Оливковое масло', calories: 884, protein: 0, carbs: 0, fat: 100, fiber: 0, sugar: 0, sodium: 2, servingSize: 100, servingUnit: 'мл' },
  { name: 'Миндаль', calories: 579, protein: 21, carbs: 22, fat: 50, fiber: 12, sugar: 4.4, sodium: 1, servingSize: 100, servingUnit: 'г' },
  { name: 'Арахисовая паста', calories: 588, protein: 25, carbs: 20, fat: 50, fiber: 6, sugar: 9, sodium: 459, servingSize: 100, servingUnit: 'г' },
  { name: 'Грецкие орехи', calories: 654, protein: 15, carbs: 14, fat: 65, fiber: 7, sugar: 2.6, sodium: 2, servingSize: 100, servingUnit: 'г' },
  
  // Овощи
  { name: 'Брокколи', calories: 34, protein: 2.8, carbs: 7, fat: 0.4, fiber: 2.6, sugar: 1.7, sodium: 33, servingSize: 100, servingUnit: 'г' },
  { name: 'Огурец', calories: 15, protein: 0.7, carbs: 3.6, fat: 0.1, fiber: 0.5, sugar: 1.7, sodium: 2, servingSize: 100, servingUnit: 'г' },
  { name: 'Помидор', calories: 18, protein: 0.9, carbs: 3.9, fat: 0.2, fiber: 1.2, sugar: 2.6, sodium: 5, servingSize: 100, servingUnit: 'г' },
  { name: 'Шпинат', calories: 23, protein: 2.9, carbs: 3.6, fat: 0.4, fiber: 2.2, sugar: 0.4, sodium: 79, servingSize: 100, servingUnit: 'г' },
  { name: 'Морковь', calories: 41, protein: 0.9, carbs: 10, fat: 0.2, fiber: 2.8, sugar: 4.7, sodium: 69, servingSize: 100, servingUnit: 'г' },
  { name: 'Капуста', calories: 25, protein: 1.3, carbs: 6, fat: 0.1, fiber: 2.5, sugar: 3.2, sodium: 18, servingSize: 100, servingUnit: 'г' },
  { name: 'Перец болгарский', calories: 31, protein: 1, carbs: 6, fat: 0.3, fiber: 2.1, sugar: 4.2, sodium: 4, servingSize: 100, servingUnit: 'г' },
  
  // Фрукты
  { name: 'Яблоко', calories: 52, protein: 0.3, carbs: 14, fat: 0.2, fiber: 2.4, sugar: 10, sodium: 1, servingSize: 100, servingUnit: 'г' },
  { name: 'Апельсин', calories: 47, protein: 0.9, carbs: 12, fat: 0.1, fiber: 2.4, sugar: 9, sodium: 0, servingSize: 100, servingUnit: 'г' },
  { name: 'Клубника', calories: 32, protein: 0.7, carbs: 8, fat: 0.3, fiber: 2, sugar: 4.9, sodium: 1, servingSize: 100, servingUnit: 'г' },
  { name: 'Черника', calories: 57, protein: 0.7, carbs: 14, fat: 0.3, fiber: 2.4, sugar: 10, sodium: 1, servingSize: 100, servingUnit: 'г' },
  
  // Молочные
  { name: 'Молоко 2.5%', calories: 52, protein: 2.8, carbs: 4.7, fat: 2.5, fiber: 0, sugar: 4.7, sodium: 50, servingSize: 100, servingUnit: 'мл' },
  { name: 'Кефир 1%', calories: 40, protein: 3, carbs: 4, fat: 1, fiber: 0, sugar: 4, sodium: 52, servingSize: 100, servingUnit: 'мл' },
  { name: 'Сыр твёрдый', calories: 402, protein: 25, carbs: 1.3, fat: 33, fiber: 0, sugar: 0.5, sodium: 621, servingSize: 100, servingUnit: 'г' },
  
  // Напитки
  { name: 'Кофе чёрный', calories: 2, protein: 0.3, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 5, servingSize: 240, servingUnit: 'мл' },
  { name: 'Чай без сахара', calories: 1, protein: 0, carbs: 0.3, fat: 0, fiber: 0, sugar: 0, sodium: 3, servingSize: 240, servingUnit: 'мл' },
  
  // Сладости (для учёта)
  { name: 'Шоколад молочный', calories: 535, protein: 8, carbs: 59, fat: 30, fiber: 2.3, sugar: 52, sodium: 79, servingSize: 100, servingUnit: 'г' },
  { name: 'Мёд', calories: 304, protein: 0.3, carbs: 82, fat: 0, fiber: 0.2, sugar: 82, sodium: 4, servingSize: 100, servingUnit: 'г' },
];

// Инициализация базы данных продуктов
export function initializeFoodsDB(): FoodItem[] {
  return defaultFoods.map((food, index) => ({
    ...food,
    id: `default-${index}`,
    isCustom: false,
    isFavorite: false,
  }));
}
