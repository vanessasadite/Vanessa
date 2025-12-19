
export enum Gender {
  MALE = 'Masculino',
  FEMALE = 'Feminino'
}

export type MealType = 'Café da Manhã' | 'Colação' | 'Almoço' | 'Lanche da Tarde' | 'Jantar';

export const MEAL_TYPES: MealType[] = [
  'Café da Manhã',
  'Colação',
  'Almoço',
  'Lanche da Tarde',
  'Jantar'
];

export interface UserProfile {
  weight: number;
  height: number;
  age: number;
  gender: Gender;
  activityLevel: number;
  tmb: number;
  tdee: number;
  imc: number;
  imcClassification: string;
}

export interface FoodItem {
  id: string;
  name: string;
  calories: number;
  carbs: number;
  protein: number;
  lipids: number;
  portion: number;
  source: string;
  meal: MealType;
}
