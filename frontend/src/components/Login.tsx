// components/Login.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, ArrowRight, Eye, EyeOff, Loader2, ShieldCheck, Key, UserCheck } from 'lucide-react';
import { Role } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { apiRequest } from '@/services/apiClient';

type Mode = 'login' | 'set-password' | 'otp-verification' | 'first-access';

export default function Login() {
    const navigate = useNavigate();
    const { login, currentUser, authReady } = useAuth();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [mode, setMode] = useState<Mode>('login');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [otpToken, setOtpToken] = useState('');
    const [loading, setLoading] = useState(false);
    const [pendingRedirect, setPendingRedirect] = useState(false);

    const [showFirstAccess, setShowFirstAccess] = useState(false);
    const [isCheckingEmail, setIsCheckingEmail] = useState(false);
    const [showPasswordInput, setShowPasswordInput] = useState(false);

    // Estados para visualização de senha
    const [showPass, setShowPass] = useState(false);
    const [showNewPass, setShowNewPass] = useState(false);
    const [showConfirmPass, setShowConfirmPass] = useState(false);

    const passwordRef = useRef<HTMLInputElement>(null);

    const [alertConfig, setAlertConfig] = useState<{ show: boolean, message: string, title?: string }>({
        show: false,
        message: '',
        title: ''
    });

    useEffect(() => {
        const savedEmail = localStorage.getItem('remembered_email');
        if (savedEmail) {
            setEmail(savedEmail);
            setRememberMe(true);
            setTimeout(() => handleEmailBlur(savedEmail), 300);
        }
    }, []);

    const showAlert = (message: string, title?: string) => {
        setAlertConfig({ show: true, message, title: title || 'Aviso' });
    };

    const closeAlert = () => {
        setAlertConfig(prev => ({ ...prev, show: false }));
        if (pendingRedirect) {
            const adminRoles: Role[] = ['admin', 'gestor', 'diretoria', 'pmo', 'financeiro', 'tech_lead', 'system_admin', 'executive', 'ceo'];
            const path = adminRoles.includes(currentUser?.role as Role) ? '/admin/clients' : '/developer/projects';
            navigate(path, { replace: true });
        }
    };

    useEffect(() => {
        if (!authReady) return;
        if (currentUser && mode === 'login') {
            const adminRoles: Role[] = ['admin', 'gestor', 'diretoria', 'pmo', 'financeiro', 'tech_lead', 'system_admin', 'executive', 'ceo'];
            const path = adminRoles.includes(currentUser.role) ? '/admin/clients' : '/developer/projects';
            navigate(path, { replace: true });
        }
    }, [authReady, currentUser, mode, navigate]);

    const handleEmailBlur = async (emailVal?: string) => {
        const val = (emailVal || email).trim().toLowerCase();
        if (!val) return;

        setIsCheckingEmail(true);
        try {
            const res = await apiRequest<any>('/auth/check-email?email=' + val);
            if (res.exists) {
                if (!res.hasPassword) {
                    setShowFirstAccess(true);
                    setShowPasswordInput(false);
                } else {
                    setShowPasswordInput(true);
                    setShowFirstAccess(false);
                }
            }
        } catch (e) {
            console.warn('Erro ao validar e-mail:', e);
        } finally {
            setIsCheckingEmail(false);
        }
    };

    const handleLogin = async () => {
        setLoading(true);
        try {
            const normalizedEmail = email.trim().toLowerCase();
            const res = await apiRequest<any>('/auth/login', {
                method: 'POST',
                body: JSON.stringify({ email: normalizedEmail, password })
            });

            if (rememberMe) {
                localStorage.setItem('remembered_email', normalizedEmail);
            } else {
                localStorage.removeItem('remembered_email');
            }

            login(res.user, res.session.access_token);
        } catch (err: any) {
            showAlert(err.message, 'Falha no Acesso');
        } finally {
            setLoading(false);
        }
    };

    const handleSendOtp = async () => {
        setLoading(true);
        try {
            const normalizedEmail = email.trim().toLowerCase();
            await apiRequest('/auth/send-otp', {
                method: 'POST',
                body: JSON.stringify({ email: normalizedEmail })
            });
            setMode('otp-verification');
            showAlert('Código de segurança enviado para seu e-mail.', 'Verificação');
        } catch (err: any) {
            showAlert('Falha ao enviar código: ' + err.message, 'Erro');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async () => {
        setLoading(true);
        try {
            const res = await apiRequest<any>('/auth/verify-otp', {
                method: 'POST',
                body: JSON.stringify({ email, token: otpToken })
            });
            localStorage.setItem('nic_labs_auth_token', res.session.access_token);
            setMode('set-password');
        } catch (err: any) {
            showAlert(err.message, 'Código Inválido');
        } finally {
            setLoading(false);
        }
    };

    const handleCreatePassword = async () => {
        if (!newPassword || newPassword !== confirmPassword) {
            showAlert('As senhas não conferem.', 'Erro de Senha');
            return;
        }
        setLoading(true);
        try {
            await apiRequest('/auth/set-password', {
                method: 'POST',
                body: JSON.stringify({ email, password: newPassword })
            });
            setPendingRedirect(true);
            showAlert('Sua senha foi definida com sucesso!', 'Sucesso!');
        } catch (err: any) {
            showAlert('Erro ao definir senha: ' + err.message, 'Erro');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (mode === 'login') {
            if (showFirstAccess) await handleSendOtp();
            else await handleLogin();
        } else if (mode === 'otp-verification') {
            await handleVerifyOtp();
        } else if (mode === 'set-password') {
            await handleCreatePassword();
        }
    };

    return (
        <div className="min-h-screen flex flex-col justify-center items-center p-4 relative font-sans overflow-hidden bg-[#0f172a]">
            {/* Background Decorations */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full pointer-events-none"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none"></div>

            <div className="w-full max-w-[440px] bg-white rounded-[2.5rem] shadow-2xl p-10 space-y-8 relative z-10 border border-slate-100">
                <div className="text-center space-y-2">
                    <div className="inline-flex p-3 rounded-2xl bg-slate-50 mb-2">
                        {mode === 'login' ? <UserCheck className="w-8 h-8 text-[#1e1b4b]" /> : <ShieldCheck className="w-8 h-8 text-[#1e1b4b]" />}
                    </div>
                    <h2 className="text-2xl font-black text-[#1e1b4b] tracking-tight">
                        {mode === 'login' ? (showFirstAccess ? 'Configurar Acesso' : 'Bem-vindo') :
                            mode === 'otp-verification' ? 'Verificar E-mail' : 'Nova Senha'}
                    </h2>
                    <p className="text-slate-400 text-sm font-medium">
                        {mode === 'login' ? (showFirstAccess ? 'Siga as instruções abaixo' : 'Entre com suas credenciais') :
                            mode === 'otp-verification' ? `Enviamos um código para ${email}` : 'Crie uma senha forte e segura'}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {mode === 'login' && (
                        <div className="space-y-4">
                            <div className="relative group">
                                <Mail className={`absolute left-4 top-4 h-5 w-5 transition-colors ${email ? 'text-[#1e1b4b]' : 'text-slate-300 group-focus-within:text-[#1e1b4b]'}`} />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-transparent focus:border-[#1e1b4b]/10 focus:bg-white rounded-2xl outline-none transition-all font-semibold text-slate-700"
                                    placeholder="seu@email.com.br"
                                    onBlur={() => handleEmailBlur()}
                                    required
                                />
                                {isCheckingEmail && (
                                    <div className="absolute right-4 top-4">
                                        <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                                    </div>
                                )}
                            </div>

                            {!showFirstAccess && showPasswordInput && (
                                <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                                    <div className="relative group">
                                        <Lock className={`absolute left-4 top-4 h-5 w-5 transition-colors ${password ? 'text-[#1e1b4b]' : 'text-slate-300 group-focus-within:text-[#1e1b4b]'}`} />
                                        <input
                                            ref={passwordRef}
                                            type={showPass ? "text" : "password"}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="w-full pl-12 pr-12 py-4 bg-slate-50 border-2 border-transparent focus:border-[#1e1b4b]/10 focus:bg-white rounded-2xl outline-none transition-all font-semibold text-slate-700"
                                            placeholder="Sua Senha"
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPass(!showPass)}
                                            className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 outline-none"
                                        >
                                            {showPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                        </button>
                                    </div>

                                    <div className="flex items-center justify-between px-1">
                                        <label className="flex items-center gap-2 cursor-pointer group">
                                            <input
                                                type="checkbox"
                                                checked={rememberMe}
                                                onChange={(e) => setRememberMe(e.target.checked)}
                                                className="w-4 h-4 rounded border-slate-300 text-[#1e1b4b] focus:ring-[#1e1b4b]/20"
                                            />
                                            <span className="text-xs font-bold text-slate-500 group-hover:text-slate-700">Lembrar e-mail</span>
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setShowFirstAccess(true);
                                                setShowPasswordInput(false);
                                            }}
                                            className="text-xs font-black text-[#1e1b4b] uppercase tracking-wider hover:opacity-70 transition-opacity"
                                        >
                                            Esqueci a Senha
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {mode === 'otp-verification' && (
                        <div className="space-y-4 animate-in zoom-in-95 duration-300">
                            <div className="relative">
                                <Key className="absolute left-4 top-4 h-5 w-5 text-[#1e1b4b]" />
                                <input
                                    type="text"
                                    value={otpToken}
                                    onChange={(e) => setOtpToken(e.target.value)}
                                    className="w-full pl-12 pr-4 py-4 text-center text-2xl font-black tracking-[0.5em] bg-slate-50 border-2 border-[#1e1b4b]/10 rounded-2xl outline-none focus:bg-white transition-all"
                                    placeholder="000000"
                                    maxLength={6}
                                    required
                                    autoFocus
                                />
                            </div>
                            <button
                                type="button"
                                onClick={handleSendOtp}
                                className="w-full text-xs font-bold text-slate-400 hover:text-[#1e1b4b] transition-colors"
                            >
                                Não recebeu o código? Enviar novamente
                            </button>
                        </div>
                    )}

                    {mode === 'set-password' && (
                        <div className="space-y-4 animate-in fade-in duration-300">
                            <div className="relative group">
                                <Lock className="absolute left-4 top-4 h-5 w-5 text-slate-300 group-focus-within:text-[#1e1b4b]" />
                                <input
                                    type={showNewPass ? "text" : "password"}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full pl-12 pr-12 py-4 bg-slate-50 border-2 border-transparent focus:border-[#1e1b4b]/10 focus:bg-white rounded-2xl outline-none transition-all font-semibold text-slate-700"
                                    placeholder="Nova Senha"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowNewPass(!showNewPass)}
                                    className="absolute right-4 top-4 text-slate-400"
                                >
                                    {showNewPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-4 h-5 w-5 text-slate-300 group-focus-within:text-[#1e1b4b]" />
                                <input
                                    type={showConfirmPass ? "text" : "password"}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full pl-12 pr-12 py-4 bg-slate-50 border-2 border-transparent focus:border-[#1e1b4b]/10 focus:bg-white rounded-2xl outline-none transition-all font-semibold text-slate-700"
                                    placeholder="Confirmar Senha"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPass(!showConfirmPass)}
                                    className="absolute right-4 top-4 text-slate-400"
                                >
                                    {showConfirmPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-[#1e1b4b] hover:bg-[#2e2b6b] text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-indigo-900/10 active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                            <>
                                <span>{mode === 'login' ? (showFirstAccess ? 'Enviar Código' : 'Entrar no Sistema') : 'Continuar'}</span>
                                <ArrowRight className="w-5 h-5" />
                            </>
                        )}
                    </button>

                    {showFirstAccess && mode === 'login' && (
                        <button
                            type="button"
                            onClick={() => setShowFirstAccess(false)}
                            className="w-full text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors pt-2"
                        >
                            Voltar para o Login
                        </button>
                    )}
                </form>
            </div>

            {/* Alert Modal */}
            {alertConfig.show && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200 p-4">
                    <div className="bg-white p-8 rounded-[2rem] max-w-sm w-full text-center shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
                        <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                            <Lock className="w-8 h-8 text-[#1e1b4b]" />
                        </div>
                        <h3 className="font-black text-[#1e1b4b] text-xl mb-3 tracking-tight">{alertConfig.title}</h3>
                        <p className="text-slate-500 font-medium text-sm leading-relaxed mb-8">{alertConfig.message}</p>
                        <button
                            onClick={closeAlert}
                            className="w-full bg-[#1e1b4b] text-white py-3 rounded-xl font-black uppercase tracking-widest hover:opacity-90 transition-opacity"
                        >
                            Entendido
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
