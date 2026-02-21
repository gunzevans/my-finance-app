import { supabase } from '../../utils/supabase'
import Link from 'next/link'

export default async function LedgerPage() {
  const { data: ledger } = await supabase
    .from('ledger')
    .select('*')
    .order('id', { ascending: false })

  const { data: accounts } = await supabase.from('accounts').select('*')

  return (
    <main className="min-h-screen p-4 md:p-8 bg-gray-50 text-gray-900 font-sans">
      <div className="max-w-4xl mx-auto">
        <Link href="/" className="text-blue-600 hover:underline mb-4 inline-block">← Back to Dashboard</Link>
        <h1 className="text-2xl font-bold mb-6">Transaction History</h1>
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-100">
            <tbody className="divide-y divide-gray-100">
              {ledger?.map((tx) => {
                const sourceAcc = accounts?.find(a => a.id === tx.source_account_id)
                const destAcc = accounts?.find(a => a.id === tx.destination_account_id)
                return (
                  <tr key={tx.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-xs font-medium text-gray-500">{new Date(tx.transaction_date).toLocaleDateString()}</td>
                    <td className={`px-6 py-4 text-sm font-black ${tx.amount < 0 ? "text-red-500" : "text-green-600"}`}>
                      {tx.amount < 0 ? '-' : '+'}${Math.abs(tx.amount).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-400 font-bold uppercase">{destAcc?.account_name || 'SPENT'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  )
}