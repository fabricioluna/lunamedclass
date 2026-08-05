import { useState, useEffect } from 'react';
import { PERIODS } from '../data/periods.ts';
import { SIMULATIONS } from '../data/disciplines.ts';
import { Period, SimulationInfo, FeatureFlag } from '../types.ts';
import { subscribeToPeriods, subscribeToDisciplines, subscribeToFeatureFlags } from '../services/configService.ts';

export const useAppConfig = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);

  // ESTADOS GLOBAIS ESTRUTURAIS (Fallback seguro via constants)
  const [periods, setPeriods] = useState<Period[]>(PERIODS);
  const [disciplines, setDisciplines] = useState<SimulationInfo[]>(SIMULATIONS);
  const [featureFlags, setFeatureFlags] = useState<FeatureFlag[]>([]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    let periodsLoaded = false;
    let disciplinesLoaded = false;

    // isLoading só cai depois que periods e disciplines — os dados estruturais que o resto
    // do app assume disponíveis — entregaram o primeiro snapshot, não num tempo arbitrário.
    const maybeFinishLoading = () => {
      if (periodsLoaded && disciplinesLoaded) {
        setIsLoading(false);
      }
    };

    // As Security Rules exigem auth != null para ler config/*. Para um visitante ainda
    // deslogado (ex: a própria tela de login) a leitura vem negada. O callback de erro marca
    // "carregado" mesmo assim, para não travar o app inteiro esperando um dado que nunca virá;
    // o fallback via constants (linha acima) cobre esse caso. Ver incidente documentado na
    // memória do projeto (isLoading travando o login anônimo, Etapa 2).
    const unsubPeriods = subscribeToPeriods(
      (data) => {
        if (data.length > 0) setPeriods(data);
        periodsLoaded = true;
        maybeFinishLoading();
      },
      () => {
        periodsLoaded = true;
        maybeFinishLoading();
      }
    );

    const unsubDisciplines = subscribeToDisciplines(
      (data) => {
        if (data.length > 0) setDisciplines(data);
        disciplinesLoaded = true;
        maybeFinishLoading();
      },
      () => {
        disciplinesLoaded = true;
        maybeFinishLoading();
      }
    );

    // Mesma ressalva de permissão de periods/disciplines: visitante deslogado não lê
    // config/featureFlags. Sem callback de erro, o SDK do Firestore loga "Uncaught Error in
    // snapshot listener" sozinho — aqui só engolimos o erro, já que featureFlags vazio já é
    // o fallback seguro (DisciplineView.checkFlag cai no defaultState quando a flag não existe).
    const unsubFlags = subscribeToFeatureFlags(setFeatureFlags, () => {});

    return () => {
      unsubPeriods();
      unsubDisciplines();
      unsubFlags();
    };
  }, []);

  return { isLoading, isOnline, periods, disciplines, featureFlags };
};
