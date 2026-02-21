'use server'

import { supabase } from '../utils/supabase'
import { revalidatePath } from 'next/cache'

const accountIds = {
  main: 1,         
  nextPayday: 2,   
  utilities: 3,    
  joint: 4,        
  savings: 5,      
  hanna: 6,        
  emma: 7,         
  missionFed: 8    
};

export async function depositFunds(formData) {
  const accountId = formData.get('accountId')
  const amount = parseFloat(formData.get('amount'))
  if (!accountId || isNaN(amount)) return
  await supabase.from('accounts').update({ current_cleared_balance: amount }).eq('id', accountId)
  revalidatePath('/')
}

export async function processRoutedPaycheck(formData) {
  const payType = formData.get('payType'); 
  if (!payType) return;

  let distributions = {};
  switch (payType) {
    case '1st_month':
      distributions = { utilities: 4270.00, joint: 160.00 };
      break;
    case 'op_1':
      distributions = { nextPayday: 0.00, utilities: 0.00, hanna: 25.00, emma: 25.00, missionFed: 200.00 };
      break;
    case 'op_2':
      distributions = { nextPayday: 0.00, utilities: 0.00, hanna: 25.00, emma: 25.00, missionFed: 200.00 };
      break;
    default:
      distributions = {}; 
  }

  for (const [key, val] of Object.entries(distributions)) {
    const targetId = accountIds[key];
    const { data: mainAcc } = await supabase.from('accounts').select('current_cleared_balance').eq('id', accountIds.main).single();
    await supabase.from('accounts').update({ current_cleared_balance: (mainAcc?.current_cleared_balance || 0) - val }).eq('id', accountIds.main);
    const { data: targetAcc } = await supabase.from('accounts').select('current_cleared_balance').eq('id', targetId).single();
    await supabase.from('accounts').update({ current_cleared_balance: (targetAcc?.current_cleared_balance || 0) + val }).eq('id', targetId);
    await supabase.from('ledger').insert({
      transaction_date: new Date().toISOString(),
      amount: val,
      source_account_id: accountIds.main,
      destination_account_id: targetId,
      status: 'CLEARED'
    });
  }
  revalidatePath('/')
}

export async function payExpense(formData) {
  const billId = formData.get('billId');
  const accountId = formData.get('accountId');
  const amount = parseFloat(formData.get('amount'));
  if (!accountId || !amount) return;
  const { data: acc } = await supabase.from('accounts').select('current_cleared_balance').eq('id', accountId).single();
  const newBalance = (acc?.current_cleared_balance || 0) - amount;
  await supabase.from('accounts').update({ current_cleared_balance: newBalance }).eq('id', accountId);
  if (billId) {
    await supabase.from('bills').update({ is_active: false }).eq('id', billId);
  }
  await supabase.from('ledger').insert({
    transaction_date: new Date().toISOString(),
    amount: -amount,
    source_account_id: accountId,
    status: 'CLEARED'
  });
  revalidatePath('/');
}

export async function resetMonthlyBills() {
  await supabase.from('bills').update({ is_active: true }).neq('id', 0);
  revalidatePath('/');
}