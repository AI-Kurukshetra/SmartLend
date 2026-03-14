import { createClient } from '@/lib/supabase/server'
import { makePayment } from './actions'
import { addBorrowerBankAccount, enableAutopay, verifyBorrowerBankAccount } from './ach-actions'
import { requestLoanModification } from './modification-actions'

export default async function BorrowerPaymentsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const borrowerRes = user
    ? await supabase
      .from('borrower_profiles')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle()
    : { data: null as any }

  let payments: any[] = []
  let accounts: any[] = []
  let bankAccounts: any[] = []
  let orgOptions: any[] = []
  let visibleNotes: any[] = []
  let modifications: any[] = []
  if (borrowerRes.data?.id) {
    const accountsRes = await supabase
      .from('loan_accounts')
      .select('id,principal_balance,status,autopay_enabled,autopay_bank_account_id,next_payment_due_date,scheduled_payment_amount,apr,term_months')
      .eq('borrower_id', borrowerRes.data.id)
      .limit(20)
    accounts = accountsRes.data || []
    const accountIds = accounts.map((row: any) => row.id)
    if (accountIds.length > 0) {
      const paymentRes = await supabase
        .from('loan_payments')
        .select('id,amount,status,due_date,posted_at,payment_method')
        .in('loan_account_id', accountIds)
        .order('created_at', { ascending: false })
        .limit(30)
      payments = paymentRes.data || []

      const notesRes = await supabase
        .from('servicing_notes')
        .select('id,loan_account_id,note,created_at')
        .in('loan_account_id', accountIds)
        .eq('visibility', 'borrower')
        .order('created_at', { ascending: false })
        .limit(20)
      visibleNotes = notesRes.data || []

      const modificationsRes = await supabase
        .from('loan_modifications')
        .select('id,loan_account_id,modification_type,effective_date,status,note,created_at')
        .in('loan_account_id', accountIds)
        .order('created_at', { ascending: false })
        .limit(20)
      modifications = modificationsRes.data || []
    }

    const bankRes = await supabase
      .from('borrower_bank_accounts')
      .select('id,org_id,bank_name,account_number_last4,verification_status,is_default,micro_deposit_amount_1,micro_deposit_amount_2,verification_method')
      .eq('borrower_id', borrowerRes.data.id)
      .limit(20)
    bankAccounts = bankRes.data || []

    const invitesRes = await supabase
      .from('org_invites')
      .select('org_id')
      .eq('role', 'borrower')
      .eq('accepted_by', user?.id ?? '')
      .not('accepted_at', 'is', null)
      .limit(100)
    const orgIds = Array.from(new Set((invitesRes.data || []).map((x: any) => x.org_id as string)))
    if (orgIds.length > 0) {
      const orgsRes = await supabase.from('organizations').select('id,name').in('id', orgIds)
      orgOptions = orgsRes.data || []
    }
  }

  return (
    <div>
      <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 900, color: '#0f172a' }}>Payments</h1>
      <p style={{ marginTop: 8, color: '#64748b', lineHeight: 1.7 }}>
        View scheduled and posted payments.
      </p>
      <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 14 }}>
        <form action={addBorrowerBankAccount} style={{ border: '1px solid #e2e8f0', borderRadius: 14, background: '#fff', padding: 14, display: 'grid', gap: 8 }}>
          <p style={{ margin: 0, color: '#0f172a', fontWeight: 800 }}>Add ACH bank account</p>
          <select name="org_id" required style={{ borderRadius: 10, border: '1.5px solid #e2e8f0', padding: '10px 12px' }}>
            <option value="">Select lender org</option>
            {orgOptions.map((org: any) => <option key={org.id} value={org.id}>{org.name}</option>)}
          </select>
          <input name="bank_name" required placeholder="Bank name" style={{ borderRadius: 10, border: '1.5px solid #e2e8f0', padding: '10px 12px' }} />
          <input name="account_holder_name" required placeholder="Account holder name" style={{ borderRadius: 10, border: '1.5px solid #e2e8f0', padding: '10px 12px' }} />
          <input name="routing_number" required placeholder="Routing number" style={{ borderRadius: 10, border: '1.5px solid #e2e8f0', padding: '10px 12px' }} />
          <input name="account_number" required placeholder="Account number" style={{ borderRadius: 10, border: '1.5px solid #e2e8f0', padding: '10px 12px' }} />
          <button type="submit" style={{ border: 'none', borderRadius: 10, background: '#0f766e', color: '#fff', fontWeight: 800, padding: '10px 12px', cursor: 'pointer' }}>Add bank account</button>
        </form>

        <div style={{ border: '1px solid #e2e8f0', borderRadius: 14, background: '#fff', padding: 14, display: 'grid', gap: 8 }}>
          <p style={{ margin: 0, color: '#0f172a', fontWeight: 800 }}>Bank accounts and autopay</p>
          {bankAccounts.length === 0 && <div style={{ color: '#64748b' }}>No bank accounts added.</div>}
          {bankAccounts.map((account: any) => (
            <div key={account.id} style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 12, display: 'grid', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <div>
                  <p style={{ margin: 0, fontWeight: 800, color: '#0f172a' }}>{account.bank_name} ••••{account.account_number_last4}</p>
                  <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#64748b' }}>{account.verification_status}{account.is_default ? ' | default' : ''}</p>
                </div>
                {account.verification_status !== 'verified' && (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <form action={verifyBorrowerBankAccount}>
                      <input type="hidden" name="bank_account_id" value={account.id} />
                      <input type="hidden" name="mode" value="instant" />
                      <button type="submit" style={{ border: '1px solid #cbd5e1', borderRadius: 8, background: '#fff', color: '#0f172a', padding: '6px 10px', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer' }}>
                        Instant verify
                      </button>
                    </form>
                    <form action={verifyBorrowerBankAccount}>
                      <input type="hidden" name="bank_account_id" value={account.id} />
                      <input type="hidden" name="mode" value="micro_start" />
                      <button type="submit" style={{ border: '1px solid #cbd5e1', borderRadius: 8, background: '#fff', color: '#0f172a', padding: '6px 10px', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer' }}>
                        Send micro-deposits
                      </button>
                    </form>
                  </div>
                )}
              </div>
              {account.verification_status !== 'verified' && account.micro_deposit_amount_1 && account.micro_deposit_amount_2 && (
                <form action={verifyBorrowerBankAccount} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  <input type="hidden" name="bank_account_id" value={account.id} />
                  <input type="hidden" name="mode" value="micro_confirm" />
                  <input name="amount_1" type="number" step="0.01" min="0" placeholder="Deposit 1" style={{ borderRadius: 8, border: '1px solid #cbd5e1', padding: '6px 10px', width: 110 }} />
                  <input name="amount_2" type="number" step="0.01" min="0" placeholder="Deposit 2" style={{ borderRadius: 8, border: '1px solid #cbd5e1', padding: '6px 10px', width: 110 }} />
                  <button type="submit" style={{ border: 'none', borderRadius: 8, background: '#0f766e', color: '#fff', padding: '6px 10px', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer' }}>
                    Confirm deposits
                  </button>
                </form>
              )}
              {account.verification_status === 'verified' && accounts.map((loanAccount: any) => (
                <form key={`${account.id}-${loanAccount.id}`} action={enableAutopay} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <input type="hidden" name="loan_account_id" value={loanAccount.id} />
                  <input type="hidden" name="bank_account_id" value={account.id} />
                  <span style={{ fontSize: '0.82rem', color: '#475569' }}>
                    Account #{loanAccount.id.slice(0, 8)} | {loanAccount.autopay_enabled && loanAccount.autopay_bank_account_id === account.id ? 'autopay enabled' : 'enable autopay'}
                  </span>
                  <button type="submit" disabled={loanAccount.autopay_enabled && loanAccount.autopay_bank_account_id === account.id} style={{ border: 'none', borderRadius: 8, background: loanAccount.autopay_enabled && loanAccount.autopay_bank_account_id === account.id ? '#94a3b8' : '#0f766e', color: '#fff', padding: '6px 10px', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer' }}>
                    {loanAccount.autopay_enabled && loanAccount.autopay_bank_account_id === account.id ? 'Enabled' : 'Enable'}
                  </button>
                </form>
              ))}
            </div>
          ))}
        </div>
      </div>
      <form action={makePayment} style={{ marginTop: 14, border: '1px solid #e2e8f0', borderRadius: 14, background: '#fff', padding: 14, display: 'grid', gap: 8, maxWidth: 520 }}>
        <p style={{ margin: 0, color: '#0f172a', fontWeight: 800 }}>Make one-time payment</p>
        <select name="loan_account_id" required style={{ borderRadius: 10, border: '1.5px solid #e2e8f0', padding: '10px 12px' }}>
          <option value="">Select account</option>
          {accounts.map((a: any) => (
            <option key={a.id} value={a.id}>
              {a.id.slice(0, 8)} | Balance ${Number(a.principal_balance).toLocaleString()} | {a.status}
            </option>
          ))}
        </select>
        <input type="number" step="0.01" min="0.01" required name="amount" placeholder="Payment amount" style={{ borderRadius: 10, border: '1.5px solid #e2e8f0', padding: '10px 12px' }} />
        <button type="submit" style={{ border: 'none', borderRadius: 10, background: '#0f766e', color: '#fff', fontWeight: 800, padding: '10px 12px', cursor: 'pointer' }}>Submit payment</button>
      </form>
      <form action={requestLoanModification} style={{ marginTop: 14, border: '1px solid #e2e8f0', borderRadius: 14, background: '#fff', padding: 14, display: 'grid', gap: 8, maxWidth: 520 }}>
        <p style={{ margin: 0, color: '#0f172a', fontWeight: 800 }}>Request payment relief or modification</p>
        <select name="loan_account_id" required style={{ borderRadius: 10, border: '1.5px solid #e2e8f0', padding: '10px 12px' }}>
          <option value="">Select account</option>
          {accounts.map((a: any) => (
            <option key={a.id} value={a.id}>
              {a.id.slice(0, 8)} | {a.status}
            </option>
          ))}
        </select>
        <select name="modification_type" required style={{ borderRadius: 10, border: '1.5px solid #e2e8f0', padding: '10px 12px' }}>
          <option value="">Select request type</option>
          <option value="forbearance">forbearance</option>
          <option value="payment_plan">payment_plan</option>
          <option value="term_extension">term_extension</option>
        </select>
        <textarea name="note" required rows={4} placeholder="Explain the hardship or change requested" style={{ borderRadius: 10, border: '1.5px solid #e2e8f0', padding: '10px 12px', resize: 'vertical' }} />
        <button type="submit" style={{ border: 'none', borderRadius: 10, background: '#0f172a', color: '#fff', fontWeight: 800, padding: '10px 12px', cursor: 'pointer' }}>Send request</button>
      </form>

      <div style={{ marginTop: 16, display: 'grid', gap: 10 }}>
        {accounts.map((account: any) => (
          <div key={account.id} style={{ border: '1px solid #e2e8f0', borderRadius: 14, background: '#fff', padding: 14, display: 'grid', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
              <p style={{ margin: 0, color: '#0f172a', fontWeight: 900 }}>
                Account #{account.id.slice(0, 8)} | ${Number(account.principal_balance).toLocaleString()} balance
              </p>
              <span style={{ color: '#334155', fontWeight: 800 }}>{account.status}</span>
            </div>
            <p style={{ margin: 0, color: '#64748b', fontSize: '0.84rem' }}>
              APR {Number(account.apr || 0).toFixed(2)}% | {account.term_months || 'n/a'} months | next due {account.next_payment_due_date || 'n/a'} | scheduled ${Number(account.scheduled_payment_amount || 0).toLocaleString()}
            </p>
            {modifications.filter((item: any) => item.loan_account_id === account.id).slice(0, 2).map((item: any) => (
              <div key={item.id} style={{ color: '#475569', fontSize: '0.84rem' }}>
                Modification: {item.modification_type} effective {item.effective_date} ({item.status}){item.note ? ` | ${item.note}` : ''}
              </div>
            ))}
            {visibleNotes.filter((item: any) => item.loan_account_id === account.id).slice(0, 2).map((item: any) => (
              <div key={item.id} style={{ color: '#475569', fontSize: '0.84rem' }}>
                Update: {item.note}
              </div>
            ))}
          </div>
        ))}
        {payments.length === 0 && (
          <div style={{ border: '1px dashed #cbd5e1', borderRadius: 14, background: '#fff', padding: 16, color: '#64748b' }}>
            No payment records found.
          </div>
        )}
        {payments.map((p: any) => (
          <div key={p.id} style={{ border: '1px solid #e2e8f0', borderRadius: 14, background: '#fff', padding: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ margin: 0, color: '#0f172a', fontWeight: 800 }}>${Number(p.amount).toLocaleString()}</p>
              <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: '0.84rem' }}>Due {p.due_date || 'N/A'} | {p.posted_at ? `posted ${new Date(p.posted_at).toLocaleDateString()}` : 'not posted yet'}</p>
            </div>
            <span style={{ borderRadius: 999, padding: '6px 10px', background: '#ecfeff', color: '#155e75', fontWeight: 800, fontSize: '0.8rem' }}>{p.status}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
