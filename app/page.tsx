import { supabase } from '../utils/supabase'
import { depositFunds, processRoutedPaycheck, payExpense } from './actions'

// Helper function to add the "st", "nd", "rd", or "th" to the due dates
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
  // 1. Fetch all accounts
  const { data: accounts, error: accountsError } = await supabase
    .from('accounts')
    .select('*')
    .order('id', { ascending: true })

  // 2. Fetch active bills 
  const { data: bills, error: billsError } = await supabase
    .from('bills')
    .select('*')
    .eq('is_active', true)
    .order('id', { ascending: true })

  // 3. Fetch recent ledger transactions (Latest 15)
  const { data: ledger, error: ledgerError } = await supabase
    .from('ledger')
    .select('*')
    .order('id', { ascending: false })
    .limit(15)

  if (accountsError || billsError || ledgerError) {
    console.error('Data fetch error:', accountsError?.message || billsError?.message || ledgerError?.message)
    return <div className="p-8 text-red-500">Failed to load dashboard data.</div>
  }

  return (
    <main className="min-h-screen p-8 bg-gray-50 text-gray-900 font-sans">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Financial Routing Dashboard</h1>
        
        {/* FORM 1: MANUAL DEPOSIT */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6">
          <h2 className="text-xl font-semibold mb-4">Log Income Deposit</h2>
          <form action={depositFunds} className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Account</label>
              <select name="accountId" className="w-full border border-gray-300 rounded p-2" required>
                <option value="">-- Choose destination --</option>
                {accounts?.map((acc) => (
                  <option key={acc.id} value={acc.id}>{acc.account_name}</option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount ($)</label>
              <input type="number" name="amount" step="0.01" className="w-full border border-gray-300 rounded p-2" required />
            </div>
            <button type="submit" className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 transition font-bold">
              Deposit Funds
            </button>
          </form>
        </div>

        {/* FORM 2: AUTOMATED PAYCHECK ROUTING */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-8 border-l-4 border-l-blue-500">
          <h2 className="text-xl font-semibold mb-4 text-blue-800">Process Paycheck Routing</h2>
          <p className="text-sm text-gray-600 mb-4">
            Automatically distributes funds to Utilities, HOA, Joint, Savings, and sub-accounts based on routing rules.
          </p>
          <form action={processRoutedPaycheck} className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Total Paycheck Amount ($)</label>
              <input type="number" name="amount" step="0.01" className="w-full border border-gray-300 rounded p-2" required />
            </div>
            <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition font-bold">
              Execute Routing
            </button>
          </form>
        </div>

        {/* MODULE 3: PENDING BILLS CHECKLIST */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-8 border-l-4 border-l-red-500">
          <h2 className="text-xl font-semibold mb-4 text-red-800">Pending Bills</h2>
          <div className="flex flex-col gap-3">
            {bills?.map((bill) => {
              const payingAccount = accounts?.find(acc => acc.id === bill.paying_account_id)
              const dueDateText = bill.due_day_of_month 
                ? ` • Due on the ${bill.due_day_of_month}${getOrdinalSuffix(bill.due_day_of_month)}` 
                : ''
              
              return (
                <div key={bill.id} className="flex justify-between items-center p-3 border border-gray-100 rounded bg-gray-50">
                  <div>
                    <p className="font-medium text-gray-800">{bill.bill_name}</p>
                    <p className="text-sm text-gray-500">
                      Expected: ${bill.expected_amount} • From: {payingAccount?.account_name || 'Unassigned'}
                      <span className="font-semibold text-red-600">{dueDateText}</span>
                    </p>
                  </div>
                  
                  <form action={payExpense} className="flex items-center gap-2">
                    <input type="hidden" name="expenseName" value={bill.bill_name} />
                    <input type="hidden" name="accountId" value={bill.paying_account_id} />
                    <input type="hidden" name="amount" value={bill.expected_amount} />
                    <button type="submit" className="bg-red-100 text-red-700 px-4 py-1.5 rounded text-sm font-semibold hover:bg-red-200 transition">
                      Pay Exact Amount
                    </button>
                  </form>
                </div>
              )
            })}
            
            {bills?.length === 0 && (
              <p className="text-gray-500 italic">No pending bills found in the database.</p>
            )}
          </div>
        </div>
        
        {/* MODULE 4: ACCOUNT BALANCES GRID */}
        <h2 className="text-xl font-semibold mb-4 text-gray-800">Current Balances</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {accounts?.map((account) => (
            <div key={account.id} className="bg-white border border-gray-200 p-6 rounded-lg shadow-sm">
              <h2 className="text-lg font-semibold text-gray-700 mb-2">{account.account_name}</h2>
              <p className="text-3xl font-bold text-green-600">${account.current_cleared_balance}</p>
            </div>
          ))}
        </div>

        {/* MODULE 5: RECENT TRANSACTIONS LEDGER */}
        <h2 className="text-xl font-semibold mb-4 text-gray-800">Recent Transactions</h2>
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">From</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">To</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {ledger?.map((tx) => {
                // Translate the database IDs into actual human-readable account names
                const sourceAcc = accounts?.find(a => a.id === tx.source_account_id)
                const destAcc = accounts?.find(a => a.id === tx.destination_account_id)
                
                return (
                  <tr key={tx.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(tx.transaction_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <span className={tx.amount < 0 ? "text-red-600" : "text-green-600"}>
                        {tx.amount < 0 ? '-' : '+'}${Math.abs(tx.amount).toFixed(2)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {sourceAcc?.account_name || 'External / Income'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {destAcc?.account_name || 'External / Spent'}
                    </td>
                  </tr>
                )
              })}
              {ledger?.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-gray-500 italic">No recent transactions found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>
    </main>
  )
}