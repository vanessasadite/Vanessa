
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const emailLower = emailInput.toLowerCase().trim();
    const passLower = passInput.trim();
    const usuario = USUARIOS_AUTORIZADOS.find(u => u.email.toLowerCase() === emailLower && u.chave === passLower);
    if (usuario) {
      onUnlock(usuario.email);
    } else {
      setError('E-mail ou senha incorretos.');
    }
  };

  return (
    <div className="min-h-screen bg-[#fdfcf0] flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md w-full space-y-8 fade-in">
        <div className="space-y-2">
          <i className="fas fa-apple-whole text-5xl text-rose-300 mb-2"></i>
          <h1 className="text-4xl font-black text-slate-700">NutriCalc</h1>
          <p className="text-slate-400 text-sm font-medium">Controle nutricional inteligente</p>
        </div>
        <div className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-rose-100/20 border border-rose-50">
          <form onSubmit={handleSubmit} className="space-y-4">
            <input type="email" required placeholder="E-mail" value={emailInput} onChange={e => setEmailInput(e.target.value)} className="w-full bg-slate-50 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-rose-100 font-medium" />
            <input type="password" required placeholder="Senha" value={passInput} onChange={e => setPassInput(e.target.value)} className="w-full bg-slate-50 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-rose-100 font-bold" />
            {error && <p className="text-rose-400 text-xs font-bold">{error}</p>}
            <button type="submit" className="w-full bg-slate-800 text-white font-bold py-4 rounded-2xl active:scale-95 transition-all">ENTRAR</button>
          </form>
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
        if (parsed?.profile) { setProfile(parsed.profile); setShowTmbForm(false); }
        if (Array.isArray(parsed?.foods)) setFoods(parsed.foods);
      }
    } catch (e) { console.error("Erro ao carregar cache:", e); }
  }, []);

  useEffect(() => {
    if (userEmail) {
      localStorage.setItem('nutri_user_email', userEmail);
      localStorage.setItem('nutri_app_data', JSON.stringify({ profile, foods }));
    }
  }, [profile, foods, userEmail]);

  const totals = useMemo(() => {
    if (!foods || foods.length === 0) return { calories: 0, carbs: 0, protein: 0, lipids: 0 };
    return foods.reduce((acc, f) => ({
      calories: acc.calories + (Number(f.calories) || 0),
      carbs: acc.carbs + (Number(f.carbs) || 0),
      protein: acc.protein + (Number(f.protein) || 0),
      lipids: acc.lipids + (Number(f.lipids) || 0)
    }), { calories: 0, carbs: 0, protein: 0, lipids: 0 });
  }, [foods]);

  const chartData = useMemo(() => [
    { name: 'Carbos', value: totals.carbs || 0.0001, color: '#f9d5e5' },
    { name: 'Proteínas', value: totals.protein || 0.0001, color: '#b8d8be' },
    { name: 'Gorduras', value: totals.lipids || 0.0001, color: '#eeac99' },
  ], [totals]);

  if (!userEmail) return <LandingPage onUnlock={setUserEmail} />;

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

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    try {
      const result = await searchFoodNutrition(searchQuery);
      if (result && result.name) {
        const factor = (Number(portionInput) || 100) / 100;
        const newItem: FoodItem = {
          id: Math.random().toString(36).substr(2, 9),
          name: result.name,
          calories: (Number(result.calories) || 0) * factor,
          carbs: (Number(result.carbs) || 0) * factor,
          protein: (Number(result.protein) || 0) * factor,
          lipids: (Number(result.lipids) || 0) * factor,
          portion: Number(portionInput),
          source: result.source || 'IA',
          meal: selectedMeal
        };
        setFoods(prev => [newItem, ...prev]);
        setSearchQuery('');
      } else {
        alert("Não foi possível obter dados para este alimento. Tente ser mais específico (ex: arroz branco cozido).");
      }
    } catch (e) { 
      console.error(e);
      alert("Erro de conexão com o servidor de nutrição."); 
    }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#fdfcf0] fade-in pb-12">
      <div className="max-w-5xl mx-auto p-4 md:p-8">
        <header className="mb-8 flex justify-between items-center bg-white p-5 rounded-3xl shadow-sm border border-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center">
              <i className="fas fa-apple-whole text-rose-300"></i>
            </div>
            <h1 className="text-xl font-black text-slate-700">NutriCalc</h1>
          </div>
          <button onClick={() => { if(confirm('Sair?')) { localStorage.removeItem('nutri_user_email'); setUserEmail(null); } }} className="text-slate-200 hover:text-rose-400 p-2 transition-colors">
            <i className="fas fa-power-off"></i>
          </button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5 space-y-6">
            {showTmbForm ? (
              <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-50">
                <h2 className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-6 text-center">Configurar Seus Dados</h2>
                <form onSubmit={calculateTmb} className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5 text-left">
                      <label className="text-[10px] font-black text-slate-600 uppercase ml-2 block">Peso (kg)</label>
                      <input type="number" step="0.1" value={weight} onChange={e => setWeight(Number(e.target.value))} className="bg-slate-50 p-4 rounded-2xl outline-none w-full font-bold focus:ring-2 focus:ring-rose-200 transition-all" />
                    </div>
                    <div className="space-y-1.5 text-left">
                      <label className="text-[10px] font-black text-slate-600 uppercase ml-2 block">Altura (cm)</label>
                      <input type="number" value={height} onChange={e => setHeight(Number(e.target.value))} className="bg-slate-50 p-4 rounded-2xl outline-none w-full font-bold focus:ring-2 focus:ring-rose-200 transition-all" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5 text-left">
                      <label className="text-[10px] font-black text-slate-600 uppercase ml-2 block">Idade</label>
                      <input type="number" value={age} onChange={e => setAge(Number(e.target.value))} className="bg-slate-50 p-4 rounded-2xl outline-none w-full font-bold focus:ring-2 focus:ring-rose-200 transition-all" />
                    </div>
                    <div className="space-y-1.5 text-left">
                      <label className="text-[10px] font-black text-slate-600 uppercase ml-2 block">Gênero</label>
                      <select value={gender} onChange={e => setGender(e.target.value as Gender)} className="bg-slate-50 p-4 rounded-2xl w-full font-bold cursor-pointer focus:ring-2 focus:ring-rose-200">
                        <option value={Gender.MALE}>Masc</option>
                        <option value={Gender.FEMALE}>Fem</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-1.5 text-left">
                    <label className="text-[10px] font-black text-slate-600 uppercase ml-2 block">Atividade Física</label>
                    <select value={activity} onChange={e => setActivity(Number(e.target.value))} className="bg-slate-50 p-4 rounded-2xl w-full font-bold cursor-pointer focus:ring-2 focus:ring-rose-200">
                      <option value={1.2}>Sedentário</option>
                      <option value={1.375}>Leve (1-3x/sem)</option>
                      <option value={1.55}>Moderado (3-5x/sem)</option>
                      <option value={1.725}>Intenso (Todos os dias)</option>
                    </select>
                  </div>
                  <button type="submit" className="w-full bg-rose-300 text-white font-black py-5 rounded-2xl shadow-lg hover:bg-rose-400 transition-all">CALCULAR AGORA</button>
                </form>
              </div>
            ) : (
              <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-rose-50 space-y-4">
                <div className="flex justify-between items-center px-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Metabolismo</span>
                  <button onClick={() => setShowTmbForm(true)} className="text-[10px] font-bold text-rose-300 uppercase underline">Editar</button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-rose-50 p-5 rounded-3xl text-center">
                    <p className="text-[9px] font-black text-rose-300 uppercase mb-1">Gasto Basal</p>
                    <p className="text-3xl font-black text-slate-700">{profile?.tmb?.toFixed(0) || 0}</p>
                  </div>
                  <div className="bg-emerald-50 p-5 rounded-3xl text-center">
                    <p className="text-[9px] font-black text-emerald-500 uppercase mb-1">Gasto Total</p>
                    <p className="text-3xl font-black text-slate-700">{profile?.tdee?.toFixed(0) || 0}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-50 space-y-4">
              <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2 text-left">Adicionar Refeição</h2>
              <div className="flex flex-wrap gap-1.5 px-2">
                {MEAL_TYPES.map(m => (
                  <button key={m} onClick={() => setSelectedMeal(m)} className={`text-[9px] px-4 py-2 rounded-full font-bold transition-all ${selectedMeal === m ? 'bg-sky-400 text-white shadow-md' : 'bg-slate-50 text-slate-400'}`}>{m}</button>
                ))}
              </div>
              <div className="space-y-3">
                <input type="text" placeholder="Ex: Arroz, feijão, frango..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full bg-slate-50 p-4 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-sky-100" />
                <div className="flex gap-2">
                  <div className="relative flex-shrink-0">
                    <label className="absolute -top-2 left-3 bg-white px-1 text-[8px] font-black text-slate-300 uppercase">Gramas</label>
                    <input type="number" value={portionInput} onChange={e => setPortionInput(Number(e.target.value))} className="w-24 bg-slate-50 p-4 rounded-2xl font-bold text-center border-2 border-transparent focus:border-sky-100 outline-none" />
                  </div>
                  <button onClick={handleSearch} disabled={loading || !searchQuery} className="flex-1 bg-sky-400 text-white font-black rounded-2xl hover:bg-sky-500 disabled:opacity-30 transition-all flex items-center justify-center gap-2">
                    {loading ? <i className="fas fa-spinner animate-spin"></i> : <i className="fas fa-plus"></i>}
                    {loading ? 'BUSCANDO...' : 'ADICIONAR'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-50">
              <div className="flex flex-col md:flex-row items-center gap-10">
                <div className="w-56 h-56 relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={chartData} cx="50%" cy="50%" innerRadius={65} outerRadius={90} paddingAngle={6} dataKey="value" stroke="none">
                        {chartData.map((e, i) => <Cell key={i} fill={e.color} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-3xl font-black text-slate-700">{totals.calories.toFixed(0)}</span>
                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">kcal hoje</span>
                  </div>
                </div>
                <div className="flex-1 space-y-3 w-full">
                   {[
                     { l: 'Carboidratos', v: totals.carbs, c: 'bg-[#f9d5e5]', t: 'text-rose-400' },
                     { l: 'Proteínas', v: totals.protein, c: 'bg-[#b8d8be]', t: 'text-emerald-500' },
                     { l: 'Gorduras', v: totals.lipids, c: 'bg-[#eeac99]', t: 'text-orange-400' }
                   ].map(m => (
                     <div key={m.l} className="flex justify-between items-center bg-slate-50/70 p-4 rounded-2xl">
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
              <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-4">Alimentos Inseridos</h3>
              {foods.map(f => (
                <div key={f.id} className="bg-white p-5 rounded-3xl shadow-sm border border-slate-50 flex justify-between items-center group">
                  <div>
                    <h4 className="font-black text-slate-700 text-sm capitalize">{f.name}</h4>
                    <p className="text-[10px] text-slate-300 font-bold uppercase">{f.meal} • {f.portion}g • <span className="text-rose-300">{f.calories.toFixed(0)} kcal</span></p>
                  </div>
                  <button onClick={() => setFoods(prev => prev.filter(x => x.id !== f.id))} className="text-slate-100 group-hover:text-rose-300 transition-colors p-3 hover:bg-rose-50 rounded-xl">
                    <i className="fas fa-trash-can"></i>
                  </button>
                </div>
              ))}
              {foods.length === 0 && (
                <div className="bg-white/40 border-2 border-dashed border-slate-100 p-16 rounded-[3rem] text-center text-slate-200 text-xs font-bold uppercase tracking-widest">Nenhum alimento inserido ainda</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
