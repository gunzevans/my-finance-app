'use server'

import { supabase } from '../utils/supabase'
import { revalidatePath } from 'next/cache'

// ---------------------------------------------------------
// 1. MANUAL DEPOSIT
// ---------------------------------------------------------
export async function depositFunds(formData) {
  const amount = parseFloat(formData.get('amount'))
  const accountId = parseInt(formData.get('accountId'))

  if (!amount || !accountId) return

  const { data: account, error: fetchError } = await supabase
    .from('accounts')
    .select('current_cleared_balance')
    .eq('id', accountId)
    .single()

  if (fetchError) throw new Error(fetchError.message)

  const newBalance = parseFloat(account.current_cleared_balance) + amount

  await supabase.from('accounts').update({ current_cleared_balance: newBalance }).eq('id', accountId)

  await supabase.from('ledger').insert({
    transaction_date: new Date().toISOString().split('T')[0],
    amount: amount,
    destination_account_id: accountId,
    status: 'CLEARED'
  })

  revalidatePath('/')
}

// ---------------------------------------------------------
// 2. AUTOMATED PAYCHECK ROUTING 
// ---------------------------------------------------------
export async function processRoutedPaycheck(formData) {
  const amount = parseFloat(formData.get('amount'))
  if (!amount) return

  // 1. Map your Supabase database IDs to your USAA accounts
  const accountIds = {
    main: 1,      // USAA - Dan's Checking
    hoa: 2,       // USAA - Next Payday & HOA dues
    utilities: 3, // USAA - Utilities & Mortgage
    joint: 4,     // USAA - Joint Checking
    savings: 5,   // USAA - Vacation/Savings
    hanna: 6,     // USAA - Emma
    emma: 7,      // USAA - Hanna
    MissionFed: 8 // MISSION FED - Play Checking
  }

  // 2. Define the fixed transfers per paycheck
  // Adjust these amounts to match your bi-weekly forecast targets
  const transfers = {
    hoa: 35.00,          // HOA
    utilities: 2150.00,  // Mortgage, Evergy, Atmos, WaterOne, GFiber, etc.
    joint: 80.00,        // Health, Life Ins.
    savings: 50.00,      // Emergency, Vacation, Vehicle Reg, Maint
    hanna: 25.00,        // Hanna's expenses
    emma: 25.00,         // Emma's expenses
    MissionFed: 200      // MISSION FED - Play Checking
  }

  // Calculate the leftover un-routed cash
  const totalTransfers = Object.values(transfers).reduce((sum, val) => sum + val, 0)
  const remainingInMain = amount - totalTransfers

  // 3. Fetch current balances for ALL involved accounts at once
  const idsArray = Object.values(accountIds)
  const { data: dbAccounts, error: fetchError } = await supabase
    .from('accounts')
    .select('id, current_cleared_balance')
    .in('id', idsArray)

  if (fetchError) throw new Error(fetchError.message)

  // Map the fetched balances for easy math
  const balances = {}
  dbAccounts.forEach(acc => { balances[acc.id] = parseFloat(acc.current_cleared_balance) })

  // 4. Prepare bulk balance updates
  const updatedBalances = [
    { id: accountIds.main, current_cleared_balance: balances[accountIds.main] + remainingInMain },
    { id: accountIds.hoa, current_cleared_balance: balances[accountIds.hoa] + transfers.hoa },
    { id: accountIds.utilities, current_cleared_balance: balances[accountIds.utilities] + transfers.utilities },
    { id: accountIds.joint, current_cleared_balance: balances[accountIds.joint] + transfers.joint },
    { id: accountIds.savings, current_cleared_balance: balances[accountIds.savings] + transfers.savings },
    { id: accountIds.hanna, current_cleared_balance: balances[accountIds.hanna] + transfers.hanna },
    { id: accountIds.emma, current_cleared_balance: balances[accountIds.emma] + transfers.emma },
    { id: accountIds.MissionFed, current_cleared_balance: balances[accountIds.MissionFed] + transfers.MissionFed }
  ]

  // Upsert the new balances to Supabase
  await supabase.from('accounts').upsert(updatedBalances)

  // 5. Write the detailed receipts to the Ledger
  const today = new Date().toISOString().split('T')[0]
  
  // Start with the initial full deposit into Dan's Checking
  const ledgerEntries = [
    { transaction_date: today, amount: amount, destination_account_id: accountIds.main, status: 'CLEARED' }
  ]

  // Automatically generate the outgoing transfer logs
  for (const [key, transferAmount] of Object.entries(transfers)) {
    if (transferAmount > 0) {
      ledgerEntries.push({
        transaction_date: today,
        amount: -transferAmount,
        source_account_id: accountIds.main,
        destination_account_id: accountIds[key],
        status: 'CLEARED'
      })
    }
  }

  // Insert all ledger records simultaneously
  await supabase.from('ledger').insert(ledgerEntries)

  // Refresh the dashboard UI
  revalidatePath('/')
}

// ---------------------------------------------------------
// 3. PAY AN EXPENSE
// ---------------------------------------------------------
export async function payExpense(formData) {
  const amount = parseFloat(formData.get('amount'))
  const accountId = parseInt(formData.get('accountId'))
  const expenseName = formData.get('expenseName')

  if (!amount || !accountId) return

  const { data: account, error: fetchError } = await supabase
    .from('accounts')
    .select('current_cleared_balance')
    .eq('id', accountId)
    .single()

  if (fetchError) throw new Error(fetchError.message)

  const newBalance = parseFloat(account.current_cleared_balance) - amount

  await supabase.from('accounts').update({ current_cleared_balance: newBalance }).eq('id', accountId)

  await supabase.from('ledger').insert({
    transaction_date: new Date().toISOString().split('T')[0],
    amount: -amount,
    source_account_id: accountId,
    status: 'CLEARED'
  })

  revalidatePath('/')
}