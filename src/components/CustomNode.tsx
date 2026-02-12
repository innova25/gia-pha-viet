import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { User, ChevronDown, ChevronUp, Crown, Heart } from 'lucide-react';
import { Gender, GraphNodeData, Person } from '../types';

const getPersonDetails = (person: Person | GraphNodeData) => {
  const currentYear = new Date().getFullYear();
  const birth = parseInt(person.birthYear);
  const death = person.deathYear ? parseInt(person.deathYear) : null;
  
  let age = '?';
  let status = 'Không rõ';
  let statusColor = 'text-gray-400';

  if (isNaN(birth) || birth > currentYear) {
      return { age: '?', status: 'Năm sinh không hợp lệ', statusColor: 'text-gray-400' };
  }

  if (death !== null && !isNaN(death) && death < birth) {
       return { age: '?', status: 'Dữ liệu lỗi', statusColor: 'text-red-400' };
  }

  if (death !== null && !isNaN(death)) {
      const calculatedAge = death - birth;
      if (calculatedAge >= 0) {
        age = `${calculatedAge}`;
        status = 'Đã mất';
        statusColor = 'text-gray-500';
      }
  } else {
      const calculatedAge = currentYear - birth;
      if (calculatedAge >= 0) {
        age = `${calculatedAge}`;
        status = 'Còn sống';
        statusColor = 'text-green-600';
      }
  }

  if (age !== '?' && parseInt(age) < 0) age = '?';

  return { age, status, statusColor };
};

interface PersonCardFaceProps {
  person: Person | GraphNodeData;
  isRoot?: boolean;
  onClick?: (e: React.MouseEvent) => void;
}

const PersonCardFace = ({ person, isRoot, onClick }: PersonCardFaceProps) => {
  const isMale = person.gender === Gender.MALE;
  const accentColor = isMale ? 'text-viet-red' : 'text-viet-gold-dark';
  const ringColor = isMale ? 'ring-viet-red' : 'ring-viet-gold';
  const genderText = isMale ? 'Nam' : person.gender === Gender.FEMALE ? 'Nữ' : '?';
  
  const { age, status, statusColor } = getPersonDetails(person);

  return (
    <div className="flex items-start gap-3 p-3 h-full cursor-pointer hover:bg-black/5 transition-colors" onClick={onClick}>
      <div className="relative shrink-0 mt-1">
        <div className={`w-14 h-14 rounded-full border-2 ${ringColor} p-0.5 bg-white shadow-sm`}>
          {person.avatarUrl ? (
            <img 
              src={person.avatarUrl} 
              alt={person.name} 
              className="w-full h-full rounded-full object-cover" 
            />
          ) : (
            <div className="w-full h-full rounded-full bg-gray-50 flex items-center justify-center text-gray-400">
              <User size={24} />
            </div>
          )}
        </div>
        {isRoot && (
          <div className="absolute -top-1 -right-1 bg-viet-gold text-white p-0.5 rounded-full shadow-sm border border-white">
            <Crown size={12} fill="currentColor" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <div className="flex items-center justify-between mb-0.5">
          <span className={`text-[10px] font-bold uppercase tracking-wider ${accentColor} bg-opacity-10 bg-gray-100 px-1.5 rounded`}>
            {genderText}
          </span>
           <span className="text-[10px] text-gray-400 font-mono">
            {person.birthYear}{person.deathYear ? ` - ${person.deathYear}` : ''}
          </span>
        </div>
        
        <h3 className={`font-serif font-bold text-sm leading-tight truncate ${accentColor} mb-1`} title={person.name}>
          {person.name}
        </h3>
        
        <div className="flex items-center gap-2 text-[10px]">
          <span className="font-semibold text-gray-700">
            {age !== '?' ? `${age} tuổi` : '---'}
          </span>
          <span className="w-0.5 h-2.5 bg-gray-300"></span>
          <span className={`${statusColor} font-medium flex items-center gap-1`}>
            {status === 'Còn sống' && <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>}
            {status}
          </span>
        </div>
      </div>
    </div>
  );
};

const CustomNode = ({ data }: NodeProps<any>) => {
  const person = data as GraphNodeData;
  const spouse = person.spouse;
  
  const isMale = person.gender === Gender.MALE;
  const badgeBg = isMale ? 'bg-viet-red' : 'bg-viet-gold-dark';

  return (
    <div className="relative group">
      <Handle 
        type="target" 
        position={Position.Top} 
        className="!bg-viet-brown !w-3 !h-3 !-top-2 z-10 !border-2 !border-white" 
      />

      <div 
        className={`
          bg-white rounded-xl shadow-card hover:shadow-card-hover 
          transition-all duration-300 border border-gray-200 overflow-hidden flex flex-col
          ${person.isRoot ? 'ring-2 ring-viet-gold ring-offset-2' : ''}
        `}
        style={{ width: person.width || 280, height: 130 }}
      >
        <div className={`h-1 w-full ${badgeBg}`} />

        <div className="flex flex-1 overflow-hidden divide-x divide-gray-100">
          <div className="flex-1 min-w-0">
            <PersonCardFace person={person} isRoot={person.isRoot} />
          </div>

          {spouse && (
            <div className="flex-1 min-w-0 bg-gray-50/50">
               <PersonCardFace 
                  person={spouse} 
                  onClick={(e) => {
                    e.stopPropagation();
                    if(person.onSpouseSelect) person.onSpouseSelect(spouse.id);
                  }} 
                />
            </div>
          )}
        </div>

        {(person.hasChildren || spouse) && (
          <div className="bg-gray-50/80 px-3 py-1.5 flex items-center justify-center border-t border-gray-100 h-8 shrink-0 backdrop-blur-sm relative">
             {spouse && (
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-red-300 opacity-50">
                  <Heart size={14} fill="currentColor" />
                </div>
             )}

            {person.hasChildren && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  if (person.onToggleExpand) person.onToggleExpand(person.id);
                }}
                className={`
                  absolute right-2 top-1/2 -translate-y-1/2
                  p-1 rounded-md transition-all flex items-center gap-1 text-[9px] font-bold uppercase
                  ${person.isExpanded 
                    ? 'bg-gray-200 text-gray-600 hover:bg-gray-300' 
                    : 'bg-white text-viet-brown border border-gray-200 hover:border-viet-brown hover:text-viet-red shadow-sm'
                  }
                `}
              >
                {person.isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>
            )}
          </div>
        )}
      </div>

      <Handle 
        type="source" 
        position={Position.Bottom} 
        className="!bg-viet-brown !w-3 !h-3 !-bottom-2 z-10 !border-2 !border-white" 
      />
    </div>
  );
};

export default memo(CustomNode);