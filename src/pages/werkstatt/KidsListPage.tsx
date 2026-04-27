import { Link } from 'react-router-dom';
import { useAllKids } from '../../hooks/useKid';

export function KidsListPage() {
  const { data: kids = [] } = useAllKids();
  return (
    <div className="space-y-3">
      <Link
        to="/werkstatt/new"
        className="inline-block p-3 bg-bx-yellow text-black font-bold rounded"
      >
        + Neuer Spieler
      </Link>
      <table className="w-full">
        <thead className="text-left text-xs opacity-50">
          <tr>
            <th className="py-2">Name</th>
            <th>Etage</th>
            <th>ELO</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {kids.map((k) => (
            <tr key={k.id} className="border-t border-zinc-800">
              <td className="py-2">{k.display_name}</td>
              <td>{k.floor}</td>
              <td>{k.elo}</td>
              <td>
                <Link to={`/werkstatt/${k.id}`} className="text-bx-yellow text-sm">
                  Karte / Token
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
