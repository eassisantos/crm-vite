export interface FakeApiCallOptions {
  /** Tempo artificial de espera em milissegundos. */
  delay?: number;
  /** Força a rejeição da Promise com a mensagem informada. */
  shouldReject?: boolean;
  /**
   * Ativa falha aleatória.
   * Quando `shouldReject` for verdadeiro, este valor é ignorado.
   */
  randomReject?: boolean;
  /** Probabilidade (0-1) de rejeição quando `randomReject` for verdadeiro. */
  rejectionProbability?: number;
  /** Mensagem customizada para erros gerados artificialmente. */
  errorMessage?: string;
}

const shouldRejectRequest = ({ shouldReject, randomReject, rejectionProbability = 0.2 }: FakeApiCallOptions) => {
  if (shouldReject) {
    return true;
  }

  if (randomReject) {
    return Math.random() < Math.max(0, Math.min(1, rejectionProbability));
  }

  return false;
};

export const fakeApiCall = async <T,>(
  data: T,
  options: FakeApiCallOptions = {},
): Promise<T> =>
  new Promise((resolve, reject) => {
    const { delay = 300, errorMessage = 'A requisição simulada falhou.' } = options;
    setTimeout(() => {
      if (shouldRejectRequest(options)) {
        reject(new Error(errorMessage));
        return;
      }

      resolve(data);
    }, delay);
  });
