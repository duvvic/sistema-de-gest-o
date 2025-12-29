// components/Login.tsx - Versão adaptada para React Router
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { User } from '@/types';
import { supabase } from '@/services/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { useDataController } from '@/controllers/useDataController';
import logoImg from '@/assets/logo.png';

type Mode = 'login' | 'set-password';

// Hash de senha com fallback para ambiente sem WebCrypto seguro
async function hashPassword(password: string): Promise<string> {
    const hasWebCrypto =
        typeof window !== 'undefined' &&
        !!window.crypto &&
        !!window.crypto.subtle &&
        (window.isSecureContext ?? window.location.hostname === 'localhost');

    if (hasWebCrypto) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
        return hashHex;
    }

    // Fallback apenas para DESENVOLVIMENTO em HTTP
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
        const chr = password.charCodeAt(i);
        hash = (hash << 5) - hash + chr;
        hash |= 0;
    }
    return hash.toString(16);
}

const Login: React.FC = () => {
    const navigate = useNavigate();
    const { login, currentUser } = useAuth();
    const { users } = useDataController();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [mode, setMode] = useState<Mode>('login');
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    // Redireciona se já estiver logado
    useEffect(() => {
        if (currentUser) {
            const redirectPath = currentUser.role === 'admin' ? '/admin/clients' : '/developer/projects';
            navigate(redirectPath, { replace: true });
        }
    }, [currentUser, navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (mode === 'login') {
            await handleLogin();
        } else {
            await handleCreatePassword();
        }
    };

    const handleLogin = async () => {
        try {
            setLoading(true);
            const normalizedInput = email.trim().toLowerCase();

            const foundUser = users.find(
                (u) => (u.email || '').trim().toLowerCase() === normalizedInput
            );

            if (!foundUser) {
                alert('E-mail não encontrado no sistema. Peça para o administrador cadastrá-lo na base de colaboradores.');
                return;
            }

            // Busca credencial
            const { data: credential, error } = await supabase
                .from('user_credentials')
                .select('password_hash')
                .eq('colaborador_id', Number(foundUser.id))
                .maybeSingle();

            if (error) {
                alert('Erro ao validar credenciais. Tente novamente em alguns instantes.');
                return;
            }

            // Primeiro acesso
            if (!credential) {
                setSelectedUser(foundUser);
                setMode('set-password');
                setNewPassword('');
                setConfirmPassword('');
                setPassword('');
                return;
            }

            if (!password) {
                alert('Informe a senha.');
                return;
            }

            const passwordHash = await hashPassword(password);

            if (passwordHash !== credential.password_hash) {
                alert('Senha incorreta.');
                return;
            }

            // Login via context
            login(foundUser);

            // Redireciona baseado no role
            const redirectPath = foundUser.role === 'admin' ? '/admin/clients' : '/developer/projects';
            navigate(redirectPath);

        } finally {
            setLoading(false);
        }
    };

    const handleCreatePassword = async () => {
        if (!selectedUser) {
            alert('Erro interno. Volte para o login e tente novamente.');
            setMode('login');
            return;
        }

        if (!newPassword || !confirmPassword) {
            alert('Preencha e confirme a nova senha.');
            return;
        }

        if (newPassword !== confirmPassword) {
            alert('As senhas não conferem.');
            return;
        }

        if (newPassword.length < 6) {
            alert('Use uma senha com pelo menos 6 caracteres.');
            return;
        }

        try {
            setLoading(true);
            const passwordHash = await hashPassword(newPassword);
            // 1. Salva na tabela manual para compatibilidade
            const { error: dbError } = await supabase.from('user_credentials').insert({
                colaborador_id: Number(selectedUser.id),
                password_hash: passwordHash,
            });

            if (dbError) {
                alert('Não foi possível salvar a senha no banco. Tente novamente.');
                return;
            }

            // 2. Registra no Supabase Auth para permitir recuperação por e-mail no futuro
            // Usamos signUp. Se já existir, ele pode retornar erro, mas prosseguimos se o banco manual deu certo.
            try {
                await supabase.auth.signUp({
                    email: selectedUser.email,
                    password: newPassword,
                    options: {
                        data: {
                            full_name: selectedUser.name,
                            role: selectedUser.role
                        }
                    }
                });
            } catch (authErr) {
                console.warn('[Auth Sync] Erro ao registrar no GoTrue, mas senha salva localmente:', authErr);
            }

            alert('Senha criada com sucesso!');

            // Login após criar senha
            login(selectedUser);

            const redirectPath = selectedUser.role === 'admin' ? '/admin/clients' : '/developer/projects';
            navigate(redirectPath);

        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = async () => {
        const emailInput = prompt('Digite seu e-mail para recuperar a senha:');
        if (!emailInput) return;

        const normalizedEmail = emailInput.trim().toLowerCase();
        const foundUser = users.find((u) => (u.email || '').trim().toLowerCase() === normalizedEmail);

        if (!foundUser) {
            alert('E-mail não encontrado no sistema.');
            return;
        }

        try {
            setLoading(true);

            const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
                redirectTo: `${window.location.origin}/reset-password`,
            });

            if (error) {
                console.error('[ResetPassword] Erro:', error);
                if (error.message.includes('rate limit')) {
                    alert('Muitas solicitações em pouco tempo. Tente novamente em alguns minutos.');
                } else {
                    alert('Erro ao enviar email de recuperação. Verifique se o e-mail está cadastrado no sistema de Autenticação do Supabase.');
                }
                return;
            }

            alert(`Solicitação processada para ${normalizedEmail}. Se o e-mail estiver cadastrado no sistema de autenticação, o token de recuperação chegará em instantes. Verifique também sua caixa de spam.`);
        } catch (error) {
            alert('Erro ao processar solicitação. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    const isSetPassword = mode === 'set-password';
    const effectiveEmail = isSetPassword && selectedUser ? selectedUser.email : email;

    return (
        <div className="min-h-screen bg-[#0f0720] flex flex-col justify-center items-center p-4 relative overflow-hidden">
            {/* Background elements for premium look */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#4c1d95] opacity-20 blur-[120px] rounded-full"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#7c3aed] opacity-20 blur-[120px] rounded-full"></div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden z-10"
            >
                <div className="p-8 sm:p-10 space-y-8">
                    {/* Header */}
                    <div className="text-center space-y-3">
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.2, duration: 0.5 }}
                            className="flex justify-center mb-6"
                        >
                            <img
                                src={logoImg}
                                alt="NIC-LABS"
                                className="h-20 w-auto object-contain"
                            />
                        </motion.div>
                        <motion.h2
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.4 }}
                            className="text-3xl font-extrabold text-[#1e1b4b]"
                        >
                            {isSetPassword ? 'Defina sua senha' : 'Bem-vindo colaborador'}
                        </motion.h2>
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.5 }}
                            className="text-slate-500 text-sm font-medium"
                        >
                            {isSetPassword
                                ? 'Crie sua senha para acessar o NIC-LABS.'
                                : 'Acesse com seu email@nic-labs.com.br'}
                        </motion.p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-5">
                            {/* E-mail */}
                            <motion.div
                                initial={{ x: -20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                transition={{ delay: 0.6 }}
                            >
                                <label className="block text-sm font-semibold text-slate-700 mb-2">E-mail</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-[#4c1d95] transition-colors">
                                        <Mail className="h-5 w-5" />
                                    </div>
                                    <input
                                        type="email"
                                        value={effectiveEmail}
                                        onChange={(e) => !isSetPassword && setEmail(e.target.value)}
                                        disabled={isSetPassword}
                                        className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-[#4c1d95] focus:bg-white outline-none transition-all text-slate-800 placeholder-slate-400 disabled:bg-slate-100 font-medium"
                                        placeholder="email@nic-labs.com.br"
                                        required
                                    />
                                </div>
                            </motion.div>

                            {/* Senha normal */}
                            {!isSetPassword && (
                                <motion.div
                                    initial={{ x: -20, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    transition={{ delay: 0.7 }}
                                >
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Senha</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-[#4c1d95] transition-colors">
                                            <Lock className="h-5 w-5" />
                                        </div>
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="w-full pl-12 pr-12 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-[#4c1d95] focus:bg-white outline-none transition-all text-slate-800 placeholder-slate-400 font-medium"
                                            placeholder="••••••••"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-[#4c1d95] transition-colors"
                                        >
                                            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                        </button>
                                    </div>
                                </motion.div>
                            )}

                            {/* Definição de senha */}
                            {isSetPassword && (
                                <div className="space-y-5">
                                    <motion.div
                                        initial={{ x: -20, opacity: 0 }}
                                        animate={{ x: 0, opacity: 1 }}
                                        transition={{ delay: 0.7 }}
                                    >
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">Nova senha</label>
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-[#4c1d95] transition-colors">
                                                <Lock className="h-5 w-5" />
                                            </div>
                                            <input
                                                type="password"
                                                value={newPassword}
                                                onChange={(e) => setNewPassword(e.target.value)}
                                                className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-[#4c1d95] focus:bg-white outline-none transition-all text-slate-800 placeholder-slate-400 font-medium"
                                                placeholder="Defina uma senha"
                                            />
                                        </div>
                                    </motion.div>

                                    <motion.div
                                        initial={{ x: -20, opacity: 0 }}
                                        animate={{ x: 0, opacity: 1 }}
                                        transition={{ delay: 0.8 }}
                                    >
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">Confirmar senha</label>
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-[#4c1d95] transition-colors">
                                                <Lock className="h-5 w-5" />
                                            </div>
                                            <input
                                                type="password"
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-[#4c1d95] focus:bg-white outline-none transition-all text-slate-800 placeholder-slate-400 font-medium"
                                                placeholder="Repita a senha"
                                            />
                                        </div>
                                    </motion.div>
                                </div>
                            )}
                        </div>

                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.9 }}
                            className="flex items-center justify-end"
                        >
                            {!isSetPassword && (
                                <button
                                    type="button"
                                    onClick={handleForgotPassword}
                                    className="text-sm font-bold text-[#4c1d95] hover:text-[#3b1675] transition-colors"
                                >
                                    Esqueci minha senha
                                </button>
                            )}

                            {isSetPassword && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setMode('login');
                                        setSelectedUser(null);
                                        setNewPassword('');
                                        setConfirmPassword('');
                                    }}
                                    className="text-sm font-bold text-slate-500 hover:text-slate-700 transition-colors"
                                >
                                    Voltar para login
                                </button>
                            )}
                        </motion.div>

                        <motion.button
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 1.0 }}
                            type="submit"
                            disabled={loading}
                            className="w-full bg-[#4c1d95] hover:bg-[#3b1675] disabled:opacity-70 disabled:cursor-not-allowed text-white py-4 rounded-2xl font-bold shadow-xl shadow-purple-500/20 transition-all flex items-center justify-center gap-2 group relative overflow-hidden active:scale-[0.98]"
                        >
                            <span className="relative z-10">{loading ? 'Aguarde...' : isSetPassword ? 'Salvar senha e entrar' : 'Entrar na plataforma'}</span>
                            {!loading && <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform relative z-10" />}
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                        </motion.button>
                    </form>

                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1.1 }}
                        className="flex flex-col items-center pt-2"
                    >
                        <p className="text-xs text-slate-400 text-center leading-relaxed">
                            Ao acessar, você concorda com nossos termos de uso <br /> e política de privacidade.
                        </p>
                    </motion.div>
                </div>
            </motion.div>

            <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2 }}
                className="mt-10 text-center text-slate-500 text-sm font-medium z-10"
            >
                © 2026 NIC-LABS. Todos os direitos reservados.
            </motion.p>
        </div>
    );
};

export default Login;
