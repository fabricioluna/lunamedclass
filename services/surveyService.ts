import { firestoreDB } from '../firebase';
import { collection, addDoc, getDocs } from 'firebase/firestore';
import { SurveyAnswers, SurveyResponse } from '../types';

const surveysCollection = collection(firestoreDB, 'surveys');

export const submitSurvey = async (unit: string, answers: SurveyAnswers) => {
  await addDoc(surveysCollection, { unit, answers });
};

export const fetchSurveysOnce = async (): Promise<SurveyResponse[]> => {
  const snap = await getDocs(surveysCollection);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<SurveyResponse, 'id'>) }));
};
