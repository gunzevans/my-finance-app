import { supabase } from '../utils/supabase'
import { depositFunds, processRoutedPaycheck, payExpense } from './actions'

function getOrdinalSuffix(day: number) {
  if (!day) return ''
  if (day > 3 && day < 21) return 'th'
  switch (day % 10) {
    case 1:  return "st"
    case 2:  return "nd"
    case 3:  return "rd"
    default: return "th"
  }
}

export default async function Home() {
  const { data: accounts } = await supabase
    .from('accounts')
    .select('*')
    .order('id', { ascending: true })

  const { data: bills } = await supabase
    .from('bills')
    .select('*')
    .eq('is_active', true)
    .order('id', { ascending: true })

  const { data: ledger } = await supabase
    .from('ledger')
    .select('*')
    .order('id', { ascending: false })
    .limit(15)

  // --- FORECAST CALCULATIONS ---
  const dansChecking = accounts?.find(a => a.id === 1)?.current_cleared_balance || 0
  const totalPendingBills = bills?.reduce((sum, bill) => sum + (bill.expected_amount || 0), 0) || 0
  const safeToSpend = dansChecking - totalPendingBills

  return (
    <main className="min-h-screen p-4 md:p-8 bg-gray-50 text-gray-900 font-sans">
      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-2xl md:text-3xl font-bold italic tracking-tight text-gray-800">DAN'S ROUTING ENGINE</h1>
          <div className="text-right">
             <p className="text-xs uppercase tracking-widest text-gray-500 font-bold">Status</p>
             <p className="text-sm font-mono text-green-600">● LIVE_SYSTEM_ACTIVE</p>
          </div>
        </header>

        {/* NEW: PAYDAY FORECAST MODULE */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border-t-4 border-t-gray-800 border border-gray-200">
            <p className="text-sm font-semibold text-gray-500 uppercase">Current Checking</p>
            <p className="text-3xl font-bold">${dansChecking.toLocaleString()}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border-t-4 border-t-red-500 border border-gray-200">
            <p className="text-sm font-semibold text-gray-500 uppercase">Total Pending Bills</p>
            <p className="text-3xl font-bold text-red-600">-${totalPendingBills.toLocaleString()}</p>
          </div>
          <div className={`bg-white p-6 rounded-xl shadow-sm border-t-4 border border-gray-200 ${safeToSpend >= 0 ? 'border-t-green-500' : 'border-t-orange-600'}`}>
            <p className="text-sm font-semibold text-gray-500 uppercase">Safe-To-Spend Cash</p>
            <p className={`text-3xl font-bold ${safeToSpend >= 0 ? 'text-green-600' : 'text-orange-600'}`}>
              ${safeToSpend.toLocaleString()}
            </p>
          </div>
        </div>

        {/* AUTOMATED PAYCHECK ROUTING */}
        <div className="bg-blue-600 p-6 rounded-xl shadow-lg mb-8 text-white">
          <h2 className="text-xl font-bold mb-2">Process New Paycheck</h2>
          <form action={processRoutedPaycheck} className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 w-full">
              <input 
                type="number" 
                name="amount" 
                step="0.01" 
                placeholder="Enter Net Pay Amount..." 
                className="w-full bg-blue-700 border-none rounded-lg p-3 text-white placeholder-blue-300 font-bold text-xl focus:ring-2 focus:ring-white outline-none" 
                required 
              />
            </div>
            <button type="submit" className="w-full md:w-auto bg-white text-blue-600 px-8 py-3 rounded-lg font-black uppercase tracking-tight hover:bg-gray-100 transition shadow-md">
              Execute Routing
            </button>
          </form>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* PENDING BILLS */}
          <section>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <span className="w-2 h-6 bg-red-500 rounded-full"></span> 
              Bill Checklist
            </h2>
            <div className="space-y-3">
              {bills?.map((bill) => {
                const payingAccount = accounts?.find(acc => acc.id === bill.paying_account_id)
                const dueDateText = bill.due_day_of_month 
                  ? `Due the ${bill.due_day_of_month}${getOrdinalSuffix(bill.due_day_of_month)}` 
                  : ''
                
                return (
                  <div key={bill.id} className="flex justify-between items-center p-4 bg-white border border-gray-200 rounded-xl hover:border-red-300 transition group shadow-sm">
                    <div>
                      <p className="font-bold text-gray-800 uppercase text-sm tracking-tight">{bill.bill_name}</p>
                      <p className="text-xs text-gray-500 font-medium italic">
                        {payingAccount?.account_name} • <span className="text-red-500 font-bold">{dueDateText}</span>
                      </p>
                    </div>
                    <form action={payExpense} className="flex items-center gap-4">
                      <p className="font-black text-gray-900">${bill.expected_amount}</p>
                      <input type="hidden" name="expenseName" value={bill.bill_name} />
                      <input type="hidden" name="accountId" value={bill.paying_account_id} />
                      <input type="hidden" name="amount" value={bill.expected_amount} />
                      <button type="submit" className="bg-gray-100 text-gray-400 p-2 rounded-full group-hover:bg-red-500 group-hover:text-white transition">
                        ✓
                      </button>
                    </form>
                  </div>
                )
              })}
            </div>
          </section>

          {/* ACCOUNT BALANCES */}
          <section>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <span className="w-2 h-6 bg-green-500 rounded-full"></span> 
              Vault Balances
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {accounts?.map((account) => (
                <div key={account.id} className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-tighter">{account.account_name}</p>
                  <p className="text-xl font-black text-gray-800">${account.current_cleared_balance.toLocaleString()}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* LEDGER */}
        <section className="mt-12">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <span className="w-2 h-6 bg-gray-400 rounded-full"></span> 
            System Ledger
          </h2>
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-black text-gray-400 uppercase">Date</th>
                  <th className="px-6 py-4 text-left text-xs font-black text-gray-400 uppercase">Amount</th>
                  <th className="px-6 py-4 text-left text-xs font-black text-gray-400 uppercase">Source</th>
                  <th className="px-6 py-4 text-left text-xs font-black text-gray-400 uppercase">Destination</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {ledger?.map((tx) => {
                  const sourceAcc = accounts?.find(a => a.id === tx.source_account_id)
                  const destAcc = accounts?.find(a => a.id === tx.destination_account_id)
                  return (
                    <tr key={tx.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 whitespace-nowrap text-xs font-medium text-gray-500">{new Date(tx.transaction_date).toLocaleDateString()}</td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-black ${tx.amount < 0 ? "text-red-500" : "text-green-600"}`}>
                        {tx.amount < 0 ? '-' : '+'}${Math.abs(tx.amount).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-400 font-bold uppercase tracking-tighter">{sourceAcc?.account_name || 'EXTERNAL'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-400 font-bold uppercase tracking-tighter">{destAcc?.account_name || 'SPENT'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  )
}