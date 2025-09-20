import { usePlayerStore } from '../lib/store';
import CellButton from './CellButton';

export default function CardGrid() {
  const { card, drawn } = usePlayerStore();
  const { grid, marks } = card;

  const headers = ['B', 'I', 'N', 'G', 'O'];

  return (
    <div className="card p-4">
      {/* Headers */}
      <div className="grid grid-cols-5 gap-2 mb-2">
        {headers.map((letter) => (
          <div
            key={letter}
            className="text-center font-bold text-brand-primary text-lg"
          >
            {letter}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-5 gap-2">
        {grid.map((row, rowIndex) =>
          row.map((number, colIndex) => {
            const position = rowIndex * 5 + colIndex;
            const isFree = position === 12;
            const isMarked = marks[position] || false;
            const isDrawn = drawn.drawnSet.has(number) || isFree;

            return (
              <CellButton
                key={position}
                position={position}
                number={number}
                isFree={isFree}
                isMarked={isMarked}
                isDrawn={isDrawn}
              />
            );
          })
        )}
      </div>
    </div>
  );
}