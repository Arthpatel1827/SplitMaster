import { Link } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'

const CONTACT = import.meta.env.VITE_CONTACT_EMAIL || ''

export default function DeleteAccountInfo() {
  return (
    <div className="max-w-md mx-auto px-5 pt-5 pb-16 text-[15px] leading-relaxed">
      <Link to="/login" className="inline-flex items-center gap-1 -ml-2 h-11 pr-3 text-sm font-semibold text-[#5f5a4d]">
        <ChevronLeft size={22} strokeWidth={2.4} /> Back
      </Link>
      <h1 className="text-3xl font-extrabold tracking-tight mt-1">Delete your Tab account</h1>

      <h2 className="text-lg font-extrabold mt-6 mb-2">In the app</h2>
      <ol className="list-decimal pl-5 space-y-1.5">
        <li>Log in and open <b>Account</b> from the bottom bar.</li>
        <li>Scroll to <b>Delete account</b>, enter your password, and tap <b>Delete my account</b>.</li>
        <li>Confirm. You must be settled up in all your groups first.</li>
      </ol>

      <h2 className="text-lg font-extrabold mt-6 mb-2">What is deleted</h2>
      <ul className="list-disc pl-5 space-y-1.5">
        <li>Your login, password and email address are removed immediately, and you can no longer sign in.</li>
        <li>You are removed from all groups. Groups you owned pass to another member, or are deleted if you were the last member.</li>
        <li>Expenses you paid or took part in stay in each group&rsquo;s history under an anonymous &ldquo;deleted user&rdquo; name, so other people&rsquo;s balances remain correct. Receipt photos attached to those expenses stay with them.</li>
      </ul>

      <h2 className="text-lg font-extrabold mt-6 mb-2">Can&rsquo;t log in?</h2>
      <p>
        Email {CONTACT
          ? <a className="underline font-semibold" href={`mailto:${CONTACT}`}>{CONTACT}</a>
          : 'the contact address on our Google Play listing'} from the address on your account, with your username, and ask us to delete it.
        See also our <Link to="/privacy" className="underline font-semibold">Privacy Policy</Link>.
      </p>
    </div>
  )
}
