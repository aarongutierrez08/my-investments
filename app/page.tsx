import { storage } from '../lib/storage';
import type { Label } from '../lib/types';

export default async function HomePage() {
  const { investments, categories, labels: labelsData } = await storage.readAll();

  return (
    <main className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">My Portfolio</h1>

      {investments.length === 0 ? (
        <p className="text-center text-gray-500">No investments yet. Add your first one.</p>
      ) : (
        // Placeholder for the investments table
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white shadow-md rounded-lg overflow-hidden">
            <thead className="bg-gray-800 text-white">
              <tr>
                <th className="py-3 px-4 text-left">Instrument</th>
                <th className="py-3 px-4 text-left">Category</th>
                <th className="py-3 px-4 text-left">Amount</th>
                <th className="py-3 px-4 text-left">Price</th>
                <th className="py-3 px-4 text-left">Purchase date</th>
                <th className="py-3 px-4 text-left">Labels</th>
                <th className="py-3 px-4 text-left">Total invested</th>
              </tr>
            </thead>
            <tbody className="text-gray-700">
              {investments.map((investment) => {
                const category = categories.find((cat) => cat.id === investment.categoryId);
                const labels = investment.labelIds
                  .map((labelId) => labelsData.find((lbl) => lbl.id === labelId))
                  .filter((l): l is Label => l !== undefined);

                const totalInvested = (investment.amount * investment.price).toFixed(2);

                return (
                  <tr key={investment.id} className="border-b border-gray-200 hover:bg-gray-100">
                    <td className="py-3 px-4">{investment.instrument}</td>
                    <td className="py-3 px-4">
                      {category && (
                        <span className="flex items-center">
                          <span
                            className="inline-block w-3 h-3 rounded-full mr-2"
                            style={{ backgroundColor: category.color }}
                          ></span>
                          {category.name}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">{investment.amount}</td>
                    <td className="py-3 px-4">{investment.price.toFixed(2)}</td>
                    <td className="py-3 px-4">{investment.purchaseDate}</td>
                    <td className="py-3 px-4">
                      {labels.map((label, index) => (
                        <span
                          key={label.id}
                          className="inline-block bg-blue-200 text-blue-800 text-xs px-2 rounded-full mr-1"
                          style={{ backgroundColor: label.color, color: 'white' }}
                        >
                          {label.name}
                        </span>
                      ))}
                    </td>
                    <td className="py-3 px-4">{totalInvested}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
