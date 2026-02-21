import { supabase } from '../utils/supabase'
import { depositFunds, processRoutedPaycheck, payExpense, resetMonthlyBills } from './actions'
import Link from 'next/link'

// Helper for date suffixes (1st, 2nd, 3rd...)
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
  // Fetch data from Supabase
  const { data: accounts } = await supabase.from('accounts').select('*').order('id', { ascending: true })
  const { data: bills } = await supabase.from('bills').select('*').eq('is_active', true).order('due_day_of_month', { ascending: true })

  // Calculate Header Stats
  const dansChecking = accounts?.find(a => a.id === 1)?.current_cleared_balance || 0
  const totalPendingBills = bills?.reduce((sum, bill) => sum + (bill.expected_amount || 0), 0) || 0
  const safeToSpend = dansChecking - totalPendingBills

  return (
    <main className="min-h-screen p-4 md:p-8 bg-gray-50 text-gray-900 font-sans">
      <div className="max-w-6xl mx-auto">
        
        {/* HEADER */}
        <header className="flex justify-between items-center mb-6">
          <h1 className="text-xl font-black italic tracking-tighter text-gray-800 underline decoration-blue-500 underline-offset-4">
            GUNZ_ROUTING_V2
          </h1>
          <Link href="/ledger" className="bg-gray-200 text-gray-600 px-4 py-2 rounded-lg text-xs font-bold uppercase hover:bg-gray-300 transition">
            View Ledger
          </Link>
        </header>

        {/* TOP STATS BOXES */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Checking Balance</p>
            <p className="text-2xl font-black text-center">${dansChecking.toLocaleString()}</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Bills Remaining</p>
            <p className="text-2xl font-black text-red-500 text-center">-${totalPendingBills.toLocaleString()}</p>
          </div>
          <div className={`bg-white p-4 rounded-xl shadow-sm border-2 text-center ${safeToSpend >= 0 ? 'border-green-500' : 'border-orange-500'}`}>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Safe-To-Spend</p>
            <p className={`text-2xl font-black ${safeToSpend >= 0 ? 'text-green-600' : 'text-orange-600'}`}>
              ${safeToSpend.toLocaleString()}
            </p>
          </div>
        </div>

        {/* TWO-STEP PAYROLL PROCESS */}
        <div className="bg-gray-900 p-6 rounded-2xl shadow-xl mb-8 text-white border-l-8 border-blue-500">
          <h2 className="text-sm font-black uppercase tracking-widest mb-4 text-blue-400">Payroll Processing</h2>
          
          <div className="space-y-6">
            {/* STEP 1: DEPOSIT */}
            <form action={depositFunds} className="flex gap-2">
              <input type="hidden" name="accountId" value="1" /> 
              <input 
                type="number" 
                name="amount" 
                step="0.01" 
                placeholder="Enter Check Amount..." 
                className="flex-1 bg-gray-800 border-none rounded-lg p-3 text-white font-bold outline-none placeholder-gray-500" 
                required 
              />
              <button type="submit" className="bg-green-600 text-white px-4 md:px-6 py-3 rounded-lg font-black uppercase text-[10px] md:text-xs hover:bg-green-500 transition shadow-md">
                1. Deposit Check
              </button>
            </form>

            <div className="h-px bg-gray-800 w-full"></div>

            {/* STEP 2: DISTRIBUTE */}
            <form action={processRoutedPaycheck}>
              <p className="text-[10px] font-black text-gray-500 uppercase mb-2 tracking-widest">Select Distribution Rule:</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                {[
                  { id: '1st_month', label: '1st: Ret/VA' },
                  { id: 'op_1', label: '1st OP Check' },
                  { id: 'op_2', label: '2nd OP Check' },
                  { id: 'op_3', label: '3rd OP Check' }
                ].map((type) => (
                  <label key={type.id} className="relative flex flex-col items-center justify-center p-3 border border-gray-700 rounded-xl cursor-pointer hover:bg-gray-800 transition has-[:checked]:bg-blue-600 has-[:checked]:border-blue-400">
                    <input type="radio" name="payType" value={type.id} className="absolute opacity-0" required />
                    <span className="text-[10px] font-bold text-center uppercase leading-tight">{type.label}</span>
                  </label>
                ))}
              </div>
              <button type="submit" className="w-full bg-blue-500 text-white py-3 rounded-lg font-black uppercase text-xs hover:bg-blue-400 transition shadow-lg">
                2. Execute Distribution Rules
              </button>
            </form>
          </div>
        </div>

        {/* MAIN DASHBOARD CONTENT */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
           
           {/* BILL CHECKLIST */}
           <section>
             <div className="flex justify-between items-center mb-3">
               <h2 className="text-sm font-black uppercase tracking-widest text-gray-400">
                 Monthly Bills <span className="text-red-500 ml-2">({bills?.length || 0})</span>
               </h2>
               <form action={resetMonthlyBills}>
                 <button type="submit" className="text-[9px] bg-gray-200 text-gray-500 px-3 py-1 rounded-md font-black uppercase hover:bg-red-500 hover:text-white transition">
                   Reset for New Month
                 </button>
               </form>
             </div>
             
             <div className="space-y-2">
               {bills?.map((bill) => {
                  const source = accounts?.find(a => a.id === bill.paying_account_id);
                  return (
                    <div key={bill.id} className="flex justify-between items-center p-4 bg-white border border-gray-200 rounded-xl shadow-sm hover:border-blue-300 transition group">
                      <div>
                        <p className="text-sm font-black text-gray-800 uppercase tracking-tight">{bill.bill_name}</p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">
                          From: {source?.account_name} • Due: {bill.due_day_of_month}{getOrdinalSuffix(bill.due_day_of_month || 0)}
                        </p>
                      </div>
                      <form action={payExpense} className="flex items-center gap-4">
                        <span className="text-sm font-black text-gray-900">${bill.expected_amount}</span>
                        <input type="hidden" name="billId" value={bill.id} />
                        <input type="hidden" name="accountId" value={bill.paying_account_id} />
                        <input type="hidden" name="amount" value={bill.expected_amount} />
                        <button type="submit" className="w-8 h-8 rounded-full border-2 border-gray-100 flex items-center justify-center text-gray-200 group-hover:border-green-500 group-hover:text-green-500 transition hover:bg-green-500 hover:text-white font-bold">✓</button>
                      </form>
                    </div>
                  );
               })}
               {(!bills || bills.length === 0) && (
                 <div className="p-8 bg-gray-100 border-2 border-dashed border-gray-200 rounded-xl text-center">
                   <p className="text-gray-400 text-xs font-bold uppercase italic">All bills cleared for this month.</p>
                 </div>
               )}
             </div>
           </section>

           {/* VAULTS / ACCOUNTS */}
           <section>
             <h2 className="text-sm font-black uppercase tracking-widest text-gray-400 mb-3 text-right">Account Vaults</h2>
             <div className="grid grid-cols-1 gap-2">
               {accounts?.map((acc) => (
                 <div key={acc.id} className="flex justify-between items-center p-3 bg-white border border-gray-200 rounded-lg shadow-sm">
                   <p className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">{acc.account_name}</p>
                   <p className="text-sm font-black text-gray-800">${acc.current_cleared_balance.toLocaleString()}</p>
                 </div>
               ))}
             </div>

             {/* MANUAL ADJUSTMENT TOOL */}
             <div className="mt-6 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
               <details className="cursor-pointer group">
                 <summary className="text-[10px] font-black text-gray-400 uppercase tracking-widest list-none flex justify-between items-center">
                   <span>Manual Calibration</span>
                   <span className="text-gray-300 group-open:rotate-180 transition-transform">▼</span>
                 </summary>
                 <form action={depositFunds} className="flex flex-col gap-3 mt-4">
                   <select name="accountId" className="w-full bg-gray-50 border border-gray-200 rounded p-2 text-[10px] font-black uppercase" required>
                     <option value="">-- Choose Vault --</option>
                     {accounts?.map(acc => <option key={acc.id} value={acc.id}>{acc.account_name}</option>)}
                   </select>
                   <div className="flex gap-2">
                     <input type="number" name="amount" step="0.01" placeholder="Amount..." className="flex-1 bg-gray-50 border border-gray-200 rounded p-2 text-sm" required />
                     <button type="submit" className="bg-gray-800 text-white px-4 py-2 rounded text-[10px] font-black uppercase hover:bg-black transition">Set Balance</button>
                   </div>
                 </form>
               </details>
             </div>
           </section>
        </div>
      </div>
    </main>
  )
}