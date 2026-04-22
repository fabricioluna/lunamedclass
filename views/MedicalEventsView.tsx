import React, { useState } from 'react';
import { Calendar, MapPin, GraduationCap, Clock, ExternalLink, Search } from 'lucide-react';
import { MedicalEvent } from '../types'; 
// IMPORTANDO DA NOSSA FONTE DE VERDADE CORRETA
import { MEDICAL_EVENTS_2026 } from '../constants'; 

interface MedicalEventsViewProps {
  onBack: () => void;
}

const MedicalEventsView: React.FC<MedicalEventsViewProps> = ({ onBack }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredEvents = MEDICAL_EVENTS_2026.filter((event: MedicalEvent) => 
    event.congress.toLowerCase().includes(searchTerm.toLowerCase()) || 
    event.specialty.toLowerCase().includes(searchTerm.toLowerCase()) ||
    event.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header Secundário da View */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4 border-b-2 border-[#D4A017] pb-4">
        <div>
          <h2 className="text-sm font-bold text-[#D4A017] uppercase tracking-widest mb-1">
            Calendário Científico
          </h2>
          <h1 className="text-3xl md:text-4xl font-black text-[#003366] tracking-tighter uppercase">
            Congressos Nacionais 2026
          </h1>
          <p className="text-gray-500 mt-2 max-w-2xl text-sm leading-relaxed">
            Acompanhe os principais eventos da medicina brasileira. Monitore os prazos de submissão de resumos e amplie seu networking acadêmico.
          </p>
        </div>
      </div>

      {/* Barra de Pesquisa */}
      <div className="relative mb-8 shadow-sm">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          placeholder="Filtrar por nome, especialidade ou localização..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-12 pr-4 py-4 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#003366] focus:border-transparent transition-all"
        />
      </div>

      {/* LISTA VERTICAL DE CONGRESSOS (15 Eventos) */}
      {filteredEvents.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-gray-300">
          <Calendar className="mx-auto text-gray-300 mb-3" size={48} />
          <p className="text-gray-500 font-medium">Nenhum congresso encontrado para este filtro.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {filteredEvents.map((event: MedicalEvent) => (
            <div 
              key={event.id} 
              className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group flex flex-col md:flex-row gap-6 w-full"
            >
              {/* Tarja lateral decorativa */}
              <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#003366] group-hover:bg-[#D4A017] transition-colors"></div>
              
              {/* Bloco 1: Informações Principais */}
              <div className="flex-1">
                <div className="mb-3">
                  <span className="inline-flex items-center gap-1 bg-[#f4f7f6] text-[#003366] px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-gray-200">
                    <GraduationCap size={12} />
                    {event.specialty}
                  </span>
                </div>

                <h3 className="text-xl md:text-2xl font-bold text-gray-900 leading-tight mb-2">
                  {event.congress}
                </h3>
                <p className="text-sm text-gray-600 mb-4 max-w-3xl">
                  {event.description}
                </p>
              </div>

              {/* Bloco 2: Dados e Ações (Alinhado à direita no Desktop) */}
              <div className="flex flex-col gap-4 md:w-72 shrink-0 bg-gray-50 p-4 rounded-xl border border-gray-100 justify-center">
                
                <div className="flex items-start gap-3">
                  <MapPin className="text-[#D4A017] shrink-0 mt-0.5" size={16} />
                  <div>
                    <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Local</p>
                    <p className="text-xs font-semibold text-[#003366]">{event.location}</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <Calendar className="text-[#D4A017] shrink-0 mt-0.5" size={16} />
                  <div>
                    <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Data do Evento</p>
                    <p className="text-xs font-semibold text-[#003366]">{event.eventDate}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Clock className="text-[#003366] shrink-0 mt-0.5" size={16} />
                  <div>
                    <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Submissão</p>
                    <p className="text-xs font-bold text-red-600">{event.submissionPeriod}</p>
                  </div>
                </div>

                <div className="mt-2">
                  <a 
                    href={event.link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 bg-[#003366] hover:bg-[#002244] text-white py-2.5 px-4 rounded-lg font-bold text-xs transition-colors shadow-sm"
                  >
                    <ExternalLink size={14} />
                    Acessar Site Oficial
                  </a>
                </div>

              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MedicalEventsView;