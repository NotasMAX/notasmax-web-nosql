
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Home() {
    const { user } = useAuth();

    useEffect(() => {
        document.title = 'NotasMAX - Página Inicial';
    }, []);

    return (
        <div className="space-y-6">
            <div>
                <h2 className='font-inter font-bold text-[2rem]'>Olá, {user?.nome} 👋</h2>
                <p className='font-inter font-medium text-[1.2rem] text-[#5B5B5B]'>Seja bem-vindo(a) de volta!</p>
            </div>

            <div className="max-w-md rounded-xl border border-[#D9D9D9] bg-white p-5 shadow-sm transition hover:shadow-md">
                <p className="mb-3 text-sm font-semibold uppercase tracking-[0.08em] text-[#5B5B5B]">Atalhos</p>
                <Link
                    to="/presenca"
                    className="flex items-center justify-between rounded-lg border border-[#D1D5DB] bg-[#F9FAFB] px-4 py-3 text-left text-base font-semibold text-[#0F172A] transition hover:border-[#1E3A8A] hover:bg-[#EEF2FF]"
                >
                    <span>Lançamento de presença</span>
                    <span aria-hidden="true">→</span>
                </Link>
            </div>
        </div>
    );
}