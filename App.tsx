
import React, { useState, useEffect, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { UserProfile, FoodItem, Gender, MealType, MEAL_TYPES } from './types';
import { searchFoodNutrition } from './geminiService';

/**
 * ============================================================
 * GERENCIAMENTO DE ALUNOS (NUTRICONTRÔLE)
 * ============================================================
 * Adicione os e-mails e senhas dos seus clientes aqui embaixo.
 */
const USUARIOS_AUTORIZADOS = [
  { email: 'admin@nutricalc.com', chave: 'NUTRI123' }, // Seu acesso
  { email: 'teste@exemplo.com', chave: 'ALUNO2025' },  // Exemplo de aluno
  // { email: 'contato@cliente.com', chave: '9988' },
];

const LandingPage: React.FC<{ onUnlock: (email: string) => void }> = ({ onUnlock }) => {
  const [emailInput, setEmailInput] = useState('');
  const [passInput, setPassInput] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const LINK_COMPRA = 'https://pay.kiwify.com.br/seu-link'; // Link da sua página de vendas
  const WHATSAPP_SUPORTE = '5511999999999'; // Seu número

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    setTimeout(() => {
      const usuario = USUARIOS_AUTORIZADOS.find(
        u => u.email.toLowerCase().trim() === emailInput.toLowerCase().trim() && 
             u.chave.toUpperCase() === passInput.toUpperCase().trim()
      );

      if (usuario) {
        onUnlock(usuario.email);
      } else {
        setError('Acesso não localizado. Use o e-mail da compra ou peça suporte.');
        setIsSubmitting(false);
      }
    }, 800);
  };

  return (
    <div className="min-h-screen bg-[#fdfcf0] flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md w-full space-y-8">
        <div className="space-y-4">
          <div className="relative inline-block">
            <div className="absolute inset-0 bg-rose-200 rounded-[2.5rem] blur-3xl opacity-30 animate-pulse"></div>
            <div className="relative p-6 bg-white rounded-[2.5rem] shadow-sm border border-rose-50">
              <i className="fas fa-leaf text-5xl text-rose-300"></i>
            </div>
          </div>
          <div className="space-y-1">
            <h1 className="text-4xl font-black text-slate-700 tracking-tight">
              <span className="text-rose-300">Nutri</span>Calc
            </h1>
            <p className="text-slate-400 text-sm font-medium">Sua calculadora de precisão metabólica.</p>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[3rem] shadow-2xl shadow-rose-100/30 border border-rose-50 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2 text-left">
              <label className="text-[10px] text-slate-400 font-black uppercase tracking-widest ml-4">E-mail Cadastrado</label>
              <input 
                type="email"
                required
                placeholder="ex: voce@email.com"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                className="w-full bg-slate-50 border-2 border-slate-50 p-4 rounded-2xl outline-none focus:border-rose-100 focus:bg-white transition-all text-slate-600"
              />
            </div>

            <div className="space-y-2 text-left">
              <label className="text-[10px] text-slate-400 font-black uppercase tracking-widest ml-4">Código de Acesso</label>
              <input 
                type="password"
                required
                placeholder="Senha de acesso"
                value={passInput}
                onChange={(e) => setPassInput(e.target.value)}
                className="w-full bg-slate-50 border-2 border-slate-50 p-4 rounded-2xl outline-none focus:border-rose-100 focus:bg-white transition-all text-slate-600 font-bold"
              />
            </div>

            {error && (
              <p className="text-rose-400 text-xs font-bold bg-rose-50 p-3 rounded-xl">{error}</p>
            )}

            <button 
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-slate-800 text-white text-lg font-bold py-4 rounded-2xl hover:bg-slate-700 transition-all shadow-lg active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? <i className="fas fa-circle-notch fa-spin"></i> : 'Entrar no Sistema'}
            </button>
          </form>

          <div className="pt-6 border-t border-slate-50 flex flex-col gap-4">
            <div className="text-xs text-slate-400">
              Não tem acesso? 
              <a href={LINK_COMPRA} target="_blank" className="text-rose-400 font-bold ml-1 hover:underline">Adquirir agora</a>
            </div>
            <a href={`https://wa.me/${WHATSAPP_SUPORTE}`} target="_blank" className="bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest py-3 rounded-xl">
              <i className="fab fa-whatsapp mr-1"></i> Suporte Técnico
            </a>
          </div>
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

  // States para o formulário de TMB
  const [weight, setWeight] = useState(70);
  const [height, setHeight] = useState(170);
  const [age, setAge] = useState(30);
  const [gender, setGender] = useState<Gender>(Gender.MALE);
  const [activity, setActivity] = useState(1.2);

  useEffect(() => {
    const saved = localStorage.getItem('nutri_app_data');
    const savedUser = localStorage.getItem('nutri_user_email');
    if (savedUser) setUserEmail(savedUser);
    
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.profile) {
        setProfile(parsed.profile);
        setShowTmbForm(false);
      }
      if (parsed.foods) setFoods(parsed.foods);
    }
  }, []);

  useEffect(() => {
    if (userEmail) {
      localStorage.setItem('nutri_user_email', userEmail);
      localStorage.setItem('nutri_app_data', JSON.stringify({ profile, foods }));
    }
  }, [profile, foods, userEmail]);

  if (!userEmail) {
    return <LandingPage onUnlock={(email) => setUserEmail(email)} />;
  }

  const handleLogout = () => {
    if(window.confirm('Deseja sair da sua conta?')) {
      setUserEmail(null);
      localStorage.removeItem('nutri_user_email');
    }
  };

  const calculateTmb = (e: React.FormEvent) => {
    e.preventDefault();
    let tmb = 0;
    // Mifflin-St Jeor Equation (mais atual que Harris-Benedict)
    if (gender === Gender.MALE) {
      tmb = (10 * weight) + (6.25 * height) - (5 * age) + 5;
    } else {
      tmb = (10 * weight) + (6.25 * height) - (5 * age) - 161;
    }
    const tdee = tmb * activity;
    const imc = weight / ((height / 100) * (height / 100));
    let imcClassification = imc < 18.5 ? 'Baixo Peso' : imc < 25 ? 'Normal' : imc < 30 ? 'Sobrepeso' : 'Obesidade';
    
    setProfile({ weight, height, age, gender, activityLevel: activity, tmb, tdee, imc, imcClassification });
    setShowTmbForm(false);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim() || portionInput <= 0) return;
    setLoading(true);
    try {
      const data = await searchFoodNutrition(searchQuery);
      if (data) {
        const factor = portionInput / 100;
        const newItem: FoodItem = {
          id: Math.random().toString(36).substr(2, 9),
          name: data.name || searchQuery,
          calories: (data.calories || 0) * factor,
          carbs: (data.carbs || 0) * factor,
          protein: (data.protein || 0) * factor,
          lipids: (data.lipids || 0) * factor,
          portion: portionInput,
          source: data.source || 'Tabela Padrão',
          meal: selectedMeal
        };
        setFoods(prev => [newItem, ...prev]);
        setSearchQuery('');
      } else {
        alert("Não encontramos esse alimento nas tabelas TACO/TBCA. Tente outro nome.");
      }
    } catch (e) {
      alert("Erro de conexão. Verifique sua chave de API.");
    }
    setLoading(false);
  };

  const totals = useMemo(() => {
    return foods.reduce((acc, f) => ({
      calories: acc.calories + f.calories,
      carbs: acc.carbs + f.carbs,
      protein: acc.protein + f.protein,
      lipids: acc.lipids + f.lipids
    }), { calories: 0, carbs: 0, protein: 0, lipids: 0 });
  }, [foods]);

  const chartData = [
    { name: 'Carbos', value: totals.carbs || 1, color: '#f9d5e5' },
    { name: 'Proteínas', value: totals.protein || 1, color: '#b8d8be' },
    { name: 'Gorduras', value: totals.lipids || 1, color: '#eeac99' },
  ];

  return (
    <div className="min-h-screen pb-12 bg-[#fdfcf0]">
      <div className="max-w-5xl mx-auto p-4 md:p-8">
        <header className="mb-10 flex justify-between items-center bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center">
              <i className="fas fa-apple-whole text-rose-300 text-xl"></i>
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-700">NutriCalc</h1>
              <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">{userEmail}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="text-slate-300 hover:text-rose-400 transition-colors p-3 bg-slate-50 rounded-2xl">
            <i className="fas fa-sign-out-alt"></i>
          </button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5 space-y-6">
            {showTmbForm ? (
              <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-50">
                <h2 className="text-xl font-bold text-slate-700 mb-6 uppercase text-center tracking-widest text-xs">Avaliação Inicial</h2>
                <form onSubmit={calculateTmb} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 font-bold ml-4 uppercase">Peso (kg)</label>
                      <input type="number" value={weight} onChange={e => setWeight(Number(e.target.value))} className="w-full bg-slate-50 p-4 rounded-3xl outline-none focus:ring-2 focus:ring-rose-50 font-bold text-slate-600" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 font-bold ml-4 uppercase">Altura (cm)</label>
                      <input type="number" value={height} onChange={e => setHeight(Number(e.target.value))} className="w-full bg-slate-50 p-4 rounded-3xl outline-none focus:ring-2 focus:ring-rose-50 font-bold text-slate-600" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 font-bold ml-4 uppercase">Idade</label>
                      <input type="number" value={age} onChange={e => setAge(Number(e.target.value))} className="w-full bg-slate-50 p-4 rounded-3xl outline-none focus:ring-2 focus:ring-rose-50 font-bold text-slate-600" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 font-bold ml-4 uppercase">Gênero</label>
                      <select value={gender} onChange={e => setGender(e.target.value as Gender)} className="w-full bg-slate-50 p-4 rounded-3xl outline-none focus:ring-2 focus:ring-rose-50 font-bold text-slate-600">
                        <option value={Gender.MALE}>Masc</option>
                        <option value={Gender.FEMALE}>Fem</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 font-bold ml-4 uppercase">Nível de Atividade</label>
                    <select value={activity} onChange={e => setActivity(Number(e.target.value))} className="w-full bg-slate-50 p-4 rounded-3xl outline-none focus:ring-2 focus:ring-rose-50 font-bold text-slate-600">
                      <option value={1.2}>Sedentário (pouco exercício)</option>
                      <option value={1.375}>Leve (1-3 dias/sem)</option>
                      <option value={1.55}>Moderado (3-5 dias/sem)</option>
                      <option value={1.725}>Intenso (6-7 dias/sem)</option>
                    </select>
                  </div>
                  <button type="submit" className="w-full bg-rose-300 text-white font-black p-5 rounded-3xl hover:bg-rose-400 transition-all shadow-md mt-4">
                    CALCULAR METAS
                  </button>
                </form>
              </div>
            ) : (
              <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-rose-50 space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="font-bold text-slate-600 text-[10px] uppercase tracking-[0.2em]">Metabolismo Ativo</h2>
                  <button onClick={() => setShowTmbForm(true)} className="text-[10px] font-bold text-rose-300 uppercase underline">Ajustar Dados</button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-rose-50 p-6 rounded-[2.5rem] text-center border border-rose-100">
                    <p className="text-[9px] font-black text-rose-300 uppercase mb-1 tracking-widest">Gasto Basal</p>
                    <p className="text-3xl font-black text-slate-700">{profile?.tmb.toFixed(0)} <span className="text-sm font-normal text-slate-400">kcal</span></p>
                  </div>
                  <div className="bg-emerald-50 p-6 rounded-[2.5rem] text-center border border-emerald-100">
                    <p className="text-[9px] font-black text-emerald-500 uppercase mb-1 tracking-widest">Gasto Total (TDEE)</p>
                    <p className="text-3xl font-black text-slate-700">{profile?.tdee.toFixed(0)} <span className="text-sm font-normal text-slate-400">kcal</span></p>
                  </div>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl flex justify-between items-center px-8">
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Seu IMC: <span className="text-slate-700 ml-1">{profile?.imc.toFixed(1)}</span></p>
                   <p className="text-[10px] font-black text-slate-700 uppercase">{profile?.imcClassification}</p>
                </div>
              </div>
            )}

            <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-50 space-y-5">
              <h2 className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] flex items-center gap-2">
                <i className="fas fa-plus-circle text-sky-200 text-lg"></i> Registrar Alimento
              </h2>
              <div className="flex flex-wrap gap-2">
                {MEAL_TYPES.map(meal => (
                  <button key={meal} onClick={() => setSelectedMeal(meal)} className={`text-[10px] px-4 py-2 rounded-full font-bold transition-all ${selectedMeal === meal ? 'bg-sky-400 text-white shadow-lg' : 'bg-slate-50 text-slate-400'}`}>
                    {meal}
                  </button>
                ))}
              </div>
              <div className="space-y-3">
                <input type="text" placeholder="Ex: Arroz branco, feijão carioca..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()} className="w-full bg-slate-50 p-5 rounded-3xl outline-none focus:ring-4 focus:ring-sky-50 text-slate-600 font-bold placeholder:text-slate-300" />
                <div className="flex gap-3">
                  <div className="relative">
                    <input type="number" value={portionInput} onChange={e => setPortionInput(Number(e.target.value))} className="w-28 bg-slate-50 p-5 rounded-3xl outline-none focus:ring-4 focus:ring-sky-50 font-black text-slate-600" />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-300">g</span>
                  </div>
                  <button onClick={handleSearch} disabled={loading} className="flex-1 bg-sky-400 text-white rounded-3xl hover:bg-sky-500 transition-all active:scale-95 disabled:opacity-50 font-black shadow-lg shadow-sky-100">
                    {loading ? <i className="fas fa-spinner fa-spin"></i> : 'ADICIONAR'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white p-10 rounded-[4rem] shadow-sm border border-slate-50">
              <div className="flex flex-col md:flex-row items-center gap-10">
                <div className="w-full md:w-1/2 h-[260px] relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={chartData} cx="50%" cy="50%" innerRadius={80} outerRadius={105} paddingAngle={10} dataKey="value" animationDuration={1000}>
                        {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />)}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                    <p className="text-[10px] text-slate-300 font-black uppercase tracking-widest leading-none mb-1">Diário</p>
                    <p className="text-4xl font-black text-slate-700 leading-none">{totals.calories.toFixed(0)}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">kcal</p>
                  </div>
                </div>
                
                <div className="w-full md:w-1/2 space-y-3">
                  <h4 className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-2">Distribuição de Macros</h4>
                  {[
                    { label: 'Carbos', val: totals.carbs, color: 'bg-[#f9d5e5]', text: 'text-rose-300' },
                    { label: 'Proteínas', val: totals.protein, color: 'bg-[#b8d8be]', text: 'text-emerald-400' },
                    { label: 'Gorduras', val: totals.lipids, color: 'bg-[#eeac99]', text: 'text-orange-300' }
                  ].map(macro => (
                    <div key={macro.label} className="flex justify-between items-center bg-slate-50/50 p-4 rounded-2xl border border-slate-50">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${macro.color}`}></div>
                        <span className="font-bold text-slate-500 text-xs uppercase tracking-widest">{macro.label}</span>
                      </div>
                      <span className={`font-black ${macro.text}`}>{macro.val.toFixed(1)}g</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-black text-slate-300 uppercase text-[10px] tracking-[0.3em] px-6">Histórico do Dia</h3>
              <div className="space-y-3">
                {foods.length === 0 ? (
                  <div className="bg-white/50 border-2 border-dashed border-slate-100 p-16 rounded-[4rem] text-center text-slate-200 italic text-sm">
                    Aguardando primeiro alimento...
                  </div>
                ) : (
                  foods.map(food => (
                    <div key={food.id} className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-50 flex justify-between items-center group hover:shadow-xl hover:-translate-y-1 transition-all">
                      <div>
                        <h5 className="font-black text-slate-600 capitalize text-sm">{food.name}</h5>
                        <div className="flex gap-4 items-center mt-1">
                          <span className="text-[9px] font-black text-slate-400 bg-slate-50 px-3 py-1 rounded-lg uppercase tracking-wider">{food.meal}</span>
                          <span className="text-[10px] font-bold text-slate-300">{food.portion}g • <span className="text-rose-300 font-black">{food.calories.toFixed(0)} kcal</span></span>
                        </div>
                      </div>
                      <button onClick={() => setFoods(prev => prev.filter(f => f.id !== food.id))} className="text-slate-100 hover:text-rose-300 transition-colors p-3 hover:bg-rose-50 rounded-2xl">
                        <i className="fas fa-trash-can"></i>
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
