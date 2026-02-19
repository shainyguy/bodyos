// IndexedDB утилиты для BodyOS
import { openDB, DBSchema, IDBPDatabase } from 'idb';
import type {
  UserProfile,
  FoodItem,
  MealEntry,
  WaterEntry,
  WeightEntry,
  BodyMeasurement,
  Supplement,
  SupplementEntry,
  Workout,
  MealTemplate,
} from '../types';

interface BodyOSDB extends DBSchema {
  profile: {
    key: string;
    value: UserProfile;
  };
  foods: {
    key: string;
    value: FoodItem;
    indexes: { 'by-name': string; 'by-barcode': string };
  };
  meals: {
    key: string;
    value: MealEntry;
    indexes: { 'by-date': string };
  };
  water: {
    key: string;
    value: WaterEntry;
    indexes: { 'by-date': string };
  };
  weights: {
    key: string;
    value: WeightEntry;
    indexes: { 'by-date': string };
  };
  measurements: {
    key: string;
    value: BodyMeasurement;
    indexes: { 'by-date': string };
  };
  supplements: {
    key: string;
    value: Supplement;
  };
  supplementEntries: {
    key: string;
    value: SupplementEntry;
    indexes: { 'by-date': string };
  };
  workouts: {
    key: string;
    value: Workout;
    indexes: { 'by-date': string };
  };
  mealTemplates: {
    key: string;
    value: MealTemplate;
  };
}

let db: IDBPDatabase<BodyOSDB> | null = null;

export async function initDB() {
  if (db) return db;

  db = await openDB<BodyOSDB>('bodyos-db', 1, {
    upgrade(database) {
      // Profile store
      database.createObjectStore('profile', { keyPath: 'id' });

      // Foods store
      const foodsStore = database.createObjectStore('foods', { keyPath: 'id' });
      foodsStore.createIndex('by-name', 'name');
      foodsStore.createIndex('by-barcode', 'barcode');

      // Meals store
      const mealsStore = database.createObjectStore('meals', { keyPath: 'id' });
      mealsStore.createIndex('by-date', 'date');

      // Water store
      const waterStore = database.createObjectStore('water', { keyPath: 'id' });
      waterStore.createIndex('by-date', 'date');

      // Weights store
      const weightsStore = database.createObjectStore('weights', { keyPath: 'id' });
      weightsStore.createIndex('by-date', 'date');

      // Measurements store
      const measurementsStore = database.createObjectStore('measurements', { keyPath: 'id' });
      measurementsStore.createIndex('by-date', 'date');

      // Supplements store
      database.createObjectStore('supplements', { keyPath: 'id' });

      // Supplement entries store
      const supplementEntriesStore = database.createObjectStore('supplementEntries', { keyPath: 'id' });
      supplementEntriesStore.createIndex('by-date', 'date');

      // Workouts store
      const workoutsStore = database.createObjectStore('workouts', { keyPath: 'id' });
      workoutsStore.createIndex('by-date', 'date');

      // Meal templates store
      database.createObjectStore('mealTemplates', { keyPath: 'id' });
    },
  });

  return db;
}

type StoreNames = 'profile' | 'foods' | 'meals' | 'water' | 'weights' | 'measurements' | 'supplements' | 'supplementEntries' | 'workouts' | 'mealTemplates';

// Generic CRUD операции
export async function getAll<T extends StoreNames>(storeName: T): Promise<BodyOSDB[T]['value'][]> {
  const database = await initDB();
  return database.getAll(storeName);
}

export async function get<T extends StoreNames>(
  storeName: T,
  key: string
): Promise<BodyOSDB[T]['value'] | undefined> {
  const database = await initDB();
  return database.get(storeName, key);
}

export async function put<T extends StoreNames>(
  storeName: T,
  value: BodyOSDB[T]['value']
): Promise<string> {
  const database = await initDB();
  return database.put(storeName, value);
}

export async function deleteItem<T extends StoreNames>(storeName: T, key: string): Promise<void> {
  const database = await initDB();
  return database.delete(storeName, key);
}

// Специальные запросы
export async function getMealsByDate(date: string): Promise<MealEntry[]> {
  const database = await initDB();
  return database.getAllFromIndex('meals', 'by-date', date);
}

export async function getWaterByDate(date: string): Promise<WaterEntry[]> {
  const database = await initDB();
  return database.getAllFromIndex('water', 'by-date', date);
}

export async function getWeightByDate(date: string): Promise<WeightEntry | undefined> {
  const database = await initDB();
  const entries = await database.getAllFromIndex('weights', 'by-date', date);
  return entries[0];
}

export async function getWorkoutsByDate(date: string): Promise<Workout[]> {
  const database = await initDB();
  return database.getAllFromIndex('workouts', 'by-date', date);
}

export async function getSupplementEntriesByDate(date: string): Promise<SupplementEntry[]> {
  const database = await initDB();
  return database.getAllFromIndex('supplementEntries', 'by-date', date);
}

export async function searchFoods(query: string): Promise<FoodItem[]> {
  const database = await initDB();
  const allFoods = await database.getAll('foods');
  const lowerQuery = query.toLowerCase();
  return allFoods.filter(
    (food) =>
      food.name.toLowerCase().includes(lowerQuery) ||
      food.brand?.toLowerCase().includes(lowerQuery)
  );
}

export async function getFoodByBarcode(barcode: string): Promise<FoodItem | undefined> {
  const database = await initDB();
  const foods = await database.getAllFromIndex('foods', 'by-barcode', barcode);
  return foods[0];
}

// Получить записи веса за период
export async function getWeightHistory(days: number = 30): Promise<WeightEntry[]> {
  const database = await initDB();
  const allWeights = await database.getAll('weights');
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  
  return allWeights
    .filter((w) => new Date(w.date) >= cutoffDate)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

// Получить статистику за период
export async function getStatsForDateRange(
  startDate: string,
  endDate: string
): Promise<{ date: string; meals: MealEntry[]; water: WaterEntry[]; weight?: WeightEntry }[]> {
  const database = await initDB();
  const allMeals = await database.getAll('meals');
  const allWater = await database.getAll('water');
  const allWeights = await database.getAll('weights');

  const stats: { date: string; meals: MealEntry[]; water: WaterEntry[]; weight?: WeightEntry }[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];
    stats.push({
      date: dateStr,
      meals: allMeals.filter((m) => m.date === dateStr),
      water: allWater.filter((w) => w.date === dateStr),
      weight: allWeights.find((w) => w.date === dateStr),
    });
  }

  return stats;
}
