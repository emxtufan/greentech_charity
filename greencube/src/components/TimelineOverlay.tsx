import React from 'react';
import { HistoryItem } from '../types';

interface TimelineOverlayProps {
  items: HistoryItem[];
}

export const TimelineOverlay: React.FC<TimelineOverlayProps> = ({ items }) => {
  return (
    <div className="_fce1e2">
      <div className="_bedaeb">
        <div className="_d43144">
          {items.map((item, idx) => (
            <div
              key={item.year}
              className={`_2adfe9 ${idx === 1 ? '_3539ec' : ''}`}
            >
              <h3 style={{ fontSize: '1.2em', fontWeight: 600 }}>{item.year}</h3>
              <div style={{ fontSize: '0.9em' }}>{item.text}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
