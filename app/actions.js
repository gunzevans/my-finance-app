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
  console.log("--- INITIATING PAYCHECK ROUTING ---")
  const amount = parseFloat(formData.get('amount'))
  console.log("Entered Amount:", amount)
  
  if (!amount) return

  const accountIds = {
    main: 1,      
    hoa: 2,       
    utilities: 3, 
    joint: 4,     
    savings: 5,   
    hanna: 6,     
    emma: 7,      
    MissionFed: 8 
  }

  const transfers = {
    hoa: 35.00,          
    utilities: 2150.00,  
    joint: 80.00,        
    savings: 50.00,      
    hanna: 25.00,        
    emma: 25.00,         
    MissionFed: 200      
  }

  const totalTransfers = Object.values(transfers).reduce((sum, val) => sum + val, 0)
  const remainingInMain = amount - totalTransfers

  const idsArray = Object.values(accountIds)
  const { data: dbAccounts, error: fetchError } = await supabase
    .from('accounts')
    .select('id, current_cleared_balance')
    .in('id', idsArray)

  if (fetchError) {
    console.error("FAILED TO FETCH ACCOUNTS:", fetchError.message)
    return
  }

  const balances = {}
  dbAccounts.forEach(acc => { balances[acc.id] = parseFloat(acc.current_cleared_balance) })
  
  console.log("Current Balances Found:", balances)

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

  console.log("Attempting to push these new balances:", updatedBalances)

  // Safely update each account's balance one at a time
  for (const acc of updatedBalances) {
    const { error: updateError } = await supabase
      .from('accounts')
      .update({ current_cleared_balance: acc.current_cleared_balance })
      .eq('id', acc.id)

    if (updateError) {
      console.error(`FAILED TO UPDATE ACCOUNT ${acc.id}:`, updateError.message)
      return
    }
  }

  const today = new Date().toISOString().split('T')[0]
  const ledgerEntries = [
    { transaction_date: today, amount: amount, destination_account_id: accountIds.main, status: 'CLEARED' }
  ]

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

  const { error: ledgerError } = await supabase.from('ledger').insert(ledgerEntries)
  
  if (ledgerError) {
    console.error("SUPABASE REJECTED THE LEDGER ENTRIES:", ledgerError.message)
    return
  }

  console.log("--- ROUTING COMPLETELY SUCCESSFUL ---")
  
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