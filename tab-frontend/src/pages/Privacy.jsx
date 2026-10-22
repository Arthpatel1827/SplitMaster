import { Link } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'

const CONTACT = import.meta.env.VITE_CONTACT_EMAIL || ''

function H({ children }) {
  return <h2 className="text-lg font-extrabold mt-7 mb-2">{children}</h2>
}

export default function Privacy() {
  return (
    <div className="max-w-md mx-auto px-5 pt-5 pb-16 text-[15px] leading-relaxed">
      <Link to="/login" className="inline-flex items-center gap-1 -ml-2 h-11 pr-3 text-sm font-semibold text-[#5f5a4d]">
        <ChevronLeft size={22} strokeWidth={2.4} /> Back
      </Link>
      <h1 className="text-3xl font-extrabold tracking-tight mt-1">Privacy Policy</h1>
      <p className="text-muted text-sm mt-1">SplitMaster · Last updated October 22, 2026</p>

      <p className="mt-5">
        SplitMaster is an app for splitting shared expenses with friends, roommates and travel groups. This page explains
        what information SplitMaster collects, why, and the choices you have.
      </p>

      <H>Information we collect</H>
      <ul className="list-disc pl-5 space-y-1.5">
        <li><b>Account details:</b> your username, your password (stored only as a salted hash, never in plain text), and an email address if you choose to add one.</li>
        <li><b>Group and expense data you enter:</b> group names, member lists, expense descriptions, amounts, who paid, how it was split, notes, payments and refunds, and an activity history of those actions.</li>
        <li><b>Receipt photos:</b> only if you choose to attach them to an expense (up to 5 per expense). Anyone in that group can see it.</li>
        <li><b>Technical data:</b> standard server logs (such as IP address and request time) kept by our hosting providers for security and troubleshooting.</li>
      </ul>
      <p className="mt-3">
        SplitMaster does not collect your location, contacts, or advertising identifiers, and contains no ads or third-party analytics.
      </p>

      <H>How we use it</H>
      <p>
        We use your information only to run the app: to sign you in, show your groups and balances to the people in
        those groups, send a password-reset email when you ask for one, and keep the service secure.
      </p>

      <H>Camera and photos</H>
      <p>
        If you tap &ldquo;Add receipt photos&rdquo;, the app asks to choose photos or use your camera. Photos are only
        uploaded when you save the expense.
      </p>

      <H>Who can see your data</H>
      <p>
        Other members of a group can see that group&rsquo;s expenses, balances, notes, receipts and activity, and your
        username. We do not sell your data or share it for advertising. Our infrastructure providers (for hosting,
        database and file storage) process data on our behalf only to operate the service.
      </p>

      <H>Storage and security</H>
      <p>
        Data is sent over encrypted connections (HTTPS). Passwords are hashed. Sign-in tokens are stored on your device
        and are revoked when you log out. No system is perfectly secure, but we work to protect your information.
      </p>

      <H>Retention and deleting your data</H>
      <p>
        We keep your data while your account is active. You can delete your account at any time in the app
        (Account &rarr; Delete account) once you are settled up in all your groups, or follow the steps on
        the <Link to="/delete-account" className="underline font-semibold">account deletion page</Link>. Deleting your
        account removes your login, email and group memberships. Expenses you paid or shared in remain in each
        group&rsquo;s history under an anonymous &ldquo;deleted user&rdquo; name, so other members&rsquo; balances stay
        correct.
      </p>

      <H>Children</H>
      <p>SplitMaster is not directed at children under 13, and we do not knowingly collect their information.</p>

      <H>Changes</H>
      <p>If we change this policy we will update the date above.</p>

      <H>Contact</H>
      <p>
        Questions or requests about your data: {CONTACT
          ? <a className="underline font-semibold" href={`mailto:${CONTACT}`}>{CONTACT}</a>
          : 'use the contact email shown on our Google Play listing.'}
      </p>
    </div>
  )
}
