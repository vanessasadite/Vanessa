
import React, { useState, useEffect, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { UserProfile, FoodItem, Gender, MealType, MEAL_TYPES } from './types';
import { searchFoodNutrition } from './geminiService';

const USUARIOS_AUTORIZADOS = [
  { email: 'admin@nutricalc.com', chave: 'NUTRI123' },
  { email: 'teste@exemplo.com', chave: 'ALUNO2025' },
];

const LandingPage: React.FC<{ onUnlock: (email: string) => void }> = ({ onUnlock }) => {
  const [emailInput, setEmailInput] = useState('');
  const [passInput, setPassInput] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    const emailLower = emailInput.toLowerCase().trim();
    const passLower = passInput.trim();

    const usuario = USUARIOS_AUTORIZADOS.find(
      u => u.email.toLowerCase() === emailLower && u.chave === passLower
    );

    if (usuario) {
      onUnlock(usuario.email);
    } else {
      setError('E-mail ou senha incorretos.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fdfcf0] flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md w-full space-y-8 fade-in">
        <div className="space-y-2">
          <i className="fas fa-apple-whole text-5xl text-rose-300 mb-2"></i>
          <h1 className="text-4xl font-black text-slate-700">NutriCalc</h1>
          <p className="text-slate-400 text-sm">Acesse sua calculadora nutricional</p>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-rose-100/20 border border-rose-50 space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <input 
              type="email" 
              required 
              placeholder="E-mail" 
              value={emailInput}
              onChange={e => setEmailInput(e.target.value)}
              className="w-full bg-slate-50 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-rose-100 font-medium" 
            />
            <input 
              type="password" 
              required 
              placeholder="Senha" 
              value={passInput}
              onChange={e => setPassInput(e.target.value)}
              className="w-full bg-slate-50 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-rose-100 font-bold" 
            />
            {error && <p className="text-rose-400 text-xs font-bold">{error}</p>}
            <button type="submit" className="w-full bg-slate-800 text-white font-bold py-4 rounded-2xl active:scale-95 transition-all">
              ENTRAR
            </button>
          </form>
          <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="text-[10px] text-slate-300 uppercase font-bold tracking-widest">
            Limpar Cache do Site
          </button>
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [portionInput, setPortionInput] = useState<number>(100);
  const [selectedMeal, setSelectedMeal] = useState<MealType>('Café da Manhã');
  const [showTmbForm, setShowTmbForm] = useState(true);

  // States de Formulário
  const [weight, setWeight] = useState(70);
  const [height, setHeight] = useState(170);
  const [age, setAge] = useState(30);
  const [gender, setGender] = useState<Gender>(Gender.MALE);
  const [activity, setActivity] = useState(1.2);

  useEffect(() => {
    try {
      const email = localStorage.getItem('nutri_user_email');
      const data = localStorage.getItem('nutri_app_data');
      if (email) setUserEmail(email);
      if (data) {
        const parsed = JSON.parse(data);
        if (parsed?.profile) {
          setProfile(parsed.profile);
          setShowTmbForm(false);
        }
        if (Array.isArray(parsed?.foods)) {
          setFoods(parsed.foods);
        }
      }
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => {
    if (userEmail) {
      localStorage.setItem('nutri_user_email', userEmail);
      localStorage.setItem('nutri_app_data', JSON.stringify({ profile, foods }));
    }
  }, [profile, foods, userEmail]);

  const totals = useMemo(() => {
    if (!Array.isArray(foods)) return { calories: 0, carbs: 0, protein: 0, lipids: 0 };
    return foods.reduce((acc, f) => ({
      calories: acc.calories + (f.calories || 0),
      carbs: acc.carbs + (f.carbs || 0),
      protein: acc.protein + (f.protein || 0),
      lipids: acc.lipids + (f.lipids || 0)
    }), { calories: 0, carbs: 0, protein: 0, lipids: 0 });
  }, [foods]);

  const chartData = useMemo(() => [
    { name: 'Carbos', value: totals.carbs || 0.0001, color: '#f9d5e5' },
    { name: 'Proteínas', value: totals.protein || 0.0001, color: '#b8d8be' },
    { name: 'Gorduras', value: totals.lipids || 0.0001, color: '#eeac99' },
  ], [totals]);

  if (!userEmail) return <LandingPage onUnlock={setUserEmail} />;

  const handleLogout = () => {
    if (confirm('Sair agora?')) {
      localStorage.removeItem('nutri_user_email');
      setUserEmail(null);
    }
  };

  const calculateTmb = (e: React.FormEvent) => {
    e.preventDefault();
    const tmb = gender === Gender.MALE 
      ? (10 * weight) + (6.25 * height) - (5 * age) + 5
      : (10 * weight) + (6.25 * height) - (5 * age) - 161;
    const tdee = tmb * activity;
    const imc = weight / ((height / 100) ** 2);
    const imcClass = imc < 18.5 ? 'Abaixo do peso' : imc < 25 ? 'Normal' : imc < 30 ? 'Sobrepeso' : 'Obesidade';
    
    setProfile({ weight, height, age, gender, activityLevel: activity, tmb, tdee, imc, imcClassification: imcClass });
    setShowTmbForm(false);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    try {
      const result = await searchFoodNutrition(searchQuery);
      if (result) {
        const factor = (portionInput || 100) / 100;
        const newItem: FoodItem = {
          id: Math.random().toString(36).substr(2, 9),
          name: result.name || searchQuery,
          calories: (result.calories || 0) * factor,
          carbs: (result.carbs || 0) * factor,
          protein: (result.protein || 0) * factor,
          lipids: (result.lipids || 0) * factor,
          portion: portionInput,
          source: result.source || 'IA',
          meal: selectedMeal
        };
        setFoods(prev => [newItem, ...prev]);
        setSearchQuery('');
      }
    } catch (e) { alert("Erro ao buscar."); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#fdfcf0] fade-in">
      <div className="max-w-5xl mx-auto p-4 md:p-8">
        <header className="mb-8 flex justify-between items-center bg-white p-5 rounded-3xl shadow-sm border border-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center">
              <i className="fas fa-apple-whole text-rose-300"></i>
            </div>
            <h1 className="text-xl font-black text-slate-700">NutriCalc</h1>
          </div>
          <button onClick={handleLogout} className="text-slate-200 hover:text-rose-400 p-2"><i className="fas fa-power-off"></i></button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5 space-y-6">
            {showTmbForm ? (
              <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-50">
                <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 text-center">Configurar Metas</h2>
                <form onSubmit={calculateTmb} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <input type="number" placeholder="Peso" value={weight} onChange={e => setWeight(Number(e.target.value))} className="bg-slate-50 p-4 rounded-2xl outline-none w-full font-bold" />
                    <input type="number" placeholder="Altura" value={height} onChange={e => setHeight(Number(e.target.value))} className="bg-slate-50 p-4 rounded-2xl outline-none w-full font-bold" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <input type="number" placeholder="Idade" value={age} onChange={e => setAge(Number(e.target.value))} className="bg-slate-50 p-4 rounded-2xl outline-none w-full font-bold" />
                    <select value={gender} onChange={e => setGender(e.target.value as Gender)} className="bg-slate-50 p-4 rounded-2xl w-full font-bold">
                      <option value={Gender.MALE}>Masc</option>
                      <option value={Gender.FEMALE}>Fem</option>
                    </select>
                  </div>
                  <select value={activity} onChange={e => setActivity(Number(e.target.value))} className="bg-slate-50 p-4 rounded-2xl w-full font-bold">
                    <option value={1.2}>Sedentário</option>
                    <option value={1.375}>Leve (1-3x)</option>
                    <option value={1.55}>Moderado (3-5x)</option>
                    <option value={1.725}>Intenso (Todo dia)</option>
                  </select>
                  <button type="submit" className="w-full bg-rose-300 text-white font-black p-4 rounded-2xl shadow-md">CALCULAR AGORA</button>
                </form>
              </div>
            ) : (
              <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-rose-50 space-y-4">
                <div className="flex justify-between items-center px-2">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Seu Metabolismo</span>
                  <button onClick={() => setShowTmbForm(true)} className="text-[9px] font-bold text-rose-300 uppercase underline">Editar</button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-rose-50 p-4 rounded-2xl text-center">
                    <p className="text-[8px] font-black text-rose-300 uppercase">Gasto Basal</p>
                    <p className="text-2xl font-black text-slate-700">{profile?.tmb?.toFixed(0) || 0}</p>
                  </div>
                  <div className="bg-emerald-50 p-4 rounded-2xl text-center">
                    <p className="text-[8px] font-black text-emerald-500 uppercase">Gasto Total</p>
                    <p className="text-2xl font-black text-slate-700">{profile?.tdee?.toFixed(0) || 0}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-50 space-y-4">
              <h2 className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">Adicionar Alimento</h2>
              <div className="flex flex-wrap gap-1 px-2">
                {MEAL_TYPES.map(m => (
                  <button key={m} onClick={() => setSelectedMeal(m)} className={`text-[8px] px-3 py-1.5 rounded-full font-bold transition-all ${selectedMeal === m ? 'bg-sky-400 text-white' : 'bg-slate-50 text-slate-300'}`}>{m}</button>
                ))}
              </div>
              <input type="text" placeholder="Ex: Frango grelhado..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full bg-slate-50 p-4 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-sky-50" />
              <div className="flex gap-2">
                <input type="number" value={portionInput} onChange={e => setPortionInput(Number(e.target.value))} className="w-20 bg-slate-50 p-4 rounded-2xl font-bold" />
                <button onClick={handleSearch} disabled={loading} className="flex-1 bg-sky-400 text-white font-black rounded-2xl hover:bg-sky-500 disabled:opacity-50">
                  {loading ? 'BUSCANDO...' : 'ADICIONAR'}
                </button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-50">
              <div className="flex flex-col md:flex-row items-center gap-8">
                <div className="w-48 h-48 relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={chartData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none">
                        {chartData.map((e, i) => <Cell key={i} fill={e.color} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-2xl font-black text-slate-700">{totals.calories.toFixed(0)}</span>
                    <span className="text-[8px] font-bold text-slate-300 uppercase">kcal hoje</span>
                  </div>
                </div>
                <div className="flex-1 space-y-2 w-full">
                   {[
                     { l: 'Carboidratos', v: totals.carbs, c: 'bg-[#f9d5e5]', t: 'text-rose-300' },
                     { l: 'Proteínas', v: totals.protein, c: 'bg-[#b8d8be]', t: 'text-emerald-500' },
                     { l: 'Gorduras', v: totals.lipids, c: 'bg-[#eeac99]', t: 'text-orange-400' }
                   ].map(m => (
                     <div key={m.l} className="flex justify-between items-center bg-slate-50/50 p-3 rounded-xl">
                       <div className="flex items-center gap-2">
                         <div className={`w-2 h-2 rounded-full ${m.c}`}></div>
                         <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{m.l}</span>
                       </div>
                       <span className={`font-black ${m.t}`}>{m.v.toFixed(1)}g</span>
                     </div>
                   ))}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {foods.length > 0 && <h3 className="text-[9px] font-black text-slate-300 uppercase tracking-widest px-4">Alimentos de Hoje</h3>}
              {foods.map(f => (
                <div key={f.id} className="bg-white p-5 rounded-3xl shadow-sm border border-slate-50 flex justify-between items-center group">
                  <div>
                    <h4 className="font-black text-slate-600 text-sm capitalize">{f.name}</h4>
                    <p className="text-[9px] text-slate-300 font-bold uppercase">{f.meal} • {f.portion}g • <span className="text-rose-300">{f.calories.toFixed(0)} kcal</span></p>
                  </div>
                  <button onClick={() => setFoods(prev => prev.filter(x => x.id !== f.id))} className="text-slate-100 group-hover:text-rose-300 transition-colors p-2"><i className="fas fa-trash"></i></button>
                </div>
              ))}
              {foods.length === 0 && (
                <div className="bg-white/50 border-2 border-dashed border-slate-100 p-12 rounded-[2.5rem] text-center text-slate-200 text-xs italic">Seu diário está vazio. Adicione um alimento para começar.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
