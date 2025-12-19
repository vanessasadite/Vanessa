
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { UserProfile, FoodItem, Gender, MealType, MEAL_TYPES } from './types';
import { searchFoodNutrition, getFoodSuggestions } from './geminiService';

const USUARIOS_AUTORIZADOS = [
  { email: 'admin@nutricalc.com', chave: 'NUTRI123' },
  { email: 'teste@exemplo.com', chave: 'ALUNO2025' },
];

const App: React.FC = () => {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [portionInput, setPortionInput] = useState<number>(100);
  const [portionUnit, setPortionUnit] = useState<string>('g');
  const [selectedMeal, setSelectedMeal] = useState<MealType>('Café da Manhã');
  const [showTmbForm, setShowTmbForm] = useState(true);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [weight, setWeight] = useState(70);
  const [height, setHeight] = useState(170);
  const [age, setAge] = useState(30);
  const [gender, setGender] = useState<Gender>(Gender.MALE);
  const [activity, setActivity] = useState(1.2);

  const loginEmailRef = useRef<HTMLInputElement>(null);
  const loginPassRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const email = localStorage.getItem('nutri_user_email');
    if (email) setUserEmail(email);
    const data = localStorage.getItem('nutri_app_data');
    if (data) {
      const parsed = JSON.parse(data);
      if (parsed.profile) { setProfile(parsed.profile); setShowTmbForm(false); }
      if (parsed.foods) setFoods(parsed.foods);
    }
  }, []);

  useEffect(() => {
    if (userEmail) {
      localStorage.setItem('nutri_user_email', userEmail);
      localStorage.setItem('nutri_app_data', JSON.stringify({ profile, foods }));
    }
  }, [profile, foods, userEmail]);

  // Lógica de Autocomplete
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.length > 2) {
        const res = await getFoodSuggestions(searchQuery);
        setSuggestions(res);
        setShowSuggestions(true);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const totals = useMemo(() => {
    return foods.reduce((acc, f) => ({
      calories: acc.calories + (Number(f.calories) || 0),
      carbs: acc.carbs + (Number(f.carbs) || 0),
      protein: acc.protein + (Number(f.protein) || 0),
      lipids: acc.lipids + (Number(f.lipids) || 0)
    }), { calories: 0, carbs: 0, protein: 0, lipids: 0 });
  }, [foods]);

  const chartData = useMemo(() => [
    { name: 'Carboidratos', value: totals.carbs || 0.0001, color: '#f9d5e5' },
    { name: 'Proteínas', value: totals.protein || 0.0001, color: '#b8d8be' },
    { name: 'Gorduras', value: totals.lipids || 0.0001, color: '#eeac99' },
  ], [totals]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const email = loginEmailRef.current?.value.toLowerCase().trim();
    const pass = loginPassRef.current?.value.trim();
    const user = USUARIOS_AUTORIZADOS.find(u => u.email === email && u.chave === pass);
    if (user) setUserEmail(user.email);
    else alert('E-mail ou senha incorretos.');
  };

  const calculateTmb = (e: React.FormEvent) => {
    e.preventDefault();
    const tmbVal = gender === Gender.MALE 
      ? (10 * weight) + (6.25 * height) - (5 * age) + 5
      : (10 * weight) + (6.25 * height) - (5 * age) - 161;
    const tdeeVal = tmbVal * activity;
    const imcVal = weight / ((height / 100) ** 2);
    const imcClass = imcVal < 18.5 ? 'Abaixo do peso' : imcVal < 25 ? 'Normal' : imcVal < 30 ? 'Sobrepeso' : 'Obesidade';
    
    setProfile({ weight, height, age, gender, activityLevel: activity, tmb: tmbVal, tdee: tdeeVal, imc: imcVal, imcClassification: imcClass });
    setShowTmbForm(false);
  };

  const handleSearch = async (forcedQuery?: string) => {
    const q = forcedQuery || searchQuery;
    if (!q.trim()) return;
    setLoading(true);
    setShowSuggestions(false);
    try {
      const result = await searchFoodNutrition(q, portionInput, portionUnit);
      if (result && result.name) {
        const newItem: FoodItem = {
          id: Math.random().toString(36).substr(2, 9),
          name: result.name,
          calories: Number(result.calories) || 0,
          carbs: Number(result.carbs) || 0,
          protein: Number(result.protein) || 0,
          lipids: Number(result.lipids) || 0,
          portion: portionInput,
          source: result.source || 'TACO/TBCA',
          meal: selectedMeal
        };
        setFoods(prev => [newItem, ...prev]);
        setSearchQuery('');
      } else {
        alert("Não conseguimos processar este item. Verifique se o nome está correto.");
      }
    } catch (e) {
      alert("Erro ao conectar com as tabelas de nutrição.");
    } finally {
      setLoading(false);
    }
  };

  if (!userEmail) return (
    <div className="min-h-screen bg-[#fdfcf0] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white p-10 rounded-[3rem] shadow-xl border border-rose-50 text-center fade-in">
        <i className="fas fa-apple-whole text-5xl text-rose-300 mb-4 block"></i>
        <h1 className="text-3xl font-black text-slate-700 mb-8">NutriCalc</h1>
        <form onSubmit={handleLogin} className="space-y-4">
          <input ref={loginEmailRef} type="email" placeholder="E-mail" required className="w-full bg-slate-50 p-4 rounded-2xl outline-none border-2 border-transparent focus:border-rose-100 font-medium" />
          <input ref={loginPassRef} type="password" placeholder="Sua Chave" required className="w-full bg-slate-50 p-4 rounded-2xl outline-none border-2 border-transparent focus:border-rose-100 font-bold" />
          <button type="submit" className="w-full bg-slate-800 text-white font-black py-4 rounded-2xl active:scale-95 transition-all">ACESSAR</button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#fdfcf0] pb-12 fade-in">
      <div className="max-w-5xl mx-auto p-4 md:p-8">
        <header className="mb-10 flex justify-between items-center bg-white p-6 rounded-[2rem] shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center">
              <i className="fas fa-apple-whole text-rose-300"></i>
            </div>
            <h1 className="text-xl font-black text-slate-700">NutriCalc <span className="text-[10px] text-rose-300 font-bold uppercase tracking-widest ml-1">Taco/Tbca</span></h1>
          </div>
          <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="text-slate-300 hover:text-rose-400 p-2">
            <i className="fas fa-power-off text-lg"></i>
          </button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5 space-y-6">
            {showTmbForm ? (
              <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-50">
                <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-6 text-center">Cálculo de TMB</h2>
                <form onSubmit={calculateTmb} className="space-y-6 text-left">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-black text-slate-700 uppercase ml-2">Peso (kg)</label>
                      <input type="number" step="0.1" value={weight} onChange={e => setWeight(Number(e.target.value))} className="bg-slate-50 p-4 rounded-2xl w-full font-bold focus:ring-2 focus:ring-rose-200 outline-none" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-black text-slate-700 uppercase ml-2">Altura (cm)</label>
                      <input type="number" value={height} onChange={e => setHeight(Number(e.target.value))} className="bg-slate-50 p-4 rounded-2xl w-full font-bold focus:ring-2 focus:ring-rose-200 outline-none" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-black text-slate-700 uppercase ml-2">Idade</label>
                      <input type="number" value={age} onChange={e => setAge(Number(e.target.value))} className="bg-slate-50 p-4 rounded-2xl w-full font-bold focus:ring-2 focus:ring-rose-200 outline-none" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-black text-slate-700 uppercase ml-2">Gênero</label>
                      <select value={gender} onChange={e => setGender(e.target.value as Gender)} className="bg-slate-50 p-4 rounded-2xl w-full font-bold cursor-pointer outline-none">
                        <option value={Gender.MALE}>Masculino</option>
                        <option value={Gender.FEMALE}>Feminino</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-slate-700 uppercase ml-2">Nível de Atividade</label>
                    <select value={activity} onChange={e => setActivity(Number(e.target.value))} className="bg-slate-50 p-4 rounded-2xl w-full font-bold cursor-pointer outline-none">
                      <option value={1.2}>Sedentário</option>
                      <option value={1.375}>Leve (1-3x/sem)</option>
                      <option value={1.55}>Moderado (3-5x/sem)</option>
                      <option value={1.725}>Intenso (Todos os dias)</option>
                    </select>
                  </div>
                  <button type="submit" className="w-full bg-rose-300 text-white font-black py-5 rounded-2xl shadow-lg hover:bg-rose-400 transition-all">CALCULAR METAS</button>
                </form>
              </div>
            ) : (
              <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-rose-50 space-y-4">
                <div className="flex justify-between items-center px-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Resultado do Perfil</span>
                  <button onClick={() => setShowTmbForm(true)} className="text-[10px] font-bold text-rose-300 uppercase underline">Editar</button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-rose-50 p-5 rounded-3xl text-center">
                    <p className="text-[9px] font-black text-rose-300 uppercase mb-1">Taxa Basal</p>
                    <p className="text-3xl font-black text-slate-700">{profile?.tmb?.toFixed(0)}</p>
                  </div>
                  <div className="bg-emerald-50 p-5 rounded-3xl text-center">
                    <p className="text-[9px] font-black text-emerald-500 uppercase mb-1">Gasto Total</p>
                    <p className="text-3xl font-black text-slate-700">{profile?.tdee?.toFixed(0)}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-50 space-y-5">
              <h2 className="text-[11px] font-black text-slate-700 uppercase tracking-widest px-2 text-left">Lançar Alimento</h2>
              <div className="flex flex-wrap gap-1.5 px-2">
                {MEAL_TYPES.map(m => (
                  <button key={m} onClick={() => setSelectedMeal(m)} className={`text-[9px] px-4 py-2 rounded-full font-bold transition-all ${selectedMeal === m ? 'bg-sky-400 text-white shadow-md' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}>{m}</button>
                ))}
              </div>
              
              <div className="space-y-4 relative">
                <div className="space-y-1">
                   <label className="text-[11px] font-black text-slate-700 uppercase ml-2 block text-left">O que você comeu?</label>
                   <input type="text" placeholder="Ex: Arroz branco, Pão de forma..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onFocus={() => searchQuery.length > 2 && setShowSuggestions(true)} className="w-full bg-slate-50 p-4 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-sky-100 transition-all" />
                   
                   {showSuggestions && suggestions.length > 0 && (
                     <div className="absolute z-50 left-0 right-0 top-[72px] bg-white border border-slate-100 shadow-2xl rounded-2xl overflow-hidden fade-in">
                       {suggestions.map((s, idx) => (
                         <button key={idx} onClick={() => { setSearchQuery(s); handleSearch(s); }} className="w-full text-left p-4 text-sm font-bold text-slate-600 suggestion-item border-b border-slate-50 last:border-0 transition-colors">
                           {s}
                         </button>
                       ))}
                     </div>
                   )}
                </div>
                
                <div className="grid grid-cols-12 gap-2">
                  <div className="col-span-4 relative">
                    <label className="absolute -top-2 left-3 bg-white px-1 text-[9px] font-black text-slate-500 uppercase">Qtd.</label>
                    <input type="number" value={portionInput} onChange={e => setPortionInput(Number(e.target.value))} className="w-full bg-slate-50 p-4 rounded-2xl font-bold text-center border-2 border-transparent focus:border-sky-100 outline-none" />
                  </div>
                  <div className="col-span-4">
                    <select value={portionUnit} onChange={e => setPortionUnit(e.target.value)} className="w-full bg-slate-100 p-4 rounded-2xl font-bold text-[10px] outline-none cursor-pointer uppercase">
                      <option value="g">Gramas</option>
                      <option value="fatias">Fatias</option>
                      <option value="unidades">Unid.</option>
                      <option value="colheres">Colheres</option>
                    </select>
                  </div>
                  <button onClick={() => handleSearch()} disabled={loading || !searchQuery} className="col-span-4 bg-sky-400 text-white font-black rounded-2xl hover:bg-sky-500 disabled:opacity-30 active:scale-95 transition-all flex items-center justify-center gap-2">
                    {loading ? <i className="fas fa-circle-notch animate-spin"></i> : <i className="fas fa-search"></i>}
                    {loading ? '...' : 'BUSCAR'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-50">
              <div className="flex flex-col md:flex-row items-center gap-10">
                <div className="w-60 h-60 relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={chartData} cx="50%" cy="50%" innerRadius={75} outerRadius={100} paddingAngle={8} dataKey="value" stroke="none">
                        {chartData.map((e, i) => <Cell key={i} fill={e.color} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-4xl font-black text-slate-700">{totals.calories.toFixed(0)}</span>
                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">kcal diárias</span>
                  </div>
                </div>
                <div className="flex-1 space-y-3 w-full text-left">
                   <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-4">Macronutrientes</h3>
                   {[
                     { l: 'Carboidratos', v: totals.carbs, c: 'bg-[#f9d5e5]', t: 'text-rose-400' },
                     { l: 'Proteínas', v: totals.protein, c: 'bg-[#b8d8be]', t: 'text-emerald-500' },
                     { l: 'Gorduras', v: totals.lipids, c: 'bg-[#eeac99]', t: 'text-orange-400' }
                   ].map(m => (
                     <div key={m.l} className="flex justify-between items-center bg-slate-50/70 p-4 rounded-2xl border border-white">
                       <div className="flex items-center gap-3">
                         <div className={`w-3 h-3 rounded-full ${m.c}`}></div>
                         <span className="text-[11px] font-black text-slate-500 uppercase">{m.l}</span>
                       </div>
                       <span className={`text-lg font-black ${m.t}`}>{m.v.toFixed(1)}g</span>
                     </div>
                   ))}
                </div>
              </div>
            </div>

            <div className="space-y-3 text-left">
              <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-4">Histórico do Dia</h3>
              {foods.map(f => (
                <div key={f.id} className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-50 flex justify-between items-center hover:border-sky-100 transition-all fade-in">
                  <div className="flex items-start gap-4">
                    <div className="mt-1 w-2 h-2 rounded-full bg-sky-300"></div>
                    <div>
                      <h4 className="font-black text-slate-700 text-sm capitalize">{f.name}</h4>
                      <div className="flex gap-2 items-center">
                        <span className="text-[9px] font-bold text-sky-400 bg-sky-50 px-2 py-0.5 rounded-md">{f.meal}</span>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">{f.portion} {portionUnit} • <span className="text-rose-300">{f.calories.toFixed(0)} kcal</span> • <span className="text-[9px] italic opacity-50">{f.source}</span></p>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => setFoods(prev => prev.filter(x => x.id !== f.id))} className="text-slate-100 hover:text-rose-300 transition-colors p-3 hover:bg-rose-50 rounded-xl">
                    <i className="fas fa-trash-can"></i>
                  </button>
                </div>
              ))}
              {foods.length === 0 && (
                <div className="bg-white/30 border-2 border-dashed border-slate-100 p-12 rounded-[3rem] text-center text-slate-300 text-xs font-bold uppercase tracking-widest">Nada registrado hoje</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
