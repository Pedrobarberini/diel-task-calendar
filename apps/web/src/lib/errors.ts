export function errorMessage(error: unknown): string {
  const code =
    typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : '';
  const messages: Record<string, string> = {
    'auth/invalid-credential': 'E-mail ou senha incorretos. Confira os dados e tente novamente.',
    'auth/email-already-in-use': 'Este e-mail já possui uma conta. Entre ou recupere sua senha.',
    'auth/weak-password': 'Use uma senha com pelo menos 8 caracteres.',
    'auth/invalid-email': 'Informe um endereço de e-mail válido.',
    'auth/popup-closed-by-user': 'A janela do Google foi fechada. Tente novamente.',
    'auth/popup-blocked': 'Permita a abertura de pop-ups para entrar com o Google.',
    'auth/cancelled-popup-request': 'Já existe uma tentativa de login aberta.',
    'auth/account-exists-with-different-credential':
      'Este e-mail usa outro método de acesso. Entre com o método original.',
    'auth/too-many-requests': 'Muitas tentativas. Aguarde alguns minutos e tente novamente.',
    'auth/network-request-failed': 'Verifique sua conexão com a internet e tente novamente.',
    'auth/unauthorized-domain':
      'Este domínio ainda não está autorizado no Firebase Authentication.',
    'auth/operation-not-allowed': 'Este método de login ainda não está habilitado no Firebase.',
    'permission-denied': 'Você não tem permissão para acessar estes dados. Entre novamente.',
    unavailable: 'Não foi possível conectar ao Firebase. Verifique sua conexão.',
  };
  if (messages[code]) return messages[code];
  if (code) return 'Não foi possível concluir a operação. Tente novamente em instantes.';
  if (error instanceof TypeError) return 'Verifique sua conexão e tente novamente.';
  return error instanceof Error ? error.message : 'Ocorreu um erro inesperado. Tente novamente.';
}
