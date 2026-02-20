import { supabase } from '../utils/supabase'
import { depositFunds, processRoutedPaycheck } from './actions'

export default async function Home() {
  // Fetch accounts
  const { data: accounts } = await supabase
    .from('accounts')
    .select('*')
    .order('id', { ascending: true })

  // Fetch active bills
  const { data: bills } = await supabase
    .from('bills')
    .select('*')
    .eq('is_active', true)
    .order('id', { ascending: true })

  if (error) {
    console.error('Error fetching accounts:', error.message)
    return <div className="p-8 text-red-500">Failed to load accounts.</div>
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
            Automatically distributes funds to Utilities, HOA, and Savings based on routing rules.
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
        {/* PENDING BILLS CHECKLIST */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-8 border-l-4 border-l-red-500">
          <h2 className="text-xl font-semibold mb-4 text-red-800">Pending Bills</h2>
          <div className="flex flex-col gap-3">
            {bills?.map((bill) => {
              // Find the account name that is supposed to pay this bill
              const payingAccount = accounts?.find(acc => acc.id === bill.paying_account_id)
              
              return (
                <div key={bill.id} className="flex justify-between items-center p-3 border border-gray-100 rounded bg-gray-50">
                  <div>
                    <p className="font-medium text-gray-800">{bill.bill_name}</p>
                    <p className="text-sm text-gray-500">
                      Expected: ${bill.expected_amount} • From: {payingAccount?.account_name || 'Unassigned'}
                    </p>
                  </div>
                  
                  {/* The Quick-Pay Button */}
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
          </div>
        </div>
        
        {/* ACCOUNT BALANCES GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {accounts?.map((account) => (
            <div key={account.id} className="bg-white border border-gray-200 p-6 rounded-lg shadow-sm">
              <h2 className="text-lg font-semibold text-gray-700 mb-2">{account.account_name}</h2>
              <p className="text-3xl font-bold text-green-600">${account.current_cleared_balance}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
