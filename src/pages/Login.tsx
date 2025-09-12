import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [registrationMessage, setRegistrationMessage] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegistrationMessage(''); // Clear any previous messages

    try {
      if (isRegistering) {
        // Registration logic
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) {
          throw error;
        }

        // Check if user data is present after signup
        if (data && data.user) {
          setRegistrationMessage('Registro bem-sucedido! Verifique seu e-mail para confirmar a conta.');
          setEmail('');
          setPassword('');
        } else {
          // This case might happen if email confirmation is required but user data is not immediately available
          // Or if there's another subtle issue not caught by 'error'
          setRegistrationMessage('Registro iniciado. Verifique seu e-mail para confirmar a conta. Se o e-mail não chegar, pode haver um problema com o registro.');
          setEmail('');
          setPassword('');
        }
      } else {
        // Login logic
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          throw error;
        }

        alert('Login bem-sucedido!');
        window.location.href = '/';
      }
    } catch (error: any) {
      if (isRegistering) {
        setRegistrationMessage(error.message);
      } else {
        alert(error.message);
      }
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 rounded-lg bg-white p-10 shadow-xl">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {isRegistering ? 'Crie sua conta' : 'Faça login na sua conta'}
          </h2>
          {registrationMessage && (
            <div className="mt-2 text-center">
              <p className="text-sm text-green-600">{registrationMessage}</p>
              <button
                type="button"
                onClick={() => setRegistrationMessage('')}
                className="mt-1 text-sm text-blue-600 hover:underline focus:outline-none"
              >
                Limpar Mensagem
              </button>
            </div>
          )}
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="-space-y-px rounded-md shadow-sm">
            <div>
              <label htmlFor="email-address" className="sr-only">
                Email
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="relative block w-full appearance-none rounded-none rounded-t-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                placeholder="Endereço de Email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setRegistrationMessage(''); }}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Senha
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="relative block w-full appearance-none rounded-none rounded-b-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                placeholder="Senha"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setRegistrationMessage(''); }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm">
              <a href="/forgot-password" className="font-medium text-indigo-600 hover:text-indigo-500">
                Esqueceu sua senha?
              </a>
            </div>
          </div>

          <div>
            <button
              type="submit"
              className="group relative flex w-full justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                {/* Heroicon name: solid/lock-closed */}
                <svg
                  className="h-5 w-5 text-indigo-500 group-hover:text-indigo-400"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </span>
              {isRegistering ? 'Registrar' : 'Entrar'}
            </button>
          </div>
        </form>
        <div className="text-center mt-4">
          <p className="text-sm text-gray-600">
            {isRegistering ? 'Já tem uma conta?' : 'Não tem uma conta?'}
            <button
              type="button"
              onClick={() => {
                setIsRegistering(!isRegistering);
                setRegistrationMessage(''); // Clear message on toggle
                setEmail(''); // Clear fields on toggle
                setPassword(''); // Clear fields on toggle
              }}
              className="font-medium text-indigo-600 hover:text-indigo-500 ml-1 focus:outline-none"
            >
              {isRegistering ? 'Faça login' : 'Crie uma'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;